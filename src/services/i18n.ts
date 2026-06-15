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
  | 'validate_key' | 'valid_key' | 'invalid_key'
  | 'amount_required' | 'category_required' | 'vehicle_required'
  | 'mileage_required' | 'mileage_placeholder' | 'description_placeholder'
  | 'student' | 'alert_tech_visit' | 'alert_oil_change' | 'no_recent_transactions'
  | 'see_all' | 'export_pdf_success' | 'export_csv_success' | 'backup_success'
  | 'export_pdf_desc' | 'export_csv_desc' | 'backup_database' | 'backup_database_desc'
  | 'period_today' | 'period_week' | 'period_month' | 'period_year'
  | 'menu_students' | 'menu_vehicles' | 'menu_history' | 'menu_settings'
  | 'kpi_income' | 'kpi_expense' | 'kpi_net_profit'
  | 'activation_title' | 'activation_subtitle' | 'activation_device_label'
  | 'activation_copy' | 'activation_key_label' | 'activation_unlock'
  | 'activation_device_error' | 'activation_key_empty' | 'activation_success'
  | 'activation_invalid_key' | 'activation_copied'
  | 'edit' | 'confirm_delete' | 'confirm_delete_msg' | 'advance' | 'remaining_amount'
  | 'oil_change_date' | 'select_date' | 'no_data' | 'overdue' | 'technical_visit'
  | 'vehicle_updated' | 'vehicle_deleted' | 'student_updated' | 'student_deleted'
  | 'edit_vehicle' | 'edit_student' | 'yes' | 'no'
  | 'vehicle' | 'transactions' | 'pin_storage_error' | 'recovery_success' | 'recovery_invalid'
  | 'staff' | 'menu_staff' | 'add_staff' | 'edit_staff' | 'role' | 'salary' | 'base_salary' | 'no_staff' | 'staff_required' | 'staff_saved' | 'staff_deleted' | 'phone_optional'
  | 'kpi_net' | 'no_activity' | 'security' | 'change_pin' | 'change_pin_desc'
  | 'fuel_liters' | 'fuel_liters_required' | 'consumption'
  | 'income_label' | 'expense_label' | 'profit_label';

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
    amount_required: 'Montant obligatoire.',
    category_required: 'Catégorie obligatoire.',
    vehicle_required: 'Véhicule obligatoire.',
    mileage_required: 'Kilométrage obligatoire.',
    mileage_placeholder: 'km',
    description_placeholder: 'Détails...',
    student: 'Élève',
    alert_tech_visit: 'Visite',
    alert_oil_change: 'Vidange',
    no_recent_transactions: 'Rien à signaler.',
    see_all: 'Tout voir',
    export_pdf_success: 'PDF généré !',
    export_csv_success: 'CSV exporté !',
    backup_success: 'Sauvegarde réussie !',
    export_pdf_desc: 'Bilan comptable du mois',
    export_csv_desc: 'Pour votre expert-comptable',
    backup_database: 'Sauvegarder les données',
    backup_database_desc: 'Créer une copie de secours',
    period_today: 'Aujourd\'hui',
    period_week: 'Cette Semaine',
    period_month: 'Ce Mois',
    period_year: 'Cette Année',
    menu_students: 'Élèves',
    menu_vehicles: 'Véhicules',
    menu_history: 'Historique',
    menu_settings: 'Paramètres',
    kpi_income: 'Encaissé',
    kpi_expense: 'Dépensé',
    kpi_net_profit: 'Bénéfice Net',
    activation_title: 'Activation Requise',
    activation_subtitle: 'Veuillez entrer votre clé d\'activation.',
    activation_device_label: 'ID de l\'appareil',
    activation_copy: 'Copier',
    activation_key_label: 'Clé d\'activation',
    activation_unlock: 'Déverrouiller',
    activation_device_error: 'Erreur lors de la récupération de l\'ID de l\'appareil.',
    activation_key_empty: 'Veuillez entrer une clé d\'activation.',
    activation_success: 'Activation réussie !',
    activation_invalid_key: 'Clé invalide.',
    activation_copied: 'ID de l\'appareil copié dans le presse-papiers.',
    edit: 'Modifier',
    confirm_delete: 'Confirmer la suppression',
    confirm_delete_msg: 'Voulez-vous vraiment supprimer cet élément ?',
    advance: 'Avance',
    remaining_amount: 'Reste à payer',
    oil_change_date: 'Date dernière vidange',
    select_date: 'Sélectionner une date',
    no_data: 'Aucune donnée.',
    overdue: 'En retard',
    technical_visit: 'Visite Technique',
    vehicle_updated: 'Véhicule modifié.',
    vehicle_deleted: 'Véhicule supprimé.',
    student_updated: 'Élève modifié.',
    student_deleted: 'Élève supprimé.',
    edit_vehicle: 'Modifier le Véhicule',
    edit_student: 'Modifier l\'Élève',
    yes: 'Oui',
    no: 'Non',
    vehicle: 'Véhicule',
    transactions: 'Transactions',
    pin_storage_error: 'Erreur d\'accès au stockage.',
    recovery_success: 'Restauration réussie !',
    recovery_invalid: 'Clé de restauration invalide.',
    kpi_net: 'Bénéfice',
    no_activity: 'Aucune transaction aujourd\'hui.',
    security: 'Sécurité',
    change_pin: 'Changer le code PIN',
    change_pin_desc: 'Modifier votre code PIN d\'accès',
    staff: 'Personnel',
    menu_staff: 'Personnel',
    add_staff: 'Ajouter Personnel',
    edit_staff: 'Modifier Personnel',
    role: 'Rôle (ex: Moniteur, Secrétaire)',
    salary: 'Salaire',
    base_salary: 'Salaire de base',
    no_staff: 'Aucun personnel enregistré',
    staff_required: 'Veuillez sélectionner un membre du personnel',
    staff_saved: 'Membre du personnel enregistré avec succès',
    staff_deleted: 'Membre du personnel supprimé',
    phone_optional: 'Téléphone (Optionnel)',
    fuel_liters: 'Quantité en Litres (L)',
    fuel_liters_required: 'La quantité en litres est obligatoire',
    consumption: 'Consommation',
    income_label: 'Entrées',
    expense_label: 'Sorties',
    profit_label: 'Bénéfice'
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
    amount_required: 'المبلغ إجباري.',
    category_required: 'الفئة إجبارية.',
    vehicle_required: 'المركبة إجبارية.',
    mileage_required: 'الكيلومتر إجباري.',
    mileage_placeholder: 'كلم',
    description_placeholder: 'تفاصيل...',
    student: 'التلميذ',
    alert_tech_visit: 'المراقبة',
    alert_oil_change: 'تغيير الزيت',
    no_recent_transactions: 'لا يوجد شيء لعرضه.',
    see_all: 'عرض الكل',
    export_pdf_success: 'تم إنشاء PDF!',
    export_csv_success: 'تم تصدير CSV!',
    backup_success: 'تم النسخ الاحتياطي!',
    export_pdf_desc: 'التقرير المالي للشهر',
    export_csv_desc: 'للمحاسب الخاص بك',
    backup_database: 'النسخ الاحتياطي للبيانات',
    backup_database_desc: 'إنشاء نسخة احتياطية',
    period_today: 'اليوم',
    period_week: 'هذا الأسبوع',
    period_month: 'هذا الشهر',
    period_year: 'هذه السنة',
    menu_students: 'التلاميذ',
    menu_vehicles: 'المركبات',
    menu_history: 'السجل',
    menu_settings: 'الإعدادات',
    kpi_income: 'المداخيل',
    kpi_expense: 'المصاريف',
    kpi_net_profit: 'الربح الصافي',
    activation_title: 'التفعيل مطلوب',
    activation_subtitle: 'الرجاء إدخال مفتاح التفعيل الخاص بك.',
    activation_device_label: 'معرف الجهاز',
    activation_copy: 'نسخ',
    activation_key_label: 'مفتاح التفعيل',
    activation_unlock: 'فتح',
    activation_device_error: 'حدث خطأ أثناء استرداد معرف الجهاز.',
    activation_key_empty: 'الرجاء إدخال مفتاح التفعيل.',
    activation_success: 'تم التفعيل بنجاح!',
    activation_invalid_key: 'مفتاح غير صالح.',
    activation_copied: 'تم نسخ معرف الجهاز إلى الحافظة.',
    edit: 'تعديل',
    confirm_delete: 'تأكيد الحذف',
    confirm_delete_msg: 'هل تريد حذف هذا العنصر حقاً؟',
    advance: 'السلفة',
    remaining_amount: 'المبلغ المتبقي',
    oil_change_date: 'تاريخ آخر تغيير زيت',
    select_date: 'اختر تاريخاً',
    no_data: 'لا توجد بيانات.',
    overdue: 'متأخر',
    technical_visit: 'المراقبة التقنية',
    vehicle_updated: 'تم تعديل المركبة.',
    vehicle_deleted: 'تم حذف المركبة.',
    student_updated: 'تم تعديل التلميذ.',
    student_deleted: 'تم حذف التلميذ.',
    edit_vehicle: 'تعديل المركبة',
    edit_student: 'تعديل التلميذ',
    yes: 'نعم',
    no: 'لا',
    vehicle: 'المركبة',
    transactions: 'المعاملات',
    pin_storage_error: 'خطأ في الوصول إلى التخزين.',
    recovery_success: 'تم الاسترداد بنجاح!',
    recovery_invalid: 'مفتاح الاسترداد غير صالح.',
    staff: 'الموظفين',
    menu_staff: 'الموظفين',
    add_staff: 'إضافة موظف',
    edit_staff: 'تعديل موظف',
    role: 'المنصب (مثال: مدرب، سكرتيرة)',
    salary: 'الراتب',
    base_salary: 'الراتب الأساسي',
    no_staff: 'لا يوجد موظفين',
    staff_required: 'يرجى اختيار موظف',
    staff_saved: 'تم حفظ الموظف بنجاح',
    staff_deleted: 'تم حذف الموظف',
    phone_optional: 'رقم الهاتف (اختياري)',
    kpi_net: 'الربح',
    no_activity: 'لا توجد معاملات اليوم.',
    security: 'حماية',
    change_pin: 'تغيير الرمز السري',
    change_pin_desc: 'تعديل الرمز السري الخاص بك',
    fuel_liters: 'الكمية باللتر (L)',
    fuel_liters_required: 'الكمية باللتر إلزامية',
    consumption: 'الاستهلاك',
    income_label: 'مداخيل',
    expense_label: 'مصاريف',
    profit_label: 'الأرباح'
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
