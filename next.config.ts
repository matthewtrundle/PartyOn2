import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Enable WebP and AVIF formats
    formats: ['image/avif', 'image/webp'],
    
    // Set device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Minimize images during build
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    
    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentDispositionType: 'inline',
  },
  
  // Enable build-time compression
  compress: true,
  
  // Enable SWC minification
  swcMinify: true,
};

export default nextConfig;
