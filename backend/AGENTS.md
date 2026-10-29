# Backend

Python FastAPI app managed with uv. Runs in Docker (see root `Dockerfile`) on port 8000.

## Structure

- `app/main.py` - FastAPI app; creates the DB on startup (lifespan); API routes under `/api`, static site from `static/` mounted at `/`
- `app/board.py` - Pydantic `Board` model with consistency validation (5 fixed columns, each card in exactly one column), `DEFAULT_BOARD`
- `app/ai.py` - OpenRouter via the `openai` SDK (model `openai/gpt-oss-120b`); `ask(prompt)`, `parse(messages, response_format)` (Structured Outputs via `chat.completions.parse`, routed only to providers that support it); raises `MissingApiKeyError` if `OPENROUTER_API_KEY` is unset and `EmptyResponseError` if no structured answer comes back; 60 s timeout
- `app/chat.py` - AI chat: system prompt with the board JSON, history and message; `AIResponse` schema (`reply` + `operations` of type create / edit / move); `apply_operations` applies them to a copy of the board and raises `InvalidOperationError` on unknown ids (nothing saved)
- `app/db.py` - SQLite via `sqlite3`: `init_db`, `get_board` (creates user and default board if missing), `save_board`. Path from env `DB_PATH` (default `data/pm.db`). Schema in `docs/DATABASE.md`
- `static/` - Next.js static build, copied in by the Dockerfile (gitignored, absent locally)
- `tests/` - pytest tests using FastAPI `TestClient`; `conftest.py` gives each test a temp DB
- `pyproject.toml`, `uv.lock` - dependencies (openai; dev group: pytest, httpx2)

## Routes

- `GET /api/health` - `{"status": "ok"}`
- `GET /api/users/{username}/board` - the user's board
- `PUT /api/users/{username}/board` - replace the board (422 if invalid)
- `POST /api/ai/test` - asks the AI "What is 2+2?", returns `{"reply": ...}`
- `POST /api/users/{username}/chat` - body `{message, history: [{role, content}]}`; returns `{reply, board}` and saves the board; 502 if the AI request fails (any `openai` error, 60 s timeout, or no structured answer) or proposes an invalid change; the board is unchanged
- AI routes return 503 if `OPENROUTER_API_KEY` is unset

## Tests

`uv run pytest` from `backend/`. Without a local uv:

```
docker run --rm -v "<path>/backend:/app" -w /app -e UV_PROJECT_ENVIRONMENT=/tmp/venv ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest
```

The real AI tests are skipped unless `OPENROUTER_API_KEY` is set; to run it in the uv container add `--env-file <path>/.env`.
