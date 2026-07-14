/**
 * POST /api/admin/affiliates/bulk-import
 *
 * Bulk partner creation. Admin uploads a CSV (parsed client-side) or
 * enters rows in the bulk form; this endpoint creates one Affiliate +
 * matching FREE_SHIPPING Discount per row — the exact same objects the
 * one-at-a-time flow (create-and-send / scripts/ops/create-affiliate.mjs)
 * produces, so downstream systems (partner pages, portal auth,
 * commissions, dashboards) work unchanged.
 *
 * Per row:
 *   - slug from business name (deduped with -2, -3 … suffixes)
 *   - referral code via the shared generateReferralCode()
 *   - logoUrl: explicit value, else Clearbit derived from the website
 *     domain (https://logo.clearbit.com/<domain>). The partner page
 *     prefers a committed file at public/images/partners/<slug>-logo.png
 *     when one exists; logoUrl is the runtime fallback so bulk creation
 *     never needs a code deploy.
 *   - commissionPercent → Affiliate.commissionRateOverride (e.g. 10 → 0.10)
 *   - email optional: placeholder partners+<slug>@partyondelivery.com
 *     until the real contact is known (portal magic-links need a real
 *     one — flagged in the per-row result)
 *   - status DRAFT (same as the script) — admin activates by sending
 *     the welcome email from /ops/affiliates or /admin/affiliates
 *
 * Response: per-row results (ok/error + slug, code, partnerUrl) so the
 * admin UI can render a review table. Rows are processed independently —
 * one bad row never blocks the rest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRole } from '@/lib/auth/ops-session';
import { prisma } from '@/lib/database/client';
import { generateReferralCode } from '@/lib/affiliates/affiliate-service';
import { AffiliateCategory, AffiliateStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = ['BARTENDER', 'BOAT', 'VENUE', 'LODGING', 'PLANNER', 'OTHER'] as const;

const rowSchema = z.object({
  businessName: z.string().min(2).max(120),
  website: z.string().max(300).optional().default(''),
  category: z.enum(CATEGORIES),
  /** Commission as a percentage, e.g. 10 = 10%. Optional — omitted rows
   *  fall back to the category default rate. */
  commissionPercent: z.number().min(0).max(50).optional().nullable(),
  contactName: z.string().max(120).optional().default(''),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(100),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function domainFrom(website: string): string | null {
  if (!website.trim()) return null;
  try {
    const url = new URL(
      website.startsWith('http') ? website : `https://${website.trim()}`,
    );
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

type RowResult = {
  businessName: string;
  ok: boolean;
  error?: string;
  slug?: string;
  code?: string;
  partnerUrl?: string;
  logoUrl?: string | null;
  placeholderEmail?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole();
  if (auth instanceof NextResponse) return auth;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'invalid_body', detail: String(err) },
      { status: 400 },
    );
  }

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com';
  const results: RowResult[] = [];

  for (const row of body.rows) {
    try {
      // ── Slug: derive + dedupe ─────────────────────────────────
      const baseSlug = slugify(row.businessName);
      if (!baseSlug) {
        results.push({ businessName: row.businessName, ok: false, error: 'unusable business name' });
        continue;
      }
      let slug = baseSlug;
      for (let i = 2; i <= 20; i++) {
        const taken = await prisma.affiliate.findUnique({ where: { partnerSlug: slug } });
        if (!taken) break;
        slug = `${baseSlug}-${i}`;
      }

      // ── Email: real or placeholder ────────────────────────────
      const placeholderEmail = !row.email;
      const email = (row.email ?? `partners+${slug}@partyondelivery.com`).toLowerCase();
      const emailTaken = await prisma.affiliate.findUnique({ where: { email } });
      if (emailTaken) {
        results.push({
          businessName: row.businessName,
          ok: false,
          error: `email already used by affiliate "${emailTaken.businessName}"`,
        });
        continue;
      }

      // ── Logo: explicit > Clearbit-from-domain > none ──────────
      const domain = domainFrom(row.website);
      const logoUrl =
        row.logoUrl ?? (domain ? `https://logo.clearbit.com/${domain}` : null);

      // ── Code + create (same objects as the single-create flow) ─
      const code = generateReferralCode(row.businessName);
      const affiliate = await prisma.affiliate.create({
        data: {
          code,
          partnerSlug: slug,
          contactName: row.contactName || row.businessName,
          businessName: row.businessName,
          email,
          phone: row.phone ?? null,
          category: row.category as AffiliateCategory,
          status: AffiliateStatus.DRAFT,
          logoUrl,
          commissionRateOverride:
            row.commissionPercent != null ? row.commissionPercent / 100 : null,
          internalNotes: [
            `Bulk-imported ${new Date().toISOString().slice(0, 10)}.`,
            row.website ? `Website: ${row.website}` : '',
            placeholderEmail ? 'PLACEHOLDER EMAIL — replace before sending welcome/magic links.' : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
      });

      // ── Matching discount (mirrors create-affiliate.mjs) ──────
      const discountCode = affiliate.code.toUpperCase();
      const existingDiscount = await prisma.discount.findUnique({
        where: { code: discountCode },
      });
      if (!existingDiscount) {
        await prisma.discount.create({
          data: {
            code: discountCode,
            name: discountCode,
            type: 'FREE_SHIPPING',
            value: '0',
            appliesToAll: true,
            applicableProducts: [],
            applicableCategories: [],
            minOrderAmount: '0.01',
            isActive: true,
            combinable: false,
            freeShipping: false,
          },
        });
      }

      results.push({
        businessName: row.businessName,
        ok: true,
        slug,
        code: affiliate.code,
        partnerUrl: `${BASE_URL}/partners/${slug}`,
        logoUrl,
        placeholderEmail,
      });
    } catch (err) {
      console.error('[bulk-import] row failed:', row.businessName, err);
      results.push({
        businessName: row.businessName,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  const created = results.filter((r) => r.ok).length;
  return NextResponse.json({
    success: true,
    created,
    failed: results.length - created,
    results,
  });
}
