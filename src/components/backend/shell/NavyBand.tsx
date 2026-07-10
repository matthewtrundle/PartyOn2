import { ReactElement, ReactNode } from 'react';

/**
 * Full-bleed navy strip rendered as a page's first child, visually
 * contiguous with the mobile app bar. Pages put their segmented controls /
 * header rows inside. `innerClassName` matches the page's content max-width
 * so the band's contents align with the body below.
 */
export default function NavyBand({
  children,
  innerClassName = 'max-w-7xl mx-auto',
}: {
  children: ReactNode;
  innerClassName?: string;
}): ReactElement {
  return (
    <div className="bg-navy px-4 md:px-6 pt-1.5 pb-2.5 print:hidden">
      <div className={innerClassName}>{children}</div>
    </div>
  );
}
