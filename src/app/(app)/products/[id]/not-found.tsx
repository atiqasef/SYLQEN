import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PackageIcon } from "@/components/layout/icons";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <EmptyState
      icon={<PackageIcon className="size-8" />}
      title="Product not found"
      description="This product does not exist in your workspace, or the link is invalid."
      action={
        <Button asChild variant="outline">
          <Link href="/products">Back to products</Link>
        </Button>
      }
    />
  );
}
