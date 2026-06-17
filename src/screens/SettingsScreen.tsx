import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../App';
import { DatabaseService } from '../services/DatabaseService';
import { ExportService } from '../services/ExportService';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

type ActionKey = 'pdf' | 'csv' | 'backup' | 'change_pin' | 'lock' | 'tva' | 'trash';

export function SettingsScreen() {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const { lockApp } = useContext(AuthContext);
  const [loadingAction, setLoadingAction] = useState<ActionKey | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // TVA calculator state
  const [showTvaModal, setShowTvaModal] = useState(false);
  const [tvaYear, setTvaYear] = useState<string>(new Date().getFullYear().toString());
  const [tvaStudentCount, setTvaStudentCount] = useState(0);
  const [tvaTotalDue, setTvaTotalDue] = useState(0);
  const [tvaStudentsList, setTvaStudentsList] = useState<any[]>([]);
  const [loadingTva, setLoadingTva] = useState(false);

  // Trash bin state
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashedStudents, setTrashedStudents] = useState<any[]>([]);
  const [trashedTransactions, setTrashedTransactions] = useState<any[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const loadTvaData = async (year: string) => {
    setLoadingTva(true);
    try {
      const data = await DatabaseService.getAnnualTVAReport(year);
      setTvaStudentCount(data.studentCount);
      setTvaTotalDue(data.totalTVA);
      setTvaStudentsList(data.students);
    } catch {
      showToast(t('error'));
    } finally {
      setLoadingTva(false);
    }
  };

  useEffect(() => {
    if (showTvaModal) {
      loadTvaData(tvaYear);
    }
  }, [showTvaModal, tvaYear]);

  const loadTrashItems = async () => {
    setLoadingTrash(true);
    try {
      const { students, transactions } = await DatabaseService.getTrashedItems();
      setTrashedStudents(students);
      setTrashedTransactions(transactions);
    } catch {
      showToast(t('error'));
    } finally {
      setLoadingTrash(false);
    }
  };

  const handleAction = async (action: ActionKey) => {
    if (loadingAction) return;
    setLoadingAction(action);
    try {
      switch (action) {
        case 'pdf':
          await ExportService.exportPDF();
          showToast(t('export_pdf_success'));
          break;
        case 'csv':
          await ExportService.exportCSV();
          showToast(t('export_csv_success'));
          break;
        case 'backup':
          await ExportService.backupDatabase();
          showToast(t('backup_success'));
          break;
        case 'change_pin':
          setShowPinModal(true);
          break;
        case 'lock':
          lockApp();
          break;
        case 'tva':
          setShowTvaModal(true);
          break;
        case 'trash':
          setShowTrashModal(true);
          loadTrashItems();
          break;
      }
    } catch {
      showToast(t('error'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportTvaPdf = async () => {
    try {
      await ExportService.exportTVAReportPDF(tvaYear, tvaStudentCount, tvaTotalDue, tvaStudentsList);
      showToast(t('export_pdf_success') || "PDF Exporté !");
    } catch {
      showToast(t('error'));
    }
  };

  // Trash Handlers
  const handleRestoreStudent = async (id: number) => {
    try {
      await DatabaseService.restoreStudent(id);
      showToast(t('restored_success') || "Élément restauré.");
      loadTrashItems();
    } catch {
      showToast(t('error'));
    }
  };

  const handleHardDeleteStudent = (student: any) => {
    Alert.alert(
      t('confirm_delete') || "Suppression définitive",
      `Voulez-vous supprimer définitivement l'élève ${student.name} ? Cette action est irréversible.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete') || "Supprimer",
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.hardDeleteStudent(student.id);
              showToast(t('student_deleted_forever') || "Élève supprimé définitivement");
              loadTrashItems();
            } catch {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const handleRestoreTransaction = async (id: number) => {
    try {
      await DatabaseService.restoreTransaction(id);
      showToast(t('restored_success') || "Transaction restaurée.");
      loadTrashItems();
    } catch {
      showToast(t('error'));
    }
  };

  const handleHardDeleteTransaction = (item: any) => {
    Alert.alert(
      t('confirm_delete') || "Suppression définitive",
      `Voulez-vous supprimer définitivement cette transaction de ${item.amount} DH ? Cette action est irréversible.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete') || "Supprimer",
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.hardDeleteTransaction(item.id);
              showToast(t('transaction_deleted_forever') || "Transaction supprimée définitivement");
              loadTrashItems();
            } catch {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const handleEmptyTrash = () => {
    Alert.alert(
      t('empty_trash') || "Vider la Corbeille",
      t('confirm_empty_trash') || "Voulez-vous vraiment vider définitivement la corbeille ? Cette action est irréversible.",
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete') || "Vider",
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.emptyTrash();
              showToast(t('emptied_success') || "Corbeille vidée avec succès.");
              loadTrashItems();
            } catch {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const sections: {
    title: string;
    items: { key: ActionKey; icon: string; label: string; description: string; color: string }[];
  }[] = [
    {
      title: t('security') || 'Sécurité',
      items: [
        {
          key: 'change_pin',
          icon: '🔒',
          label: t('change_pin') || 'Changer le mot de passe',
          description: t('change_pin_desc') || 'Modifier votre code PIN d\'accès',
          color: '#f59e0b',
        },
        {
          key: 'lock',
          icon: '🔐',
          label: 'Verrouiller l\'application',
          description: 'Verrouiller immédiatement l\'accès',
          color: colors.danger,
        },
      ],
    },
    {
      title: t('accounting') || 'Comptabilité',
      items: [
        {
          key: 'pdf',
          icon: '📄',
          label: t('export_pdf'),
          description: t('export_pdf_desc'),
          color: '#ef4444',
        },
        {
          key: 'csv',
          icon: '📊',
          label: t('export_csv'),
          description: t('export_csv_desc'),
          color: '#16a34a',
        },
        {
          key: 'tva',
          icon: '🏛️',
          label: t('tva_calculation') || 'Calcul de la TVA',
          description: t('tva_annual_report') || 'Bilan TVA Annuel',
          color: '#3b82f6',
        },
      ],
    },
    {
      title: t('local_backup') || 'Sauvegarde',
      items: [
        {
          key: 'backup',
          icon: '💾',
          label: t('backup_database'),
          description: t('backup_database_desc'),
          color: '#6366f1',
        },
      ],
    },
    {
      title: t('trash') || 'Administration',
      items: [
        {
          key: 'trash',
          icon: '🗑️',
          label: t('trash') || 'Corbeille',
          description: 'Gérer les éléments supprimés',
          color: '#6b7280',
        },
      ],
    },
  ];

  const handleChangePin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      showToast(t('fill_required'));
      return;
    }
    if (newPin !== confirmPin) {
      showToast('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    const isValid = await SecurityService.verifyUserPin(currentPin);
    if (!isValid) {
      showToast('Mot de passe actuel incorrect');
      return;
    }
    await SecurityService.saveUserPin(newPin);
    showToast('Mot de passe modifié avec succès');
    setShowPinModal(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const styles = getStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('settings')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{section.title}</Text>

            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const isLoading = loadingAction === item.key;
                const isLast = index === section.items.length - 1;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.actionButton,
                      isRTL && styles.actionButtonRTL,
                      !isLast && styles.actionButtonBorder,
                    ]}
                    onPress={() => handleAction(item.key)}
                    disabled={loadingAction !== null}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: item.color + (isDark ? '25' : '15') }]}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={item.color} />
                      ) : (
                        <Text style={styles.actionIconText}>{item.icon}</Text>
                      )}
                    </View>

                    <View style={[styles.actionContent, isRTL && styles.actionContentRTL]}>
                      <Text style={[styles.actionLabel, isRTL && styles.textRTL]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.actionDescription, isRTL && styles.textRTL]}>
                        {item.description}
                      </Text>
                    </View>

                    <Text style={styles.chevron}>{isRTL ? '‹' : '›'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* CHANGE PIN MODAL */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>Changer le mot de passe</Text>

            <Text style={styles.fieldLabel}>Mot de passe actuel</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={newPin}
              onChangeText={setNewPin}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Confirmer le nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleChangePin}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* TVA CALCULATOR MODAL */}
      <Modal
        visible={showTvaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTvaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={styles.modalTitle}>{t('tva_calculation') || 'Calcul de la TVA'}</Text>
              <TouchableOpacity onPress={() => setShowTvaModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('select_year_tva') || "Année concernée"}</Text>
              <View style={[styles.chipContainer, isRTL && styles.rowRTL]}>
                {['2024', '2025', '2026', '2027'].map(year => {
                  const selected = tvaYear === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.formChip, selected && styles.activeFormChip]}
                      onPress={() => setTvaYear(year)}
                    >
                      <Text style={[styles.chipText, selected && styles.activeFormChipText]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {loadingTva ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
              ) : (
                <View style={styles.tvaResultsContainer}>
                  <View style={styles.tvaKpiRow}>
                    <View style={styles.tvaKpiCard}>
                      <Text style={styles.tvaKpiLabel}>{t('enrolled_students_count') || "Élèves inscrits"}</Text>
                      <Text style={styles.tvaKpiValue}>{tvaStudentCount}</Text>
                    </View>
                    <View style={styles.tvaKpiCard}>
                      <Text style={styles.tvaKpiLabel}>{t('total_tva_due') || "Total TVA Dû"}</Text>
                      <Text style={[styles.tvaKpiValue, { color: colors.success }]}>{tvaTotalDue.toLocaleString()} DH</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.tvaExportBtn, isRTL && styles.rowRTL]}
                    onPress={handleExportTvaPdf}
                  >
                    <Ionicons name="document-text-outline" size={22} color="#fff" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                    <Text style={styles.tvaExportBtnText}>{t('generate_tva_pdf') || "Générer Rapport TVA (PDF)"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RECYCLE BIN MODAL */}
      <Modal
        visible={showTrashModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrashModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%' }]}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={styles.modalTitle}>{t('trash') || 'Corbeille'}</Text>
              <TouchableOpacity onPress={() => setShowTrashModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingTrash ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ margin: 40 }} />
            ) : (
              <View style={{ flex: 1 }}>
                {(trashedStudents.length > 0 || trashedTransactions.length > 0) ? (
                  <TouchableOpacity 
                    style={[styles.emptyTrashBtn, isRTL && styles.rowRTL]}
                    onPress={handleEmptyTrash}
                  >
                    <Ionicons name="trash-bin-outline" size={18} color="#fff" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                    <Text style={styles.emptyTrashBtnText}>{t('empty_trash') || 'Vider la Corbeille'}</Text>
                  </TouchableOpacity>
                ) : null}

                <ScrollView showsVerticalScrollIndicator={false}>
                  {trashedStudents.length > 0 && (
                    <View style={styles.trashSection}>
                      <Text style={[styles.trashSectionTitle, isRTL && styles.textRTL]}>🎓 {t('students') || 'Élèves'}</Text>
                      {trashedStudents.map(student => (
                        <View key={student.id} style={[styles.trashCard, isRTL && styles.rowRTL]}>
                          <View style={styles.trashCardContent}>
                            <Text style={[styles.trashCardName, isRTL && styles.textRTL]}>{student.name}</Text>
                            <Text style={[styles.trashCardDetail, isRTL && styles.textRTL]}>📞 {student.phone || '—'}</Text>
                          </View>
                          <View style={[styles.trashCardActions, isRTL && styles.rowRTL]}>
                            <TouchableOpacity 
                              style={[styles.trashIconBtn, styles.restoreBtn]} 
                              onPress={() => handleRestoreStudent(student.id)}
                            >
                              <Ionicons name="arrow-undo" size={16} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.trashIconBtn, styles.deleteForeverBtn]} 
                              onPress={() => handleHardDeleteStudent(student)}
                            >
                              <Ionicons name="trash" size={16} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {trashedTransactions.length > 0 && (
                    <View style={styles.trashSection}>
                      <Text style={[styles.trashSectionTitle, isRTL && styles.textRTL]}>💵 {t('transactions') || 'Transactions'}</Text>
                      {trashedTransactions.map(item => {
                        const isIncome = item.type === 'INCOME';
                        return (
                          <View key={item.id} style={[styles.trashCard, isRTL && styles.rowRTL]}>
                            <View style={styles.trashCardContent}>
                              <Text style={[styles.trashCardName, isRTL && styles.textRTL, { color: isIncome ? colors.success : colors.danger }]}>
                                {isIncome ? '+' : '-'}{item.amount.toFixed(2)} DH
                              </Text>
                              <Text style={[styles.trashCardDetail, isRTL && styles.textRTL]}>
                                {item.category_name} {item.description ? `(${item.description})` : ''}
                              </Text>
                            </View>
                            <View style={[styles.trashCardActions, isRTL && styles.rowRTL]}>
                              <TouchableOpacity 
                                style={[styles.trashIconBtn, styles.restoreBtn]} 
                                onPress={() => handleRestoreTransaction(item.id)}
                              >
                                <Ionicons name="arrow-undo" size={16} color={colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.trashIconBtn, styles.deleteForeverBtn]} 
                                onPress={() => handleHardDeleteTransaction(item)}
                              >
                                <Ionicons name="trash" size={16} color={colors.danger} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {trashedStudents.length === 0 && trashedTransactions.length === 0 && (
                    <View style={styles.emptyTrashContainer}>
                      <Text style={styles.emptyTrashIcon}>🗑️</Text>
                      <Text style={styles.emptyTrashText}>{t('trash_empty') || "La corbeille est vide."}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionButtonRTL: {
    flexDirection: 'row-reverse',
  },
  actionButtonBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 22,
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionContentRTL: {
    marginLeft: 0,
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  textRTL: {
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
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
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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

  // Modal Header Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },

  // TVA Calculator Styles
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  formChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFormChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeFormChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  tvaResultsContainer: {
    marginTop: 10,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tvaKpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tvaKpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tvaKpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  tvaKpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  tvaExportBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvaExportBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Recycle Bin (Corbeille) Styles
  emptyTrashBtn: {
    flexDirection: 'row',
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTrashBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  trashSection: {
    marginBottom: 20,
  },
  trashSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  trashCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashCardContent: {
    flex: 1,
  },
  trashCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  trashCardDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trashCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  trashIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  restoreBtn: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
  },
  deleteForeverBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
  },
  emptyTrashContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTrashIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTrashText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

