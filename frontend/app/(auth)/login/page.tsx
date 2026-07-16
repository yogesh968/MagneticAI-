import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

// AuthForm reads ?next= via useSearchParams, which opts the tree into CSR
// bailout — Next requires a Suspense boundary around it to prerender this page.
export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
