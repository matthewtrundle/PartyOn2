/**
 * Minimal, dependency-free HTML escape for interpolating untrusted text into an
 * HTML email body. Escapes the five characters that matter in text-node and
 * quoted-attribute contexts. `&` is replaced first so an existing safe entity is
 * not mangled. Coerces null/undefined to '' so callers can pass optional fields
 * (deliveryInstructions, address2, …) directly. (CWE-79 / CWE-116.)
 *
 * This is the guard for HTML sinks. It is complementary to `sanitizeName`
 * (src/lib/leads/leadCapture.ts), which neutralizes control/format-char spoofing
 * for plaintext/JSON/JSX sinks but deliberately does NOT touch `<`, `>`, `&`, or
 * quotes — so a stored `Order.customerName` reaches these templates already
 * control-char-clean, yet still MUST be run through this before entering HTML.
 * A shared home for what was previously ~12 ad-hoc copies scattered across the
 * codebase; new email templates should import this rather than re-implement it.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
