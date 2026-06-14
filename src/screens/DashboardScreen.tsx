import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

type AlertItem = {
  id: string;
  type: 'TECH_VISIT' | 'OIL_CHANGE';
  level: 'DANGER' | 'WARNING';
  message: string;
};

type DashboardProps = {
  navigation: any;
};

export const DashboardScreen = ({ navigation }: DashboardProps) => {
  const { t, lang, setLang, isRTL } = useLanguage();

  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [kpi, setKpi] = useState({ income: 0, expense: 0, net: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const { income, expense } = await DatabaseService.getFinancialSummary(currentYear, currentMonth);
    setKpi({ income, expense, net: income - expense });

    const newAlerts: AlertItem[] = [];

    try {
      const techAlerts = await DatabaseService.getTechnicalVisitAlerts();
      techAlerts.forEach((alert: any) => {
        newAlerts.push({
          id: `tech_${alert.registration}`,
          type: 'TECH_VISIT',
          level: alert.days_remaining <= 2 ? 'DANGER' : 'WARNING',
          message: `⚠️ ${t('alert_tech_visit')} ${alert.name} [${alert.registration}] - ${alert.next_technical_visit}`,
        });
      });
    } catch (e) {
      console.log('Error loading technical visit alerts');
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
    { screen: 'History', icon: '📋', label: t('menu_history') },
    { screen: 'Settings', icon: '⚙️', label: t('menu_settings') },
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Text style={styles.headerTitle}>{t('app_name')}</Text>
        <TouchableOpacity
          style={styles.langToggle}
          onPress={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
        >
          <Text style={styles.langToggleText}>FR | ع</Text>
        </TouchableOpacity>
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
        {/* ALERT BANNERS */}
        {alerts.length > 0 && (
          <View style={styles.alertsContainer}>
            {alerts.map((alert) => (
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
            ))}
          </View>
        )}

        {/* KPI CARDS */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiIncome]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_income')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText]}>
              + {kpi.income.toLocaleString()} DH
            </Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiExpense]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_expense')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText]}>
              - {kpi.expense.toLocaleString()} DH
            </Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiNet]}>
            <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>{t('kpi_net_profit')}</Text>
            <Text style={[styles.kpiValue, isRTL && styles.rtlText]}>
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
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RECENT ACTIVITY */}
        <View style={styles.recentActivityContainer}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Text style={styles.sectionTitle}>{t('recent_activity')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.linkText}>{t('see_all')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityList}>
            <Text style={styles.emptyActivityText}>{t('no_recent_transactions')}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
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
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  langToggleText: {
    fontWeight: 'bold',
    color: '#334155',
  },

  // Filter chips
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#1e293b',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
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
    borderRadius: 8,
    borderWidth: 1,
  },
  alertDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
  },
  alertWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  // KPI
  kpiGrid: {
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  kpiIncome: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  kpiExpense: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  kpiNet: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Menu grid
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Recent Activity
  recentActivityContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  activityList: {
    paddingVertical: 12,
  },
  emptyActivityText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  modalAction: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  modalCancel: {
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ef4444',
  },
});
