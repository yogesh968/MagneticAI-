import { Conversation, Message } from "../models/index.js";
import { env } from "../config/env.js";

const DAY_MS = 86_400_000;

/**
 * Hard-deletes soft-deleted conversations (and their messages) once they are
 * older than the retention window — the purge job the Conversation.deletedAt
 * field always implied but never had (blueprint Part D; DPDP right-to-erasure).
 * A no-op when DATA_RETENTION_DAYS is 0 (the default), so nothing is destroyed
 * until an operator opts in.
 */
export async function purgeExpiredConversations(): Promise<{ conversations: number; messages: number }> {
  const days = env.DATA_RETENTION_DAYS;
  if (!days || days <= 0) return { conversations: 0, messages: 0 };

  const cutoff = new Date(Date.now() - days * DAY_MS);
  const expired = await Conversation.find({ deletedAt: { $exists: true, $ne: null, $lt: cutoff } })
    .select("_id")
    .lean<any[]>();
  if (!expired.length) return { conversations: 0, messages: 0 };

  const ids = expired.map((c) => c._id);
  const msgs = await Message.deleteMany({ conversationId: { $in: ids } });
  const convs = await Conversation.deleteMany({ _id: { $in: ids } });
  console.info(`[retention] purged ${convs.deletedCount} conversations, ${msgs.deletedCount} messages (deletedAt older than ${days}d)`);
  return { conversations: convs.deletedCount ?? 0, messages: msgs.deletedCount ?? 0 };
}

let timer: NodeJS.Timeout | undefined;

/** Purge on boot, then once a day. No-op (and never schedules) when disabled. */
export function startRetentionJob() {
  if (!env.DATA_RETENTION_DAYS || env.DATA_RETENTION_DAYS <= 0 || timer) return;
  const run = () => void purgeExpiredConversations().catch((e) => console.error("[retention] purge failed:", e));
  run();
  timer = setInterval(run, DAY_MS);
  timer.unref?.();
}
