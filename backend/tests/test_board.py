import copy
import sqlite3

from fastapi.testclient import TestClient

from app.board import DEFAULT_BOARD
from app.main import app


def board_url(username="user"):
    return f"/api/users/{username}/board"


def test_creates_database_on_startup(client, db_path):
    assert db_path.exists()
    tables = sqlite3.connect(db_path).execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).fetchall()
    assert tables == [("boards",), ("users",)]


def test_new_user_gets_default_board(client):
    response = client.get(board_url())
    assert response.status_code == 200
    assert response.json() == DEFAULT_BOARD


def test_save_and_reload(client):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][0]["title"] = "Ideas"
    board["columns"][0]["cardIds"].remove("card-1")
    board["columns"][4]["cardIds"].append("card-1")
    board["cards"]["card-9"] = {"id": "card-9", "title": "New", "details": "Fresh"}
    board["columns"][1]["cardIds"].insert(0, "card-9")

    assert client.put(board_url(), json=board).json() == board
    assert client.get(board_url()).json() == board


def test_saving_twice_keeps_last_board(client):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][0]["title"] = "First"
    client.put(board_url(), json=board)
    board["columns"][0]["title"] = "Second"
    client.put(board_url(), json=board)
    assert client.get(board_url()).json()["columns"][0]["title"] == "Second"


def test_users_have_separate_boards(client):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][0]["title"] = "Alice backlog"
    client.put(board_url("alice"), json=board)

    assert client.get(board_url("alice")).json() == board
    assert client.get(board_url("bob")).json() == DEFAULT_BOARD


def test_data_survives_restart(db_path):
    board = copy.deepcopy(DEFAULT_BOARD)
    board["columns"][0]["title"] = "Persisted"
    with TestClient(app) as client:
        client.put(board_url(), json=board)
    with TestClient(app) as client:
        assert client.get(board_url()).json() == board


def invalid_boards():
    missing_column = copy.deepcopy(DEFAULT_BOARD)
    missing_column["columns"].pop()

    unknown_card = copy.deepcopy(DEFAULT_BOARD)
    unknown_card["columns"][0]["cardIds"].append("card-99")

    orphan_card = copy.deepcopy(DEFAULT_BOARD)
    orphan_card["columns"][0]["cardIds"].remove("card-1")

    duplicated_card = copy.deepcopy(DEFAULT_BOARD)
    duplicated_card["columns"][1]["cardIds"].append("card-1")

    mismatched_key = copy.deepcopy(DEFAULT_BOARD)
    mismatched_key["cards"]["card-1"]["id"] = "card-x"

    missing_field = copy.deepcopy(DEFAULT_BOARD)
    del missing_field["cards"]["card-1"]["title"]

    return [missing_column, unknown_card, orphan_card, duplicated_card, mismatched_key, missing_field]


def test_rejects_invalid_boards_without_changing_data(client):
    client.get(board_url())
    for board in invalid_boards():
        assert client.put(board_url(), json=board).status_code == 422
    assert client.get(board_url()).json() == DEFAULT_BOARD
