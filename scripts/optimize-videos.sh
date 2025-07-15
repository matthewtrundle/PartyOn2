#!/bin/bash

# Video Optimization Script
# Requires ffmpeg: brew install ffmpeg

echo "🎥 Starting video optimization..."

# Create optimized directory
mkdir -p public/videos/optimized

# Function to optimize video
optimize_video() {
    input="$1"
    output="${input%.*}-optimized.mp4"
    webm_output="${input%.*}-optimized.webm"
    
    echo "Processing: $input"
    
    # MP4 optimization (H.264)
    ffmpeg -i "$input" \
        -c:v libx264 \
        -preset slow \
        -crf 23 \
        -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -y \
        "$output" 2>/dev/null
    
    # WebM optimization (VP9) for better compression
    ffmpeg -i "$input" \
        -c:v libvpx-vp9 \
        -crf 31 \
        -b:v 0 \
        -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
        -c:a libopus \
        -b:a 128k \
        -y \
        "$webm_output" 2>/dev/null
    
    # Show file sizes
    original_size=$(du -h "$input" | cut -f1)
    mp4_size=$(du -h "$output" | cut -f1)
    webm_size=$(du -h "$webm_output" | cut -f1)
    
    echo "  Original: $original_size"
    echo "  MP4: $mp4_size"
    echo "  WebM: $webm_size"
    echo ""
}

# Find and optimize all videos
find public/videos -name "*.mp4" -not -path "*/optimized/*" | while read -r video; do
    optimize_video "$video"
done

echo "✅ Video optimization complete!"
echo ""
echo "To use optimized videos, update your components:"
echo "1. Add both MP4 and WebM sources"
echo "2. Use the -optimized versions"
echo ""
echo "Example:"
echo '<video>'
echo '  <source src="/videos/hero-optimized.webm" type="video/webm" />'
echo '  <source src="/videos/hero-optimized.mp4" type="video/mp4" />'
echo '</video>'