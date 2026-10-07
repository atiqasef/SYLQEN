import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FacebookButton } from "@/components/auth/facebook-button";

const signInSocial = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

describe("FacebookButton", () => {
  beforeEach(() => {
    signInSocial.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a disabled placeholder when Facebook OAuth is not configured", () => {
    render(<FacebookButton enabled={false} />);

    const button = screen.getByRole("button", {
      name: "Facebook sign-in not configured",
    });
    expect(button).toBeDisabled();
    expect(signInSocial).not.toHaveBeenCalled();
  });

  it("invokes Better Auth Facebook social sign-in with the callback URL", async () => {
    const user = userEvent.setup();
    signInSocial.mockResolvedValue({ data: {} });

    render(
      <FacebookButton
        enabled
        callbackURL="/customers"
        label="Continue with Facebook"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue with Facebook" }),
    );

    expect(signInSocial).toHaveBeenCalledWith({
      provider: "facebook",
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

    render(<FacebookButton enabled />);

    const button = screen.getByRole("button", {
      name: "Continue with Facebook",
    });
    await user.click(button);

    expect(
      screen.getByRole("button", { name: "Continue with Facebook" }),
    ).toBeDisabled();
    expect(screen.getByText("Continuing with Facebook…")).toBeInTheDocument();

    await user.click(button);
    expect(signInSocial).toHaveBeenCalledTimes(1);

    resolveSignIn?.({ data: {} });
    await waitFor(() => {
      expect(signInSocial).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces a safe error when Facebook sign-in fails", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    signInSocial.mockResolvedValue({
      error: { message: "provider_secret=super-secret-value" },
    });

    render(<FacebookButton enabled onError={onError} />);

    await user.click(
      screen.getByRole("button", { name: "Continue with Facebook" }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        "Unable to continue with Facebook. Please try again or use email instead.",
      );
    });
    expect(onError.mock.calls[0]?.[0]).not.toMatch(/secret/i);
  });
});
