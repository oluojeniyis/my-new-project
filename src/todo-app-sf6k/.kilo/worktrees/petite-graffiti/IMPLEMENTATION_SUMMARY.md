# Orbit implementation

Orbit is implemented in the project's Next.js App Router using a React client page and shared global stylesheet. The responsive dashboard supports adding, editing, completing, and deleting tasks; priority and due dates; All/Active/Completed filters; progress metrics; a locally generated next-step suggestion; and browser `localStorage` persistence for tasks and appearance.

Four appearance presets are available: Light, Dark, Neon, and Glass. First-run storage seeds three example tasks with mixed priorities and completion states. Dated tasks can open prefilled individual Google Calendar event links or be exported as `.ics`.

Sign-in/sign-up and Google Calendar, Calendly, and Microsoft Calendar controls are preview-only. No credentials are submitted, account is created, or provider connection/sync established. Live integrations require a secure backend and provider OAuth setup.

Run the app with `npm run dev` and visit [http://localhost:3000](http://localhost:3000). Run `npm run lint`, `npm run typecheck`, and `npm run build` for code checks. The VS Code/browser checklist is in [TESTING.md](TESTING.md); setup and roadmap are in [README.md](README.md).
