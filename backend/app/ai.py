import os

from openai import OpenAI

MODEL = "openai/gpt-oss-120b"
BASE_URL = "https://openrouter.ai/api/v1"
# The SDK default is 600 seconds, far too long for a chat reply.
TIMEOUT = 60


class MissingApiKeyError(Exception):
    pass


class EmptyResponseError(Exception):
    pass


def get_client():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise MissingApiKeyError("OPENROUTER_API_KEY is not set")
    return OpenAI(base_url=BASE_URL, api_key=api_key, timeout=TIMEOUT)


def ask(prompt):
    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def parse(messages, response_format):
    response = get_client().chat.completions.parse(
        model=MODEL,
        messages=messages,
        response_format=response_format,
        # Route only to providers that support structured outputs.
        extra_body={"provider": {"require_parameters": True}},
    )
    parsed = response.choices[0].message.parsed
    if parsed is None:
        raise EmptyResponseError("the AI returned no structured answer")
    return parsed
