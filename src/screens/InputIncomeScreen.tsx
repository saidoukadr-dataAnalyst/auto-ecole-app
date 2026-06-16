import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

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

export function InputIncomeScreen({ onSaveSuccess, onCancel }: Props) {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
        if (cats && cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
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

  const styles = getStyles(colors, isDark);

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
            placeholderTextColor={isDark ? "rgba(16, 185, 129, 0.4)" : "#86efac"}
            keyboardType="numeric"
          />
          <Text style={styles.currency}>DH</Text>
        </View>
      </View>

      {/* Students */}
      <View style={styles.section}>
        <Text style={[styles.label, isRTL && styles.textRTL]}>
          {t('student')} <Text style={styles.optional}>({t('optional')})</Text>
        </Text>
        <TextInput
          style={[styles.searchInput, isRTL && styles.textRTL]}
          placeholder={t('search') ?? 'Rechercher un élève...'}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={[styles.chipContainer, isRTL && styles.chipContainerRTL]}>
          {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => {
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
          placeholderTextColor={colors.textSecondary}
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

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    color: colors.textSecondary,
    fontSize: 13,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#bbf7d0',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: colors.success,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    color: colors.text,
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
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelectedIncome: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
    borderColor: colors.success,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelectedIncome: {
    color: colors.success,
    fontWeight: '600',
  },
  emptyChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonIncome: {
    backgroundColor: colors.success,
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
