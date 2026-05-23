'use client';

/**
 * GLOBAL FORM CAPTURE WATCHER
 *
 * Backstop lead-capture for every form on the site. Mounted once in the
 * root layout. Attaches a document-level `focusout` listener and, when an
 * input/textarea blurs with a contact-flavored value, fires a FIELD_BLUR
 * lead-event so the partial submission shows up in /admin/brians-stuff
 * → Leads — even if the specific form wasn't manually instrumented.
 *
 * Why a global hook instead of wiring each form?
 *   - Future forms get tracking for free
 *   - Third-party / partner pages get tracking for free
 *   - Removes the risk of an engineer adding a form and forgetting to
 *     thread the useLeadCapture hook through it
 *
 * Heuristics for "is this a contact field?"
 *   1. <input type="email">           → email
 *   2. <input type="tel">             → phone
 *   3. autocomplete="email|tel|name"  → email/phone/firstName/lastName
 *   4. name / id / placeholder matching email|phone|name patterns
 *
 * Anything that doesn't match falls through silently (no API call).
 *
 * Skipped contexts (we don't want internal-tool noise):
 *   - /admin, /ops, /dashboard, /affiliate (logged-in tools)
 *   - Any input inside an element with data-lead-capture="skip"
 *   - Any form-element whose modal already calls useLeadCapture()
 *     explicitly — those modals stamp the form root with
 *     data-lead-capture="manual" so we don't double-capture.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { sendLeadEvent, type LeadWidget } from '@/lib/leads/client';

const SKIP_PATH_PATTERNS = [
  /^\/admin(\/|$)/,
  /^\/ops(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/affiliate(\/|$)/,
  /^\/api\//,
];

const NAME_PATTERN = /name|fname|firstname|lastname|fullname/i;
const EMAIL_PATTERN = /email|e-mail/i;
const PHONE_PATTERN = /phone|tel\b|mobile|cell/i;

// Per-cookie de-dupe: don't re-fire the exact same field+value combo within
// a single tab session (cuts noise from autofocus → blur → re-blur cycles).
const recentByField = new Map<string, string>();

type FieldClassification = {
  fieldKind: 'firstName' | 'lastName' | 'email' | 'phone' | null;
  fieldName: string;
};

function classifyField(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): FieldClassification {
  const autocomplete = (el.getAttribute('autocomplete') ?? '').toLowerCase();
  const type = (el.getAttribute('type') ?? '').toLowerCase();
  const name = (el.getAttribute('name') ?? '').toLowerCase();
  const id = (el.id ?? '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') ?? '').toLowerCase();
  const aria = (el.getAttribute('aria-label') ?? '').toLowerCase();
  const haystack = `${name} ${id} ${placeholder} ${aria}`;

  if (type === 'email' || EMAIL_PATTERN.test(autocomplete) || EMAIL_PATTERN.test(haystack)) {
    return { fieldKind: 'email', fieldName: 'email' };
  }
  if (type === 'tel' || PHONE_PATTERN.test(autocomplete) || PHONE_PATTERN.test(haystack)) {
    return { fieldKind: 'phone', fieldName: 'phone' };
  }
  if (autocomplete === 'given-name' || /firstname|first-name|fname/i.test(name + id + placeholder + aria)) {
    return { fieldKind: 'firstName', fieldName: 'firstName' };
  }
  if (autocomplete === 'family-name' || /lastname|last-name|lname/i.test(name + id + placeholder + aria)) {
    return { fieldKind: 'lastName', fieldName: 'lastName' };
  }
  if (
    autocomplete === 'name' ||
    NAME_PATTERN.test(haystack)
  ) {
    return { fieldKind: 'firstName', fieldName: 'name' };
  }
  return { fieldKind: null, fieldName: name || id || 'unknown' };
}

function inferWidget(el: Element): LeadWidget {
  // Walk up the DOM looking for an explicit data-lead-widget tag.
  let node: Element | null = el;
  while (node) {
    const attr = node.getAttribute?.('data-lead-widget');
    if (attr) return attr.toUpperCase().replace(/-/g, '_') as LeadWidget;
    node = node.parentElement;
  }
  return 'OTHER';
}

function shouldSkip(el: Element): boolean {
  // 1) Honors-an-explicit-opt-out attribute anywhere up the tree.
  let node: Element | null = el;
  while (node) {
    const sentinel = node.getAttribute?.('data-lead-capture');
    if (sentinel === 'skip' || sentinel === 'manual') return true;
    node = node.parentElement;
  }
  return false;
}

// Min characters before a partial value is worth saving. 1 = save the
// instant they type anything (yes, even a single character). We err on
// the side of "save too much" because the dedupe + Lead upsert by email
// means duplicates collapse cleanly.
const MIN_CAPTURE_LEN = 1;
// Debounce window for in-progress typing. After this many ms of no
// keystrokes, we snapshot the current value.
const INPUT_DEBOUNCE_MS = 700;

type PendingEntry = {
  value: string;
  fieldKind: 'firstName' | 'lastName' | 'email' | 'phone';
  fieldName: string;
  widget: string;
};

export default function FormCaptureWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (SKIP_PATH_PATTERNS.some((re) => re.test(pathname))) return;

    // Most-recent in-progress value per field name. Drained on blur,
    // debounced input timer, OR beforeunload (via sendBeacon) so we never
    // lose what someone typed before closing the tab.
    const pending = new Map<string, PendingEntry>();
    let debounceId: number | null = null;

    const capture = (
      entry: PendingEntry,
      eventType: 'FIELD_BLUR' | 'FIELD_FOCUS' = 'FIELD_BLUR',
      via: 'blur' | 'typing' | 'beacon' = 'blur',
    ) => {
      // De-dupe identical re-fires.
      const dedupeKey = entry.fieldName;
      if (recentByField.get(dedupeKey) === entry.value) return;
      recentByField.set(dedupeKey, entry.value);
      pending.delete(dedupeKey);

      const identify: Record<string, string> = {};
      identify[entry.fieldKind] = entry.value;

      void sendLeadEvent({
        type: eventType,
        widget: entry.widget as Parameters<typeof sendLeadEvent>[0]['widget'],
        page: pathname,
        fieldName: entry.fieldName,
        fieldValue: entry.value,
        identify: identify as Parameters<typeof sendLeadEvent>[0]['identify'],
        metadata: { source: 'global-form-watcher', via },
      });
    };

    const scheduleFlush = () => {
      if (debounceId !== null) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        debounceId = null;
        for (const entry of pending.values()) {
          capture(entry, 'FIELD_FOCUS', 'typing');
        }
      }, INPUT_DEBOUNCE_MS);
    };

    const observe = (ev: Event, eventType: 'FIELD_BLUR' | 'FIELD_FOCUS') => {
      const t = ev.target;
      if (
        !(t instanceof HTMLInputElement) &&
        !(t instanceof HTMLTextAreaElement) &&
        !(t instanceof HTMLSelectElement)
      ) {
        return;
      }
      const type = (t.getAttribute('type') ?? '').toLowerCase();
      if (
        ['password', 'hidden', 'file', 'submit', 'button', 'checkbox', 'radio'].includes(
          type,
        )
      ) {
        return;
      }
      const value = ('value' in t ? t.value : '').trim();
      if (!value || value.length < MIN_CAPTURE_LEN) return;
      if (shouldSkip(t)) return;

      const { fieldKind, fieldName } = classifyField(t);
      if (!fieldKind) return;

      const widget = inferWidget(t);
      const entry: PendingEntry = { value, fieldKind, fieldName, widget };

      if (eventType === 'FIELD_BLUR') {
        // Blur = commit immediately, mark as final.
        capture(entry, 'FIELD_BLUR', 'blur');
      } else {
        // Input = stash for debounced flush. Pre-emptively capture once we
        // see a fully-formed email so we don't lose it if they close the
        // tab mid-debounce.
        pending.set(fieldName, entry);
        const looksLikeEmail =
          fieldKind === 'email' && /.+@.+\..+/.test(value);
        const looksLikePhone =
          fieldKind === 'phone' && value.replace(/\D/g, '').length >= 10;
        if (looksLikeEmail || looksLikePhone) {
          capture(entry, 'FIELD_FOCUS', 'typing');
        } else {
          scheduleFlush();
        }
      }
    };

    const onBlur = (ev: FocusEvent) => observe(ev, 'FIELD_BLUR');
    const onInput = (ev: Event) => observe(ev, 'FIELD_FOCUS');

    // Beacon flush — if the user closes the tab with text still in a
    // field that hasn't been committed, fire one last sendBeacon so we
    // don't lose the partial.
    const beaconFlush = () => {
      if (pending.size === 0) return;
      const payload = Array.from(pending.values()).map((entry) => ({
        type: 'FIELD_FOCUS',
        widget: entry.widget,
        page: pathname,
        fieldName: entry.fieldName,
        fieldValue: entry.value,
        identify: { [entry.fieldKind]: entry.value },
        metadata: { source: 'global-form-watcher', via: 'beacon' },
      }));
      try {
        for (const body of payload) {
          // sendBeacon is more reliable than fetch on unload.
          const blob = new Blob([JSON.stringify(body)], {
            type: 'application/json',
          });
          navigator.sendBeacon?.('/api/v1/landing/lead-event', blob);
        }
        pending.clear();
      } catch {
        /* swallow */
      }
    };

    document.addEventListener('focusout', onBlur, true);
    document.addEventListener('input', onInput, true);
    window.addEventListener('pagehide', beaconFlush);
    window.addEventListener('beforeunload', beaconFlush);

    return () => {
      document.removeEventListener('focusout', onBlur, true);
      document.removeEventListener('input', onInput, true);
      window.removeEventListener('pagehide', beaconFlush);
      window.removeEventListener('beforeunload', beaconFlush);
      if (debounceId !== null) window.clearTimeout(debounceId);
    };
  }, [pathname]);

  return null;
}
