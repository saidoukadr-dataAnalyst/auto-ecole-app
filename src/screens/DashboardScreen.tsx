import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, I18nManager } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

// Types pour les alertes
type AlertItem = {
  id: string;
  type: 'TECH_VISIT' | 'OIL_CHANGE';
  level: 'DANGER' | 'WARNING'; // DANGER = Rouge, WARNING = Orange
  message: string;
};

type DashboardProps = {
  navigation: any;
};

export const DashboardScreen = ({ navigation }: DashboardProps) => {
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL);
  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  
  // KPIs
  const [kpi, setKpi] = useState({ income: 0, expense: 0, net: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    // 1. Charger les KPIs financiers
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const { income, expense } = await DatabaseService.getFinancialSummary(currentYear, currentMonth);
    setKpi({ income, expense, net: income - expense });

    // 2. Charger les Alertes (Visite Technique & Vidange)
    const newAlerts: AlertItem[] = [];
    
    try {
      const techAlerts = await DatabaseService.getTechnicalVisitAlerts();
      techAlerts.forEach(alert => {
        newAlerts.push({
          id: `tech_${alert.registration}`,
          type: 'TECH_VISIT',
          level: alert.days_remaining <= 2 ? 'DANGER' : 'WARNING',
          message: `⚠️ Visite technique requise pour ${alert.name} [${alert.registration}] avant le ${alert.next_technical_visit}.`
        });
      });

      const oilAlerts = await DatabaseService.getOilChangeAlerts();
      oilAlerts.forEach(alert => {
        newAlerts.push({
          id: `oil_${alert.registration}`,
          type: 'OIL_CHANGE',
          level: alert.remaining_km <= 200 ? 'DANGER' : 'WARNING',
          message: `🛢️ Vidange à prévoir pour ${alert.name} [${alert.registration}] (Reste: ${alert.remaining_km} km).`
        });
      });
    } catch (e) {
      console.log("Erreur lors du chargement des alertes (DB vide ?)");
    }
    
    setAlerts(newAlerts);
  };

  const toggleRTL = () => {
    const nextRTL = !isRTL;
    setIsRTL(nextRTL);
    I18nManager.forceRTL(nextRTL);
    // Note : En production, il faut recharger le bundle (Updates.reloadAsync()) pour appliquer le RTL/LTR global.
  };

  return (
    <View style={styles.container}>
      {/* 1. HEADER */}
      <View style={[styles.header, isRTL && styles.rtlRow]}>
        <Text style={styles.headerTitle}>{isRTL ? "مدرستي" : "Mon Auto-École"}</Text>
        <TouchableOpacity style={styles.langToggle} onPress={toggleRTL}>
          <Text style={styles.langToggleText}>{isRTL ? "FR | ع" : "FR | ع"}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. FILTRE TEMPOREL */}
      <View style={[styles.filterContainer, isRTL && styles.rtlRow]}>
        {['TODAY', 'WEEK', 'MONTH', 'YEAR'].map((p) => (
          <TouchableOpacity 
            key={p} 
            style={[styles.filterChip, period === p && styles.filterChipActive]}
            onPress={() => setPeriod(p as any)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p === 'TODAY' ? 'Aujourd\'hui' : p === 'WEEK' ? '7 Jours' : p === 'MONTH' ? 'Ce Mois' : 'Cette Année'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 3. ZONE CRITIQUE DES ALERTES */}
        {alerts.length > 0 && (
          <View style={styles.alertsContainer}>
            {alerts.map(alert => (
              <View 
                key={alert.id} 
                style={[styles.alertBanner, alert.level === 'DANGER' ? styles.alertDanger : styles.alertWarning, isRTL && styles.rtlRow]}
              >
                <Text style={[styles.alertText, isRTL && styles.rtlText]}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. BLOC DES KPIs FINANCIERS */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiIncome]}>
            <Text style={styles.kpiLabel}>Encaissé</Text>
            <Text style={styles.kpiValue}>+ {kpi.income.toLocaleString()} DH</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiExpense]}>
            <Text style={styles.kpiLabel}>Dépensé</Text>
            <Text style={styles.kpiValue}>- {kpi.expense.toLocaleString()} DH</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiNet]}>
            <Text style={styles.kpiLabel}>Bénéfice Net</Text>
            <Text style={styles.kpiValue}>{kpi.net.toLocaleString()} DH</Text>
          </View>
        </View>

        {/* MENU DE NAVIGATION */}
        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Students')}>
            <Text style={styles.menuIcon}>🎓</Text>
            <Text style={styles.menuText}>Élèves</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Vehicles')}>
            <Text style={styles.menuIcon}>🚘</Text>
            <Text style={styles.menuText}>Véhicules</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuText}>Historique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        {/* 5. GRAPHIQUE HISTORIQUE */}
        <View style={styles.chartContainer}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>Évolution Financière (6 Mois)</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              [Graphique react-native-gifted-charts]
              {"\n"}Barres Vertes/Rouges + Courbe de Tendance
            </Text>
          </View>
        </View>

        {/* 6. ACTIVITÉ RÉCENTE */}
        <View style={styles.recentActivityContainer}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Text style={styles.sectionTitle}>Activité Récente</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activityList}>
            <Text style={styles.emptyActivityText}>Aucune transaction récente.</Text>
            {/* Future list items mapped here */}
          </View>
        </View>
        
        {/* Padding for FAB */}
        <View style={{height: 80}} />
      </ScrollView>

      {/* 7. FAB (Floating Action Button) */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  langToggle: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 16 },
  langToggleText: { fontWeight: 'bold', color: '#334155' },
  filterContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#ffffff', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#1e293b' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  scrollContent: { padding: 16 },
  alertsContainer: { marginBottom: 20, gap: 8 },
  alertBanner: { padding: 12, borderRadius: 8, borderWidth: 1 },
  alertDanger: { backgroundColor: '#fef2f2', borderColor: '#f87171' },
  alertWarning: { backgroundColor: '#fffbeb', borderColor: '#fbbf24' },
  alertText: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  kpiGrid: { gap: 12, marginBottom: 24 },
  kpiCard: { padding: 16, borderRadius: 12, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  kpiIncome: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  kpiExpense: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  kpiNet: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  kpiLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  menuItem: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  menuIcon: { fontSize: 24, marginBottom: 8 },
  menuText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  chartContainer: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 24, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  chartPlaceholder: { height: 200, backgroundColor: '#f8fafc', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  chartPlaceholderText: { color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  recentActivityContainer: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkText: { color: '#2563eb', fontWeight: '600' },
  activityList: { paddingVertical: 12 },
  emptyActivityText: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { fontSize: 32, color: '#ffffff', fontWeight: '300', marginTop: -4 },
});
