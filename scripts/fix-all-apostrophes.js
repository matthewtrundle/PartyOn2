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

// Function to fix apostrophes in JSX content
function fixApostrophesInJSX(content) {
  // Track if we're inside JSX text content
  let result = '';
  let i = 0;
  
  while (i < content.length) {
    // Check if we're starting a JSX text node
    if (content[i] === '>' && i + 1 < content.length && content[i + 1] !== '<') {
      result += content[i];
      i++;
      
      // Process text content until we hit a tag
      let textContent = '';
      while (i < content.length && content[i] !== '<') {
        textContent += content[i];
        i++;
      }
      
      // Replace apostrophes in text content
      textContent = textContent.replace(/'/g, '&apos;');
      result += textContent;
    }
    // Check if we're in a string literal (single or double quotes)
    else if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += content[i];
      i++;
      
      // Skip string content
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\' && i + 1 < content.length) {
          result += content[i] + content[i + 1];
          i += 2;
        } else {
          result += content[i];
          i++;
        }
      }
      if (i < content.length) {
        result += content[i];
        i++;
      }
    }
    else {
      result += content[i];
      i++;
    }
  }
  
  return result;
}

// Find all TypeScript files in src directory
const files = findFiles('./src');

let totalFixed = 0;
const filesFixed = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Apply the fix
  content = fixApostrophesInJSX(content);
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    
    // Count how many replacements were made
    const originalApostrophes = (originalContent.match(/(?<=>)[^<]*'/g) || []).length;
    const newApostrophes = (content.match(/(?<=>)[^<]*&apos;/g) || []).length;
    const count = newApostrophes;
    
    if (count > 0) {
      totalFixed += count;
      filesFixed.push({ file, count });
      console.log(`Fixed apostrophes in ${file}`);
    }
  }
});

console.log(`\nTotal apostrophes fixed: ${totalFixed}`);
console.log(`Files modified: ${filesFixed.length}`);

if (filesFixed.length > 0) {
  console.log('\nFiles that were fixed:');
  filesFixed.forEach(({ file, count }) => {
    console.log(`  ${file} (${count} fixes)`);
  });
}