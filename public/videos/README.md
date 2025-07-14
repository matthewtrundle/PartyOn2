# Video Assets Guide

## Folder Structure
- `/hero/` - Hero section background videos (full-screen loops)
- `/backgrounds/` - Section background videos (subtle animations)
- `/animations/` - Short animation clips for transitions

## Video Requirements
- **Format**: MP4 (H.264 codec for best compatibility)
- **Resolution**: 1920x1080 minimum, 4K preferred
- **File Size**: Keep under 10MB for hero videos
- **Duration**: 10-30 seconds (should loop seamlessly)
- **Audio**: Remove audio track (videos autoplay muted)

## Available Videos

### Hero Videos
1. **austin-skyline-timelapse.mp4** - Austin city skyline time-lapse transition
2. **wedding-sunset.mp4** - Romantic Lake Travis wedding setup at sunset
3. **wedding-venue-travis.mp4** - Breathtaking Lake Travis wedding venue
4. **yacht-sunset.mp4** - Serene Lake Travis sunset with luxury yacht
5. **luxury-yacht.mp4** - Ultra-luxury mega yacht on Lake Travis
6. **luxury-wedding.mp4** - Ultra-luxury wedding at Austin estate
7. **lake-travis-aerial.mp4** - Aerial drone view of Lake Travis

### Background Videos
1. **austin-party-setup.mp4** - Premium party setup in modern Austin home
2. **bachelor-party.mp4** - Epic bachelor party with fire effects
3. **bachelorette-party.mp4** - Luxurious bachelorette party setup
4. **upscale-bachelorette.mp4** - Upscale Austin bachelorette party with rose gold
5. **yacht-wake.mp4** - Serene yacht wake on Lake Travis
6. **boat-cooler.mp4** - Captain's cooler packed with premium beverages
7. **cocktails-wedding.mp4** - Close-up signature cocktails with wedding rings

## Current Usage

### Home Page
- Professional Mode: `/videos/hero/austin-skyline-timelapse.mp4`
- Party Mode: `/videos/backgrounds/austin-party-setup.mp4`

### Wedding Page
- Elegant Mode: `/videos/hero/wedding-venue-travis.mp4`
- Luxury Mode: `/videos/hero/luxury-wedding.mp4`
- Boho Mode: `/videos/backgrounds/cocktails-wedding.mp4`

### Boat Parties Page
- Chill Mode: `/videos/hero/lake-travis-aerial.mp4`
- Wild Mode: `/videos/backgrounds/boat-cooler.mp4`
- Luxury Mode: `/videos/hero/luxury-yacht.mp4`

### Bach Parties Page
- Normal Mode: `/videos/backgrounds/austin-party-setup.mp4`
- Bachelor Mode: `/videos/backgrounds/bachelor-party.mp4`
- Bachelorette Mode: `/videos/backgrounds/upscale-bachelorette.mp4`

### Fast Delivery Page
- Uses: `/videos/hero/luxury-yacht.mp4`

## How to Implement

Replace the Hero component with VideoHero:

```jsx
<VideoHero
  title="Your Title"
  subtitle="Your Subtitle"
  description="Your Description"
  videoSrc="/videos/hero/your-video.mp4"
  fallbackImage="/images/hero/fallback-image.jpg"
  ctaText="Call to Action"
  ctaLink="/link"
/>
```

## Video Optimization Tips
1. Use HandBrake or FFmpeg to compress videos
2. Create multiple resolutions for different devices
3. Use lazy loading for videos below the fold
4. Always provide a fallback image

## Example FFmpeg Command
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 22 -c:a copy -movflags +faststart output.mp4
```