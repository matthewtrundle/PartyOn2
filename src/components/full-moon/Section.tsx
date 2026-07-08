import type { ReactElement, ReactNode } from 'react';
import styles from './full-moon.module.css';

interface SectionProps {
  id?: string;
  /** Use the tighter vertical rhythm. */
  tight?: boolean;
  children: ReactNode;
}

/** A page section with the immersive vertical rhythm + the standard POD container. */
export default function Section({ id, tight, children }: SectionProps): ReactElement {
  return (
    <section id={id} className={tight ? styles.sectionTight : styles.section}>
      <div className="container-custom">{children}</div>
    </section>
  );
}
