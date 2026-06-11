"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema),
  });

  const submit = async (values: any) => {
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Something went wrong");
    }
  };

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-[400px] space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
            <p className="text-lg font-bold text-green-800">Check your email</p>
            <p className="mt-2 text-sm text-green-700">
              If an account exists for that address, you&apos;ll receive a password reset link shortly.
            </p>
          </div>
          <Link href="/login" className="btn-primary w-full justify-center py-3 text-base">
            ← Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30">
            <Mail size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
          <p className="mt-1.5 text-sm text-slate-500">Enter your email and we&apos;ll send a reset link</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(submit)} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="input"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{String(errors.email.message)}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </span>
              ) : "Send reset link"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              <ArrowLeft size={12} className="inline mb-0.5" /> Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
