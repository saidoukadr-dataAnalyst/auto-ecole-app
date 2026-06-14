import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type Lang = 'fr' | 'ar';

type TranslationKeys =
  | 'app_name' | 'dashboard' | 'students' | 'vehicles' | 'history' | 'settings'
  | 'income' | 'expense' | 'net_profit' | 'currency'
  | 'today' | 'week' | 'month' | 'year'
  | 'add_new' | 'search' | 'no_students' | 'no_vehicles' | 'no_transactions'
  | 'save' | 'cancel' | 'delete'
  | 'name' | 'phone' | 'package_price' | 'remaining' | 'paid' | 'debt'
  | 'registration' | 'mileage' | 'next_visit' | 'oil_change'
  | 'amount' | 'category' | 'description'
  | 'new_expense' | 'new_income' | 'choose_action'
  | 'export_pdf' | 'export_csv' | 'backup_db'
  | 'enter_pin' | 'create_pin' | 'confirm_pin' | 'forgot_pin'
  | 'success' | 'error'
  | 'pin_saved' | 'pin_mismatch' | 'pin_wrong'
  | 'enrolled' | 'recent_activity' | 'view_all' | 'accounting'
  | 'local_backup' | 'generate_pdf' | 'pdf_desc' | 'csv_desc' | 'backup_desc'
  | 'vehicle_concerned' | 'current_mileage' | 'student_concerned'
  | 'optional' | 'required'
  | 'add_student' | 'add_vehicle'
  | 'alerts' | 'km_remaining'
  | 'expense_saved' | 'income_saved' | 'student_added' | 'vehicle_added'
  | 'fill_required' | 'invalid_amount' | 'select_category'
  | 'recovery_title' | 'recovery_instruction' | 'recovery_key'
  | 'validate_key' | 'valid_key' | 'invalid_key';

type Translations = Record<Lang, Record<TranslationKeys, string>>;

export const translations: Translations = {
  fr: {
    app_name: 'Mon Auto-École',
    dashboard: 'Tableau de Bord',
    students: 'Élèves',
    vehicles: 'Véhicules',
    history: 'Historique',
    settings: 'Paramètres',
    income: 'Encaissé',
    expense: 'Dépensé',
    net_profit: 'Bénéfice Net',
    currency: 'DH',
    today: "Aujourd'hui",
    week: '7 Jours',
    month: 'Ce Mois',
    year: 'Cette Année',
    add_new: '+ Nouveau',
    search: 'Rechercher...',
    no_students: 'Aucun élève trouvé.',
    no_vehicles: 'Aucun véhicule trouvé.',
    no_transactions: 'Aucune transaction.',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    name: 'Nom',
    phone: 'Téléphone',
    package_price: 'Prix du Forfait',
    remaining: 'Reste à payer',
    paid: 'Soldé',
    debt: 'Dette',
    registration: 'Immatriculation',
    mileage: 'Kilométrage',
    next_visit: 'Visite Technique',
    oil_change: 'Vidange',
    amount: 'Montant',
    category: 'Catégorie',
    description: 'Description',
    new_expense: 'Nouvelle Dépense',
    new_income: 'Nouvel Encaissement',
    choose_action: 'Que souhaitez-vous faire ?',
    export_pdf: 'Exporter en PDF',
    export_csv: 'Exporter en CSV',
    backup_db: 'Sauvegarder la Base',
    enter_pin: 'Entrez votre Code PIN',
    create_pin: 'Créez votre Code PIN',
    confirm_pin: 'Confirmez votre Code PIN',
    forgot_pin: 'Mot de passe oublié ?',
    success: 'Succès',
    error: 'Erreur',
    pin_saved: 'Code PIN enregistré.',
    pin_mismatch: 'Les codes ne correspondent pas.',
    pin_wrong: 'Code incorrect.',
    enrolled: 'Inscrit le',
    recent_activity: 'Activité Récente',
    view_all: 'Voir tout',
    accounting: 'Comptabilité',
    local_backup: 'Sauvegarde Locale',
    generate_pdf: 'Générer le Bilan PDF',
    pdf_desc: 'Crée un rapport financier',
    csv_desc: 'Format adapté pour le comptable',
    backup_desc: 'Protégez vos données',
    vehicle_concerned: 'Véhicule concerné',
    current_mileage: 'Kilométrage actuel',
    student_concerned: 'Élève concerné',
    optional: 'Optionnel',
    required: 'Obligatoire',
    add_student: 'Ajouter un Élève',
    add_vehicle: 'Ajouter un Véhicule',
    alerts: 'Alertes',
    km_remaining: 'km restants',
    expense_saved: 'Dépense enregistrée.',
    income_saved: 'Encaissement enregistré.',
    student_added: 'Élève ajouté.',
    vehicle_added: 'Véhicule ajouté.',
    fill_required: 'Veuillez remplir tous les champs.',
    invalid_amount: 'Montant invalide.',
    select_category: 'Sélectionnez une catégorie.',
    recovery_title: 'Oubli du Code PIN',
    recovery_instruction: 'Communiquez ce code à votre administrateur.',
    recovery_key: 'Clé de Restauration',
    validate_key: 'Valider la clé',
    valid_key: 'Clé valide ! Créez un nouveau PIN.',
    invalid_key: 'Clé de restauration incorrecte.',
  },
  ar: {
    app_name: 'مدرستي',
    dashboard: 'لوحة القيادة',
    students: 'التلاميذ',
    vehicles: 'المركبات',
    history: 'السجل',
    settings: 'الإعدادات',
    income: 'المداخيل',
    expense: 'المصاريف',
    net_profit: 'الربح الصافي',
    currency: 'درهم',
    today: 'اليوم',
    week: '7 أيام',
    month: 'هذا الشهر',
    year: 'هذه السنة',
    add_new: '+ جديد',
    search: '...بحث',
    no_students: 'لا يوجد تلاميذ.',
    no_vehicles: 'لا توجد مركبات.',
    no_transactions: 'لا توجد معاملات.',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    name: 'الاسم',
    phone: 'الهاتف',
    package_price: 'ثمن العقد',
    remaining: 'المتبقي',
    paid: 'مسدد',
    debt: 'دين',
    registration: 'رقم اللوحة',
    mileage: 'عدد الكيلومترات',
    next_visit: 'المراقبة التقنية',
    oil_change: 'تغيير الزيت',
    amount: 'المبلغ',
    category: 'الفئة',
    description: 'الوصف',
    new_expense: 'مصروف جديد',
    new_income: 'مدخول جديد',
    choose_action: 'ماذا تريد أن تفعل؟',
    export_pdf: 'تصدير PDF',
    export_csv: 'تصدير CSV',
    backup_db: 'نسخ احتياطي',
    enter_pin: 'أدخل رمز PIN',
    create_pin: 'أنشئ رمز PIN',
    confirm_pin: 'أكد رمز PIN',
    forgot_pin: 'نسيت كلمة المرور؟',
    success: 'نجاح',
    error: 'خطأ',
    pin_saved: 'تم حفظ رمز PIN.',
    pin_mismatch: 'الرموز غير متطابقة.',
    pin_wrong: 'رمز خاطئ.',
    enrolled: 'مسجل في',
    recent_activity: 'النشاط الأخير',
    view_all: 'عرض الكل',
    accounting: 'المحاسبة',
    local_backup: 'نسخ احتياطي محلي',
    generate_pdf: 'إنشاء تقرير PDF',
    pdf_desc: 'إنشاء تقرير مالي',
    csv_desc: 'صيغة مناسبة للمحاسب',
    backup_desc: 'حماية بياناتك',
    vehicle_concerned: 'المركبة المعنية',
    current_mileage: 'عدد الكيلومترات الحالي',
    student_concerned: 'التلميذ المعني',
    optional: 'اختياري',
    required: 'إجباري',
    add_student: 'إضافة تلميذ',
    add_vehicle: 'إضافة مركبة',
    alerts: 'التنبيهات',
    km_remaining: 'كلم متبقية',
    expense_saved: 'تم حفظ المصروف.',
    income_saved: 'تم حفظ المدخول.',
    student_added: 'تمت إضافة التلميذ.',
    vehicle_added: 'تمت إضافة المركبة.',
    fill_required: 'يرجى ملء جميع الحقول.',
    invalid_amount: 'مبلغ غير صالح.',
    select_category: 'اختر فئة.',
    recovery_title: 'نسيان رمز PIN',
    recovery_instruction: 'أرسل هذا الرمز للمسؤول.',
    recovery_key: 'مفتاح الاستعادة',
    validate_key: 'تأكيد المفتاح',
    valid_key: 'مفتاح صالح! أنشئ PIN جديد.',
    invalid_key: 'مفتاح الاستعادة غير صحيح.',
  },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKeys) => string;
  isRTL: boolean;
}

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key: TranslationKeys) => key,
  isRTL: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('fr');

  const t = useCallback(
    (key: TranslationKeys): string => {
      return translations[lang][key] || key;
    },
    [lang]
  );

  const isRTL = lang === 'ar';

  const value = useMemo(
    () => ({ lang, setLang, t, isRTL }),
    [lang, t, isRTL]
  );

  return React.createElement(LanguageContext.Provider, { value }, children);
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
