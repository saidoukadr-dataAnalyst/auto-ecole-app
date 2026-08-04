import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatabaseService } from '../services/DatabaseService';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

import { AuthContext } from '../../App';

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
  const { lockApp } = React.useContext(AuthContext);

  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [kpi, setKpi] = useState({ income: 0, expense: 0, net: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [schoolName, setSchoolName] = useState('Auto-École');
  const [chartData, setChartData] = useState<{ month: string; income: number; expense: number }[]>([]);
  
  // TVA states
  const [annualTvaCount, setAnnualTvaCount] = useState(0);
  const [annualTvaTotal, setAnnualTvaTotal] = useState(0);

  // Agency Selector state
  const [agenciesList, setAgenciesList] = useState<any[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });
    return unsubscribe;
  }, [navigation, period, selectedAgencyId]);

  const loadDashboardData = async () => {
    try {
      const sName = await SecurityService.getSchoolName();
      setSchoolName(sName);
      const ags = await DatabaseService.getAgencies();
      setAgenciesList(ags);
    } catch (e) {}

    const { income, expense } = await DatabaseService.getFinancialSummaryByPeriod(period);
    setKpi({ income, expense, net: income - expense });

    if (period === 'YEAR') {
      try {
        const currentYearStr = new Date().getFullYear().toString();
        const tvaData = await DatabaseService.getAnnualTVAReport(currentYearStr);
        setAnnualTvaCount(tvaData.studentCount);
        setAnnualTvaTotal(tvaData.totalTVA);
      } catch (e) {
        console.log('Error calculating annual TVA for dashboard', e);
      }
    }

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

    try {
      const history = await DatabaseService.getFinancialHistoryLast6Months();
      setChartData(history);
    } catch (e) {
      console.log('Error loading chart history', e);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]} numberOfLines={1}>{schoolName}</Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.rtlText]}>By Oukadr</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.themeToggle} onPress={lockApp}>
            <Text style={styles.themeToggleText}>🔒</Text>
          </TouchableOpacity>

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
            style={styles.langSwitchContainer}
            onPress={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            activeOpacity={0.8}
          >
            <View style={[styles.langSwitchHalf, lang === 'fr' && styles.langSwitchActive]}>
              <Text style={[styles.langSwitchText, lang === 'fr' && styles.langSwitchTextActive]}>FR</Text>
            </View>
            <View style={[styles.langSwitchHalf, lang === 'ar' && styles.langSwitchActive]}>
              <Text style={[styles.langSwitchText, lang === 'ar' && styles.langSwitchTextActive]}>ع</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ACTIVE AGENCY SELECTOR (MULTI-AGENCES) */}
      {agenciesList.length > 0 && (
        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: selectedAgencyId === 0 ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'), borderWidth: 1, borderColor: selectedAgencyId === 0 ? colors.primary : colors.border }}
              onPress={() => setSelectedAgencyId(0)}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: selectedAgencyId === 0 ? '#fff' : colors.text }}>👑 Réseau Global (Toutes)</Text>
            </TouchableOpacity>

            {agenciesList.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: selectedAgencyId === a.id ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'), borderWidth: 1, borderColor: selectedAgencyId === a.id ? colors.primary : colors.border }}
                onPress={() => setSelectedAgencyId(a.id)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: selectedAgencyId === a.id ? '#fff' : colors.text }}>
                  🏫 {a.name} {a.is_main === 1 ? '(Locale)' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
        {/* ACTIVE ALERTS WIDGET */}
        {alerts.length > 0 && (
          <TouchableOpacity 
            style={[styles.alertsWidget, alerts.some(a => a.level === 'DANGER') ? styles.borderDanger : styles.borderWarning, isRTL && styles.rtlRow]} 
            onPress={() => setShowAlertsModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertsWidgetTitle, isRTL && styles.rtlText]}>
                ⚠️ {t('maintenance_alerts')} ({alerts.length})
              </Text>
              <Text style={[styles.alertsWidgetText, isRTL && styles.rtlText]}>
                {alerts.some(a => a.level === 'DANGER') 
                  ? "Certains rappels sont urgents (Visite, assurance, vignette ou vidange)." 
                  : "Certains rappels expirent dans moins de 30 jours."}
              </Text>
            </View>
            <Text style={[styles.alertsWidgetAction, { color: colors.primary }]}>{isRTL ? "عرض ➔" : "Voir ➔"}</Text>
          </TouchableOpacity>
        )}

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
          {period === 'YEAR' && (
            <View style={[styles.kpiCard, styles.kpiTva]}>
              <Text style={[styles.kpiLabel, isRTL && styles.rtlText]}>
                {t('tva_calculation') || 'TVA Estimée'}
              </Text>
              <Text style={[styles.kpiValue, isRTL && styles.rtlText, styles.textTva]}>
                {annualTvaTotal.toLocaleString()} DH
              </Text>
              <Text style={[styles.kpiSubtext, isRTL && styles.rtlText]}>
                ({annualTvaCount} {t('students') || 'élèves inscrits'})
              </Text>
            </View>
          )}
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

        {/* CHART SECTION */}
        {chartData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
              📈 {t('financial_chart')}
            </Text>
            
            <View style={[styles.chartLegend, isRTL && styles.rtlRow]}>
              <View style={[styles.legendItem, isRTL && styles.rtlRow]}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendLabel}>{t('income')}</Text>
              </View>
              <View style={[styles.legendItem, isRTL && styles.rtlRow]}>
                <View style={[styles.legendDot, { backgroundColor: '#f43f5e' }]} />
                <Text style={styles.legendLabel}>{t('expense')}</Text>
              </View>
            </View>

            <View style={[styles.chartBarsContainer, isRTL && styles.rtlRow]}>
              {chartData.map((item, idx) => {
                const maxAmount = Math.max(...chartData.map(c => Math.max(c.income, c.expense)), 1000);
                const incomeHeight = maxAmount > 0 ? (item.income / maxAmount) * 80 : 0; // max 80% height
                const expenseHeight = maxAmount > 0 ? (item.expense / maxAmount) * 80 : 0;

                const incomeK = item.income >= 1000 ? `${(item.income / 1000).toFixed(1)}k` : `${item.income}`;
                const expenseK = item.expense >= 1000 ? `${(item.expense / 1000).toFixed(1)}k` : `${item.expense}`;

                return (
                  <View key={idx} style={styles.chartColumn}>
                    <View style={styles.barsGroup}>
                      {/* Barre de Revenus */}
                      <View style={styles.barWrapper}>
                        {item.income > 0 && (
                          <Text style={styles.barTooltip}>{incomeK}</Text>
                        )}
                        <View style={[styles.bar, { height: `${incomeHeight}%`, backgroundColor: '#10b981' }]} />
                      </View>
                      
                      {/* Barre de Dépenses */}
                      <View style={styles.barWrapper}>
                        {item.expense > 0 && (
                          <Text style={styles.barTooltip}>{expenseK}</Text>
                        )}
                        <View style={[styles.bar, { height: `${expenseHeight}%`, backgroundColor: '#f43f5e' }]} />
                      </View>
                    </View>
                    <Text style={styles.chartMonthLabel} numberOfLines={1}>{item.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
              recentActivities.map((act) => {
                let mainTitle = act.category_name || t('transactions');
                let subTitle = act.description || '—';

                if (act.student_name) {
                  mainTitle = `🎓 ${act.student_name} (${act.license_type || 'B'})`;
                  subTitle = `${act.category_name || 'Forfait'}${act.description ? ' • ' + act.description : ''}`;
                } else if (act.vehicle_name) {
                  mainTitle = `🚘 ${act.vehicle_name} [${act.vehicle_reg || ''}]`;
                  subTitle = `${act.category_name || 'Dépense'}${act.description ? ' • ' + act.description : ''}`;
                } else if (act.staff_name) {
                  mainTitle = `👤 ${act.staff_name} (${act.staff_role || ''})`;
                  subTitle = `${act.category_name || 'Salaire'}${act.description ? ' • ' + act.description : ''}`;
                }

                return (
                  <View key={act.id} style={[styles.activityItem, isRTL && styles.rtlRow]}>
                    <View style={[styles.activityIconWrapper, act.type === 'INCOME' ? styles.bgGreenLight : styles.bgRedLight]}>
                      <Text style={styles.activityIcon}>{act.type === 'INCOME' ? '↑' : '↓'}</Text>
                    </View>
                    <View style={[styles.activityDetails, isRTL && styles.rtlDetails]}>
                      <Text style={[styles.activityTitle, isRTL && styles.rtlText]} numberOfLines={1}>{mainTitle}</Text>
                      <Text style={[styles.activitySubtitle, isRTL && styles.rtlText]} numberOfLines={1}>{subTitle}</Text>
                    </View>
                    <Text style={[styles.activityAmount, act.type === 'INCOME' ? styles.textSuccess : styles.textDanger]}>
                      {act.type === 'INCOME' ? '+' : '-'}{act.amount} DH
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Padding for FAB */}
        <View style={{ height: 140 }} />
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
    </SafeAreaView>
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
  langSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langSwitchHalf: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langSwitchActive: {
    backgroundColor: colors.success,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  langSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langSwitchTextActive: {
    color: '#ffffff',
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
  kpiTva: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
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
  kpiSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  textSuccess: { color: colors.success },
  textDanger: { color: colors.danger },
  textPrimary: { color: colors.primary },
  textTva: { color: '#3b82f6' },

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
    bottom: 90,
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
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  alertsWidget: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  borderDanger: {
    borderColor: '#ef4444',
  },
  borderWarning: {
    borderColor: '#f59e0b',
  },
  alertsWidgetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  alertsWidgetText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  alertsWidgetAction: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    alignItems: 'flex-end',
    paddingTop: 20,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 110,
    width: '100%',
  },
  barWrapper: {
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '40%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barTooltip: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  chartMonthLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
});
