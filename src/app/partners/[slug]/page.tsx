import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { getAffiliateBySlug } from '@/lib/affiliates/affiliate-service';
import { getCategoryTemplate } from '@/components/partners/templates';
import partnersData from '@/data/austin-partners.json';

interface Props {
  params: Promise<{ slug: string }>;
}

const HERO_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

function findPartnerData(
  businessName: string,
  partnerSlug: string
): { logo: string | null; heroImage: string | null } {
  const lower = businessName.toLowerCase();
  const match = partnersData.partners.find(
    (p) => p.name.toLowerCase() === lower
  );

  // Fallback: convention-based logo at /images/partners/{slug}-logo.png
  let logo = match?.logo ?? null;
  if (!logo && partnerSlug) {
    const conventionPath = `/images/partners/${partnerSlug}-logo.png`;
    const filePath = path.join(process.cwd(), 'public', conventionPath);
    if (fs.existsSync(filePath)) {
      logo = conventionPath;
    }
  }

  // Per-partner hero image: try austin-partners.json first, then convention
  // /images/partners/{slug}-hero.{jpg|jpeg|png|webp}
  let heroImage = match?.heroImage ?? null;
  if (!heroImage && partnerSlug) {
    for (const ext of HERO_IMAGE_EXTS) {
      const conventionPath = `/images/partners/${partnerSlug}-hero.${ext}`;
      const filePath = path.join(process.cwd(), 'public', conventionPath);
      if (fs.existsSync(filePath)) {
        heroImage = conventionPath;
        break;
      }
    }
  }

  return { logo, heroImage };
}

/**
 * List shared planner hero images dropped into
 * public/images/partners/planner-hero-shared/
 * Sorted alphabetically so admin can control order via filename
 * (e.g. 1-cocktail-kits.jpg, 2-fridge-stocked.jpg).
 */
function getSharedPlannerHeroImages(): string[] {
  const dir = path.join(process.cwd(), 'public/images/partners/planner-hero-shared');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => HERO_IMAGE_EXTS.some((ext) => f.toLowerCase().endsWith(`.${ext}`)))
    .sort()
    .map((f) => `/images/partners/planner-hero-shared/${f}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);

  if (!affiliate || !['ACTIVE', 'DRAFT'].includes(affiliate.status)) {
    return { title: 'Partner Not Found' };
  }

  return {
    title: `${affiliate.businessName} x Party On Delivery | Free Drink Delivery for Your Event`,
    description: `Book ${affiliate.businessName} for your Austin event and get drinks delivered for free. Spirits, mixers, seltzers, ice, and cups delivered to your door by Party On Delivery.`,
    openGraph: {
      title: `${affiliate.businessName} x Party On Delivery | Free Drink Delivery for Your Event`,
      description: `Book ${affiliate.businessName} for your Austin event and get drinks delivered for free.`,
      images: [{ url: '/images/hero/austin-skyline-night-lake.webp' }],
    },
  };
}

export default async function DynamicPartnerPage({ params }: Props) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);

  if (!affiliate || !['ACTIVE', 'DRAFT'].includes(affiliate.status)) {
    notFound();
  }

  const { logo: partnerLogo, heroImage: partnerHeroImage } = findPartnerData(
    affiliate.businessName,
    affiliate.partnerSlug ?? slug
  );
  const CategoryTemplate = getCategoryTemplate(affiliate.category);

  // For PLANNER partners, build a hero carousel: [partnerHero, ...sharedPlannerHeros]
  let heroImages: string[] | undefined;
  if (affiliate.category === 'PLANNER') {
    const shared = getSharedPlannerHeroImages();
    const first = partnerHeroImage; // may be null if no per-partner image yet
    heroImages = first ? [first, ...shared] : shared;
    if (heroImages.length === 0) heroImages = undefined;
  }

  return (
    <CategoryTemplate
      affiliate={{
        businessName: affiliate.businessName,
        code: affiliate.code,
        category: affiliate.category,
        customerPerk: affiliate.customerPerk,
        contactName: affiliate.contactName,
        phone: affiliate.phone,
        email: affiliate.email,
        partnerSlug: affiliate.partnerSlug,
      }}
      partnerLogo={partnerLogo}
      partnerHeroImage={partnerHeroImage}
      heroImages={heroImages}
    />
  );
}
