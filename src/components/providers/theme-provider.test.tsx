import { render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/providers/theme-provider";

function ThemeProbe() {
  const { theme } = useTheme();
  return <div>theme:{theme ?? "unset"}</div>;
}

describe("ThemeProvider", () => {
  it("provides theme context to children", () => {
    render(
      <ThemeProvider defaultTheme="light" enableSystem={false}>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText(/theme:/)).toBeInTheDocument();
  });
});
