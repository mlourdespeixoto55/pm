import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path

from app.board import DEFAULT_BOARD

SCHEMA = """
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
"""


def connect():
    path = Path(os.environ.get("DB_PATH", "data/pm.db"))
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with closing(connect()) as conn:
        conn.executescript(SCHEMA)


def _user_id(conn, username):
    conn.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", (username,))
    return conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()[0]


def get_board(username):
    with closing(connect()) as conn, conn:
        user_id = _user_id(conn, username)
        conn.execute(
            "INSERT OR IGNORE INTO boards (user_id, data) VALUES (?, ?)",
            (user_id, json.dumps(DEFAULT_BOARD)),
        )
        row = conn.execute("SELECT data FROM boards WHERE user_id = ?", (user_id,)).fetchone()
        return json.loads(row[0])


def save_board(username, board):
    with closing(connect()) as conn, conn:
        user_id = _user_id(conn, username)
        conn.execute(
            """
            INSERT INTO boards (user_id, data) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, json.dumps(board)),
        )
