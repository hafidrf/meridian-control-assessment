# Meridian Control — Candidate Starter Kit

Internal operations platform for a fictional 3PL (third-party logistics) company. This repository is the **starter kit** for a timed coding test.

**Your assignment is in [task.md](./task.md).** Read it before writing any code.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Node.js 22+, Express, TypeScript, SQLite (`node:sqlite`) |
| Frontend | React 18, Vite, TypeScript, React Router |
| Auth | JWT (access + refresh stubs) |

Requires **Node.js 22+** (the API uses the built-in `node:sqlite` module).

```bash
npm install
npm run db:reset
npm run dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Health: `GET http://localhost:4000/api/health`

### Seed accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@meridian.test` | `Admin123!` |
| Dispatcher | `dispatcher@meridian.test` | `Dispatch123!` |
| Warehouse | `warehouse@meridian.test` | `Warehouse123!` |

## Layout

```
server/     HTTP API, SQLite, module-based services
frontend/   SPA shell, feature folders, API client
task.md     Coding test — read this
```

Follow the existing **module / feature folder** pattern. Do not flatten the project into a few giant files.

## Notes

- The starter **runs**, but many functions are stubs, contracts are inconsistent, and security/performance work is unfinished. That is intentional.
- You will not finish every item in `task.md`. Scope, structure, and judgment matter more than raw completion count.
