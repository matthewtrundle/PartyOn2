'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { createDashboardOrderV2 } from '@/lib/group-orders-v2/api-client';
import { getAttributionForDashboard } from '@/lib/analytics/attribution';
import type { StrPartnerConfig } from '@/lib/partners/str-partners';

interface PropertyPickerProps {
  /** The STR partner whose properties populate the dropdown. */
  config: StrPartnerConfig;
  /** Affiliate DB id — attributes the resulting orders to this partner. */
  affiliateId: string;
  /** Optional wrapper classes. */
  className?: string;
}

/** Sentinel <option> value for the "enter my own address" path. */
const CUSTOM = '__custom__';

/**
 * Guest-facing property picker for an STR partner landing page.
 *
 * The guest selects their rental from the partner's roster (pre-filling the
 * exact delivery address) or enters their own address, then we create a
 * group-order dashboard pre-filled with that address + partner attribution and
 * route them to `/dashboard/<code>`. Reuses `createDashboardOrderV2` — no
 * backend changes.
 */
export default function PropertyPicker({
  config,
  affiliateId,
  className,
}: PropertyPickerProps): ReactElement {
  const router = useRouter();
  const hasProperties = config.properties.length > 0;
  // Default to the prompt when there are properties, else jump to custom entry.
  const [selectedId, setSelectedId] = useState<string>(hasProperties ? '' : CUSTOM);
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isCustom = selectedId === CUSTOM;
  const selectedProperty = useMemo(
    () => config.properties.find((p) => p.id === selectedId) ?? null,
    [config.properties, selectedId]
  );

  async function handleStart(): Promise<void> {
    setError('');

    let deliveryAddress:
      | { address1: string; address2?: string; city: string; province: string; zip: string; country: string }
      | undefined;
    let tabName: string;

    if (isCustom) {
      if (!address1.trim() || !city.trim() || !zip.trim()) {
        setError('Enter your rental address, city, and ZIP.');
        return;
      }
      deliveryAddress = {
        address1: address1.trim(),
        city: city.trim(),
        province: 'TX',
        zip: zip.trim(),
        country: 'US',
      };
      tabName = 'Rental Delivery';
    } else if (selectedProperty) {
      deliveryAddress = {
        address1: selectedProperty.address1,
        address2: selectedProperty.address2,
        city: selectedProperty.city,
        province: selectedProperty.province,
        zip: selectedProperty.zip,
        country: 'US',
      };
      tabName = selectedProperty.label;
    } else {
      setError('Select your rental to continue.');
      return;
    }

    setBusy(true);
    try {
      const group = await createDashboardOrderV2({
        hostName: 'Party Host',
        source: 'PARTNER_PAGE',
        affiliateId,
        deliveryContextType: config.deliveryContextType,
        name: `${config.name} Delivery`,
        tabName,
        deliveryAddress,
        attribution: getAttributionForDashboard(),
      });

      const host = group.participants.find((p) => p.isHost);
      if (host) {
        try {
          localStorage.setItem(`dashboard_participant_${group.shareCode}`, host.id);
        } catch {
          /* localStorage unavailable — non-blocking */
        }
      }
      router.push(`/dashboard/${group.shareCode}`);
    } catch (err) {
      console.error('PropertyPicker: failed to start order', err);
      setError('Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {hasProperties && (
        <label className="block text-left mb-3">
          <span className="block text-base font-semibold text-white mb-1">
            Choose your rental
          </span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-premium w-full"
            aria-label="Choose your rental"
          >
            <option value="">Select your rental…</option>
            {config.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {config.allowCustomAddress && (
              <option value={CUSTOM}>My place isn&apos;t listed — enter address</option>
            )}
          </select>
        </label>
      )}

      {isCustom && (
        <div className="text-left space-y-2 mb-3">
          <input
            className="input-premium w-full"
            placeholder="Rental street address"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            aria-label="Rental street address"
          />
          <div className="flex gap-2">
            <input
              className="input-premium w-full"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="City"
            />
            <input
              className="input-premium w-32"
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
              aria-label="ZIP code"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={busy}
        className="btn-cart w-full h-14 text-lg disabled:opacity-60"
      >
        {busy ? 'Starting…' : 'Start Your Order'}
      </button>

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
