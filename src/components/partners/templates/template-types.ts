export interface CategoryTemplateProps {
  affiliate: {
    /** Affiliate DB id — passed to the STR PropertyPicker for order attribution. */
    id: string;
    businessName: string;
    code: string;
    category: string;
    customerPerk: string;
    contactName: string;
    phone: string | null;
    email: string;
    partnerSlug: string | null;
  };
  partnerLogo: string | null;
  partnerHeroImage: string | null;
  /**
   * Optional carousel of hero images. When set with 2+ entries, the template
   * renders a fading carousel instead of the single partnerHeroImage.
   * For PLANNER affiliates, this is [partnerHero, ...sharedPlannerHeros].
   */
  heroImages?: string[];
}
