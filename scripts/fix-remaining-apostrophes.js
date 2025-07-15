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

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Replace &apos; with '
  content = content.replace(/&apos;/g, "'");
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    const count = (originalContent.match(/&apos;/g) || []).length;
    totalFixed += count;
    filesFixed.push({ file, count });
    console.log(`Fixed ${count} apostrophes in ${file}`);
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