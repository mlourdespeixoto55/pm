import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialBoard } from "@/test/board";
import { mockApi } from "@/test/mockApi";

const renamedBoard = () => {
  const board = structuredClone(initialBoard);
  board.cards["card-1"].title = "Renamed by AI";
  return board;
};

const renderAndOpenChat = async () => {
  render(<KanbanBoard username="user" />);
  await screen.findAllByTestId(/column-/i);
  await userEvent.click(screen.getByRole("button", { name: /ai assistant/i }));
  return screen.getByRole("complementary", { name: /ai assistant/i });
};

// A chat handler whose response is sent later with respond().
const pendingChat = () => {
  let resolveChat: (response: Response) => void = () => {};
  const chat = () => new Promise<Response>((resolve) => (resolveChat = resolve));
  return { chat, respond: (response: Response) => resolveChat(response) };
};

const getColumns = () => screen.getAllByTestId(/column-/i)[0].parentElement!;

const sendMessage = async (sidebar: HTMLElement, text: string) => {
  await userEvent.type(within(sidebar).getByLabelText("Message"), text);
  await userEvent.click(within(sidebar).getByRole("button", { name: /send/i }));
};

describe("ChatSidebar", () => {
  it("opens and closes", async () => {
    mockApi();
    const sidebar = await renderAndOpenChat();
    expect(sidebar).toBeInTheDocument();
    await userEvent.click(within(sidebar).getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("shows the conversation and updates the board", async () => {
    mockApi({ chat: () => Response.json({ reply: "Done!", board: renamedBoard() }) });
    const sidebar = await renderAndOpenChat();
    await sendMessage(sidebar, "Rename card 1");

    expect(within(sidebar).getByTestId("chat-message-user")).toHaveTextContent("Rename card 1");
    expect(await within(sidebar).findByTestId("chat-message-assistant")).toHaveTextContent("Done!");
    expect(within(sidebar).getByLabelText("Message")).toHaveValue("");
    expect(screen.getByTestId("card-card-1")).toHaveTextContent("Renamed by AI");
  });

  it("does not send empty messages", async () => {
    const { chatRequests } = mockApi();
    const sidebar = await renderAndOpenChat();
    const sendButton = within(sidebar).getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
    await userEvent.type(within(sidebar).getByLabelText("Message"), "   {Enter}");
    expect(chatRequests).toHaveLength(0);
  });

  it("sends with Enter and shows a loading state", async () => {
    const { chat, respond } = pendingChat();
    mockApi({ chat });
    const sidebar = await renderAndOpenChat();
    await userEvent.type(within(sidebar).getByLabelText("Message"), "Hello{Enter}");

    expect(await within(sidebar).findByText("Thinking...")).toBeInTheDocument();
    await userEvent.type(within(sidebar).getByLabelText("Message"), "Next");
    expect(within(sidebar).getByRole("button", { name: /send/i })).toBeDisabled();

    respond(Response.json({ reply: "Hi", board: initialBoard }));
    expect(await within(sidebar).findByText("Hi")).toBeInTheDocument();
    expect(within(sidebar).queryByText("Thinking...")).not.toBeInTheDocument();
  });

  it("locks the board while waiting for the AI", async () => {
    const { chat, respond } = pendingChat();
    mockApi({ chat });
    const sidebar = await renderAndOpenChat();
    const columns = getColumns();
    expect(columns).not.toHaveAttribute("inert");

    await sendMessage(sidebar, "Hello");
    await within(sidebar).findByText("Thinking...");
    expect(columns).toHaveAttribute("inert");

    respond(Response.json({ reply: "Hi", board: initialBoard }));
    await within(sidebar).findByText("Hi");
    expect(columns).not.toHaveAttribute("inert");
  });

  it("shows an error, keeps the board and unlocks it when the AI fails", async () => {
    mockApi({ chat: () => new Response(null, { status: 502 }) });
    const sidebar = await renderAndOpenChat();
    await sendMessage(sidebar, "Break it");

    expect(await within(sidebar).findByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByTestId("card-card-1")).toHaveTextContent("Align roadmap themes");
    expect(getColumns()).not.toHaveAttribute("inert");
  });

  it("sends previous messages as history, without errors", async () => {
    let calls = 0;
    const { chatRequests } = mockApi({
      chat: () =>
        ++calls === 2
          ? new Response(null, { status: 502 })
          : Response.json({ reply: `Reply ${calls}`, board: initialBoard }),
    });
    const sidebar = await renderAndOpenChat();
    await sendMessage(sidebar, "First");
    await within(sidebar).findByText("Reply 1");
    await sendMessage(sidebar, "Second");
    await within(sidebar).findByText(/something went wrong/i);
    await sendMessage(sidebar, "Third");
    await within(sidebar).findByText("Reply 3");

    expect(chatRequests[0]).toEqual({ message: "First", history: [] });
    expect(chatRequests[2]).toEqual({
      message: "Third",
      history: [
        { role: "user", content: "First" },
        { role: "assistant", content: "Reply 1" },
        { role: "user", content: "Second" },
      ],
    });
  });

  it("waits for pending saves before chatting", async () => {
    const order: string[] = [];
    const { fetchMock } = mockApi({
      chat: () => {
        order.push("chat");
        return Response.json({ reply: "Ok", board: initialBoard });
      },
    });
    const sidebar = await renderAndOpenChat();
    let releaseSave: () => void = () => {};
    const saveGate = new Promise<void>((resolve) => (releaseSave = resolve));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "PUT") {
        await saveGate;
        order.push("save");
      }
      return original(url, init);
    });

    await userEvent.type(screen.getAllByLabelText("Column title")[0], "!");
    await sendMessage(sidebar, "Go");
    await within(sidebar).findByText("Thinking...");
    expect(order).toEqual([]);

    releaseSave();
    await within(sidebar).findByText("Ok");
    expect(order).toEqual(["save", "chat"]);
  });
});
