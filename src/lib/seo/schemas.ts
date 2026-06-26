// SEO Schema generators for different page types

import { ShopifyProduct } from '../shopify/types';

export function generateProductSchema(product: ShopifyProduct) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images?.edges?.[0]?.node?.url,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.vendor || 'Party On Delivery'
    },
    offers: {
      '@type': 'Offer',
      price: product.priceRange?.minVariantPrice?.amount,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Party On Delivery'
      },
      deliveryLeadTime: {
        '@type': 'QuantitativeValue',
        value: 72,
        unitCode: 'HUR'
      }
    }
  };
}

export function generateArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
}: {
  title: string
  description: string
  image: string
  datePublished: string
  dateModified?: string
  author: string
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Party On Delivery',
      logo: {
        '@type': 'ImageObject',
        url: 'https://partyondelivery.com/images/pod-logo-2025.svg',
      },
    },
    url: url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://partyondelivery.com${item.url}`
    }))
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Recipe schema (schema.org/Recipe) — drives recipe rich results in Google.
 * Used by cocktail-recipe blog posts that declare a `recipes:` frontmatter array.
 */
export function generateRecipeSchema(recipe: {
  name: string;
  description?: string;
  recipeYield?: string;
  prepTime?: string;
  ingredients: string[];
  instructions: string[];
  image?: string;
  author?: string;
  url?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    ...(recipe.description ? { description: recipe.description } : {}),
    ...(recipe.image ? { image: recipe.image } : {}),
    ...(recipe.url ? { url: recipe.url } : {}),
    author: {
      '@type': recipe.author ? 'Person' : 'Organization',
      name: recipe.author || 'Party On Delivery',
    },
    recipeCategory: 'Cocktail',
    recipeCuisine: 'American',
    ...(recipe.recipeYield ? { recipeYield: recipe.recipeYield } : {}),
    ...(recipe.prepTime ? { prepTime: recipe.prepTime } : {}),
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step,
    })),
  };
}

export function generateEventSchema(eventType: 'wedding' | 'party' | 'corporate' | 'boat' | 'keg') {
  // Generate future date range for ongoing service availability
  // Start from today, end 1 year from today (valid future date range)
  const today = new Date();
  const startDate = today.toISOString();
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const endDate = futureDate.toISOString();

  const events = {
    wedding: {
      name: 'Wedding Bar Service in Austin, Texas',
      description: 'Premium alcohol delivery and bar service for Austin weddings with TABC-certified bartenders, signature cocktails, and full bar packages.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Austin Wedding Venues',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          addressCountry: 'US'
        }
      }
    },
    party: {
      name: 'Bachelor & Bachelorette Party Alcohol Delivery - Austin',
      description: 'Alcohol delivery for bachelor and bachelorette parties in Austin. Premium spirits, party packages, and supplies delivered to hotels, Airbnbs, and venues.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Austin Party Locations',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          addressCountry: 'US'
        }
      }
    },
    boat: {
      name: 'Lake Travis Boat Party Alcohol Delivery',
      description: 'Premium alcohol delivery to Lake Travis marinas and boats for yacht parties, bachelor parties, and waterfront celebrations.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Lake Travis Marinas',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          addressCountry: 'US'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: '30.3893',
          longitude: '-97.9228'
        }
      }
    },
    corporate: {
      name: 'Corporate Event Bar Service - Austin',
      description: 'Professional bar service for corporate events, meetings, and company celebrations with TABC-certified staff and premium beverage packages.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Austin Business District',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          addressCountry: 'US'
        }
      }
    },
    keg: {
      name: 'Beer Keg Delivery Service - Austin, TX',
      description: 'Cold keg delivery for parties, weddings, tailgates, and events in Austin. Miller Lite, Corona, craft beer kegs with tap rentals, tubs, and equipment.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Austin Metropolitan Area',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Austin',
          addressRegion: 'TX',
          addressCountry: 'US'
        }
      }
    }
  };

  const urlMap = {
    wedding: 'https://partyondelivery.com/weddings',
    party: 'https://partyondelivery.com/bach-parties',
    boat: 'https://partyondelivery.com/boat-parties',
    corporate: 'https://partyondelivery.com/corporate-events',
    keg: 'https://partyondelivery.com/kegs'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    ...events[eventType],
    startDate,
    endDate,
    organizer: {
      '@type': 'Organization',
      name: 'Party On Delivery',
      url: 'https://partyondelivery.com',
      telephone: '(737) 371-9700'
    },
    offers: {
      '@type': 'Offer',
      url: urlMap[eventType],
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: startDate
    }
  };
}

export function generateItemListSchema(items: Array<{ name: string; url: string; image?: string; price?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: item.url,
        ...(item.image && { image: item.image }),
        ...(item.price && {
          offers: {
            '@type': 'Offer',
            price: item.price,
            priceCurrency: 'USD'
          }
        })
      }
    }))
  };
}

export function generateServiceSchema(serviceType?: 'wedding' | 'party' | 'corporate' | 'boat') {
  const services = {
    wedding: {
      serviceType: 'Wedding Bar Service',
      name: 'Austin Wedding Bar Service & Alcohol Delivery',
      description: 'Premium bar service and alcohol delivery for Austin weddings. TABC-certified bartenders, signature cocktails, champagne service, and full bar packages for your special day.',
      url: 'https://partyondelivery.com/weddings',
      category: 'Wedding Service'
    },
    party: {
      serviceType: 'Bachelorette Party Delivery',
      name: 'Austin Bachelorette Party Alcohol Delivery',
      description: 'Premium alcohol delivery for Austin bachelor and bachelorette parties. Signature cocktails, party packages, and supplies delivered to hotels, Airbnbs, and venues.',
      url: 'https://partyondelivery.com/bach-parties',
      category: 'Party Service'
    },
    boat: {
      serviceType: 'Lake Travis Boat Party Delivery',
      name: 'Lake Travis Boat Party Alcohol Delivery',
      description: 'Premium alcohol delivery to Lake Travis marinas and boats. Perfect for yacht parties, bachelor parties, and waterfront celebrations with 72-hour advance booking.',
      url: 'https://partyondelivery.com/boat-parties',
      category: 'Delivery Service'
    },
    corporate: {
      serviceType: 'Corporate Event Bar Service',
      name: 'Austin Corporate Event Bar Service',
      description: 'Professional bar service for corporate events, meetings, and company celebrations. TABC-certified staff and premium beverage packages.',
      url: 'https://partyondelivery.com/corporate-events',
      category: 'Corporate Service'
    }
  };

  const serviceDetails = serviceType ? services[serviceType] : {
    serviceType: 'Alcohol Delivery Service',
    name: 'Party On Delivery - Austin Alcohol Delivery',
    description: 'Premium alcohol delivery and bar service for events in Austin, TX',
    url: 'https://partyondelivery.com',
    category: 'Delivery Service'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: serviceDetails.serviceType,
    name: serviceDetails.name,
    description: serviceDetails.description,
    url: serviceDetails.url,
    category: serviceDetails.category,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Party On Delivery',
      url: 'https://partyondelivery.com',
      telephone: '(737) 371-9700',
      priceRange: '$$',
      image: 'https://partyondelivery.com/images/pod-logo-2025.svg',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Austin',
        addressRegion: 'TX',
        addressCountry: 'US'
      }
    },
    areaServed: {
      '@type': 'City',
      name: 'Austin',
      '@id': 'https://en.wikipedia.org/wiki/Austin,_Texas'
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: serviceDetails.url,
      servicePhone: '(737) 371-9700',
      availableLanguage: {
        '@type': 'Language',
        name: 'English'
      }
    },
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '21:00'
    },
    offers: {
      '@type': 'Offer',
      price: '100.00',
      priceCurrency: 'USD',
      eligibleRegion: {
        '@type': 'Place',
        name: 'Austin Metropolitan Area'
      }
    },
    termsOfService: 'https://partyondelivery.com/terms',
    audience: {
      '@type': 'Audience',
      audienceType: 'Customers 21+ years old'
    }
  };
}