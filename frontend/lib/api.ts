import axios from "axios";

/**
 * Relative baseURL on purpose. Requests go to this origin and next.config.mjs
 * rewrites /api/* to the backend, which keeps the auth cookie same-origin and
 * lets middleware read it. Tokens now live in httpOnly cookies, so nothing here
 * touches localStorage and there is no Authorization header to attach.
 */
export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  withCredentials: true,
});

/** Coalesces parallel 401s onto a single refresh call. */
let refreshing: Promise<void> | null = null;

function refreshSession() {
  refreshing ??= axios
    .post("/api/auth/refresh", {}, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !original._retry && !isRefreshCall && typeof window !== "undefined") {
      original._retry = true;
      try {
        // The backend rotates both cookies; nothing to store client-side.
        await refreshSession();
        return api(original);
      } catch {
        // Full reload so middleware re-evaluates and handles the redirect.
        window.location.href = "/login";
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

/** Non-sensitive claims the backend mirrors into a readable cookie for UI rendering. */
export type SessionHint = { role: "superadmin" | "admin" | "agent"; tenantId: string; name?: string };

/**
 * Read-only convenience for rendering role-specific UI. Never gate anything
 * security-relevant on this — it is client-writable by design. The middleware
 * verifies the signed token and the API enforces the real rules.
 */
export function readSessionHint(): SessionHint | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("mg_session="))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}
