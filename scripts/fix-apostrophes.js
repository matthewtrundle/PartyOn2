const fs = require('fs');
const path = require('path');

// Files to fix based on the error output
const filesToFix = [
  'src/app/about/page.tsx',
  'src/app/areas/downtown/page.tsx',
  'src/app/areas/east-austin/page.tsx',
  'src/app/areas/lake-travis/page.tsx',
  'src/app/areas/south-congress/page.tsx',
  'src/app/careers/page.tsx',
  'src/app/delivery-areas/page.tsx',
  'src/app/faqs/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/tabc/page.tsx',
  'src/app/team/page.tsx',
  'src/components/ExperienceSelector.tsx',
  'src/components/FeatureCards.tsx',
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace apostrophes in JSX text content (not in attributes)
    // This regex looks for apostrophes that are likely in text content
    content = content.replace(/([>][\s\S]*?)'/g, (match, p1) => {
      // Don't replace if it's part of a closing tag or attribute
      if (match.includes('className=') || match.includes('href=') || match.includes('src=')) {
        return match;
      }
      return p1 + '&apos;';
    });
    
    // More specific replacements for common patterns
    content = content.replace(/don't/g, 'don&apos;t');
    content = content.replace(/can't/g, 'can&apos;t');
    content = content.replace(/won't/g, 'won&apos;t');
    content = content.replace(/it's/g, 'it&apos;s');
    content = content.replace(/It's/g, 'It&apos;s');
    content = content.replace(/we're/g, 'we&apos;re');
    content = content.replace(/We're/g, 'We&apos;re');
    content = content.replace(/you're/g, 'you&apos;re');
    content = content.replace(/You're/g, 'You&apos;re');
    content = content.replace(/they're/g, 'they&apos;re');
    content = content.replace(/They're/g, 'They&apos;re');
    content = content.replace(/I'm/g, 'I&apos;m');
    content = content.replace(/we've/g, 'we&apos;ve');
    content = content.replace(/We've/g, 'We&apos;ve');
    content = content.replace(/you've/g, 'you&apos;ve');
    content = content.replace(/You've/g, 'You&apos;ve');
    content = content.replace(/they've/g, 'they&apos;ve');
    content = content.replace(/They've/g, 'They&apos;ve');
    content = content.replace(/what's/g, 'what&apos;s');
    content = content.replace(/What's/g, 'What&apos;s');
    content = content.replace(/that's/g, 'that&apos;s');
    content = content.replace(/That's/g, 'That&apos;s');
    content = content.replace(/here's/g, 'here&apos;s');
    content = content.replace(/Here's/g, 'Here&apos;s');
    content = content.replace(/there's/g, 'there&apos;s');
    content = content.replace(/There's/g, 'There&apos;s');
    content = content.replace(/let's/g, 'let&apos;s');
    content = content.replace(/Let's/g, 'Let&apos;s');
    content = content.replace(/Austin's/g, 'Austin&apos;s');
    content = content.replace(/Texas's/g, 'Texas&apos;s');
    content = content.replace(/Travis's/g, 'Travis&apos;s');
    content = content.replace(/'>s /g, '&apos;s ');
    
    // Fix double quotes in specific file
    if (filePath.includes('south-congress')) {
      content = content.replace(/"I Love You So Much"/g, '&quot;I Love You So Much&quot;');
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done fixing apostrophes!');