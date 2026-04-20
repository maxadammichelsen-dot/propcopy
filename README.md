# Estatio

AI-driven white-label SaaS for Swedish real estate agencies. Paste a property address and get polished, channel-ready marketing copy in seconds — ads, social posts, email campaigns — tuned to the agency's own tone of voice.

---

## Features

| Feature | Description |
|---|---|
| **Textgenerering** | One-click copy for Hemnet, Instagram, Facebook, email newsletters and print — all channels from a single property brief |
| **Tonalitetsprofil** | Scrapes the agency's website to extract brand voice; used in every generation |
| **Dashboard** | Health scores, action items and a 6-month activity sparkline for every listing |
| **Marknadsanalys** | AI-generated competitive intelligence per area — avg price, days on market, price trend |
| **Spekulantspårning** | Lightweight JS pixel collects anonymous fingerprints + optional email; scores leads hot/warm/cold |
| **Uppföljning** | Auto-generates personalised follow-up emails for warm/hot leads, cross-referencing off-market draft listings |

---

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres, Auth, Row Level Security
- **Anthropic Claude** (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Tailwind CSS** with dynamic CSS custom properties for per-agency branding

---

## Local setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- An Anthropic API key

### 1. Clone and install

```bash
git clone <repo>
cd estatio
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

See the **Environment variables** table below for details.

### 3. Database migrations

Run all migrations in order against your Supabase project:

```bash
# Using the Supabase CLI (recommended)
supabase db push

# Or apply manually in the Supabase SQL editor:
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_branding_and_prospects.sql
# supabase/migrations/003_new_tables.sql  (idempotent, safe to re-run)
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL — exposed to the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key — exposed to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key for server-side RLS bypass (never expose to browser) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for all Claude calls |

All four variables must also be set in **Vercel → Project → Settings → Environment Variables** for production deploys.

---

## Tracking pixel

Embed the pixel on any agency property listing page to capture leads:

```html
<script src="https://<your-domain>/track.js"
        data-agency="<agency-uuid>"
        async></script>
```

The pixel is zero-dependency vanilla JS. It fires `pageview`, `scroll_depth`, `time_on_page`, and `email_captured` events to `/api/track`. Leads appear automatically in the **Spekulanter** and **Uppföljning** views.

---

## Deployment

Deploy to Vercel with one click. Set the four environment variables listed above and Vercel will handle the rest. The `next.config.mjs` is already configured to allow external image domains for agency logos.
