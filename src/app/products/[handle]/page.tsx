import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/database/client';
import { transformToProduct } from '@/lib/products/transform';
import { Product } from '@/lib/types';
import ProductDetailClient from '@/components/products/ProductDetailClient';
import SneebergFAQ from '@/components/products/SneebergFAQ';
import FatEsMatorMixFAQ from '@/components/products/FatEsMatorMixFAQ';
import MillerLiteKegFAQ from '@/components/products/MillerLiteKegFAQ';
import CoronaExtraKegFAQ from '@/components/products/CoronaExtraKegFAQ';
import BorrascaBrutCavaFAQ from '@/components/products/BorrascaBrutCavaFAQ';
import ProductBreadcrumbs from '@/components/products/ProductBreadcrumbs';
import ProductFAQ from '@/components/products/ProductFAQ';
import { getProductRobotsMeta } from '@/lib/noindex-products';
import { buildProductMetadata } from '@/lib/seo/build-metadata';
import { getProductEditorial } from '@/lib/products/editorial-content';

interface Props {
  params: Promise<{ handle: string }>;
}

const productInclude = {
  images: { orderBy: { position: 'asc' as const } },
  variants: {
    include: { image: true },
    orderBy: { createdAt: 'asc' as const },
  },
  categories: { include: { category: true } },
};

/** Fetch product from PostgreSQL by handle */
async function getProduct(handle: string): Promise<Product | null> {
  try {
    const dbProduct = await prisma.product.findFirst({
      where: {
        OR: [{ handle }, { id: handle }],
      },
      include: productInclude,
    });

    if (!dbProduct) return null;

    return transformToProduct(dbProduct) as Product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);

  const robots = getProductRobotsMeta(handle);

  if (!product) {
    return { title: 'Product Not Found', robots };
  }

  const image = product.images.edges[0]?.node.url || '/images/pod-logo-2025.svg';
  const plainDescription = product.description?.replace(/<[^>]*>/g, '') || '';
  const truncatedDescription = plainDescription.length > 160
    ? plainDescription.substring(0, 157) + '...'
    : plainDescription;

  const isSchneebergProduct = handle.toLowerCase().includes('schneeberg') ||
                               handle.toLowerCase().includes('poschl') ||
                               handle.toLowerCase().includes('weiss');

  // Miller Lite Keg - High-traffic product optimization
  if (handle === 'miller-lite-keg') {
    return {
      title: 'Miller Lite Keg Austin | 1/2 Barrel (15.5 gal) | Party On Delivery',
      description: 'Miller Lite keg delivery in Austin. 1/2 barrel serves 165 drinks. Perfect for parties, weddings, tailgates. Same-day Austin delivery available. Order now!',
      keywords: 'miller lite keg, miller lite keg austin, miller lite keg delivery, beer keg austin, half barrel keg, party keg delivery austin, wedding keg austin',
      robots,
      openGraph: {
        title: 'Miller Lite Keg Austin | 1/2 Barrel Keg Delivery',
        description: 'Miller Lite 1/2 barrel keg delivered throughout Austin. Serves 165 drinks. Perfect for weddings, corporate events, and parties.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Miller Lite half barrel keg for Austin parties and events' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Miller Lite Keg Austin | Party Keg Delivery',
        description: 'Miller Lite keg delivery in Austin. 165 servings. Perfect for weddings and parties.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Pinthouse Electric Jellyfish
  if (handle === 'pinthouse-electric-jellyfish-16oz-4-pack-can') {
    return {
      title: 'Pinthouse Electric Jellyfish IPA Austin | 16oz 4-Pack | Local Delivery',
      description: 'Buy Pinthouse Electric Jellyfish IPA in Austin. Award-winning local IPA. 16oz 4-pack cans delivered throughout Austin. Support local breweries. Order today!',
      keywords: 'electric jellyfish beer, pinthouse beer, pinthouse electric jellyfish, austin ipa, local austin beer, craft beer austin delivery, pinthouse brewery',
      robots,
      openGraph: {
        title: 'Pinthouse Electric Jellyfish IPA | Austin Craft Beer Delivery',
        description: 'Award-winning Pinthouse Electric Jellyfish IPA delivered in Austin. Support local Austin breweries with fast delivery.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Pinthouse Electric Jellyfish IPA 16oz 4-pack cans' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Pinthouse Electric Jellyfish IPA | Austin Beer Delivery',
        description: 'Award-winning local Austin IPA delivered fast. Support Pinthouse Brewery.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Fat E's Spicy Mator Mix
  if (handle === 'fat-es-spicy-mator-mix') {
    return {
      title: "Fat E's Spicy Mator Mix Austin | Bloody Mary Mix | Fast Delivery",
      description: "Fat E's Spicy Mator Mix delivered in Austin. Premium bloody mary mix with bold, spicy flavor. Perfect for brunch, parties, weddings. Order online!",
      keywords: "fat e bloody mary mix, bloody mary mix austin, spicy bloody mary mix, brunch bloody mary, fat e's mator mix, austin bloody mary delivery",
      robots,
      openGraph: {
        title: "Fat E's Spicy Mator Mix | Premium Bloody Mary Mix Austin",
        description: "Premium spicy bloody mary mix delivered in Austin. Perfect for brunch parties, weddings, and events.",
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: "Fat E's Spicy Mator Mix bloody mary mix bottle" }],
      },
      twitter: {
        card: 'summary_large_image',
        title: "Fat E's Spicy Mator Mix | Bloody Mary Mix Austin",
        description: 'Bold, spicy bloody mary mix delivered in Austin. Perfect for brunch.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Modelo Ranch Water 6-Pack - High-traffic product optimization
  if (handle === 'modelo-ranch-water-6-pack') {
    return {
      title: 'Modelo Ranch Water 6-Pack | $10.99 | Austin Delivery',
      description: 'Buy Modelo Ranch Water 6-pack 12oz cans in Austin. Crisp tequila-style ranch water with lime. Same-day delivery available. Order online.',
      keywords: 'modelo ranch water, ranch water, modelo ranch water 6 pack, ranch water austin, tequila ranch water, modelo delivery austin',
      robots,
      openGraph: {
        title: 'Modelo Ranch Water 6-Pack | Austin Delivery',
        description: 'Modelo Ranch Water 6-pack delivered in Austin. Crisp, refreshing tequila-style ranch water with lime.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Modelo Ranch Water 6-pack 12oz cans' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Modelo Ranch Water 6-Pack | Austin Delivery',
        description: 'Modelo Ranch Water delivered in Austin. Crisp ranch water with lime.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Bud Light 24-Pack - High-traffic product optimization
  if (handle === 'bud-light-24-can-suitcase-12oz') {
    return {
      title: 'Bud Light 24-Pack | $29.99 | Austin Beer Delivery',
      description: 'Order a 24-pack of Bud Light 12oz cans delivered in Austin TX. Perfect for parties, tailgates & cookouts. Same-day delivery available.',
      keywords: '24 pack bud light, bud light 24 pack, bud light delivery austin, bud light case, beer delivery austin, party beer austin',
      robots,
      openGraph: {
        title: 'Bud Light 24-Pack | Austin Beer Delivery',
        description: '24-pack Bud Light 12oz cans delivered in Austin. Perfect for parties and tailgates.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Bud Light 24-pack suitcase 12oz cans' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Bud Light 24-Pack | Austin Beer Delivery',
        description: '24-pack Bud Light delivered in Austin. Same-day delivery available.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Aperol Spritz Party Pitcher Kit - High-traffic product optimization
  if (handle === 'aperol-spritz-party-pitcher-kit-16-drinks') {
    return {
      title: 'Aperol Spritz Kit | Serves 16 | $67.99 | Austin',
      description: 'Aperol Spritz Party Pitcher Kit -- serves 16 drinks. Everything you need for poolside gatherings & bridal showers in Austin. Delivered to your door.',
      keywords: 'aperol spritz kit, aperol spritz party kit, aperol spritz pitcher, cocktail kit austin, aperol delivery austin, bridal shower drinks, pool party cocktails',
      robots,
      openGraph: {
        title: 'Aperol Spritz Party Pitcher Kit | Serves 16 | Austin',
        description: 'Complete Aperol Spritz kit for 16 drinks. Perfect for Austin poolside gatherings, bridal showers & rooftop parties.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Aperol Spritz Party Pitcher Kit serves 16 drinks' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Aperol Spritz Kit | Serves 16 | Austin Delivery',
        description: 'Complete Aperol Spritz party kit for 16 drinks. Delivered in Austin.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Borrasca Brut Cava
  if (handle === 'borrasca-brut-cava') {
    return {
      title: 'Borrasca Brut Cava | Spanish Sparkling Wine | Austin',
      description: 'Buy Borrasca Brut Cava in Austin. Crisp Spanish sparkling wine perfect for weddings, toasts & celebrations. Fast delivery available. Order now.',
      keywords: 'borrasca cava, brut cava austin, spanish sparkling wine, cava delivery austin, sparkling wine austin, champagne alternative, wedding sparkling wine',
      robots,
      openGraph: {
        title: 'Borrasca Brut Cava | Spanish Sparkling Wine Austin Delivery',
        description: 'Premium Spanish cava delivered in Austin. Crisp, elegant sparkling wine perfect for weddings and celebrations.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Borrasca Brut Cava Spanish sparkling wine bottle' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Borrasca Brut Cava | Spanish Sparkling Wine Austin',
        description: 'Elegant Spanish cava delivered in Austin. Perfect for celebrations.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Corona Extra Keg
  if (handle === 'corona-extra-1-2-barrel') {
    return {
      title: 'Corona Extra Keg Austin | 1/2 Barrel | Perfect for Parties',
      description: 'Corona Extra keg delivery in Austin. 1/2 barrel serves 165 drinks. Perfect for lake parties, tailgates, weddings. Austin-wide delivery. Order online!',
      keywords: 'corona keg, corona extra keg austin, corona keg delivery, lake travis keg, beach party keg, corona keg lake travis, austin keg delivery',
      robots,
      openGraph: {
        title: 'Corona Extra Keg Austin | 1/2 Barrel Keg Delivery',
        description: 'Corona Extra keg delivered in Austin. Perfect for Lake Travis parties, tailgates, and summer events. Serves 165 drinks.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Corona Extra half barrel keg for Austin lake parties' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Corona Extra Keg Austin | Lake Party Keg Delivery',
        description: 'Corona keg for Austin lake parties. 165 servings. Summer party ready.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Schneeberg-specific optimized metadata
  if (isSchneebergProduct) {
    return {
      title: 'Pöschl Schneeberg Snuff Austin | Tobacco-Free | Fast Delivery',
      description: 'Buy Pöschl Schneeberg Weiss tobacco-free herbal snuff in Austin. Refreshing peppermint nasal snuff, no tobacco or nicotine. Same-day delivery available. Order now!',
      keywords: 'schneeberg snuff, schneeberg powder, poschl schneeberg, schneeberg austin, tobacco free snuff, nicotine free snuff, herbal snuff austin, peppermint snuff, bavarian nasal mint powder, schneeberg snuff where to buy, schneeberg weiss',
      robots,
      openGraph: {
        title: 'Pöschl Schneeberg Weiss - Tobacco-Free Herbal Snuff | Austin Delivery',
        description: 'Premium tobacco-free, nicotine-free peppermint snuff delivered in Austin. Authentic Pöschl Schneeberg Weiss with same-day delivery.',
        type: 'website',
        url: `https://partyondelivery.com/products/${handle}`,
        images: [{ url: image, width: 1200, height: 1200, alt: 'Pöschl Schneeberg Weiss tobacco-free herbal snuff tin' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Pöschl Schneeberg Snuff - Tobacco-Free Herbal Snuff',
        description: 'Refreshing peppermint herbal snuff. No tobacco, no nicotine. Fast Austin delivery.',
        images: [image],
      },
      alternates: { canonical: `/products/${handle}` },
    };
  }

  // Default metadata via centralized helper.
  // The helper enforces divergent <title> vs <h1> (the H1 renders raw
  // product.title), title/description length clamps, and a canonical URL.
  const baseMetadata = buildProductMetadata({
    handle,
    title: product.title,
    description: truncatedDescription || plainDescription,
    productType: product.productType,
    image: { url: image, alt: product.title },
  });

  return { ...baseMetadata, robots };
}

// Generate static params from PostgreSQL for pre-rendering
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { handle: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return products.map(({ handle }) => ({ handle }));
  } catch (error) {
    console.error('Error fetching products for static generation:', error);
    return [];
  }
}

// Main Server Component
export default async function ProductDetailPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  const isSchneebergProduct = handle.toLowerCase().includes('schneeberg') ||
                               handle.toLowerCase().includes('poschl') ||
                               handle.toLowerCase().includes('weiss');

  // Schema.org structured data
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description?.replace(/<[^>]*>/g, '') || '',
    image: product.images.edges.map(edge => edge.node.url),
    offers: {
      '@type': 'Offer',
      url: `https://partyondelivery.com/products/${handle}`,
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      price: product.priceRange.minVariantPrice.amount,
      availability: product.availableForSale
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Party On Delivery',
      },
      areaServed: {
        '@type': 'City',
        name: 'Austin',
        '@id': 'https://en.wikipedia.org/wiki/Austin,_Texas'
      }
    },
    brand: {
      '@type': 'Brand',
      name: product.vendor || 'Party On Delivery',
    },
    category: product.productType || 'Beverage',
  };

  // Tier-1 editorial rewrites (2026-07 SEO sprint): swap the short DB
  // description for the long-form, internally-linked copy and render the
  // matching FAQ + FAQPage schema. Handles without a rewrite are unchanged.
  const editorial = getProductEditorial(handle);
  const displayProduct = editorial
    ? { ...product, descriptionHtml: editorial.descriptionHtml }
    : product;

  const structuredData = isSchneebergProduct ? {
    ...baseStructuredData,
    name: 'Pöschl Schneeberg Weiss Tobacco-Free Herbal Snuff',
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Tobacco Content', value: 'Tobacco-Free' },
      { '@type': 'PropertyValue', name: 'Nicotine Content', value: 'Nicotine-Free' },
      { '@type': 'PropertyValue', name: 'Flavor', value: 'Peppermint' },
      { '@type': 'PropertyValue', name: 'Type', value: 'Herbal Snuff' },
      { '@type': 'PropertyValue', name: 'Origin', value: 'Germany' },
    ]
  } : baseStructuredData;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ProductBreadcrumbs
        productName={product.title}
        productHandle={handle}
        category={product.productType}
      />

      <ProductDetailClient product={displayProduct} />

      {editorial && (
        <ProductFAQ
          faqs={editorial.faqs}
          heading={editorial.faqHeading}
          schemaId={`faq-${handle}`}
        />
      )}
      {handle === 'fat-es-spicy-mator-mix' && <FatEsMatorMixFAQ />}
      {handle === 'miller-lite-keg' && <MillerLiteKegFAQ />}
      {handle === 'corona-extra-1-2-barrel' && <CoronaExtraKegFAQ />}
      {handle === 'borrasca-brut-cava' && <BorrascaBrutCavaFAQ />}
      {isSchneebergProduct && <SneebergFAQ />}

      <footer className="bg-white py-16 border-t border-gray-200 mt-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img
                src="/images/pod-logo-2025.svg"
                alt="Party On Delivery"
                className="h-16 w-auto mb-4"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Austin&apos;s premier alcohol delivery and event service since 2023.
              </p>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SERVICES</h4>
              <ul className="space-y-2">
                <li><Link href="/weddings" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Weddings</Link></li>
                <li><Link href="/boat-parties" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Boat Parties</Link></li>
                <li><Link href="/austin-bachelor-party-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Celebrations</Link></li>
                <li><Link href="/austin-corporate-event-delivery" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Corporate</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">SHOP</h4>
              <ul className="space-y-2">
                <li><Link href="/order" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">All Products</Link></li>
                <li><Link href="/products?filter=spirits" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Spirits</Link></li>
                <li><Link href="/products?filter=wine" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Wine</Link></li>
                <li><Link href="/products?filter=packages" className="text-gray-600 hover:text-brand-yellow text-sm transition-colors">Packages</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-light text-gray-900 mb-4 tracking-[0.1em]">CONTACT</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>Phone: (737) 371-9700</li>
                <li>Email: info@partyondelivery.com</li>
                <li>Hours: 10AM - 9PM Mon-Sat (closed Sundays)</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">© 2025 Party On Delivery. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-brand-yellow text-sm transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
