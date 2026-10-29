# Kanban Studio

Next.js frontend, built as a static export and served by the FastAPI backend in Docker.

## Run

From the project root:

```bash
scripts/start.sh     # Mac/Linux
scripts\start.ps1    # PC
```

Open http://localhost:8000 and sign in with `user` / `password`.

## Tests

```bash
npm install
npm run test:unit
npm run test:e2e   # needs the container running; uses a separate "e2e" user board
```
