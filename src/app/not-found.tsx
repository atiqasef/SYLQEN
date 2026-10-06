import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <EmptyState
        className="w-full max-w-lg"
        title="Page not found"
        description="The page you requested does not exist or has moved."
        action={
          <Button asChild>
            <Link href="/">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
