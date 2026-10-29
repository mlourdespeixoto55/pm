import type { BoardData } from "@/lib/kanban";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const userUrl = (username: string, path: string) =>
  `/api/users/${encodeURIComponent(username)}/${path}`;

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const ensureOk = (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response;
};

export const fetchBoard = async (username: string): Promise<BoardData> =>
  ensureOk(await fetch(userUrl(username, "board"))).json();

export const saveBoard = async (username: string, board: BoardData) => {
  ensureOk(await fetch(userUrl(username, "board"), jsonRequest("PUT", board)));
};

export const sendChat = async (
  username: string,
  message: string,
  history: ChatMessage[]
): Promise<{ reply: string; board: BoardData }> =>
  ensureOk(
    await fetch(userUrl(username, "chat"), jsonRequest("POST", { message, history }))
  ).json();
