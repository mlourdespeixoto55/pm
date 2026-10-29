# Project Plan

## Decisions

- Single Docker image: multi-stage build (Node builds the static Next.js export, Python + uv image runs FastAPI). FastAPI serves the API under `/api` and the static site at `/`.
- Port 8000. E2E tests (Playwright) run against the running Docker container.
- Sign in is frontend-only ("user" / "password"), kept in `localStorage`. The backend trusts the username sent by the frontend (MVP only).
- Database: SQLite with tables `users` and `boards`; each board is stored as a JSON column matching the frontend `BoardData` shape.
- AI can create, edit and move cards only. It cannot delete cards or rename/add/remove columns.
- Chat history lives only in the browser (lost on reload) and is sent to the backend with each message.
- Code, docs and UI in English.

## Part 1: Plan

- [x] Enrich this document with substeps, tests and success criteria
- [x] Create `frontend/AGENTS.md` describing the existing code
- [x] User reviews and approves the plan

Success criteria:
- Every part has a checklist, tests and success criteria
- `frontend/AGENTS.md` accurately describes the existing code
- User has approved the plan

## Part 2: Scaffolding

- [x] Update `.gitignore` (`frontend/test-results/`, `frontend/out/`, `node_modules/`, `*.db`) and untrack `frontend/test-results`
- [x] `backend/`: uv project (`pyproject.toml`, `uv.lock`), FastAPI app in `backend/app/main.py`
- [x] `GET /api/health` returns `{"status": "ok"}`
- [x] Serve a placeholder `static/index.html` at `/` that calls `/api/health` and shows the result
- [x] `Dockerfile` (Python + uv, runs uvicorn on 8000) and `.dockerignore`
- [x] `scripts/start.sh`, `scripts/stop.sh` (Mac/Linux), `scripts/start.ps1`, `scripts/stop.ps1` (PC): build and run / stop and remove the container; pass `.env` if present
- [x] pytest test for `/api/health`
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md`

Tests: `uv run pytest` in `backend/`.

Success criteria:
- `uv run pytest` passes
- `docker build` completes without errors
- After `scripts/start`, http://localhost:8000 shows the hello page and the page displays the `/api/health` response
- `curl http://localhost:8000/api/health` returns `{"status":"ok"}`
- `scripts/stop` stops and removes the container; running `start` again works
- Start works without a `.env` file
- `git status` no longer shows `frontend/test-results`

## Part 3: Add in Frontend

- [x] Set `output: "export"` in `next.config.ts`
- [x] Dockerfile: add Node build stage, copy `frontend/out` into the image; FastAPI serves it at `/` (remove placeholder)
- [x] Add card editing (title and details) in the UI, with `updateCard` logic
- [x] Unit tests for card editing; keep existing tests passing
- [x] Point Playwright `baseURL` to http://localhost:8000 (no dev web server); add e2e test for editing
- [x] Update `frontend/AGENTS.md`

Tests: `npm run test:unit`, `npm run test:e2e` against the container.

Success criteria:
- `npm run build` produces `frontend/out` with no errors; `npm run lint` passes
- http://localhost:8000 shows the Kanban board with 5 columns and the demo cards, served by FastAPI
- Static assets (JS, CSS, fonts) load with no 404s in the browser console
- A card's title and details can be edited and saved; empty title is not accepted; edit can be cancelled
- Adding, deleting, moving cards and renaming columns still work
- All unit and e2e tests pass

## Part 4: Fake user sign in

- [x] Login screen shown at `/` when not signed in; accepts only "user" / "password", shows an error otherwise
- [x] Signed-in state stored in `localStorage`; board shown when signed in
- [x] Logout button returns to the login screen
- [x] Unit tests: valid login, invalid login, logout
- [x] E2E tests: login flow, wrong credentials, logout, existing tests log in first

Tests: `npm run test:unit`, `npm run test:e2e` against the container.

Success criteria:
- Opening `/` in a fresh browser shows the login screen, not the board
- "user" / "password" shows the board; any other credentials show an error and keep the login screen
- Reloading the page while signed in keeps the user signed in
- Logout shows the login screen and reloading keeps the user signed out
- Login screen follows the color scheme (purple submit button, navy heading)
- All unit and e2e tests pass

## Part 5: Database modeling

- [x] Write `docs/DATABASE.md`: tables `users (id, username unique, created_at)` and `boards (id, user_id unique FK, data JSON, updated_at)`, example board JSON, creation-on-startup approach
- [x] User reviews and signs off

Success criteria:
- `docs/DATABASE.md` contains the table definitions, an example board JSON matching `BoardData`, and how the DB is created
- Schema supports multiple users with one board each
- User has signed off

## Part 6: Backend

- [x] SQLite via the standard `sqlite3` module; DB file path from env (default `data/pm.db`), created with tables on startup if missing
- [x] Pydantic models for `BoardData`
- [x] `GET /api/users/{username}/board`: returns the board; creates user and default board if missing
- [x] `PUT /api/users/{username}/board`: validates and saves the full board
- [x] Mount a Docker volume for the DB file so data persists across restarts
- [x] pytest tests (temp DB): DB creation, default board, save and reload, validation errors, separate boards per user

Tests: `uv run pytest` in `backend/`.

Success criteria:
- Starting with no DB file creates it with both tables
- `GET` for a new user returns the default board (same content as the current `initialData`)
- `PUT` then `GET` returns exactly the saved board
- Invalid board payloads return 422 and do not change stored data
- Two users have independent boards
- Data survives `scripts/stop` + `scripts/start`
- All backend tests pass

## Part 7: Frontend + Backend

- [x] Frontend loads the board from the API on login and saves it with `PUT` after each change
- [x] Loading state while fetching; show a simple error message if a request fails
- [x] Unit tests with mocked `fetch`
- [x] E2E tests: changes persist after reload and after container restart

Tests: `npm run test:unit`, `npm run test:e2e`, `uv run pytest`.

Success criteria:
- Every change (add, edit, delete, move card, rename column) is saved to the backend
- After reload, the board shows exactly the last state
- After container restart, the board shows exactly the last state
- A failed request shows an error message instead of failing silently
- `initialData` is no longer the source of truth in the frontend
- All unit, e2e and backend tests pass

## Part 8: AI connectivity

- [x] Backend OpenRouter client using the `openai` SDK (base URL `https://openrouter.ai/api/v1`, model `openai/gpt-oss-120b`, key `OPENROUTER_API_KEY`)
- [x] `POST /api/ai/test` sends "What is 2+2?" and returns the reply
- [x] pytest test with mocked client; integration test (skipped when no key) checks the reply contains "4"
- [x] Run the integration test with a real key

Tests: `uv run pytest` in `backend/`.

Success criteria:
- Mocked test passes without a key
- With a valid key in `.env`, `POST /api/ai/test` returns a reply containing "4"
- Without a key, the app still starts and the endpoint returns a clear error
- The key is never logged or returned in responses

## Part 9: AI with the board

- [x] `POST /api/users/{username}/chat` with `{message, history}`
- [x] Prompt includes the board JSON, history and the user message, and states the allowed operations
- [x] Structured Output schema: `{reply: string, operations: Operation[]}` where an operation is `create {column_id, title, details}`, `edit {card_id, title, details}` or `move {card_id, column_id, position}`
- [x] Backend validates and applies operations, saves the board, returns `{reply, board}`; invalid ids are rejected
- [x] pytest tests with mocked AI responses: reply only, each operation type, multiple operations, invalid ids

Tests: `uv run pytest` in `backend/`.

Success criteria:
- A reply with no operations leaves the board unchanged
- Each operation type changes the board correctly and the result is saved
- Multiple operations in one response are all applied in order
- Operations with unknown card or column ids are rejected and the board is unchanged
- No operation can delete a card or change columns
- With a real key, "add a card X to Backlog" creates the card and "move X to Done" moves it
- All backend tests pass

## Part 10: AI chat sidebar

- [x] Sidebar chat widget (toggleable) with message list, input and send button, styled with the color scheme
- [x] History kept in React state and sent with each message; loading indicator while waiting
- [x] When the response contains a board, the Kanban updates immediately
- [x] Unit tests with mocked API; e2e test with the AI call mocked via Playwright route interception

Tests: `npm run test:unit`, `npm run test:e2e`, `uv run pytest`.

Success criteria:
- Sidebar opens and closes without affecting the board
- User and AI messages appear in order; input clears after sending; empty messages are not sent
- Loading indicator shows while waiting and the send button is disabled
- Board changes from the AI appear without reloading the page
- The board is locked (`inert`) while waiting for the AI, so no edit can be overwritten by its reply
- An AI error shows a message in the chat and the board is unchanged
- Follow-up questions use previous messages (history is sent)
- All unit, e2e and backend tests pass
