"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot as BotIcon, Check, ChevronDown, Star, Plus } from "lucide-react";
import type { Bot } from "@/lib/bots";

/**
 * The "which bot am I working on" control. Deliberately loud: it carries the
 * bot's colour and document count, because every destructive or additive action
 * on these pages (uploading a document, editing a persona) targets whatever is
 * selected here.
 */
export function BotSelector({
  bots,
  selected,
  onSelect,
  label = "Working on",
}: {
  bots: Bot[];
  selected: Bot | null;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!selected) return null;
  const color = selected.settings?.widgetColor ?? "#2563eb";

  return (
    <div className="relative" ref={ref}>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full min-w-[260px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] transition-colors hover:border-slate-300"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: color }}
        >
          <BotIcon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-900">{selected.botName}</span>
            {selected.isDefault && <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />}
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            {selected.documentCount ?? 0} document{(selected.documentCount ?? 0) === 1 ? "" : "s"}
            {selected.failedCount ? ` · ${selected.failedCount} failed` : ""}
          </span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_8px_32px_rgb(0,0,0,0.12)]"
        >
          {bots.map((b) => {
            const active = b._id === selected._id;
            return (
              <button
                key={b._id}
                role="option"
                aria-selected={active}
                onClick={() => { onSelect(b._id); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? "bg-slate-50" : "hover:bg-slate-50"}`}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: b.settings?.widgetColor ?? "#2563eb" }}
                >
                  <BotIcon size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-slate-800">{b.botName}</span>
                    {b.isDefault && <Star size={10} className="shrink-0 fill-amber-400 text-amber-400" />}
                    {!b.isActive && (
                      <span className="rounded bg-slate-100 px-1 text-[9px] font-bold uppercase text-slate-400">Off</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {b.documentCount ?? 0} doc{(b.documentCount ?? 0) === 1 ? "" : "s"}
                  </span>
                </span>
                {active && <Check size={14} className="shrink-0 text-blue-600" />}
              </button>
            );
          })}

          <div className="mt-1 border-t border-slate-100 pt-1">
            <Link
              href="/dashboard/bots"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50"
            >
              <Plus size={13} /> Manage bots
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
