'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type DrinkingLevel = 'light' | 'average' | 'lively';

export default function CorporateEventCalculator() {
  const [guests, setGuests] = useState<number>(75);
  const [hours, setHours] = useState<number>(3);
  const [drinkingLevel, setDrinkingLevel] = useState<DrinkingLevel>('average');
  const [champagneToast, setChampagneToast] = useState<boolean>(false);

  // Percentages that must add up to 100
  const [liquorPercent, setLiquorPercent] = useState<number>(30);
  const [winePercent, setWinePercent] = useState<number>(40);
  const [beerPercent, setBeerPercent] = useState<number>(30);

  // Lock states for each slider
  const [liquorLocked, setLiquorLocked] = useState<boolean>(false);
  const [wineLocked, setWineLocked] = useState<boolean>(false);
  const [beerLocked, setBeerLocked] = useState<boolean>(false);

  // Calculate total drinks based on drinking level
  const getTotalDrinks = (): number => {
    if (guests <= 0 || hours <= 0) return 0;

    switch (drinkingLevel) {
      case 'light':
        return guests * hours * 0.75; // Light drinkers: 0.75 drinks per hour
      case 'average':
        return guests * (hours + 0.5); // Average: 1+ drinks per hour
      case 'lively':
        return guests * (hours + 1); // Lively: 1.5+ drinks per hour
      default:
        return 0;
    }
  };

  // Calculate bottle quantities.
  // Servings-per-750ml canon: wine = 5 (5oz pours), spirits = 17 (1.5oz pours),
  // champagne = 5. These match the two real recommendation engines —
  // src/lib/drinkPlannerLogic.ts (SERVINGS_PER_UNIT) and
  // src/lib/wedding-packages/tier-config.ts. This calculator previously used
  // 4 and 12, which quoted ~25% more wine and ~40% more liquor than the rest
  // of the site for the same party.
  const WINE_SERVINGS_PER_BOTTLE = 5;
  const LIQUOR_SERVINGS_PER_BOTTLE = 17;
  const CHAMPAGNE_SERVINGS_PER_BOTTLE = 5;

  const totalDrinks = getTotalDrinks();
  const wineBottles = Math.ceil((totalDrinks * winePercent / 100) / WINE_SERVINGS_PER_BOTTLE);
  const liquorBottles = Math.ceil((totalDrinks * liquorPercent / 100) / LIQUOR_SERVINGS_PER_BOTTLE);
  const beers = Math.ceil(totalDrinks * beerPercent / 100);
  const champagneBottles = champagneToast
    ? Math.ceil(guests / CHAMPAGNE_SERVINGS_PER_BOTTLE)
    : 0;

  // Handle slider changes with locking mechanism
  const handleLiquorChange = (value: number) => {
    if (liquorLocked) return;

    const newLiquor = Math.max(0, Math.min(100, value));
    setLiquorPercent(newLiquor);

    // Distribute remaining percentage between unlocked sliders
    const remaining = 100 - newLiquor;

    if (wineLocked && beerLocked) {
      return;
    } else if (wineLocked) {
      setBeerPercent(remaining - winePercent);
    } else if (beerLocked) {
      setWinePercent(remaining - beerPercent);
    } else {
      const currentOthers = winePercent + beerPercent;
      if (currentOthers > 0) {
        const wineRatio = winePercent / currentOthers;
        const beerRatio = beerPercent / currentOthers;
        setWinePercent(Math.round(remaining * wineRatio));
        setBeerPercent(Math.round(remaining * beerRatio));
      } else {
        setWinePercent(Math.round(remaining / 2));
        setBeerPercent(remaining - Math.round(remaining / 2));
      }
    }
  };

  const handleWineChange = (value: number) => {
    if (wineLocked) return;

    const newWine = Math.max(0, Math.min(100, value));
    setWinePercent(newWine);

    const remaining = 100 - newWine;

    if (liquorLocked && beerLocked) {
      return;
    } else if (liquorLocked) {
      setBeerPercent(remaining - liquorPercent);
    } else if (beerLocked) {
      setLiquorPercent(remaining - beerPercent);
    } else {
      const currentOthers = liquorPercent + beerPercent;
      if (currentOthers > 0) {
        const liquorRatio = liquorPercent / currentOthers;
        const beerRatio = beerPercent / currentOthers;
        setLiquorPercent(Math.round(remaining * liquorRatio));
        setBeerPercent(Math.round(remaining * beerRatio));
      } else {
        setLiquorPercent(Math.round(remaining / 2));
        setBeerPercent(remaining - Math.round(remaining / 2));
      }
    }
  };

  const handleBeerChange = (value: number) => {
    if (beerLocked) return;

    const newBeer = Math.max(0, Math.min(100, value));
    setBeerPercent(newBeer);

    const remaining = 100 - newBeer;

    if (liquorLocked && wineLocked) {
      return;
    } else if (liquorLocked) {
      setWinePercent(remaining - liquorPercent);
    } else if (wineLocked) {
      setLiquorPercent(remaining - winePercent);
    } else {
      const currentOthers = liquorPercent + winePercent;
      if (currentOthers > 0) {
        const liquorRatio = liquorPercent / currentOthers;
        const wineRatio = winePercent / currentOthers;
        setLiquorPercent(Math.round(remaining * liquorRatio));
        setWinePercent(Math.round(remaining * wineRatio));
      } else {
        setLiquorPercent(Math.round(remaining / 2));
        setWinePercent(remaining - Math.round(remaining / 2));
      }
    }
  };

  // Verify percentages total 100
  const totalPercent = liquorPercent + winePercent + beerPercent;
  const isValid = totalPercent === 100;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 my-12">
      <div className="text-center mb-12">
        <h2 className="font-heading font-light text-3xl md:text-4xl text-gray-900 mb-4 tracking-[0.1em]">
          Corporate Event Drink Calculator
        </h2>
        <div className="w-16 h-px bg-brand-yellow mx-auto mb-4" />
        <p className="text-gray-600 tracking-[0.05em] max-w-2xl mx-auto">
          Get an accurate estimate of how much alcohol you&apos;ll need for your corporate event
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Number of Guests */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-900 tracking-[0.05em]">
                Number of Guests
              </label>
              <span className="text-lg font-semibold text-brand-yellow">{guests}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          {/* Hours of Event */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 tracking-[0.05em]">
              Hours of Event
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
            />
          </div>

          {/* Drinking Level */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3 tracking-[0.05em]">
              Event Atmosphere
            </label>
            <div className="space-y-2">
              {[
                { value: 'light', label: 'Conservative (networking, early event)', desc: 'Light drinking pace' },
                { value: 'average', label: 'Standard Corporate Event', desc: 'Moderate drinking pace' },
                { value: 'lively', label: 'Celebration (holiday party, milestone)', desc: 'Festive atmosphere' }
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-start cursor-pointer group p-3 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="drinkingLevel"
                    value={option.value}
                    checked={drinkingLevel === option.value}
                    onChange={(e) => setDrinkingLevel(e.target.value as DrinkingLevel)}
                    className="w-4 h-4 mt-0.5 text-brand-yellow border-gray-300 focus:ring-brand-yellow"
                  />
                  <div className="ml-3">
                    <span className="text-gray-900 font-medium block group-hover:text-gray-900 transition-colors">
                      {option.label}
                    </span>
                    <span className="text-sm text-gray-500">{option.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Champagne Toast */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3 tracking-[0.05em]">
              Champagne Toast?
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setChampagneToast(true)}
                className={`px-6 py-2 rounded-md transition-all ${
                  champagneToast
                    ? 'bg-brand-yellow text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setChampagneToast(false)}
                className={`px-6 py-2 rounded-md transition-all ${
                  !champagneToast
                    ? 'bg-brand-yellow text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Drink Mix Sliders */}
          <div className="pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-4 tracking-[0.05em]">
              Drink Mix Preferences {!isValid && <span className="text-red-600 text-xs">(Must equal 100%)</span>}
            </label>

            {/* Liquor Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Liquor (Spirits)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{liquorPercent}%</span>
                  <button
                    onClick={() => setLiquorLocked(!liquorLocked)}
                    className={`p-1 rounded transition-colors ${
                      liquorLocked ? 'bg-brand-yellow text-gray-900' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={liquorLocked ? 'Unlock' : 'Lock'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      {liquorLocked ? (
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      ) : (
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={liquorPercent}
                onChange={(e) => handleLiquorChange(parseInt(e.target.value))}
                disabled={liquorLocked}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${
                  liquorLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } accent-yellow-500`}
              />
            </div>

            {/* Wine Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Wine</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{winePercent}%</span>
                  <button
                    onClick={() => setWineLocked(!wineLocked)}
                    className={`p-1 rounded transition-colors ${
                      wineLocked ? 'bg-brand-yellow text-gray-900' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={wineLocked ? 'Unlock' : 'Lock'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      {wineLocked ? (
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      ) : (
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={winePercent}
                onChange={(e) => handleWineChange(parseInt(e.target.value))}
                disabled={wineLocked}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${
                  wineLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } accent-yellow-500`}
              />
            </div>

            {/* Beer Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Beer</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{beerPercent}%</span>
                  <button
                    onClick={() => setBeerLocked(!beerLocked)}
                    className={`p-1 rounded transition-colors ${
                      beerLocked ? 'bg-brand-yellow text-gray-900' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title={beerLocked ? 'Unlock' : 'Lock'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      {beerLocked ? (
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      ) : (
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={beerPercent}
                onChange={(e) => handleBeerChange(parseInt(e.target.value))}
                disabled={beerLocked}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none ${
                  beerLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } accent-yellow-500`}
              />
            </div>

            {/* Total Percentage Display */}
            <div className="mt-4 text-center">
              <span className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-gradient-to-br from-yellow-50 to-gray-50 rounded-lg p-4 md:p-8">
          <h3 className="font-heading text-xl md:text-2xl text-gray-900 mb-4 md:mb-6 tracking-[0.1em] text-center">
            Estimated Quantities
          </h3>

          {/* Total Drinks - Always show */}
          <div className="bg-white rounded-lg p-3 md:p-4 text-center border border-gray-200 mb-4">
            <p className="text-xs md:text-sm text-gray-600 mb-1">Total Drinks Needed</p>
            <p className="text-2xl md:text-3xl font-semibold text-brand-yellow">{Math.ceil(totalDrinks)}</p>
          </div>

          {/* Compact Table View - Mobile */}
          <div className="md:hidden bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Item</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900">Wine Bottles</div>
                    <div className="text-xs text-gray-500">750ml each (5 glasses per bottle)</div>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-xl font-semibold text-gray-900">{wineBottles}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900">Liquor Bottles</div>
                    <div className="text-xs text-gray-500">750ml each (17 drinks per bottle)</div>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-xl font-semibold text-gray-900">{liquorBottles}</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">
                    <div className="font-medium text-gray-900">Beer Cans/Bottles</div>
                    <div className="text-xs text-gray-500">12oz each</div>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-xl font-semibold text-gray-900">{beers}</span>
                  </td>
                </tr>
                {champagneToast && (
                  <tr className="bg-yellow-50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-900">Champagne Bottles</div>
                      <div className="text-xs text-gray-500">For toast (750ml, 5 glasses each)</div>
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className="text-xl font-semibold text-brand-yellow">{champagneBottles}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Card View - Desktop */}
          <div className="hidden md:block space-y-6">
            {/* Wine Bottles */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Wine Bottles</p>
                  <p className="text-xs text-gray-500">750ml each (5 glasses per bottle)</p>
                </div>
                <p className="text-4xl font-semibold text-gray-900">{wineBottles}</p>
              </div>
            </motion.div>

            {/* Liquor Bottles */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Liquor Bottles</p>
                  <p className="text-xs text-gray-500">750ml each (17 drinks per bottle)</p>
                </div>
                <p className="text-4xl font-semibold text-gray-900">{liquorBottles}</p>
              </div>
            </motion.div>

            {/* Beer Cans */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Beer Cans/Bottles</p>
                  <p className="text-xs text-gray-500">12oz each</p>
                </div>
                <p className="text-4xl font-semibold text-gray-900">{beers}</p>
              </div>
            </motion.div>

            {/* Champagne Bottles */}
            {champagneToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg p-6 shadow-sm border-2 border-brand-yellow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Champagne Bottles</p>
                    <p className="text-xs text-gray-500">For toast (750ml, 5 glasses each)</p>
                  </div>
                  <p className="text-4xl font-semibold text-brand-yellow">{champagneBottles}</p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900 font-medium mb-2">Party On Delivery Advantage:</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Order with confidence! We offer 100% buyback on unopened bottles, so you never have to worry about over-ordering.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              *Estimates based on standard corporate events. Actual needs may vary.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-brand-yellow text-gray-900 rounded-md hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              Get a Custom Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
