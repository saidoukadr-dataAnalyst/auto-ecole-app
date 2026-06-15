import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Alert, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

export function StaffScreen() {
  const { t, isRTL } = useLanguage();
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
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.cardDetail}>💼 {item.role}</Text>
        </View>

        {/* Payment info */}
        <View style={[styles.paymentInfo, isRTL && styles.rowReverse]}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('base_salary')}</Text>
            <Text style={styles.paymentValue}>{(item.base_salary || 0).toFixed(0)} DH</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('salary')} (Reçu)</Text>
            <Text style={[styles.paymentValue, styles.greenText]}>{(item.paid_amount || 0).toFixed(0)} DH</Text>
          </View>
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
        <Text style={styles.headerTitle}>{t('staff')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ {t('add_new')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={[styles.searchBar, isRTL && styles.textRight]}
        placeholder={`🔍 ${t('search')}...`}
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStaff}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90D9']} />}
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
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('phone_optional')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={phone}
                onChangeText={setPhone}
                placeholder="0600000000"
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('role')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={role}
                onChangeText={setRole}
                placeholder="Moniteur, Secrétaire..."
              />

              <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('base_salary')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.textRight]}
                value={baseSalary}
                onChangeText={setBaseSalary}
                placeholder="0.00"
                keyboardType="numeric"
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
  searchBar: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8ECF0',
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
    marginBottom: 6,
  },
  cardName: {
    fontSize: 18,
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
    marginTop: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paymentItem: {
    alignItems: 'center',
    flex: 1,
  },
  paymentLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  greenText: {
    color: '#16a34a',
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
