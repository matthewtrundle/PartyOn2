# Party On Delivery - Image Assets Organization

## Overview

All public image assets have been reorganized into a logical folder structure that makes it easy to find and reference assets based on their purpose and usage.

## Folder Structure

```
images/
├── hero/               # Main page hero backgrounds
├── services/           # Service-specific imagery
│   ├── weddings/      # Wedding service images
│   ├── boat-parties/  # Boat party service images
│   ├── corporate/     # Corporate event images
│   ├── bach-parties/  # Bachelor/bachelorette party images
│   └── fast-delivery/ # Fast delivery service images
├── products/          # Product showcase images
├── backgrounds/       # Background images for sections
├── ui/                # UI elements
│   ├── icons/        # Icon files (SVGs)
│   └── logos/        # Logo variations
├── gallery/           # Additional showcase images
└── unused/            # Currently unused images
```

## Quick Reference Guide

### Hero Images
- **austin-skyline-hero.png** - Main homepage hero
- **lake-travis-sunset.jpg** - Lake Travis section background
- **neon-nights-hero.jpg** - Party mode hero
- **lake-life-hero.jpg** - Lake life theme
- **festival-hero.jpg** - Festival theme (unused)
- **tech-minimal-hero.jpg** - Tech minimal theme (unused)
- **retro-beach-hero.jpg** - Retro beach theme (unused)

### Service Images
- **weddings/** - All wedding-related imagery
- **boat-parties/** - Lake Travis boat party images
- **corporate/** - Corporate event setups
- **bach-parties/** - Bachelor/bachelorette party themes
- **fast-delivery/** - Delivery service visuals

### UI Assets
- **icons/** - SVG icons (file, globe, next, vercel, window)
- **logos/** - Company logo variations (to be added)

## Usage Guidelines

1. **Always use absolute paths** starting with `/images/`
2. **Optimize images** before adding (use WebP where possible)
3. **Maintain consistent naming** - use lowercase with hyphens
4. **Group related images** in appropriate service folders
5. **Document new additions** in this README

## Image Optimization Tips

- Convert photos to WebP format for better compression
- Use PNG for graphics with transparency
- Keep hero images under 500KB
- Use lazy loading for non-critical images
- Consider responsive image sets for different screen sizes

## Missing Images

The following images are referenced in code but not found in public folder:
- Wedding service images (9 images)
- Boat party images (7 images)  
- Fast delivery images (3 images)
- Products page hero (1 image)

See `UPDATE_REFERENCES.md` for complete list.

## Maintenance

- Regularly audit for unused images
- Update references when moving/renaming files
- Keep this documentation current
- Consider CDN deployment for production