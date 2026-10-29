export type Card = {
  id: string;
  title: string;
  details: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardData = {
  columns: Column[];
  cards: Record<string, Card>;
};

// Moves a card before the card it is dropped on, or to the end of the column it is dropped on.
export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const from = columns.find((column) => column.cardIds.includes(activeId));
  const to = columns.find(
    (column) => column.id === overId || column.cardIds.includes(overId)
  );
  if (!from || !to) {
    return columns;
  }

  const toCardIds = to.cardIds.filter((id) => id !== activeId);
  const index = to.id === overId ? toCardIds.length : to.cardIds.indexOf(overId);
  toCardIds.splice(index, 0, activeId);

  return columns.map((column) => {
    if (column.id === to.id) {
      return { ...column, cardIds: toCardIds };
    }
    if (column.id === from.id) {
      return { ...column, cardIds: column.cardIds.filter((id) => id !== activeId) };
    }
    return column;
  });
};

export const createId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}${timePart}`;
};
