"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, KeyRound } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const schema = z.object({
  newPassword: z.string().min(8, "Minimum 8 characters"),
  confirm: z.string(),
}).refine((x) => x.newPassword === x.confirm, { path: ["confirm"], message: "Passwords don't match" });

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema),
  });

  const submit = async (values: any) => {
    if (!token) { toast.error("Invalid reset link — token missing"); return; }
    try {
      const { data } = await api.post("/auth/reset-password", { token, newPassword: values.newPassword });
      toast.success(data.message ?? "Password reset successfully!");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Reset failed — link may have expired");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="mt-1.5 text-sm text-slate-500">Enter a strong new password for your account</p>
        </div>

        {!token ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-red-700">Invalid reset link</p>
            <p className="mt-1 text-sm text-red-600">This link is missing a reset token. Please request a new one.</p>
            <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
              Request new link →
            </Link>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-green-800">Password updated!</p>
            <p className="mt-1 text-sm text-green-700">Redirecting you to sign in…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    {...register("newPassword")}
                    placeholder="••••••••"
                    className="input pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.newPassword && <p className="mt-1 text-xs text-red-500">{String(errors.newPassword.message)}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
                <input type="password" {...register("confirm")} placeholder="••••••••" className="input" autoComplete="new-password" />
                {errors.confirm && <p className="mt-1 text-xs text-red-500">{String(errors.confirm.message)}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Resetting…
                  </span>
                ) : "Set new password"}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-blue-600 hover:underline">← Back to sign in</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <ResetForm />
    </Suspense>
  );
}
