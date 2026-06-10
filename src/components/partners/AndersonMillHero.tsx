/**
 * @fileoverview Anderson Mill Marina hero - full-width centered layout
 * @module components/partners/AndersonMillHero
 */

'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Button from '@/components/Button';

const ROTATING_WORDS = ['Beer', 'Seltzers', 'Cocktails', 'Ice', 'Mixers', 'Cups', 'Everything'];

const heroFadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/**
 * Anderson Mill Marina hero section - full-width centered
 * Dark overlay on background image, centered content with CTAs
 */
export default function AndersonMillHero(): ReactElement {
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  const rotateWord = useCallback(() => {
    setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(rotateWord, 2400);
    return () => clearInterval(interval);
  }, [rotateWord]);

  const handleJoin = () => {
    if (joinCode.trim()) {
      window.location.href = `/group/${joinCode.trim().toUpperCase()}`;
    }
  };

  return (
    <section className="relative min-h-[50vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden py-12 md:py-0">
      {/* Background Image */}
      <Image
        src="/images/partners/anderson-mill-marina-hero.png"
        alt="Anderson Mill Marina on Lake Travis"
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/60" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-6 md:px-8">
        <motion.p
          {...heroFadeUp}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-heading text-lg md:text-2xl font-bold tracking-[0.04em] uppercase text-white/90 mb-2 md:mb-3"
        >
          Anderson Mill Marina Boat Club Concierge
        </motion.p>
        <motion.h1
          {...heroFadeUp}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-heading text-4xl md:text-6xl font-bold tracking-[0.02em] text-white mb-3 md:mb-4"
        >
          <span className="inline-block relative align-baseline">
            {/* Ghost text — invisible, holds width of longest word */}
            <span className="invisible" aria-hidden="true">Everything</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={ROTATING_WORDS[wordIndex]}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0 text-brand-yellow text-center"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          <br />
          <span className="text-white">delivered to your slip!</span>
        </motion.h1>
        <motion.p
          {...heroFadeUp}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-sans text-lg md:text-xl text-white/90 mb-4 md:mb-6 max-w-2xl mx-auto"
        >
          Delivered to Anderson Mill Marina before you head out — with ice, cups, and an easy way for the crew to pay separately.
        </motion.p>

        {/* Trust Chips */}
        <motion.div
          {...heroFadeUp}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-wrap items-center justify-center gap-2 mb-5 md:mb-8"
        >
          <span className="bg-white/10 backdrop-blur text-white text-sm rounded-lg px-3 py-1 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Free marina delivery
          </span>
          <span className="bg-white/10 backdrop-blur text-white text-sm rounded-lg px-3 py-1 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            TABC Licensed
          </span>
          <span className="bg-white/10 backdrop-blur text-white text-sm rounded-lg px-3 py-1 flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-1 text-white">5-star guests</span>
          </span>
        </motion.div>

        {/* Stacked CTAs */}
        <motion.div
          {...heroFadeUp}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        >
        <div className="flex flex-col items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <Button variant="cart" size="lg" href="/order">
            Start a Group Order (split payments)
          </Button>
          <button
            onClick={() => {
              document.getElementById('drink-calculator')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center justify-center font-sans font-semibold tracking-[0.08em] rounded-lg px-6 py-3 text-sm md:text-base border-2 border-white/40 text-white hover:bg-white/10 transition-colors"
          >
            Build my cart (Drink Calculator)
          </button>
        </div>

        {/* Tertiary Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4">
          <button
            onClick={() => {
              document.getElementById('boat-collections')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-white/70 hover:text-white text-sm underline"
          >
            Shopping solo? Start an individual order
          </button>

          <span className="text-white/20 hidden sm:inline">|</span>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="text-white/70 hover:text-white text-sm underline"
            >
              Already have a group? Enter code
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="hero-join-code"
                name="shareCode"
                className="h-9 w-24 rounded-lg bg-black/30 border border-white/20 px-2 text-white text-sm text-center
                           placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-brand-yellow/50"
                placeholder="CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="h-9 rounded-lg px-3 text-sm text-brand-yellow font-medium hover:text-brand-yellow/80 transition
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          )}
        </div>

        {/* Microcopy */}
        <p className="text-white/60 text-sm">
          Everyone adds items and pays their portion at checkout. No Venmo chasing.
        </p>
        </motion.div>
      </div>
    </section>
  );
}
