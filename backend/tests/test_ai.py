import os
from types import SimpleNamespace

import pytest

from app import ai
from app.chat import AIResponse


def fake_client(monkeypatch, message):
    calls = []

    def respond(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    completions = SimpleNamespace(create=respond, parse=respond)
    monkeypatch.setattr(ai, "get_client", lambda: SimpleNamespace(chat=SimpleNamespace(completions=completions)))
    return calls


def test_ask_uses_model_and_prompt(monkeypatch):
    calls = fake_client(monkeypatch, SimpleNamespace(content="2 + 2 = 4"))
    assert ai.ask("What is 2+2?") == "2 + 2 = 4"
    assert calls == [{"model": "openai/gpt-oss-120b", "messages": [{"role": "user", "content": "What is 2+2?"}]}]


def test_ai_test_endpoint(client, monkeypatch):
    fake_client(monkeypatch, SimpleNamespace(content="2 + 2 = 4"))
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert response.json() == {"reply": "2 + 2 = 4"}


def test_ai_test_endpoint_without_key(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    response = client.post("/api/ai/test")
    assert response.status_code == 503
    assert response.json() == {"detail": "OPENROUTER_API_KEY is not set"}


def test_client_uses_openrouter_with_timeout(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    client = ai.get_client()
    assert str(client.base_url) == "https://openrouter.ai/api/v1/"
    assert client.timeout == ai.TIMEOUT


def test_parse_requests_structured_output(monkeypatch):
    calls = fake_client(monkeypatch, SimpleNamespace(parsed="parsed"))
    assert ai.parse([{"role": "user", "content": "x"}], AIResponse) == "parsed"
    assert calls[0]["model"] == "openai/gpt-oss-120b"
    assert calls[0]["response_format"] is AIResponse
    assert calls[0]["extra_body"] == {"provider": {"require_parameters": True}}


def test_parse_without_structured_answer_fails(monkeypatch):
    fake_client(monkeypatch, SimpleNamespace(parsed=None))
    with pytest.raises(ai.EmptyResponseError):
        ai.parse([{"role": "user", "content": "x"}], AIResponse)


@pytest.mark.skipif(not os.environ.get("OPENROUTER_API_KEY"), reason="OPENROUTER_API_KEY not set")
def test_real_ai_call(client):
    response = client.post("/api/ai/test")
    assert response.status_code == 200
    assert "4" in response.json()["reply"]
