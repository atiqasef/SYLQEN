import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type CustomersSearchFormProps = {
  q?: string;
  pageSize: number;
};

export function CustomersSearchForm({ q, pageSize }: CustomersSearchFormProps) {
  return (
    <form
      method="get"
      action="/customers"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      role="search"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="customers-search">Search customers</Label>
        <Input
          id="customers-search"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Search by name, email, company, or phone"
          maxLength={100}
          autoComplete="off"
        />
      </div>
      {pageSize !== 20 ? (
        <input type="hidden" name="pageSize" value={pageSize} />
      ) : null}
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
