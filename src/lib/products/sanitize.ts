/**
 * Response sanitizers for public product endpoints.
 */

/**
 * Remove cost fields from variant rows before returning them on public
 * (unauthenticated) endpoints. `ProductVariant.costPerUnit` is internal
 * margin data and must never reach the storefront.
 */
export function stripVariantCosts<T extends { costPerUnit: unknown }>(
  variants: T[]
): Omit<T, 'costPerUnit'>[] {
  return variants.map((variant) => {
    const { costPerUnit, ...rest } = variant;
    void costPerUnit;
    return rest;
  });
}
