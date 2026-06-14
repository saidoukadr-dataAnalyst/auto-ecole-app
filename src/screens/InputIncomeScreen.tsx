import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

interface Category {
  id: number;
  name: string;
}

interface Student {
  id: number;
  name: string;
}

interface Props {
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export default function InputIncomeScreen({ onSaveSuccess, onCancel }: Props) {
  const { t, isRTL } = useLanguage();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, studs] = await Promise.all([
          DatabaseService.getCategories('INCOME'),
          DatabaseService.getStudents(),
        ]);
        setCategories(cats);
        setStudents(studs);
      } catch {
        // silent
      }
    };
    load();
  }, []);

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
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await DatabaseService.addIncome(
        parseFloat(amount),
        selectedCategoryId!,
        selectedStudentId,
        description.trim()
      );
      showToast(t('income_saved'));
      onSaveSuccess();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentId((prev) => (prev === id ? null : id));
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
            placeholderTextColor="#86efac"
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
                style={[styles.chip, selected && styles.chipSelectedIncome]}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedIncome]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Students */}
      <View style={styles.section}>
        <Text style={[styles.label, isRTL && styles.textRTL]}>
          {t('student')} <Text style={styles.optional}>({t('optional')})</Text>
        </Text>
        <View style={[styles.chipContainer, isRTL && styles.chipContainerRTL]}>
          {students.map((s) => {
            const selected = selectedStudentId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, selected && styles.chipSelectedIncome]}
                onPress={() => toggleStudent(s.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedIncome]}>
                  🎓 {s.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {students.length === 0 && (
            <Text style={styles.emptyChipText}>{t('no_students')}</Text>
          )}
        </View>
      </View>

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
          style={[styles.saveButton, styles.saveButtonIncome, saving && styles.disabledButton]}
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
  optional: {
    fontWeight: '400',
    color: '#94a3b8',
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: '#16a34a',
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
  chipSelectedIncome: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  chipTextSelectedIncome: {
    color: '#16a34a',
    fontWeight: '600',
  },
  emptyChipText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
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
  saveButtonIncome: {
    backgroundColor: '#16a34a',
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
