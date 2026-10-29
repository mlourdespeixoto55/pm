import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import type { ChatMessage } from "@/lib/api";

type DisplayMessage = ChatMessage & { error?: boolean };

type ChatSidebarProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSend: (message: string, history: ChatMessage[]) => Promise<string>;
};

export const ChatSidebar = ({ isOpen, setIsOpen, onSend }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const send = async () => {
    const message = input.trim();
    if (!message || isSending) {
      return;
    }
    const history = messages
      .filter((item) => !item.error)
      .map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setIsSending(true);
    try {
      const reply = await onSend(message, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-[var(--secondary-purple)] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-white shadow-[var(--shadow)] transition hover:brightness-110"
      >
        AI Assistant
      </button>
    );
  }

  return (
    <aside
      aria-label="AI Assistant"
      className="fixed inset-y-0 right-0 z-20 flex w-full max-w-[400px] flex-col border-l border-[var(--stroke)] bg-white shadow-[var(--shadow)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--stroke)] px-6 py-5">
        <div>
          <div className="h-1.5 w-8 rounded-full bg-[var(--accent-yellow)]" />
          <h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy-dark)]">
            AI Assistant
          </h2>
          <p className="mt-1 text-xs text-[var(--gray-text)]">
            Ask me to create, edit or move cards.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
        >
          Close
        </button>
      </header>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[var(--surface)] px-6 py-5">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-[var(--gray-text)]">
            Try &quot;Add a card to review the budget in Backlog&quot;.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            data-testid={`chat-message-${message.role}`}
            className={clsx(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
              message.role === "user"
                ? "self-end bg-[var(--primary-blue)] text-white"
                : "self-start border border-[var(--stroke)] bg-white text-[var(--navy-dark)]",
              message.error && "border-red-200 bg-red-50 text-red-600"
            )}
          >
            {message.content}
          </div>
        ))}
        {isSending && (
          <div className="self-start rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--gray-text)]">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-[var(--stroke)] px-6 py-4">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the assistant"
          aria-label="Message"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
