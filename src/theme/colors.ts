export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  danger: string;
  success: string;
  border: string;
  overlay: string;
  iconBg: string;
}

export const lightTheme: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  primary: '#2563EB',
  danger: '#EF4444',
  success: '#10B981',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.4)',
  iconBg: '#EFF6FF',
};

export const darkTheme: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  danger: '#F87171',
  success: '#34D399',
  border: '#334155',
  overlay: 'rgba(0, 0, 0, 0.6)',
  iconBg: 'rgba(59, 130, 246, 0.15)',
};
