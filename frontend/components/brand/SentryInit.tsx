"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

let started = false;

/**
 * Client-side error capture, gated on NEXT_PUBLIC_SENTRY_DSN — with no DSN nothing
 * initialises and this renders nothing, so the app is unchanged. Intentionally
 * client-only (no next.config / source-map build integration) to keep the build
 * simple; the backend Sentry (instrument.ts) covers server-side faults.
 */
export function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn || started) return;
    started = true;
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0,
    });
  }, []);
  return null;
}
