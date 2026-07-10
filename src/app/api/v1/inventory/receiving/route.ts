import { NextRequest, NextResponse } from 'next/server';
import { uploadToBlob, isBlobConfigured } from '@/lib/storage/blob';
import { parseInvoiceImage } from '@/lib/inventory/receiving/parser';
import { createInvoiceFromParse } from '@/lib/inventory/receiving/service';
import { prisma } from '@/lib/database/client';
import { requireOpsAuth } from '@/lib/auth/ops-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  const invoices = await prisma.receivingInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: { _count: { select: { lines: true } } },
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireOpsAuth();
  if (auth instanceof NextResponse) return auth;

  if (!isBlobConfigured()) {
    return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large — please retake at lower quality' }, { status: 413 });
  }

  let uploadUrl: string;
  try {
    const upload = await uploadToBlob(file, {
      folder: 'receiving',
      contentType: file.type,
    });
    uploadUrl = upload.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Blob upload failed';
    console.error('[Receiving] Blob upload error:', err);
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }

  let invoiceId: string;
  try {
    const parsed = await parseInvoiceImage(uploadUrl);
    invoiceId = await createInvoiceFromParse({ imageUrl: uploadUrl, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    console.error('[Receiving] Parse error:', err);
    const invoice = await prisma.receivingInvoice.create({
      data: {
        imageUrl: uploadUrl,
        status: 'PENDING_REVIEW',
        parseErrorMessage: message,
      },
    });
    return NextResponse.json({ invoiceId: invoice.id, parseError: message }, { status: 200 });
  }

  return NextResponse.json({ invoiceId });
}
