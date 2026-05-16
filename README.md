# examly-web

React + Vite + TypeScript SPA for the Examly examiner-side console.

Backend lives in the sibling `../examly-api` repository (same workspace folder, separate git repo).

## Local development

Prerequisites: Node 22+, the Examly API running locally (default `http://localhost:5050`).

```bash
npm install
cp .env.example .env.local   # adjust VITE_API_BASE_URL if your API is elsewhere
npm run dev
```

Open `http://localhost:5173`. Use the dev-login form (issues a stub JWT via the API's `/api/v1/dev/issue-token`) to land on the dashboard.

## Stack

- Vite + React 19 + TypeScript.
- Ant Design (UI components).
- React Router v7 (routing).
- TanStack Query (server state).
- Axios with auth interceptor.
- React Hook Form + Zod (forms).
- KaTeX (LaTeX rendering, used by question editor in later phases).

## Build

```bash
npm run build
```

## Related

- Design spec: `~/.claude/plans/i-want-to-build-eager-octopus.md`.
- Implementation plan 1 (bootstrap + auth): in the API repo at `../examly-api/docs/superpowers/plans/2026-05-15-examly-bootstrap-and-auth.md`.
