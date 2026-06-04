import type { ReactElement } from 'react';
import type { ThemeColors } from '../types';

type Props = {
  headline: string;
  body: string;
  theme: ThemeColors;
};

export default function PainSolutionSection({ headline, body, theme: T }: Props): ReactElement {
  return (
    <section className="py-20" style={{ background: T.cream }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2
          className="font-heading text-3xl md:text-5xl font-bold mb-6 leading-tight"
          style={{ color: T.navy }}
        >
          {headline}
        </h2>
        <p className="text-lg md:text-xl text-gray-700 leading-relaxed">{body}</p>
      </div>
    </section>
  );
}
