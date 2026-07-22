/**
 * Premiere Credit automation — customer email send.
 *
 * Thin wrapper over sendEmailDetailed that builds the credit email and logs it
 * with the PREMIERE_CREDIT type. Kept separate from grant-service so the SMS +
 * status logic there stays readable.
 */

import { sendEmailDetailed } from '@/lib/email/resend-client';
import {
  generatePremiereCreditEmail,
  generatePremiereCreditText,
  premiereCreditSubject,
} from '@/lib/email/templates/premiere-credit';

export interface SendPremiereCreditEmailInput {
  to: string;
  customerName: string;
  code: string;
  amount: number;
  expiresAt: Date;
  /** Where the customer redeems — their dashboard, or the order-page fallback. */
  redeemUrl: string;
  grantId: string;
  discountId?: string;
}

/** Build + send the customer credit email. Returns the send result. */
export async function sendPremiereCreditEmail(
  input: SendPremiereCreditEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const data = {
    customerName: input.customerName,
    code: input.code,
    amount: input.amount,
    expiresAt: input.expiresAt,
    redeemUrl: input.redeemUrl,
  };

  const result = await sendEmailDetailed({
    to: input.to,
    subject: premiereCreditSubject(input.amount),
    html: generatePremiereCreditEmail(data),
    text: generatePremiereCreditText(data),
    type: 'PREMIERE_CREDIT',
    replyTo: 'info@partyondelivery.com',
    tags: [{ name: 'campaign', value: 'premiere-credit' }],
    metadata: { kind: 'premiere-credit', grantId: input.grantId, discountId: input.discountId, code: input.code },
  });

  return { sent: result.sent, error: result.error };
}
