import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CardView from "./CardView";

describe("CardView", () => {
  it("renders a visible field's value", () => {
    render(
      <CardView
        displayName="Grace Hopper"
        fields={[{ id: "1", label: "Email", value: "grace@example.com" }]}
      />,
    );

    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  });

  it("renders a Request access button instead of a value for a requestable field", () => {
    render(
      <CardView
        displayName="Grace Hopper"
        fields={[{ id: "1", label: "Phone", requestable: true }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Request access" })).toBeInTheDocument();
    expect(screen.queryByText(/555/)).not.toBeInTheDocument();
  });

  it("calls onRequestField when the Request access button is clicked", async () => {
    const onRequestField = vi.fn();
    render(
      <CardView
        displayName="Grace Hopper"
        fields={[{ id: "field-1", label: "Phone", requestable: true }]}
        onRequestField={onRequestField}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Request access" }));
    expect(onRequestField).toHaveBeenCalledWith("field-1");
  });
});
