"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  Bot as BotIcon, Plus, Star, Trash2, BookOpen, Code2, Copy, Check,
  X, Settings2, AlertTriangle,
} from "lucide-react";
import { api, readSessionHint } from "@/lib/api";
import type { Bot } from "@/lib/bots";
import { Badge, Empty, Loading, PageHeader, Spinner } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const PRESET_COLORS = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2", "#db2777", "#475569"];

type CreateForm = { botName: string; description: string; personality: Bot["personality"]; widgetColor: string };

function EmbedSnippet({ botId }: { botId: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${API_URL}/widget.js" data-bot-id="${botId}"></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Embed code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-3 rounded-lg bg-slate-900 p-3 pr-10 font-mono text-[11px] leading-relaxed text-emerald-400">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all">{snippet}</pre>
      <button
        onClick={copy}
        title="Copy embed code"
        className="absolute right-2 top-2 rounded-md bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export default function BotsClient() {
  const [bots, setBots] = useState<Bot[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    defaultValues: { botName: "", description: "", personality: "professional", widgetColor: "#2563eb" },
  });
  const color = watch("widgetColor");

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<Bot[]>("/bots");
      setBots(data);
    } catch {
      toast.error("Could not load bots");
      setBots([]);
    }
  }, []);

  useEffect(() => {
    void reload();
    const role = readSessionHint()?.role;
    setIsAdmin(role === "admin" || role === "superadmin");
  }, [reload]);

  const create = async (values: CreateForm) => {
    try {
      await api.post("/bots", {
        botName: values.botName,
        description: values.description || undefined,
        personality: values.personality,
        settings: { widgetColor: values.widgetColor },
      });
      toast.success(`"${values.botName}" created`);
      reset();
      setCreating(false);
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Could not create bot");
    }
  };

  const makeDefault = async (bot: Bot) => {
    setBusyId(bot._id);
    try {
      await api.post(`/bots/${bot._id}/default`);
      toast.success(`"${bot.botName}" is now the default bot`);
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Could not set default");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (bot: Bot) => {
    const docs = bot.documentCount ?? 0;
    const warning = docs > 0
      ? `\n\nThis will permanently delete its ${docs} document${docs === 1 ? "" : "s"} and everything it has learned from them.`
      : "";
    if (!confirm(`Delete "${bot.botName}"?${warning}\n\nConversations it handled are kept.`)) return;

    setBusyId(bot._id);
    try {
      await api.delete(`/bots/${bot._id}`);
      toast.success(`"${bot.botName}" deleted`);
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Could not delete bot");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-7">
      <PageHeader
        title="Bots"
        subtitle="Each bot has its own personality and its own knowledge base"
        action={
          isAdmin && !creating ? (
            <button onClick={() => setCreating(true)} className="btn-primary gap-2">
              <Plus size={14} /> New bot
            </button>
          ) : undefined
        }
      />

      {/* Create form */}
      {creating && (
        <form onSubmit={handleSubmit(create)} className="card anim-up mb-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-title">Create a bot</p>
            <button type="button" onClick={() => { setCreating(false); reset(); }} className="btn-ghost btn-sm p-1.5 text-slate-400">
              <X size={15} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                {...register("botName", { required: "Name is required", maxLength: { value: 60, message: "Max 60 characters" } })}
                placeholder="Billing Assistant"
                className={`input ${errors.botName ? "input-error" : ""}`}
              />
              {errors.botName && <p className="mt-1 text-xs text-red-500">{errors.botName.message}</p>}
            </div>
            <div>
              <label className="label">Personality</label>
              <select {...register("personality")} className="input">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Description <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              {...register("description", { maxLength: { value: 280, message: "Max 280 characters" } })}
              placeholder="Handles invoices, payments and subscription questions"
              className="input"
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="mt-4">
            <label className="label">Widget colour</label>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("widgetColor", c)}
                  style={{ background: c }}
                  title={c}
                  className={`h-8 w-8 rounded-lg transition-transform hover:scale-110 ${color === c ? "scale-110 ring-2 ring-blue-600 ring-offset-2" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => { setCreating(false); reset(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
              {isSubmitting ? <Spinner size={14} /> : <Plus size={14} />} Create bot
            </button>
          </div>
        </form>
      )}

      {/* Bot grid */}
      {!bots ? (
        <Loading rows={3} />
      ) : bots.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white">
          <Empty
            title="No bots yet"
            text="Create a bot, give it a knowledge base, and embed it on your site."
            icon={<BotIcon size={28} />}
            action={isAdmin ? <button onClick={() => setCreating(true)} className="btn-primary gap-2"><Plus size={14} /> Create your first bot</button> : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot, i) => {
            const botColor = bot.settings?.widgetColor ?? "#2563eb";
            const docs = bot.documentCount ?? 0;
            const busy = busyId === bot._id;
            return (
              <div key={bot._id} className={`card anim-up d${Math.min(i + 1, 8)} flex flex-col`}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: botColor }}
                  >
                    <BotIcon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[15px] font-bold text-slate-900">{bot.botName}</p>
                      {bot.isDefault && <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                      {bot.description || "No description"}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={bot.isActive ? "green" : "slate"}>{bot.isActive ? "Active" : "Inactive"}</Badge>
                  {bot.isDefault && <Badge tone="amber">Default</Badge>}
                  <Badge tone="purple">{bot.personality}</Badge>
                </div>

                {/* Knowledge summary — the thing that tells you what this bot knows */}
                <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <BookOpen size={11} /> Knowledge base
                    </span>
                    <Link
                      href={`/dashboard/knowledge-base?bot=${bot._id}`}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Manage →
                    </Link>
                  </div>
                  {docs === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">
                      No documents — this bot can only handle small talk.
                    </p>
                  ) : (
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {docs} doc{docs === 1 ? "" : "s"}
                      </span>
                      <span className="text-slate-400 tabular-nums">{bot.chunkCount ?? 0} chunks</span>
                      {(bot.failedCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-red-500">
                          <AlertTriangle size={11} /> {bot.failedCount} failed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Embed */}
                {showEmbed === bot._id && <EmbedSnippet botId={bot._id} />}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                  <Link href={`/dashboard/ai-config?bot=${bot._id}`} className="btn-secondary btn-sm gap-1.5">
                    <Settings2 size={12} /> Configure
                  </Link>
                  <button
                    onClick={() => setShowEmbed(showEmbed === bot._id ? null : bot._id)}
                    className="btn-ghost btn-sm gap-1.5 text-slate-500"
                  >
                    <Code2 size={12} /> Embed
                  </button>

                  {isAdmin && (
                    <div className="ml-auto flex items-center gap-1">
                      {!bot.isDefault && (
                        <button
                          onClick={() => makeDefault(bot)}
                          disabled={busy}
                          title="Make default"
                          className="btn-ghost btn-sm p-1.5 text-slate-300 hover:text-amber-500"
                        >
                          <Star size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(bot)}
                        disabled={busy || bots.length <= 1 || bot.isDefault}
                        title={
                          bots.length <= 1 ? "You cannot delete your only bot"
                            : bot.isDefault ? "Make another bot the default first"
                            : "Delete bot"
                        }
                        className="btn-ghost btn-sm p-1.5 text-slate-300 hover:text-red-500 disabled:cursor-not-allowed disabled:hover:text-slate-300"
                      >
                        {busy ? <Spinner size={13} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
