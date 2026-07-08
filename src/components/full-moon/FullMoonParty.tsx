'use client';

import { useEffect, type CSSProperties, type ReactElement } from 'react';
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
import TicketModal from './TicketModal';
import Toast from './Toast';
import styles from './full-moon.module.css';

/** Everything inside the UI provider so sections/overlays can trigger sharing + tickets. */
function Experience(): ReactElement {
  const { openTicket, openSuccess, showToast } = useFullMoonUI();

  // The Get-a-Ticket CTA opens the purchase form (→ Stripe Checkout).
  const onGetTicket = openTicket;

  // Returning from Stripe: /full-moon?ticket=success|cancelled.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('ticket');
    if (status === 'success') openSuccess();
    else if (status === 'cancelled') showToast('Checkout canceled — your spot is still open.');
    if (status) {
      params.delete('ticket');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
  }, [openSuccess, showToast]);

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
      <TicketModal />
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
