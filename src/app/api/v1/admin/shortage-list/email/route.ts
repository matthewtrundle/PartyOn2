import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/ops-session';
import { z } from 'zod';
import { resend } from '@/lib/email/resend-client';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'orders@partyondelivery.com';
const FROM_NAME = 'Party On Delivery';
const RECIPIENT = 'allan@partyondelivery.com';

const bodySchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      quantity: z.number().int().min(1),
      orderNumbers: z.array(z.number().int()),
    })
  ),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { items } = parsed.data;
  if (items.length === 0) {
    return NextResponse.json({ error: 'Shortage list is empty' }, { status: 400 });
  }

  const totalUnits = items.reduce((sum, r) => sum + r.quantity, 0);
  const generatedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const rows = items
    .map(
      (r) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${r.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.title)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;font-size:12px;">${r.orderNumbers.map((n) => `#${n}`).join(', ')}</td>
        </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 4px;">Shortage List</h1>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Generated ${generatedAt} · ${items.length} SKU${items.length === 1 ? '' : 's'} · ${totalUnits} units short</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="border-bottom:2px solid #111827;text-align:left;">
          <th style="padding:8px;width:60px;text-align:center;">Qty</th>
          <th style="padding:8px;">Item</th>
          <th style="padding:8px;text-align:right;">Orders</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body></html>`;

  const text =
    `Shortage List — generated ${generatedAt}\n\n` +
    items.map((r) => `${r.quantity}\t${r.title}\t${r.orderNumbers.map((n) => `#${n}`).join(', ')}`).join('\n') +
    `\n\nTotal units short: ${totalUnits}`;

  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: RECIPIENT,
      subject: `Shortage List — ${totalUnits} units across ${items.length} SKU${items.length === 1 ? '' : 's'}`,
      html,
      text,
    });
    return NextResponse.json({ ok: true, id: result.data?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
