# SkillMatch — Frontend

React 18 + Vite single-page app for the SkillMatch job-matching platform.
JavaScript (JSX) with Tailwind CSS and shadcn/ui-style components.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on **http://localhost:3002** (strict port) |
| `npm run build` | Production build to `../dist/apps/web` |
| `npm run start` | Serve the production build with `vite preview` on port 3000 |
| `npm run lint` | ESLint (flat config), errors only |
| `npm run lint:warn` | ESLint including warnings |

## Configuration

`frontend/.env`:

```
VITE_API_SERVER_URL=http://127.0.0.1:3001
```

All API calls go through `src/lib/apiServerClient.js`, a small `fetch` wrapper.
There is no axios.

## Structure

```
src/
  components/      shared components (Header, Footer, modals, JobCard, ...)
  components/ui/   presentational primitives (shadcn-style)
  contexts/        AuthContext (auth state + token persistence)
  lib/             apiServerClient.js, utils.js (cn helper)
  pages/           routed pages, plus pages/admin and pages/employer
```

Routes are declared in `src/App.jsx`. Admin and employer areas are guarded by
`ProtectedRoute` with role checks.

## Notes

- The dev server port (3002) must match `CORS_ORIGIN` in `backend/.env`.
- `CareerPathPage` currently renders illustrative sample data, not
  personalised results — it is labelled as a demo in the UI.
- TypeScript is not used for application code. The `tsconfig*.json` files exist
  to cover `vite.config.ts` and to provide editor IntelliSense for JSX.
