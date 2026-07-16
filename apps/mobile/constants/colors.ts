export const colors = {
  light: {
    background: '#F8FAFC', // Slate 50
    surface: 'rgba(0, 0, 0, 0.05)', // Translucent black/gray glass
    text: '#0F172A', // Slate 900
    textMuted: '#64748B', // Slate 500
    border: 'rgba(0, 0, 0, 0.1)', // Black border
    primary: '#E16167', // ODIZO red
    inputText: '#0F172A',
    inputBg: 'rgba(0, 0, 0, 0.03)',
    inputPlaceholder: '#94A3B8', // Slate 400
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    cardBackground: 'rgba(0, 0, 0, 0.02)',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    overlay: 'rgba(0, 0, 0, 0.4)',
    accentRed: '#E16167',
  },
  dark: {
    background: '#000000',
    surface: 'rgba(255, 255, 255, 0.03)', // Translucent white glass
    text: '#FFFFFF',
    textMuted: '#9E9E9F',
    border: 'rgba(255, 255, 255, 0.08)',
    primary: '#E16167', // ODIZO red
    inputText: '#FFFFFF',
    inputBg: 'rgba(255, 255, 255, 0.05)',
    inputPlaceholder: '#71717A',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    cardBackground: 'rgba(255, 255, 255, 0.02)',
    shadowColor: '#000000',
    shadowOpacity: 0.75,
    overlay: 'rgba(0, 0, 0, 0.75)',
    accentRed: '#E16167',
  }
};
export type ColorPalette = typeof colors.light;
