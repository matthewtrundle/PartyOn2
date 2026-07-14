'use client';

/**
 * Universal lead-magnet modal.
 *
 * Renders a luxe black-and-gold popup over the page with:
 *   - Preview image of the flyer/PDF
 *   - Headline + sub
 *   - Email + name + (optional) phone form
 *   - On submit → fires lead-event API + opens the reward URL
 *
 * Built so every magnet in LEAD_MAGNETS shares this UI; per-magnet copy
 * comes from the config.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { sendLeadEvent } from '@/lib/leads/client';
import SmsConsentCheckbox from '@/components/consent/SmsConsentCheckbox';
import type { LeadMagnet } from '@/lib/leadMagnet/config';

type Props = {
  magnet: LeadMagnet;
  open: boolean;
  onClose: (reason: 'dismiss' | 'submit') => void;
  /** Optional override for headline ("preview" mode in the flyer page). */
  modeBadge?: string;
};

export default function LeadMagnetModal({ magnet, open, onClose, modeBadge }: Props) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // A2P 10DLC: SMS opt-in is an affirmative action — default unchecked.
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastBlurredRef = useRef<Record<string, string>>({});

  // Fire a partial-submit lead-event whenever a contact field blurs with a
  // value. Lets a lead show up in /admin/brians-stuff?tab=leads even if
  // the user closes the modal without submitting.
  const onFieldBlur = (field: 'firstName' | 'email' | 'phone', value: string) => {
    const v = value.trim();
    if (!v) return;
    if (lastBlurredRef.current[field] === v) return;
    lastBlurredRef.current[field] = v;
    void sendLeadEvent({
      type: 'FIELD_BLUR',
      widget: 'EMAIL_SIGNUP',
      fieldName: field,
      fieldValue: v,
      identify: { [field]: v },
      metadata: {
        leadMagnetId: magnet.id,
        flow: 'lead-magnet-partial',
      },
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  };

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email || !firstName) return;
    setSubmitting(true);

    // Fire lead-event (creates / promotes the Lead row to SUBMITTED).
    await sendLeadEvent({
      type: 'FORM_SUBMIT',
      widget: 'EMAIL_SIGNUP',
      identify: { firstName, email, phone: phone || undefined },
      setStatus: 'SUBMITTED',
      metadata: {
        leadMagnetId: magnet.id,
        rewardUrl: magnet.rewardUrl,
        flow: 'lead-magnet',
        // A2P 10DLC consent proof: only true when a phone was given AND the
        // customer affirmatively checked the (unchecked-by-default) opt-in.
        smsConsent: phone.trim() ? smsConsent : false,
      },
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    // Send the actual welcome email via Resend. Failure is non-blocking —
    // the Lead row is already saved, so we don't gate the success UI on it.
    try {
      await fetch('/api/v1/lead-magnet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
          firstName,
          email,
          phone: phone || null,
          magnetId: magnet.id,
          magnetTitle: magnet.title,
          rewardUrl: magnet.rewardUrl,
          rewardCta: magnet.cta,
        }),
      });
    } catch (err) {
      console.warn('[lead-magnet] email request failed', err);
    }

    setSubmitted(true);
    setSubmitting(false);
    // Auto-open the reward in a new tab + close modal after a short beat.
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.open(magnet.rewardUrl, '_blank', 'noopener');
      }
      onClose('submit');
    }, 1100);
  };

  if (!open) return null;

  const T = magnet.accent;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(5,10,20,0.82)' }}
      onClick={() => onClose('dismiss')}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden shadow-2xl grid grid-cols-1 sm:grid-cols-2"
        style={{
          background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => onClose('dismiss')}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-900 text-xl font-bold shadow-md"
        >
          ×
        </button>

        {/* Visual side */}
        <div
          className="relative min-h-[200px] sm:min-h-[460px] overflow-hidden"
          style={{ background: T.navy }}
        >
          {magnet.previewImage && (
            <Image
              src={magnet.previewImage}
              alt="Flyer preview"
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover opacity-65"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(10,15,25,0.55) 0%, rgba(10,15,25,0.85) 100%)',
            }}
          />
          <div className="relative h-full flex flex-col justify-end p-5 sm:p-6 text-white">
            <div
              className="inline-block self-start px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest mb-3"
              style={{ background: T.primary, color: T.primaryText }}
            >
              {modeBadge ?? 'FREE · LIMITED RELEASE'}
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold leading-tight tracking-wide mb-2">
              {magnet.title}
            </div>
            <p className="text-sm opacity-90 leading-snug">{magnet.reward}</p>
          </div>
        </div>

        {/* Form side */}
        <div className="p-5 sm:p-6 flex flex-col justify-center max-h-[95vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-6">
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ background: T.primary, color: T.primaryText }}
              >
                <span className="text-2xl font-bold">✓</span>
              </div>
              <h3 className="font-heading text-xl font-bold mb-1" style={{ color: T.navy }}>
                You&apos;re in, {firstName}.
              </h3>
              <p className="text-sm text-gray-700">
                Opening your copy now and sending it to{' '}
                <strong style={{ color: T.navy }}>{email}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div
                  className="text-[10px] font-bold tracking-widest mb-1"
                  style={{ color: T.primary }}
                >
                  PARTY ON DELIVERY · AUSTIN
                </div>
                <h3
                  className="font-heading text-xl sm:text-2xl font-bold leading-tight tracking-wide"
                  style={{ color: T.navy }}
                >
                  {magnet.subhead}
                </h3>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-2.5"
                // Tell the global form watcher this form self-instruments —
                // prevents double-capture of the same field.
                data-lead-capture="manual"
                data-lead-widget="EMAIL_SIGNUP"
              >
                <Input
                  label="First name"
                  value={firstName}
                  onChange={setFirstName}
                  onBlur={(v) => onFieldBlur('firstName', v)}
                  required
                  navy={T.navy}
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  onBlur={(v) => onFieldBlur('email', v)}
                  required
                  navy={T.navy}
                />
                {magnet.askPhone && (
                  <>
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      onBlur={(v) => onFieldBlur('phone', v)}
                      navy={T.navy}
                    />
                    <SmsConsentCheckbox
                      id="lead-magnet-sms-consent"
                      checked={smsConsent}
                      onChange={setSmsConsent}
                      className="pt-1"
                    />
                  </>
                )}
                <button
                  type="submit"
                  disabled={submitting || !firstName || !email}
                  className="w-full mt-1 py-3.5 rounded-md font-bold text-sm tracking-widest transition-transform hover:scale-[1.01] disabled:opacity-40"
                  style={{ background: T.primary, color: T.primaryText }}
                >
                  {submitting ? 'SENDING…' : magnet.cta.toUpperCase()}
                </button>
              </form>

              <ul className="mt-3 space-y-1 text-[11px] text-gray-600">
                <li>✓ Instant download. No follow-up sales spam.</li>
                <li>✓ Unsubscribe with one click any time.</li>
                <li>✓ Built by the team behind 500+ Austin parties.</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  onBlur,
  required,
  type = 'text',
  navy,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  onBlur?: (s: string) => void;
  required?: boolean;
  type?: string;
  navy: string;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-bold tracking-widest mb-1"
        style={{ color: '#6B7280' }}
      >
        {label.toUpperCase()}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        className="w-full rounded-md px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-blue-500"
        style={{ color: navy }}
      />
    </div>
  );
}
