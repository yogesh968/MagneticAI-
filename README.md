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

## Table of Contents

- [Introduction](#introduction)
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Demo Accounts](#demo-accounts)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Widget Embed](#widget-embed)
- [Knowledge Base Workflow](#knowledge-base-workflow)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Roadmap](#roadmap)

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

- Tenant-scoped users, conversations, tickets, documents, analytics, and bot settings.
- JWT-based tenant resolution for protected dashboard APIs.
- Tenant-specific Qdrant collections for knowledge-base isolation.

### AI Knowledge-Base Answers

- Upload `.pdf`, `.docx`, `.txt`, and `.md` files.
- Parse documents into chunks and index them into Qdrant.
- Retrieve relevant chunks at question time.
- Generate grounded AI replies using Groq.
- Reindex documents when knowledge-base content changes.

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
Customer Website
    |
    |  Embeds /widget.js
    v
Magnetic AI Widget
    |
    |  Public chat APIs + Socket.IO
    v
Express API
    |
    |-- MongoDB: tenants, users, tickets, conversations, messages
    |-- Qdrant: tenant-specific document vectors
    |-- Cohere: document and query embeddings
    |-- Groq: AI response generation
    |
    v
Next.js Dashboard
```

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
|   |   |-- config/          # MongoDB, Qdrant, Groq configuration
|   |   |-- controllers/     # Route handlers
|   |   |-- middleware/      # Auth, tenant, RBAC, validation, errors
|   |   |-- models/          # Mongoose models
|   |   |-- routes/          # API route definitions
|   |   |-- services/        # RAG, embeddings, document processing, escalation
|   |   |-- socket/          # Socket.IO chat handlers
|   |   |-- utils/           # Chunking, parsing, upload paths, JWT helpers
|   |   |-- app.ts           # Express application
|   |   |-- server.ts        # HTTP and Socket.IO server
|   |   `-- seed.ts          # Demo tenant, users, KB, tickets, conversations
|   |-- tests/               # Unit and integration tests
|   `-- widget/widget.js     # Embeddable customer chat widget
|-- frontend/
|   |-- app/                 # Next.js App Router pages
|   |-- components/          # Auth and UI components
|   `-- lib/                 # API and Socket.IO clients
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

Create a backend environment file at `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_support
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret

GROQ_API_KEY=gsk_your_groq_api_key
COHERE_API_KEY=your_cohere_api_key

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=uploads

# Optional WhatsApp integration
WHATSAPP_TENANT_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

Create a frontend environment file at `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

> Note: the backend requires `MONGODB_URI`. AI knowledge-base answers require valid `GROQ_API_KEY` and `COHERE_API_KEY` values.

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
- Sample bot configuration
- Sample knowledge-base documents
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
| `npm run seed` | Seed the backend with demo tenant data |
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
| `POST` | `/api/auth/refresh` | Public | Refresh access token |
| `GET` | `/api/auth/me` | Authenticated | Get current user |
| `POST` | `/api/auth/invite` | Admin | Invite a team member |
| `DELETE` | `/api/auth/members/:id` | Admin | Remove a team member |

### Knowledge Base

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/kb/upload` | Admin | Upload and index a document |
| `GET` | `/api/kb/documents` | Authenticated | List knowledge-base documents |
| `GET` | `/api/kb/documents/:id` | Authenticated | Get a document record |
| `DELETE` | `/api/kb/documents/:id` | Admin | Delete a document |
| `POST` | `/api/kb/reindex` | Admin | Rebuild vector index |

### Chat

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/chat/session` | Public | Create a customer chat session |
| `POST` | `/api/chat/message` | Public | Send a chat message |
| `POST` | `/api/chat/message/stream` | Public | Stream an AI chat response |
| `POST` | `/api/chat/ticket` | Public | Create a public support ticket |
| `GET` | `/api/chat/history/:sessionId` | Public | Fetch chat history |

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
| `DELETE` | `/api/conversations/:id` | Authenticated | Delete a conversation |

### Analytics

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/analytics/overview` | Admin | Overview metrics |
| `GET` | `/api/analytics/charts` | Admin | Chart data |
| `GET` | `/api/analytics/kb` | Admin | Knowledge-base analytics |
| `GET` | `/api/analytics/escalations` | Admin | Escalation analytics |

### Bot Configuration and Widget

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/config/bot` | Admin | Get bot settings |
| `PUT` | `/api/config/bot` | Admin | Update bot settings |
| `POST` | `/api/config/test` | Admin | Test the bot against current configuration |
| `GET` | `/api/widget/:tenantId/config` | Public | Get public widget configuration |
| `GET` | `/widget.js` | Public | Serve the embeddable widget script |

### Integrations

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/integrations/email` | Public webhook | Create a ticket from inbound email |
| `POST` | `/api/integrations/whatsapp` | Public webhook | Handle WhatsApp messages through Twilio |
| `POST` | `/api/integrations/whatsapp/webhook` | Public webhook | Alternate WhatsApp webhook path |
| `GET` | `/api/integrations/status` | Public | Check integration configuration status |

## Widget Embed

Add the widget to a customer website with:

```html
<script
  src="https://api.yourdomain.com/widget.js"
  data-tenant-id="YOUR_TENANT_ID">
</script>
```

For local testing:

```html
<script
  src="http://localhost:5000/widget.js"
  data-tenant-id="YOUR_TENANT_ID">
</script>
```

The widget uses the tenant ID to fetch public bot settings from:

```text
GET /api/widget/:tenantId/config
```

## Knowledge Base Workflow

1. An admin uploads a supported document from the dashboard.
2. The backend stores document metadata in MongoDB.
3. The parser extracts text from the file.
4. The chunker splits content into searchable sections.
5. Cohere generates embeddings for each chunk.
6. Qdrant stores vectors in a tenant-specific collection.
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
- `JWT_SECRET`
- `GROQ_API_KEY`
- `COHERE_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`, if using a secured Qdrant instance
- `FRONTEND_URL`

### Frontend

The frontend includes Vercel configuration:

- `frontend/vercel.json`

Set these production variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

### Services

For production, use managed or persistent services for:

- MongoDB
- Qdrant
- Application file uploads

Avoid relying on local container volumes for production data.

## Security Notes

- Keep `JWT_SECRET`, provider API keys, and Twilio credentials out of source control.
- Use HTTPS in production for both dashboard and widget traffic.
- Restrict webhook endpoints at the network or provider level when possible.
- Review CORS settings before public production deployment.
- Rotate demo credentials or disable seeded users in production.

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
