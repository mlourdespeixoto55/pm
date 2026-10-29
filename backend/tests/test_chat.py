import json
import os

import openai
import pytest

from app import ai
from app.board import DEFAULT_BOARD
from app.chat import AIResponse, CreateCard, EditCard, MoveCard

CHAT_URL = "/api/users/user/chat"
BOARD_URL = "/api/users/user/board"


@pytest.fixture
def fake_ai(monkeypatch):
    calls = []

    def respond(reply, operations=()):
        def parse(messages, response_format):
            calls.append({"messages": messages, "response_format": response_format})
            return AIResponse(reply=reply, operations=list(operations))

        monkeypatch.setattr(ai, "parse", parse)
        return calls

    return respond


def send(client, message="Hi", history=()):
    return client.post(CHAT_URL, json={"message": message, "history": list(history)})


def test_reply_without_operations_keeps_board(client, fake_ai):
    fake_ai("Hello!")
    response = send(client)
    assert response.status_code == 200
    assert response.json() == {"reply": "Hello!", "board": DEFAULT_BOARD}
    assert client.get(BOARD_URL).json() == DEFAULT_BOARD


def test_sends_board_history_and_message(client, fake_ai):
    calls = fake_ai("Sure")
    history = [{"role": "user", "content": "Earlier"}, {"role": "assistant", "content": "Reply"}]
    send(client, "Now", history)

    messages = calls[0]["messages"]
    assert messages[0]["role"] == "system"
    assert json.dumps(DEFAULT_BOARD) in messages[0]["content"]
    assert messages[1:] == [*history, {"role": "user", "content": "Now"}]
    assert calls[0]["response_format"] is AIResponse


def test_create_card(client, fake_ai):
    fake_ai("Added", [CreateCard(type="create", column_id="col-review", title="New", details="Info")])
    board = send(client).json()["board"]

    new_id = board["columns"][3]["cardIds"][-1]
    assert board["cards"][new_id] == {"id": new_id, "title": "New", "details": "Info"}
    assert client.get(BOARD_URL).json() == board


def test_edit_card(client, fake_ai):
    fake_ai("Edited", [EditCard(type="edit", card_id="card-2", title="Renamed", details="Changed")])
    board = send(client).json()["board"]

    assert board["cards"]["card-2"] == {"id": "card-2", "title": "Renamed", "details": "Changed"}
    assert client.get(BOARD_URL).json() == board


def test_move_card_to_other_column(client, fake_ai):
    fake_ai("Moved", [MoveCard(type="move", card_id="card-1", column_id="col-done", position=1)])
    board = send(client).json()["board"]

    assert board["columns"][0]["cardIds"] == ["card-2"]
    assert board["columns"][4]["cardIds"] == ["card-7", "card-1", "card-8"]
    assert client.get(BOARD_URL).json() == board


def test_move_card_within_column(client, fake_ai):
    fake_ai("Moved", [MoveCard(type="move", card_id="card-2", column_id="col-backlog", position=0)])
    board = send(client).json()["board"]
    assert board["columns"][0]["cardIds"] == ["card-2", "card-1"]


def test_move_past_end_appends(client, fake_ai):
    fake_ai("Moved", [MoveCard(type="move", card_id="card-1", column_id="col-review", position=99)])
    board = send(client).json()["board"]
    assert board["columns"][3]["cardIds"] == ["card-6", "card-1"]


def test_multiple_operations_in_order(client, fake_ai):
    fake_ai(
        "Done",
        [
            EditCard(type="edit", card_id="card-3", title="First", details="A"),
            MoveCard(type="move", card_id="card-3", column_id="col-progress", position=0),
            CreateCard(type="create", column_id="col-discovery", title="Second", details="B"),
        ],
    )
    board = send(client).json()["board"]

    assert board["cards"]["card-3"]["title"] == "First"
    assert board["columns"][2]["cardIds"][0] == "card-3"
    discovery = board["columns"][1]["cardIds"]
    assert len(discovery) == 1
    assert board["cards"][discovery[0]]["title"] == "Second"


@pytest.mark.parametrize(
    "operation",
    [
        CreateCard(type="create", column_id="col-missing", title="X", details="Y"),
        EditCard(type="edit", card_id="card-missing", title="X", details="Y"),
        MoveCard(type="move", card_id="card-missing", column_id="col-done", position=0),
        MoveCard(type="move", card_id="card-1", column_id="col-missing", position=0),
    ],
)
def test_invalid_ids_are_rejected(client, fake_ai, operation):
    valid = EditCard(type="edit", card_id="card-1", title="Should not save", details="")
    fake_ai("Oops", [valid, operation])
    response = send(client)

    assert response.status_code == 502
    assert "invalid change" in response.json()["detail"]
    assert client.get(BOARD_URL).json() == DEFAULT_BOARD


def test_schema_only_allows_create_edit_move():
    schema = json.dumps(AIResponse.model_json_schema())
    for operation in ("create", "edit", "move"):
        assert f'"const": "{operation}"' in schema
    assert "delete" not in schema


def test_chat_without_key(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    assert send(client).status_code == 503


@pytest.mark.parametrize("error", [openai.OpenAIError("boom"), ai.EmptyResponseError("empty")])
def test_ai_failure_returns_502_and_keeps_board(client, monkeypatch, error):
    def parse(messages, response_format):
        raise error

    monkeypatch.setattr(ai, "parse", parse)
    response = send(client)

    assert response.status_code == 502
    assert "AI request failed" in response.json()["detail"]
    assert client.get(BOARD_URL).json() == DEFAULT_BOARD


@pytest.mark.skipif(not os.environ.get("OPENROUTER_API_KEY"), reason="OPENROUTER_API_KEY not set")
def test_real_ai_creates_and_moves_card(client):
    response = send(client, 'Add a card titled "AI test card" to the Backlog column.')
    assert response.status_code == 200
    board = response.json()["board"]
    matches = [card for card in board["cards"].values() if card["title"] == "AI test card"]
    assert len(matches) == 1
    card_id = matches[0]["id"]
    assert card_id in board["columns"][0]["cardIds"]

    history = [
        {"role": "user", "content": 'Add a card titled "AI test card" to the Backlog column.'},
        {"role": "assistant", "content": response.json()["reply"]},
    ]
    response = send(client, "Now move that card to Done.", history)
    assert response.status_code == 200
    assert card_id in response.json()["board"]["columns"][4]["cardIds"]
