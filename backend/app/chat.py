import copy
import json
import uuid
from typing import Literal

from pydantic import BaseModel

from app import ai

SYSTEM_PROMPT = """You are the assistant of a Kanban board app. Help the user manage their board.

You can change the board only through operations:
- create: add a card to the end of a column (column_id, title, details)
- edit: change a card's title and details (card_id, title, details); repeat current values for fields that do not change
- move: move a card to a column at a 0-based position (card_id, column_id, position)

You cannot delete cards, and you cannot add, remove or rename columns. If asked to, say so.
Use only ids that exist in the board. Return an empty operations list when no change is needed.
Always answer the user in reply.

Current board JSON:
{board}"""


class CreateCard(BaseModel):
    type: Literal["create"]
    column_id: str
    title: str
    details: str


class EditCard(BaseModel):
    type: Literal["edit"]
    card_id: str
    title: str
    details: str


class MoveCard(BaseModel):
    type: Literal["move"]
    card_id: str
    column_id: str
    position: int


class AIResponse(BaseModel):
    reply: str
    operations: list[CreateCard | EditCard | MoveCard]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage]


class InvalidOperationError(Exception):
    pass


def _column(board, column_id):
    for column in board["columns"]:
        if column["id"] == column_id:
            return column
    raise InvalidOperationError(f"unknown column id {column_id}")


def _check_card(board, card_id):
    if card_id not in board["cards"]:
        raise InvalidOperationError(f"unknown card id {card_id}")


def apply_operations(board, operations):
    board = copy.deepcopy(board)
    for operation in operations:
        match operation:
            case CreateCard():
                column = _column(board, operation.column_id)
                card_id = f"card-{uuid.uuid4().hex[:8]}"
                board["cards"][card_id] = {"id": card_id, "title": operation.title, "details": operation.details}
                column["cardIds"].append(card_id)
            case EditCard():
                _check_card(board, operation.card_id)
                board["cards"][operation.card_id].update(title=operation.title, details=operation.details)
            case MoveCard():
                _check_card(board, operation.card_id)
                target = _column(board, operation.column_id)
                for column in board["columns"]:
                    if operation.card_id in column["cardIds"]:
                        column["cardIds"].remove(operation.card_id)
                target["cardIds"].insert(max(operation.position, 0), operation.card_id)
    return board


def chat(board, request):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(board=json.dumps(board))},
        *[item.model_dump() for item in request.history],
        {"role": "user", "content": request.message},
    ]
    response = ai.parse(messages, AIResponse)
    return response.reply, apply_operations(board, response.operations)
