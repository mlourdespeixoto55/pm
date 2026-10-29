import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pm-user";
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useUser = () =>
  useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null
  );

export const login = (username: string, password: string) => {
  if (username !== "user" || password !== "password") {
    return false;
  }
  localStorage.setItem(STORAGE_KEY, username);
  notify();
  return true;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  notify();
};
