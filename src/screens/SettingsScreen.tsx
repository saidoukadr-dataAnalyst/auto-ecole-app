import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ExportService } from '../services/ExportService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

type ActionKey = 'pdf' | 'csv' | 'backup';

export default function SettingsScreen() {
  const { t, isRTL } = useLanguage();
  const [loadingAction, setLoadingAction] = useState<ActionKey | null>(null);

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
      }
    } catch {
      showToast(t('error'));
    } finally {
      setLoadingAction(null);
    }
  };

  const sections: {
    title: string;
    items: { key: ActionKey; icon: string; label: string; description: string; color: string }[];
  }[] = [
    {
      title: t('accounting'),
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
      ],
    },
    {
      title: t('local_backup'),
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
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('settings')}</Text>
      </View>

      <View style={styles.content}>
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
                    <View style={[styles.actionIcon, { backgroundColor: item.color + '18' }]}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
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
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    borderBottomColor: '#f1f5f9',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionContentRTL: {
    marginLeft: 0,
    marginRight: 14,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  textRTL: {
    textAlign: 'right',
  },
});
