import logging
from contextlib import asynccontextmanager
from pathlib import Path

import openai
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import ai, chat, db
from app.board import Board

STATIC_DIR = Path(__file__).parent.parent / "static"
logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.exception_handler(ai.MissingApiKeyError)
def missing_api_key(request: Request, error: ai.MissingApiKeyError):
    return JSONResponse(status_code=503, content={"detail": str(error)})


@app.exception_handler(openai.OpenAIError)
@app.exception_handler(ai.EmptyResponseError)
def ai_failed(request: Request, error: Exception):
    detail = f"The AI request failed: {error}"
    logger.warning(detail)
    return JSONResponse(status_code=502, content={"detail": detail})


@app.exception_handler(chat.InvalidOperationError)
def invalid_operation(request: Request, error: chat.InvalidOperationError):
    detail = f"The AI proposed an invalid change: {error}"
    logger.warning(detail)
    return JSONResponse(status_code=502, content={"detail": detail})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/users/{username}/board", response_model=Board)
def read_board(username: str):
    return db.get_board(username)


@app.put("/api/users/{username}/board", response_model=Board)
def write_board(username: str, board: Board):
    db.save_board(username, board.model_dump(by_alias=True))
    return board


@app.post("/api/ai/test")
def ai_test():
    return {"reply": ai.ask("What is 2+2?")}


@app.post("/api/users/{username}/chat")
def chat_with_ai(username: str, request: chat.ChatRequest):
    reply, board = chat.chat(db.get_board(username), request)
    db.save_board(username, board)
    return {"reply": reply, "board": board}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True, check_dir=False), name="static")
