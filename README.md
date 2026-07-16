<div align="center">

# MAGNETIC AI
### Multi-Tenant AI Customer Support Platform

> A full-stack, RAG-powered support platform for automated customer answers, live agent handoff, ticketing, analytics, and embeddable chat.

[![CI / Deploy](https://github.com/yogesh968/MagneticAI-/actions/workflows/deploy.yml/badge.svg)](https://github.com/yogesh968/MagneticAI-/actions/workflows/deploy.yml)
![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-dc244c)
![Groq](https://img.shields.io/badge/Groq-LLM_Inference-f55036)
![License](https://img.shields.io/badge/License-Not_Specified-lightgrey)

</div>

## Introduction

Magnetic AI is a multi-tenant AI customer support platform for teams that want fast automated answers, reliable human handoff, and a clean dashboard for managing support operations. It combines a Next.js agent dashboard, an Express and Socket.IO API, MongoDB for application data, Qdrant for tenant-isolated vector search, Groq for LLM responses, and Cohere embeddings for retrieval.

The platform is designed for SaaS companies, agencies, and internal support teams that need a self-hostable support desk with Retrieval-Augmented Generation (RAG), embeddable chat, ticket management, analytics, and configurable escalation rules.
## Overview

Magnetic AI helps support teams answer customer questions from their own knowledge base while keeping humans close when automation is not enough. Each tenant can upload documents, configure bot behavior, customize widget settings, review conversations, manage tickets, and monitor support performance from a single dashboard.

The system follows a modular full-stack architecture:

- The frontend provides the customer support dashboard and authentication flows.
- The backend exposes REST APIs, Socket.IO events, public chat routes, widget configuration, integrations, and RAG services.
- MongoDB stores tenants, users, conversations, messages, tickets, bot settings, and uploaded document metadata.
- Qdrant stores vectorized document chunks in tenant-specific collections.
- Groq generates AI responses using retrieved knowledge-base context.
- Cohere creates 1024-dimensional embeddings for document search.

## Key Features

### Multi-Tenant Support

- Tenant-scoped users, conversations, tickets, documents, analytics, and bots.
- JWT-based tenant resolution for protected dashboard APIs.
- Tenant-specific Qdrant collections for knowledge-base isolation.

### Multiple Bots per Tenant

- Each bot has its own name, description, personality, welcome message, escalation rules, and widget colour.
- **Each bot has its own knowledge base.** A document belongs to exactly one bot, and a bot only ever answers from its own documents.
- Each bot gets its own embed snippet (`data-bot-id`), so different bots can run on different sites or pages.
- One bot per tenant is the *default*: it answers legacy `data-tenant-id` embeds, WhatsApp, and email-to-ticket.

### AI Knowledge-Base Answers

- Upload `.pdf`, `.docx`, `.txt`, and `.md` files, scoped to a bot you pick.
- Parse documents into chunks and index them into Qdrant, tagged with the owning bot.
- Retrieve relevant chunks at question time, filtered to the answering bot.
- Generate grounded AI replies using Groq.
- Reindex a bot's documents when its knowledge-base content changes.

### Real-Time Chat

- Public chat session creation for website visitors.
- Message history by session.
- Streaming and non-streaming AI response support.
- Socket.IO support for real-time agent/customer updates.

### Human Handoff and Ticketing

- Escalation rules based on trigger phrases and priority levels.
- Ticket creation from chat conversations.
- Ticket status, priority, assignment, tags, and notes.
- Agent and admin workflows for handling escalated issues.

### Dashboard and Analytics

- Overview metrics for support performance.
- Conversation history and detail views.
- Ticket queues and ticket detail pages.
- Knowledge-base document management.
- Bot configuration and suggested questions.
- Integration status monitoring.

### Embeddable Chat Widget

- Lightweight external widget served from the backend.
- Tenant-specific widget configuration endpoint.
- Drop-in `<script>` embed for client websites.

### Integrations

- Email-to-ticket webhook endpoint.
- WhatsApp webhook support through Twilio.
- Integration status endpoint for operational checks.

## Architecture

```text
Customer Website                         Agent / Admin browser
    |                                          |
    |  Embeds /widget.js                       |  httpOnly session cookie
    |  (data-bot-id)                           v
    v                                    Next.js Dashboard
Magnetic AI Widget                         |  middleware.ts verifies the cookie
    |                                      |  server-side before a page renders
    |  Public chat APIs + Socket.IO        |
    |  (signed session token)              |  rewrites /api/* ──┐
    |                                                           |
    +──────────────────────> Express API <──────────────────────┘
                                 |
                                 |-- MongoDB: tenants, users, bots, tickets,
                                 |            conversations, messages, documents
                                 |-- Qdrant: per-tenant collections, points
                                 |           tagged with botId
                                 |-- Embeddings: document and query vectors
                                 |-- Groq: AI response generation
```

Two things in that diagram are load-bearing:

**The dashboard reaches the API through a Next.js rewrite, not directly.** Cookies
are domain-scoped, so a backend on its own domain could never set a cookie the
frontend's middleware can read. Proxying makes the browser see one origin, which
is what lets auth live in an httpOnly cookie and lets `SameSite=Lax` serve as the
CSRF defence. The widget is deliberately *not* proxied — it runs on customer
domains and authenticates with a signed session token instead.

**Qdrant collections are per-tenant, but retrieval filters on `botId`.** That
filter is the only thing separating one bot's knowledge from another's within a
tenant.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| UI and Forms | lucide-react, React Hook Form, Zod, react-hot-toast |
| Charts | Recharts |
| Backend | Node.js, Express, TypeScript |
| Real Time | Socket.IO |
| Database | MongoDB, Mongoose |
| Vector Store | Qdrant |
| AI | Groq SDK |
| Embeddings | Cohere Embed English v3.0 |
| Documents | pdf-parse, mammoth, text/markdown parsing |
| Auth | JWT, bcryptjs, role-based access checks |
| Integrations | Nodemailer, Twilio |
| Tooling | npm workspaces, tsx, Jest, ESLint, Docker Compose |

## Project Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- config/          # env validation, CORS policies, MongoDB, Qdrant, Groq
|   |   |-- controllers/     # Route handlers
|   |   |-- middleware/      # Auth, tenant, RBAC, webhook signatures, errors
|   |   |-- models/          # Mongoose models
|   |   |-- routes/          # API route definitions
|   |   |-- scripts/         # One-off migrations
|   |   |-- services/        # RAG, embeddings, document processing, escalation
|   |   |-- socket/          # Socket.IO chat handlers
|   |   |-- utils/           # Chunking, parsing, upload paths, JWT, cookies
|   |   |-- app.ts           # Express application
|   |   |-- server.ts        # HTTP and Socket.IO server
|   |   `-- seed.ts          # Demo tenant, users, bots, KB, tickets, conversations
|   |-- tests/               # Unit and integration tests
|   `-- widget/widget.js     # Embeddable customer chat widget
|-- frontend/
|   |-- app/                 # Next.js App Router pages
|   |-- components/          # Auth, bot selector, and UI components
|   |-- lib/                 # API client, bots hook, route policy, session verify
|   |-- middleware.ts        # Server-side route guard — runs before pages render
|   `-- next.config.mjs      # API proxy (/api/* -> BACKEND_URL) + security headers
|-- sample-kb/               # Sample documents used by the seed script
|-- docker-compose.yml       # Local MongoDB and Qdrant services
|-- package.json             # Root workspace scripts
`-- README.md
```

## Prerequisites

Install the following before running the project locally:

- Node.js 18 or newer
- npm
- Docker and Docker Compose
- Groq API key
- Cohere API key

## Environment Variables

See `.env.example` for the annotated full list. The essentials:

Create a backend environment file at `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_support

# Both REQUIRED, both >= 32 chars, and they must differ.
# The server refuses to boot otherwise, and in production it also rejects these
# placeholder values. Generate each with:  openssl rand -base64 48
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret

GROQ_API_KEY=gsk_your_groq_api_key
COHERE_API_KEY=your_cohere_api_key

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Allowed dashboard origins (comma-separated) for the credentialed CORS policy.
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads

# Optional — required in production if you use these integrations
EMAIL_WEBHOOK_SECRET=          # shared secret for the email-to-ticket webhook
WHATSAPP_TENANT_ID=            # NOTE: pins all inbound WhatsApp to ONE tenant
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=             # also validates the Twilio webhook signature
TWILIO_WHATSAPP_FROM=
```

Create a frontend environment file at `frontend/.env.local`:

```env
# Where Next.js proxies /api/* to. Server-side only — never sent to the browser.
BACKEND_URL=http://localhost:5000

# MUST match the backend's values exactly — middleware.ts verifies the session
# cookie's signature with these. Server-side only (no NEXT_PUBLIC_ prefix).
JWT_SECRET=
JWT_REFRESH_SECRET=

# Socket.IO connects to the backend directly (not proxied), so this is public.
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Only used to build the widget embed snippets shown in the dashboard.
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> The frontend needs `BACKEND_URL` and the two JWT secrets. Without them the API
> proxy has nowhere to go and the route guard fails closed, so every dashboard
> route redirects to `/login`.

> AI knowledge-base answers require valid `GROQ_API_KEY` and `COHERE_API_KEY` values.

## Local Development

1. Clone the repository:

```bash
git clone https://github.com/your-username/magnetic-ai.git
cd magnetic-ai
```

2. Install dependencies:

```bash
npm install
```

3. Start MongoDB and Qdrant:

```bash
docker compose up -d
```

4. Add environment variables:

```bash
cp .env.example backend/.env
```

Then create `frontend/.env.local` using the frontend template in [Environment Variables](#environment-variables).

5. Seed demo data:

```bash
npm run seed
```

The seed script creates:

- Acme Corp demo tenant
- Admin and agent accounts
- **Two bots** — `AcmeBot` (default, general support) and `Product Expert` —
  each with its own documents, so you can see per-bot knowledge bases immediately
- Sample knowledge-base documents, split across those two bots
- Sample conversations and tickets

6. Start both development servers:

```bash
npm run dev
```

Default local URLs:

- Frontend dashboard: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- API health check: `http://localhost:5000/health`
- Qdrant dashboard/API: `http://localhost:6333`
- MongoDB: `mongodb://localhost:27017`

## Demo Accounts

After running `npm run seed`, use either of these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.com` | `Demo@1234` |
| Agent | `agent@demo.com` | `Demo@1234` |

## Available Scripts

Run these from the repository root unless noted otherwise.

| Command | Description |
| --- | --- |
| `npm run dev` | Start backend and frontend development servers together |
| `npm run build` | Build backend TypeScript and frontend Next.js app |
| `npm run lint` | Run linting for both workspaces |
| `npm run seed` | Seed the backend with a demo tenant, two bots, and knowledge bases |
| `npm run migrate:multi-bot -w backend` | One-off: migrate a pre-multi-bot database (see below) |
| `npm run dev -w backend` | Start only the backend API |
| `npm run dev -w frontend` | Start only the frontend dashboard |
| `npm run test -w backend` | Run backend tests |
| `npm run test:unit -w backend` | Run backend unit tests |

## API Reference

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | API status response |
| `GET` | `/health` | Health check |

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a tenant and first user |
| `POST` | `/api/auth/login` | Public | Log in and receive tokens |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset |
| `POST` | `/api/auth/reset-password` | Public | Reset password with token |
| `POST` | `/api/auth/refresh` | Cookie | Rotate the session (reads the refresh cookie) |
| `GET` | `/api/auth/me` | Authenticated | Get current user |
| `POST` | `/api/auth/logout` | Authenticated | Revoke every session for this user |
| `POST` | `/api/auth/socket-ticket` | Authenticated | Mint a 2-minute Socket.IO handshake ticket |
| `POST` | `/api/auth/invite` | Admin | Invite a team member |
| `DELETE` | `/api/auth/members/:id` | Admin | Remove a team member |

Login and register set httpOnly `mg_at` / `mg_rt` cookies plus a readable
`mg_session` hint used only for rendering. The tokens are also returned in the
body for non-browser clients.

### Bots

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/bots` | Authenticated | List bots with per-bot document counts |
| `GET` | `/api/bots/:id` | Authenticated | Get one bot |
| `POST` | `/api/bots` | Admin | Create a bot |
| `PUT` | `/api/bots/:id` | Admin | Update a bot's persona, rules, or widget settings |
| `POST` | `/api/bots/:id/default` | Admin | Make this the tenant's default bot |
| `DELETE` | `/api/bots/:id` | Admin | Delete a bot, its documents and its vectors |
| `POST` | `/api/bots/:id/test` | Admin | Ask this bot a question from the dashboard |

### Knowledge Base

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/kb/upload` | Admin | Upload and index a document (`botId` form field) |
| `GET` | `/api/kb/documents` | Authenticated | List documents (`?botId=` to scope to one bot) |
| `GET` | `/api/kb/documents/:id` | Authenticated | Get a document record |
| `DELETE` | `/api/kb/documents/:id` | Admin | Delete a document |
| `POST` | `/api/kb/reindex` | Admin | Rebuild the vector index (`botId` to scope) |

### Chat

Public, but not unauthenticated: `POST /api/chat/session` returns a signed
`sessionToken`, and every other route requires it in an `x-session-token` header.
The tenant, bot and conversation come from that token, never from the request
body.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/chat/session` | Public | Start a session for a bot (`botId`, or `tenantId` for its default) |
| `POST` | `/api/chat/message` | Session token | Send a chat message |
| `POST` | `/api/chat/message/stream` | Session token | Stream an AI chat response |
| `POST` | `/api/chat/ticket` | Session token | Create a public support ticket |
| `GET` | `/api/chat/history` | Session token | Fetch this session's history |

### Tickets

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tickets` | Agent/Admin | List tickets |
| `GET` | `/api/tickets/escalated` | Agent/Admin | List high-priority escalations |
| `GET` | `/api/tickets/agents` | Agent/Admin | List available agents |
| `GET` | `/api/tickets/:id` | Agent/Admin | Get ticket details |
| `PUT` | `/api/tickets/:id` | Agent/Admin | Update ticket status, priority, assignee, tags, or notes |
| `POST` | `/api/tickets/:id/escalate` | Agent/Admin | Escalate a ticket |

### Conversations

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/conversations` | Authenticated | List conversations |
| `GET` | `/api/conversations/:id` | Authenticated | Get conversation details |
| `DELETE` | `/api/conversations/:id` | Admin | Delete a conversation |

### Analytics

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/analytics/overview` | Admin | Overview metrics |
| `GET` | `/api/analytics/charts` | Admin | Chart data |
| `GET` | `/api/analytics/kb` | Admin | Knowledge-base analytics |
| `GET` | `/api/analytics/escalations` | Admin | Escalation analytics |

### Widget

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/widget/bot/:botId/config` | Public | Public config for one bot |
| `GET` | `/api/widget/:tenantId/config` | Public | Public config for a tenant's default bot |
| `GET` | `/widget.js` | Public | Serve the embeddable widget script |

### Integrations

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/integrations/email` | Shared secret | Create a ticket from inbound email (`x-webhook-secret`) |
| `POST` | `/api/integrations/whatsapp` | Twilio signature | Handle WhatsApp messages through Twilio |
| `POST` | `/api/integrations/whatsapp/webhook` | Twilio signature | Alternate WhatsApp webhook path |
| `GET` | `/api/integrations/status` | Admin | Check integration configuration status |

## Widget Embed

Copy a bot's snippet from **Dashboard → Bots → Embed**, or build it yourself:

```html
<script
  src="https://api.yourdomain.com/widget.js"
  data-bot-id="YOUR_BOT_ID">
</script>
```

`data-bot-id` chooses which bot answers, and therefore which knowledge base the
answers come from. Embedding two different bots on two different pages is the
intended use.

For local testing:

```html
<script
  src="http://localhost:5000/widget.js"
  data-bot-id="YOUR_BOT_ID">
</script>
```

The widget fetches public bot settings from:

```text
GET /api/widget/bot/:botId/config
```

`data-tenant-id="YOUR_TENANT_ID"` still works and resolves to that tenant's
default bot, for embeds that predate multi-bot support.

## Knowledge Base Workflow

1. An admin picks a bot in the dashboard and uploads a supported document to it.
2. The backend stores document metadata — including its `botId` — in MongoDB.
3. The parser extracts text from the file.
4. The chunker splits content into searchable sections.
5. The embedding provider generates a vector for each chunk.
6. Qdrant stores the vectors in the tenant's collection, each point tagged with `botId`.
7. At question time, retrieval filters on the answering bot's `botId`, so a bot
   only ever sees its own documents.

If the embedding provider is unreachable, the document is marked `failed` with
zero chunks and the Knowledge Base page says so — the bot stays answerable but
has no context from that file. Use **Reindex** once the provider is back.

## Migrating an Existing Database

Databases created before multi-bot support need a one-off migration:

```bash
npm run migrate:multi-bot -w backend
```

It is idempotent, and it:

- drops the legacy unique index on `botconfigs.tenantId` (until this is gone,
  creating a second bot for a tenant fails with a duplicate-key error — removing
  `unique: true` from the schema does not drop an index that already exists);
- promotes each tenant's existing bot to its default, creating one if absent;
- backfills `botId` onto existing documents and conversations;
- stamps `botId` onto existing Qdrant points, which would otherwise match no
  filter and leave every migrated bot answering from an empty knowledge base.

Run it **before** starting the new backend against an existing database.
7. Customer questions are embedded and matched against the tenant collection.
8. Groq receives the retrieved context and generates the final answer.

Supported upload types:

- PDF
- DOCX
- TXT
- Markdown

Default upload limit: `10 MB` per file.

## Testing

Run backend tests:

```bash
npm run test -w backend
```

Run only unit tests:

```bash
npm run test:unit -w backend
```

The current test coverage includes utility and escalation logic. Add integration tests for API workflows as the product surface expands.

## Deployment Notes

### Backend

The backend includes deployment configuration for Railway and Vercel:

- `backend/railway.json`
- `backend/vercel.json`
- `backend/nixpacks.toml`

Make sure production environments provide:

- `MONGODB_URI`
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — both required, >= 32 chars, different
  from each other, and not the shipped placeholders. The server refuses to boot
  otherwise.
- `GROQ_API_KEY`
- `COHERE_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`, if using a secured Qdrant instance
- `FRONTEND_URL` — the dashboard origin(s), comma-separated. This is the CORS
  allowlist, not a cosmetic setting.
- `EMAIL_WEBHOOK_SECRET` / `TWILIO_AUTH_TOKEN`, if using those integrations
- `PUBLIC_API_URL`, only if Twilio webhooks reach you through a proxy

### Frontend

The frontend includes Vercel configuration:

- `frontend/vercel.json`

Set these production variables:

- `BACKEND_URL` — the backend's origin. Next.js proxies `/api/*` here.
  Server-side only; do not prefix with `NEXT_PUBLIC_`.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — **must match the backend exactly.**
  The middleware verifies the session cookie with them and fails closed if they
  are absent, which redirects every dashboard route to `/login`.
- `NEXT_PUBLIC_SOCKET_URL` — the backend origin; Socket.IO is not proxied.
- `NEXT_PUBLIC_API_URL` — the backend's public origin, used only to render
  widget embed snippets.

> The frontend and backend do not need to share a domain — the API proxy is what
> makes the auth cookie same-origin. But if you change how the dashboard reaches
> the API, re-read the Architecture section first: cookie auth and the route
> guard both depend on that proxy.

### Migrating an existing deployment

Run `npm run migrate:multi-bot -w backend` against the production database
**before** rolling out the new backend. See
[Migrating an Existing Database](#migrating-an-existing-database).

### Services

For production, use managed or persistent services for:

- MongoDB
- Qdrant
- Application file uploads

Avoid relying on local container volumes for production data.

## Security Notes

How auth works:

- Access (15m) and refresh (7d) tokens live in httpOnly cookies, set on the
  frontend origin via the API proxy. `SameSite=Lax` + same-origin is the CSRF
  defence — do not switch the cookies to `SameSite=None` without adding CSRF
  tokens.
- `middleware.ts` verifies the cookie signature server-side before a page
  renders, so protected routes never paint for a signed-out visitor. It fails
  closed if the JWT secrets are missing.
- The API is the security boundary and re-checks every request. The middleware
  and the readable `mg_session` cookie only decide what renders; never gate
  anything security-relevant on `mg_session`, which is client-writable by design.
- Logout bumps a `tokenVersion`, which invalidates every outstanding refresh
  token for that user, not just the current browser's. Password reset does the
  same. Access tokens still live out their 15 minutes.
- The public chat API authenticates with a signed session token rather than
  trusting a `tenantId` in the request body.

Operational:

- Keep the JWT secrets, provider API keys, and Twilio credentials out of source
  control. The backend refuses to boot in production with placeholder or short
  (<32 char) secrets, or with `JWT_SECRET === JWT_REFRESH_SECRET`.
- Set `FRONTEND_URL` to your real dashboard origin(s) — it is the allowlist for
  the credentialed CORS policy.
- Set `EMAIL_WEBHOOK_SECRET` and `TWILIO_AUTH_TOKEN` if you use those
  integrations; in production their webhooks return 503 without them.
- Use HTTPS in production for both dashboard and widget traffic.
- Rotate demo credentials or disable seeded users in production.

Known gaps:

- The public chat API has no domain allowlist or per-bot key, so anyone holding
  a bot id can start a session against it. It is rate limited per IP, but treat
  a bot id as public.
- The WhatsApp integration is single-tenant: `WHATSAPP_TENANT_ID` pins every
  inbound message to one tenant regardless of which number it arrived on.
- The admin portal's Tenants page does not list real tenants — there is no
  superadmin tenant-listing endpoint yet.

## Roadmap

- Email reply workflows for tickets.
- Richer agent assignment and team routing.
- Slack or Microsoft Teams notifications.
- More granular role and permission management.
- More integration tests for public chat and dashboard APIs.
- Usage metering and tenant-level billing hooks.
- Advanced analytics for AI deflection, response quality, and resolution time.

## Contributing

Contributions are welcome. For a clean workflow:

1. Create a feature branch.
2. Keep changes focused and documented.
3. Run linting and tests before opening a pull request.
4. Include screenshots for dashboard or widget UI changes.
5. Describe any new environment variables or migrations clearly.

## License

No license file is currently included. Add a license before distributing or using this project in a commercial setting.
