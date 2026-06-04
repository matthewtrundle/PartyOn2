import type { ReactElement } from 'react';
import type { Review, ThemeColors } from '../types';

type Props = {
  reviews: Review[];
  theme: ThemeColors;
  eyebrow?: string;
  headline?: string;
};

export default function ReviewsSection({
  reviews,
  theme: T,
  eyebrow,
  headline,
}: Props): ReactElement {
  return (
    <section className="py-20 text-white" style={{ background: T.navy }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {(eyebrow || headline) && (
          <div className="text-center mb-14">
            {eyebrow && (
              <p
                className="font-bold tracking-[0.15em] text-sm mb-3"
                style={{ color: T.primary }}
              >
                {eyebrow}
              </p>
            )}
            {headline && (
              <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                {headline}
              </h2>
            )}
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div
              key={r.author}
              className="bg-white/5 backdrop-blur rounded-xl p-7"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="text-lg mb-3" style={{ color: T.primary }}>
                ★★★★★
              </div>
              <p className="text-gray-100 leading-relaxed mb-5">&ldquo;{r.quote}&rdquo;</p>
              <div className="text-sm">
                <div className="font-bold text-white">{r.author}</div>
                <div className="opacity-70">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
