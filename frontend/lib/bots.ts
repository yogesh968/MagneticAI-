"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "./api";

export type Bot = {
  _id: string;
  botName: string;
  description?: string;
  welcomeMessage?: string;
  personality: "professional" | "friendly" | "technical";
  escalationRules?: Array<{ trigger: string; priority: string }>;
  suggestedQuestions?: string[];
  isActive: boolean;
  isDefault: boolean;
  settings?: { widgetColor?: string; widgetPosition?: "bottom-right" | "bottom-left" };
  // Present on list/get responses so the UI can show what each bot knows.
  documentCount?: number;
  indexedCount?: number;
  failedCount?: number;
  chunkCount?: number;
};

/**
 * Loads the tenant's bots and tracks the selected one in `?bot=<id>`.
 *
 * The selection lives in the URL rather than component state so a reload or a
 * shared link lands on the same bot — which matters when the whole point is
 * knowing which bot you are about to put data into.
 */
export function useBots() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const botParam = searchParams.get("bot");

  const [bots, setBots] = useState<Bot[] | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get<Bot[]>("/bots");
      setBots(data);
      return data;
    } catch {
      setError(true);
      setBots([]);
      return [];
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const selectBot = useCallback((id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("bot", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Fall back to the default bot, then the first one, so a stale or absent
  // ?bot= never leaves the page with nothing selected.
  const selected =
    bots?.find((b) => b._id === botParam) ??
    bots?.find((b) => b.isDefault) ??
    bots?.[0] ??
    null;

  return { bots, selected, selectBot, reload, error, loading: bots === null };
}
