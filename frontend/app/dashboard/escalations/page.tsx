"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Empty, Loading, PageHeader } from "@/components/ui";
import { AlertTriangle, Flame, Clock, ChevronRight, ShieldAlert } from "lucide-react";

const PRIORITY_TONE: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };

function waitLabel(createdAt: string) {
  const mins = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 60) return { label: `${mins}m`, hot: mins > 30 };
  const h = Math.floor(mins / 60), m = mins % 60;
  return { label: `${h}h ${m}m`, hot: h >= 1 };
}

export default function EscalationsPage() {
  const router = useRouter();
  const [urgent, setUrgent] = useState<any>(null);
  const [high, setHigh] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/tickets", { params: { priority: "urgent", status: "open" } }),
      api.get("/tickets", { params: { priority: "high",   status: "open" } }),
    ]).then(([u, h]) => { setUrgent(u.data); setHigh(h.data); });
  }, []);

  const loading = !urgent || !high;
  const allItems = [
    ...(urgent?.items ?? []).map((t: any) => ({ ...t, _tier: "urgent" })),
    ...(high?.items ?? []).map((t: any) => ({ ...t, _tier: "high" })),
  ].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="p-7">
      <PageHeader
        title="Escalations"
        subtitle="Open urgent and high-priority tickets requiring immediate action"
      />

      {/* Summary cards */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 anim-up">
          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-1 ring-red-200/60">
              <Flame size={22} />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{urgent?.total ?? 0}</p>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Urgent open tickets</p>
            </div>
            {(urgent?.total ?? 0) > 0 && (
              <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                {urgent.total}
              </div>
            )}
          </div>
          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 ring-1 ring-orange-200/60">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{high?.total ?? 0}</p>
              <p className="text-sm font-medium text-slate-500 mt-0.5">High-priority tickets</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.05)] overflow-hidden anim-up d3">
        {loading ? (
          <Loading rows={5} />
        ) : allItems.length === 0 ? (
          <Empty
            title="All clear — no escalations"
            text="No urgent or high-priority tickets are currently open. Your team is on top of things!"
            icon={<ShieldAlert size={28} />}
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl tbl-clickable">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Subject & Description</th>
                  <th>Customer</th>
                  <th>Priority</th>
                  <th>Waiting</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allItems.map((t: any, i: number) => {
                  const { label: waitStr, hot } = waitLabel(t.createdAt);
                  return (
                    <tr
                      key={t._id}
                      className={`anim-up d${Math.min(i + 1, 8)}`}
                      onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                    >
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-1 rounded-lg">
                          {t.ticketNumber}
                        </span>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900 max-w-[260px] truncate">{t.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-[260px] truncate">{t.description}</p>
                      </td>
                      <td>
                        <p className="font-medium text-slate-800">{t.customerName || "—"}</p>
                        <p className="text-xs text-slate-400">{t.customerEmail || "—"}</p>
                      </td>
                      <td>
                        <Badge tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge>
                      </td>
                      <td>
                        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          hot
                            ? t.priority === "urgent"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          <Clock size={11} />
                          {waitStr}
                        </span>
                      </td>
                      <td>
                        <ChevronRight size={15} className="text-slate-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
