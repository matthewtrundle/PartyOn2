/**
 * STR prospect partner-page slugs → company names.
 *
 * The Lynn's-template fallback in str-partners.ts (defaultStrConfigFor)
 * needs to know, CLIENT-SIDE and synchronously, whether a /partners/<slug>
 * page belongs to an STR prospect — the DB store is async/server-only, and
 * the old prospect-datasets JSON leaked prospect emails/phones into the
 * public bundle. This PII-free map is the replacement.
 *
 * Source of truth: partner_prospects (vertical='str', partner_slug set).
 * Regenerate after adding STR prospects with pages:
 *   npx tsx -e "import {prisma} from './src/lib/database/client'; prisma.partnerProspect.findMany({where:{vertical:'str',partnerSlug:{not:null}},select:{partnerSlug:true,name:true},orderBy:{partnerSlug:'asc'}}).then(r=>{r.forEach(x=>console.log(\`  '\${x.partnerSlug}': \${JSON.stringify(x.name)},\`));return prisma.\$disconnect()})"
 * (Generated 2026-07-22 from the seeded 54 STR prospects.)
 */

export const STR_PROSPECT_SLUGS: Record<string, string> = {
  '512-retreat': '512 Retreat',
  'above-vacation-residences': 'ABOVE Vacation Residences',
  'atx-luxury-rentals': 'ATX Luxury Rentals',
  'austin-bnb-management': 'Austin BNB Management',
  'austin-vacay': 'Austin Vacay',
  'avantstay-austin': 'AvantStay (Austin)',
  'awning': 'Awning',
  'bach-bros-properties': 'Bach Bros Properties',
  'bachelorettestays': 'BacheloretteStays',
  'barcl-group': 'Barclé Group',
  'blueground-austin': 'Blueground (Austin)',
  'casago-austin': 'Casago Austin',
  'clear-stay-properties': 'Clear Stay Properties',
  'evolve-austin': 'Evolve (Austin)',
  'five-star-vacation-home-rentals': 'Five Star Vacation Home Rentals',
  'grand-welcome-austin': 'Grand Welcome Austin',
  'guest-haus': 'Guest Haus',
  'guestable': 'Guestable',
  'guestspaces': 'GuestSpaces',
  'hill-country-lakes-rentals': 'Hill Country Lakes Rentals',
  'hill-country-premier-lodging': 'Hill Country Premier Lodging',
  'hoststarter': 'HostStarter',
  'itrip-vacations-austin': 'iTrip Vacations Austin',
  'jw-properties-lake-travis': 'JW Properties (Lake Travis)',
  'kasa-austin': 'Kasa (Austin)',
  'lazy-h-retreats': 'Lazy H Retreats',
  'limestone-country-properties': 'Limestone Country Properties',
  'locale-hospitality': 'Locale Hospitality',
  'log-country-cove': 'Log Country Cove',
  'lynns-lodging': "Lynn's Lodging",
  'management-with-love': 'Management With Love',
  'masterhost-austin': 'MasterHost (Austin)',
  'mint-house-austin': 'Mint House (Austin)',
  'mod-property-management': 'MOD Property Management',
  'nest-vacation-rentals': 'Nest Vacation Rentals',
  'nomadstr': 'NomadSTR',
  'north-shore-vacation-rentals': 'North Shore Vacation Rentals',
  'oberg-properties': 'Oberg Properties',
  'one-fine-bnb': 'One Fine BnB',
  'placemakr-austin': 'Placemakr (Austin)',
  'pmi-atx-properties': 'PMI ATX Properties',
  'renters-club': 'Renters Club',
  'restoration-43': 'Restoration 43',
  'skyrun-austin': 'SkyRun Austin',
  'sprkhost': 'SPRKhost',
  'stay-local-austin': 'Stay Local Austin',
  'str-management-llc': 'STR Management, LLC',
  'surge': 'Surge',
  'twinity-properties': 'Twinity Properties',
  'vacasa-austin': 'Vacasa (Austin)',
  'vacay-hill-country': 'Vacay Hill Country',
  'via-luxury-rentals': 'Via Luxury Rentals',
  'vivant-stays': 'Vivant Stays',
  'walker-luxury-vacation-rentals': 'Walker Luxury Vacation Rentals',
};
