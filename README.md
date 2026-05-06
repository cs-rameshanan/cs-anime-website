# AniVerse - Anime Digital Experience Platform (DXP)

A full-featured anime and manga discovery platform built as a **Digital Experience Platform (DXP)** using **Contentstack** as the headless CMS, **Next.js 15** (App Router) as the frontend, and **Contentstack Launch** for deployment.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Step 1: Create a Contentstack Stack](#step-1-create-a-contentstack-stack)
   - [Step 2: Generate API Tokens](#step-2-generate-api-tokens)
   - [Step 3: Configure `.env` (Management API)](#step-3-configure-env-management-api)
   - [Step 4: Install Dependencies](#step-4-install-dependencies)
   - [Step 5: Run the Master Setup Script](#step-5-run-the-master-setup-script)
   - [Step 6: Create a Delivery Token (Manual)](#step-6-create-a-delivery-token-manual)
   - [Step 7: Configure Frontend Environment Variables (.env.local)](#step-7-configure-frontend-environment-variables-envlocal)
   - [Step 8: Run the Frontend Locally](#step-8-run-the-frontend-locally)
   - [Step 9: Set Up Contentstack Personalize (Optional)](#step-9-set-up-contentstack-personalize-optional)
   - [Step 10: Set Up Brand Kit + AniBot Chatbot (Optional)](#step-10-set-up-brand-kit--anibot-chatbot-optional)
   - [Step 11: Deploy to Contentstack Launch](#step-11-deploy-to-contentstack-launch)
6. [Content Types Reference](#content-types-reference)
7. [Scripts Reference](#scripts-reference)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Contentstack Launch Environment Variables](#contentstack-launch-environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AniVerse DXP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  JIKAN API   │───▶│  Import Scripts   │───▶│ Contentstack  │ │
│  │ (Anime Data) │    │  (Node.js)       │    │    CMS        │ │
│  └──────────────┘    └──────────────────┘    │               │ │
│                                               │ - Content     │ │
│                                               │   Types       │ │
│  ┌──────────────┐    ┌──────────────────┐    │ - Entries     │ │
│  │  Next.js 15  │◀───│  Delivery SDK    │◀───│ - Assets      │ │
│  │  Frontend    │    │  (Contentstack)  │    │ - Personalize │ │
│  │              │    └──────────────────┘    │ - Brand Kit   │ │
│  │ - App Router │                            └───────────────┘ │
│  │ - Tailwind   │                                               │
│  │ - SSR/SSG    │    ┌──────────────────┐                      │
│  │              │───▶│  Contentstack    │                      │
│  └──────────────┘    │  Launch (CDN)    │                      │
│                       └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer           | Technology                        |
|-----------------|-----------------------------------|
| CMS             | Contentstack (Headless CMS)       |
| Frontend        | Next.js 15 (App Router)           |
| Styling         | Tailwind CSS                      |
| Data Source      | JIKAN API (MyAnimeList)           |
| Hosting         | Contentstack Launch               |
| Personalization | Contentstack Personalize          |
| AI Chatbot      | Contentstack Brand Kit + Automations |
| Language        | JavaScript (ES Modules)           |

---

## Project Structure

This repository is a **single app**: Next.js frontend plus Contentstack import/setup scripts. Run all `npm` commands from the **repository root** (same folder as `package.json`).

**If your disk layout has a parent folder** (for example `contentstack-project/anime-website/`), always `cd` into the directory that **contains** `package.json` and `scripts/` before `npm install`, `npm run setup`, or `npm run dev`. There is no `package.json` at the parent level.

**Environment files:** Put **`.env`** and **`.env.local`** in that same folder (next to `package.json`). Import scripts use `dotenv/config`, which loads `.env` from the **current working directory** when you run `npm run ...` — not from `scripts/`. A `.env` file only inside `scripts/` will not be picked up unless you copy or symlink it to the project root.

The project uses **`"type": "module"`** in `package.json`. Config files **`next.config.js`**, **`postcss.config.js`**, and **`tailwind.config.js`** use ESM syntax (`export default`), not `module.exports`.

```
anime-website/   (repository root — same folder you `cd` into for all npm commands)
│
├── .env                          # Management API + import script env (create next to package.json)
├── .env.local                    # Delivery API + Next.js env (gitignored)
├── package.json                  # Next.js + Contentstack import npm scripts
├── README.md
├── scripts/                      # Contentstack CMS / import scripts
│   ├── csClient.js               # Axios client for Management API
│   ├── setup.js                  # Master setup (orchestrates all steps)
│   ├── bootstrap.js              # Creates content types + environment
│   ├── index.js                  # Imports anime + genres + episodes from JIKAN
│   ├── anime.js                  # Anime entry helper
│   ├── genres.js                 # Genre creation helper
│   ├── episodes.js               # Episode creation helper
│   ├── manga.js                  # Imports manga from JIKAN
│   ├── uploadAssets.js           # Anime posters → Contentstack CDN
│   ├── uploadMangaAssets.js      # Manga covers → Contentstack CDN
│   ├── dailyUpdate.js            # Daily update entry from JIKAN
│   ├── publishEntries.js         # Publishes all entry types to the target environment
│   └── setupHomepage.js          # Audience tags + homepage entry
├── next.config.js                # Next config (ESM; `export default`)
├── app/
│   ├── layout.js                 # Root layout (providers, navbar, footer, chatbot)
│   ├── page.js                   # Homepage
│   ├── loading.js                # Loading state
│   ├── not-found.js              # 404 page
│   ├── anime/
│   │   ├── page.js               # Anime listing
│   │   └── [slug]/page.js        # Anime detail
│   ├── manga/
│   │   ├── page.js               # Manga listing (shop)
│   │   └── [slug]/page.js        # Manga detail
│   ├── genres/
│   │   ├── page.js               # Genre listing
│   │   └── [slug]/page.js        # Genre detail (anime by genre)
│   ├── cart/page.js              # Shopping cart
│   ├── checkout/
│   │   ├── page.js               # Checkout form
│   │   └── success/page.js       # Order success
│   └── api/
│       ├── chat/route.js         # AniBot chatbot API (Brand Kit)
│       ├── create-order/route.js # Order creation API
│       └── debug-sdk/route.js    # SDK debug endpoint
├── components/
│   ├── AnimeCard.jsx             # Anime card component
│   ├── MangaCard.jsx             # Manga card component
│   ├── ChatBot.jsx               # AniBot floating chatbot
│   ├── EpisodeCard.jsx           # Episode card
│   ├── GenreBadge.jsx            # Genre badge/tag
│   ├── HeroSection.jsx           # Hero banner
│   ├── Navbar.jsx                # Navigation bar
│   ├── Footer.jsx                # Footer
│   ├── ProfileSwitcher.jsx       # Kids/Normal profile toggle
│   ├── PersonalizedHero.jsx    # Personalized hero section
│   ├── PersonalizedFeaturedAnime.jsx  # Personalized anime grid
│   ├── PersonalizedCTA.jsx       # Personalized call-to-action
│   ├── MangaAddToCart.jsx        # Add-to-cart button
│   ├── RecentlyUpdated.jsx       # Daily updates section
│   └── OptimizedImage.jsx        # Image optimization helper
├── context/
│   ├── CartContext.jsx           # Shopping cart state
│   ├── ProfileContext.jsx        # Kids/Normal profile state
│   └── PersonalizeContext.jsx    # Contentstack Personalize SDK
└── lib/
    ├── contentstack.js           # Contentstack Delivery SDK init
    ├── api.js                    # Data fetching functions
    ├── profileConfig.js          # Profile filtering logic
    ├── personalizedApi.js        # Personalized data fetching
    └── imageUtils.js             # Image URL helpers
```

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.x
- **npm** >= 9.x
- A **Contentstack** account ([sign up](https://www.contentstack.com/))
- A **GitHub** account (for Contentstack Launch deployment)

---

## Step-by-Step Setup Guide

### Step 1: Create a Contentstack Stack

1. Log in to [Contentstack](https://app.contentstack.com/)
2. Click **+ New Stack**
3. Enter a name (e.g., "AniVerse DXP")
4. Select your region:
   - **AWS North America** (recommended)
   - AWS Europe
   - Azure North America
5. Click **Create**
6. Note your **Stack API Key** from **Settings > Stack > API Credentials**

### Step 2: Generate API Tokens

In the Contentstack dashboard:

1. Go to **Settings > Tokens > Management Tokens**
2. Click **+ Add Token**
   - Name: `AniVerse Setup`
   - Description: `Full access for setup scripts`
   - Scope: **All Content Types** (Read + Write)
   - Branch: `main`
3. Click **Generate** and copy the **Management Token**

> **For non-production stacks** (e.g., dev11, dev22): You also need an **Auth Token**. Get it from your browser session cookies (`authtoken`) after logging in.

### Step 3: Configure `.env` (Management API)

Create/edit the `.env` file in the **repository root** (next to `package.json`):

```env
# ── Contentstack Management API ──
CONTENTSTACK_API_KEY=<your_stack_api_key>
CONTENTSTACK_MANAGEMENT_TOKEN=<your_management_token>
CONTENTSTACK_ENVIRONMENT=development
DRY_RUN=false

# ── For AWS NA (Production) ──
CONTENTSTACK_BASE_URL=https://api.contentstack.io/v3

# ── For Non-prod stacks (e.g., dev11, dev22) ──
# CONTENTSTACK_BASE_URL=https://dev11-app.csnonprod.com/api/v3
# CONTENTSTACK_AUTHTOKEN=<your_authtoken>

# ── Brand Kit Configuration (Optional - for AniBot chatbot) ──
# CONTENTSTACK_AUTHTOKEN=<your_authtoken>
# CONTENTSTACK_BRAND_KIT_UID=<your_brand_kit_uid>
# CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID=<your_voice_profile_uid>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `CONTENTSTACK_API_KEY` | Yes | Stack API Key |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Yes | Management Token for API writes |
| `CONTENTSTACK_BASE_URL` | No | Management API base URL. Default: `https://api.contentstack.io/v3` |
| `CONTENTSTACK_ENVIRONMENT` | No | Contentstack environment name for imports/publish. Default: `development` (must match your delivery token environment) |
| `CONTENTSTACK_AUTHTOKEN` | Non-prod only | Auth token for non-production stacks |
| `DRY_RUN` | No | Set to `true` to preview without writing. Default: `false` |

### Step 4: Install Dependencies

From the repository root:

```bash
npm install
```

### Step 5: Run the Master Setup Script

This single command runs all import steps in the correct order:

```bash
npm run setup
```

**What `npm run setup` does (8 steps):**

| # | Script | What it does |
|---|--------|-------------|
| 1 | `scripts/bootstrap.js` | Creates the environment + 7 content types (genre, anime, manga, episode, daily_update, homepage, order) |
| 2 | `scripts/index.js` | Fetches top 25 anime from JIKAN API, creates genre + anime + episode entries |
| 3 | `scripts/manga.js` | Fetches top 25 manga from JIKAN API, creates manga entries |
| 4 | `scripts/uploadAssets.js` | Downloads anime poster images and uploads them to Contentstack CDN |
| 5 | `scripts/uploadMangaAssets.js` | Downloads manga cover images and uploads them to Contentstack CDN |
| 6 | `scripts/dailyUpdate.js` | Creates today's daily update entry with recent episodes |
| 7 | `scripts/publishEntries.js` | **Publishes ALL entries** (genre, anime, manga, episode, daily_update, homepage) to the configured environment |
| 8 | `scripts/setupHomepage.js` | Tags anime with audience tags (kids/normal/all), creates homepage entry, publishes it |

> **Estimated time:** 3-5 minutes (depends on network speed and API rate limits)

After completion, verify in the Contentstack dashboard:
- **Content Types:** 7 types created (genre, anime, manga, episode, daily_update, homepage, order)
- **Entries:** ~25 anime, ~25 manga, ~9 genres, ~125 episodes, 1 daily_update, 1 homepage
- **Assets:** ~50 images (anime posters + manga covers)
- **Published:** All entries published to your environment

### Step 6: Create a Delivery Token (Manual)

This step **must be done in the Contentstack UI** -- it cannot be automated via the Management API.

1. Go to **Settings > Tokens > Delivery Tokens**
2. Click **+ Add Token**
   - Name: `AniVerse Frontend`
   - Description: `Read-only token for the Next.js frontend`
   - Environment: Select your environment (e.g., `development` or `production`)
   - Branch: `main`
3. Click **Generate**
4. Copy the **Delivery Token**

### Step 7: Configure Frontend Environment Variables (`.env.local`)

Create/edit `.env.local` in the **repository root** (Next.js loads it automatically):

```env
# ── Contentstack Delivery API ──
CONTENTSTACK_API_KEY=<your_stack_api_key>
CONTENTSTACK_DELIVERY_TOKEN=<your_delivery_token_from_step_6>
CONTENTSTACK_ENVIRONMENT=development

# ── CDN Host ──
# AWS NA:
CONTENTSTACK_HOST=cdn.contentstack.io
# AWS EU:
# CONTENTSTACK_HOST=eu-cdn.contentstack.com
# Azure NA:
# CONTENTSTACK_HOST=azure-na-cdn.contentstack.com
# Non-prod (e.g., dev11):
# CONTENTSTACK_HOST=dev11-cdn.csnonprod.com

# ── Management API (for Order creation) ──
CONTENTSTACK_MANAGEMENT_TOKEN=<your_management_token>
CONTENTSTACK_API_HOST=api.contentstack.io
# Non-prod:
# CONTENTSTACK_API_HOST=dev11-app.csnonprod.com/api

# ── Personalize (Optional) ──
# NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID=<your_personalize_project_uid>
# NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL=https://personalize-edge.contentstack.com

# ── AniBot Chatbot (Optional) ──
# CONTENTSTACK_AUTOMATION_URL=<your_automation_webhook_url>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `CONTENTSTACK_API_KEY` | Yes | Same Stack API Key as `.env` |
| `CONTENTSTACK_DELIVERY_TOKEN` | Yes | Delivery Token created in Step 6 |
| `CONTENTSTACK_ENVIRONMENT` | Yes | Must match the Delivery Token's environment |
| `CONTENTSTACK_HOST` | Yes | CDN hostname for the Delivery API |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Yes | For order creation API route |
| `CONTENTSTACK_API_HOST` | Yes | Management API hostname (without protocol) |
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID` | No | Personalize project UID (Step 9) |
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL` | No | Personalize Edge API URL (Step 9) |
| `CONTENTSTACK_AUTOMATION_URL` | No | Brand Kit Automation webhook URL (Step 10) |

### Step 8: Run the Frontend Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and verify:

- [ ] Homepage loads with hero banner, featured anime grid, and genre badges
- [ ] `/anime` page shows anime list with poster images and genre tags
- [ ] `/manga` page shows manga list with cover images and prices
- [ ] `/genres` page shows genre badges
- [ ] Clicking an anime/manga card navigates to its detail page
- [ ] `/anime/[slug]` shows anime details with episodes
- [ ] Profile switcher (Kids/Normal) works and filters content
- [ ] Cart + checkout flow works (adding manga, checking out, order created)

### Step 9: Set Up Contentstack Personalize (Optional)

Personalize enables server-side content variants (e.g., different homepage for Kids vs Normal users). The profile switching works client-side without Personalize, but for full DXP functionality:

**Partial automation (API):** Run `npm run setup-personalize` (also invoked from `npm run setup`). Put **`CONTENTSTACK_ACCOUNT_EMAIL`** and **`CONTENTSTACK_ACCOUNT_PASSWORD`** in `.env.local` so the script can obtain an **authtoken** automatically (or set **`CONTENTSTACK_AUTHTOKEN`** yourself). **Project UID:** set **`NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID`** if known; otherwise the script tries to discover it from the user/stack APIs. The script then provisions **`profile_type`**, **Kids** / **Normal** audiences, and experience **AniVerse Homepage profiles** via the [Personalize Management API](https://www.contentstack.com/docs/developers/apis/personalize-management-api/). Optional: **`CONTENTSTACK_USER_SESSION_BASE`** (login API root), **`CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL`**. **SSO-only users** cannot use password login for an authtoken; use a service account with Contentstack credentials or a pre-generated **`CONTENTSTACK_AUTHTOKEN`**.

1. **Create a Personalize Project:**
   - Go to **Personalize** in the left sidebar
   - Click **+ New Project**
   - Name: `AniVerse`
   - Connect to your stack

2. **Add a Custom Attribute:**
   - Go to **Audiences > Attributes**
   - Click **+ Add Attribute**
   - Key: `profile_type`
   - Type: `String`

3. **Create Audiences:**
   - **Kids Audience:**
     - Name: `Kids`
     - Condition: `profile_type` equals `kids`
   - **Normal Audience:**
     - Name: `Normal`
     - Condition: `profile_type` equals `normal`

4. **Create an Experience:**
   - Go to **Experiences > + New Experience**
   - Name: `Homepage Personalization`
   - Content Type: `homepage`
   - Add variations (variant names should align with the app: **`kids`** / **`normal`**):
     - **`kids`** variation → **Kids** audience (`profile_type` = `kids`)
     - **`normal`** variation → **Normal** audience (`profile_type` = `normal`)

5. **Create the Kids Variant in the Entry:**
   - Go to **Content > Homepage > AniVerse Homepage**
   - Switch to the **Kids** variant (variant selector at top)
   - Update the fields with kid-friendly content (the `setupHomepage.js` script logs the exact content to use)

6. **Get the Project UID:**
   - Go to **Personalize > Your Project > Settings > General**
   - Copy the **Project UID**

7. **Update environment variables:**
   ```env
   NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID=<your_project_uid>
   NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL=https://personalize-edge.contentstack.com
   ```

### Step 10: Set Up Brand Kit + AniBot Chatbot (Optional)

The AniBot chatbot uses Contentstack Brand Kit for AI-powered anime/manga Q&A.

**Partial automation (API):** Run **`npm run setup-brand-kit`** (also from **`npm run setup`**). Provide **`CONTENTSTACK_API_KEY`** plus the same **account login** as Personalize (**`CONTENTSTACK_ACCOUNT_EMAIL`** / **`CONTENTSTACK_ACCOUNT_PASSWORD`**) or **`CONTENTSTACK_AUTHTOKEN`**. **`CONTENTSTACK_ORGANIZATION_UID`** is optional — the script tries to resolve it from the user session API. Output includes **`CONTENTSTACK_BRAND_KIT_UID`** and **`CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID`**. Optional: **`CONTENTSTACK_BRAND_KIT_API_URL`**. **Automations** (webhook for **`CONTENTSTACK_AUTOMATION_URL`**) still use the Automations UI unless you add a separate Automate API integration.

1. **Create a Brand Kit:**
   - Go to **Brand Kit** in the left sidebar
   - Click **+ New Brand Kit**
   - Name: `AniVerse Brand Kit`

2. **Create a Voice Profile:**
   - Inside the Brand Kit, go to **Voice Profiles**
   - Click **+ Add Voice Profile**
   - Name: `AniBot`
   - Personality: `You are AniBot, an enthusiastic anime and manga expert. You ONLY answer questions about anime and manga. If asked about anything else, politely redirect to anime/manga topics. Use a friendly, knowledgeable tone.`
   - Tone: Friendly, enthusiastic
   - Knowledge: Anime, manga, Japanese animation

3. **Create an Automation:**
   - Go to **Automations** in the left sidebar
   - Click **+ New Automation**
   - Trigger: **Webhook** (this gives you a webhook URL)
   - Action: **Generate AI Content** using Brand Kit
     - Select your Brand Kit and Voice Profile
   - Activate the automation

4. **Update environment variable:**
   ```env
   CONTENTSTACK_AUTOMATION_URL=<your_automation_webhook_url>
   ```

### Step 11: Deploy to Contentstack Launch

1. **Push Code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "AniVerse DXP initial commit"
   git remote add origin <your_github_repo_url>
   git push -u origin main
   ```

2. **Create a Launch Project:**
   - Go to **Contentstack Launch** in the left sidebar
   - Click **+ New Project**
   - Choose **Import from GitHub** (or upload ZIP)
   - Connect your GitHub repository
   - **Framework:** Next.js
   - **Build command:** `npm run build`
   - **Output directory:** `.next`
   - **Root directory:** `.` if the connected Git repository’s root is this app (the folder with `package.json`). If the repo root is a **parent** folder that only contains `anime-website/` as a subfolder, set root directory to **`anime-website`** so Launch runs install/build inside the Next.js app.

3. **Set Environment Variables in Launch:**

   See the [Contentstack Launch Environment Variables](#contentstack-launch-environment-variables) section below for the complete list.

4. **Deploy!**
   - Click **Deploy**
   - Wait for the build to complete (~2-3 minutes)
   - Your site is live at `https://<project-name>.contentstackapps.com`

> **Tip:** Contentstack Launch auto-injects some environment variables like `CONTENTSTACK_CDN`. The frontend code handles the mapping from Launch's `cdn.contentstack.com` to the correct `cdn.contentstack.io` automatically.

---

## Content Types Reference

| Content Type | UID | Fields | Description |
|-------------|-----|--------|-------------|
| **Genre** | `genre` | title, slug | Anime genre categories (Action, Comedy, etc.) |
| **Anime** | `anime` | title, slug, description, rating, release_year, status, poster_url, mal_id, genres (ref), audience_tag | Anime entries with genre references |
| **Manga** | `manga` | title, slug, synopsis, cover_image, price, author, volumes, status, mal_id | Manga entries with shop prices |
| **Episode** | `episode` | title, slug, episode_number, synopsis, air_date, mal_id, anime_mal_id, anime_reference (ref) | Episode entries linked to anime |
| **Daily Update** | `daily_update` | title, date, episodes (JSON) | Daily feed of recently updated episodes |
| **Homepage** | `homepage` | title, hero fields, featured_anime (ref), CTA fields, theme_gradient, url | Singleton homepage entry (supports Personalize variants) |
| **Order** | `order` | title, order_id, customer_name, customer_email, items (JSON), total, status | Checkout orders (created at runtime) |

---

## Scripts Reference

Run these from the **repository root** (same directory as `package.json`).

| Command | Runs | Description |
|---------|------|-------------|
| `npm run dev` | Next.js | Local development server |
| `npm run build` | Next.js | Production build |
| `npm start` | Next.js | Production server (`next start`) after `npm run build` |
| `npm run setup` | `scripts/setup.js` | **Master script** — runs all Contentstack setup steps in order |
| `npm run bootstrap` | `scripts/bootstrap.js` | Creates content types + environment |
| `npm run import-anime` | `scripts/index.js` | Imports anime + genres + episodes from JIKAN |
| `npm run import-manga` | `scripts/manga.js` | Imports manga from JIKAN |
| `npm run upload-assets` | `scripts/uploadAssets.js` | Uploads anime posters to Contentstack CDN |
| `npm run upload-assets:dry` | `scripts/uploadAssets.js` | Preview asset uploads (no writes) |
| `npm run upload-manga-assets` | `scripts/uploadMangaAssets.js` | Uploads manga covers to Contentstack CDN |
| `npm run upload-manga-assets:dry` | `scripts/uploadMangaAssets.js` | Preview manga asset uploads (no writes) |
| `npm run daily-update` | `scripts/dailyUpdate.js` | Creates/updates today's daily update |
| `npm run publish` | `scripts/publishEntries.js` | Publishes ALL entries to the configured environment |
| `npm run setup-homepage` | `scripts/setupHomepage.js` | Tags anime with audience, creates homepage, publishes |
| `npm run setup-personalize` | `scripts/setupPersonalize.js` | Optional — Personalize API: attribute, audiences, segmented experience (needs project UID + authtoken) |
| `npm run setup-brand-kit` | `scripts/setupBrandKit.js` | Optional — Brand Kit API: brand kit + AniBot voice profile (needs org UID + authtoken + stack API key) |

---

## Environment Variables Reference

### `.env` (Import scripts — Management API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENTSTACK_API_KEY` | Yes | - | Stack API Key |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Yes | - | Management Token |
| `CONTENTSTACK_BASE_URL` | No | `https://api.contentstack.io/v3` | Management API base URL |
| `CONTENTSTACK_ENVIRONMENT` | No | `development` | Target environment for publishing (same variable as Next.js delivery) |
| `CONTENTSTACK_AUTHTOKEN` | Non-prod | - | Auth token (required for non-prod stacks) |
| `DRY_RUN` | No | `false` | Preview mode (no writes) |
| `CONTENTSTACK_ASSET_FOLDER_UID` | No | - | Asset folder UID for organized uploads |
| `CONTENTSTACK_BRAND_KIT_UID` | No | - | Brand Kit UID |
| `CONTENTSTACK_ANIBOT_VOICE_PROFILE_UID` | No | - | AniBot voice profile UID |
| `CONTENTSTACK_ORGANIZATION_UID` | No | - | Organization UID (for `npm run setup-brand-kit`) |
| `CONTENTSTACK_PERSONALIZE_MANAGEMENT_URL` | No | `https://personalize-api.contentstack.com` | Personalize Management API base (use EU/other host from docs if needed) |
| `CONTENTSTACK_BRAND_KIT_API_URL` | No | `https://brand-kits-api.contentstack.com` | Brand Kit API base for your region |

### `.env.local` (Next.js — Delivery API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONTENTSTACK_API_KEY` | Yes | - | Stack API Key |
| `CONTENTSTACK_DELIVERY_TOKEN` | Yes | - | Delivery Token |
| `CONTENTSTACK_ENVIRONMENT` | Yes | `production` | Environment the Delivery Token is scoped to |
| `CONTENTSTACK_HOST` | Yes | `cdn.contentstack.io` | CDN hostname for Delivery API |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Yes | - | For order creation API |
| `CONTENTSTACK_API_HOST` | Yes | `api.contentstack.io` | Management API host (for orders) |
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID` | No | - | Personalize project UID |
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL` | No | `https://personalize-edge.contentstack.com` | Personalize Edge API |
| `CONTENTSTACK_AUTOMATION_URL` | No | - | Automation webhook URL for AniBot |
| `CONTENTSTACK_ACCOUNT_EMAIL` | No* | - | Contentstack login email (for automatic authtoken; used by `setup-personalize` / `setup-brand-kit`) |
| `CONTENTSTACK_ACCOUNT_PASSWORD` | No* | - | Contentstack login password (same) |
| `CONTENTSTACK_USER_SESSION_BASE` | No | (derived) | Override for CMA user-session API root, e.g. `https://dev22-app.csnonprod.com/api/v3` |
| `CONTENTSTACK_ACCOUNT_TFA_TOKEN` | No | - | One-time MFA code if your account has MFA enabled |

\*Required for fully automated Personalize/Brand Kit steps unless you set **`CONTENTSTACK_AUTHTOKEN`** instead.

---

## Contentstack Launch Environment Variables

When deploying to Contentstack Launch, set these environment variables:

### Required

| Variable | Example Value | Notes |
|----------|--------------|-------|
| `CONTENTSTACK_API_KEY` | `blt28b439555c176039` | Your stack's API key |
| `CONTENTSTACK_DELIVERY_TOKEN` | `cs60d1d867a0686c05...` | Delivery token for your environment |
| `CONTENTSTACK_ENVIRONMENT` | `development` | Must match the delivery token's environment |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | `cs6ce9f1f9a1513858...` | For order creation API route |
| `CONTENTSTACK_API_HOST` | `api.contentstack.io` | Management API host (no protocol) |

> **Note:** Launch auto-injects `CONTENTSTACK_CDN` (e.g., `cdn.contentstack.com/v3`). The frontend code automatically maps this to the correct CDN host (`cdn.contentstack.io` for AWS NA). You do **not** need to set `CONTENTSTACK_HOST` on Launch unless you're using a non-prod stack.

### Optional (for non-prod stacks)

| Variable | Example Value | Notes |
|----------|--------------|-------|
| `CONTENTSTACK_HOST` | `dev11-cdn.csnonprod.com` | Override CDN host for non-prod |

### Optional (Personalize)

| Variable | Example Value |
|----------|--------------|
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID` | `697b0cc847961c8ac9e5efb3` |
| `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL` | `https://personalize-edge.contentstack.com` |

### Optional (AniBot Chatbot)

| Variable | Example Value |
|----------|--------------|
| `CONTENTSTACK_AUTOMATION_URL` | `https://app.contentstack.com/automations-api/run/...` |

---

## Troubleshooting

### Setup / Import Issues

**`Missing CONTENTSTACK_API_KEY` / variables undefined when running `npm run setup`**
- Ensure **`.env`** is in the **project root** (next to `package.json`), not only under `scripts/`. Then run commands from that directory: `cd /path/to/anime-website && npm run setup`.

**"We can't find that Stack" / "api_key is not valid"**
- Verify `CONTENTSTACK_API_KEY` and `CONTENTSTACK_MANAGEMENT_TOKEN` in `.env`
- For non-prod stacks, ensure `CONTENTSTACK_BASE_URL` points to the correct API (e.g., `https://dev11-app.csnonprod.com/api/v3`)

**"You're not allowed in here unless you're logged in" (401)**
- Non-prod stacks require an `authtoken`. Add `CONTENTSTACK_AUTHTOKEN` to `.env`
- Auth tokens expire periodically -- refresh from your browser session

**"Display type is required" for audience_tag**
- The bootstrap script (`scripts/bootstrap.js`) includes `display_type: "dropdown"` for the audience_tag field. Re-run `npm run bootstrap` to update.

### Frontend Issues

**Anime/manga lists are empty on localhost**
- Verify `CONTENTSTACK_DELIVERY_TOKEN` and `CONTENTSTACK_HOST` in `.env.local`
- Ensure entries are **published** to the correct environment: `npm run publish`
- Clear the Next.js cache: `rm -rf .next/cache`

**Anime/manga lists are empty on Contentstack Launch**
- Check the debug endpoint: `https://<your-site>.contentstackapps.com/api/debug-sdk`
- Ensure `CONTENTSTACK_API_KEY` and `CONTENTSTACK_DELIVERY_TOKEN` are set in Launch
- The frontend code auto-maps Launch's `CONTENTSTACK_CDN` to the correct CDN host

**Genre tags not showing**
- Genres must be **published** to the environment. Run `npm run publish` (publishes all content types including genres)
- Verify genres are published: Contentstack Dashboard > Content > Genre > check publish status

**Images not loading**
- Check that `next.config.js` includes the image host in `remotePatterns`
- For Contentstack CDN images, `images.contentstack.io`, `assets.contentstack.io`, and `*.csnonprod.com` are all configured

**"Application error: a client-side exception has occurred"**
- Usually caused by Personalize SDK failing. Check the browser console for details
- If `NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID` is set but invalid, the SDK throws an error. Either fix the UID or remove the env var
- The app is designed to degrade gracefully when Personalize fails

**Order creation fails on Launch**
- Verify `CONTENTSTACK_MANAGEMENT_TOKEN` and `CONTENTSTACK_API_HOST` are set on Launch
- `CONTENTSTACK_API_HOST` should be `api.contentstack.io` for AWS NA (not a full URL, just the hostname)

### AniBot Chatbot

**Chatbot returns fallback responses**
- Verify `CONTENTSTACK_AUTOMATION_URL` is set in `.env.local` (or Launch env vars)
- The Automation must be **active** in Contentstack
- Check the terminal/server logs for "Automation API error" messages

---

## Manual Setup Checklist

Summary of steps that **cannot be automated** and must be done in the Contentstack UI:

- [ ] Create a Contentstack Stack (Step 1)
- [ ] Generate a Management Token (Step 2)
- [ ] Create a Delivery Token for your environment (Step 6)
- [ ] *(Optional)* Set up Personalize: create project, add `profile_type` attribute, create audiences, create experience, apply Kids variant content (Step 9)
- [ ] *(Optional)* Set up Brand Kit: create brand kit, create AniBot voice profile (Step 10)
- [ ] *(Optional)* Set up Automation: create webhook automation for chatbot (Step 10)
- [ ] *(Optional)* Deploy to Contentstack Launch: connect repo, set env vars (Step 11)

---

## Quick Start (TL;DR)

```bash
# 1. Clone the repo, then cd into the folder that contains package.json
#    (often the repo root; if nested, e.g. cd anime-website)

# 2. Create .env here with Stack API Key + Management Token (NOT only in scripts/)

# 3. Install dependencies
npm install

# 4. Run the master setup (creates content types, imports JIKAN data, uploads assets, publishes)
npm run setup

# 5. Create a Delivery Token in Contentstack UI (Step 6)

# 6. Create .env.local with Delivery Token + CONTENTSTACK_HOST (+ other vars from Step 7)

# 7. Run the frontend
npm run dev

# 8. Open http://localhost:3000
```

Full detail, optional Personalize/Brand Kit/Launch steps, and troubleshooting are in the sections above.
