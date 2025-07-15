const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx and .ts files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      findFiles(filePath, fileList);
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find all TypeScript files in src directory
const files = findFiles('./src');

let totalFixed = 0;
const filesFixed = [];

// Common patterns that need apostrophe escaping in JSX
const patterns = [
  // Common contractions
  /\bdon't\b/g,
  /\bcan't\b/g,
  /\bwon't\b/g,
  /\bdidn't\b/g,
  /\bdoesn't\b/g,
  /\bwouldn't\b/g,
  /\bcouldn't\b/g,
  /\bshouldn't\b/g,
  /\bhasn't\b/g,
  /\bhaven't\b/g,
  /\bisn't\b/g,
  /\baren't\b/g,
  /\bwasn't\b/g,
  /\bweren't\b/g,
  /\bthat's\b/g,
  /\bwhat's\b/g,
  /\bwho's\b/g,
  /\bwhere's\b/g,
  /\bwhen's\b/g,
  /\bwhy's\b/g,
  /\bhow's\b/g,
  /\bit's\b/g,
  /\bhe's\b/g,
  /\bshe's\b/g,
  /\bwe're\b/g,
  /\bthey're\b/g,
  /\byou're\b/g,
  /\bI'm\b/g,
  /\bwe've\b/g,
  /\bthey've\b/g,
  /\byou've\b/g,
  /\bI've\b/g,
  /\bI'll\b/g,
  /\bwe'll\b/g,
  /\bthey'll\b/g,
  /\byou'll\b/g,
  /\bhe'll\b/g,
  /\bshe'll\b/g,
  /\bI'd\b/g,
  /\bwe'd\b/g,
  /\bthey'd\b/g,
  /\byou'd\b/g,
  /\bhe'd\b/g,
  /\bshe'd\b/g,
  /\blet's\b/g,
  /\bthere's\b/g,
  /\bhere's\b/g,
  
  // Possessives
  /\bAustin's\b/g,
  /\bLake Travis's\b/g,
  /\bDevil's Cove\b/g,
  /\bHippie's\b/g,
  /\bParty On's\b/g,
  /\bTexas's\b/g,
  /\bBiff's\b/g,
  /\bgirls'\b/g,
  /\bboys'\b/g,
  /\bnight's\b/g,
  /\bday's\b/g,
  /\bweek's\b/g,
  /\byear's\b/g,
  /\btoday's\b/g,
  /\btomorrow's\b/g,
  /\byesterday's\b/g,
  /\beveryone's\b/g,
  /\bsomeone's\b/g,
  /\bWorld's\b/g,
  /\bcity's\b/g,
  /\bneighborhood's\b/g,
];

const replacements = {
  "don't": "don&apos;t",
  "can't": "can&apos;t",
  "won't": "won&apos;t",
  "didn't": "didn&apos;t",
  "doesn't": "doesn&apos;t",
  "wouldn't": "wouldn&apos;t",
  "couldn't": "couldn&apos;t",
  "shouldn't": "shouldn&apos;t",
  "hasn't": "hasn&apos;t",
  "haven't": "haven&apos;t",
  "isn't": "isn&apos;t",
  "aren't": "aren&apos;t",
  "wasn't": "wasn&apos;t",
  "weren't": "weren&apos;t",
  "that's": "that&apos;s",
  "what's": "what&apos;s",
  "who's": "who&apos;s",
  "where's": "where&apos;s",
  "when's": "when&apos;s",
  "why's": "why&apos;s",
  "how's": "how&apos;s",
  "it's": "it&apos;s",
  "he's": "he&apos;s",
  "she's": "she&apos;s",
  "we're": "we&apos;re",
  "they're": "they&apos;re",
  "you're": "you&apos;re",
  "I'm": "I&apos;m",
  "we've": "we&apos;ve",
  "they've": "they&apos;ve",
  "you've": "you&apos;ve",
  "I've": "I&apos;ve",
  "I'll": "I&apos;ll",
  "we'll": "we&apos;ll",
  "they'll": "they&apos;ll",
  "you'll": "you&apos;ll",
  "he'll": "he&apos;ll",
  "she'll": "she&apos;ll",
  "I'd": "I&apos;d",
  "we'd": "we&apos;d",
  "they'd": "they&apos;d",
  "you'd": "you&apos;d",
  "he'd": "he&apos;d",
  "she'd": "she&apos;d",
  "let's": "let&apos;s",
  "there's": "there&apos;s",
  "here's": "here&apos;s",
  "Austin's": "Austin&apos;s",
  "Lake Travis's": "Lake Travis&apos;s",
  "Devil's Cove": "Devil&apos;s Cove",
  "Hippie's": "Hippie&apos;s",
  "Party On's": "Party On&apos;s",
  "Texas's": "Texas&apos;s",
  "Biff's": "Biff&apos;s",
  "girls'": "girls&apos;",
  "boys'": "boys&apos;",
  "night's": "night&apos;s",
  "day's": "day&apos;s",
  "week's": "week&apos;s",
  "year's": "year&apos;s",
  "today's": "today&apos;s",
  "tomorrow's": "tomorrow&apos;s",
  "yesterday's": "yesterday&apos;s",
  "everyone's": "everyone&apos;s",
  "someone's": "someone&apos;s",
  "World's": "World&apos;s",
  "city's": "city&apos;s",
  "neighborhood's": "neighborhood&apos;s"
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  let fileFixed = 0;
  
  // Replace each pattern
  for (const [find, replace] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${find}\\b`, 'g');
    const beforeCount = (content.match(regex) || []).length;
    content = content.replace(regex, replace);
    const afterCount = beforeCount - (content.match(regex) || []).length;
    fileFixed += afterCount;
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    if (fileFixed > 0) {
      totalFixed += fileFixed;
      filesFixed.push({ file, count: fileFixed });
      console.log(`Fixed ${fileFixed} apostrophes in ${file}`);
    }
  }
});

console.log(`\nTotal apostrophes fixed: ${totalFixed}`);
console.log(`Files modified: ${filesFixed.length}`);