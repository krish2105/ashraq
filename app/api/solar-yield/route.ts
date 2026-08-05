import { NextRequest, NextResponse } from "next/server";
import { CASE_META } from "@/lib/case-data";

/**
 * /api/solar-yield — live calibration against Open-Meteo's historical archive.
 *
 * Open-Meteo is free, needs no API key, and explicitly supports solar-generation
 * modelling. This route pulls multi-year global horizontal irradiance for Al Waha's
 * Dubai Investments Park coordinates and converts it into an implied specific yield,
 * so the model's 1,750 kWh/kWp/yr assumption can be checked against real measured
 * data rather than simply asserted.
 *
 * If the API is unreachable it falls back silently to the static assumption — the
 * panel still renders, clearly labelled as uncalibrated.
 */

const STATIC_SPECIFIC_YIELD = 1750; // kWh/kWp/yr — the Section 3 assumption
const PERFORMANCE_RATIO = 0.78; // typical for a hot, dusty climate after all losses

export const revalidate = 86_400; // cache for a day; irradiance history doesn't change

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? CASE_META.coordinates.lat);
  const lon = Number(searchParams.get("lon") ?? CASE_META.coordinates.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "Invalid coordinates" }, { status: 400 });
  }

  const fallback = {
    ok: true,
    calibrated: false,
    staticAssumption: STATIC_SPECIFIC_YIELD,
    message:
      "Live irradiance data was unavailable, so the model is using its static 1,750 kWh/kWp/yr assumption — a conservative Dubai estimate after temperature and soiling derating.",
  };

  try {
    // Three full calendar years of daily solar radiation sums.
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("start_date", "2022-01-01");
    url.searchParams.set("end_date", "2024-12-31");
    url.searchParams.set("daily", "shortwave_radiation_sum");
    url.searchParams.set("timezone", "Asia/Dubai");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);

    const data = (await response.json()) as {
      daily?: { shortwave_radiation_sum?: (number | null)[] };
    };

    const series = (data.daily?.shortwave_radiation_sum ?? []).filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    );

    if (series.length < 300) throw new Error("Insufficient irradiance data returned");

    // Open-Meteo reports daily shortwave radiation sums in MJ/m². Convert to kWh/m²
    // (1 kWh = 3.6 MJ), annualise, then apply a performance ratio to get the yield a
    // real array would achieve per kWp installed.
    const totalMJ = series.reduce((a, b) => a + b, 0);
    const totalKwhPerM2 = totalMJ / 3.6;
    const years = series.length / 365.25;
    const annualIrradiance = totalKwhPerM2 / years;
    const impliedSpecificYield = annualIrradiance * PERFORMANCE_RATIO;

    const variancePercent =
      (impliedSpecificYield - STATIC_SPECIFIC_YIELD) / STATIC_SPECIFIC_YIELD;

    return NextResponse.json({
      ok: true,
      calibrated: true,
      coordinates: { lat, lon },
      observationDays: series.length,
      annualIrradianceKwhPerM2: Math.round(annualIrradiance),
      performanceRatio: PERFORMANCE_RATIO,
      impliedSpecificYield: Math.round(impliedSpecificYield),
      staticAssumption: STATIC_SPECIFIC_YIELD,
      variancePercent,
      verdict:
        Math.abs(variancePercent) < 0.1
          ? "The static assumption is well supported by measured irradiance."
          : variancePercent > 0
            ? "Measured irradiance suggests the model's yield assumption is conservative."
            : "Measured irradiance suggests the model's yield assumption may be optimistic.",
      source:
        "Open-Meteo Historical Weather API — daily shortwave radiation sums, 2022–2024, Dubai Investments Park.",
    });
  } catch (error) {
    console.warn("[ashraq:solar-yield] Open-Meteo unavailable, using static assumption", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(fallback);
  }
}
