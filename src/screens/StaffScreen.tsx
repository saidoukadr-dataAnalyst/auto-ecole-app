import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../services/DatabaseService';
import { ExportService } from '../services/ExportService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export function StaffScreen() {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const [staff, setStaff] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const data = await DatabaseService.getStaff();
      setStaff(data);
      setFiltered(data);
      setSearch('');
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(staff);
    } else {
      const q = search.toLowerCase();
      setFiltered(staff.filter((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.role?.toLowerCase().includes(q)));
    }
  }, [search, staff]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStaff();
  }, [loadStaff]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setRole('');
    setBaseSalary('');
    setEditingStaff(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingStaff(item);
    setName(item.name || '');
    setPhone(item.phone || '');
    setRole(item.role || '');
    setBaseSalary(String(item.base_salary || 0));
    setModalVisible(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      t('confirm_delete'),
      t('confirm_delete_msg') || 'Êtes-vous sûr ?',
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteStaff(item.id);
              showToast(t('staff_deleted'));
              loadStaff();
            } catch {
              showToast(t('error'));
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !role.trim() || !baseSalary.trim()) {
      showToast(t('fill_required'));
      return;
    }
    const salaryVal = parseFloat(baseSalary);

    if (isNaN(salaryVal) || salaryVal < 0) {
      showToast(t('invalid_amount'));
      return;
    }

    setSaving(true);
    try {
      if (editingStaff) {
        await DatabaseService.updateStaff(editingStaff.id, name.trim(), phone.trim(), role.trim(), salaryVal);
      } else {
        await DatabaseService.addStaff(name.trim(), phone.trim(), role.trim(), salaryVal);
      }
      showToast(t('staff_saved'));
      resetForm();
      setModalVisible(false);
      loadStaff();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const renderStaff = ({ item }: { item: any }) => {
    const hiredDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <Text style={[styles.cardName, isRTL && styles.textRight]}>{item.name}</Text>
          <View style={[styles.cardActions, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.cardDetail}>📞 {item.phone || '—'}</Text>
        </View>
        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 4 }]}>
          <Text style={styles.cardDetail}>💼 {item.role}</Text>
        </View>

        {/* Payment info & Performance */}
        <View style={[styles.paymentInfo, isRTL && styles.rowReverse]}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('base_salary')}</Text>
            <Text style={styles.paymentValue}>{(item.base_salary || 0).toFixed(0)} DH</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('salary')} (Reçu)</Text>
            <Text style={[styles.paymentValue, styles.greenText]}>{(item.paid_amount || 0).toFixed(0)} DH</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>Activités liées</Text>
            <Text style={[styles.paymentValue, { color: colors.primary }]}>{item.total_sessions || 0} op.</Text>
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

  const handleExportStaffPDF = async () => {
    try {
      await ExportService.exportStaffPDF(filtered);
      showToast(t('export_pdf_success') || 'PDF Exporté !');
    } catch {
      showToast(t('error'));
    }
  };

  const handleExportStaffCSV = async () => {
    try {
      await ExportService.exportStaffCSV(filtered);
      showToast(t('export_csv_success') || 'CSV Exporté !');
    } catch {
      showToast(t('error'));
    }
  };

  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Text style={styles.headerTitle}>{t('staff')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            style={{ padding: 10, backgroundColor: colors.primary + '15', borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '30' }} 
            onPress={() => setShowExportModal(true)}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>{t('add_new')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchBar, isRTL && styles.textRight]}
          placeholder={`🔍 ${t('search')}...`}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStaff}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('no_staff')}</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
              {editingStaff ? t('edit_staff') : t('add_staff')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('name')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={name}
                onChangeText={setName}
                placeholder="Nom complet"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('phone_optional')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={phone}
                onChangeText={setPhone}
                placeholder="0600000000"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('role')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={role}
                onChangeText={setRole}
                placeholder="Moniteur, Secrétaire..."
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('base_salary')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={baseSalary}
                onChangeText={setBaseSalary}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
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

      {/* EXPORT STAFF MODAL */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowReverse]}>
              <Text style={styles.modalTitle}>📄 Exportation du Personnel</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
              Choisissez le format d'exportation de la liste des employés et moniteurs ({filtered.length} membres) :
            </Text>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca' }}
                onPress={() => {
                  setShowExportModal(false);
                  handleExportStaffPDF();
                }}
              >
                <Ionicons name="document-text-outline" size={24} color="#ef4444" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>📄 Exporter au Format PDF</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Rapport imprimable avec totaux des salaires</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : '#bbf7d0' }}
                onPress={() => {
                  setShowExportModal(false);
                  handleExportStaffCSV();
                }}
              >
                <Ionicons name="stats-chart-outline" size={24} color="#16a34a" style={{ marginRight: 12 }} />
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>📊 Exporter au Format CSV (Excel)</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Fichier comptable exploitable dans Excel</Text>
                </View>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
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
    marginBottom: 12,
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
    marginTop: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentItem: {
    alignItems: 'center',
    flex: 1,
  },
  paymentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  greenText: {
    color: colors.success,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
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
