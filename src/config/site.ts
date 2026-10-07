export const siteConfig = {
  name: "SYLQEN",
  shortName: "SYLQEN",
  tagline: "Business Operating System",
  description:
    "AI-ready Business Operating System for operations, CRM, finance, teams, and automation.",
  url: "https://sylqen.vercel.app",
} as const;

export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
  /** Reserved for future unavailable modules; unused while all routes ship. */
  comingSoon?: boolean;
};

/** Primary authenticated shell navigation. */
export const primaryNav: NavItem[] = [
  { title: "Overview", href: "/" },
  { title: "Customers", href: "/customers" },
  { title: "Products", href: "/products" },
  { title: "Projects", href: "/projects" },
  { title: "Invoices", href: "/invoices" },
  { title: "Payments", href: "/payments" },
  { title: "Finance", href: "/finance" },
  { title: "Team", href: "/team" },
  { title: "Analytics", href: "/analytics" },
  { title: "Automations", href: "/automations" },
];

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings" },
  { title: "Integrations", href: "/integrations" },
];
