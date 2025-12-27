/**
 * Syncfusion Persian Locale Configuration
 * 
 * This file contains Persian translations for Syncfusion components.
 * The locale is automatically registered when this module is imported.
 */

import { L10n } from '@syncfusion/ej2-base';

/**
 * Persian locale strings for Syncfusion Grid
 */
export const persianLocale = {
  'True': 'بله',
  'False': 'خیر',
  'EmptyRecord': 'رکوردی یافت نشد',
  'Search': 'جستجو',
  'MatchCase': 'تطابق حروف',
  'SelectAll': 'انتخاب همه',
  'Blanks': 'خالی',
  'FilterButton': 'فیلتر',
  'ClearButton': 'پاک کردن',
  'StartsWith': 'شروع با',
  'EndsWith': 'پایان با',
  'Contains': 'شامل',
  'Equal': 'برابر',
  'NotEqual': 'نابرابر',
  'LessThan': 'کمتر از',
  'LessThanOrEqual': 'کمتر یا مساوی',
  'GreaterThan': 'بیشتر از',
  'GreaterThanOrEqual': 'بیشتر یا مساوی',
  'ChooseDate': 'انتخاب تاریخ',
  'EnterValue': 'مقدار را وارد کنید',
  'Copy': 'کپی',
  'Group': 'گروه‌بندی بر اساس این ستون',
  'Ungroup': 'حذف گروه‌بندی',
  'autoFitAll': 'تنظیم خودکار همه ستون‌ها',
  'autoFit': 'تنظیم خودکار این ستون',
  'Export': 'صادر کردن',
  'FirstPage': 'صفحه اول',
  'LastPage': 'صفحه آخر',
  'PreviousPage': 'صفحه قبل',
  'NextPage': 'صفحه بعد',
  'SortAscending': 'مرتب‌سازی صعودی',
  'SortDescending': 'مرتب‌سازی نزولی',
  'EditRecord': 'ویرایش رکورد',
  'DeleteRecord': 'حذف رکورد',
  'Update': 'بروزرسانی',
  'Cancel': 'انصراف',
  'Save': 'ذخیره',
  'Add': 'افزودن',
  'Delete': 'حذف',
  'Print': 'چاپ',
  'Pdfexport': 'صادر PDF',
  'Excelexport': 'صادر Excel',
  'Csvexport': 'صادر CSV',
  'Item': 'آیتم',
  'Items': 'آیتم‌ها',
  'FilterMenu': 'فیلتر',
  'SelectValue': 'انتخاب مقدار',
  'Freeze': 'فریز',
  'Unfreeze': 'آنفریز',
  'FreezeDirection': 'جهت فریز',
  'FreezeColumn': 'فریز ستون',
  'UnfreezeColumn': 'آنفریز ستون',
  'NoResult': 'نتیجه‌ای یافت نشد',
};

// Register Persian locale with Syncfusion L10n
L10n.load({
  'fa': {
    'grid': persianLocale,
    'pager': persianLocale,
  },
});

/**
 * Initialize Persian locale for Syncfusion
 * Call this function to ensure locale is loaded
 */
export function initSyncfusionPersianLocale(): void {
  // Locale is already loaded on module import
  // This function exists for explicit initialization if needed
}
