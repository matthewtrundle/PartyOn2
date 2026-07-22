import type { HqIconName } from './icons';

/**
 * Single source of truth for HQ shell navigation: mobile bottom tabs,
 * desktop sidebar groups, the More sheet grid, and app-bar screen titles.
 * `match` prefixes carry over the grouped active-state behavior from the
 * pre-shell layouts (e.g. /ops/boat-schedule lights up Orders).
 */
export type StaffRole = 'admin' | 'employee';

export type BadgeKey = 'orders' | 'recs' | 'leads';

export interface NavDest {
  href: string;
  label: string;
  icon: HqIconName;
  match: string[];
  /** Roles that see this destination. Omitted = everyone. */
  roles?: StaffRole[];
  badge?: BadgeKey;
  /** Absolute URL to another app — renders a plain <a target="_blank">. */
  external?: boolean;
}

/** The four route tabs; the fifth tab (More) is shell chrome, not a route. */
export const MOBILE_TABS: NavDest[] = [
  { href: '/ops/today', label: 'Today', icon: 'today', match: ['/ops/today'] },
  {
    href: '/ops/orders',
    label: 'Orders',
    icon: 'orders',
    match: ['/ops/orders', '/ops/boat-schedule', '/ops/group-orders'],
    badge: 'orders',
  },
  {
    href: '/ops/products',
    label: 'Catalog',
    icon: 'catalog',
    match: ['/ops/products', '/ops/inventory', '/ops/collections'],
  },
  {
    href: '/ops/events',
    label: 'Events',
    icon: 'events',
    match: ['/ops/events', '/ops/full-moon', '/ops/rsvps'],
  },
];

/** Admin destinations shown in the More sheet and the sidebar BUSINESS group. */
export const BUSINESS_DESTS: NavDest[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard', match: ['/admin/dashboard'], roles: ['admin'] },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics', match: ['/admin/analytics'], roles: ['admin'] },
  { href: '/admin/customers', label: 'Customers', icon: 'customers', match: ['/admin/customers'], roles: ['admin'] },
  { href: '/admin/leads', label: 'Leads', icon: 'leads', match: ['/admin/leads'], roles: ['admin'], badge: 'leads' },
  { href: 'https://crm.partyondelivery.com', label: 'CRM', icon: 'crm', match: [], roles: ['admin'], external: true },
  { href: '/admin/emails', label: 'Email', icon: 'email', match: ['/admin/emails', '/admin/email-signups'], roles: ['admin'] },
  { href: '/admin/recommendations', label: 'Recs', icon: 'recs', match: ['/admin/recommendations'], roles: ['admin'], badge: 'recs' },
  { href: '/admin/finance', label: 'Money', icon: 'money', match: ['/admin/finance'], roles: ['admin'] },
  { href: '/admin/strategy', label: 'Game Plan', icon: 'gameplan', match: ['/admin/strategy'], roles: ['admin'] },
  { href: '/admin/reports', label: 'Reports', icon: 'reports', match: ['/admin/reports'], roles: ['admin'] },
  { href: '/admin/affiliates', label: 'Partners', icon: 'partners', match: ['/admin/affiliates', '/admin/promotions', '/admin/premiere-credits'], roles: ['admin'] },
];

/** Second More-sheet group. */
export const APP_DESTS: NavDest[] = [
  { href: '/admin/brians-stuff', label: "Brian's Stuff", icon: 'brians', match: ['/admin/brians-stuff'], roles: ['admin'] },
  { href: '/admin/settings', label: 'Settings', icon: 'settings', match: ['/admin/settings'], roles: ['admin'] },
];

/** Desktop sidebar: operate group = tabs + Agent; business group below. */
export const SIDEBAR_OPERATE: NavDest[] = [
  ...MOBILE_TABS,
  { href: '/ops/agent', label: 'Agent', icon: 'agent', match: ['/ops/agent'], roles: ['admin'] },
];

/** App-bar screen titles by longest matching prefix. */
const SCREEN_TITLES: Array<[string, string]> = [
  ['/ops/today', 'Today'],
  ['/ops/orders/create', 'New Invoice'],
  ['/ops/orders', 'Orders'],
  ['/ops/boat-schedule', 'Boats'],
  ['/ops/group-orders', 'Orders'],
  ['/ops/products', 'Catalog'],
  ['/ops/inventory', 'Catalog'],
  ['/ops/collections', 'Catalog'],
  ['/ops/events', 'Events'],
  ['/ops/full-moon', 'Events'],
  ['/ops/rsvps', 'Events'],
  ['/ops/agent', 'Agent'],
  ['/admin/dashboard', 'Dashboard'],
  ['/admin/strategy', 'Game Plan'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/customers', 'Customers'],
  ['/admin/leads', 'Leads'],
  ['/admin/emails', 'Email'],
  ['/admin/email-signups', 'Email'],
  ['/admin/recommendations', 'Recommendations'],
  ['/admin/finance', 'Money'],
  ['/admin/reports', 'Reports'],
  ['/admin/affiliates', 'Partners'],
  ['/admin/promotions', 'Partners'],
  ['/admin/premiere-credits', 'Partners'],
  ['/admin/brians-stuff', "Brian's Stuff"],
  ['/admin/settings', 'Settings'],
  ['/admin/operations', 'Operations'],
  ['/admin/experiments', 'Experiments'],
  ['/admin/features', 'Features'],
  ['/admin/sync', 'Sync'],
  ['/admin/ai-assistant', 'AI Assistant'],
];

export function screenTitleFor(pathname: string): string {
  let best = '';
  let title = 'Party On HQ';
  for (const [prefix, t] of SCREEN_TITLES) {
    if (
      (pathname === prefix || pathname.startsWith(`${prefix}/`)) &&
      prefix.length > best.length
    ) {
      best = prefix;
      title = t;
    }
  }
  return title;
}

export function isDestActive(dest: NavDest, pathname: string): boolean {
  return dest.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function visibleTo(dest: NavDest, role: StaffRole | null): boolean {
  if (!dest.roles) return true;
  return role !== null && dest.roles.includes(role);
}
