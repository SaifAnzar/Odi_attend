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
  if (content.toLowerCase().includes('bg-[#0f0f13]')) {
    console.log(`Found hardcoded background in: ${path.relative(targetDir, filepath)}`);
  }
});
