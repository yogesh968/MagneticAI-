"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Empty, Loading, PageHeader, Spinner } from "@/components/ui";
import {
  BookOpen, RefreshCw, Trash2, Upload,
  FileText, CheckCircle2, XCircle, Loader2, CloudUpload,
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

export default function KnowledgeBasePage() {
  const [data, setData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => api.get("/kb/documents").then((r) => setData(r.data));
  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const busy = data?.items?.some((d: any) => ["processing", "pending"].includes(d.status));
    if (!busy) return;
    const id = setTimeout(reload, 3000);
    return () => clearTimeout(id);
  }, [data]);

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/kb/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`"${file.name}" uploaded — indexing in background`);
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from knowledge base?`)) return;
    await api.delete(`/kb/documents/${id}`);
    toast.success("Document removed");
    reload();
  };

  const reindex = async () => {
    setReindexing(true);
    await api.post("/kb/reindex");
    toast.success("Re-indexing started for all documents");
    setTimeout(reload, 2000);
    setReindexing(false);
  };

  const stats = [
    { label: "Documents",  value: data?.total ?? 0,   color: "text-blue-600 bg-blue-50 ring-blue-200/60" },
    { label: "Indexed",    value: data?.items?.filter((d: any) => d.status === "indexed").length ?? 0, color: "text-emerald-600 bg-emerald-50 ring-emerald-200/60" },
    { label: "Total Chunks", value: data?.items?.reduce((s: number, d: any) => s + (d.chunkCount ?? 0), 0) ?? 0, color: "text-purple-600 bg-purple-50 ring-purple-200/60" },
  ];

  return (
    <div className="p-7">
      <PageHeader
        title="Knowledge Base"
        subtitle="Upload documents for the AI to reference when answering customer questions"
        action={
          <div className="flex items-center gap-2">
            <button onClick={reindex} disabled={reindexing} className="btn-secondary gap-2">
              <RefreshCw size={14} className={reindexing ? "animate-spin" : ""} />
              Reindex all
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary gap-2">
              {uploading ? <Spinner size={14} /> : <Upload size={14} />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={onFileChange} />
          </div>
        }
      />

      {/* Stats */}
      {data && (
        <div className="mb-5 grid grid-cols-3 gap-4 anim-up">
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
      {data && data.items.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`mb-5 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 cursor-pointer transition-all ${
            drag ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <CloudUpload size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">Drop a file here, or click to browse</p>
            <p className="mt-1 text-sm text-slate-400">Supports PDF, DOCX, TXT, Markdown — up to 10 MB</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-2xl bg-white border border-slate-200/60 shadow-[0_1px_3px_0_rgb(0,0,0,0.05)] overflow-hidden anim-up d2"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {!data ? (
          <Loading rows={5} />
        ) : data.items.length === 0 ? (
          <Empty
            title="No documents yet"
            text="Upload PDFs, DOCX, TXT, or Markdown files to power your AI support bot."
            icon={<BookOpen size={28} />}
            action={
              <button onClick={() => fileRef.current?.click()} className="btn-primary gap-2">
                <Upload size={14} /> Upload your first document
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
                {data.items.map((d: any, i: number) => (
                  <tr key={d._id} className={`anim-up d${Math.min(i + 1, 8)}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                          <FileText size={15} className="text-slate-500" />
                        </div>
                        <span className="font-semibold text-slate-900 max-w-[220px] truncate">{d.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="rounded-lg bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {d.type}
                      </span>
                    </td>
                    <td className="text-sm text-slate-500 tabular-nums">{fmtBytes(d.metadata?.size)}</td>
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
                    <td className="text-xs text-slate-400 whitespace-nowrap">
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
