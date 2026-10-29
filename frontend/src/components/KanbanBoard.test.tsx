import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { mockApi } from "@/test/mockApi";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const renderBoard = async () => {
  render(<KanbanBoard username="user" />);
  await screen.findAllByTestId(/column-/i);
};

const startEditingFirstCard = async () => {
  const card = screen.getByTestId("card-card-1");
  await userEvent.click(within(card).getByRole("button", { name: /edit align roadmap themes/i }));
  return card;
};

describe("KanbanBoard", () => {
  it("loads the board from the API", async () => {
    const { fetchMock } = mockApi();
    render(<KanbanBoard username="user" />);
    expect(screen.getByText("Loading board...")).toBeInTheDocument();
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user/board");
  });

  it("shows an error when the board cannot be loaded", async () => {
    mockApi({ loadFails: true });
    render(<KanbanBoard username="user" />);
    expect(await screen.findByText("Could not load the board.")).toBeInTheDocument();
  });

  it("renames a column and saves it", async () => {
    const { saved } = mockApi();
    await renderBoard();
    const input = within(getFirstColumn()).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "Ideas");
    expect(input).toHaveValue("Ideas");
    await waitFor(() => expect(saved.at(-1)?.columns[0].title).toBe("Ideas"));
  });

  it("shows an error when saving fails", async () => {
    mockApi({ saveFails: true });
    await renderBoard();
    await userEvent.type(within(getFirstColumn()).getByLabelText("Column title"), "!");
    expect(await screen.findByText("Could not save your changes.")).toBeInTheDocument();
  });

  it("adds, saves and removes a card", async () => {
    const { saved } = mockApi();
    await renderBoard();
    const column = getFirstColumn();
    await userEvent.click(within(column).getByRole("button", { name: /add a card/i }));
    await userEvent.type(within(column).getByPlaceholderText(/card title/i), "New card");
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();
    await waitFor(() => {
      const board = saved.at(-1)!;
      const id = board.columns[0].cardIds.at(-1)!;
      expect(board.cards[id]).toMatchObject({ title: "New card", details: "Notes" });
    });

    await userEvent.click(within(column).getByRole("button", { name: /delete new card/i }));
    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });

  it("edits a card", async () => {
    mockApi();
    await renderBoard();
    const card = await startEditingFirstCard();
    const titleInput = within(card).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated title");
    const detailsInput = within(card).getByLabelText("Card details");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Updated details");
    await userEvent.click(within(card).getByRole("button", { name: /save/i }));

    expect(within(card).getByText("Updated title")).toBeInTheDocument();
    expect(within(card).getByText("Updated details")).toBeInTheDocument();
  });

  it("cancels editing a card", async () => {
    mockApi();
    await renderBoard();
    const card = await startEditingFirstCard();
    const titleInput = within(card).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Discarded");
    await userEvent.click(within(card).getByRole("button", { name: /cancel/i }));

    expect(within(card).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(within(card).queryByText("Discarded")).not.toBeInTheDocument();
  });

  it("does not save a card with an empty title", async () => {
    mockApi();
    await renderBoard();
    const card = await startEditingFirstCard();
    await userEvent.clear(within(card).getByLabelText("Card title"));
    await userEvent.click(within(card).getByRole("button", { name: /save/i }));

    expect(within(card).getByLabelText("Card title")).toBeInTheDocument();
  });
});
