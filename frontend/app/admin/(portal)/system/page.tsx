"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Database, Cpu, Globe, Mail, MessageSquare, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

interface ServiceStatus {
  name: string;
  status: "ok" | "error" | "unknown";
  detail?: string;
  icon: React.ReactNode;
}

/**
 * Tailwind scans source statically, so a class built as `bg-${status}-50` is
 * never generated and the element renders unstyled. Every status a card or
 * badge can take has to appear here as a whole, literal class name.
 */
const STATUS_TONE: Record<string, { border: string; chip: string; badge: string; text: string; subtext: string }> = {
  ok:      { border: "border-emerald-100", chip: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", text: "text-emerald-800", subtext: "text-emerald-600" },
  error:   { border: "border-red-100",     chip: "bg-red-50 text-red-600",         badge: "bg-red-50 text-red-700 border-red-100",             text: "text-red-800",     subtext: "text-red-600" },
  unknown: { border: "border-hairline",    chip: "bg-sunken text-ink-muted",       badge: "bg-amber-50 text-amber-700 border-amber-100",       text: "text-amber-800",   subtext: "text-amber-600" },
};

export default function AdminSystemPage() {
  const [integrations, setIntegrations] = useState<any>(null);
  const [health, setHealth] = useState<"ok" | "error" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [healthRes, intRes] = await Promise.all([
        api.get("/health").catch(() => null),
        api.get("/integrations/status").catch(() => null),
      ]);
      setHealth(healthRes?.data?.status === "ok" ? "ok" : "error");
      setIntegrations(intRes?.data ?? {});
    } catch {
      setHealth("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const refresh = () => { setRefreshing(true); loadAll(); toast.success("Status refreshed"); };

  const services: ServiceStatus[] = [
    {
      name: "API Server",
      status: health === "ok" ? "ok" : health === "error" ? "error" : "unknown",
      detail: health === "ok" ? "Express API responding" : "Cannot reach API",
      icon: <Globe size={16} />,
    },
    {
      name: "MongoDB",
      status: health === "ok" ? "ok" : "error",
      detail: health === "ok" ? "Connected" : "Not connected",
      icon: <Database size={16} />,
    },
    {
      name: "Qdrant Vector DB",
      status: health === "ok" ? "ok" : "unknown",
      detail: "Vector store for knowledge base",
      icon: <Cpu size={16} />,
    },
    {
      name: "Groq LLM",
      status: integrations?.groq ? "ok" : integrations?.groq === false ? "error" : "unknown",
      detail: integrations?.groq ? "API key configured" : "API key not set",
      icon: <Zap size={16} />,
    },
    {
      name: "Email (SMTP)",
      status: integrations?.email ? "ok" : "unknown",
      detail: integrations?.email ? "SMTP configured" : "Not configured (optional)",
      icon: <Mail size={16} />,
    },
    {
      name: "WhatsApp (Twilio)",
      status: integrations?.whatsapp ? "ok" : "unknown",
      detail: integrations?.whatsapp ? "Twilio configured" : "Not configured (optional)",
      icon: <MessageSquare size={16} />,
    },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok")      return <CheckCircle2 size={18} className="text-emerald-500" />;
    if (status === "error")   return <XCircle size={18} className="text-red-500" />;
    return <AlertCircle size={18} className="text-amber-400" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const t = STATUS_TONE[status] ?? STATUS_TONE.unknown;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${t.badge}`}>
        {status === "ok" ? "Online" : status === "error" ? "Error" : "Unknown"}
      </span>
    );
  };

  const okCount = services.filter((s) => s.status === "ok").length;
  const errCount = services.filter((s) => s.status === "error").length;
  const overallStatus = errCount > 0 ? "error" : okCount >= 3 ? "ok" : "unknown";
  const overallTone = STATUS_TONE[overallStatus];

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="System Health"
        subtitle="Service status and integration configuration"
        action={
          <button onClick={refresh} disabled={refreshing} className="btn-secondary gap-2">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {/* Overall status banner */}
      <div className={`rounded-2xl border p-5 anim-up ${overallTone.border} ${overallStatus === "unknown" ? "bg-amber-50" : overallStatus === "ok" ? "bg-emerald-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-3">
          <StatusIcon status={overallStatus} />
          <div>
            <p className={`font-semibold ${overallTone.text}`}>
              {loading ? "Checking services…" : errCount > 0 ? `${errCount} service(s) have issues` : `All ${okCount} core services operational`}
            </p>
            <p className={`text-sm mt-0.5 ${overallTone.subtext}`}>
              {okCount} online · {errCount} errors · {services.length - okCount - errCount} unknown
            </p>
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 anim-up d2">
        {services.map(({ name, status, detail, icon }) => {
          const t = STATUS_TONE[status] ?? STATUS_TONE.unknown;
          return (
            <div key={name} className={`card ${t.border}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.chip}`}>
                  {icon}
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="font-semibold text-ink">{name}</p>
              <p className="text-xs text-ink-muted mt-0.5">{detail}</p>
            </div>
          );
        })}
      </div>

      {/* Environment info */}
      <div className="card anim-up d4">
        <p className="text-sm font-semibold text-ink mb-4">Environment Configuration</p>
        <div className="grid gap-2.5">
          {[
            { key: "API URL",           value: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000" },
            { key: "Socket URL",        value: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000" },
            { key: "Environment",       value: process.env.NODE_ENV ?? "development" },
            { key: "Frontend",          value: typeof window !== "undefined" ? window.location.origin : "—" },
          ].map(({ key, value }) => (
            <div key={key} className="flex items-center justify-between rounded-xl bg-sunken border border-hairline px-4 py-2.5">
              <span className="text-xs font-medium text-ink-muted">{key}</span>
              <span className="font-mono text-xs font-semibold text-ink-soft">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Docs */}
      <div className="rounded-2xl border border-hairline bg-sunken/50 p-5 anim-up d5">
        <p className="text-sm font-semibold text-ink mb-2">API Reference</p>
        <p className="text-xs text-ink-muted leading-relaxed mb-3">
          Full REST API documentation with all endpoints, request/response schemas, and auth requirements.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { label: "Health check",  path: "/health" },
            { label: "Auth endpoints", path: "/api/auth/*" },
            { label: "Chat endpoints", path: "/api/chat/*" },
          ].map(({ label, path }) => (
            <div key={label} className="rounded-lg bg-white border border-hairline px-3 py-2">
              <p className="font-semibold text-ink">{label}</p>
              <p className="font-mono text-ink-soft mt-0.5">{path}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
