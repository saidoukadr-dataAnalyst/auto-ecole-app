import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

interface Category {
  id: number;
  name: string;
  is_vehicle_related?: number;
}

interface Vehicle {
  id: number;
  name: string;
}

interface Props {
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export default function InputExpenseScreen({ onSaveSuccess, onCancel }: Props) {
  const { t, isRTL } = useLanguage();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [mileage, setMileage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const isVehicleRelated = selectedCategory?.is_vehicle_related === 1;

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await DatabaseService.getCategories('EXPENSE');
        setCategories(cats);
        const vehs = await DatabaseService.getVehicles();
        setVehicles(vehs);
      } catch {
        // silent
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isVehicleRelated) {
      setSelectedVehicleId(null);
      setMileage('');
    }
  }, [isVehicleRelated]);

  const validate = (): boolean => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      showToast(t('amount_required'));
      return false;
    }
    if (!selectedCategoryId) {
      showToast(t('category_required'));
      return false;
    }
    if (isVehicleRelated) {
      if (!selectedVehicleId) {
        showToast(t('vehicle_required'));
        return false;
      }
      const parsedMileage = parseFloat(mileage);
      if (!mileage || isNaN(parsedMileage) || parsedMileage <= 0) {
        showToast(t('mileage_required'));
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await DatabaseService.addExpense(
        parseFloat(amount),
        selectedCategoryId!,
        isVehicleRelated ? selectedVehicleId : null,
        isVehicleRelated ? parseFloat(mileage) : null,
        description.trim()
      );
      showToast(t('expense_saved'));
      onSaveSuccess();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Amount */}
      <View style={styles.section}>
        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('amount')}</Text>
        <View style={[styles.amountRow, isRTL && styles.rowRTL]}>
          <TextInput
            style={[styles.amountInput, isRTL && styles.textRTL]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#fca5a5"
            keyboardType="numeric"
          />
          <Text style={styles.currency}>DH</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('category')}</Text>
        <View style={[styles.chipContainer, isRTL && styles.chipContainerRTL]}>
          {categories.map((cat) => {
            const selected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, selected && styles.chipSelectedExpense]}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Vehicle selection */}
      {isVehicleRelated && (
        <>
          <View style={styles.section}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('vehicle')}</Text>
            <View style={[styles.chipContainer, isRTL && styles.chipContainerRTL]}>
              {vehicles.map((v) => {
                const selected = selectedVehicleId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.chip, selected && styles.chipSelectedExpense]}
                    onPress={() => setSelectedVehicleId(v.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      🚗 {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('mileage')}</Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.textRTL]}
              value={mileage}
              onChangeText={setMileage}
              placeholder={t('mileage_placeholder') ?? 'km'}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>
        </>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('description')}</Text>
        <TextInput
          style={[styles.textArea, isRTL && styles.textRTL]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('description_placeholder') ?? ''}
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Buttons */}
      <View style={[styles.buttonRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, styles.saveButtonExpense, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>{saving ? '...' : t('save')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: '#dc2626',
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipContainerRTL: {
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  chipSelectedExpense: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#dc2626',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 90,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonExpense: {
    backgroundColor: '#dc2626',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  textRTL: {
    textAlign: 'right',
  },
});
