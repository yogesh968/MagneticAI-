"use client";
import { useEffect, useState } from "react";
import { api, readSessionHint } from "@/lib/api";
import { PageHeader, Spinner } from "@/components/ui";
import toast from "react-hot-toast";
import { Mail, MessageCircle, Copy, Check, ExternalLink, CheckCircle2, XCircle, Info } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
      <CheckCircle2 size={12} /> Configured
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200/60">
      <XCircle size={12} /> Not configured
    </span>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-700 truncate">
          {value}
        </div>
        <button onClick={copy} className="btn-secondary px-3 py-2.5 shrink-0">
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<any>(null);
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState({ from: "", subject: "", text: "" });
  const [testingSend, setTestingSend] = useState(false);

  useEffect(() => {
    setTenantId(readSessionHint()?.tenantId ?? "");
    api.get("/integrations/status")
      .then((r) => setStatus(r.data))
      .catch(() => setStatus({ email: true, whatsapp: false, twilio: false }))
      .finally(() => setLoading(false));
  }, []);

  const sendTestEmail = async () => {
    if (!testEmail.from || !testEmail.subject || !testEmail.text || !tenantId) {
      toast.error("Fill all fields");
      return;
    }
    setTestingSend(true);
    try {
      await api.post("/integrations/email", {
        tenantId,
        from: testEmail.from,
        subject: testEmail.subject,
        text: testEmail.text,
        name: "Test User",
      });
      toast.success("Test email processed — check Tickets!");
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Failed");
    } finally { setTestingSend(false); }
  };

  const whatsappWebhook = `${API_URL}/api/integrations/whatsapp`;
  const emailWebhook    = `${API_URL}/api/integrations/email`;

  return (
    <div className="p-7 max-w-3xl mx-auto">
      <PageHeader title="Integrations" subtitle="Connect WhatsApp and email to your AI support platform" />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} className="text-blue-600" /></div>
      ) : (
        <div className="space-y-5">

          {/* ── WhatsApp ── */}
          <div className="card anim-up">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
                  <MessageCircle size={22} className="text-[#25D366]" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">WhatsApp</p>
                  <p className="text-xs text-slate-400 mt-0.5">AI replies to WhatsApp messages via Twilio</p>
                </div>
              </div>
              <StatusBadge ok={status?.twilio} />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 mb-5">
              <div className="flex gap-2">
                <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Setup steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Create a <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Twilio account</a> and activate the WhatsApp sandbox</li>
                    <li>Add these env vars to your backend <code className="bg-blue-100 px-1 rounded">.env</code>:
                      <br /><code className="bg-blue-100 px-1 rounded">TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, WHATSAPP_TENANT_ID</code>
                    </li>
                    <li>In Twilio Console → WhatsApp Sandbox → &quot;When a message comes in&quot;, paste the webhook URL below</li>
                    <li>Set HTTP method to <strong>POST</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            <CopyField value={whatsappWebhook} label="Twilio Webhook URL" />

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="font-semibold text-slate-700 mb-1">Env variable</p>
                <code className="text-slate-600">TWILIO_ACCOUNT_SID=ACxxxxxxx</code>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="font-semibold text-slate-700 mb-1">Env variable</p>
                <code className="text-slate-600">WHATSAPP_TENANT_ID={tenantId || "<your-tenant-id>"}</code>
              </div>
            </div>

            <a
              href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 btn-secondary btn-sm gap-1.5 inline-flex"
            >
              <ExternalLink size={12} /> Twilio WhatsApp Console
            </a>
          </div>

          {/* ── Email ── */}
          <div className="card anim-up d2">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-200/60">
                  <Mail size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">Email → Ticket</p>
                  <p className="text-xs text-slate-400 mt-0.5">Incoming emails auto-create support tickets</p>
                </div>
              </div>
              <StatusBadge ok={status?.email} />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 mb-5">
              <div className="flex gap-2">
                <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Two ways to use:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li><strong>SendGrid Inbound Parse</strong> — set the webhook URL below in your SendGrid dashboard</li>
                    <li><strong>Direct API call</strong> — POST to the URL from any email relay (Postmark, Mailgun, etc.)</li>
                  </ol>
                </div>
              </div>
            </div>

            <CopyField value={emailWebhook} label="Email Webhook URL" />

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs font-mono text-slate-600">
              <p className="font-sans font-semibold text-slate-700 mb-2">Expected POST body (JSON):</p>
              <pre>{`{
  "tenantId": "${tenantId || "<tenant-id>"}",
  "from": "customer@example.com",
  "subject": "Order issue",
  "text": "My order hasn't arrived…",
  "name": "John Doe"    // optional
}`}</pre>
            </div>

            {/* Test form */}
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Test email integration</p>
              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="Sender email (from)"
                  type="email"
                  value={testEmail.from}
                  onChange={(e) => setTestEmail((p) => ({ ...p, from: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Subject"
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail((p) => ({ ...p, subject: e.target.value }))}
                />
                <textarea
                  className="input min-h-[72px] resize-none"
                  placeholder="Email body…"
                  value={testEmail.text}
                  onChange={(e) => setTestEmail((p) => ({ ...p, text: e.target.value }))}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testingSend}
                  className="btn-primary gap-2"
                >
                  {testingSend ? <><Spinner size={14} /> Processing…</> : <><Mail size={14} /> Send test email</>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Multi-tenant info ── */}
          <div className="card anim-up d3 border-dashed">
            <p className="section-title mb-3">Your Tenant ID</p>
            <p className="text-xs text-slate-400 mb-3">
              Use this ID to route webhooks to your account. Each business on the platform has its own isolated tenant ID.
            </p>
            <CopyField value={tenantId || "Loading…"} label="Tenant ID" />
          </div>

        </div>
      )}
    </div>
  );
}
