import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("marks the closed mobile drawer as inert so off-screen controls leave the tab order", async () => {
    mockMatchMedia(true);

    const { rerender } = render(<Sidebar open={false} onClose={() => {}} />);

    await waitFor(() => {
      expect(document.getElementById("app-sidebar")).toHaveAttribute("inert");
    });
    expect(document.getElementById("app-sidebar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    rerender(<Sidebar open onClose={() => {}} />);

    await waitFor(() => {
      expect(document.getElementById("app-sidebar")).not.toHaveAttribute("inert");
    });
    expect(document.getElementById("app-sidebar")).not.toHaveAttribute(
      "aria-hidden",
    );
  });

  it("keeps the desktop sidebar interactive while the mobile drawer flag is closed", async () => {
    mockMatchMedia(false);

    render(<Sidebar open={false} onClose={() => {}} />);

    await waitFor(() => {
      expect(document.getElementById("app-sidebar")).not.toHaveAttribute("inert");
    });
    expect(document.getElementById("app-sidebar")).not.toHaveAttribute(
      "aria-hidden",
    );
  });
});
