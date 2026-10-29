# Frontend

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. Built as a static export (`output: "export"`) into `out/`, which the Docker image copies to `backend/static` and FastAPI serves at `/`. The board is loaded from and saved to the backend API.

## Structure

- `src/app/layout.tsx` - root layout, loads Google fonts (Space Grotesk for display, Manrope for body)
- `src/app/page.tsx` - client page: `LoginForm` when signed out, `KanbanBoard` when signed in
- `src/app/globals.css` - Tailwind import and color scheme as CSS variables (`--accent-yellow`, `--primary-blue`, `--secondary-purple`, `--navy-dark`, `--gray-text`)
- `src/lib/auth.ts` - fake sign in: `login` (only "user" / "password"), `logout`, `useUser` hook; user stored in `localStorage` key `pm-user`
- `src/lib/api.ts` - `fetchBoard` / `saveBoard` (`GET` / `PUT /api/users/{username}/board`), `sendChat` (`POST /api/users/{username}/chat`)
- `src/lib/kanban.ts` - data types (`Card`, `Column`, `BoardData`), `moveCard` (pure reorder/move logic), `createId`
- `src/components/KanbanBoard.tsx` - client component; loads the board for `username` on mount (loading and error states), saves the full board after each change through a sequential save queue; dnd-kit `DndContext` (collision: `pointerWithin`, falling back to `closestCorners`, so drops on tall empty columns work); owns the chat open state and leaves room for the sidebar on wide screens; handlers for drag, rename column, add, edit and delete card; Log out button in header; renders `ChatSidebar` and, on an AI reply, waits for pending saves, sends the chat and replaces the board with the returned one
- `src/components/ChatSidebar.tsx` - toggleable AI chat panel (fixed on the right): message list, Thinking indicator, Enter to send; history kept in state (failed replies are not sent as history)
- `src/components/KanbanColumn.tsx` - a column with editable title input, sortable card list and `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable card with Edit (inline title/details form) and Remove buttons; drag is off while editing
- `src/components/KanbanCardPreview.tsx` - card shown in the drag overlay
- `src/components/LoginForm.tsx` - username/password form with error message
- `src/components/NewCardForm.tsx` - toggleable form to add a card (title + details)

## Data model

```ts
BoardData = { columns: { id, title, cardIds[] }[], cards: Record<id, { id, title, details }> }
```

Columns are fixed (5); only their titles change. Card order is the order of `cardIds`.

## Current features

Fake sign in / log out. Board persisted per user in the backend. AI chat sidebar that can create, edit and move cards. Rename columns, add, edit and delete cards, drag and drop cards within and across columns.

## Tests

- Unit tests mock `fetch` with `mockApi` (`src/test/mockApi.ts`); `src/test/board.ts` holds the default board fixture (same as backend `DEFAULT_BOARD`)
- Unit (Vitest + Testing Library, jsdom): `src/lib/kanban.test.ts`, `src/components/KanbanBoard.test.tsx`, `src/app/page.test.tsx`, `src/components/ChatSidebar.test.tsx` - `npm run test:unit`
- E2E (Playwright, Chromium): `tests/auth.spec.ts`, `tests/kanban.spec.ts` `tests/persistence.spec.ts`, `tests/chat.spec.ts` (AI mocked with `page.route`) (use `signIn(page, board?)` from `tests/helpers.ts`, which resets the board (to `board` if given) of a separate `e2e` user and signs in as it through `localStorage`, so the real "user" board is never touched; run with 1 worker; the restart test runs `docker restart pm-app`) - `npm run test:e2e` (runs against the Docker container at http://localhost:8000; start it with `scripts/start` first)

## Notes

- Test ids: `column-<columnId>`, `card-<cardId>`
