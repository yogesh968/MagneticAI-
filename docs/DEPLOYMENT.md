# Deployment, Monitoring & Staging

Covers the Sprint 3 operational setup: error tracking (A7), the uptime monitor target (A7), and a separate staging environment (A10).

---

## 1. Error tracking — Sentry (A7)

Both apps ship Sentry integration that is **off until a DSN is set**, so nothing changes until you opt in.

**Backend** (`backend/src/instrument.ts`, imported first in `server.ts`; 500s captured in the error handler):
```
SENTRY_DSN=https://...ingest.sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=0        # raise to 0.1 for perf tracing
```

**Frontend** (`components/brand/SentryInit.tsx`, client-side capture):
```
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_ENV=production
```

Create two Sentry projects (one Node, one Next.js/React), paste the DSNs, deploy. Verify by throwing a test error and confirming it lands in Sentry.

---

## 2. Uptime monitoring (A7)

The API exposes two endpoints:
- **`GET /health`** — liveness only (cheap, no dependencies). Use for the platform's process healthcheck.
- **`GET /ready`** — readiness: pings MongoDB and Qdrant. Returns **503** if Mongo is down, **200 `"degraded"`** if only Qdrant is down, **200 `"ok"`** when both are healthy.

Point an external monitor (**UptimeRobot** or **BetterStack**) at `https://<api-host>/ready` every 1–5 minutes with alerting to email/Slack, so you learn about a dead dependency before a client emails you.

---

## 3. Recommended topology (Part C)

| Component | Service |
|---|---|
| Backend API | Railway / Render (persistent — avoids Vercel's read-only FS + Socket.IO cold starts) |
| Frontend | Vercel (proxies `/api/*` → backend via `BACKEND_URL`) |
| Database | MongoDB Atlas (managed + backups) |
| Vector store | Qdrant Cloud (managed + snapshots) |
| File storage | Cloudflare R2 / AWS S3 (`STORAGE_DRIVER=s3`) |

> Scale note: rate limiting and Socket.IO are currently **in-memory (single instance)**. Before running more than one backend instance, add a Redis-backed rate-limit store and the Socket.IO Redis adapter (deferred Part C work).

---

## 4. Staging environment (A10)

Stand up a staging deploy that mirrors production but shares **nothing** with it:

- **Separate database** — a distinct Atlas cluster / DB name (never the prod cluster).
- **Separate Qdrant** — a distinct Qdrant Cloud cluster or collection namespace.
- **Separate secrets** — its own `JWT_SECRET`/`JWT_REFRESH_SECRET`, **Razorpay test keys** (not live), a **test** Sentry environment, and a separate storage bucket.
- **`NODE_ENV`** — you may run staging with `NODE_ENV=production` to exercise the prod code paths, but point every URL/secret at staging resources.

Checklist:
- [ ] Staging backend (Railway/Render) with staging env vars.
- [ ] Staging frontend (Vercel preview or separate project) with `BACKEND_URL` → staging API.
- [ ] Staging Atlas DB + Qdrant, isolated from prod.
- [ ] Razorpay **test** mode on staging; live only on prod.
- [ ] Run the [backup restore drill](./RUNBOOK-backup-restore.md) against staging.
