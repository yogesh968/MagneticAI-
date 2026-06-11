"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Badge, Loading, Spinner } from "@/components/ui";
import {
  ArrowLeft, Bot, User, Send, Trash2, UserCheck,
  UserX, Wifi, WifiOff, Clock, Mail,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_TONE: Record<string, string> = { active: "green", closed: "slate", escalated: "red" };

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData]             = useState<any>(null);
  const [messages, setMessages]     = useState<any[]>([]);
  const [agentMsg, setAgentMsg]     = useState("");
  const [sending, setSending]       = useState(false);
  const [handoffActive, setHandoff] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversation ────────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/conversations/${id}`)
      .then((r) => {
        setData(r.data);
        setMessages(r.data.messages ?? []);
        setHandoff(r.data.conversation?.isEscalated === false);
      })
      .catch(() => router.replace("/dashboard/conversations"));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket.io ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    socket.connect();

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join:conversation", { conversationId: id, token });
    });

    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("message:new", (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      setCustomerTyping(false);
    });

    socket.on("handoff:active", ({ agentName, message }: any) => {
      setHandoff(true);
      if (message) setMessages((prev) => [...prev, message]);
      toast.success(`${agentName} has taken over the conversation`);
    });

    socket.on("typing:start", ({ isAgent }: any) => {
      if (!isAgent) setCustomerTyping(true);
    });
    socket.on("typing:stop", () => setCustomerTyping(false));

    socket.on("customer:message", (msg: any) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setCustomerTyping(false);
    });

    return () => {
      socket.emit("leave:conversation", { conversationId: id });
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message:new");
      socket.off("handoff:active");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("customer:message");
      socket.disconnect();
    };
  }, [id]);

  // ── Handoff: agent takes over ────────────────────────────────────────────
  const takeOver = () => {
    socket.emit("handoff:request", { conversationId: id });
    setHandoff(true);
    toast.success("You've taken over this conversation");
  };

  // ── Send agent message ────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = agentMsg.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      socket.emit("agent:message", { conversationId: id, content: text });
      setAgentMsg("");
    } finally {
      setSending(false);
    }
  };

  // ── Delete conversation ───────────────────────────────────────────────────
  const del = async () => {
    if (!confirm("Permanently delete this conversation?")) return;
    setDeleting(true);
    try {
      await api.delete(`/conversations/${id}`);
      toast.success("Conversation deleted");
      router.push("/dashboard/conversations");
    } catch {
      toast.error("Delete failed");
      setDeleting(false);
    }
  };

  if (!data) return <div className="p-8"><Loading rows={7} /></div>;
  const c = data.conversation;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 shrink-0">
        <button onClick={() => router.back()} className="btn-secondary btn-icon">
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {c.customerName || "Anonymous"}
            </h1>
            <Badge tone={STATUS_TONE[c.status] ?? "slate"}>{c.status}</Badge>
            {c.isEscalated && <Badge tone="red">Escalated</Badge>}
            {handoffActive && <Badge tone="green">🟢 Human active</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            {c.customerEmail && (
              <span className="flex items-center gap-1"><Mail size={11} />{c.customerEmail}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(c.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Socket status */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${socketConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {socketConnected ? "Connected" : "Offline"}
        </div>

        {/* Take over / release */}
        {!handoffActive ? (
          <button onClick={takeOver} className="btn-primary gap-2">
            <UserCheck size={15} /> Take over
          </button>
        ) : (
          <button
            onClick={() => {
              socket.emit("leave:conversation", { conversationId: id });
              setHandoff(false);
              toast("Released handoff — AI resumed");
            }}
            className="btn-secondary gap-2"
          >
            <UserX size={15} /> Release
          </button>
        )}

        <button onClick={del} disabled={deleting} className="btn-danger gap-2">
          <Trash2 size={14} />
          {deleting ? "…" : "Delete"}
        </button>
      </div>

      {/* ── Main: messages + sidebar ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Messages */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Handoff banner */}
          {handoffActive && (
            <div className="flex items-center gap-2 bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-sm font-semibold text-emerald-800 shrink-0">
              <UserCheck size={15} />
              You are now handling this conversation — your replies go directly to the customer.
            </div>
          )}

          {/* Thread */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">No messages yet.</p>
              </div>
            ) : messages.map((m: any, i: number) => {
              const isUser   = m.role === "user";
              const isSystem = m.role === "system";
              const isHuman  = m.eventType === "human_joined";

              if (isSystem) return (
                <div key={m._id ?? i} className="flex justify-center">
                  <span className="bubble-system">{m.content}</span>
                </div>
              );

              return (
                <div key={m._id ?? i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : isHuman
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {isUser ? <User size={13} /> : isHuman ? <UserCheck size={13} /> : <Bot size={13} />}
                  </div>
                  <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                    <p className="text-[10px] font-semibold text-slate-400 px-1">
                      {isUser ? (c.customerName || "Customer") : isHuman ? "You (Agent)" : "AI Bot"}
                    </p>
                    <div className={isUser ? "bubble-user" : "bubble-bot"}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                    <p className={`text-[10px] px-1 ${isUser ? "text-blue-400" : "text-slate-400"}`}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Customer typing */}
            {customerTyping && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <User size={13} />
                </div>
                <div className="bubble-bot">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Agent input */}
          <div className={`border-t border-slate-200 bg-white p-4 shrink-0 ${!handoffActive ? "opacity-50 pointer-events-none" : ""}`}>
            {!handoffActive && (
              <p className="text-xs text-center text-slate-400 mb-2">
                Click <strong>&quot;Take over&quot;</strong> to send messages to the customer
              </p>
            )}
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Type a reply to the customer…"
                value={agentMsg}
                onChange={(e) => {
                  setAgentMsg(e.target.value);
                  if (e.target.value) {
                    socket.emit("typing:start", { conversationId: id });
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={!handoffActive}
              />
              <button
                onClick={sendMessage}
                disabled={!handoffActive || !agentMsg.trim() || sending}
                className="btn-primary shrink-0 px-4 gap-2"
              >
                {sending ? <Spinner size={14} /> : <Send size={14} />}
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-5 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Customer</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-medium text-slate-900 truncate ml-2">{c.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-900 truncate ml-2 max-w-[140px]">{c.customerEmail || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Messages</span>
                <span className="font-semibold text-slate-900">{messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge tone={STATUS_TONE[c.status] ?? "slate"}>{c.status}</Badge>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Handoff</p>
            <div className={`rounded-xl border p-3 text-sm ${handoffActive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              {handoffActive ? (
                <p className="text-emerald-700 font-semibold flex items-center gap-2">
                  <UserCheck size={14} /> You are live
                </p>
              ) : (
                <p className="text-slate-500">AI is handling this conversation.</p>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Replies</p>
            <div className="space-y-2">
              {[
                "Thanks for reaching out! Let me look into this for you.",
                "Could you please provide more details?",
                "I'll escalate this to our specialist team.",
                "This has been resolved. Is there anything else I can help with?",
              ].map((qr) => (
                <button
                  key={qr}
                  onClick={() => { setAgentMsg(qr); }}
                  disabled={!handoffActive}
                  className="w-full text-left text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-40"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
