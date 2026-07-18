"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/brand/AuthLoader";
import { FieldError, FieldLabel, SubmitButton } from "@/components/auth/fields";
import { authInput } from "@/components/auth/shared";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

type Values = z.infer<typeof schema>;

const CAPABILITIES = [
  { title: "Tenant Management", desc: "Onboard & manage all tenants" },
  { title: "User Directory", desc: "Full user access control" },
  { title: "Platform Stats", desc: "Real-time system metrics" },
  { title: "System Health", desc: "API & service monitoring" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const submit = async (values: Values) => {
    try {
      const { data } = await api.post("/auth/login", values);
      if (!data.user) {
        toast.error("Login failed");
        return;
      }
      const role = data.user.role;
      // The credentials were valid and the server has already issued the session
      // cookie, so this is not a denial — it is just the wrong door. Send them to
      // the dashboard rather than claiming access was refused.
      if (role !== "superadmin") {
        toast("Signed in — this portal is superadmin-only, taking you to your dashboard.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      toast.success(`Welcome, ${data.user.name ?? "Admin"}!`);
      router.replace("/admin");
      router.refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Invalid credentials");
    }
  };

  return (
    <>
      {isSubmitting && (
        <AuthLoader title="Accessing admin portal" variant="wire" steps={["Verifying credentials", "Checking clearance", "Opening the portal"]} />
      )}
    <AuthShell
      eyebrow="Admin portal"
      headline="Supercharged admin control."
      blurb={
        <div className="grid max-w-[420px] grid-cols-2 gap-3">
          {CAPABILITIES.map(({ title, desc }) => (
            <div key={title} className="rounded-xl border border-hairline bg-surface/70 p-4 backdrop-blur">
              <p className="m-0 text-sm font-semibold text-ink">{title}</p>
              <p className="m-0 mt-0.5 text-xs text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      }
      footnotes={["SUPERADMIN ONLY", "RESTRICTED ACCESS"]}
    >
      <div className="w-full max-w-[390px]">
        <div className="mb-3.5 font-tight text-xs uppercase tracking-[.14em] text-[#71717A]">Restricted access</div>
        <h1 className="m-0 mb-3 font-tight text-[34px] font-bold leading-[1.1] tracking-[-.03em] text-ink">
          Admin sign in
        </h1>
        <p className="m-0 mb-[30px] text-[15px] leading-relaxed text-ink-soft">
          Sign in with your admin credentials to access the portal.
        </p>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="mb-[18px]">
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <input id="email" type="email" {...register("email")} placeholder="admin@company.com" autoComplete="email" className={authInput} />
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
            Sign in to Admin Portal
          </SubmitButton>
        </form>

        <p className="m-0 mt-[26px] text-center text-sm text-ink-muted">
          Not an admin?{" "}
          <Link href="/login" className="font-semibold text-accent-500 hover:text-accent-600">
            Go to agent login →
          </Link>
        </p>
      </div>
    </AuthShell>
    </>
  );
}
