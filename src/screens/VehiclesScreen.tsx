import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

export default function VehiclesScreen() {
  const { t, isRTL } = useLanguage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [mileage, setMileage] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await DatabaseService.getVehicles();
      setVehicles(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVehicles();
  }, [loadVehicles]);

  const handleSave = async () => {
    if (!name.trim() || !registration.trim()) {
      showToast(t('fill_required'));
      return;
    }
    setSaving(true);
    try {
      await DatabaseService.addVehicle(name.trim(), registration.trim(), parseInt(mileage) || 0, nextVisit.trim());
      showToast(t('vehicle_added'));
      setName('');
      setRegistration('');
      setMileage('');
      setNextVisit('');
      setModalVisible(false);
      loadVehicles();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const isVisitUrgent = (dateStr: string | null) => {
    if (!dateStr) return false;
    const visit = new Date(dateStr);
    const now = new Date();
    const diffDays = (visit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const renderVehicle = ({ item }: { item: any }) => {
    const oilRemaining = (item.next_oil_change_km || 0) - (item.current_mileage || 0);
    const oilUrgent = oilRemaining <= 1000;
    const visitUrgent = isVisitUrgent(item.next_technical_visit);
    const visitDate = item.next_technical_visit
      ? new Date(item.next_technical_visit).toLocaleDateString()
      : '—';

    return (
      <View style={styles.card}>
        <Text style={[styles.cardName, isRTL && styles.textRight]}>
          🚗 {item.name} - {item.registration}
        </Text>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          <Text style={styles.cardDetail}>
            🛣️ {t('mileage')}: {(item.current_mileage || 0).toLocaleString()} km
          </Text>
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 6 }]}>
          <Text style={[styles.cardDetail, oilUrgent && styles.textRed]}>
            🛢️ {t('oil_change')}: {oilRemaining > 0 ? `${oilRemaining.toLocaleString()} km` : t('overdue')}
          </Text>
          {oilUrgent && (
            <View style={[styles.alertDot, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />
          )}
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 6 }]}>
          <Text style={[styles.cardDetail, visitUrgent && styles.textRed]}>
            🔧 {t('technical_visit')}: {visitDate}
          </Text>
          {visitUrgent && (
            <View style={[styles.alertDot, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Text style={styles.headerTitle}>{t('vehicles')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ {t('add_new')}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderVehicle}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90D9']} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('no_data')}</Text>
          </View>
        }
      />

      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>{t('add_new')}</Text>

            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('name')}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('registration')}
              value={registration}
              onChangeText={setRegistration}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('mileage')}
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder="YYYY-MM-DD"
              value={nextVisit}
              onChangeText={setNextVisit}
              placeholderTextColor="#999"
            />

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  setName('');
                  setRegistration('');
                  setMileage('');
                  setNextVisit('');
                }}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  addBtn: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  cardDetail: {
    fontSize: 14,
    color: '#666',
  },
  textRed: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
