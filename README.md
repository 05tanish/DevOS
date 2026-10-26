<div align="center">

# 🖥️ DevOS

### Personal Engineering Workspace & Planner

<p>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
</p>

<p>
  <img src="https://img.shields.io/badge/status-personal%20tool-blueviolet?style=flat-square" />
  <img src="https://img.shields.io/badge/license-private-red?style=flat-square" />
  <img src="https://img.shields.io/badge/made%20with-%E2%98%95%20coffee-brown?style=flat-square" />
</p>

<br />

> *A flat-dark developer cockpit that unifies task management, DSA revision,*
> *book reading, job tracking, and GitHub activity — all remote-controlled via Telegram.*

<br />

---

</div>

## 📖 What is DevOS?

**DevOS** is a custom-built, internal productivity platform designed around a software engineer's daily workflow. Instead of juggling five different apps for tasks, practice, reading, job hunting, and code activity — DevOS brings them all under one roof.

Every feature was built from scratch to solve a real personal need. This repository is the official backup template and deployment reference guide.

<br />

---

## ✨ Feature Highlights

<br />

### 🧭 &nbsp;Developer Dashboard
A unified command center with a custom grid layout. See your productivity logs, DSA stats, active tasks, job pipeline status, and latest GitHub activity — all without switching tabs.

<br />

### 📝 &nbsp;Smart Notes Parser
Import your exported HTML notes from tools like Notion. The parser handles nested formatting, inline code, code blocks, tags, hyperlinks, ordered/unordered lists, and embedded images without any manual cleanup.

<br />

### 🧠 &nbsp;DSA Practice Tracker
Never forget a revision again. Schedules practice using a spaced repetition system across **Days 1 → 3 → 7 → 15 → 30 → 60 → 90**. Supports topic tagging, difficulty levels, and live profile syncing for LeetCode and GeeksforGeeks.

<br />

### 📚 &nbsp;Book Reader
An inline reader for **EPUB, PDF, and TXT** formats. Features paginated scrolling, keyword search, and persistent reading progress that picks up exactly where you left off.

<br />

### 💼 &nbsp;Job Application Tracker
A drag-and-drop pipeline tracker with six stages:

```
Wishlist  →  Applied  →  OA  →  Interview  →  Rejected  →  Offer
```

**NEW**: AI-powered job extraction from screenshots! Drop an image of a job posting and let Gemini Vision API automatically extract company, role, location, salary, skills, and more. [Learn more →](./docs/JOB_IMAGE_EXTRACTION.md)

<br />

### 🧩 &nbsp;Job Capture Extension
A dedicated Chromium-based browser extension that seamlessly scrapes job postings from LinkedIn, Indeed, Naukri, and other portals. It extracts job details (title, company, description) and captures a viewport screenshot, instantly queuing them into your DevOS job pipeline.

<br />

### 🤖 &nbsp;Telegram Bot
Control your entire workspace from your phone. A secure 6-digit PIN links your Telegram account. Once linked, use interactive menus and conversational flows to manage tasks, notes, and job updates on the go.

| Command | What it does |
|:---|:---|
| `/dsadone` | Mark today's DSA revision as complete |
| `/dsastatus` | View your current revision schedule |
| `/ghstatus` | See latest GitHub activity |
| `/ghcommits` | Browse recent commits |
| `/me` | Pull up your personal dashboard summary |

<br />

### 🎨 &nbsp;Premium Flat Dark UI
Built with a high-contrast **charcoal/zinc** color palette. Solid input fields, custom scrollbars, and fluid layout transitions. Deliberately free of gradients, neon glows, and glassmorphism.

<br />

---

## 🏗️ Project Structure

```
devos/
│
├── backend/                        # Node.js + Express.js + TypeScript REST API
│   ├── prisma/
│   │   ├── schema.prisma           # All database models (PostgreSQL)
│   │   └── migrations/             # Prisma migration history
│   └── src/
│       ├── modules/                # Feature-based domains (auth, planner, jobs, dsa, etc.)
│       ├── middleware/             # Auth, file uploads, error handling
│       └── services/               # Redis, Email, AI, Telegram bot, Storage
│
├── frontend/                       # React 18 + Vite + Tailwind CSS + Zustand
│   └── src/
│       ├── components/             # Layout (Sidebar, Topbar) & shared UI components
│       ├── pages/                  # Route components (Dashboard, DSA, Jobs, Planner)
│       ├── stores/                 # Global state (Zustand for UI & Auth)
│       └── lib/                    # API client wrappers, constants, utils
│
├── job-capture-extension/          # Chromium Extension for scraping job portals
│   ├── background/                 # Extension service worker
│   ├── content/                    # Platform-specific scrapers (LinkedIn, Indeed, Naukri)
│   ├── popup/                      # Extension UI
│   └── services/                   # API syncing, offline queue, screenshot engine
│
├── docker-compose.yml              # Production Docker stack
├── docker-compose.dev.yml          # Development Docker stack
└── package.json                    # Monorepo root orchestrator
```

<br />

---

## ⚡ Quick Start

### Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** v18+
- **npm** or **Yarn**
- **PostgreSQL** — local or hosted ([Neon](https://neon.tech) / [Supabase](https://supabase.com))

<br />

### Step 1 — Clone

```bash
git clone https://github.com/your-username/devos.git
cd devos
```

### Step 2 — Environment Setup

Create a `.env` file in the **root directory**:

```env
# ─────────────────────────────────────────
# Database
# ─────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/devos?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/devos?schema=public"

# ─────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────
JWT_SECRET="your_super_long_random_secret_key"

# ─────────────────────────────────────────
# Telegram Bot
# ─────────────────────────────────────────
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# ─────────────────────────────────────────
# Email  (optional)
# ─────────────────────────────────────────
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="DevOS <noreply@yourdomain.com>"
```

### Step 3 — Install Dependencies

```bash
npm install
```

### Step 4 — Initialize Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### Step 5 — Run

```bash
# From root — starts backend + frontend concurrently
npm run dev
```

<br />

| Service | Local URL |
|:---|:---|
| 🌐 Frontend | `http://localhost:5173` |
| ⚙️ Backend API | `http://localhost:4000` |

<br />

---

## 🐳 Docker

Run the entire stack — PostgreSQL, backend, frontend, and Nginx — with a single command:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

<br />

---

## ☁️ Deployment Guide

### 🗄️ Database — Neon or Supabase

Provision a free serverless PostgreSQL instance and copy your `DATABASE_URL` and `DIRECT_URL` connection strings into your deployment environment.

<br />

### ⚙️ Backend — Railway

1. Go to [Railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Set **Root Directory** → `backend`
3. Add environment variables:

   | Variable | Value |
   |:---|:---|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `DIRECT_URL` | Direct PostgreSQL connection string |
   | `JWT_SECRET` | Long random secret |
   | `TELEGRAM_BOT_TOKEN` | Your bot token |
   | `PORT` | Auto-assigned by Railway |
   | `BACKEND_URL` | Your Railway backend URL (e.g., `https://your-app.up.railway.app`) |
   | `SUPABASE_URL` | Your Supabase project URL (for file storage) |
   | `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
   | `SUPABASE_STORAGE_BUCKET` | `devos-files` |

   **Note:** Set `BACKEND_URL` to ensure file URLs work correctly in production. If using local file storage fallback instead of Supabase, this is critical.

4. Set the **Start Command**:
   ```bash
   npx prisma db push && npm run build && npm start
   ```

<br />

### 🌐 Frontend — Vercel

1. Go to [Vercel](https://vercel.com) → **Import Project** from GitHub
2. Configure build settings:

   | Setting | Value |
   |:---|:---|
   | Framework Preset | `Vite` |
   | Root Directory | `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. Add environment variable:
   - `VITE_API_URL` → your Railway backend URL

4. Create `frontend/vercel.json` for SPA routing:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

<br />

---

## 🔐 Security Checklist

| Area | Best Practice |
|:---|:---|
| 🤖 **Telegram** | Use HTTPS webhook in production instead of polling |
| 🌐 **CORS** | Restrict allowed origins to your frontend domain only |
| 🛡️ **Helmet** | Keep all CSP headers active — never disable in production |
| 📁 **File Uploads** | Validate MIME types strictly in `upload.middleware.ts` |
| 🔑 **Secrets** | Inject all secrets via environment variables — never commit `.env` |

<br />

---

## 🧰 Tech Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand |
| **Backend** | Node.js, Express.js, TypeScript, Redis |
| **Extension** | Chromium API, DOM Parsing, Offline Queues |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Auth** | JSON Web Tokens (JWT) |
| **Bot** | Telegram Bot API |
| **Email** | Resend |
| **DevOps** | Docker, Docker Compose, Nginx |

<br />

---

## 📄 License

This is a **private internal tool** built for personal use. Not intended for public distribution or commercial use.

<br />

---

<div align="center">

**DevOS** — because one tab should be enough.

<sub>Built with ☕, TypeScript, and questionable sleep schedules.</sub>

</div>
