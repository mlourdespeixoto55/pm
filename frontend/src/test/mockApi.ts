import { vi } from "vitest";
import type { BoardData } from "@/lib/kanban";
import type { ChatMessage } from "@/lib/api";
import { initialBoard } from "@/test/board";

type ChatRequest = { message: string; history: ChatMessage[] };

type MockApiOptions = {
  loadFails?: boolean;
  saveFails?: boolean;
  chat?: (request: ChatRequest) => Response | Promise<Response>;
};

export const mockApi = ({
  loadFails = false,
  saveFails = false,
  chat = () => new Response(null, { status: 500 }),
}: MockApiOptions = {}) => {
  const saved: BoardData[] = [];
  const chatRequests: ChatRequest[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/chat")) {
      const request = JSON.parse(init?.body as string);
      chatRequests.push(request);
      return chat(request);
    }
    if (init?.method === "PUT") {
      if (saveFails) return new Response(null, { status: 500 });
      saved.push(JSON.parse(init.body as string));
      return new Response(null, { status: 200 });
    }
    if (loadFails) return new Response(null, { status: 500 });
    return Response.json(structuredClone(initialBoard));
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, saved, chatRequests };
};
