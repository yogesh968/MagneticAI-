import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { Bot, Conversation, Document, Tenant } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";

/**
 * Backfills the multi-bot model onto data written before it existed.
 *
 * Before: one BotConfig per tenant (unique index), documents scoped only to a
 * tenant, and Qdrant points with no botId — so a botId filter would match
 * nothing and every bot would answer with an empty knowledge base.
 *
 * This is idempotent: re-running it is safe.
 *
 *   npm run migrate:multi-bot -w backend
 */

await connectDB();

// 0. Drop the legacy unique index on botconfigs.tenantId.
//    Removing `unique: true` from the schema does NOT drop an index that already
//    exists in MongoDB — mongoose only ever adds. Until this is gone, creating a
//    second bot for a tenant fails with a duplicate-key error, so this must run
//    before anything else here.
const botCollection = mongoose.connection.db!.collection("botconfigs");
const existing = await botCollection.indexes().catch(() => []);
const legacy = existing.find((i) => i.name === "tenantId_1" && i.unique);
if (legacy) {
  await botCollection.dropIndex("tenantId_1");
  console.info("Dropped legacy unique index botconfigs.tenantId_1 — tenants can now have multiple bots.\n");
} else {
  console.info("Legacy unique index botconfigs.tenantId_1 not present.\n");
}

let tenantsProcessed = 0;
let botsCreated = 0;
let defaultsSet = 0;
let docsBackfilled = 0;
let conversationsBackfilled = 0;
let vectorsPatched = 0;
const failures: string[] = [];

const tenants = await Tenant.find().select("_id name").lean<any[]>();
console.info(`Found ${tenants.length} tenant(s).\n`);

for (const tenant of tenants) {
  const tenantId = tenant._id;
  console.info(`── ${tenant.name} (${tenantId})`);
  tenantsProcessed++;

  // 1. Every tenant needs exactly one default bot.
  let defaultBot = await Bot.findOne({ tenantId, isDefault: true });
  if (!defaultBot) {
    // Adopt the tenant's existing bot (the old singleton) if there is one.
    defaultBot = await Bot.findOne({ tenantId }).sort({ createdAt: 1 });
    if (defaultBot) {
      defaultBot.isDefault = true;
      await defaultBot.save();
      defaultsSet++;
      console.info(`   default bot: adopted "${defaultBot.botName}"`);
    } else {
      defaultBot = await Bot.create({
        tenantId,
        botName: "Support Assistant",
        description: "Created during the multi-bot migration.",
        isDefault: true,
      });
      botsCreated++;
      console.info(`   default bot: created "${defaultBot.botName}"`);
    }
  } else {
    console.info(`   default bot: "${defaultBot.botName}" (already set)`);
  }

  // 2. Documents with no bot belong to the tenant's single pre-migration bot.
  const docResult = await Document.updateMany(
    { tenantId, botId: { $exists: false } },
    { $set: { botId: defaultBot._id } },
  );
  docsBackfilled += docResult.modifiedCount;
  if (docResult.modifiedCount) console.info(`   documents: backfilled ${docResult.modifiedCount}`);

  const convResult = await Conversation.updateMany(
    { tenantId, botId: { $exists: false } },
    { $set: { botId: defaultBot._id } },
  );
  conversationsBackfilled += convResult.modifiedCount;
  if (convResult.modifiedCount) console.info(`   conversations: backfilled ${convResult.modifiedCount}`);

  // 3. Stamp botId onto the tenant's existing vectors. Every point in this
  //    collection predates multi-bot, so they all belong to the default bot.
  //    Without this, rag.service's botId filter matches nothing and the bot
  //    silently answers with no context at all.
  const collection = collectionName(String(tenantId));
  try {
    const exists = await qdrant.getCollection(collection).then(() => true).catch(() => false);
    if (!exists) {
      console.info(`   vectors: no collection, skipping`);
    } else {
      // Only points that have no botId at all — that is exactly the set written
      // before this migration, and it makes re-running a no-op.
      const untagged = { must: [{ is_empty: { key: "botId" } }] };
      const { count } = await qdrant.count(collection, { filter: untagged, exact: true });
      if (count === 0) {
        console.info(`   vectors: already tagged`);
      } else {
        await qdrant.setPayload(collection, {
          wait: true,
          payload: { botId: String(defaultBot._id) },
          filter: untagged,
        });
        vectorsPatched += count;
        console.info(`   vectors: tagged ${count} point(s)`);
      }
    }
  } catch (e) {
    const msg = `${tenant.name} (${tenantId}): vector tagging failed — ${(e as Error).message}`;
    failures.push(msg);
    console.error(`   vectors: FAILED — ${(e as Error).message}`);
  }
}

console.info(`
── Summary ─────────────────────────────
  tenants processed:        ${tenantsProcessed}
  default bots created:     ${botsCreated}
  existing bots promoted:   ${defaultsSet}
  documents backfilled:     ${docsBackfilled}
  conversations backfilled: ${conversationsBackfilled}
  vectors tagged:           ${vectorsPatched}`);

if (failures.length) {
  console.error(`\n${failures.length} tenant(s) need attention:`);
  failures.forEach((f) => console.error(`  - ${f}`));
  console.error(`\nTheir bots will answer with no knowledge base until the vectors are tagged.`);
  console.error(`Re-run this script, or reindex those tenants from the dashboard.`);
  process.exit(1);
}

console.info(`\nMigration complete.`);
process.exit(0);
