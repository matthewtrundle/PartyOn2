/**
 * Shared honeypot (spam-trap) field definition for public lead-capture forms.
 *
 * A honeypot is a hidden input a human never sees, so any non-empty value means
 * a bot filled it and the submission can be dropped. The catch: if the field's
 * `name` matches a browser / password-manager autofill heuristic (company,
 * organization, website, url, email, name, phone, tel, address, fax, username),
 * iOS Safari / Chrome autofill fills the hidden trap FOR A REAL VISITOR — and
 * the server then drops that real person as a bot. That silent-drop is exactly
 * what PR #148 fixed on the event RSVP form (honeypot `website_url` →
 * `hp_event_notes`).
 *
 * So the canonical trap name here carries NO autofill token. Keep the rendered
 * input `name`, the submitted payload key, and the server check
 * (`isHoneypotTripped`) all pointed at {@link HONEYPOT_FIELD}.
 */
export const HONEYPOT_FIELD = 'hp_partner_notes';

/**
 * Legacy trap field names older clients still send. No real form field has ever
 * used these names, so the server keeps checking them — it costs nothing and
 * removes any rollout window where a not-yet-deployed page (still sending
 * `website_url`) would have an inert trap. They are safe to keep checking
 * precisely because no visible input renders them anymore, so a real visitor's
 * autofill can never populate them.
 */
export const LEGACY_HONEYPOT_FIELDS = ['website_url', 'fax_number'] as const;

/** Every field name treated as a honeypot on the server (new + legacy). */
export const ALL_HONEYPOT_FIELDS: readonly string[] = [
  HONEYPOT_FIELD,
  ...LEGACY_HONEYPOT_FIELDS,
];

/**
 * Whether any honeypot field carries a non-empty value — i.e. a field a human
 * can't see got filled. Returns the tripped field name so the caller can log
 * which trap fired; a real person caught here is then visible in logs instead
 * of vanishing.
 *
 * Mirrors the event RSVP route: only a non-empty *string* trips it, so a future
 * real field that happens to be numeric/boolean can never be mistaken for a
 * bot.
 */
export function isHoneypotTripped(
  body: Record<string, unknown> | null | undefined,
): { tripped: boolean; field: string | null } {
  if (!body || typeof body !== 'object') return { tripped: false, field: null };
  for (const field of ALL_HONEYPOT_FIELDS) {
    const value = (body as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return { tripped: true, field };
    }
  }
  return { tripped: false, field: null };
}

/**
 * The honeypot key to spread into a form's JSON payload when the form sends an
 * always-empty trap value (rather than rendering a live trap input). Keeps the
 * payload key name unified with the server check, so no autofill-prone name
 * (`website_url`/`fax_number`) ever appears in a form again.
 */
export function blankHoneypotFields(): Record<string, string> {
  return { [HONEYPOT_FIELD]: '' };
}
