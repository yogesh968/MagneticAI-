"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Eye, EyeOff, Zap, Shield, Clock, BarChart3 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

const schemas = {
  login: z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Password required") }),
  register: z.object({
    name: z.string().min(2, "Minimum 2 characters"),
    businessName: z.string().min(2, "Business name required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string(),
  }).refine((x) => x.password === x.confirm, { path: ["confirm"], message: "Passwords don't match" }),
  forgot: z.object({ email: z.string().email("Enter a valid email") }),
};

const features = [
  { icon: Zap, title: "RAG-Powered Answers", desc: "Grounded in your knowledge base" },
  { icon: Shield, title: "Auto Escalation", desc: "Smart keyword-based ticket creation" },
  { icon: Clock, title: "Real-time Chat", desc: "Socket.io powered live support" },
  { icon: BarChart3, title: "Deep Analytics", desc: "30-day trends and AI resolution rate" },
];

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<any>({ resolver: zodResolver(schemas[mode]) });

  const submit = async (values: any) => {
    try {
      const endpoint = mode === "forgot" ? "/auth/forgot-password" : `/auth/${mode}`;
      const { data } = await api.post(endpoint, values);
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        toast.success(mode === "register" ? `Welcome aboard, ${data.user?.name ?? ""}!` : "Welcome back!");
        router.push("/dashboard");
        return;
      }
      toast.success(data.message ?? "Done!");
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Something went wrong";
      toast.error(msg);
      if (e.response?.status === 409) setTimeout(() => router.push("/login"), 1800);
    }
  };

  const titles = {
    login: "Welcome back",
    register: "Start your free trial",
    forgot: "Reset your password",
  };
  const subs = {
    login: "Sign in to your support dashboard",
    register: "Set up your AI support platform in minutes",
    forgot: "Enter your email and we'll send a reset link",
  };

  return (
    <main className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-600/5 blur-2xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Magnetic AI</span>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
              AI support that{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                actually works
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-300/80 leading-relaxed">
              Multi-tenant, RAG-powered customer support with real-time escalation,
              smart ticketing, and deep analytics.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm animate-fade-in s${i + 1}`}>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20">
                  <Icon size={18} className="text-blue-300" />
                </div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Demo credentials</p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">D</div>
              <div>
                <p className="text-sm font-medium text-white">admin@demo.com</p>
                <p className="text-xs text-slate-400">Password: Demo@1234</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-slate-900">Magnetic AI</span>
          </div>

          <div className="anim-up">
            <h2 className="text-2xl font-bold text-slate-900">{titles[mode]}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{subs[mode]}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_4px_0_rgb(0,0,0,0.06)] anim-up d1">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              {mode === "register" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
                    <input {...register("name")} placeholder="Jane Smith" className={`input ${errors.name ? "input-error" : ""}`} />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{String(errors.name.message)}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Business name</label>
                    <input {...register("businessName")} placeholder="Acme Corp" className={`input ${errors.businessName ? "input-error" : ""}`} />
                    {errors.businessName && <p className="mt-1 text-xs text-red-500">{String(errors.businessName.message)}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
                <input type="email" {...register("email")} placeholder="you@company.com" className={`input ${errors.email ? "input-error" : ""}`} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>}
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    {mode === "login" && (
                      <Link href="/forgot-password" className="text-xs text-blue-600 font-medium hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      {...register("password")}
                      placeholder="••••••••"
                      className={`input pr-11 ${errors.password ? "input-error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-500">{String(errors.password.message)}</p>}
                </div>
              )}

              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      {...register("confirm")}
                      placeholder="••••••••"
                      className={`input pr-11 ${errors.confirm ? "input-error" : ""}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="mt-1 text-xs text-red-500">{String(errors.confirm.message)}</p>}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-3 text-base">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Please wait…
                  </span>
                ) : mode === "forgot" ? "Send reset link" : mode === "register" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
              {mode === "login" ? (
                <>New here?{" "}<Link href="/register" className="font-semibold text-blue-600 hover:underline">Create an account</Link></>
              ) : mode === "register" ? (
                <>Already have an account?{" "}<Link href="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link></>
              ) : (
                <Link href="/login" className="font-semibold text-blue-600 hover:underline">← Back to sign in</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
