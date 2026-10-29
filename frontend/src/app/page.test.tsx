import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { mockApi } from "@/test/mockApi";

const signIn = async (username: string, password: string) => {
  await userEvent.type(screen.getByLabelText("Username"), username);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    mockApi();
  });

  it("shows the login screen when signed out", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId(/column-/i)).toHaveLength(0);
  });

  it("shows the board after a valid login", async () => {
    render(<Home />);
    await signIn("user", "password");
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
    expect(localStorage.getItem("pm-user")).toBe("user");
  });

  it("shows an error for invalid credentials", async () => {
    render(<Home />);
    await signIn("user", "wrong");
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    expect(screen.queryAllByTestId(/column-/i)).toHaveLength(0);
    expect(localStorage.getItem("pm-user")).toBeNull();
  });

  it("shows the board when already signed in", async () => {
    localStorage.setItem("pm-user", "user");
    render(<Home />);
    expect(await screen.findAllByTestId(/column-/i)).toHaveLength(5);
  });

  it("returns to the login screen after logout", async () => {
    render(<Home />);
    await signIn("user", "password");
    await userEvent.click(await screen.findByRole("button", { name: /log out/i }));
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(localStorage.getItem("pm-user")).toBeNull();
  });
});
