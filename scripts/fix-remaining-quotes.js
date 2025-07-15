const fs = require('fs');

// List of files and their specific fixes
const fixes = [
  {
    file: './src/app/about/page.tsx',
    replacements: [
      { find: "– we're bringing", replace: "– we&apos;re bringing" }
    ]
  },
  {
    file: './src/app/areas/east-austin/page.tsx',
    replacements: [
      { find: "The artist's mecca", replace: "The artist&apos;s mecca" },
      { find: "We're proud", replace: "We&apos;re proud" }
    ]
  },
  {
    file: './src/app/areas/south-congress/page.tsx',
    replacements: [
      { find: "We're proud to serve the neighborhood that defines Austin's creative spirit", replace: "We&apos;re proud to serve the neighborhood that defines Austin&apos;s creative spirit" }
    ]
  },
  {
    file: './src/app/careers/page.tsx',
    replacements: [
      { find: "It's not just", replace: "It&apos;s not just" },
      { find: "We're not your typical", replace: "We&apos;re not your typical" },
      { find: "company – we're Austin", replace: "company – we&apos;re Austin" },
      { find: "help make Austin's celebrations", replace: "help make Austin&apos;s celebrations" },
      { find: "We're always", replace: "We&apos;re always" }
    ]
  },
  {
    file: './src/app/delivery-areas/page.tsx',
    replacements: [
      { find: "We're Lake Travis's", replace: "We&apos;re Lake Travis&apos;s" }
    ]
  },
  {
    file: './src/app/faqs/page.tsx',
    replacements: [
      { find: "Can't find what you're looking", replace: "Can&apos;t find what you&apos;re looking" }
    ]
  },
  {
    file: './src/app/fast-delivery/page.tsx',
    replacements: [
      { find: "We're the fastest", replace: "We&apos;re the fastest" },
      { find: "Here's how", replace: "Here&apos;s how" }
    ]
  },
  {
    file: './src/app/page.tsx',
    replacements: [
      { find: "Don't just take our word for it", replace: "Don&apos;t just take our word for it" }
    ]
  },
  {
    file: './src/app/privacy/page.tsx',
    replacements: [
      { find: "explain the information we collect when you use Party On Delivery's services", replace: "explain the information we collect when you use Party On Delivery&apos;s services" }
    ]
  },
  {
    file: './src/app/products/page.tsx',
    replacements: [
      { find: "We're integrating", replace: "We&apos;re integrating" }
    ]
  },
  {
    file: './src/app/tabc/page.tsx',
    replacements: [
      { find: "Party On Delivery's comprehensive training program", replace: "Party On Delivery&apos;s comprehensive training program" },
      { find: "event's atmosphere", replace: "event&apos;s atmosphere" }
    ]
  },
  {
    file: './src/app/team/page.tsx',
    replacements: [
      { find: "We're not just a team – we're", replace: "We&apos;re not just a team – we&apos;re" },
      { find: "each other's wins", replace: "each other&apos;s wins" },
      { find: "We're always looking", replace: "We&apos;re always looking" }
    ]
  },
  {
    file: './src/app/weddings/page.tsx',
    replacements: [
      { find: "Where Austin's Love Stories", replace: "Where Austin&apos;s Love Stories" }
    ]
  },
  {
    file: './src/components/ExperienceSelector.tsx',
    replacements: [
      { find: "What's your vibe?", replace: "What&apos;s your vibe?" }
    ]
  },
  {
    file: './src/hooks/useBiffAI.ts',
    replacements: [
      { find: "What's your best", replace: "What&apos;s your best" }
    ]
  }
];

// Apply fixes
fixes.forEach(({ file, replacements }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    replacements.forEach(({ find, replace }) => {
      if (content.includes(find)) {
        content = content.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
        changed = true;
        console.log(`Fixed: "${find}" in ${file}`);
      }
    });
    
    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

// Fix the unused variable in useBiffAI.ts
try {
  let content = fs.readFileSync('./src/hooks/useBiffAI.ts', 'utf8');
  content = content.replace(
    '} catch (err) {',
    '} catch {'
  );
  fs.writeFileSync('./src/hooks/useBiffAI.ts', content, 'utf8');
  console.log('Fixed unused variable in useBiffAI.ts');
} catch (err) {
  console.error('Error fixing useBiffAI.ts:', err.message);
}

// Fix the VideoHero ref cleanup
try {
  let content = fs.readFileSync('./src/components/VideoHero.tsx', 'utf8');
  // Find the useEffect cleanup and fix it
  content = content.replace(
    `return () => {
      observer.disconnect()
      const video = videoRef.current
      if (video) {
        video.pause()
      }
    }`,
    `return () => {
      observer.disconnect()
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }`
  );
  fs.writeFileSync('./src/components/VideoHero.tsx', content, 'utf8');
  console.log('Fixed VideoHero ref cleanup');
} catch (err) {
  console.error('Error fixing VideoHero.tsx:', err.message);
}

console.log('\nDone!');