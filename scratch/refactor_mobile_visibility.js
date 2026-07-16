const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '../apps/mobile/App.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// Replace close buttons color in modals to be theme-aware
content = content.replace(
  /name="close" size=\{20\} color="#FFFFFF"/g,
  'name="close" size={20} color={colors[theme].text}'
);

// Replace settings cog color in login screen to be theme-aware
content = content.replace(
  /name="cog-outline" size=\{16\} color="#9E9E9F"/g,
  'name="cog-outline" size={16} color={colors[theme].textMuted}'
);

// Replace tab bar inactive colors to be theme-aware
content = content.replace(
  /color=\{currentTab === '(\w+)' \? '#E16167' : '#9E9E9F'\}/g,
  'color={currentTab === \'$1\' ? \'#E16167\' : colors[theme].textMuted}'
);

content = content.replace(
  /\{ color: currentTab === '(\w+)' \? '#E16167' : '#9E9E9F' \}/g,
  '{ color: currentTab === \'$1\' ? \'#E16167\' : colors[theme].textMuted }'
);

// Eye outline in notice mark-as-read button
content = content.replace(
  /name="eye-outline" size=\{14\} color="#FFFFFF"/g,
  'name="eye-outline" size={14} color={colors[theme].text}'
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Mobile App.tsx visibility enhancements completed!');
