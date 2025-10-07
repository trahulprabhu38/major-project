# Major Project — Edu App

This repository contains a Go backend and a React frontend for an educational app, plus Docker Compose files to run everything locally (PostgreSQL, ScyllaDB, backend, and frontend).

## Contents

- `backend/` — Go backend service (API server). Uses PostgreSQL and ScyllaDB in the compose setup.
- `edu-frontend/` — React frontend (Vite).
- `docker-compose.yml` — Orchestrates ScyllaDB, PostgreSQL, the Go backend, and the React frontend.

## Quick start (recommended: Docker Compose)

1. Make sure Docker and Docker Compose are installed on your machine.
2. From the repository root, start the stack:

```bash
docker compose up --build
```

This will build the backend and frontend images and start the following services (defaults):

- PostgreSQL: port 5432
- ScyllaDB: ports 9042 (CQL) and 9180
- Backend (Go): port 8080
- Frontend (Vite): port 5173

Open the frontend at http://localhost:5173 and the backend API at http://localhost:8080.

Stop the stack with:

```bash
docker compose down
```

## Environment variables

When running with `docker-compose.yml` the compose file already sets sensible defaults. When running services manually you should set:

- `JWT_SECRET` — secret key for signing JWTs (e.g. `supersecretkey`).
- `SCYLLA_HOST` — hostname/address of ScyllaDB (e.g. `localhost` or `scylla` when using compose).
- `POSTGRES_DSN` — PostgreSQL DSN, e.g. `postgres://admin:password@localhost:5432/edu?sslmode=disable`.

If you run the backend outside Docker you can export these variables in your shell.

## Run backend locally (without Docker)

Prerequisites: Go 1.20+ (compatible with the `go.mod` in `backend/`) and a running Postgres/Scylla instance.

From the `backend/` directory:

```bash
cd backend
go run .
```

Or build a binary:

```bash
go build -o edu-backend .
./edu-backend
```

The server listens on port 8080 by default (see code for configurable options).

## Run frontend locally (without Docker)

From the `edu-frontend/` directory:

```bash
cd edu-frontend
# install deps (npm / pnpm / yarn depending on your setup)
npm install
npm run dev
```

Open http://localhost:5173

If the frontend needs to point to a different backend URL, update the appropriate environment configuration in the frontend code (see `edu-frontend/src` pages like `Login.jsx`, `Dashboard.jsx`).

## Project structure

- backend/
  - `main.go` — app entrypoint
  - `db/` — database connection helpers (`postgres.go`, `scylla.go`)
  - `handlers/` — request handlers (`auth.go`, `upload.go`)
  - `models/` — data models (`user.go`)
  - `utils/` — utilities (e.g. `jwt.go`)

- edu-frontend/
  - `src/` — React app source
  - `pages/` — `Login`, `Signup`, `Dashboard`

## Useful tips & troubleshooting

- If `docker compose up` fails because ports are already in use, stop the conflicting process or change the ports in `docker-compose.yml`.
- Ensure Postgres data directory permissions are correct if the DB container can't start.
- Scylla requires adequate system resources; in developer mode it runs with defaults suitable for local development. If you don't need Scylla, you can remove/comment its service in `docker-compose.yml` and remove references to it in the backend environment.
- To view backend logs:

```bash
docker compose logs -f backend
```

## Next steps / improvements

- Add endpoint documentation (OpenAPI / Swagger) or a small list of API routes and expected payloads.
- Add tests and a CI workflow that runs unit tests and linters for both backend and frontend.
- Provide environment-specific configuration files or a `.env.example` for local development.

## License

This repository does not include a license file. Add a LICENSE file to clarify reuse terms.

---

If you'd like, I can also add a `.env.example`, API endpoint docs, or a minimal CI workflow. Tell me which you'd prefer next.
# major-project
