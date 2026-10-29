import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { createId, moveCard, type BoardData } from "@/lib/kanban";
import { logout } from "@/lib/auth";
import { fetchBoard, saveBoard, sendChat, type ChatMessage } from "@/lib/api";

// closestCorners alone misses tall empty columns, so prefer what is under the pointer.
const collisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  return collisions.length > 0 ? collisions : closestCorners(args);
};

type KanbanBoardProps = {
  username: string;
};

export const KanbanBoard = ({ username }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isChatting, setIsChatting] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    fetchBoard(username)
      .then(setBoard)
      .catch(() => setError("Could not load the board."));
  }, [username]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const updateBoard = (update: (prev: BoardData) => BoardData) => {
    const next = update(board!);
    setBoard(next);
    saveQueue.current = saveQueue.current
      .then(() => saveBoard(username, next))
      .catch(() => setError("Could not save your changes."));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveCardId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    updateBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleEditCard = (cardId: string, title: string, details: string) => {
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { id: cardId, title, details: details || "No details yet." },
      },
    }));
  };

  const handleDeleteCard = (cardId: string) => {
    updateBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId)
      ),
      columns: prev.columns.map((column) => ({
        ...column,
        cardIds: column.cardIds.filter((id) => id !== cardId),
      })),
    }));
  };

  const handleChat = async (message: string, history: ChatMessage[]) => {
    // The backend reads the saved board and overwrites it with the AI result,
    // so pending saves must land first and the board is locked meanwhile.
    setIsChatting(true);
    try {
      await saveQueue.current;
      const response = await sendChat(username, message, history);
      setBoard(response.board);
      return response.reply;
    } finally {
      setIsChatting(false);
    }
  };

  if (!board) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm font-semibold text-[var(--gray-text)]">
        {error ?? "Loading board..."}
      </main>
    );
  }

  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main
        className={clsx(
          "relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12",
          isChatOpen && "lg:mr-[400px]"
        )}
      >
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex flex-col items-end gap-4">
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
              >
                Log out
              </button>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section
            inert={isChatting}
            aria-busy={isChatting}
            className={clsx(
              "grid gap-6 transition lg:grid-cols-[repeat(5,minmax(200px,1fr))] lg:overflow-x-auto lg:pb-2",
              isChatting && "opacity-60"
            )}
          >
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onEditCard={handleEditCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard && (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>
      <ChatSidebar isOpen={isChatOpen} setIsOpen={setIsChatOpen} onSend={handleChat} />
    </div>
  );
};
