# Database

SQLite, accessed with Python's standard `sqlite3` module. Each user has one board, stored as a single JSON document.

## Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- `users` supports multiple users; for the MVP only "user" exists.
- `boards.user_id` is `UNIQUE`: one board per user. Dropping that constraint later allows several boards per user.
- `boards.data` holds the board JSON (SQLite stores JSON as `TEXT`).

## Board JSON

Same shape as the frontend `BoardData` type:

```json
{
  "columns": [
    { "id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"] },
    { "id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"] },
    { "id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"] },
    { "id": "col-review", "title": "Review", "cardIds": ["card-6"] },
    { "id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"] }
  ],
  "cards": {
    "card-1": { "id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics." }
  }
}
```

(`cards` abbreviated; the default board has the 8 demo cards from the current `initialData`.)

Card order within a column is the order of `cardIds`.

## Validation

The backend validates boards with Pydantic before saving:

- Exactly the 5 fixed column ids, in order (titles may change)
- Every id in `cardIds` exists in `cards`, and every card appears in exactly one column
- Each card's `id` matches its key in `cards`

## Lifecycle

- DB file path from env `DB_PATH`, default `data/pm.db`. On startup the directory and tables are created if missing.
- When a user's board is first requested, the user row and a default board are created.
- The whole board is read and written at once (`GET` / `PUT`). Last write wins.
- In Docker the DB lives in a named volume (`pm-data` mounted at `/app/data`), so data survives container restarts.

## Why a JSON document

The frontend and the AI both work with the whole board as JSON, and the board is small. Storing it as one document avoids mapping between tables and JSON and keeps the backend to a read and a write. The cost is no per-card queries, which the MVP does not need.
