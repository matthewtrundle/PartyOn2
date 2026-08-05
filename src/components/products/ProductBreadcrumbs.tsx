import React from 'react';
import Link from 'next/link';
import Script from 'next/script';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface ProductBreadcrumbsProps {
  productName: string;
  productHandle: string;
  category?: string;
}

/**
 * Breadcrumb navigation with Schema.org structured data for SEO
 * Improves search visibility and provides clear navigation hierarchy
 */
export default function ProductBreadcrumbs({
  productName,
  productHandle,
  category
}: ProductBreadcrumbsProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: 'https://partyondelivery.com/' },
    // /order, not /products — next.config.ts 307s the bare /products route,
    // and this URL is both the visible breadcrumb link and the one Google
    // reads out of the BreadcrumbList schema below.
    { name: 'Products', url: 'https://partyondelivery.com/order' },
  ];

  // Add category if provided
  if (category) {
    breadcrumbs.push({
      name: category,
      url: `https://partyondelivery.com/products?category=${encodeURIComponent(category)}`
    });
  }

  // Add current product (no link)
  breadcrumbs.push({
    name: productName,
    url: `https://partyondelivery.com/products/${productHandle}`
  });

  // Generate BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <>
      {/* Breadcrumb Schema Markup */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Visual Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="py-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 mx-2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {index === breadcrumbs.length - 1 ? (
                  // Current page - no link
                  <span className="text-gray-500 font-medium" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  // Previous pages - clickable links
                  <Link
                    href={item.url.replace('https://partyondelivery.com', '')}
                    className="text-gray-700 hover:text-brand-yellow transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
