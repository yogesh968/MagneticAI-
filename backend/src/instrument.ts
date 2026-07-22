import * as Sentry from "@sentry/node";

/**
 * Sentry must be initialised before the rest of the app so its auto-instrumentation
 * can patch http/express. server.ts imports this module FIRST, before ./app.js.
 *
 * DSN-gated: with no SENTRY_DSN the SDK is never initialised and every
 * Sentry.captureException(...) elsewhere becomes a harmless no-op, so the server
 * behaves exactly as before. We read process.env directly (not config/env.js) to
 * avoid pulling the whole app graph in before instrumentation runs.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  console.info("[sentry] error tracking enabled");
}

export { Sentry };
