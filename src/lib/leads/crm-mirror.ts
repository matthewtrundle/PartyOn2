/**
 * Lead Flow → CoreLinq CRM mirror.
 *
 * One helper the six submit routes call after their Lead write: fetches the
 * fresh row, flattens the board facts, and fans out a `lead.captured` event
 * via postToCoreLinq. Inert until CORELINQ_INGEST_URL is set (which waits on
 * the fork accepting the event — see the partyon-crm follow-up PR).
 *
 * Never throws: a CRM mirror hiccup must not break a customer form submit.
 */

import { prisma } from '@/lib/database/client';
import { notifyLeadCaptured } from '@/lib/webhooks/ghl';
import { normalizeEmail } from './email-validation';
import { extractLeadFacts, temperatureFor } from './scoring';

const SITE_URL = 'https://partyondelivery.com';

/** Deep link to a card on the Lead Flow board. */
export function leadBoardUrl(leadId: string): string {
  return `${SITE_URL}/admin/leads?lead=${leadId}`;
}

export interface LeadRef {
  leadId?: string | null;
  /** Fallback for routes with no Lead in scope (landing/quote — the pixel
      creates the row client-side); resolves to the newest match. */
  email?: string | null;
}

export async function mirrorLeadToCrm(ref: LeadRef, source: string): Promise<void> {
  try {
    const email = normalizeEmail(ref.email);
    const lead = ref.leadId
      ? await prisma.lead.findUnique({ where: { id: ref.leadId } })
      : email
        ? await prisma.lead.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } })
        : null;
    if (!lead) return;
    const facts = extractLeadFacts(lead.metadata);
    await notifyLeadCaptured({
      event: 'lead.captured',
      leadId: lead.id,
      first_name: lead.firstName ?? '',
      last_name: lead.lastName ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      source,
      sourcePage: lead.sourcePage ?? '',
      occasion: facts.occasion ?? '',
      eventDate: facts.eventDate ?? '',
      headcount: facts.headcount,
      budgetPerPerson: facts.budgetPerPerson != null ? String(facts.budgetPerPerson) : '',
      score: lead.leadScore,
      temperature: temperatureFor(lead.leadScore) ?? '',
      pipelineStage: lead.pipelineStage ?? '',
      utmSource: lead.utmSource ?? '',
      utmMedium: lead.utmMedium ?? '',
      utmCampaign: lead.utmCampaign ?? '',
      leadUrl: leadBoardUrl(lead.id),
      capturedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[crm-mirror] lead.captured mirror failed', err);
  }
}
