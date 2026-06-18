"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, ShieldCheck, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema),
  });

  const submit = async (values: any) => {
    try {
      const { data } = await api.post("/auth/login", values);
      if (!data.accessToken) { toast.error("Login failed"); return; }
      const role = data.user?.role;
      if (!["admin", "superadmin"].includes(role)) {
        toast.error("Access denied. This portal is for admins only.");
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      toast.success(`Welcome, ${data.user?.name ?? "Admin"}!`);
      router.push(role === "superadmin" ? "/admin" : "/dashboard");
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Invalid credentials");
    }
  };

  return (
    <main className="flex min-h-screen" style={{ background: "#0f172a" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-14 relative overflow-hidden" style={{ background: "#0f172a" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-purple-700/10 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/30">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white leading-none">Magentic AI</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mt-0.5">Admin Portal</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-[38px] font-extrabold text-white leading-tight tracking-tight">
              Supercharged{" "}
              <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                admin control
              </span>
            </h2>
            <p className="mt-4 text-base text-slate-400 leading-relaxed max-w-sm">
              Full platform oversight — tenants, users, system health and performance analytics all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Tenant Management", desc: "Onboard & manage all tenants" },
              { title: "User Directory", desc: "Full user access control" },
              { title: "Platform Stats", desc: "Real-time system metrics" },
              { title: "System Health", desc: "API & service monitoring" },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Demo admin account</p>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">A</div>
            <div>
              <p className="text-sm font-semibold text-white">admin@demo.com</p>
              <p className="text-xs text-slate-500">Password: Demo@1234</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-8" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">Admin Portal</span>
          </div>

          <div className="mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/25 mb-4">
              <Lock size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin sign in</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in with your admin credentials to access the portal</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_4px_0_rgb(0,0,0,0.06)]">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="admin@company.com"
                  className={`input ${errors.email ? "input-error" : ""}`}
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    {...register("password")}
                    placeholder="••••••••"
                    className={`input pr-11 ${errors.password ? "input-error" : ""}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{String(errors.password.message)}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_0_rgb(124,58,237,0.35)] hover:shadow-[0_4px_16px_0_rgb(124,58,237,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Sign in to Admin Portal <ArrowRight size={14} /></>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-5 space-y-3">
              <p className="text-center text-xs text-slate-400">
                Not an admin?{" "}
                <Link href="/login" className="font-semibold text-violet-600 hover:underline">
                  Go to agent login →
                </Link>
              </p>
              <p className="text-center text-xs text-slate-400">
                <Link href="/forgot-password" className="text-slate-400 hover:text-slate-600 hover:underline">
                  Forgot your password?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
