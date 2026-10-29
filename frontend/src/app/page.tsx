"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { useUser } from "@/lib/auth";

export default function Home() {
  const user = useUser();
  return user ? <KanbanBoard username={user} /> : <LoginForm />;
}
