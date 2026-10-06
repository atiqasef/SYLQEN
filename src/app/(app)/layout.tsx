import { AppShell } from "@/components/layout/app-shell";
import { requireVerifiedPageSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireVerifiedPageSession();

  return <AppShell session={session}>{children}</AppShell>;
}
