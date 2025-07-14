# Midjourney Video Prompts for Party On Delivery

## Professional/Austin Skyline Videos

### Austin Skyline Professional
```
Austin Texas skyline at golden hour, smooth cinematic pan across downtown buildings, Mount Bonnell perspective, warm golden light, professional cinematography, 4K quality, gentle camera movement, architectural beauty, serene and sophisticated mood --ar 16:9 --style cinematic
```

### Austin 6th Street Party Mode
```
Austin 6th Street at night, neon lights reflecting on wet pavement, vibrant nightlife energy, people silhouettes walking, colorful bar signs, dynamic urban atmosphere, cinematic lighting, party energy, electric ambiance --ar 16:9 --style cinematic
```

## Wedding Videos

### Elegant Wedding
```
Romantic outdoor wedding setup at sunset, Lake Travis hills in background, elegant white decorations, soft golden hour lighting, gentle breeze through fabric, champagne glasses catching light, sophisticated and timeless, dreamy atmosphere --ar 16:9 --style cinematic
```

### Luxury Wedding
```
Ultra-luxury wedding at Austin estate, champagne fountain centerpiece, crystal chandeliers, opulent floral arrangements, gold accents, marble columns, sophisticated lighting, high-end elegance, grand scale celebration --ar 16:9 --style cinematic
```

### Bohemian Wedding
```
Boho outdoor wedding in Texas Hill Country, wildflowers and natural decorations, rustic wooden elements, flowing fabric in breeze, natural lighting, earthy tones, free-spirited aesthetic, organic beauty, macrame details --ar 16:9 --style cinematic
```

## Boat Party Videos

### Chill Lake Travis
```
Serene Lake Travis at sunset, luxury yacht silhouette, calm waters reflecting golden sky, gentle wake patterns, peaceful atmosphere, sophisticated nautical elegance, warm lighting, tranquil mood --ar 16:9 --style cinematic
```

### Wild Boat Party
```
Epic Lake Travis boat party, multiple yachts rafted together, energetic water activities, splashing and movement, dynamic party atmosphere, bright daylight, action-packed scenes, high-energy celebrations --ar 16:9 --style cinematic
```

### Luxury Yacht
```
Ultra-luxury mega yacht on Lake Travis, champagne service on deck, pristine white yacht details, crystal clear water, premium amenities, sophisticated nautical luxury, golden hour lighting, elegant lifestyle --ar 16:9 --style cinematic
```

## Bachelor/Bachelorette Videos

### Bachelor Party Chaos
```
Epic bachelor party scene, red and orange fire effects, energetic nightlife atmosphere, dramatic lighting, high-energy celebration, dynamic party elements, bold colors, masculine energy, Austin nightlife backdrop --ar 16:9 --style cinematic
```

### Bachelorette Party Glam
```
Luxurious bachelorette party setup, pink champagne tower, elegant decorations, glamorous atmosphere, sparkling elements, sophisticated femininity, soft pink and gold color palette, celebration elegance --ar 16:9 --style cinematic
```

## Fast Delivery Videos

### Speed and Motion
```
Motion-blurred delivery scene at upscale Austin home, professional delivery vehicle, sense of speed and efficiency, urban Austin backdrop, dynamic movement, professional service aesthetic, modern logistics --ar 16:9 --style cinematic
```

### Austin Delivery Network
```
Austin cityscape with delivery routes visualization, efficient logistics network, professional delivery fleet, urban connectivity, modern technology meets traditional service, clean and efficient aesthetic --ar 16:9 --style cinematic
```

## Additional Effects for Animation

### Champagne Bubbles
```
Close-up champagne bubbles rising, crystal clear macro photography, elegant bubble formations, golden lighting, luxury beverage aesthetic, smooth upward movement, sophisticated celebration --ar 16:9 --style cinematic
```

### Neon Party Effects
```
Energetic particle effects, pulsing neon lights, dynamic color transitions, party atmosphere visualization, electric energy, vibrant color palette, modern party aesthetic, high-energy celebration --ar 16:9 --style cinematic
```

## Technical Notes for Video Creation

- **Duration**: 10-30 seconds for seamless loops
- **Resolution**: 4K minimum for web optimization
- **Format**: MP4 (H.264 codec)
- **Audio**: Remove audio track (autoplay muted)
- **Compression**: Keep under 10MB for hero videos
- **Loop**: Ensure seamless looping for continuous play

## Usage Instructions

1. Generate images using these prompts in Midjourney
2. Use AI video generation tools (Runway, Pika, etc.) to animate the static images
3. Optimize videos for web using FFmpeg:
   ```bash
   ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 22 -c:a copy -movflags +faststart output.mp4
   ```
4. Test loop seamlessness before deployment
5. Create multiple variations for A/B testing