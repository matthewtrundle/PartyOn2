'use client';

import { useState, type ReactElement, type FormEvent } from 'react';
import { updateTabV2 } from '@/lib/group-orders-v2/api-client';
import type { SubOrderFull } from '@/lib/group-orders-v2/types';
import { getStrPartnerByCode, type StrProperty } from '@/lib/partners/str-partners';

interface Props {
  shareCode: string;
  tab: SubOrderFull;
  participantId: string;
  /**
   * The group's affiliate code (groupOrder.affiliate?.code). When it resolves
   * to an STR partner config (e.g. FIVESTAR), the address form shows a
   * dropdown of that partner's rental properties that pre-fills the fields.
   */
  affiliateCode?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Sentinel value for the "my place isn't listed" dropdown option. */
const STR_CUSTOM = '__custom__';

/** In-store pickup location — 7600 N. Lamar Blvd #A2, Austin TX 78752 */
const STORE_PICKUP_ADDRESS = {
  address1: '7600 N. Lamar Blvd',
  address2: '#A2',
  city: 'Austin',
  province: 'TX',
  zip: '78752',
  country: 'US',
} as const;

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h <= 20; h++) {
    for (const m of [0, 30]) {
      const hour = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const nextH = m === 30 ? h + 1 : h;
      const nextM = m === 30 ? 0 : 30;
      const nextHour = nextH % 12 || 12;
      const nextAmpm = nextH < 12 ? 'AM' : 'PM';
      const start = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
      const end = `${nextHour}:${nextM.toString().padStart(2, '0')} ${nextAmpm}`;
      slots.push(`${start} - ${end}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function getMinDate(): string {
  return new Date().toISOString().split('T')[0];
}

function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0;
}

export default function DeliveryDetailsModal({
  shareCode,
  tab,
  participantId,
  affiliateCode,
  onClose,
  onSaved,
}: Props): ReactElement {
  const addr = tab.deliveryAddress || { address1: '', address2: '', city: '', province: 'TX', zip: '', country: 'US' };

  // STR partner (Five Star, etc.) property roster for the address dropdown.
  const strConfig = affiliateCode ? getStrPartnerByCode(affiliateCode) : null;
  const strProperties = strConfig?.properties ?? [];
  const hasStrDropdown = strProperties.length > 0;

  // Fulfillment method — default to whatever the tab is currently set to
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>(
    addr.isPickup ? 'pickup' : 'delivery'
  );
  const isPickup = fulfillmentMethod === 'pickup';

  const [date, setDate] = useState(() => {
    if (!tab.deliveryDate || tab.deliveryDate === 'TBD') return '';
    if (!tab.deliveryDateConfirmed) return '';
    return tab.deliveryDate.split('T')[0];
  });
  const [time, setTime] = useState(() => {
    if (!tab.deliveryTime || tab.deliveryTime === 'TBD') return '';
    if (!tab.deliveryDateConfirmed) return '';
    return tab.deliveryTime;
  });
  const [address1, setAddress1] = useState(addr.address1 || '');
  const [address2, setAddress2] = useState(addr.address2 || '');
  const [city, setCity] = useState(addr.city || '');
  const [zip, setZip] = useState(addr.zip || '');
  const [notes, setNotes] = useState(tab.deliveryNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dropdown selection. If the tab's address already matches a roster
  // property, preselect it; if an address was hand-typed, show "custom".
  const [strSelection, setStrSelection] = useState<string>(() => {
    if (!hasStrDropdown) return '';
    const match = strProperties.find(
      (p) => p.address1 === (addr.address1 || '') && p.zip === (addr.zip || '')
    );
    if (match) return match.id;
    return addr.address1 ? STR_CUSTOM : '';
  });
  const strIsCustom = strSelection === STR_CUSTOM;

  function applyStrSelection(value: string): void {
    setStrSelection(value);
    const prop: StrProperty | undefined = strProperties.find((p) => p.id === value);
    if (prop) {
      setAddress1(prop.address1);
      setAddress2(prop.address2 ?? '');
      setCity(prop.city);
      setZip(prop.zip);
    } else if (value === STR_CUSTOM) {
      // Clear roster-filled values so the guest types their own.
      setAddress1('');
      setAddress2('');
      setCity('');
      setZip('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!date) {
      setError(isPickup ? 'Please select a pickup date.' : 'Please select a delivery date.');
      return;
    }
    if (isSunday(date)) {
      setError(
        isPickup
          ? 'We are closed on Sundays. Please pick another date.'
          : 'We do not deliver on Sundays. Please pick another date.'
      );
      return;
    }
    if (!time) {
      setError(isPickup ? 'Please select a pickup time.' : 'Please select a delivery time.');
      return;
    }

    // Ensure the slot is at least 4 hours from now (give the store time to prep)
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const scheduled = new Date(`${date}T${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);
      const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
      if (scheduled < fourHoursFromNow) {
        setError(
          isPickup
            ? 'Pickup must be at least 4 hours from now.'
            : 'Delivery must be at least 4 hours from now.'
        );
        return;
      }
    }

    // Address fields are only required for delivery
    if (!isPickup) {
      if (!address1.trim()) {
        setError('Please enter a delivery address.');
        return;
      }
      if (!city.trim()) {
        setError('Please enter a city.');
        return;
      }
      if (!zip.trim()) {
        setError('Please enter a zip code.');
        return;
      }
    }

    setSaving(true);
    try {
      const deliveryAddress = isPickup
        ? { ...STORE_PICKUP_ADDRESS, isPickup: true }
        : {
            address1: address1.trim(),
            address2: address2.trim() || undefined,
            city: city.trim(),
            province: 'TX',
            zip: zip.trim(),
            country: 'US',
          };
      await updateTabV2(shareCode, tab.id, {
        participantId,
        deliveryDate: date,
        deliveryTime: time,
        deliveryAddress,
        deliveryNotes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-heading font-bold tracking-[0.08em] text-gray-900">
            Location Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Fulfillment method */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFulfillmentMethod('delivery')}
              className={`text-left p-3 border-2 rounded-lg transition-colors ${
                !isPickup
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm text-gray-900">Deliver to me</div>
              <div className="text-xs text-gray-600 mt-0.5">Austin area</div>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentMethod('pickup')}
              className={`text-left p-3 border-2 rounded-lg transition-colors ${
                isPickup
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900">Pick up in store</span>
                <span className="text-xs font-semibold text-green-700">FREE</span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">7600 N. Lamar</div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isPickup ? 'Pickup Date' : 'Delivery Date'}
              </label>
              <input
                type="date"
                value={date}
                min={getMinDate()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isPickup ? 'Pickup Time' : 'Delivery Time'}
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300"
              >
                <option value="">Select a time window</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {isPickup ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Pickup Location
              </p>
              <p className="font-semibold text-gray-900">Party On Delivery</p>
              <p className="text-sm text-gray-700">
                7600 N. Lamar Blvd #A2<br />
                Austin, TX 78752
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Bring a photo ID. Your order will be ready at the selected time.
              </p>
            </div>
          ) : (
            <>
              {hasStrDropdown && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your {strConfig?.name} rental
                  </label>
                  <select
                    value={strSelection}
                    onChange={(e) => applyStrSelection(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base bg-white focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300"
                    aria-label={`Choose your ${strConfig?.name} rental`}
                  >
                    <option value="">Select your rental…</option>
                    {strProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                    {strConfig?.allowCustomAddress && (
                      <option value={STR_CUSTOM}>My place isn&apos;t listed — enter address</option>
                    )}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Picking your rental fills in the delivery address below.
                  </p>
                </div>
              )}

              {(!hasStrDropdown || strSelection !== '') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Street address"
                  readOnly={hasStrDropdown && !strIsCustom}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300 read-only:bg-gray-50 read-only:text-gray-600"
                />
              </div>
              )}

              {(!hasStrDropdown || strSelection !== '') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="Apt, suite, unit, etc."
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Austin"
                        readOnly={hasStrDropdown && !strIsCustom}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300 read-only:bg-gray-50 read-only:text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="78701"
                        readOnly={hasStrDropdown && !strIsCustom}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300 read-only:bg-gray-50 read-only:text-gray-600"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPickup ? 'Pickup Notes' : 'Delivery Notes'}{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isPickup
                  ? 'Name on the order, vehicle description, anything else we should know.'
                  : 'Gate code, special instructions, etc.'
              }
              rows={3}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-brand-blue focus:ring-0 transition-all hover:border-gray-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-brand-blue text-white text-base font-semibold tracking-[0.08em] rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
