# Koi

> Study quietly, prove it softly.

Koi is a shared focus timer for study groups. Create a room, share its code, and quietly keep one another accountable through live sessions and a room activity feed.

## Features

- Create or join a study room with a short room code
- Start, pause, resume, finish, or discard focus sessions
- Choose a focus-duration goal
- Record distracted time and an optional note when ending a session
- See active members and recent completed sessions
- Edit your display name and visual preferences
- Store device preferences locally in the browser

## Tech stack

- React and TypeScript
- Vite and Tailwind CSS
- Hono and tRPC
- Drizzle ORM with MySQL

## Run locally

Requirements: a current Node.js LTS release and a MySQL database.

```bash
git clone <repository-url>
cd KoiPond/app
npm ci