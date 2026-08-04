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
  is_vehicle_related?: number;
  is_staff_related?: number;
}

interface Vehicle {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  role: string;
}

interface Props {
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export function InputExpenseScreen({ onSaveSuccess, onCancel }: Props) {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const isVehicleRelated = selectedCategory?.is_vehicle_related === 1;
  const isStaffRelated = selectedCategory?.is_staff_related === 1;
  const isFuel = selectedCategory?.name === 'Carburant';

  useEffect(() => {
    const load = async () => {
      try {
        let cats = await DatabaseService.getCategories('EXPENSE');
        if (!cats || cats.length === 0) {
          cats = [
            { id: 1, name: 'Carburant', is_vehicle_related: 1, is_staff_related: 0 },
            { id: 2, name: 'Entretien & Réparation', is_vehicle_related: 1, is_staff_related: 0 },
            { id: 3, name: 'Vidange', is_vehicle_related: 1, is_staff_related: 0 },
            { id: 4, name: 'Assurance', is_vehicle_related: 1, is_staff_related: 0 },
            { id: 5, name: 'Loyer Local', is_vehicle_related: 0, is_staff_related: 0 },
            { id: 6, name: 'Salaires', is_vehicle_related: 0, is_staff_related: 1 },
            { id: 7, name: 'Électricité & Internet', is_vehicle_related: 0, is_staff_related: 0 },
            { id: 8, name: 'Autre', is_vehicle_related: 0, is_staff_related: 0 },
          ];
        }
        setCategories(cats);
        if (cats.length > 0 && selectedCategoryId === null) {
          setSelectedCategoryId(cats[0].id);
        }
        const vehs = await DatabaseService.getVehicles();
        setVehicles(vehs);
        const stf = await DatabaseService.getStaff();
        setStaffList(stf);
      } catch {
        // Fallback
        const fallbackCats = [
          { id: 1, name: 'Carburant', is_vehicle_related: 1, is_staff_related: 0 },
          { id: 2, name: 'Entretien & Réparation', is_vehicle_related: 1, is_staff_related: 0 },
          { id: 3, name: 'Vidange', is_vehicle_related: 1, is_staff_related: 0 },
          { id: 4, name: 'Assurance', is_vehicle_related: 1, is_staff_related: 0 },
          { id: 5, name: 'Loyer Local', is_vehicle_related: 0, is_staff_related: 0 },
          { id: 6, name: 'Salaires', is_vehicle_related: 0, is_staff_related: 1 },
          { id: 7, name: 'Électricité & Internet', is_vehicle_related: 0, is_staff_related: 0 },
          { id: 8, name: 'Autre', is_vehicle_related: 0, is_staff_related: 0 },
        ];
        setCategories(fallbackCats);
        setSelectedCategoryId(1);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isVehicleRelated) {
      setSelectedVehicleId(null);
      setMileage('');
      setFuelLiters('');
    } else if (vehicles.length === 0) {
      showToast('Veuillez d\'abord ajouter vos véhicules dans le menu');
    }
    
    if (!isFuel) {
      setFuelLiters('');
    }
    
    if (!isStaffRelated) {
      setSelectedStaffId(null);
    } else if (staffList.length === 0) {
      showToast('Veuillez d\'abord ajouter votre personnel dans le menu');
    }
  }, [isVehicleRelated, isStaffRelated, isFuel, vehicles.length, staffList.length]);

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
      if (isFuel) {
        const parsedLiters = parseFloat(fuelLiters);
        if (!fuelLiters || isNaN(parsedLiters) || parsedLiters <= 0) {
          showToast(t('fuel_liters_required') || 'La quantité en litres est obligatoire');
          return false;
        }
      }
    }
    if (isStaffRelated) {
      if (!selectedStaffId) {
        showToast(t('staff_required') || 'Veuillez sélectionner un membre du personnel');
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
        description.trim(),
        isStaffRelated ? selectedStaffId : null,
        isFuel ? parseFloat(fuelLiters) : null
      );
      showToast(t('expense_saved'));
      onSaveSuccess();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const getTranslatedCategory = (name: string) => {
    switch (name) {
      case 'Carburant': return t('cat_fuel');
      case 'Entretien & Réparation': return t('cat_maintenance');
      case 'Vidange': return t('cat_oil');
      case 'Assurance': return t('cat_insurance');
      case 'Loyer Local': return t('cat_rent');
      case 'Salaires': return t('cat_salaries');
      case 'Électricité & Internet': return t('cat_electricity');
      case 'Autre': return t('cat_other');
      default: return name;
    }
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
            placeholderTextColor={isDark ? "rgba(220, 38, 38, 0.4)" : "#fca5a5"}
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
                  {getTranslatedCategory(cat.name)}
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
            {vehicles.length === 0 ? (
              <Text style={styles.emptyWarningText}>⚠️ {t('no_vehicles')}</Text>
            ) : (
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
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('mileage')}</Text>
            <TextInput
              style={[styles.textInput, isRTL && styles.textRTL]}
              value={mileage}
              onChangeText={setMileage}
              placeholder={t('mileage_placeholder') ?? 'km'}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {isFuel && (
            <View style={styles.section}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t('fuel_liters') || 'Quantité en Litres (L)'}</Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.textRTL]}
                value={fuelLiters}
                onChangeText={setFuelLiters}
                placeholder="Ex: 45.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          )}
        </>
      )}

      {/* Staff selection */}
      {isStaffRelated && (
        <View style={styles.section}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('staff') || 'Personnel'}</Text>
          {staffList.length === 0 ? (
            <Text style={styles.emptyWarningText}>⚠️ {t('no_staff') || 'Aucun personnel enregistré'}</Text>
          ) : (
            <View style={[styles.chipContainer, isRTL && styles.chipContainerRTL]}>
              {staffList.map((s) => {
                const selected = selectedStaffId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, selected && styles.chipSelectedExpense]}
                    onPress={() => setSelectedStaffId(s.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      👤 {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: colors.danger,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
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
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelectedExpense: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderColor: colors.danger,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.danger,
    fontWeight: '600',
  },
  emptyWarningText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
  saveButtonExpense: {
    backgroundColor: colors.danger,
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
