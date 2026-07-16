const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../apps/admin/src/app');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
      callback(filepath);
    }
  }
}

walk(targetDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Replace hardcoded dark card background
  content = content.replace(/bg-\[\#0f0f13\]/gi, 'bg-white/70 dark:bg-[#0f0f13]');

  // 2. Replace hardcoded table row divides
  content = content.replace(/\bdivide-white\/5\b/g, 'divide-black/10 dark:divide-white/5');

  // 3. Replace text-gray-300 with slate-600 in light mode
  content = content.replace(/(?<!dark:)\btext-gray-300\b/g, 'text-slate-600 dark:text-gray-300');

  // 4. Replace text-gray-400 with slate-500 in light mode
  content = content.replace(/(?<!dark:)\btext-gray-400\b/g, 'text-slate-500 dark:text-gray-400');

  // 5. Replace bg-white/[0.01] with bg-black/[0.01] dark:bg-white/[0.01]
  content = content.replace(/\bbg-white\/\[0\.01\]\b/g, 'bg-black/[0.01] dark:bg-white/[0.01]');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated colors in: ${path.relative(targetDir, filepath)}`);
  }
});
