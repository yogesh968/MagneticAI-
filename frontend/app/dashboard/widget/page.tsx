"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useBots } from "@/lib/bots";
import { BotSelector } from "@/components/BotSelector";
import { Empty, Loading, PageHeader, Spinner } from "@/components/ui";
import toast from "react-hot-toast";
import { Code2, Copy, Check, ExternalLink, Palette, Monitor, Bot as BotIcon, Plus } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type FormValues = { widgetColor: string; widgetPosition: "bottom-right" | "bottom-left" };

const PRESET_COLORS = [
  "#0A0A0B", "#7c3aed", "#059669", "#dc2626",
  "#d97706", "#0891b2", "#db2777", "#475569",
];

function WidgetClient() {
  const { bots, selected, selectBot, reload: reloadBots, loading: botsLoading } = useBots();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { widgetColor: "#0A0A0B", widgetPosition: "bottom-right" },
  });

  const color    = watch("widgetColor");
  const position = watch("widgetPosition");
  const botId = selected?._id;

  useEffect(() => {
    if (!botId) return;
    setLoading(true);
    api.get(`/bots/${botId}`)
      .then((r) => {
        reset({
          widgetColor:    r.data.settings?.widgetColor    ?? "#0A0A0B",
          widgetPosition: r.data.settings?.widgetPosition ?? "bottom-right",
        });
      })
      .catch(() => toast.error("Failed to load widget config"))
      .finally(() => setLoading(false));
  }, [botId, reset]);

  const save = async (values: FormValues) => {
    if (!botId) return;
    try {
      await api.put(`/bots/${botId}`, { settings: values });
      toast.success(`Widget settings saved for ${selected?.botName}`);
      void reloadBots();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Save failed");
    }
  };

  // Each bot gets its own embed — data-bot-id is what picks which bot answers.
  const snippet = `<!-- Magentic AI — ${selected?.botName ?? "Bot"} -->\n<script src="${API_URL}/widget.js" data-bot-id="${botId ?? ""}"></script>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  if (botsLoading || (loading && selected)) return <div className="p-8"><Loading rows={5} /></div>;

  if (!bots?.length || !selected) {
    return (
      <div className="p-7 max-w-3xl mx-auto">
        <PageHeader title="Widget Settings" subtitle="Embed a bot on any website" />
        <div className="rounded-2xl border border-hairline bg-white">
          <Empty
            title="No bots yet"
            text="Create a bot to get an embed snippet."
            icon={<BotIcon size={28} />}
            action={<Link href="/dashboard/bots" className="btn-primary gap-2"><Plus size={14} /> Create a bot</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 max-w-3xl mx-auto">
      <PageHeader title="Widget Settings" subtitle="Each bot has its own embed snippet and appearance" />

      {/* Bot scope bar — z-20 so the selector's dropdown paints above the cards below. */}
      <div className="card anim-up relative z-20 mb-5">
        <BotSelector bots={bots} selected={selected} onSelect={selectBot} label="Embedding" />
      </div>

      <div className="space-y-5">
        {/* Embed code */}
        <div className="card anim-up">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
              <Code2 size={16} className="text-ink" />
            </div>
            <div>
              <p className="section-title">Embed Code</p>
              <p className="text-xs text-ink-faint mt-0.5">
                Paste before &lt;/body&gt; — this snippet loads <span className="font-semibold text-ink-muted">{selected.botName}</span>
              </p>
            </div>
          </div>
          <div className="relative rounded-xl bg-ink p-5 font-mono text-sm text-emerald-400">
            <pre className="whitespace-pre-wrap break-all">{snippet}</pre>
            <button
              onClick={copySnippet}
              className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href={`${API_URL}/widget.js`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm gap-1.5"
            >
              <ExternalLink size={12} /> Preview widget.js
            </a>
          </div>
        </div>

        {/* Customisation */}
        <form onSubmit={handleSubmit(save)} className="space-y-5">
          <div className="card anim-up d2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
                <Palette size={16} className="text-ink" />
              </div>
              <p className="section-title">Appearance</p>
            </div>

            {/* Color picker */}
            <div className="mb-5">
              <label className="label">Brand Color</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("widgetColor", c)}
                    style={{ background: c }}
                    className={`h-9 w-9 rounded-xl transition-transform hover:scale-110 ${
                      color === c ? "ring-2 ring-offset-2 ring-ink scale-110" : ""
                    }`}
                    title={c}
                  />
                ))}
                <div className="flex items-center gap-2 rounded-xl border border-hairline bg-sunken px-3 py-2">
                  <input
                    type="color"
                    {...register("widgetColor")}
                    className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-mono text-ink-muted">{color}</span>
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="label">Widget Position</label>
              <div className="grid grid-cols-2 gap-3">
                {(["bottom-right", "bottom-left"] as const).map((pos) => (
                  <label
                    key={pos}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                      position === pos
                        ? "border-ink bg-sunken"
                        : "border-hairline hover:border-hairline-strong"
                    }`}
                  >
                    <input type="radio" {...register("widgetPosition")} value={pos} className="sr-only" />
                    <div className={`flex h-16 w-24 items-end rounded-lg border-2 ${position === pos ? "border-hairline-strong bg-sunken" : "border-hairline bg-sunken"} p-1.5`}>
                      <div
                        style={{ background: color }}
                        className={`h-6 w-6 rounded-full ${pos === "bottom-right" ? "ml-auto" : "mr-auto"}`}
                      />
                    </div>
                    <span className="text-sm font-medium text-ink-soft capitalize">
                      {pos.replace("-", " ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="card anim-up d3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
                <Monitor size={16} className="text-ink-muted" />
              </div>
              <p className="section-title">Preview</p>
            </div>
            <div className="relative h-48 rounded-xl bg-gradient-to-br from-sunken to-hairline border border-hairline overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-ink-faint">Your website</p>
              </div>
              {/* Simulated widget button */}
              <div
                className={`absolute bottom-4 ${position === "bottom-right" ? "right-4" : "left-4"} flex h-12 w-12 items-center justify-center rounded-full shadow-lg`}
                style={{ background: color }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
            {isSubmitting ? <><Spinner size={15} /> Saving…</> : `Save settings for ${selected.botName}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  // useBots reads ?bot= via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="p-8"><Loading rows={5} /></div>}>
      <WidgetClient />
    </Suspense>
  );
}
