"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { api } from "@/lib/api";
import { useBots } from "@/lib/bots";
import { BotSelector } from "@/components/BotSelector";
import { Empty, Loading, PageHeader, Spinner, Tabs } from "@/components/ui";
import toast from "react-hot-toast";
import {
  Bot, Send, Plus, Trash2, Zap, MessageSquare,
  Settings2, Sparkles, ShieldCheck, BookOpen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type FormValues = {
  botName: string;
  welcomeMessage: string;
  personality: "professional" | "friendly" | "technical";
  isActive: boolean;
  escalationRules: { trigger: string; priority: "low" | "medium" | "high" | "urgent" }[];
  suggestedQuestions: { value: string }[];
};

const PERSONALITY_OPTS = [
  { value: "professional", label: "Professional", desc: "Formal, precise, and business-focused" },
  { value: "friendly",     label: "Friendly",     desc: "Warm, casual, and approachable" },
  { value: "technical",    label: "Technical",    desc: "Detailed, accurate, and technical" },
];

function AiConfigClient() {
  const { bots, selected, selectBot, reload: reloadBots, loading: botsLoading } = useBots();
  const [loading, setLoading] = useState(true);
  const [testQ, setTestQ] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [testing, setTesting] = useState(false);
  const [tab, setTab] = useState("config");

  const {
    register, handleSubmit, reset, control, watch,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues: { escalationRules: [], suggestedQuestions: [], isActive: true } });

  const { fields: rules, append: addRule, remove: rmRule } = useFieldArray({ control, name: "escalationRules" });
  const { fields: qs,    append: addQ,   remove: rmQ   } = useFieldArray({ control, name: "suggestedQuestions" });

  const personality = watch("personality");
  const isActive    = watch("isActive");

  const botId = selected?._id;

  // Reload the form whenever the selected bot changes — each bot has its own persona.
  useEffect(() => {
    if (!botId) return;
    setLoading(true);
    setTestAnswer("");
    api.get(`/bots/${botId}`).then((r) => {
      const d = r.data;
      reset({
        botName: d.botName,
        welcomeMessage: d.welcomeMessage,
        personality: d.personality,
        isActive: d.isActive,
        escalationRules: d.escalationRules ?? [],
        suggestedQuestions: (d.suggestedQuestions ?? []).map((q: string) => ({ value: q })),
      });
      setLoading(false);
    }).catch(() => {
      toast.error("Could not load this bot");
      setLoading(false);
    });
  }, [botId, reset]);

  const save = async (values: FormValues) => {
    if (!botId) return;
    try {
      await api.put(`/bots/${botId}`, {
        ...values,
        suggestedQuestions: values.suggestedQuestions.map((q) => q.value).filter(Boolean),
      });
      toast.success(`${values.botName} saved`);
      reset(values);
      void reloadBots();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Save failed");
    }
  };

  const runTest = async () => {
    if (!testQ.trim() || !botId) return;
    setTesting(true);
    setTestAnswer("");
    try {
      const { data } = await api.post(`/bots/${botId}/test`, { question: testQ });
      setTestAnswer(data.answer ?? JSON.stringify(data, null, 2));
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Test failed");
    } finally { setTesting(false); }
  };

  if (botsLoading) return <div className="p-8"><Loading rows={7} /></div>;

  if (!bots?.length || !selected) {
    return (
      <div className="p-7 max-w-3xl mx-auto">
        <PageHeader title="AI Configuration" subtitle="Configure each bot's identity and behaviour" />
        <div className="rounded-2xl border border-hairline bg-white">
          <Empty
            title="No bots yet"
            text="Create a bot before configuring one."
            icon={<Bot size={28} />}
            action={<Link href="/dashboard/bots" className="btn-primary gap-2"><Plus size={14} /> Create a bot</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 max-w-3xl mx-auto">
      <PageHeader
        title="AI Configuration"
        subtitle="Each bot has its own identity, behaviour, and escalation rules"
      />

      {/* Bot scope bar — z-20 so the selector's dropdown paints above the form below. */}
      <div className="card anim-up relative z-20 mb-5 flex flex-wrap items-end justify-between gap-4">
        <BotSelector bots={bots} selected={selected} onSelect={selectBot} label="Configuring" />
        <Link href={`/dashboard/knowledge-base?bot=${selected._id}`} className="btn-secondary btn-sm gap-1.5">
          <BookOpen size={12} />
          {selected.documentCount ?? 0} document{(selected.documentCount ?? 0) === 1 ? "" : "s"}
        </Link>
      </div>

      {loading ? <Loading rows={7} /> : (
        <>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "config", label: "Bot Settings", icon: <Settings2 size={14} /> },
          { key: "test",   label: "Live Test",    icon: <Zap size={14} /> },
        ]}
      />

      {/* ── Config tab ── */}
      {tab === "config" && (
        <form onSubmit={handleSubmit(save)} className="space-y-4 anim-up">

          {/* Identity */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
                <Bot size={16} className="text-ink" />
              </div>
              <p className="section-title">Bot Identity</p>
              <div className="ml-auto flex items-center gap-2.5">
                <span className={`text-xs font-semibold ${isActive ? "text-emerald-600" : "text-ink-faint"}`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" {...register("isActive")} className="sr-only peer" />
                  <div className="h-6 w-11 rounded-full bg-hairline transition-colors peer-checked:bg-emerald-500" />
                  <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Bot Name</label>
                <input {...register("botName")} className="input" placeholder="AcmeBot" />
              </div>
              <div>
                <label className="label">Personality</label>
                <select {...register("personality")} className="input">
                  {PERSONALITY_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="hint">{PERSONALITY_OPTS.find((o) => o.value === personality)?.desc}</p>
              </div>
            </div>

            <div>
              <label className="label">Welcome Message</label>
              <textarea
                {...register("welcomeMessage")}
                className="input min-h-[72px] resize-none"
                placeholder="Hi! How can I help you today?"
              />
            </div>
          </div>

          {/* Escalation rules */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                  <ShieldCheck size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="section-title">Escalation Rules</p>
                  <p className="hint mt-0">Trigger auto-ticket creation based on keywords</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addRule({ trigger: "", priority: "medium" })}
                className="btn-secondary btn-sm gap-1"
              >
                <Plus size={12} /> Add rule
              </button>
            </div>

            {rules.length === 0 && (
              <div className="rounded-xl border border-dashed border-hairline bg-sunken px-4 py-4 text-center">
                <p className="text-xs text-ink-faint">Using default escalation keywords (refund, legal, angry, etc.)</p>
              </div>
            )}

            <div className="space-y-2.5">
              {rules.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2 anim-up">
                  <input
                    {...register(`escalationRules.${i}.trigger`)}
                    placeholder="e.g. cancel account"
                    className="input flex-1"
                  />
                  <select {...register(`escalationRules.${i}.priority`)} className="input w-32 shrink-0">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button type="button" onClick={() => rmRule(i)} className="btn-ghost btn-sm p-2 text-ink-faint hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested questions */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
                  <MessageSquare size={16} className="text-ink" />
                </div>
                <div>
                  <p className="section-title">Suggested Questions</p>
                  <p className="hint mt-0">Quick-start prompts shown in the chat widget (max 5). The first 3 also appear on the teaser card.</p>
                </div>
              </div>
              {qs.length < 5 && (
                <button type="button" onClick={() => addQ({ value: "" })} className="btn-secondary btn-sm gap-1">
                  <Plus size={12} /> Add
                </button>
              )}
            </div>

            {qs.length === 0 && (
              <div className="rounded-xl border border-dashed border-hairline bg-sunken px-4 py-4 text-center">
                <p className="text-xs text-ink-faint">
                  None set — the widget falls back to generic prompts, which your knowledge base probably
                  can&apos;t answer. Add questions your documents actually cover.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {qs.map((field, i) => (
                <div key={field.id} className="flex gap-2 anim-up">
                  <input
                    {...register(`suggestedQuestions.${i}.value`)}
                    placeholder={`Question ${i + 1}…`}
                    className="input flex-1"
                  />
                  <button type="button" onClick={() => rmQ(i)} className="btn-ghost btn-sm p-2 text-ink-faint hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="btn-primary w-full py-3 text-[15px] gap-2"
          >
            {isSubmitting ? <><Spinner size={15} /> Saving…</> : "Save configuration"}
          </button>
        </form>
      )}

      {/* ── Test tab ── */}
      {tab === "test" && (
        <div className="space-y-4 anim-up">
          <div className="card space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sunken">
                <Sparkles size={16} className="text-ink" />
              </div>
              <div>
                <p className="section-title">Test your AI bot</p>
                <p className="hint mt-0">Ask a question and see how the bot responds using your knowledge base</p>
              </div>
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {[
                "What is your refund policy?",
                "How long does shipping take?",
                "How do I track my order?",
                "What payment methods do you accept?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setTestQ(q)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    testQ === q
                      ? "border-ink bg-ink text-white"
                      : "border-hairline bg-white text-ink-muted hover:border-hairline-strong hover:text-ink"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Or type a custom question…"
                value={testQ}
                onChange={(e) => setTestQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTest()}
              />
              <button
                onClick={runTest}
                disabled={testing || !testQ.trim()}
                className="btn-primary shrink-0 px-4"
              >
                {testing ? <Spinner size={15} /> : <Send size={15} />}
              </button>
            </div>
          </div>

          {testing && (
            <div className="card flex items-center gap-3 anim-up">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken">
                <Bot size={14} className="text-ink" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            </div>
          )}

          {testAnswer && !testing && (
            <div className="card anim-scale">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft shadow-sm">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Bot response</p>
                  <p className="text-xs text-ink-faint">Powered by Groq llama-3.3-70b</p>
                </div>
              </div>
              <div className="rounded-xl border border-hairline bg-sunken px-5 py-4">
                <div className="prose prose-sm max-w-none text-ink-soft [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>h3]:font-semibold">
                  <ReactMarkdown>{testAnswer}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default function AiConfigPage() {
  // useBots reads ?bot= via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="p-8"><Loading rows={7} /></div>}>
      <AiConfigClient />
    </Suspense>
  );
}
