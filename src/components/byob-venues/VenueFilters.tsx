'use client';

import { VENUE_CATEGORIES, EVENT_TYPES } from '@/lib/byob-venues/types';
import type { VenueCategory, EventType } from '@/lib/byob-venues/types';

interface VenueFiltersProps {
  activeCategory: VenueCategory | 'all';
  activeEventType: EventType | 'all';
  searchQuery: string;
  showPartnersOnly: boolean;
  onCategoryChange: (category: VenueCategory | 'all') => void;
  onEventTypeChange: (eventType: EventType | 'all') => void;
  onSearchChange: (query: string) => void;
  onPartnersOnlyChange: (show: boolean) => void;
  venueCounts: Record<VenueCategory | 'all', number>;
  /** Hide filters on mobile (slides up out of view) */
  hiddenOnMobile?: boolean;
}

export default function VenueFilters({
  activeCategory,
  activeEventType,
  searchQuery,
  showPartnersOnly,
  onCategoryChange,
  onEventTypeChange,
  onSearchChange,
  onPartnersOnlyChange,
  venueCounts,
  hiddenOnMobile = false,
}: VenueFiltersProps) {
  // Sticky offset tracks the nav's own bar (h-14 md:h-16), per /design-example:
  // "Sticky elements: top-14 md:top-16 (NOT top-24)". top-24 is the page-header
  // figure and left a gap here that content scrolled through.
  return (
    <div className="bg-white border-b border-gray-200 sticky top-14 md:top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
        {/* Search and Partner Toggle Row - Hide on mobile when scrolling */}
        <div className={`transition-all duration-300 overflow-hidden ${
          hiddenOnMobile ? 'max-h-0 opacity-0 md:max-h-20 md:opacity-100 md:mb-4' : 'max-h-20 opacity-100 mb-4'
        }`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search venues..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-yellow focus:border-brand-yellow outline-none transition-colors"
              />
            </div>

            {/* Partner Toggle */}
            <label className="flex items-center gap-3 px-4 py-2 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
              <input
                type="checkbox"
                checked={showPartnersOnly}
                onChange={(e) => onPartnersOnlyChange(e.target.checked)}
                className="w-4 h-4 text-brand-yellow border-gray-300 rounded focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Free Delivery Only
              </span>
            </label>
          </div>
        </div>

        {/* Event Type Pills - Always visible */}
        <div className={`flex flex-wrap gap-2 ${hiddenOnMobile ? 'mb-0 md:mb-4' : 'mb-4'}`}>
          <button
            onClick={() => onEventTypeChange('all')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              activeEventType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Events
          </button>
          {EVENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => onEventTypeChange(type.id)}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                activeEventType === type.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Category Tabs - Hide on mobile when scrolling */}
        <div className={`transition-all duration-300 overflow-hidden ${
          hiddenOnMobile ? 'max-h-0 opacity-0 md:max-h-20 md:opacity-100' : 'max-h-20 opacity-100'
        }`}>
          <div className="flex gap-1 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <button
              onClick={() => onCategoryChange('all')}
              className={`px-4 py-2 text-sm whitespace-nowrap rounded-t-lg transition-colors ${
                activeCategory === 'all'
                  ? 'bg-yellow-100 text-yellow-700 font-medium border-b-2 border-yellow-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All Venues ({venueCounts.all})
            </button>
            {VENUE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`px-4 py-2 text-sm whitespace-nowrap rounded-t-lg transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-yellow-100 text-yellow-700 font-medium border-b-2 border-yellow-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {cat.name} ({venueCounts[cat.id] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
