import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleButton } from "@/components/auth/google-button";

const signInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

describe("GoogleButton", () => {
  beforeEach(() => {
    signInSocial.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a disabled placeholder when Google OAuth is not configured", () => {
    render(<GoogleButton enabled={false} />);

    const button = screen.getByRole("button", {
      name: "Google sign-in not configured",
    });
    expect(button).toBeDisabled();
    expect(signInSocial).not.toHaveBeenCalled();
  });

  it("invokes Better Auth Google social sign-in with the callback URL", async () => {
    const user = userEvent.setup();
    signInSocial.mockResolvedValue({ data: {} });

    render(
      <GoogleButton enabled callbackURL="/customers" label="Continue with Google" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/customers",
    });
  });

  it("shows a loading state and prevents duplicate clicks while pending", async () => {
    const user = userEvent.setup();
    let resolveSignIn: ((value: { data: object }) => void) | undefined;
    signInSocial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    render(<GoogleButton enabled />);

    const button = screen.getByRole("button", { name: "Continue with Google" });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
    expect(screen.getByText("Continuing with Google…")).toBeInTheDocument();

    await user.click(button);
    expect(signInSocial).toHaveBeenCalledTimes(1);

    resolveSignIn?.({ data: {} });
    await waitFor(() => {
      expect(signInSocial).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces a safe error when Google sign-in fails", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    signInSocial.mockResolvedValue({
      error: { message: "provider_secret=super-secret-value" },
    });

    render(<GoogleButton enabled onError={onError} />);

    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        "Unable to continue with Google. Please try again or use email instead.",
      );
    });
    expect(onError.mock.calls[0]?.[0]).not.toMatch(/secret/i);
  });
});
