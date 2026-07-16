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

  // Refactor text-white to support slate-900 in light mode
  content = content.replace(/(?<!dark:)\btext-white\b/g, 'text-slate-900 dark:text-white');

  // Refactor transparent background/borders to adapt dynamically
  content = content.replace(/(?<!dark:)\bbg-white\/5\b/g, 'bg-black/5 dark:bg-white/5');
  content = content.replace(/(?<!dark:)\bbg-white\/3\b/g, 'bg-black/5 dark:bg-white/3');
  content = content.replace(/(?<!dark:)\bbg-white\/10\b/g, 'bg-black/5 dark:bg-white/10');
  content = content.replace(/(?<!dark:)\bborder-white\/10\b/g, 'border-black/10 dark:border-white/10');
  content = content.replace(/(?<!dark:)\bborder-white\/5\b/g, 'border-black/5 dark:border-white/5');

  // Refactor title gradients for contrast
  content = content.replace(/from-white via-odizo-grey to-white/g, 'from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white');
  content = content.replace(/from-white to-white/g, 'from-slate-900 to-slate-900 dark:from-white dark:to-white');

  // Specific adjustments for form placeholders and disabled states
  // We want to ensure inputs maintain accessibility. Let's make sure text-white in input tags maps properly
  // (the replacement above already handles it)

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Refactored: ${path.relative(targetDir, filepath)}`);
  }
});
