# Agent guide

## Project overview

Orbit is a local-first task dashboard built with Next.js App Router, React, TypeScript, and Tailwind CSS 4. The main page and task interactions are in `src/app/page.tsx`; global styles are in `src/app/globals.css`.

## Development

- Use Node.js 20.9 or later and npm.
- Install dependencies with `npm install`.
- Start the development server with `npm run dev`, then open `http://localhost:3000`.
- The app does not require environment variables.

## Project conventions

- Preserve the existing Next.js App Router structure, TypeScript types, and CSS conventions.
- Keep task data and appearance local to the browser; task state is persisted in `localStorage`.
- Keep sticky canvas notes in their own `orbit.canvas.v1` localStorage record, separate from task storage. Preserve the local-midnight sweep and archive/restore behavior.
- Treat calendar snapshots and `orbit:calendar-change` as adapter hooks only; never imply a live provider connection without OAuth and a configured webhook integration.
- Seed the three sample tasks only when task storage has never been initialized. An intentionally empty saved task list must remain empty.
- Keep account and calendar integration controls clearly identified as previews unless real, secure integrations are implemented.
- Maintain accessible labels, keyboard operation, visible focus states, and responsive layouts when changing UI.
- Avoid introducing dependencies for functionality already supported by the existing stack.

## Validation

Before handing off code changes, run:

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:calendar
```

For user-facing behavior, also consult the manual browser checklist in `TESTING.md`.
