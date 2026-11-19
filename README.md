# GhostText — Discord-Style Realtime Chat App

A Discord-inspired real-time chat web application built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**, featuring **Supabase** (Auth, Postgres RLS, Realtime), **Web Audio API** synthesized sound effects, and **IndexedDB (Dexie)** offline-first message outbox & caching.

---

## ⚡ Features Implemented

1. **Discord-Style Dark Theme**:
   - Exact color palette (`--bg: #313338`, `--side: #2b2d31`, `--rail: #1e1f22`, `--input: #383a40`, `--accent: #5865f2`, `--online: #23a559`, `--warn: #f0b232`, etc.).
   - Server icon rail on the far left with pill indicators and notifications badges.
   - Sub-sidebar with channel list, direct messages list, and bottom user panel.

2. **Supabase Authentication & Profiles**:
   - First-time user sign-up (username, email, password 6+ characters).
   - Automatic database trigger creating a unique profile with avatars.
   - Login / Logout support.

3. **Friends & Direct Messages**:
   - Add friends by username (case-insensitive search).
   - Realtime friend request notifications with incoming ping sound.
   - Accept or decline incoming requests with RLS security policies.
   - One-to-one real-time direct messaging with message grouping and timestamps.

4. **Groups & Member Invitations**:
   - Create groups/servers (creator automatically becomes `owner`).
   - **Direct Friend Invites**: Select any friend to send an instant invite with real-time notification.
   - **Shareable Invite Links**: Admins and owners can generate `/join/:code` links with 7-day expiry and 25-use limit.
   - Route `/join/:code` with invite preview; unauthenticated visitors have code stored in `sessionStorage` and automatically join upon registration or login.
   - Secure database functions (`join_group_with_code` and `accept_group_invite`) enforcing permissions and member limits.

5. **Web Audio API Sound Engine (Zero external audio files needed)**:
   - **Outgoing send sound**: Short rising whoosh (500 Hz to 900 Hz, ~0.16s), triggers instantly on send even while offline.
   - **Incoming ping sound**: Two-tone chime (880 Hz then 1320 Hz, ~0.35s).
   - Skipped when actively viewing the chat in an active tab.
   - Throttled to at most once per second for queued bursts.
   - Mute toggle in settings and on the rail, persisted in `localStorage`.
   - Automatic `AudioContext` unlocking on first user interaction.

6. **Offline-First Resilience**:
   - Instant message rendering from IndexedDB cache via **Dexie**.
   - Offline messages stored in local Dexie `outbox` with unique browser-generated `client_id`.
   - Visual status badges (`queued` in yellow, `sending`, `sent`, `failed`).
   - Automatic flushing when reconnected (`online` event listener) with deduplication.
   - PWA Service Worker caching static application shell.

---

## 🚀 Quick Start

### 1. Configure Supabase

1. Go to [Supabase](https://supabase.com) and create a new project.
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Copy and run the complete script in [`supabase/schema.sql`](supabase/schema.sql).
4. In **Project Settings -> API**, copy your **Project URL** and **anon public key**.

### 2. Configure Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🚢 Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. The `vercel.json` file is already preconfigured with the SPA rewrite rule:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
6. In **Supabase Dashboard -> Authentication -> URL Configuration**, add your Vercel deployment URL (e.g. `https://your-app.vercel.app`) to **Redirect URLs**.

