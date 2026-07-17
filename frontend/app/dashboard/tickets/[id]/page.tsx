"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Loading, InfoRow, Spinner } from "@/components/ui";
import { ArrowLeft, Bot, User, Send, StickyNote, MessageSquare, Info } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_TONE: Record<string, string> = { open: "blue", in_progress: "amber", resolved: "green", closed: "slate" };
const PRIORITY_TONE: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = () => api.get(`/tickets/${id}`).then((r) => setData(r.data));
  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (patch: Record<string, string>) => {
    setSaving(true);
    try {
      await api.put(`/tickets/${id}`, patch);
      toast.success("Updated");
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Update failed");
    } finally { setSaving(false); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.put(`/tickets/${id}`, { note });
      setNote("");
      toast.success("Note added");
      reload();
    } finally { setSaving(false); }
  };

  if (!data) return <div className="p-8"><Loading rows={7} /></div>;
  const { ticket: t, messages } = data;

  return (
    <div className="p-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 anim-up">
        <button onClick={() => router.back()} className="btn-secondary btn-icon shrink-0 mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold text-ink bg-sunken border border-hairline px-2.5 py-1 rounded-lg">
              {t.ticketNumber}
            </span>
            <Badge tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge>
            <Badge tone={STATUS_TONE[t.status] ?? "slate"}>{t.status.replace("_", " ")}</Badge>
          </div>
          <h1 className="page-title leading-snug">{t.subject}</h1>
          <p className="page-sub">
            {[t.customerName, t.customerEmail].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

        {/* Left column */}
        <div className="space-y-4 min-w-0">

          {/* Description */}
          <div className="card anim-up d2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunken">
                <Info size={14} className="text-ink-muted" />
              </div>
              <p className="section-title">Description</p>
            </div>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-sunken rounded-xl px-4 py-3">
              {t.description}
            </p>
          </div>

          {/* Conversation thread */}
          {messages.length > 0 && (
            <div className="card anim-up d3">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunken">
                  <MessageSquare size={14} className="text-ink" />
                </div>
                <p className="section-title">Conversation</p>
                <span className="ml-auto rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                  {messages.length} messages
                </span>
              </div>
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {messages.map((m: any) => {
                  const isUser = m.role === "user";
                  if (m.role === "system") return (
                    <div key={m._id} className="flex justify-center">
                      <span className="bubble-system">{m.content}</span>
                    </div>
                  );
                  return (
                    <div key={m._id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isUser ? "bg-ink text-white" : "bg-sunken text-ink-muted"}`}>
                        {isUser ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div className={isUser ? "bubble-user" : "bubble-bot"}>
                        <p>{m.content}</p>
                        <p className={`mt-1.5 text-[10px] ${isUser ? "text-white/70" : "text-ink-faint"}`}>
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card anim-up d4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <StickyNote size={14} className="text-amber-600" />
              </div>
              <p className="section-title">Internal Notes</p>
            </div>

            <div className="space-y-2 mb-4">
              {!t.notes?.length && (
                <p className="text-sm text-ink-faint italic py-2">No notes yet — add one below.</p>
              )}
              {t.notes?.map((n: any, i: number) => (
                <div key={i} className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3">
                  <p className="text-sm text-ink leading-relaxed">{n.body}</p>
                  {n.createdAt && (
                    <p className="mt-1.5 text-xs text-amber-600/70">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Add an internal note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addNote()}
              />
              <button
                onClick={addNote}
                disabled={saving || !note.trim()}
                className="btn-primary shrink-0 px-3.5"
              >
                {saving ? <Spinner size={14} /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Status */}
          <div className="card anim-up d2">
            <p className="label">Status</p>
            <select
              className="input"
              value={t.status}
              disabled={saving}
              onChange={(e) => update({ status: e.target.value })}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="card anim-up d3">
            <p className="label">Priority</p>
            <select
              className="input"
              value={t.priority}
              disabled={saving}
              onChange={(e) => update({ priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Details */}
          <div className="card anim-up d4">
            <p className="label">Details</p>
            <div className="divide-y divide-hairline">
              <InfoRow label="Ticket #" value={<span className="font-mono text-ink font-bold text-xs">{t.ticketNumber}</span>} />
              <InfoRow label="Customer" value={t.customerName || "—"} />
              <InfoRow label="Email" value={<span className="text-xs truncate max-w-[130px] block">{t.customerEmail || "—"}</span>} />
              <InfoRow label="Assigned" value={t.assignedTo?.name || <span className="text-ink-faint italic">Unassigned</span>} />
              <InfoRow label="Created" value={new Date(t.createdAt).toLocaleDateString()} />
              {t.resolvedAt && (
                <InfoRow label="Resolved" value={<span className="text-emerald-600 font-semibold">{new Date(t.resolvedAt).toLocaleDateString()}</span>} />
              )}
            </div>
          </div>

          {/* Quick actions */}
          {t.status !== "resolved" && t.status !== "closed" && (
            <div className="card anim-up d5 space-y-2">
              <p className="label">Quick Actions</p>
              <button
                onClick={() => update({ status: "resolved" })}
                disabled={saving}
                className="btn-success w-full gap-2"
              >
                Mark as Resolved
              </button>
              <button
                onClick={() => update({ status: "closed" })}
                disabled={saving}
                className="btn-secondary w-full"
              >
                Close Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
