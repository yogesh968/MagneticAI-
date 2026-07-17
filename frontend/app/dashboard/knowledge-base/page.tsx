import { Suspense } from "react";
import { Loading } from "@/components/ui";
import KnowledgeBaseClient from "./KnowledgeBaseClient";

// useBots reads ?bot= via useSearchParams, which needs a Suspense boundary.
export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<div className="p-7"><Loading rows={5} /></div>}>
      <KnowledgeBaseClient />
    </Suspense>
  );
}
