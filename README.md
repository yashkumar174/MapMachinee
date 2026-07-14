# MAPMACHINE

**Scrape, score, and pipeline your hyper-local leads with AI.**

MAPMACHINE is a full-stack lead-generation SaaS. You give it a niche and a location
("dentists in Bangalore"); it scrapes Google Maps for matching businesses, audits
their websites, enriches contacts, scores each lead, and drops them into a built-in
CRM — with team accounts, usage limits, and subscription billing.

> 🔗 **Live demo:** _add your Railway URL here_
>
> 🖼️ _Add a screenshot or short GIF of the dashboard here — it's the single biggest
> thing a visitor looks at._

---

## Features

- **Google Maps scraping** — Playwright-driven scraper pulls business name, phone,
  website, rating, and review counts for a given query.
- **Website auditing & enrichment** — inspects each lead's site and optionally
  enriches contacts via Apollo / Hunter.
- **AI pitch generation** — generates a tailored outreach pitch per lead (OpenAI).
- **Built-in CRM** — inquiries, lead pipeline, and rich-text notes (Tiptap).
- **Auth & teams** — Firebase authentication with organization/team accounts and
  invites.
- **Subscription billing** — Razorpay plans (Pro / Business) with webhooks and
  per-plan usage limits.
- **Rate limiting** — Upstash Redis protects the API from abuse.

## Architecture

This is a monorepo with two services that talk over HTTP:

```
┌─────────────────────┐        POST /jobs/scrape        ┌──────────────────────┐
│   dashboard/        │ ──────────────────────────────▶ │   scraper/           │
│   Next.js 16        │                                 │   FastAPI + Playwright│
│   (UI + API routes) │ ◀────────────────────────────── │   (background jobs)  │
└─────────────────────┘     POST /api/leads (callback)   └──────────────────────┘
        │                                                          
        ├── PostgreSQL (Prisma)                                    
        ├── Firebase Auth                                          
        ├── Upstash Redis (rate limiting)                          
        └── Razorpay (billing)                                     
```

The dashboard sends scrape jobs to the scraper with a shared secret. The scraper runs
the job in a background thread and posts results back to the dashboard's
`/api/leads` callback.

## Tech stack

| Layer      | Tech                                                        |
| ---------- | ----------------------------------------------------------- |
| Frontend   | Next.js 16, React 19, Tailwind CSS 4, GSAP, Lenis           |
| Backend    | Next.js API routes, Prisma, PostgreSQL                      |
| Scraper    | Python, FastAPI, Playwright, BeautifulSoup                  |
| Auth       | Firebase (client + admin SDK)                               |
| Payments   | Razorpay                                                    |
| Infra      | Upstash Redis, Docker, Railway                              |
| AI         | OpenAI                                                      |

## Getting started (local)

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL (or use the bundled `docker-compose.yml`)

### 1. Clone and configure

```bash
git clone <this-repo-url>
cd webscrapping-service

# Dashboard env
cp dashboard/.env.example dashboard/.env
# Scraper env
cp scraper/.env.example scraper/.env
```

Fill in both `.env` files. See the `.env.example` files for every variable and what
it's for. `SCRAPER_API_SECRET` **must be identical** in both.

### 2. Run the dashboard

```bash
cd dashboard
npm install
npx prisma db push        # sync schema to your database
npx tsx scripts/seed.ts   # seed the superadmin account
npm run dev               # http://localhost:3000
```

### 3. Run the scraper

```bash
cd scraper
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install
python server.py          # http://localhost:8000
```

### Or: run everything with Docker

```bash
docker compose up --build
```

## Deployment

The app is deployed on **Railway** using the root `Dockerfile` and `start.sh`, which
runs Prisma migrations, seeds the DB, starts the FastAPI scraper on port 8000, and
serves the Next.js dashboard on port 3000. Set the same environment variables from the
`.env.example` files in your Railway project.

## Repository layout

```
.
├── dashboard/      # Next.js app — UI, API routes, Prisma schema, CRM
├── scraper/        # FastAPI + Playwright scraping service
├── docker-compose.yml
├── Dockerfile      # production image (dashboard + scraper)
└── start.sh        # container entrypoint
```

## License

Released under the [MIT License](LICENSE).

---

> ⚠️ **Note on scraping:** MAPMACHINE scrapes public Google Maps data. Automated
> scraping may conflict with a provider's Terms of Service. This project is intended
> as a technical demonstration; use it responsibly and at your own risk.
