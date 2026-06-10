'use client';

import Image from 'next/image';

interface WelcomeStepProps {
  onStart: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ onStart, onSkip }: WelcomeStepProps) {
  return (
    <section className="relative min-h-screen pt-14 md:pt-16 flex items-center justify-center overflow-hidden">
      <Image
        src="/images/order/order-hero.png"
        alt="Premium Bar Setup at Austin Pool Party"
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/70" />

      <div className="relative text-center text-white z-10 max-w-2xl mx-auto px-6">
        <h1 className="font-heading font-light text-5xl md:text-7xl mb-4 tracking-[0.08em] leading-tight md:leading-tight">
          <span className="block text-white mb-2">Get a Custom Drink</span>
          <span className="block text-brand-yellow italic">Recommendation in Two Minutes</span>
        </h1>
        <div className="w-24 h-px bg-brand-yellow mx-auto mb-6" />
        <p className="text-lg md:text-xl font-light tracking-[0.05em] text-gray-200 mb-10">
          Tell us about your event and we&apos;ll do the math
        </p>

        <button
          onClick={onStart}
          className="inline-block bg-brand-yellow text-gray-900 font-semibold text-lg px-10 py-4 rounded-full tracking-[0.08em] hover:bg-yellow-400 transition-colors shadow-lg hover:shadow-xl"
        >
          GET MY REC
        </button>

        <div className="mt-8">
          <button
            onClick={onSkip}
            className="text-gray-300 hover:text-white text-sm tracking-[0.08em] underline underline-offset-4 decoration-gray-500 hover:decoration-white transition-colors"
          >
            or scroll down to build a cart manually
          </button>
        </div>
      </div>
    </section>
  );
}
