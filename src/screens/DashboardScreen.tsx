import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface AlertItem {
  id: string;
  type: 'TECH_VISIT' | 'OIL_CHANGE' | 'INSURANCE' | 'VIGNETTE';
  level: 'WARNING' | 'DANGER';
  message: string;
};

type DashboardProps = {
  navigation: any;
};

export const DashboardScreen = ({ navigation }: DashboardProps) => {
  const { t, lang, setLang, isRTL } = useLanguage();
  const { colors, isDark, toggleTheme } = useTheme();

  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [kpi, setKpi] = useState({ income: 0, expense: 0, net: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    const { income, expense } = await DatabaseService.getFinancialSummaryByPeriod(period);
    setKpi({ income, expense, net: income - expense });

    const newAlerts: AlertItem[] = [];

    try {
      const vehicleAlerts = await DatabaseService.getVehicleAlerts();
      vehicleAlerts.forEach((alert: any) => {
        if (alert.visit_days !== null && alert.visit_days <= 30 && alert.visit_days >= 0) {
          newAlerts.push({
            id: `tech_${alert.registration}`,
            type: 'TECH_VISIT',
            level: alert.visit_days <= 7 ? 'DANGER' : 'WARNING',
            message: `⚠️ Visite technique proche: ${alert.name} [${alert.registration}] - ${alert.next_technical_visit}`,
          });
        }
        if (alert.insurance_days !== null && alert.insurance_days <= 30 && alert.insurance_days >= 0) {
          newAlerts.push({
            id: `ins_${alert.registration}`,
            type: 'INSURANCE',
            level: alert.insurance_days <= 7 ? 'DANGER' : 'WARNING',
            message: `🛡️ Assurance expire bientôt: ${alert.name} [${alert.registration}] - ${alert.insurance_date}`,
          });
        }
        if (alert.vignette_days !== null && alert.vignette_days <= 30 && alert.vignette_days >= 0) {
          newAlerts.push({
            id: `vig_${alert.registration}`,
            type: 'VIGNETTE',
            level: alert.vignette_days <= 7 ? 'DANGER' : 'WARNING',
            message: `🏷️ Vignette expire bientôt: ${alert.name} [${alert.registration}] - ${alert.vignette_date}`,
          });
        }
      });
    } catch (e) {
      console.log('Error loading vehicle alerts', e);
    }

    try {
      const oilAlerts = await DatabaseService.getOilChangeAlerts();
      oilAlerts.forEach((alert: any) => {
        newAlerts.push({
          id: `oil_${alert.registration}`,
          type: 'OIL_CHANGE',
          level: alert.remaining_km <= 200 ? 'DANGER' : 'WARNING',
          message: `🛢️ ${t('alert_oil_change')} ${alert.name} [${alert.registration}] (${alert.remaining_km} km)`,
        });
      });
    } catch (e) {
      console.log('Error loading oil change alerts');
    }

    try {
      const activities = await DatabaseService.getTodayTransactions();
      setRecentActivities(activities);
    } catch (e) {
      console.log('Error loading today transactions');
    }

    setAlerts(newAlerts);
  };

  const periodKeys: { key: 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'; label: string }[] = [
    { key: 'TODAY', label: t('period_today') },
    { key: 'WEEK', label: t('period_week') },
    { key: 'MONTH', label: t('period_month') },
    { key: 'YEAR', label: t('period_year') },
  ];

  const menuItems = [
    { screen: 'Students', icon: '🎓', label: t('menu_students') },
    { screen: 'Vehicles', icon: '🚘', label: t('menu_vehicles') },
    { screen: 'Staff', icon: '👥', label: t('menu_staff') },
    { screen: 'History', icon: '📋', label: t('menu_history') },
    { screen: 'Settings', icon: '⚙️', label: t('menu_settings') },
  ];

  const styles = getStyles(colors, isDark, isRTL);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Text style={styles.headerTitle}>{t('app_name')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Text style={styles.themeToggleText}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bellIcon} onPress={() => setShowAlertsModal(true)}>
            <Text style={styles.bellText}>🔔</Text>
            {alerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
          >
            <Text style={styles.langToggleText}>FR | ع</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PERIOD FILTER */}
      <View>
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.filterContainer, isRTL && styles.rtlRow]}
        >
          {periodKeys.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.filterChip, period === p.key && styles.filterChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.filterText, period === p.key && styles.filterTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* KPI CARDS */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiIncome]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_income')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText, styles.textSuccess]}>
              + {kpi.income.toLocaleString()} DH
            </Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiExpense]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_expense')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText, styles.textDanger]}>
              - {kpi.expense.toLocaleString()} DH
            </Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiNet]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_net_profit')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText, styles.textPrimary]}>
              {kpi.net.toLocaleString()} DH
            </Text>
          </View>
        </View>

        {/* MENU GRID */}
        <View style={[styles.menuGrid, isRTL && styles.rtlRow]}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RECENT ACTIVITY */}
        <View style={styles.recentActivityContainer}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('recent_activity') || 'Activités récentes (Aujourd\'hui)'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.linkText}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityList}>
            {recentActivities.length === 0 ? (
              <Text style={[styles.emptyActivityText, isRTL && styles.rtlText]}>{t('no_activity') || 'Aucune transaction aujourd\'hui'}</Text>
            ) : (
              recentActivities.map((act) => (
                <View key={act.id} style={[styles.activityItem, isRTL && styles.rtlRow]}>
                  <View style={[styles.activityIconWrapper, act.type === 'INCOME' ? styles.bgGreenLight : styles.bgRedLight]}>
                    <Text style={styles.activityIcon}>{act.type === 'INCOME' ? '↓' : '↑'}</Text>
                  </View>
                  <View style={[styles.activityDetails, isRTL && styles.rtlDetails]}>
                    <Text style={[styles.activityTitle, isRTL && styles.rtlText]}>{act.category_name}</Text>
                    <Text style={[styles.activitySubtitle, isRTL && styles.rtlText]}>{act.description || '—'}</Text>
                  </View>
                  <Text style={[styles.activityAmount, act.type === 'INCOME' ? styles.textSuccess : styles.textDanger]}>
                    {act.type === 'INCOME' ? '+' : '-'}{act.amount} DH
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowFabMenu(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* FAB ACTION SHEET MODAL */}
      <Modal
        visible={showFabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.modalSheet}>
            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => {
                setShowFabMenu(false);
                navigation.navigate('InputExpense');
              }}
            >
              <Text style={styles.modalActionText}>{t('new_expense')} 💸</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => {
                setShowFabMenu(false);
                navigation.navigate('InputIncome');
              }}
            >
              <Text style={styles.modalActionText}>{t('new_income')} 🟢</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={[styles.modalAction, styles.modalCancel]}
              onPress={() => setShowFabMenu(false)}
            >
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ALERTS MODAL */}
      <Modal
        visible={showAlertsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAlertsModal(false)}
        >
          <View style={styles.alertsModalContent}>
            <View style={[styles.alertsModalHeader, isRTL && styles.rtlRow]}>
              <Text style={styles.alertsModalTitle}>🔔 Alertes ({alerts.length})</Text>
              <TouchableOpacity onPress={() => setShowAlertsModal(false)}>
                <Text style={styles.closeAlertsBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.alertsModalScroll}>
              {alerts.length === 0 ? (
                <Text style={styles.noAlertsText}>Aucune alerte pour le moment.</Text>
              ) : (
                alerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertBanner,
                      alert.level === 'DANGER' ? styles.alertDanger : styles.alertWarning,
                      isRTL && styles.rtlRow,
                    ]}
                  >
                    <Text style={[styles.alertText, isRTL && styles.rtlText]}>{alert.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  themeToggle: {
    padding: 6,
  },
  themeToggleText: {
    fontSize: 20,
  },
  bellIcon: {
    position: 'relative',
    padding: 4,
  },
  bellText: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langToggleText: {
    fontWeight: 'bold',
    color: colors.textSecondary,
  },

  // Filter chips
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },

  // Scroll
  scrollContent: {
    padding: 16,
  },

  // Alerts
  alertsContainer: {
    marginBottom: 20,
    gap: 8,
  },
  alertBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertDanger: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#f87171',
  },
  alertWarning: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fbbf24',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  // KPI
  kpiGrid: {
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiIncome: {
    backgroundColor: isDark ? '#112211' : '#f0fdf4',
    borderColor: isDark ? '#14532d' : '#bbf7d0',
  },
  kpiExpense: {
    backgroundColor: isDark ? '#2a1111' : '#fef2f2',
    borderColor: isDark ? '#7f1d1d' : '#fecaca',
  },
  kpiNet: {
    backgroundColor: isDark ? '#111827' : '#eff6ff',
    borderColor: isDark ? '#1e3a8a' : '#bfdbfe',
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  textSuccess: { color: colors.success },
  textDanger: { color: colors.danger },
  textPrimary: { color: colors.primary },

  // Menu grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuItem: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.iconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // Recent Activity
  recentActivityContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  activityList: {
    paddingVertical: 8,
  },
  emptyActivityText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bgGreenLight: { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7' },
  bgRedLight: { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' },
  activityIcon: { fontSize: 18, fontWeight: 'bold' },
  activityDetails: { flex: 1 },
  rtlDetails: { marginRight: 16, marginLeft: 0 },
  activityTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  activitySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  activityAmount: { fontSize: 16, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
    marginTop: -4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalAction: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginVertical: 6,
  },
  modalActionText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  modalDivider: {
    height: 0,
  },
  modalCancel: {
    marginTop: 12,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
  },
  modalCancelText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
  },
  alertsModalContent: {
    backgroundColor: colors.surface,
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
  },
  alertsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeAlertsBtn: {
    fontSize: 22,
    color: colors.textSecondary,
    padding: 4,
  },
  alertsModalScroll: {
    maxHeight: '100%',
  },
  noAlertsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 24,
    marginBottom: 24,
  },
});
