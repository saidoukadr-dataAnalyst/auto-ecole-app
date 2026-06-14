import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

export default function StudentsScreen() {
  const { t, isRTL } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const data = await DatabaseService.getStudents();
      setStudents(data);
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
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(students);
    } else {
      const q = search.toLowerCase();
      setFiltered(students.filter((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q)));
    }
  }, [search, students]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStudents();
  }, [loadStudents]);

  const handleSave = async () => {
    if (!name.trim() || !packagePrice.trim()) {
      showToast(t('fill_required'));
      return;
    }
    setSaving(true);
    try {
      await DatabaseService.addStudent(name.trim(), phone.trim(), parseFloat(packagePrice));
      showToast(t('student_added'));
      setName('');
      setPhone('');
      setPackagePrice('');
      setModalVisible(false);
      loadStudents();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: any }) => {
    const balance = (item.package_price || 0) - (item.paid_amount || 0);
    const isPaid = balance <= 0;
    const enrolledDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

    return (
      <View style={styles.card}>
        <Text style={[styles.cardName, isRTL && styles.textRight]}>{item.name}</Text>
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.cardDetail}>📞 {item.phone || '—'}</Text>
        </View>
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <Text style={styles.cardDetail}>📅 {t('enrolled')}: {enrolledDate}</Text>
        </View>
        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 8 }]}>
          {isPaid ? (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={styles.badgeText}>{t('paid')}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeRed]}>
              <Text style={styles.badgeText}>{t('debt')}: {balance.toFixed(2)} DH</Text>
            </View>
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
        <Text style={styles.headerTitle}>{t('students')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
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
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4A90D9']} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('no_data')}</Text>
          </View>
        }
      />

      {/* Add Student Modal */}
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
              placeholder={t('phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('package_price')}
              value={packagePrice}
              onChangeText={setPackagePrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  setName('');
                  setPhone('');
                  setPackagePrice('');
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
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
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
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeGreen: {
    backgroundColor: '#E8F5E9',
  },
  badgeRed: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
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
