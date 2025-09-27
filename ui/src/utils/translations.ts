export const translations = {
  fa: {
    welcome: 'خوش آمدید',
    monitoring: 'مانیتورینگ',
    warehouse: 'انبار',
    dashboard: 'داشبورد',
    settings: 'تنظیمات',
    users: 'کاربران',
    reports: 'گزارشات',
    notifications: 'اعلان‌ها',
    profile: 'پروفایل',
    logout: 'خروج',
    login: 'ورود',
    save: 'ذخیره',
    cancel: 'انصراف',
    delete: 'حذف',
    edit: 'ویرایش',
    add: 'افزودن',
    search: 'جستجو',
    languageSwitch: 'English',
    systemDescription: 'این سیستم برای مانیتورینگ و مدیریت انبار طراحی شده است.',
    notificationDescription: 'مدیریت اعلان‌ها و هشدارها',
    userDescription: 'مدیریت کاربران سیستم',
    reportDescription: 'تولید گزارشات مختلف'
  },
  en: {
    welcome: 'Welcome',
    monitoring: 'Monitoring',
    warehouse: 'Warehouse',
    dashboard: 'Dashboard',
    settings: 'Settings',
    users: 'Users',
    reports: 'Reports',
    notifications: 'Notifications',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    languageSwitch: 'فارسی',
    systemDescription: 'This system is designed for warehouse monitoring and management.',
    notificationDescription: 'Manage notifications and alerts',
    userDescription: 'System user management',
    reportDescription: 'Generate various reports'
  }
};

export type Language = 'fa' | 'en';
export type TranslationKey = keyof typeof translations.fa;