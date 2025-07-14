# Hero Video Plan - Main Page Party Mode Videos

## Current Situation
Right now on the **main page** (`/src/app/page.tsx`), we have:
- **Professional Mode**: `/videos/hero/austin-skyline-timelapse.mp4` ✅ (good)
- **Party Mode**: `/videos/backgrounds/austin-party-setup.mp4` (not ideal - this is a background video, not hero quality)

## What You Want - Main Page Hero Videos
You want **dedicated .mp4 hero videos** for each party mode on the main landing page that are:
1. **High quality hero-style videos** (not background clips)
2. **Specifically created** for each mode's vibe
3. **Seamlessly looping** 
4. **Professional cinematography** that matches the energy

## Needed Videos for Main Page

### 1. **Professional Mode Hero Video** ✅ 
- **Current**: Austin skyline timelapse (GOOD - can keep)
- **Alternative ideas**: Elegant cocktail pour, upscale Austin venue, sophisticated bar setup

### 2. **Party Mode Hero Video** ❌ NEEDS NEW VIDEO
- **Current**: Austin party setup (not hero quality)
- **What we need**: EPIC party mode hero video
- **Vibe**: High-energy, dynamic, party atmosphere
- **Ideas**: 
  - Austin nightlife with neon lights and crowd energy
  - Epic party scene with drinks flying, music pumping
  - Dynamic shots of people celebrating with Austin skyline
  - 6th Street party chaos with lights and movement

## Video Specifications Needed
- **Format**: MP4 (H.264)
- **Resolution**: 1920x1080 minimum (4K preferred)
- **Duration**: 10-30 seconds
- **Looping**: Seamless loop
- **Audio**: Remove audio track (autoplay muted)
- **File size**: Under 10MB
- **Style**: Cinematic, high-energy for party mode

## Current Code Location
In `/src/app/page.tsx` around line 155:
```typescript
videoSrc={mode === 'party' ? "/videos/backgrounds/austin-party-setup.mp4" : "/videos/hero/austin-skyline-timelapse.mp4"}
```

**This needs to become**:
```typescript
videoSrc={mode === 'party' ? "/videos/hero/EPIC-PARTY-HERO.mp4" : "/videos/hero/austin-skyline-timelapse.mp4"}
```

## What I Need From You
1. **Party Mode Hero Video**: A cinematic, high-energy .mp4 that captures the WILD party energy
   - Could be Sora-generated party scene
   - Could be Midjourney image animated into video
   - Should feel like Austin nightlife/party chaos

2. **Optional**: Even better Professional Mode video if you want to upgrade from skyline

## File Naming Convention
- Save as: `/public/videos/hero/austin-party-epic.mp4`
- Or: `/public/videos/hero/party-mode-hero.mp4`

## I Understand You Mean
- **Main landing page hero section** (the big video at the top)
- **Different high-quality videos** for Professional vs Party mode
- **Hero-quality cinematography**, not just background clips
- **Austin-themed** content that matches each mode's energy

**Am I understanding this correctly?** The main page hero should have epic, cinematic videos that switch based on the Professional/Party mode selector, right?