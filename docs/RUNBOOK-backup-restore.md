# Runbook — Backups & Restore (A8)

You hold multiple clients' data across **MongoDB** (application data) and **Qdrant** (vectors). Losing either ends the business. This runbook covers automated backups and, critically, a **tested restore** — a backup you have never restored is not a backup.

---

## 1. MongoDB

### Preferred: MongoDB Atlas automated backups (managed)
1. Move the database to **MongoDB Atlas** (Part C).
2. In the Atlas cluster → **Backup** → enable **Continuous Cloud Backups** (point-in-time).
3. Set the retention window (e.g. 7 days PITR + daily snapshots for 30 days).
4. Confirm the backup schedule shows recent successful snapshots.

### Manual / self-hosted fallback
Daily dump (cron on the host):
```bash
mongodump --uri="$MONGODB_URI" --gzip --archive="/backups/mongo-$(date +%F).gz"
# copy the archive off-box to durable storage (R2/S3)
```

### Restore drill (do this once, on staging)
```bash
# Atlas: cluster → Backup → Restore → to a NEW staging cluster, then point staging at it.
# Manual:
mongorestore --uri="$STAGING_MONGODB_URI" --gzip --archive="/backups/mongo-YYYY-MM-DD.gz" --drop
```
✅ Success criteria: a tenant, its bots, documents, conversations and tickets all load in the staging dashboard.

---

## 2. Qdrant

Qdrant Cloud does **not** snapshot automatically. Snapshot every collection on a schedule with the bundled script:

```bash
npm run backup:qdrant -w backend        # creates a snapshot per collection
```
Then copy snapshots off the Qdrant node/bucket. Schedule it daily (host cron, GitHub Action, or a scheduled job).

### Restore drill
- **Qdrant Cloud:** console → collection → **Snapshots** → restore, or `PUT /collections/{name}/snapshots/recover` with the snapshot URL.
- **Self-hosted:** place the snapshot file in the storage dir and recover via the API.
- ✅ Success criteria: after restore, ask a bot a KB question on staging and confirm it answers from its documents (proves vectors + `botId`/`documentId` payload indexes survived).

> Note: even without Qdrant backups you can rebuild all vectors from MongoDB — the raw KB files live in object storage (`Document.originalUrl`) and **Reindex** (`POST /api/kb/reindex`) re-embeds them. Qdrant snapshots just make recovery faster.

---

## 3. Cadence & verification
- [ ] Mongo automated backups enabled, last snapshot < 24h old.
- [ ] Qdrant snapshot job running daily; snapshots copied off-node.
- [ ] **Restore drill completed on staging at least once** (date: ________), both success criteria met.
- [ ] Re-run the drill quarterly and after any major schema/infra change.
