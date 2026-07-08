'use client';

import type { CSSProperties, ReactElement } from 'react';
import { FullMoonUIProvider, useFullMoonUI } from './ui-context';
import { THEME } from './event';
import SkyBackdrop from './SkyBackdrop';
import FullMoonNav from './FullMoonNav';
import Hero from './Hero';
import QuickFacts from './QuickFacts';
import ShareInline from './ShareInline';
import Vibe from './Vibe';
import WhatsIncluded from './WhatsIncluded';
import ScheduleTimeline from './ScheduleTimeline';
import TacoBar from './TacoBar';
import DrinksViaPod from './DrinksViaPod';
import ThresholdWidget from './ThresholdWidget';
import Gallery from './Gallery';
import Faq from './Faq';
import SiteFooter from './SiteFooter';
import StickyCta from './StickyCta';
import FabShare from './FabShare';
import ShareSheet from './ShareSheet';
import SuccessModal from './SuccessModal';
import Toast from './Toast';
import styles from './full-moon.module.css';

/** Everything inside the UI provider so sections/overlays can trigger sharing + success. */
function Experience(): ReactElement {
  const { openSuccess } = useFullMoonUI();

  // Ticket seam. For this preview the CTA opens the success/share flow.
  // TODO(launch): sell the $69 ticket as a Product in its own category and route
  // this through the pay-now DraftOrder flow (POST /api/v1/landing/quote →
  // /invoice/<token>/checkout), the same path the disco-cruise event uses.
  const onGetTicket = openSuccess;

  return (
    <>
      <SkyBackdrop />
      <FullMoonNav />
      <main className={styles.content}>
        <Hero onGetTicket={onGetTicket} />
        <QuickFacts />
        <ShareInline />
        <Vibe />
        <WhatsIncluded />
        <ScheduleTimeline />
        <TacoBar />
        <DrinksViaPod />
        <ThresholdWidget onGetTicket={onGetTicket} />
        <Gallery />
        <Faq />
        <SiteFooter />
      </main>
      <StickyCta />
      <FabShare />
      <ShareSheet />
      <SuccessModal />
      <Toast />
    </>
  );
}

/**
 * The Lake Travis Full Moon Party landing page. A single dark, scrolling
 * document with a fixed sunset→moonrise backdrop. The neon accent theme is set
 * as custom properties on the page root (the per-event re-theming hook).
 */
export default function FullMoonParty(): ReactElement {
  const pageStyle = {
    '--neon-a': THEME.neonA,
    '--neon-b': THEME.neonB,
    '--moon-glow': THEME.moonGlow,
  } as CSSProperties;

  return (
    <div className={styles.page} style={pageStyle}>
      <FullMoonUIProvider>
        <Experience />
      </FullMoonUIProvider>
    </div>
  );
}
