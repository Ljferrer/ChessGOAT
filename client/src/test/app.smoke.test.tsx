import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { App } from "../App.tsx";

/** Mounts the full component tree to catch render-time errors the (unavailable in
 *  CI) browser check would surface — board, masthead, and both brain selectors. */
describe("App smoke", () => {
  it("renders the board, masthead, and per-side brain selectors", () => {
    render(<App />);

    expect(screen.getByRole("grid", { name: /chess board/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/white brain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/black brain/i)).toBeInTheDocument();

    // 64 squares are rendered as interactive cells.
    const board = screen.getByRole("grid", { name: /chess board/i });
    expect(within(board).getAllByRole("button")).toHaveLength(64);

    // The starting Position is shown in the FEN readout.
    expect(screen.getByText(/rnbqkbnr\/pppppppp/)).toBeInTheDocument();
  });
});
