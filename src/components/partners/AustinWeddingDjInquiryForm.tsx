'use client';

import { useState, useRef, type FormEvent, type ReactElement } from 'react';

/**
 * Inquiry form for the Austin Wedding DJ partner landing page (WS3).
 *
 * Posts to the shared `/api/partners/inquiry` endpoint with
 * `source: 'wedding-dj-landing'` so ops + Zapier + Resend all pick it up
 * alongside other partner inquiries.
 */
interface Props {
  refCode: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function AustinWeddingDjInquiryForm({ refCode }: Props): ReactElement {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const formLoadedAtRef = useRef<number>(Date.now());

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const payload = {
      contactName: String(formData.get('contactName') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      eventDate: String(formData.get('eventDate') || ''),
      venue: String(formData.get('venue') || ''),
      guestCount: String(formData.get('guestCount') || ''),
      interests: String(formData.get('interests') || ''),
      message: String(formData.get('message') || ''),
      partnerType: 'wedding-dj',
      source: 'wedding-dj-landing',
      refCode,
      // honeypot — must stay empty
      website_url: String(formData.get('website_url') || ''),
      _formLoadedAt: formLoadedAtRef.current,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/partners/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Submission failed');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  if (status === 'success') {
    return (
      <div className="card text-center">
        <h3 className="font-heading text-2xl text-gray-900 mb-3 tracking-[0.05em]">
          Inquiry received.
        </h3>
        <p className="text-base text-gray-700 mb-4">
          We&apos;ll confirm availability and send a bar quote within 24 hours. Keep
          an eye on your email.
        </p>
        <a href={`/order?ref=${refCode}&p=wedding`} className="btn-cart inline-block">
          Start The Bar Order →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* honeypot */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dj-contact-name" className="block text-base font-semibold text-gray-900 mb-1">
            Your name
          </label>
          <input
            id="dj-contact-name"
            name="contactName"
            type="text"
            required
            className="input-premium w-full"
            placeholder="Full name"
          />
        </div>
        <div>
          <label htmlFor="dj-email" className="block text-base font-semibold text-gray-900 mb-1">
            Email
          </label>
          <input
            id="dj-email"
            name="email"
            type="email"
            required
            className="input-premium w-full"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dj-phone" className="block text-base font-semibold text-gray-900 mb-1">
            Phone
          </label>
          <input
            id="dj-phone"
            name="phone"
            type="tel"
            className="input-premium w-full"
            placeholder="(512) 555-1234"
          />
        </div>
        <div>
          <label htmlFor="dj-date" className="block text-base font-semibold text-gray-900 mb-1">
            Wedding date
          </label>
          <input
            id="dj-date"
            name="eventDate"
            type="date"
            className="input-premium w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dj-venue" className="block text-base font-semibold text-gray-900 mb-1">
            Venue (if booked)
          </label>
          <input
            id="dj-venue"
            name="venue"
            type="text"
            className="input-premium w-full"
            placeholder="Venue name or city"
          />
        </div>
        <div>
          <label htmlFor="dj-guests" className="block text-base font-semibold text-gray-900 mb-1">
            Guest count
          </label>
          <input
            id="dj-guests"
            name="guestCount"
            type="number"
            min={10}
            max={500}
            className="input-premium w-full"
            placeholder="e.g. 120"
          />
        </div>
      </div>

      <div>
        <label htmlFor="dj-interests" className="block text-base font-semibold text-gray-900 mb-1">
          What do you need?
        </label>
        <select id="dj-interests" name="interests" className="input-premium w-full">
          <option value="dj-only">DJ only</option>
          <option value="bar-only">Bar service only</option>
          <option value="dj-and-bar">DJ + bar bundle</option>
          <option value="not-sure">Not sure — send me both quotes</option>
        </select>
      </div>

      <div>
        <label htmlFor="dj-message" className="block text-base font-semibold text-gray-900 mb-1">
          Anything else?
        </label>
        <textarea
          id="dj-message"
          name="message"
          rows={4}
          className="input-premium w-full"
          placeholder="Music vibe, must-play songs, dietary notes for the bar, etc."
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMessage || 'Something went wrong. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="btn-cart w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Check Availability'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        We&apos;ll respond within 24 hours. By submitting you agree to our terms.
      </p>
    </form>
  );
}
