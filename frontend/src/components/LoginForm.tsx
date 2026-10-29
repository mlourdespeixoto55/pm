import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth";

const inputClassName =
  "mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]";

export const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(!login(username, password));
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]"
      >
        <div>
          <div className="h-2 w-10 rounded-full bg-[var(--accent-yellow)]" />
          <h1 className="mt-4 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            Sign in to see your board.
          </p>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className={inputClassName}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className={inputClassName}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            Invalid username or password.
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>
    </main>
  );
};
