/**
 * Shortage-list aggregation, extracted verbatim from the ops Orders page.
 *
 * Aggregates per-item "short by" counts across a set of orders, using the
 * caller-supplied pick state lookup (typically the localStorage cache after
 * a server prefetch). Bundle components are counted individually under a
 * display title that includes the variant; items WITH bundle components are
 * never counted at the parent level.
 */

import type { ItemChecks, Order, ShortageRow } from './types';

/**
 * Build the aggregated shortage list for the given orders.
 *
 * @param orders - the selected orders (with items + bundleComponents)
 * @param getChecks - pick state lookup per order id (e.g. loadCachedChecks)
 */
export function buildShortageList(
  orders: Order[],
  getChecks: (orderId: string) => ItemChecks,
): ShortageRow[] {
  const aggregated = new Map<string, { title: string; quantity: number; orderNumbers: Set<number> }>();

  for (const order of orders) {
    const orderChecks = getChecks(order.id);
    for (const item of order.items) {
      const hasBundle = item.bundleComponents && item.bundleComponents.length > 0;
      if (hasBundle) {
        for (const bc of item.bundleComponents!) {
          const bcKey = `${item.title}::${bc.title}`;
          const shortBy = orderChecks[bcKey]?.shortBy ?? 0;
          if (shortBy > 0) {
            const displayTitle = bc.variantTitle && bc.variantTitle !== 'Default Title'
              ? `${bc.title} (${bc.variantTitle})`
              : bc.title;
            const existing = aggregated.get(displayTitle);
            if (existing) {
              existing.quantity += shortBy;
              existing.orderNumbers.add(order.orderNumber);
            } else {
              aggregated.set(displayTitle, { title: displayTitle, quantity: shortBy, orderNumbers: new Set([order.orderNumber]) });
            }
          }
        }
      } else {
        const shortBy = orderChecks[item.title]?.shortBy ?? 0;
        if (shortBy > 0) {
          const existing = aggregated.get(item.title);
          if (existing) {
            existing.quantity += shortBy;
            existing.orderNumbers.add(order.orderNumber);
          } else {
            aggregated.set(item.title, { title: item.title, quantity: shortBy, orderNumbers: new Set([order.orderNumber]) });
          }
        }
      }
    }
  }

  return Array.from(aggregated.values())
    .map((entry) => ({ title: entry.title, quantity: entry.quantity, orderNumbers: Array.from(entry.orderNumbers).sort((a, b) => a - b) }))
    .sort((a, b) => b.quantity - a.quantity);
}
