'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HONEYPOT_FIELD } from '@/lib/forms/honeypot';
import { getAttribution } from '@/lib/analytics/attribution';

interface VacationRentalLeadCaptureProps {
  /**
   * Source slug forwarded to /api/partners/inquiry. The default
   * 'vacation-rental-onepager' triggers the partner one-pager email
   * (PDF + Calendly CTA).
   */
  source?: string;
}

const PROPERTY_COUNT_OPTIONS = [
  { value: '', label: 'Properties (optional)' },
  { value: '1-5', label: '1–5 properties' },
  { value: '6-20', label: '6–20 properties' },
  { value: '20+', label: '20+ properties' },
];

export default function VacationRentalLeadCapture({
  source = 'vacation-rental-onepager',
}: VacationRentalLeadCaptureProps) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [propertyCount, setPropertyCount] = useState('');
  const [signupQrId, setSignupQrId] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formLoadedAt = useRef(Date.now());

  // Capture ?qr=<id> from the URL so we can attribute the signup to a
  // specific boat / placement when the partner scans a QR code.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qr = params.get('qr');
      if (qr) setSignupQrId(qr);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    if (!firstName.trim()) {
      setErrorMessage('First name is required.');
      setStatus('error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email.');
      setStatus('error');
      return;
    }

    try {
      const response = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: firstName.trim(),
          email: email.trim(),
          businessName: companyName.trim() || undefined,
          numberOfRooms: propertyCount || undefined,
          partnerType: 'Vacation Rental',
          source,
          signupQrId: signupQrId || undefined,
          submittedAt: new Date().toISOString(),
          attribution: getAttribution(),
          _formLoadedAt: formLoadedAt.current,
          [HONEYPOT_FIELD]: honeypot,
        }),
      });

      const result = await response.json();
      // Require a persisted inquiryId before celebrating — a honeypot/too-fast/
      // gibberish drop (or a failed save) returns success:true without one.
      if (!response.ok || !result.success || !result.inquiryId) {
        throw new Error(result.error || 'Submission failed');
      }

      setStatus('success');
      setFirstName('');
      setEmail('');
      setCompanyName('');
      setPropertyCount('');
    } catch (err) {
      console.error('Lead capture error:', err);
      setErrorMessage('Something went wrong. Try again or email allan@partyondelivery.com.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-brand-yellow text-navy rounded-lg px-6 py-5 max-w-2xl mx-auto text-center">
        <div className="font-heading text-2xl tracking-[0.05em]">
          Check your inbox — the one-pager is on the way.
        </div>
        <p className="text-sm mt-2 text-navy/80">
          We&apos;ll also follow up to schedule a 15-min call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          required
          autoComplete="given-name"
          className="flex-1 px-5 py-4 bg-white/95 text-gray-900 placeholder-gray-500 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow"
        />
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          autoComplete="email"
          className="flex-1 px-5 py-4 bg-white/95 text-gray-900 placeholder-gray-500 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow"
        />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company name (optional)"
          autoComplete="organization"
          className="flex-1 px-5 py-4 bg-white/95 text-gray-900 placeholder-gray-500 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow"
        />
        <select
          name="propertyCount"
          value={propertyCount}
          onChange={(e) => setPropertyCount(e.target.value)}
          className="flex-1 px-5 py-4 bg-white/95 text-gray-900 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-brand-yellow"
        >
          {PROPERTY_COUNT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-3 w-full bg-brand-blue hover:bg-brand-blue-dark text-white font-heading font-bold tracking-[0.08em] uppercase text-base px-8 py-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Get the partner one-pager →'}
      </button>

      {/* Honeypot — hidden from humans; bots that fill it are dropped. The name
          carries no browser-autofill mapping so a real visitor is never trapped
          (see @/lib/forms/honeypot). */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {status === 'error' && (
        <p className="mt-3 text-sm text-brand-yellow text-center">{errorMessage}</p>
      )}

      <p className="mt-4 text-xs text-cream/60 text-center tracking-wide">
        We&apos;ll email the partner one-pager (PDF) and a link to schedule a 15-min call. No spam.
      </p>
    </form>
  );
}
