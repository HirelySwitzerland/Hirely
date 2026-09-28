# Hirely — Your AI Recruiting Employee

Hirely is a multi-tenant B2B SaaS platform that automates the repetitive parts of recruiting for SMEs and mid-sized companies in Switzerland and the DACH region — from incoming application to qualified candidate and a booked personal interview — while every hiring decision stays with a human.

```
Job created → Applications arrive → CV analyzed → Candidate contacted → AI pre-screening
→ AI phone / browser interview → optional video interview → structured candidate report
→ recruiter review → personal interview scheduled
```

> **Hirely handles the repetitive recruiting work. Humans handle the important decisions.**

---

## Quick start

Requirements: Node.js 20+ (22 recommended), PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # set DATABASE_URL and APP_ENCRYPTION_KEY
npx prisma db push              # create the schema
npm run db:seed                 # demo data: Helvetic Engineering AG
npm run dev                     # http://localhost:3000
```

Generate an encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Demo accounts (password `Hirely-Demo-2026`)

| Role | Email |
| --- | --- |
| Owner | `demo@hirely.app` |
| Admin | `thomas.brunner@helvetic-engineering.ch` |
| Recruiter | `laura.frei@helvetic-engineering.ch` |
| Hiring manager (sees only CNC Operator & Production Technician) | `daniel.huber@helvetic-engineering.ch` |
| Viewer | `martin.roth@helvetic-engineering.ch` |
| Owner of a **second tenant** (isolation demo) | `anna.weber@alpine-logistik.ch` |

The seed creates 8 jobs (6 open), 28 candidates with realistic Swiss CVs, AI interview transcripts, video answers, requirement evidence, stage history, booked interviews, invoices, usage history, automations and an implementation checklist.

### Try the complete end-to-end flow (≈3 minutes)

1. Open the career page: <http://localhost:3000/careers/helvetic-engineering> → **Servicetechniker/in** → apply with any CV (PDF, DOCX or TXT).
2. You land in the candidate portal. The *Standard pre-screening pipeline* automation waits, analyzes the CV, checks the minimum criteria and sends an AI interview invitation (with `AUTOMATION_TIME_SCALE=0.005`, "wait 10 minutes" takes 3 seconds). Refresh the portal.
3. Click **Start pre-screening interview** → **Do it in the browser** and answer the AI's questions (type or speak — Chrome supports voice input/output), or choose **Call me now** (simulated call without Twilio).
4. Sign in as `laura.frei@…` → the notification **“New candidate ready for review”** appears → open the profile: summary, requirement evidence, transcript, availability, notice period, salary expectation.
5. Click **Invite to personal interview** → open the candidate portal again → **Choose an interview time** → pick a slot. The calendar event is created, confirmation email sent, and the candidate moves to **Personal Interview**.

Every email/SMS is recorded in **Automations → Outbox** (mock provider) so the flow is fully visible without external accounts.

---

## Architecture

| Layer | Implementation |
| --- | --- |
| Frontend | Next.js 15 (App Router, React Server Components, Server Actions), Tailwind CSS, Recharts |
| Backend | Node.js / TypeScript service layer in `src/lib/services` |
| Database | PostgreSQL via Prisma (`prisma/schema.prisma`) |
| Auth | Own session auth: scrypt password hashing, httpOnly session cookies (hashed in DB), TOTP 2FA with recovery codes, email verification, password reset, invitations |
| Authorization | RBAC matrix (`src/lib/auth/rbac.ts`) + row-level scoping for hiring managers (`src/lib/services/scope.ts`) |
| Multi-tenancy | Every tenant table carries `orgId`; the tenant is resolved from a verified membership (`getContext()`), never from user input |
| Storage | Encrypted object storage abstraction — local AES-256-GCM encrypted files, tenant-prefixed keys (`src/lib/providers/storage.ts`) |
| Background jobs | Postgres queue with `FOR UPDATE SKIP LOCKED`, retries with backoff, failure notifications (`src/lib/queue`). Runs inline in dev (`INLINE_WORKER=true`) or as `npm run worker` |
| AI | LLM abstraction (`src/lib/providers/llm.ts`): Anthropic (official SDK), OpenAI, or a deterministic mock engine |
| Voice | Voice provider abstraction: Twilio Programmable Voice (TwiML `<Gather input="speech">`, barge-in, signature verification) or simulated calls |
| Speech-to-text | Transcription abstraction: OpenAI Whisper or browser captions (Web Speech API) |
| Email / SMS | Resend, Postmark, Twilio SMS/WhatsApp — or mock providers that record to the outbox |
| Calendar | Google Calendar & Microsoft Graph via OAuth 2.0, ICS generation, free/busy aware slot calculation |
| ATS | Adapters for Personio, Workday, SAP SuccessFactors, Abacus, rexx, Recruitee — REST polling + HMAC-signed webhooks + status write-back |
| Billing | Plans & usage-based pricing (`src/lib/billing.ts`), invoices with Swiss VAT, mock or Stripe provider, Stripe webhook verification |

### Key directories

```
prisma/                 schema, seed + seed data
scripts/worker.ts       standalone background worker
src/app/(marketing)     landing page, demo request
src/app/(auth)          login, register, 2FA, reset, verification, invitations
src/app/onboarding      5-step company onboarding wizard
src/app/app             the recruiter application (dashboard, jobs, candidates, …)
src/app/careers         branded public career pages + application form
src/app/portal          candidate portal (status, messages, privacy self-service)
src/app/interview       AI interview landing, browser voice/text interview
src/app/video           asynchronous video interview recorder
src/app/schedule        self-service interview scheduling
src/app/api             REST API v1, webhooks (ATS, Twilio, Stripe, inbound email), OAuth, files, cron, health
src/app/actions         server actions (all authenticate + authorize themselves)
src/lib/providers       exchangeable provider implementations
src/lib/services        domain logic (screening, evaluation, interviews, automation, scheduling, privacy, analytics, assistant)
```

### How the AI is kept transparent and fair

* **Evidence, not scores.** Each configured requirement is *Confirmed*, *Partially evidenced*, *Not met* or *Missing information*, always with verbatim quotes from the CV, application form, AI interview or video transcript (`src/lib/services/evaluation.ts`). The only aggregate is “meets X of Y configured requirements”.
* **No invented evidence.** CV quotes must be grounded in the source text (`quoteIsGrounded`); LLM-extracted skills that don't appear in the CV are discarded.
* **Confirmed vs. inferred.** The CV parser tags every field; derived values (total years, region from postal code, CEFR level from “fluent”) are labelled *inferred*.
* **Humans decide.** Automations can never move a candidate to Shortlisted, Offer, Hired or Rejected (`HUMAN_ONLY_STAGES`); failed must-haves route the candidate to manual review instead of rejecting.
* **Protected characteristics** are excluded from all prompts and scoring; the job AI configuration warns when a question may touch one. Video analysis uses spoken content only — there is no code path for facial, emotion or appearance analysis.
* **Prompt-injection protection.** Candidate content is wrapped as untrusted data, known injection patterns are detected and surfaced to recruiters.
* **AI disclosure.** Every interview starts with a clear statement that the candidate talks to an AI, followed by recording consent; declining ends the interview politely and notifies HR.
* **Overrides are documented.** Recruiters can override any evaluation with a mandatory justification, recorded in the audit log.

### Security

Session cookies are httpOnly/SameSite, sessions stored as SHA-256 hashes; passwords hashed with scrypt; TOTP 2FA; secrets, TOTP seeds and all uploaded files encrypted with AES-256-GCM; API keys stored hashed and scoped; ATS webhooks verified with HMAC-SHA256, Twilio with X-Twilio-Signature, Stripe with v1 signatures; rate limiting on auth, application, interview and API endpoints; uploads validated by magic bytes and size; CSP and security headers (`next.config.ts`); Zod validation on all inputs; every file download and profile view is audited; tenant isolation on every query.

### Privacy (revDSG / GDPR)

Consent capture (processing, recording/transcript, talent pool), configurable retention with nightly anonymization, self-service export and deletion in the candidate portal, data-subject request workflow for admins, complete audit log, AI transparency statement on every career page.

---

## Configuration

All providers fall back to realistic mock implementations when credentials are missing, so the full product can be demonstrated without external accounts. See `.env.example`:

| Variable | Purpose |
| --- | --- |
| `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Real LLM (defaults to `claude-opus-5-5`); OpenAI alternative via `OPENAI_API_KEY` |
| `VOICE_PROVIDER=twilio`, `TWILIO_*` | Live phone interviews (tenants can also connect their own Twilio account under Integrations) |
| `EMAIL_PROVIDER`, `RESEND_API_KEY` / `POSTMARK_TOKEN`, `EMAIL_FROM` | Transactional email |
| `SMS_PROVIDER=twilio` | SMS & WhatsApp |
| `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET` | Calendar OAuth |
| `BILLING_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments |
| `TRANSCRIPTION_PROVIDER=openai` | Video answer transcription |
| `AUTOMATION_TIME_SCALE` | Multiplier for automation waits (`1` in production) |
| `INLINE_WORKER`, `CRON_SECRET` | Worker mode; `/api/cron/tick` for serverless schedulers |

### Production

```bash
npm run build && npm start      # web
npm run worker                  # one or more background workers (INLINE_WORKER=false)
```

Health check: `GET /api/health`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run worker` | Background worker |
| `npm run db:seed` / `npm run db:reset` | Seed / reset demo data |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (CV parser, evaluation, interview engine, TOTP, crypto, RBAC) |
