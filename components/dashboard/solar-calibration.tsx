"use client";

import { useEffect, useState } from "react";
import { Skeleton, Badge } from "@/components/ui/primitives";
import { formatNumber, cn } from "@/lib/utils";
import { Satellite, CircleCheck, CircleAlert } from "lucide-react";

interface CalibrationResponse {
  ok: boolean;
  calibrated: boolean;
  impliedSpecificYield?: number;
  staticAssumption: number;
  annualIrradianceKwhPerM2?: number;
  observationDays?: number;
  performanceRatio?: number;
  variancePercent?: number;
  verdict?: string;
  source?: string;
  message?: string;
}

/**
 * Live calibration of the yield assumption against measured irradiance.
 *
 * This turns a static assumption into a verified one. If Open-Meteo is unreachable the
 * panel says so plainly and the model carries on with the static figure — the
 * calibration is a cross-check, never a dependency.
 */
export function SolarCalibration() {
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/solar-yield")
      .then((r) => r.json())
      .then((json: CalibrationResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Satellite className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-step-1 font-bold tracking-tight">
            Yield assumption, checked against real irradiance
          </h3>
          <p className="mt-1 text-step--2 text-fg-subtle">
            Three years of measured solar radiation for Dubai Investments Park, via Open-Meteo.
          </p>
        </div>
      </div>

      <div className="mt-5" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data?.calibrated ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-bg-subtle/50 p-4">
                <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
                  Model assumption
                </dt>
                <dd className="tabular mt-1 font-display text-step-1 font-bold">
                  {formatNumber(data.staticAssumption)}{" "}
                  <span className="text-step--1 font-normal">kWh/kWp/yr</span>
                </dd>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
                <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
                  Implied by measured data
                </dt>
                <dd className="tabular mt-1 font-display text-step-1 font-bold">
                  {formatNumber(data.impliedSpecificYield ?? 0)}{" "}
                  <span className="text-step--1 font-normal">kWh/kWp/yr</span>
                </dd>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-4",
                  Math.abs(data.variancePercent ?? 0) < 0.1
                    ? "border-success/35 bg-success-soft/40"
                    : "border-warning/40 bg-warning-soft/40"
                )}
              >
                <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">Variance</dt>
                <dd className="tabular mt-1 font-display text-step-1 font-bold">
                  {(data.variancePercent ?? 0) > 0 ? "+" : ""}
                  {((data.variancePercent ?? 0) * 100).toFixed(1)}%
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-bg-subtle/40 p-4">
              {Math.abs(data.variancePercent ?? 0) < 0.1 ? (
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  strokeWidth={2.3}
                  aria-hidden="true"
                />
              ) : (
                <CircleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  strokeWidth={2.3}
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-step--1 font-medium">{data.verdict}</p>
                <p className="mt-1.5 text-step--2 leading-relaxed text-fg-muted">
                  Derived from {formatNumber(data.observationDays ?? 0)} days of observations
                  averaging {formatNumber(data.annualIrradianceKwhPerM2 ?? 0)} kWh/m² per year, at a{" "}
                  {((data.performanceRatio ?? 0) * 100).toFixed(0)}% performance ratio — a realistic
                  allowance for heat, dust and system losses in this climate.
                </p>
                <Badge tone="neutral" className="mt-3">
                  {data.source}
                </Badge>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-bg-subtle/40 p-4">
            <p className="text-step--1 leading-relaxed text-fg-muted">
              {data?.message ??
                "Live irradiance data was unavailable, so the model is using its static 1,750 kWh/kWp/yr assumption — a conservative Dubai estimate after temperature and soiling derating."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
