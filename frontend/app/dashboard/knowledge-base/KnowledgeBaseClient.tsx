"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useBots } from "@/lib/bots";
import { BotSelector } from "@/components/BotSelector";
import { Badge, Empty, Loading, PageHeader, Spinner } from "@/components/ui";
import {
  BookOpen, RefreshCw, Trash2, Upload, Bot as BotIcon,
  FileText, CheckCircle2, XCircle, Loader2, CloudUpload, Plus,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_TONE: Record<string, string> = {
  indexed: "green", processing: "amber", pending: "blue", failed: "red",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "indexed")    return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === "failed")     return <XCircle size={14} className="text-red-500" />;
  if (status === "processing") return <Loader2 size={14} className="text-amber-500 animate-spin" />;
  return <Loader2 size={14} className="text-blue-400" />;
}

function fmtBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

export default function KnowledgeBaseClient() {
  const { bots, selected, selectBot, reload: reloadBots, loading: botsLoading } = useBots();
  const [data, setData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const botId = selected?._id;

  // Documents are always scoped to the selected bot — the whole point is that you
  // can see which bot a document belongs to before and after uploading it.
  const reload = useCallback(() => {
    if (!botId) return Promise.resolve();
    return api.get("/kb/documents", { params: { botId, limit: 100 } })
      .then((r) => setData(r.data))
      .catch(() => {});
  }, [botId]);

  useEffect(() => { setData(null); void reload(); }, [reload]);

  useEffect(() => {
    const busy = data?.items?.some((d: any) => ["processing", "pending"].includes(d.status));
    if (!busy) return;
    const id = setTimeout(() => { void reload(); void reloadBots(); }, 3000);
    return () => clearTimeout(id);
  }, [data, reload, reloadBots]);

  const doUpload = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("botId", selected._id);
      await api.post("/kb/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`"${file.name}" added to ${selected.botName} — indexing now`);
      void reload();
      void reloadBots();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void doUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) void doUpload(file);
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from ${selected?.botName}'s knowledge base?`)) return;
    await api.delete(`/kb/documents/${id}`);
    toast.success("Document removed");
    void reload();
    void reloadBots();
  };

  const reindex = async () => {
    if (!selected) return;
    setReindexing(true);
    try {
      await api.post("/kb/reindex", { botId: selected._id });
      toast.success(`Re-indexing ${selected.botName}'s documents`);
      setTimeout(() => { void reload(); void reloadBots(); }, 2000);
    } finally {
      setReindexing(false);
    }
  };

  if (botsLoading) return <div className="p-7"><Loading rows={5} /></div>;

  // Uploading requires a bot to attach the document to.
  if (!bots?.length || !selected) {
    return (
      <div className="p-7">
        <PageHeader title="Knowledge Base" subtitle="Documents your bots answer from" />
        <div className="rounded-2xl border border-slate-200/60 bg-white">
          <Empty
            title="Create a bot first"
            text="Documents belong to a bot, so there is nowhere to put them yet."
            icon={<BotIcon size={28} />}
            action={<Link href="/dashboard/bots" className="btn-primary gap-2"><Plus size={14} /> Create a bot</Link>}
          />
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];
  const stats = [
    { label: "Documents", value: data?.total ?? 0, color: "text-blue-600 bg-blue-50 ring-blue-200/60" },
    { label: "Indexed", value: items.filter((d: any) => d.status === "indexed").length, color: "text-emerald-600 bg-emerald-50 ring-emerald-200/60" },
    { label: "Total Chunks", value: items.reduce((s: number, d: any) => s + (d.chunkCount ?? 0), 0), color: "text-purple-600 bg-purple-50 ring-purple-200/60" },
  ];
  const failed = items.filter((d: any) => d.status === "failed").length;

  return (
    <div className="p-7">
      <PageHeader
        title="Knowledge Base"
        subtitle="Documents are scoped to one bot — each bot only answers from its own"
      />

      {/* Bot scope bar — states plainly which bot receives an upload.
          Needs a stacking context: the selector's dropdown is absolutely
          positioned and would otherwise paint behind the cards below it. */}
      <div className="card anim-up relative z-20 mb-5 flex flex-wrap items-end justify-between gap-4">
        <BotSelector bots={bots} selected={selected} onSelect={selectBot} label="Adding documents to" />

        <div className="flex items-center gap-2">
          <button onClick={reindex} disabled={reindexing || items.length === 0} className="btn-secondary gap-2">
            <RefreshCw size={14} className={reindexing ? "animate-spin" : ""} />
            Reindex
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary gap-2">
            {uploading ? <Spinner size={14} /> : <Upload size={14} />}
            {uploading ? "Uploading…" : `Upload to ${selected.botName}`}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={onFileChange} />
        </div>
      </div>

      {failed > 0 && (
        <div className="anim-up mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <XCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">{failed} document{failed === 1 ? "" : "s"} failed to index.</span>{" "}
            {selected.botName} cannot answer from {failed === 1 ? "it" : "them"}. This usually means the embedding
            provider was unreachable — try Reindex.
          </p>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="anim-up mb-5 grid grid-cols-3 gap-4">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-extrabold ring-1 ${color} tabular-nums`}>
                {value}
              </div>
              <p className="text-sm font-semibold text-slate-600">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Drag-drop zone (when empty) */}
      {data && items.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`mb-5 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 transition-all ${
            drag ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <CloudUpload size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">
              Drop a file to teach <span style={{ color: selected.settings?.widgetColor ?? "#2563eb" }}>{selected.botName}</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">Supports PDF, DOCX, TXT, Markdown — up to 10 MB</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="anim-up d2 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.05)]"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {!data ? (
          <Loading rows={5} />
        ) : items.length === 0 ? (
          <Empty
            title={`${selected.botName} has no documents`}
            text="Until you add one, this bot can only handle greetings and small talk."
            icon={<BookOpen size={28} />}
            action={
              <button onClick={() => fileRef.current?.click()} className="btn-primary gap-2">
                <Upload size={14} /> Upload a document
              </button>
            }
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Chunks</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((d: any, i: number) => (
                  <tr key={d._id} className={`anim-up d${Math.min(i + 1, 8)}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                          <FileText size={15} className="text-slate-500" />
                        </div>
                        <span className="max-w-[220px] truncate font-semibold text-slate-900">{d.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="rounded-lg border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {d.type}
                      </span>
                    </td>
                    <td className="text-sm tabular-nums text-slate-500">{fmtBytes(d.metadata?.size)}</td>
                    <td>
                      <span className={`text-sm font-bold tabular-nums ${d.chunkCount > 0 ? "text-slate-900" : "text-slate-300"}`}>
                        {d.chunkCount}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={d.status} />
                        <Badge tone={STATUS_TONE[d.status] ?? "slate"}>{d.status}</Badge>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-400">
                      {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td>
                      <button
                        onClick={() => del(d._id, d.name)}
                        className="btn-ghost btn-sm p-2 text-slate-300 hover:text-red-500"
                        title="Remove document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
