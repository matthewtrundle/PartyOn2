'use client';

import { ReactElement } from 'react';
import Image from 'next/image';
import CountdownTimer from './CountdownTimer';
import type { GroupOrderV2Full } from '@/lib/group-orders-v2/types';

interface Props {
  groupOrder: GroupOrderV2Full;
  isHost: boolean;
}

function getStatusChip(status: string): { bg: string; text: string; border: string; dot?: string } {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', dot: 'bg-success' };
    case 'CLOSED':
      return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' };
    case 'COMPLETED':
      return { bg: 'bg-brand-blue/10', text: 'text-brand-blue', border: 'border-brand-blue/30' };
    default:
      return { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30' };
  }
}

function getDateSubtitle(groupOrder: GroupOrderV2Full): string {
  const tab = (groupOrder.tabs || [])[0];
  const dateStr = tab?.deliveryDate;
  const date = dateStr ? new Date(dateStr) : new Date();
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const year = date.getUTCFullYear();
  return `${month} ${year} ATX`;
}

export default function GroupHeader({ groupOrder, isHost }: Props): ReactElement {
  const statusStyle = getStatusChip(groupOrder.status);
  const activeParticipants = (groupOrder.participants || []).filter(
    (p) => p.status === 'ACTIVE'
  ).length;

  return (
    <div className="relative overflow-hidden border-b border-gray-200">
      <Image
        src="/images/partners/group-dashboard-bg.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      {/* Dramatic gradient overlay - darker on left for readability, lighter on right for vivid image */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/70 via-gray-900/40 to-gray-900/20" />

      {/* Single horizontal row: name+date LEFT, timers RIGHT */}
      <div className="relative py-6 px-4 md:py-8 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left side - Frosted glass tile with name, date, badges, code */}
          <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-2">
              <div>
                <h1 className="font-heading text-4xl md:text-5xl text-white tracking-tight">
                  {groupOrder.name}
                </h1>
                <p className="text-base font-semibold tracking-[0.2em] text-white/70 mt-1">
                  {getDateSubtitle(groupOrder)}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-base font-medium px-4 py-1.5 rounded-full border flex items-center gap-2 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {statusStyle.dot && (
                    <span className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
                  )}
                  {groupOrder.status}
                </span>
                {isHost && (
                  <span className="text-base font-medium px-4 py-1.5 rounded-full border bg-white/20 text-white border-white/30">
                    Host
                  </span>
                )}
                <span className="text-base text-white/60">
                  Code:{' '}
                  <span className="font-mono font-bold text-white text-lg">
                    {groupOrder.shareCode}
                  </span>
                  {' \u00B7 '}
                  {activeParticipants} participant{activeParticipants !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Timers with shadows for depth */}
          <div className="flex flex-row gap-4 shrink-0">
            {groupOrder.timer?.earliestDelivery && (
              <div className="shadow-lg rounded-xl">
                <CountdownTimer
                  targetDate={groupOrder.timer.earliestDelivery}
                  label="Party starts in"
                  variant="delivery"
                  colorScheme="blue"
                />
              </div>
            )}
            {groupOrder.timer?.earliestDeadline && (
              <div className="shadow-lg rounded-xl">
                <CountdownTimer
                  targetDate={groupOrder.timer.earliestDeadline}
                  label="Order closes in"
                  variant="deadline"
                  colorScheme="yellow"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
