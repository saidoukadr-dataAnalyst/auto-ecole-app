import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

export function VehiclesScreen() {
  const { t, isRTL } = useLanguage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [mileage, setMileage] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [oilChangeDate, setOilChangeDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Date pickers
  const [showVisitPicker, setShowVisitPicker] = useState(false);
  const [showOilPicker, setShowOilPicker] = useState(false);

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

  const resetForm = () => {
    setName('');
    setRegistration('');
    setMileage('');
    setNextVisit('');
    setOilChangeDate('');
    setEditingVehicle(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setName(vehicle.name || '');
    setRegistration(vehicle.registration || '');
    setMileage(String(vehicle.current_mileage || 0));
    setNextVisit(vehicle.next_technical_visit || '');
    setOilChangeDate('');
    setModalVisible(true);
  };

  const handleDelete = (vehicle: any) => {
    Alert.alert(
      t('confirm_delete'),
      t('confirm_delete_msg'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteVehicle(vehicle.id);
              showToast(t('vehicle_deleted'));
              loadVehicles();
            } catch {
              showToast(t('error'));
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !registration.trim()) {
      showToast(t('fill_required'));
      return;
    }
    setSaving(true);
    try {
      if (editingVehicle) {
        await DatabaseService.updateVehicle(
          editingVehicle.id,
          name.trim(),
          registration.trim(),
          parseInt(mileage) || 0,
          nextVisit.trim()
        );
        showToast(t('vehicle_updated'));
      } else {
        await DatabaseService.addVehicle(
          name.trim(),
          registration.trim(),
          parseInt(mileage) || 0,
          nextVisit.trim(),
          oilChangeDate.trim() || undefined
        );
        showToast(t('vehicle_added'));
      }
      resetForm();
      setModalVisible(false);
      loadVehicles();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const onVisitDateChange = (_event: any, selectedDate?: Date) => {
    setShowVisitPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNextVisit(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onOilDateChange = (_event: any, selectedDate?: Date) => {
    setShowOilPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setOilChangeDate(selectedDate.toISOString().split('T')[0]);
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
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <Text style={[styles.cardName, isRTL && styles.textRight]}>
            🚗 {item.name} - {item.registration}
          </Text>
          <View style={[styles.cardActions, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {item.avg_consumption > 0 && (
          <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 6 }]}>
            <Text style={[styles.cardDetail, item.avg_consumption > 10 && styles.textRed]}>
              ⛽ {t('consumption') || 'Consommation'}: {item.avg_consumption.toFixed(1)} L/100km
            </Text>
            {item.avg_consumption > 10 && (
              <View style={[styles.alertDot, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />
            )}
          </View>
        )}
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
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
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

      {/* Add/Edit Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
              {editingVehicle ? t('edit_vehicle') : t('add_vehicle')}
            </Text>

            {/* Nom */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('name')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('name')}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />

            {/* Immatriculation */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('registration')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('registration')}
              value={registration}
              onChangeText={setRegistration}
              placeholderTextColor="#999"
            />

            {/* Kilométrage */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('mileage')} (km)</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder="0"
              value={mileage}
              onChangeText={setMileage}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            {/* Visite Technique - Date Picker */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('technical_visit')}</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowVisitPicker(true)}>
              <Text style={[styles.dateButtonText, !nextVisit && styles.datePlaceholder]}>
                {nextVisit ? `📅 ${nextVisit}` : `📅 ${t('select_date')}`}
              </Text>
            </TouchableOpacity>
            {showVisitPicker && (
              <DateTimePicker
                value={nextVisit ? new Date(nextVisit) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onVisitDateChange}
              />
            )}

            {/* Date de Vidange - Date Picker (only for new vehicles) */}
            {!editingVehicle && (
              <>
                <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('oil_change_date')}</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowOilPicker(true)}>
                  <Text style={[styles.dateButtonText, !oilChangeDate && styles.datePlaceholder]}>
                    {oilChangeDate ? `🛢️ ${oilChangeDate}` : `🛢️ ${t('select_date')}`}
                  </Text>
                </TouchableOpacity>
                {showOilPicker && (
                  <DateTimePicker
                    value={oilChangeDate ? new Date(oilChangeDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onOilDateChange}
                  />
                )}
              </>
            )}

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
  },
  editBtnText: {
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 16,
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    color: '#333',
  },
  dateButton: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
  },
  datePlaceholder: {
    color: '#999',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
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
