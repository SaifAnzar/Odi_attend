const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '../apps/mobile/App.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add imports at the top (after import AsyncStorage)
const importMarker = "import AsyncStorage from '@react-native-async-storage/async-storage';";
const importsToAdd = `
import { ThemeProvider as AppThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { colors } from './constants/colors';
`;

if (!content.includes('useAppTheme')) {
  content = content.replace(importMarker, importMarker + importsToAdd);
}

// 2. Wrap default export App
const appExportMarker = `export default function App() {
  return (
    <CustomAlertProvider>
      <AppContent />
    </CustomAlertProvider>
  );
}`;

const wrappedAppExport = `export default function App() {
  return (
    <AppThemeProvider>
      <CustomAlertProvider>
        <AppContent />
      </CustomAlertProvider>
    </AppThemeProvider>
  );
}`;

content = content.replace(appExportMarker, wrappedAppExport);

// 3. Inject useAppTheme into AppContent
const appContentMarker = "function AppContent() {";
const themeHookInject = `function AppContent() {
  const { theme, toggleTheme } = useAppTheme();
  const styles = getStyles(theme);`;

content = content.replace(appContentMarker, themeHookInject);

// 4. Update StatusBars to be dynamic
content = content.replace(/<StatusBar style="light" \/>/g, '<StatusBar style={theme === \'light\' ? \'dark\' : \'light\'} />');

// 5. Update placeholder colors and icon colors in Login panel inputs to use theme Colors
content = content.replace(
  /placeholderTextColor="#9E9E9F"/g,
  `placeholderTextColor={colors[theme].textMuted}`
);

// Let's also check for logo colors/styling or icon colors
// Look for Ionicons colors in Login panel:
content = content.replace(
  /color="#9E9E9F" style={styles\.inputIcon}/g,
  `color={colors[theme].textMuted} style={styles.inputIcon}`
);

// 6. Update portal header to include theme switch
const portalHeaderMarker = `<View style={styles.portalHeader}>
        <View style={{ flexDirection: 'column', gap: 2, justifyContent: 'center' }}>`;

const portalHeaderReplacement = `<View style={styles.portalHeader}>
        <View style={{ flexDirection: 'column', gap: 2, justifyContent: 'center' }}>`;

// Let's find logoutBtn in header and add theme toggle right next to it:
const logoutBtnMarker = `<TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#E16167" />
        </TouchableOpacity>`;

const themeToggleInHeader = `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn} activeOpacity={0.7}>
            <Ionicons name={theme === 'light' ? 'moon' : 'sunny'} size={20} color={colors[theme].text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#E16167" />
          </TouchableOpacity>
        </View>`;

content = content.replace(logoutBtnMarker, themeToggleInHeader);

// 7. Inject theme toggle in login connections settings panel
const settingsInfoMarker = `<Text style={styles.settingsInfo}>
                  Enter the computer local IP hosting the Next.js API portal.
                </Text>`;

const settingsToggleInSettings = `<Text style={styles.settingsInfo}>
                  Enter the computer local IP hosting the Next.js API portal.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors[theme].border }}>
                  <Text style={[styles.settingsTitle, { marginBottom: 0 }]}>Dark Mode Theme</Text>
                  <TouchableOpacity 
                    onPress={toggleTheme}
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: theme === 'dark' ? '#E16167' : '#D1D5DB',
                      justifyContent: 'center',
                      paddingHorizontal: 3
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      alignSelf: theme === 'dark' ? 'flex-end' : 'flex-start'
                    }} />
                  </TouchableOpacity>
                </View>`;

content = content.replace(settingsInfoMarker, settingsToggleInSettings);

// 8. Transform static styles block to dynamic getStyles
const stylesStart = 'const styles = StyleSheet.create({';
const getStylesStart = `const getStyles = (theme: 'light' | 'dark') => {
  const themeColors = colors[theme];
  return StyleSheet.create({`;

content = content.replace(stylesStart, getStylesStart);

// At the very end of the file, close the getStyles function
const fileLines = content.split('\n');
if (fileLines[fileLines.length - 1].trim() === '});') {
  fileLines[fileLines.length - 1] = '  });\n};';
} else if (fileLines[fileLines.length - 2].trim() === '});') {
  fileLines[fileLines.length - 2] = '  });\n};';
}
content = fileLines.join('\n');

// 9. Replace colors in the styles definition
// Make a copy of stylesheet block and translate colors
let stylesBlockIndex = content.indexOf("const getStyles =");
let stylesBlock = content.substring(stylesBlockIndex);

// Replace background colors
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'#0B0B0C'/g, "backgroundColor: themeColors.background");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'#0C0C0D'/g, "backgroundColor: theme === 'light' ? '#FFFFFF' : '#0C0C0D'");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'#131315'/g, "backgroundColor: theme === 'light' ? '#FFFFFF' : '#131315'");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'#19191B'/g, "backgroundColor: theme === 'light' ? '#F1F5F9' : '#19191B'");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.03\)'/g, "backgroundColor: themeColors.surface");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "backgroundColor: themeColors.inputBg");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.08\)'/g, "backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.02\)'/g, "backgroundColor: themeColors.cardBackground");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(0,\s*0,\s*0,\s*0\.75\)'/g, "backgroundColor: themeColors.overlay");
stylesBlock = stylesBlock.replace(/backgroundColor:\s*'rgba\(225,\s*97,\s*103,\s*0\.1\)'/g, "backgroundColor: 'rgba(225, 97, 103, 0.1)'"); // ODIZO red translucent

// Replace border colors
stylesBlock = stylesBlock.replace(/borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "borderColor: themeColors.border");
stylesBlock = stylesBlock.replace(/borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.08\)'/g, "borderColor: themeColors.border");
stylesBlock = stylesBlock.replace(/borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.1\)'/g, "borderColor: themeColors.border");
stylesBlock = stylesBlock.replace(/borderColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.15\)'/g, "borderColor: themeColors.border");
stylesBlock = stylesBlock.replace(/borderTopColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "borderTopColor: themeColors.border");
stylesBlock = stylesBlock.replace(/borderBottomColor:\s*'rgba\(255,\s*255,\s*255,\s*0\.05\)'/g, "borderBottomColor: themeColors.border");

// Replace text colors
stylesBlock = stylesBlock.replace(/color:\s*'#FFFFFF'/g, "color: themeColors.text");
stylesBlock = stylesBlock.replace(/color:\s*'#E0E0E1'/g, "color: themeColors.text");
stylesBlock = stylesBlock.replace(/color:\s*'#9E9E9F'/g, "color: themeColors.textMuted");
stylesBlock = stylesBlock.replace(/color:\s*'#E16167'/g, "color: themeColors.primary");

// Replace shadow configs
stylesBlock = stylesBlock.replace(/shadowColor:\s*'#000000'/g, "shadowColor: themeColors.shadowColor");
stylesBlock = stylesBlock.replace(/shadowOpacity:\s*0\.15/g, "shadowOpacity: themeColors.shadowOpacity");
stylesBlock = stylesBlock.replace(/shadowOpacity:\s*0\.75/g, "shadowOpacity: themeColors.shadowOpacity");

// Let's add themeToggleBtn in stylesheet to make it fit nicely
const themeToggleBtnStyle = `  themeToggleBtn: {
    padding: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },`;
stylesBlock = stylesBlock.replace("  logoutBtn: {", themeToggleBtnStyle + "\n  logoutBtn: {");

// Re-integrate styles block back to content
content = content.substring(0, stylesBlockIndex) + stylesBlock;

fs.writeFileSync(filepath, content, 'utf8');
console.log('Mobile App.tsx successfully refactored for Light/Dark themes!');
