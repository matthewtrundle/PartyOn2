# Public Assets Organization Plan

## Folder Structure Overview

```
public/
└── images/
    ├── hero/                    # Hero images for main pages
    ├── services/                # Service-specific imagery
    │   ├── weddings/           # Wedding service images
    │   ├── boat-parties/       # Boat party service images
    │   ├── corporate/          # Corporate event images
    │   ├── bach-parties/       # Bachelor/bachelorette party images
    │   └── fast-delivery/      # Fast delivery service images
    ├── products/               # Product images (bottles, packages, etc.)
    ├── backgrounds/            # Background images for sections
    ├── ui/                     # UI elements
    │   ├── icons/             # Icon files
    │   └── logos/             # Logo variations
    ├── gallery/                # Additional showcase images
    └── unused/                 # Currently unused images (for future use)
```

## File Organization Map

### Hero Images (Main page backgrounds)
- **hero/**
  - `austin-skyline-hero.png` - Main homepage hero (currently: biff01_Austin_skyline_at_golden_hour_from_Mount_Bonnell_viewp_*.png)
  - `lake-travis-sunset.jpg` - Lake Travis hero image
  - `neon-nights-hero.jpg` - Party mode hero
  - `lake-life-hero.jpg` - Lake life theme hero
  - `festival-hero.jpg` - Festival theme (unused)
  - `tech-minimal-hero.jpg` - Tech minimal theme (unused)
  - `retro-beach-hero.jpg` - Retro beach theme (unused)

### Service Images
- **services/weddings/**
  - `outdoor-bar-setup.png` - Main wedding bar setup
  - `sunset-ceremony.png` - Sunset wedding ceremony
  - `grand-estate-wedding.png` - Grand Austin estate wedding
  - `intimate-garden-wedding.png` - Intimate garden wedding setup
  - `bartender-crafting.png` - Bartender crafting cocktails
  - `champagne-tower.png` - Champagne tower at reception
  - `cocktail-hour-setup.png` - Elegant cocktail hour
  - `professional-bartenders.png` - Professional bartenders serving
  - `bride-groom-toasting.png` - Happy couple toasting
  - `signature-cocktails-closeup.png` - Close-up of signature cocktails
  - `hill-country-spirits-display.png` - Premium spirits display

- **services/boat-parties/**
  - `luxury-yacht-deck.png` - Main boat party image
  - `aerial-lake-travis.png` - Aerial view of boats
  - `multiple-boats-party.png` - Multiple boats anchored together
  - `professional-bartender-yacht.png` - Bartender on yacht
  - `sunset-boat-party.png` - Sunset boat party
  - `coolers-delivery.png` - Coolers being delivered
  - `friends-toasting-boat.png` - Friends toasting on deck
  - `group-celebrating-boat.png` - Group celebrating on boat
  - `captains-cooler.png` - Captain's cooler packed

- **services/corporate/**
  - `penthouse-suite-setup.png` - Upscale hotel penthouse setup

- **services/bach-parties/**
  - `late-night-party-supplies.png` - Late night party supplies
  - `brunch-mimosa-bar.png` - Elegant brunch mimosa bar

- **services/fast-delivery/**
  - `delivery-app-interface.png` - Modern delivery app interface
  - `realtime-tracking-map.png` - Real-time delivery tracking
  - `mobile-app-interface.png` - Mobile app interface
  - `motion-blur-delivery.png` - Motion-blurred delivery scene
  - `speed-focused-delivery.png` - Speed-focused composition

### Products & Miscellaneous
- **products/**
  - `premium-spirits-boutique.png` - Premium spirits display wall
  - `delivery-bag-contents.png` - Branded delivery bag contents

- **backgrounds/**
  - `lake-travis-wedding-venue.png` - Lake Travis wedding venue
  - `chic-austin-airbnb.png` - Chic Austin Airbnb transformed

- **gallery/**
  - `ai-recommended-setup.png` - AI-recommended party setup
  - `sunset-champagne-pontoon.png` - Sunset champagne on pontoon
  - `party-headquarters.png` - Party On Delivery headquarters
  - `futuristic-cocktail-menu.png` - Futuristic holographic menu

- **ui/icons/**
  - `file.svg`
  - `globe.svg`
  - `next.svg`
  - `vercel.svg`
  - `window.svg`

## Usage Guidelines

1. **Hero Images**: Use for main page backgrounds, should be high quality and optimized
2. **Service Images**: Specific to each service page, maintain consistent style
3. **Products**: Use for showcasing specific products or packages
4. **Backgrounds**: Use for section backgrounds with overlays
5. **Gallery**: Additional images for showcases or carousels
6. **Unused**: Keep for potential future use or alternate themes

## Image Reference Update Required

After reorganization, update all image references in:
- `/src/app/page.tsx`
- `/src/app/weddings/page.tsx`
- `/src/app/boat-parties/page.tsx`
- `/src/app/bach-parties/page.tsx`
- `/src/app/fast-delivery/page.tsx`
- `/src/app/products/page.tsx`
- Any component files using images

## Naming Convention

- Use descriptive, hyphenated names
- Keep names concise but clear
- Include context (e.g., `wedding-`, `boat-`, `austin-`)
- Use appropriate extensions (.jpg for photos, .png for graphics with transparency)