'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OrderCardData,
  OrdersViewOrder,
  OrdersViewResponse,
} from '@/lib/ops/orders-view-data';
import { todayCT } from './client-today';

export type { OrderCardData, OrdersViewOrder, OrdersViewResponse };

/** Sheet-managed filters (everything beyond search/range/fulfillment). */
export interface OrdersViewFilters {
  status: string;
  deliveryType: string;
  groupType: '' | 'regular' | 'group';
  reviewSent: '' | 'sent' | 'unsent';
  groupOrderV2Id: string;
}

export const EMPTY_FILTERS: OrdersViewFilters = {
  status: '',
  deliveryType: '',
  groupType: '',
  reviewSent: '',
  groupOrderV2Id: '',
};

export interface UseOrdersView {
  data: OrdersViewResponse | null;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  start: string;
  days: number;
  setRange: (start: string, days: number) => void;
  fulfillment: string;
  setFulfillment: (f: string) => void;
  filters: OrdersViewFilters;
  setFilters: (patch: Partial<OrdersViewFilters>) => void;
  activeFilterCount: number;
  selected: Set<string>;
  toggleOrder: (id: string) => void;
  setManySelected: (ids: string[], on: boolean) => void;
  clearSelection: () => void;
  /** Resolve currently-loaded order objects by id (incl. overdue section). */
  ordersById: Map<string, OrdersViewOrder>;
  allCards: OrderCardData[];
  refresh: () => void;
}

/**
 * State + data fetching for the unified ops orders view.
 *
 * Defaults match the old Weekly Checklist: UNFULFILLED, today → +7 days (CT),
 * overdue section on. Search drops the date window (handled server-side).
 * Filters sync to the URL so deep links (?groupOrderV2Id=, ?start=, ?q=)
 * keep working.
 */
export function useOrdersView(initial: {
  groupOrderV2Id?: string;
  start?: string;
  days?: number;
  q?: string;
}): UseOrdersView {
  const [data, setData] = useState<OrdersViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initial.q || '');
  const [start, setStart] = useState(initial.start || todayCT());
  const [days, setDays] = useState(initial.days && initial.days >= 1 && initial.days <= 31 ? initial.days : 7);
  const [fulfillment, setFulfillment] = useState('UNFULFILLED');
  const [filters, setFiltersState] = useState<OrdersViewFilters>({
    ...EMPTY_FILTERS,
    groupOrderV2Id: initial.groupOrderV2Id || '',
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const reqIdRef = useRef(0);

  const fetchView = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('q', search.trim());
      } else {
        params.set('start', start);
        params.set('days', String(days));
      }
      if (fulfillment) params.set('fulfillmentStatus', fulfillment);
      if (filters.status) params.set('status', filters.status);
      if (filters.deliveryType) params.set('deliveryType', filters.deliveryType);
      if (filters.groupType) params.set('groupType', filters.groupType);
      if (filters.reviewSent) params.set('reviewSent', filters.reviewSent);
      if (filters.groupOrderV2Id) params.set('groupOrderV2Id', filters.groupOrderV2Id);

      const res = await fetch(`/api/ops/orders-view?${params}`, { cache: 'no-store' });
      const json = (await res.json()) as OrdersViewResponse & { error?: string };
      if (reqId !== reqIdRef.current) return;
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setSelected(new Set());
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [search, start, days, fulfillment, filters]);

  // Debounced fetch on any input change (covers typing in search).
  useEffect(() => {
    const t = setTimeout(fetchView, 300);
    return () => clearTimeout(t);
  }, [fetchView]);

  // Keep deep-linkable state in the URL without triggering navigation.
  useEffect(() => {
    const url = new URL(window.location.href);
    const setOrDelete = (k: string, v: string) => {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    };
    setOrDelete('q', search.trim());
    setOrDelete('groupOrderV2Id', filters.groupOrderV2Id);
    setOrDelete('start', search.trim() ? '' : start);
    setOrDelete('days', search.trim() ? '' : String(days === 7 ? '' : days));
    window.history.replaceState(null, '', url.toString());
  }, [search, start, days, filters.groupOrderV2Id]);

  const setFilters = useCallback((patch: Partial<OrdersViewFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setRange = useCallback((s: string, d: number) => {
    setStart(s);
    setDays(Math.max(1, Math.min(31, d)));
  }, []);

  const toggleOrder = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setManySelected = useCallback((ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const allCards = useMemo<OrderCardData[]>(() => {
    if (!data) return [];
    return [...(data.overdue?.cards || []), ...data.days.flatMap((d) => d.cards)];
  }, [data]);

  const ordersById = useMemo(() => {
    const map = new Map<string, OrdersViewOrder>();
    for (const card of allCards) {
      for (const o of card.orders) map.set(o.id, o);
    }
    return map;
  }, [allCards]);

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.deliveryType ? 1 : 0) +
    (filters.groupType ? 1 : 0) +
    (filters.reviewSent ? 1 : 0) +
    (filters.groupOrderV2Id ? 1 : 0);

  return {
    data,
    loading,
    error,
    search,
    setSearch,
    start,
    days,
    setRange,
    fulfillment,
    setFulfillment,
    filters,
    setFilters,
    activeFilterCount,
    selected,
    toggleOrder,
    setManySelected,
    clearSelection,
    ordersById,
    allCards,
    refresh: fetchView,
  };
}
