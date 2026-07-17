import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

// LoginForm reads ?next= via useSearchParams, which opts the tree into CSR
// bailout — Next requires a Suspense boundary around it to prerender this page.
export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
