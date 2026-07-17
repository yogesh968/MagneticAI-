"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { FieldError, FieldLabel, SubmitButton } from "@/components/auth/fields";
import { authInput, safeNext } from "@/components/auth/shared";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const submit = async (values: Values) => {
    try {
      const { data } = await api.post("/auth/login", values);
      toast.success("Welcome back!");
      const dest = safeNext(searchParams.get("next")) ?? (data.user?.role === "superadmin" ? "/admin" : "/dashboard");
      router.replace(dest);
      router.refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Something went wrong");
    }
  };

  return (
    <AuthShell
      eyebrow="AI Customer Support"
      headline={
        <>
          Answers on autopilot.
          <br />
          Humans when it matters.
        </>
      }
      blurb={
        <p className="m-0 max-w-[400px] text-base leading-relaxed text-[#A1A1AA]">
          Sign in to your Magnetic workspace to manage conversations, tickets, and your knowledge base.
        </p>
      }
      footnotes={["SOC 2 TYPE II", "GDPR", "CCPA"]}
    >
      <div className="w-full max-w-[390px]">
        <div className="eyebrow mb-3.5">Welcome back</div>
        <h1 className="m-0 mb-[30px] font-tight text-[34px] font-bold leading-[1.1] tracking-[-.03em] text-ink">
          Sign in to Magnetic
        </h1>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="mb-[18px]">
            <FieldLabel htmlFor="email">Work email</FieldLabel>
            <input id="email" type="email" {...register("email")} placeholder="maya@lumen.io" autoComplete="email" className={authInput} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel htmlFor="password">
                <span className="mb-0 block">Password</span>
              </FieldLabel>
              <Link href="/forgot-password" className="mb-2 text-[12.5px] font-semibold text-accent-500 hover:text-accent-600">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${authInput} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1.5 flex h-[34px] w-[34px] items-center justify-center rounded-lg text-ink-faint transition-colors hover:text-ink"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          <SubmitButton pending={isSubmitting} pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <p className="m-0 mt-[26px] text-center text-sm text-ink-muted">
          New to Magnetic?{" "}
          <Link href="/register" className="font-semibold text-accent-500 hover:text-accent-600">
            Create an account →
          </Link>
        </p>
        <p className="m-0 mt-4 text-center">
          <Link href="/admin/login" className="text-xs text-ink-faint transition-colors hover:text-ink">
            Admin portal →
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
