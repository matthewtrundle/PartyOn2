/**
 * Affiliate-specific dashboard presets.
 * Keyed by affiliate code for extensibility.
 */

export interface TabPresetOption {
  id: string;
  label: string;
  defaultAddress?: string;
  deliveryContextType?: 'HOUSE' | 'BOAT' | 'VENUE' | 'HOTEL' | 'OTHER';
  isCustom?: boolean;
}

export interface PartyTypeOption {
  value: 'BACH' | 'BOAT';
  label: string;
  titleFormat: string; // e.g. "{name} Bach Drink Delivery!"
}

export interface AffiliatePresetConfig {
  partyTypes: PartyTypeOption[];
  tabPresets: TabPresetOption[];
  defaultDeliveryTime: string;
}

const PREMIER_ADDRESS = '13993 FM 2769, Leander TX 78641';

export interface AffiliateAddress {
  address1: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

export const PREMIER_MARINA_ADDRESS: AffiliateAddress = {
  address1: '13993 Farm to Market Rd 2769',
  city: 'Leander',
  province: 'TX',
  zip: '78641',
  country: 'US',
};

export const INN_CAHOOTS_ADDRESS: AffiliateAddress = {
  address1: '1221 E 6th St',
  city: 'Austin',
  province: 'TX',
  zip: '78702',
  country: 'US',
};

// Lake Travis Yacht Rentals departs from Hurst Harbor Marina — every boat order
// is dropped at the dock here. String form is for the portal multi-tab picker.
const LAKE_TRAVIS_MARINA = '16405 Clara Van St Ste B, Austin TX 78734';

export const LAKE_TRAVIS_MARINA_ADDRESS: AffiliateAddress = {
  address1: '16405 Clara Van St Ste B',
  city: 'Austin',
  province: 'TX',
  zip: '78734',
  country: 'US',
};

const PREMIER_PRESETS: AffiliatePresetConfig = {
  partyTypes: [
    {
      value: 'BACH',
      label: 'Bach',
      titleFormat: '{name} Bach Drink Delivery!',
    },
    {
      value: 'BOAT',
      label: 'Private Cruise',
      titleFormat: '{name} Drink Delivery!',
    },
  ],
  tabPresets: [
    {
      id: 'atx-disco',
      label: 'ATX Disco Cruise Drink Delivery!',
      defaultAddress: PREMIER_ADDRESS,
      deliveryContextType: 'BOAT',
    },
    {
      id: 'party-cruise',
      label: 'Party Cruise Drink Delivery!',
      defaultAddress: PREMIER_ADDRESS,
      deliveryContextType: 'BOAT',
    },
    {
      id: 'stock-the-house',
      label: 'Stock the House - Bnb Delivery',
      deliveryContextType: 'HOUSE',
    },
    {
      id: 'custom',
      label: 'Custom',
      isCustom: true,
    },
  ],
  defaultDeliveryTime: '12:00 PM - 2:00 PM',
};

const LAKE_TRAVIS_PRESETS: AffiliatePresetConfig = {
  partyTypes: [
    {
      value: 'BOAT',
      label: 'Yacht / Boat',
      titleFormat: '{name} Drink Delivery!',
    },
    {
      value: 'BACH',
      label: 'Bach',
      titleFormat: '{name} Bach Drink Delivery!',
    },
  ],
  tabPresets: [
    {
      id: 'boat-order',
      label: 'Boat Order',
      defaultAddress: LAKE_TRAVIS_MARINA,
      deliveryContextType: 'BOAT',
    },
    {
      id: 'house-order',
      label: 'House Order',
      deliveryContextType: 'HOUSE',
    },
    {
      id: 'custom',
      label: 'Custom',
      isCustom: true,
    },
  ],
  defaultDeliveryTime: '12:00 PM - 2:00 PM',
};

const PRESET_REGISTRY: Record<string, AffiliatePresetConfig> = {
  PREMIER: PREMIER_PRESETS,
  LTYACHTRENTALS: LAKE_TRAVIS_PRESETS,
};

export function getAffiliatePresets(affiliateCode: string): AffiliatePresetConfig | null {
  return PRESET_REGISTRY[affiliateCode] || null;
}

export interface AffiliateOrderDefaults {
  address: AffiliateAddress;
  tabName: string;
  deliveryContextType?: 'HOUSE' | 'BOAT' | 'VENUE' | 'HOTEL' | 'OTHER';
  /** When true, /order tells the dashboard onboarding to skip the party-type step */
  skipPartyType?: boolean;
  /**
   * Extra tabs to auto-add right after the dashboard is created. Each becomes a
   * second SubOrder (the customer's home/hotel), letting a boat partner's guests
   * order for the boat AND stock the house from one dashboard. Context defaults
   * to HOUSE server-side; the customer fills in the address.
   */
  additionalTabs?: Array<{ name: string }>;
}

const AFFILIATE_ORDER_DEFAULTS: Record<string, AffiliateOrderDefaults> = {
  PREMIER: {
    address: PREMIER_MARINA_ADDRESS,
    tabName: 'Marina Delivery',
    deliveryContextType: 'BOAT',
  },
  MISCHIEF: {
    address: INN_CAHOOTS_ADDRESS,
    tabName: 'Inn Cahoots Delivery',
    deliveryContextType: 'HOTEL',
    skipPartyType: true,
  },
  LTYACHTRENTALS: {
    address: LAKE_TRAVIS_MARINA_ADDRESS,
    tabName: 'Boat Order',
    deliveryContextType: 'BOAT',
    additionalTabs: [{ name: 'House Order' }],
  },
};

function normalizeAffiliateCode(code: string): string {
  return code.toUpperCase().replace(/-/g, '');
}

export function getAffiliateOrderDefaults(affiliateCode: string): AffiliateOrderDefaults | null {
  return AFFILIATE_ORDER_DEFAULTS[normalizeAffiliateCode(affiliateCode)] || null;
}

export function getAffiliateDefaultAddress(affiliateCode: string): AffiliateAddress | null {
  return getAffiliateOrderDefaults(affiliateCode)?.address || null;
}

export function getAffiliateDefaultTabName(affiliateCode: string): string | null {
  return getAffiliateOrderDefaults(affiliateCode)?.tabName || null;
}
