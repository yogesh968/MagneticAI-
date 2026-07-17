"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError, FieldLabel, SubmitButton } from "@/components/auth/fields";
import { authInput } from "@/components/auth/shared";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const submit = async (values: Values) => {
    try {
      await api.post("/auth/forgot-password", values);
      setSentTo(values.email);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Something went wrong");
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      headline={
        <>
          Locked out?
          <br />
          We&apos;ll get you back in.
        </>
      }
      footnotes={["RESET LINKS EXPIRE IN 1 HOUR"]}
    >
      <div className="w-full max-w-[390px]">
        {sentTo ? (
          <div>
            <div className="mb-[22px] flex h-[54px] w-[54px] items-center justify-center rounded-[15px] border border-hairline bg-sunken">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-ink" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 6h16v12H4z" />
                <path d="M4 7l8 6 8-6" />
              </svg>
            </div>
            <h1 className="m-0 mb-3 font-tight text-[30px] font-bold leading-[1.12] tracking-[-.03em] text-ink">
              Check your inbox
            </h1>
            <p className="m-0 mb-[26px] text-[15px] leading-relaxed text-ink-soft">
              If an account exists for <span className="font-semibold text-ink">{sentTo}</span>, we&apos;ve sent it a reset
              link. It expires in 1 hour.
            </p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="inline-flex cursor-pointer items-center gap-[7px] text-sm font-semibold text-accent-500 hover:text-accent-600"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-3.5 font-tight text-xs uppercase tracking-[.14em] text-ink-muted">Reset password</div>
            <h1 className="m-0 mb-3 font-tight text-[32px] font-bold leading-[1.1] tracking-[-.03em] text-ink">
              Forgot your password?
            </h1>
            <p className="m-0 mb-[26px] text-[15px] leading-relaxed text-ink-soft">
              Enter the email tied to your account and we&apos;ll send a secure reset link.
            </p>

            <form onSubmit={handleSubmit(submit)} noValidate>
              <div className="mb-[22px]">
                <FieldLabel htmlFor="email">Work email</FieldLabel>
                <input id="email" type="email" {...register("email")} placeholder="maya@lumen.io" autoComplete="email" className={authInput} />
                <FieldError>{errors.email?.message}</FieldError>
              </div>
              <SubmitButton pending={isSubmitting} pendingLabel="Sending…">
                Send reset link
              </SubmitButton>
            </form>
          </div>
        )}

        <p className="m-0 mt-7 text-center text-sm text-ink-muted">
          <Link href="/login" className="font-semibold text-accent-500 hover:text-accent-600">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
