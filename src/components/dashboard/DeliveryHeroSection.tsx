'use client';

import { useState, useRef, useEffect, type ReactElement } from 'react';
import type { GroupOrderV2Full, SubOrderFull } from '@/lib/group-orders-v2/types';
import { updateTabV2, deleteTabV2 } from '@/lib/group-orders-v2/api-client';
import WelcomeHero from './WelcomeHero';

interface Props {
  groupOrder: GroupOrderV2Full;
  activeTabIndex: number;
  activeTab: SubOrderFull;
  participantId: string;
  /** Whether the active tab's deadline has passed. Disables inline edits in the hero. */
  isLocked: boolean;
  onTabChange: (index: number) => void;
  onAddDelivery: () => void;
  onEditDelivery: () => void;
  onRefresh: () => void;
  /** Called when the WelcomeHero's "Change vibe" button is tapped. */
  onVibePickerOpen: () => void;
}

function formatDeliveryDate(dateStr: string | null): string {
  if (!dateStr || dateStr === 'TBD') return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}

/** Whether the tab has a confirmed delivery date (vs. the placeholder default). */
function hasConfirmedDate(tab: SubOrderFull): boolean {
  return !!(tab.deliveryDate && tab.deliveryDate !== 'TBD' && tab.deliveryDateConfirmed);
}

const PARTY_TYPE_LABELS: Record<string, string> = {
  BOAT: 'Boat Order',
  BACH: 'Bach Order',
  WEDDING: 'Wedding Order',
  BIRTHDAY: 'Birthday Order',
  CORPORATE: 'Corporate Order',
  TAILGATE: 'Tailgate Order',
  HOLIDAY: 'Holiday Order',
  HOUSE_PARTY: 'House Order',
  OTHER: 'Order',
};


export default function DeliveryHeroSection({
  groupOrder,
  activeTabIndex,
  activeTab,
  participantId,
  isLocked,
  onTabChange,
  onAddDelivery,
  onEditDelivery,
  onRefresh,
  onVibePickerOpen,
}: Props): ReactElement {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTabName, setEditTabName] = useState('');
  const tabInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus tab input when entering edit mode
  useEffect(() => {
    if (editingTabId && tabInputRef.current) {
      tabInputRef.current.focus();
      tabInputRef.current.select();
    }
  }, [editingTabId]);

  function startEditingTab(tab: SubOrderFull, index: number) {
    setEditingTabId(tab.id);
    setEditTabName(getTabLabel(tab, index));
  }

  async function saveTabName(tabId: string) {
    const trimmed = editTabName.trim();
    if (!trimmed) {
      setEditingTabId(null);
      return;
    }
    setSaving(true);
    try {
      await updateTabV2(groupOrder.shareCode, tabId, {
        name: trimmed,
        participantId,
      });
      onRefresh();
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
      setEditingTabId(null);
    }
  }

  // Focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  function startEditingTitle() {
    setTitleValue(heroTitle);
    setEditingTitle(true);
  }

  async function saveTitleName() {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === heroTitle) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    try {
      await updateTabV2(groupOrder.shareCode, activeTab.id, {
        name: trimmed,
        participantId,
      });
      onRefresh();
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
      setEditingTitle(false);
    }
  }

  const heroTitle = activeTab.name
    || getTabLabel(activeTab, activeTabIndex);

  const dateConfirmed = hasConfirmedDate(activeTab);
  const addr = activeTab.deliveryAddress;
  const hasAddress = !!addr?.address1;
  // Show the details block if we have EITHER a confirmed date or a pre-filled
  // address (e.g. a partner-seeded marina address, shown before the host picks a date).
  const hasDetails = dateConfirmed || hasAddress;
  const deliveryDate = dateConfirmed ? formatDeliveryDate(activeTab.deliveryDate) : '';
  const deliveryTime = dateConfirmed && activeTab.deliveryTime && activeTab.deliveryTime !== 'TBD' ? activeTab.deliveryTime : '';

  function getTabLabel(tab: SubOrderFull, index: number): string {
    // Treat "Location N" as a default -- override with party type label for first tab
    const isDefaultName = !tab.name || /^Location \d+$/.test(tab.name);
    if (index === 0 && isDefaultName && groupOrder.partyType) {
      return PARTY_TYPE_LABELS[groupOrder.partyType] || tab.name || `Location ${index + 1}`;
    }
    return tab.name || `Location ${index + 1}`;
  }

  const isHost = !!groupOrder.participants.find(p => p.id === participantId)?.isHost;
  const canDeleteTabs = isHost && groupOrder.tabs.length >= 2;

  async function handleDeleteTab(tab: SubOrderFull, tabIndex: number) {
    const tabName = getTabLabel(tab, tabIndex);
    if (!window.confirm(`Delete '${tabName}'? Draft items will be removed.`)) return;
    try {
      await deleteTabV2(groupOrder.shareCode, tab.id, participantId);
      if (tabIndex === activeTabIndex) {
        onTabChange(Math.max(0, activeTabIndex - 1));
      } else if (tabIndex < activeTabIndex) {
        onTabChange(activeTabIndex - 1);
      }
      onRefresh();
    } catch (err) {
      // The server refuses to delete a tab that has payments on it. Failing
      // silently here left the host clicking a dead button.
      alert(err instanceof Error ? err.message : 'Could not delete this tab.');
    }
  }

  const tabsAtLimit = groupOrder.tabs.length >= 4;
  const showTabs = true;

  return (
    <div className="mb-4">
      {groupOrder.isLastMinute && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-yellow/90 border border-yellow-500 px-4 py-2.5 text-sm font-semibold text-gray-900">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Last-minute menu — every item guaranteed in stock for 48–72 hour delivery.</span>
        </div>
      )}
      <div>
        {/* Tabs row -- bigger, brighter active state */}
        {showTabs && (
          <div className="flex items-end gap-1 px-1">
            {groupOrder.tabs.map((tab, i) => (
              editingTabId === tab.id ? (
                <input
                  key={tab.id}
                  ref={tabInputRef}
                  value={editTabName}
                  onChange={(e) => setEditTabName(e.target.value)}
                  onBlur={() => saveTabName(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTabName(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  maxLength={100}
                  className="px-5 py-3 text-base font-bold rounded-t-2xl border-2 border-b-0 border-brand-blue bg-white text-gray-900 outline-none min-w-[100px] max-w-[220px]"
                />
              ) : (
                <div key={tab.id} className="relative group">
                  <button
                    onClick={() => onTabChange(i)}
                    onDoubleClick={() => startEditingTab(tab, i)}
                    className={`px-6 py-3.5 text-base font-bold transition-all rounded-t-2xl border-2 border-b-0 ${
                      // Direction E: active tab is white with a 3px gold top
                      // border (premium, lighter) instead of solid blue. The
                      // tab now visually "lifts" off the cream surface.
                      i === activeTabIndex
                        ? 'bg-white text-gray-900 border-transparent border-t-[3px] border-t-gold relative z-10 -mb-px shadow-warm-sm'
                        : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 border-transparent'
                    } ${canDeleteTabs && tab.status !== 'CANCELLED' && tab.status !== 'FULFILLED' ? 'pr-8' : ''}`}
                    title="Double-click to rename"
                  >
                    {getTabLabel(tab, i)}
                  </button>
                  {canDeleteTabs && tab.status !== 'CANCELLED' && tab.status !== 'FULFILLED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab, i); }}
                      // Active tab is now white -- close icon needs dark color
                      // for legibility, matching the inactive treatment.
                      className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        i === activeTabIndex
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={`Delete ${getTabLabel(tab, i)}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            ))}
            {!tabsAtLimit && (
              <button
                data-tour="add-tab"
                onClick={onAddDelivery}
                className="w-11 h-11 flex items-center justify-center rounded-t-2xl text-gray-400 hover:text-gold hover:bg-gray-100 transition-colors ml-1 mb-0.5"
                title="Add another location"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Direction E Component 2b: the "Opening Moment".
            Full-bleed gradient hero with editable title/subtitle and a
            paintbrush button to open the vibe picker. Edits are gated on
            the viewer being a host -- guests see the same hero but with
            no click affordances. (Multiple participants can be hosts at
            once via "Add Another Host" in the participant panel.) */}
        <WelcomeHero
          groupOrder={groupOrder}
          activeTab={activeTab}
          participantId={participantId}
          isHost={isHost}
          isLocked={isLocked}
          hasTabsAbove={showTabs}
          onChanged={onRefresh}
          onVibePickerOpen={onVibePickerOpen}
        />

        {/* Order-details card -- the single element below the hero. Just the
            chevron-expandable delivery details. The Boat Kit filter chip
            that used to live on the left got removed because customers
            couldn't tell that tapping it would change the product grid
            below -- the connection was invisible. Get Recommendations
            (right below this section) already covers the "I don't know what
            to buy" path more clearly. */}
        <div data-tour="delivery-details" className="mt-3 mx-0 md:mx-2 bg-white shadow-warm-md rounded-2xl overflow-hidden">
          {/* Collapsed row. With a confirmed date it summarizes + toggles the
              accordion; without one it becomes the always-visible "Add your
              delivery date" CTA that opens the date modal directly \u2014 the old
              buried-in-accordion prompt is how wrong-date orders slipped
              through (2026-08-01 fix). */}
          <button
            onClick={() => (dateConfirmed ? setDetailsOpen(!detailsOpen) : onEditDelivery())}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-cream transition-colors"
          >
            <span className="text-sm text-gray-700 flex items-center gap-2 min-w-0">
              <svg className={`w-4 h-4 flex-shrink-0 ${dateConfirmed ? 'text-gold' : 'text-brand-blue'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {dateConfirmed ? (
                <span className="truncate">
                  {deliveryDate}
                  {deliveryTime ? ` at ${deliveryTime}` : ''}
                  {addr?.address1 ? ` \u2022 ${addr.address1}${addr.city ? ', ' + addr.city : ''}` : ''}
                </span>
              ) : (
                <span className="min-w-0 flex items-center gap-2">
                  <span className="text-brand-blue font-semibold whitespace-nowrap">Add your delivery date</span>
                  {addr?.address1 && (
                    <span className="truncate text-gray-500">
                      {'\u2022'} {addr.address1}{addr.city ? `, ${addr.city}` : ''}
                    </span>
                  )}
                </span>
              )}
            </span>
            {dateConfirmed ? (
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-2 ${detailsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-brand-blue flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* Expandable details panel */}
          {detailsOpen && (
            <div className="px-5 pb-4 pt-1 border-t border-gray-200 space-y-3">
              {/* Order title -- editable */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Tab Name</label>
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={() => saveTitleName()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitleName();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    maxLength={100}
                    placeholder="Name your order..."
                    className="text-base font-semibold text-gray-900 bg-transparent border-b-2 border-brand-blue outline-none w-full py-1"
                  />
                ) : (
                  <button
                    onClick={startEditingTitle}
                    className="text-left group flex items-center gap-2 cursor-pointer hover:opacity-80"
                  >
                    <span className="text-base font-semibold text-gray-900">{heroTitle}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Delivery details */}
              {hasDetails ? (
                <div className="text-sm text-gray-600 space-y-1.5">
                  {deliveryDate ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{deliveryDate}{deliveryTime ? ` at ${deliveryTime}` : ''}</span>
                    </div>
                  ) : (
                    <button
                      onClick={onEditDelivery}
                      className="flex items-center gap-2 text-brand-blue hover:text-blue-700 font-medium"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Add your delivery date</span>
                    </button>
                  )}
                  {addr?.address1 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}{addr.city ? `, ${addr.city}` : ''}{addr.province ? `, ${addr.province}` : ''} {addr.zip || ''}</span>
                    </div>
                  )}
                  <button
                    onClick={onEditDelivery}
                    className="text-brand-blue hover:text-blue-700 font-medium text-sm"
                  >
                    Edit details
                  </button>
                </div>
              ) : (
                <button
                  onClick={onEditDelivery}
                  className="flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add location details
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
