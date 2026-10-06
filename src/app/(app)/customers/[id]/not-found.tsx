import { EmptyState } from "@/components/feedback/empty-state";

export default function CustomerNotFound() {
  return (
    <EmptyState
      title="Customer not found"
      description="This customer does not exist in your workspace, or the link is invalid."
    />
  );
}
