'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';

/**
 * A2P 10DLC-compliant SMS opt-in checkbox.
 *
 * Twilio Trust & Safety requires SMS consent to be an **affirmative user
 * action** — this checkbox MUST default to unchecked and never be pre-checked,
 * and SMS consent must never be a condition of purchase. The label carries the
 * CTIA-required elements: program description, message frequency, msg & data
 * rates, STOP/HELP, and a link to the SMS terms.
 *
 * Used on every site surface that collects a phone number for texting
 * (lead-magnet popup, checkout). Keep the copy identical across surfaces.
 */
export default function SmsConsentCheckbox({
  checked,
  onChange,
  id = 'sms-consent',
  className = '',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}): ReactElement {
  return (
    <label htmlFor={id} className={`flex items-start gap-2 text-sm cursor-pointer ${className}`}>
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
      />
      <span className="text-gray-600 leading-snug">
        Text me order updates and occasional offers from Party On Delivery. Message
        frequency varies; msg &amp; data rates may apply. Reply STOP to opt out, HELP for
        help. Consent is not a condition of purchase. See our{' '}
        <Link href="/privacy" target="_blank" className="underline hover:text-gray-900">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
