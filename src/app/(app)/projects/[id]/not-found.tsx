import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <EmptyState
      title="Project not found"
      description="This project does not exist in your workspace, or the link is invalid."
      action={
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      }
    />
  );
}
