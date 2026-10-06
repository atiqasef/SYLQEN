export const siteConfig = {
  name: "SYLQEN",
  shortName: "SYLQEN",
  description:
    "AI-powered Business Operating System for operations, CRM, finance, teams, and automation.",
  url: "https://sylqen.vercel.app",
} as const;

export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
  /** Placeholder until the module is implemented */
  comingSoon?: boolean;
};

/**
 * Shell navigation placeholders. Links that are not yet implemented
 * remain visible but clearly marked as upcoming.
 */
export const primaryNav: NavItem[] = [
  { title: "Overview", href: "/" },
  { title: "Customers", href: "/customers" },
  { title: "Products", href: "/products" },
  { title: "Projects", href: "/projects" },
  { title: "Finance", href: "/finance", comingSoon: true, disabled: true },
  { title: "Team", href: "/team", comingSoon: true, disabled: true },
  { title: "Analytics", href: "/analytics", comingSoon: true, disabled: true },
  { title: "Automations", href: "/automations", comingSoon: true, disabled: true },
];

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", comingSoon: true, disabled: true },
  { title: "Integrations", href: "/integrations", comingSoon: true, disabled: true },
];
