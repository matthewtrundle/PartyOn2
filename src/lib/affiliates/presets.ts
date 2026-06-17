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

export const CENTEX_MARINA_ADDRESS: AffiliateAddress = {
  address1: '17141 Rocky Ridge Rd',
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

const PRESET_REGISTRY: Record<string, AffiliatePresetConfig> = {
  PREMIER: PREMIER_PRESETS,
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
  CENTEXBOATRENTALS: {
    address: CENTEX_MARINA_ADDRESS,
    tabName: 'Lake Travis Boat Delivery',
    deliveryContextType: 'BOAT',
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
