import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Alert, Platform, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export function VehiclesScreen() {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
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
  const [insuranceDate, setInsuranceDate] = useState('');
  const [vignetteDate, setVignetteDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);

  // Date pickers
  const [showVisitPicker, setShowVisitPicker] = useState(false);
  const [showOilPicker, setShowOilPicker] = useState(false);
  const [showInsurancePicker, setShowInsurancePicker] = useState(false);
  const [showVignettePicker, setShowVignettePicker] = useState(false);

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
    setInsuranceDate('');
    setVignetteDate('');
    setImageUri(null);
    setEditingVehicle(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast("Permission d'accès aux photos refusée");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      showToast("Erreur lors de la sélection de l'image");
    }
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setName(vehicle.name || '');
    setRegistration(vehicle.registration || '');
    setMileage(String(vehicle.current_mileage || 0));
    setNextVisit(vehicle.next_technical_visit || '');
    setOilChangeDate('');
    setInsuranceDate(vehicle.insurance_date || '');
    setVignetteDate(vehicle.vignette_date || '');
    setImageUri(vehicle.image_uri || null);
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
          nextVisit.trim(),
          insuranceDate.trim(),
          vignetteDate.trim(),
          imageUri || undefined
        );
        showToast(t('vehicle_updated'));
      } else {
        await DatabaseService.addVehicle(
          name.trim(),
          registration.trim(),
          parseInt(mileage) || 0,
          nextVisit.trim(),
          oilChangeDate.trim() || undefined,
          insuranceDate.trim(),
          vignetteDate.trim(),
          imageUri || undefined
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

  const onInsuranceDateChange = (_event: any, selectedDate?: Date) => {
    setShowInsurancePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInsuranceDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onVignetteDateChange = (_event: any, selectedDate?: Date) => {
    setShowVignettePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setVignetteDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const getDateStatus = (dateStr: string | null) => {
    if (!dateStr) return 'green';
    const visit = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    visit.setHours(0, 0, 0, 0);
    const diffDays = (visit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) return 'red';
    if (diffDays <= 30) return 'orange';
    return 'green';
  };

  const getOilStatus = (oilRemaining: number) => {
    if (oilRemaining <= 500) return 'red';
    if (oilRemaining <= 1500) return 'orange';
    return 'green';
  };

  const renderVehicle = ({ item }: { item: any }) => {
    const oilRemaining = (item.next_oil_change_km || 0) - (item.current_mileage || 0);
    const oilStatus = getOilStatus(oilRemaining);
    const visitStatus = getDateStatus(item.next_technical_visit);
    const insuranceStatus = getDateStatus(item.insurance_date);
    const vignetteStatus = getDateStatus(item.vignette_date);

    const getStatusStyle = (status: 'red' | 'orange' | 'green') => {
      if (status === 'red') return styles.textDanger;
      if (status === 'orange') return styles.textWarning;
      return styles.textSuccess;
    };

    const renderAlertDot = (status: 'red' | 'orange' | 'green') => {
      if (status === 'red') return <View style={[styles.alertDotRed, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />;
      if (status === 'orange') return <View style={[styles.alertDotOrange, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />;
      return <View style={[styles.alertDotGreen, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]} />;
    };

    const visitDate = item.next_technical_visit
      ? new Date(item.next_technical_visit).toLocaleDateString()
      : '—';
    const insDate = item.insurance_date
      ? new Date(item.insurance_date).toLocaleDateString()
      : '—';
    const vigDate = item.vignette_date
      ? new Date(item.vignette_date).toLocaleDateString()
      : '—';

    return (
      <View style={styles.card}>
        {item.image_uri ? (
          <Image
            source={{ uri: item.image_uri }}
            style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
            resizeMode="cover"
          />
        ) : null}
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

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 12 }]}>
          <Text style={styles.cardDetail}>
            🛣️ {t('mileage')}: {(item.current_mileage || 0).toLocaleString()} km
          </Text>
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          <Text style={[styles.cardDetail, getStatusStyle(oilStatus)]}>
            🛢️ {t('oil_change')}: {oilRemaining > 0 ? `${oilRemaining.toLocaleString()} km` : t('overdue')}
          </Text>
          {renderAlertDot(oilStatus)}
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          <Text style={[styles.cardDetail, getStatusStyle(visitStatus)]}>
            🔧 {t('technical_visit')}: {visitDate}
          </Text>
          {renderAlertDot(visitStatus)}
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          <Text style={[styles.cardDetail, getStatusStyle(insuranceStatus)]}>
            🛡️ Assurance: {insDate}
          </Text>
          {renderAlertDot(insuranceStatus)}
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          <Text style={[styles.cardDetail, getStatusStyle(vignetteStatus)]}>
            🏷️ Vignette: {vigDate}
          </Text>
          {renderAlertDot(vignetteStatus)}
        </View>

        {item.avg_consumption > 0 && (
          <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
            <Text style={[styles.cardDetail, item.avg_consumption > 10 && styles.textDanger]}>
              ⛽ Consommation moyenne: {item.avg_consumption.toFixed(1)} L / 100 km
            </Text>
          </View>
        )}

        <View style={{ marginTop: 12, padding: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total Dépenses</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>{(item.total_expenses || 0).toLocaleString()} DH</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Coût de revient / KM</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {((item.total_expenses || 0) / Math.max(1, item.current_mileage || 1)).toFixed(2)} DH/km
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const styles = getStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Text style={styles.headerTitle}>{t('vehicles')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>{t('add_new')}</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderVehicle}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('no_data')}</Text>
          </View>
        }
      />

      {/* Add/Edit Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
              {editingVehicle ? t('edit_vehicle') : t('add_vehicle')}
            </Text>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1, width: '100%' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nom du Véhicule */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('name')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                placeholder={t('name')}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Immatriculation */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('registration')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                placeholder={t('registration')}
                value={registration}
                onChangeText={setRegistration}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Kilométrage */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('mileage')} (km)</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                placeholder="0"
                value={mileage}
                onChangeText={setMileage}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Photo du Véhicule */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>Photo du Véhicule</Text>
              <View style={{ marginBottom: 16 }}>
                {imageUri ? (
                  <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 16 }}
                      onPress={() => setImageUri(null)}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ width: '100%', height: 90, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}
                    onPress={pickImage}
                  >
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, fontWeight: '500' }}>📸 Ajouter une photo du véhicule</Text>
                  </TouchableOpacity>
                )}
              </View>

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

              {/* Assurance - Date Picker */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>Date Assurance</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowInsurancePicker(true)}>
                <Text style={[styles.dateButtonText, !insuranceDate && styles.datePlaceholder]}>
                  {insuranceDate ? `🛡️ ${insuranceDate}` : `🛡️ Sélectionner une date`}
                </Text>
              </TouchableOpacity>
              {showInsurancePicker && (
                <DateTimePicker
                  value={insuranceDate ? new Date(insuranceDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onInsuranceDateChange}
                />
              )}

              {/* Vignette - Date Picker */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>Date Vignette</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowVignettePicker(true)}>
                <Text style={[styles.dateButtonText, !vignetteDate && styles.datePlaceholder]}>
                  {vignetteDate ? `🏷️ ${vignetteDate}` : `🏷️ Sélectionner une date`}
                </Text>
              </TouchableOpacity>
              {showVignettePicker && (
                <DateTimePicker
                  value={vignetteDate ? new Date(vignetteDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onVignetteDateChange}
                />
              )}
            </ScrollView>

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

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: colors.iconBg,
    borderRadius: 10,
    padding: 10,
  },
  editBtnText: {
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderRadius: 10,
    padding: 10,
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
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textDanger: {
    color: colors.danger,
    fontWeight: '700',
  },
  textWarning: {
    color: '#f59e0b', // Orange
    fontWeight: '700',
  },
  textSuccess: {
    color: '#10b981', // Green
    fontWeight: '700',
  },
  alertDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  alertDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  alertDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  dateButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  datePlaceholder: {
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
