"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { api } from "@/lib/api";
import { AuthShell, PerkList } from "@/components/auth/AuthShell";
import { FieldError, FieldLabel, SubmitButton } from "@/components/auth/fields";
import { authInput, safeNext } from "@/components/auth/shared";
import { PasswordStrength, scorePassword } from "@/components/auth/PasswordStrength";

const schema = z.object({
  businessName: z.string().min(2, "Business name required"),
  name: z.string().min(2, "Minimum 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
});

type Values = z.infer<typeof schema>;

const PERKS = ["Your own RAG knowledge base", "Embeddable widget & multi-channel", "Human handoff + ticketing built in"];

/**
 * Mirrors the slug the backend derives from the business name. The server
 * appends a random suffix for uniqueness, so this is a preview, not a promise —
 * it stays read-only rather than inviting an edit the API would discard.
 */
const previewSlug = (businessName: string) =>
  businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { businessName: "", name: "", email: "", password: "" } });

  const slug = previewSlug(watch("businessName") ?? "");
  const password = watch("password") ?? "";

  const submit = async (values: Values) => {
    try {
      const { data } = await api.post("/auth/register", values);
      toast.success(`Welcome aboard, ${data.user?.name ?? ""}!`);
      const dest = safeNext(searchParams.get("next")) ?? (data.user?.role === "superadmin" ? "/admin" : "/dashboard");
      router.replace(dest);
      router.refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Something went wrong");
      if (e.response?.status === 409) setTimeout(() => router.push("/login"), 1800);
    }
  };

  return (
    <AuthShell
      eyebrow="Create your workspace"
      headline="Launch an AI support desk in minutes."
      blurb={<PerkList perks={PERKS} />}
      footnotes={["NO CARD REQUIRED", "14-DAY TRIAL"]}
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-3.5 font-tight text-xs uppercase tracking-[.14em] text-ink-muted">Step 1 · Tenant + first user</div>
        <h1 className="m-0 mb-[26px] font-tight text-[32px] font-bold leading-[1.1] tracking-[-.03em] text-ink">
          Create your account
        </h1>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="mb-4">
            <FieldLabel htmlFor="businessName">Organization name</FieldLabel>
            <input id="businessName" {...register("businessName")} placeholder="Lumen Labs" autoComplete="organization" className={authInput} />
            <FieldError>{errors.businessName?.message}</FieldError>
          </div>

          <div className="mb-4">
            <FieldLabel htmlFor="slug">Workspace URL</FieldLabel>
            <div className="flex items-center overflow-hidden rounded-[11px] border border-hairline bg-white focus-within:border-accent-500 focus-within:shadow-[0_0_0_3px_var(--accent-ring)]">
              <input
                id="slug"
                readOnly
                tabIndex={-1}
                aria-describedby="slug-hint"
                value={slug}
                placeholder="lumen"
                className="flex-1 border-none bg-transparent px-[15px] py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              <span className="flex select-none items-center self-stretch border-l border-hairline bg-sunken px-[15px] font-tight text-[13px] text-ink-faint">
                .magnetic.ai
              </span>
            </div>
            <p id="slug-hint" className="mt-1.5 text-xs text-ink-muted">
              Generated from your organization name. You can change it later in settings.
            </p>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <input id="name" {...register("name")} placeholder="Maya Rodriguez" autoComplete="name" className={authInput} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <input id="email" type="email" {...register("email")} placeholder="maya@lumen.io" autoComplete="email" className={authInput} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
          </div>

          <div className="mb-[22px]">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <input
              id="password"
              type="password"
              {...register("password")}
              placeholder="••••••••"
              autoComplete="new-password"
              className={authInput}
            />
            <PasswordStrength score={scorePassword(password)} show={password.length > 0} />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          <SubmitButton pending={isSubmitting} pendingLabel="Creating workspace…">
            Create workspace
          </SubmitButton>
        </form>

        {/* Placeholders, as in the design — point these at the real URLs once they exist. */}
        <p className="m-0 mt-4 text-center text-[12.5px] leading-relaxed text-ink-muted">
          By continuing you agree to our{" "}
          <a href="#" className="font-medium text-accent-500 hover:text-accent-600">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-accent-500 hover:text-accent-600">
            Privacy Policy
          </a>
          .
        </p>
        <p className="m-0 mt-5 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent-500 hover:text-accent-600">
            Sign in →
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
