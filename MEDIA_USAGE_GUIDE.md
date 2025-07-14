# Party On Delivery - Media Usage Guide

## Overview
This guide outlines the optimal usage of media files throughout the Party On Delivery website, prioritizing video content and reserving AI/robot imagery exclusively for the AI Party Planner page.

## Media Organization Structure
```
public/
├── videos/
│   ├── hero/
│   └── backgrounds/
├── images/
│   ├── hero/
│   ├── backgrounds/
│   ├── ai-assistant/
│   ├── services/
│   │   ├── weddings/
│   │   ├── bach-parties/
│   │   ├── boat-parties/
│   │   ├── corporate/
│   │   └── fast-delivery/
│   ├── products/
│   └── gallery/
└── animations/
```

## Page-Specific Media Recommendations

### 1. Homepage (`/`)

#### Professional Mode
- **Hero Video**: `/videos/hero/austin-skyline-timelapse.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/hero/austin-skyline-golden-hour.png`
- **Service Card Images**:
  - Weddings: `/images/services/weddings/outdoor-bar-setup-travis.png`
  - Boat Parties: `/images/services/boat-parties/luxury-yacht-deck.png`
  - Corporate: `/images/services/corporate/penthouse-suite-setup.png`

#### Party Mode
- **Hero Video**: `/videos/hero/austin-nightlife-cinematic.mp4`
- **Fallback Image**: `/images/hero/austin-6th-street-neon.png`
- **Background Effects**: `/animations/particle-effects-neon-2.png`
- **Service Cards**: Same as professional but with party mode styling

### 2. Weddings Page (`/weddings`)

#### Elegant Mode
- **Hero Video**: `/videos/hero/wedding-venue-travis.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/hero/lake-travis-wedding-sunset-1.png`
- **Gallery Images**:
  - `/images/services/weddings/outdoor-bar-setup-travis.png` (ALREADY IN USE)
  - `/images/services/weddings/signature-cocktails-rings.png` (ALREADY IN USE)
  - `/images/services/weddings/premium-spirits-display.png` (ALREADY IN USE)

#### Luxury Mode
- **Hero Video**: `/videos/hero/wedding-sunset.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/hero/luxury-wedding-estate-2.png`
- **Background**: `/images/backgrounds/rooftop-terrace-elegant-2.png`

#### Wild Mode
- **Hero Video**: Keep existing setup
- **Fallback Image**: `/images/services/weddings/boho-hill-country-2.png`
- **Party Effects**: `/animations/particle-effects-neon-1.png`

### 3. Boat Parties Page (`/boat-parties`)

#### Chill Mode
- **Hero Video**: `/videos/backgrounds/boat-cooler.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/hero/lake-travis-yacht-sunset.png`
- **Gallery**: `/images/services/boat-parties/sunset-champagne-pontoon.png` (ALREADY IN USE)

#### Wild Mode
- **Hero Video**: `/videos/hero/luxury-yacht.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/services/boat-parties/multiple-yachts-party.png`
- **Action Shot**: `/images/hero/luxury-mega-yacht.png`

#### Luxury Mode
- **Hero Video**: `/videos/hero/yacht-sunset.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/services/boat-parties/luxury-yacht-deck.png` (ALREADY IN USE)

### 4. Bach Parties Page (`/bach-parties`)

#### Professional Mode
- **Hero Video**: `/videos/hero/luxury-wedding.mp4` (ALREADY IN USE)
- **Fallback Image**: `/images/services/bach-parties/brunch-mimosa-bar.png`

#### Bachelor Mode
- **Hero Video**: `/videos/backgrounds/bachelor-party-6th-street.mp4`
- **Fallback Image**: `/images/services/bach-parties/bachelor-party-epic.png`
- **Background Effect**: `/animations/particle-effects-neon-2.png`

#### Bachelorette Mode
- **Hero Video**: `/videos/backgrounds/bachelorette-party-glamorous.mp4`
- **Fallback Image**: `/images/services/bach-parties/bachelorette-champagne-tower.png`
- **Background**: `/animations/champagne-bubbles-1.png`

### 5. AI Party Planner Page (`/ai-party-planner`)

**EXCLUSIVE AI/ROBOT CONTENT - DO NOT USE ELSEWHERE**

#### All Modes
- **Primary AI Image**: `/images/ai-assistant/biff-bartender-cowboy.png` (ALREADY IN USE)
- **Background Image**: `/images/ai-assistant/robot-cowboy-horse-sunset.png`
- **Gallery Images**:
  - `/images/gallery/ai-party-setup-flatlay.png`
  - `/images/gallery/holographic-cocktail-menu.png`

### 6. Corporate Events Page (`/corporate`)

- **Hero Image**: `/images/services/corporate/penthouse-suite-setup.png`
- **Background Video**: `/videos/backgrounds/rooftop-party-austin.mp4`
- **Gallery**:
  - `/images/products/premium-spirits-wall.png`
  - `/images/backgrounds/rooftop-terrace-elegant-1.png`

### 7. Fast Delivery Page (`/fast-delivery`)

- **Hero Slideshow**:
  - `/images/services/fast-delivery/motion-blur-delivery.png` (ALREADY IN USE)
  - `/images/services/fast-delivery/speed-delivery-action.png`
- **Product Shot**: `/images/products/branded-delivery-bag.png`
- **Night Service**: `/images/services/bach-parties/late-night-supplies.png`

## Video Implementation Best Practices

1. **Autoplay Settings**:
   ```jsx
   <video
     autoPlay
     muted
     loop
     playsInline
     poster="/path/to/poster.jpg"
   >
   ```

2. **Performance Optimization**:
   - Use `loading="lazy"` for below-fold videos
   - Implement intersection observer for play/pause
   - Serve WebM format alongside MP4
   - Compress videos to under 5MB where possible

3. **Fallback Strategy**:
   - Always provide a poster image
   - Have a static image fallback for mobile/low bandwidth
   - Use srcset for responsive images

## Background Effects Usage

### Subtle Backgrounds
- `/images/backgrounds/golden-hour-leaves.png`
- `/images/backgrounds/morning-light-curtains.png`
- `/images/backgrounds/ocean-waves-soft.png`
- `/images/backgrounds/river-stones-balanced.png`

### Party Effects
- `/animations/particle-effects-neon-1.png`
- `/animations/particle-effects-neon-2.png`
- `/animations/champagne-bubbles-1.png`
- `/animations/champagne-bubbles-2.png`

## Implementation Priority

1. **Immediate Updates**:
   - Update AI Party Planner page with new robot images
   - Replace static images with videos on bach parties page
   - Add motion to corporate events page

2. **Phase 2**:
   - Implement video thumbnails for service cards
   - Add subtle background animations to all pages
   - Create video playlists for each mode

3. **Future Enhancements**:
   - Add customer testimonial videos
   - Create product demo videos
   - Implement 360° venue tours

## Notes

- Keep all robot/AI imagery EXCLUSIVELY on the AI Party Planner page
- Prioritize video content over static images whenever possible
- Ensure all media aligns with the selected mode (Professional/Party/Wild/etc.)
- Test video performance on mobile devices
- Monitor page load times and optimize as needed