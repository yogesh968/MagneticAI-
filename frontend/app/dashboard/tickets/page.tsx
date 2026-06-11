"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Empty, Loading, PageHeader, Pagination } from "@/components/ui";
import { TicketCheck, Search, Filter } from "lucide-react";

const STATUS_TONE: Record<string, string> = { open: "blue", in_progress: "amber", resolved: "green", closed: "slate" };
const PRIORITY_TONE: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };

export default function TicketsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setData(null);
    const id = setTimeout(() => {
      api.get("/tickets", {
        params: { page, search: search || undefined, status: status || undefined, priority: priority || undefined },
      }).then((r) => setData(r.data));
    }, search ? 280 : 0);
    return () => clearTimeout(id);
  }, [page, search, status, priority]);

  return (
    <div className="p-7">
      <PageHeader title="Tickets" subtitle="Support tickets created from escalated AI conversations" />

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 py-2"
            placeholder="Search tickets, customers…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <span className="filter-divider" />

        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-400">Status</span>
        </div>
        {["", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${status === s ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}

        <span className="filter-divider" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400">Priority</span>
        </div>
        {["", "urgent", "high", "medium", "low"].map((p) => (
          <button key={p} onClick={() => { setPriority(p); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${priority === p ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
            {p === "" ? "All" : p}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.05)] overflow-hidden anim-up d2">
        {!data ? (
          <Loading rows={6} />
        ) : data.items.length === 0 ? (
          <Empty
            title="No tickets found"
            text="Tickets are created automatically when the AI detects escalation keywords."
            icon={<TicketCheck size={26} />}
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl tbl-clickable">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t: any, i: number) => (
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
                        <p className="font-semibold text-slate-900 max-w-[200px] truncate leading-tight">{t.subject}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-[10px] font-bold text-white">
                            {(t.customerName || "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 leading-tight">{t.customerName || "—"}</p>
                            <p className="text-xs text-slate-400">{t.customerEmail || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge></td>
                      <td><Badge tone={STATUS_TONE[t.status] ?? "slate"}>{t.status.replace("_", " ")}</Badge></td>
                      <td>
                        {t.assignedTo?.name
                          ? <span className="text-sm font-medium text-slate-700">{t.assignedTo.name}</span>
                          : <span className="text-xs text-slate-300 italic">Unassigned</span>}
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <Pagination page={page} pages={data.pages} total={data.total} onChange={(p) => { setPage(p); setData(null); }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
