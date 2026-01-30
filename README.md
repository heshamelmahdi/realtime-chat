# Realtime Chat (Self-Destructing Rooms)

A private, self-destructing chat app built with Next.js and Upstash. Users can create or join a room, chat in real time, and the room automatically expires based on a configurable TTL.

## Features

- Create or join rooms
- Custom room TTL (1-120 minutes)
- Real-time messaging
- Auto-destruction when TTL expires
- Max 2 users per room
- Editable username stored in localStorage

## Tech Stack

- Next.js (App Router) + TypeScript
- Elysia API routes
- Upstash Redis + Upstash Realtime
- TanStack React Query
- Tailwind CSS

## Requirements

- An Upstash Redis database (REST API enabled)
- An Upstash Realtime project

## Environment Variables

Create a `.env` file in the project root with:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Getting Started

Install dependencies and run the dev server:

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## Production

```bash
bun run build
bun run start
```

## Scripts

- `dev` - Start the development server
- `build` - Build for production
- `start` - Start the production server
- `lint` - Run ESLint
