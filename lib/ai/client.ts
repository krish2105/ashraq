"use client";

import type { ProjectInputs } from "../finance-engine";

/**
 * Client-side helper for calling the AI routes.
 *
 * Mints a short-lived session token on first use and echoes it on every request, which
 * is what the middleware checks. The token proves nothing about *who* is calling —
 * only that the call came from the app's own client bundle rather than a bare script.
 */

const SESSION_HEADER = "x-ashraq-session";
let sessionToken: string | null = null;

function getSessionToken(): string {
  if (sessionToken) return sessionToken;

  const existing = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("ashraq-session") : null;
  if (existing && existing.length >= 16) {
    sessionToken = existing;
    return existing;
  }

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  sessionToken = token;
  try {
    sessionStorage.setItem("ashraq-session", token);
  } catch {
    // Private browsing with storage disabled — the in-memory token still works.
  }
  return token;
}

export interface AiResponse<T> {
  ok: boolean;
  content?: T;
  source?: "model" | "deterministic";
  notice?: string;
  error?: string;
}

export async function callAiRoute<T>(
  route: "explain" | "risks" | "compare" | "recommend" | "delay-analysis",
  inputs: ProjectInputs
): Promise<AiResponse<T>> {
  try {
    const response = await fetch(`/api/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SESSION_HEADER]: getSessionToken(),
      },
      body: JSON.stringify({ inputs }),
    });

    if (!response.ok) {
      return { ok: false, error: `Request failed (${response.status})` };
    }

    return (await response.json()) as AiResponse<T>;
  } catch (error) {
    console.error(`[ashraq:client] /api/${route} failed`, error);
    return { ok: false, error: "Network request failed" };
  }
}

export interface AskResponse {
  ok: boolean;
  answer: string;
  source: "model" | "deterministic";
  toolCall: {
    name: string;
    reasoning: string | null;
    overrides: Record<string, number>;
    result: Record<string, number | null>;
  } | null;
  verification: { verified: boolean; unverifiedClaims: string[]; note?: string };
  notice?: string;
}

export async function askAshraq(message: string, inputs: ProjectInputs): Promise<AskResponse> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SESSION_HEADER]: getSessionToken(),
    },
    body: JSON.stringify({ message, inputs }),
  });

  if (!response.ok) {
    throw new Error(`Ask failed (${response.status})`);
  }

  return (await response.json()) as AskResponse;
}
