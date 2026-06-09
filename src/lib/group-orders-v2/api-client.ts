/**
 * Group Orders V2 - Frontend API Client
 */

import type {
  GroupOrderV2Full,
  ParticipantSummary,
  SubOrderFull,
  DraftCartItemView,
  CreateGroupOrderV2Input,
  CreateDashboardInput,
  CreateTabInput,
  UpdateTabInput,
  JoinGroupOrderInput,
  AddDraftItemInput,
  AppliedPromo,
} from './types';

const API_BASE = '/api/v2/group-orders';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Server error: ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) message = errJson.error;
    } catch {
      // Response wasn't JSON (e.g. 502 HTML page)
    }
    throw new Error(message);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data as T;
}

/** Create a new group order */
export async function createGroupOrderV2(
  input: CreateGroupOrderV2Input
): Promise<GroupOrderV2Full> {
  return apiFetch<GroupOrderV2Full>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Create a new dashboard order (simplified flow) */
export async function createDashboardOrderV2(
  input: CreateDashboardInput
): Promise<GroupOrderV2Full> {
  return apiFetch<GroupOrderV2Full>(`${API_BASE}/dashboard`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Fetch group order by share code */
export async function fetchGroupOrderV2(code: string): Promise<GroupOrderV2Full> {
  return apiFetch<GroupOrderV2Full>(`${API_BASE}/${code}`);
}

/**
 * Update group order. Requires the caller's participantId -- the server
 * verifies it belongs to a host (server returns 403 otherwise).
 */
export async function updateGroupOrderV2(
  code: string,
  participantId: string,
  data: {
    name?: string;
    /** Empty string -> "clear back to smart default" (treated as null by the server). */
    subtitle?: string | null;
    /** Empty string -> "clear back to party-type default". */
    heroVibeKey?: string | null;
    status?: string;
    partyType?: string | null;
    hostEmail?: string;
    hostPhone?: string;
  }
): Promise<GroupOrderV2Full> {
  return apiFetch<GroupOrderV2Full>(`${API_BASE}/${code}`, {
    method: 'PATCH',
    body: JSON.stringify({ participantId, ...data }),
  });
}

/** Cancel group order */
export async function cancelGroupOrderV2(
  code: string,
  hostParticipantId: string
): Promise<void> {
  await apiFetch(`${API_BASE}/${code}?hostParticipantId=${hostParticipantId}`, {
    method: 'DELETE',
  });
}

/** Join group order */
export async function joinGroupOrderV2(
  code: string,
  input: JoinGroupOrderInput
): Promise<ParticipantSummary> {
  return apiFetch<ParticipantSummary>(`${API_BASE}/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Update participant email */
export async function updateParticipantEmailV2(
  code: string,
  pid: string,
  email: string
): Promise<void> {
  await apiFetch(`${API_BASE}/${code}/participants/${pid}`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  });
}

/** Update participant name */
export async function updateParticipantNameV2(
  code: string,
  pid: string,
  name: string
): Promise<void> {
  await apiFetch(`${API_BASE}/${code}/participants/${pid}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/** Remove participant */
export async function removeParticipantV2(
  code: string,
  pid: string,
  hostParticipantId: string
): Promise<void> {
  await apiFetch(
    `${API_BASE}/${code}/participants/${pid}?hostParticipantId=${hostParticipantId}`,
    { method: 'DELETE' }
  );
}

/** Create tab */
export async function createTabV2(
  code: string,
  input: CreateTabInput & { participantId: string }
): Promise<SubOrderFull> {
  return apiFetch<SubOrderFull>(`${API_BASE}/${code}/tabs`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Update tab */
export async function updateTabV2(
  code: string,
  tabId: string,
  input: UpdateTabInput & { participantId: string }
): Promise<SubOrderFull> {
  return apiFetch<SubOrderFull>(`${API_BASE}/${code}/tabs/${tabId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Delete tab */
export async function deleteTabV2(
  code: string,
  tabId: string,
  hostParticipantId: string
): Promise<void> {
  await apiFetch(
    `${API_BASE}/${code}/tabs/${tabId}?hostParticipantId=${hostParticipantId}`,
    { method: 'DELETE' }
  );
}

/** Add item to tab */
export async function addDraftItemV2(
  code: string,
  tabId: string,
  input: AddDraftItemInput
): Promise<DraftCartItemView> {
  return apiFetch<DraftCartItemView>(`${API_BASE}/${code}/tabs/${tabId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Update item quantity */
export async function updateDraftItemV2(
  code: string,
  tabId: string,
  itemId: string,
  participantId: string,
  quantity: number
): Promise<DraftCartItemView> {
  return apiFetch<DraftCartItemView>(
    `${API_BASE}/${code}/tabs/${tabId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ participantId, quantity }),
    }
  );
}

/** Remove item */
export async function removeDraftItemV2(
  code: string,
  tabId: string,
  itemId: string,
  participantId: string
): Promise<void> {
  await apiFetch(
    `${API_BASE}/${code}/tabs/${tabId}/items/${itemId}?participantId=${participantId}`,
    { method: 'DELETE' }
  );
}

/** Create checkout session for all draft items on a tab */
export async function checkoutAllV2(
  code: string,
  tabId: string,
  participantId: string,
  discountCode?: string,
  tipAmount?: number,
  email?: string
): Promise<{ checkoutUrl: string; sessionId: string }> {
  return apiFetch(`${API_BASE}/${code}/tabs/${tabId}/checkout-all`, {
    method: 'POST',
    body: JSON.stringify({ participantId, discountCode, tipAmount, email }),
  });
}

/** Create checkout session for participant's items */
export async function checkoutParticipantV2(
  code: string,
  tabId: string,
  participantId: string,
  discountCode?: string,
  tipAmount?: number,
  email?: string
): Promise<{ checkoutUrl: string; sessionId: string; paymentId: string }> {
  return apiFetch(`${API_BASE}/${code}/tabs/${tabId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ participantId, discountCode, tipAmount, email }),
  });
}

/** Validate a discount code */
export async function validateGroupDiscount(
  code: string,
  subtotal: number
): Promise<{ code: string; name: string; type: string; value: number; discountAmount: number }> {
  return apiFetch(`${API_BASE}/validate-discount`, {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
}

/** Check if any participant used a freeShipping discount code on this tab */
export async function checkFreeShippingEligibility(
  code: string,
  tabId: string
): Promise<{ freeShippingCode: string | null }> {
  return apiFetch(`${API_BASE}/${code}/tabs/${tabId}/free-shipping-check`);
}

/** Create delivery invoice session */
export async function createDeliveryInvoice(
  code: string,
  tabId: string,
  hostParticipantId: string,
  discountCode?: string
): Promise<{ checkoutUrl: string; sessionId: string; invoiceId: string }> {
  return apiFetch(`${API_BASE}/${code}/tabs/${tabId}/delivery-invoice`, {
    method: 'POST',
    body: JSON.stringify({ hostParticipantId, discountCode }),
  });
}

/** Transfer host role to another participant */
export async function transferHostV2(
  code: string,
  hostParticipantId: string,
  newHostParticipantId: string
): Promise<void> {
  await apiFetch(`${API_BASE}/${code}/transfer-host`, {
    method: 'POST',
    body: JSON.stringify({ hostParticipantId, newHostParticipantId }),
  });
}

/** Generate a host claim token (returns sharable link token) */
export async function generateHostClaimTokenV2(
  code: string,
  hostParticipantId: string
): Promise<{ token: string }> {
  return apiFetch(`${API_BASE}/${code}/host-claim-token`, {
    method: 'POST',
    body: JSON.stringify({ hostParticipantId }),
  });
}

/** Validate a promo code (discount or affiliate) */
export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<AppliedPromo> {
  return apiFetch<AppliedPromo>(`${API_BASE}/validate-promo`, {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
}

/** Claim host role using a claim token */
export async function claimHostV2(
  code: string,
  claimToken: string,
  participantId: string
): Promise<void> {
  await apiFetch(`${API_BASE}/${code}/claim-host`, {
    method: 'POST',
    body: JSON.stringify({ claimToken, participantId }),
  });
}
