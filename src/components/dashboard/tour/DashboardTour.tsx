'use client';

import { useEffect, useRef } from 'react';
import type { TourStep } from './OnboardingTourProvider';
import useTour from './useTour';
import { loadDeliveryWindow } from '@/lib/deliveryWindow/window';

interface Props {
  isHost: boolean;
  hasPartyType: boolean;
  shareCode: string;
}

function buildSteps(): TourStep[] {
  return [
    {
      target: '[data-tour="delivery-details"]',
      title: 'Delivery Details',
      content:
        'Set your delivery date, time, and address here. Tap to expand and edit.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="add-tab"]',
      title: 'Multiple Locations',
      content:
        'Need a house delivery AND a boat drop-off? Add another location tab here.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="share-button"]',
      title: 'Invite Friends',
      content:
        'Share this link so friends can add their own items to the order. Everyone can add, edit, and purchase their own items.',
      placement: 'bottom-end',
    },
    {
      target: '[data-tour="participants"]',
      title: 'See Your Group',
      content:
        'View who has joined your order. Add another host to help manage the order.',
      placement: 'bottom-end',
    },
    {
      target: '[data-tour="get-recs"]',
      title: 'Get Recommendations',
      content:
        'Not sure what to order? Use our drink calculator to get personalized recommendations based on your party size and preferences.',
      placement: 'top',
    },
  ];
}

export default function DashboardTour({
  isHost,
  hasPartyType,
  shareCode,
}: Props) {
  const { startTour, isRunning } = useTour();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isHost || !hasPartyType || isRunning || startedRef.current) return;

    try {
      const raw = localStorage.getItem(
        `dashboard_tour_completed_${shareCode}`
      );
      const completed: string[] = raw ? JSON.parse(raw) : [];
      if (completed.includes('welcome')) return;
    } catch {
      // Ignore parse errors
    }

    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    const begin = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      startTimer = setTimeout(() => {
        startTour('welcome', buildSteps());
      }, 500);
    };

    // Don't start the tour until the "When is your delivery?" gate
    // (DeliveryWindowGate) has been answered. That gate fires on first
    // /dashboard view and its choice persists via loadDeliveryWindow(); the
    // tour renders above it (z-9999 vs z-210), so starting sooner drops the
    // tour spotlight on top of a required modal. Poll until it's answered,
    // then begin -- mirrors how the gate itself waits for the age gate.
    if (loadDeliveryWindow() !== null) {
      begin();
    } else {
      poll = setInterval(() => {
        if (loadDeliveryWindow() !== null) {
          if (poll) clearInterval(poll);
          begin();
        }
      }, 300);
    }

    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (poll) clearInterval(poll);
    };
  }, [isHost, hasPartyType, isRunning, shareCode, startTour]);

  return null;
}
