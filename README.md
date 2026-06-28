# SafeCircle

SafeCircle is an AI-powered community safety platform for reporting missing people, missing items, stolen vehicles, and local safety concerns.

## Features

- Community reports with photos, locations, and status tracking
- Real-time report feed and map views
- AI assistant for safety insights and report summaries
- Sighting submissions to help neighbors provide updates
- Profile and report management for registered users

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the app.

## Environment

Create a `.env.local` file with Supabase credentials when connecting to a live backend:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without Supabase credentials, the app falls back to demo reports so the interface can still be previewed locally.
