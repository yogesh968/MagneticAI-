"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Empty, Loading, PageHeader, Pagination } from "@/components/ui";
import { MessageSquare, Search, Filter } from "lucide-react";

const STATUS_TONE: Record<string, string> = { active: "green", closed: "slate", escalated: "red" };
const STATUS_LABEL: Record<string, string> = { active: "Active", closed: "Closed", escalated: "Escalated" };

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-600", "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600", "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600", "from-cyan-500 to-sky-600",
];

function getColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export default function ConversationsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setData(null);
    const id = setTimeout(() => {
      api.get("/conversations", {
        params: { page, search: search || undefined, status: status || undefined },
      }).then((r) => setData(r.data));
    }, search ? 280 : 0);
    return () => clearTimeout(id);
  }, [page, search, status]);

  return (
    <div className="p-7">
      <PageHeader
        title="Conversations"
        subtitle="All customer support sessions across your platform"
      />

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 py-2"
            placeholder="Search name, email or message…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span className="filter-divider" />
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 shrink-0" />
          <span className="text-xs font-medium text-slate-500 shrink-0">Status</span>
        </div>
        {["", "active", "escalated", "closed"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              status === s
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {s === "" ? "All" : STATUS_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.05)] overflow-hidden anim-up d2">
        {!data ? (
          <Loading rows={6} />
        ) : data.items.length === 0 ? (
          <Empty
            title="No conversations found"
            text={search || status ? "Try different search terms or filters." : "Conversations appear once customers chat via your widget."}
            icon={<MessageSquare size={26} />}
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Last Message</th>
                    <th>Status</th>
                    <th>Messages</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c: any, i: number) => (
                    <tr
                      key={c._id}
                      className={`cursor-pointer anim-up d${Math.min(i + 1, 8)}`}
                      onClick={() => router.push(`/dashboard/conversations/${c._id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${getColor(c.customerName || "A")}`}>
                            {(c.customerName || "A")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {c.customerName || "Anonymous"}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{c.customerEmail || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm text-slate-600 max-w-[280px] truncate">
                          {c.lastMessage?.content || <span className="text-slate-300 italic">No messages</span>}
                        </p>
                      </td>
                      <td>
                        <Badge tone={STATUS_TONE[c.status] ?? "slate"}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                            <MessageSquare size={11} className="text-slate-500" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 tabular-nums">{c.messageCount}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-slate-400">
                        {new Date(c.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
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
