import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateCard from "./CreateCard";
import { createCard } from "../api";

vi.mock("../api", () => ({
  createCard: vi.fn(),
  setStoredAuth: vi.fn(),
}));

describe("CreateCard", () => {
  it("shows an error and does not call the API when the name is empty", async () => {
    render(
      <MemoryRouter>
        <CreateCard />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Create card" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(createCard).not.toHaveBeenCalled();
  });
});
