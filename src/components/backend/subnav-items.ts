import type { SectionSubNavItem } from './SectionSubNav';

/** Ops Products group: catalog, stock levels, collections. */
export const CATALOG_SUBNAV: SectionSubNavItem[] = [
  { href: '/ops/products', label: 'Products' },
  { href: '/ops/inventory', label: 'Inventory' },
  { href: '/ops/collections', label: 'Collections' },
];

/** Admin Email group: template previews, follow-up engine, collected signups. */
export const EMAIL_SUBNAV: SectionSubNavItem[] = [
  { href: '/admin/emails', label: 'Templates' },
  { href: '/admin/emails/followups', label: 'Follow-Ups' },
  { href: '/admin/email-signups', label: 'Signups' },
];

/** Admin Partners group: affiliate program + discount codes. */
export const PARTNERS_SUBNAV: SectionSubNavItem[] = [
  { href: '/admin/affiliates', label: 'Affiliates' },
  { href: '/admin/promotions', label: 'Promotions' },
];
