import Link from "next/link";

import type { CustomerDTO } from "@/server/customers/types";

type CustomersTableProps = {
  customers: CustomerDTO[];
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CustomersTable({ customers }: CustomersTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-3 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Company
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Phone
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Added
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <th scope="row" className="px-3 py-3 font-medium text-foreground">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {customer.name}
                  </Link>
                </th>
                <td className="px-3 py-3 text-muted-foreground">{customer.email}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {customer.company ?? "—"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {customer.phone ?? "—"}
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {formatDate(customer.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label="Customers">
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link
              href={`/customers/${customer.id}`}
              className="block px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="font-medium text-foreground">{customer.name}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {customer.email}
              </p>
              {customer.company ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {customer.company}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
