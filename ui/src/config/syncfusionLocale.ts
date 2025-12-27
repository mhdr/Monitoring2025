/**
 * Syncfusion Persian Locale Configuration
 * 
 * This file contains Persian translations for Syncfusion components.
 * The locale is automatically registered when this module is imported.
 * 
 * Uses L10n.load() from @syncfusion/ej2-base for localization.
 * Reference: https://ej2.syncfusion.com/react/documentation/grid/global-local
 */

import { L10n, setCulture, enableRtl } from '@syncfusion/ej2-base';

/**
 * Persian locale strings for Syncfusion Grid component
 * Following Syncfusion's official locale key format
 */
const persianGridLocale = {
  // Data Rendering
  'EmptyRecord': 'رکوردی برای نمایش وجود ندارد',
  'EmptyDataSourceError': 'منبع داده نباید در بارگذاری اولیه خالی باشد',
  
  // Columns
  'True': 'بله',
  'False': 'خیر',
  'ColumnHeader': 'سرستون',
  'TemplateCell': 'سلول قالب',
  'Clipboard': 'کلیپ‌بورد',
  'CheckBoxLabel': 'چک‌باکس',
  
  // Column Chooser
  'ColumnChooser': 'ستون‌ها',
  'ChooseColumns': 'انتخاب ستون',
  'ColumnChooserDialogARIA': 'انتخاب‌گر ستون',
  'SearchColumns': 'جستجوی ستون‌ها',
  
  // Editing
  'Add': 'افزودن',
  'Edit': 'ویرایش',
  'Cancel': 'انصراف',
  'Update': 'بروزرسانی',
  'Delete': 'حذف',
  'Save': 'ذخیره',
  'EditOperationAlert': 'رکوردی برای ویرایش انتخاب نشده است',
  'DeleteOperationAlert': 'رکوردی برای حذف انتخاب نشده است',
  'SaveButton': 'ذخیره',
  'OKButton': 'تایید',
  'CancelButton': 'انصراف',
  'EditFormTitle': 'جزئیات',
  'AddFormTitle': 'افزودن رکورد جدید',
  'BatchSaveConfirm': 'آیا مطمئن هستید که می‌خواهید تغییرات را ذخیره کنید؟',
  'BatchSaveLostChanges': 'تغییرات ذخیره نشده از دست خواهند رفت. آیا ادامه می‌دهید؟',
  'ConfirmDelete': 'آیا مطمئن هستید که می‌خواهید رکورد را حذف کنید؟',
  'CancelEdit': 'آیا مطمئن هستید که می‌خواهید تغییرات را لغو کنید؟',
  'DialogEditARIA': 'دیالوگ ویرایش',
  'CommandColumnARIA': 'ستون فرمان',
  'DialogEdit': 'دیالوگ ویرایش',
  
  // Grouping
  'GroupDropArea': 'سرستون را برای گروه‌بندی به اینجا بکشید',
  'UnGroup': 'برای لغو گروه‌بندی کلیک کنید',
  'GroupDisable': 'گروه‌بندی برای این ستون غیرفعال است',
  'Item': 'مورد',
  'Items': 'مورد',
  'UnGroupButton': 'برای لغو گروه‌بندی کلیک کنید',
  'GroupDescription': 'برای گروه‌بندی Ctrl+Space را فشار دهید',
  'GroupButton': 'دکمه گروه',
  'UnGroupAria': 'دکمه لغو گروه',
  'GroupSeperator': 'جداکننده ستون‌های گروه‌شده',
  'UnGroupIcon': 'لغو گروه‌بندی ستون',
  'GroupedSortIcon': 'مرتب‌سازی ستون گروه‌شده',
  'GroupedDrag': 'کشیدن ستون گروه‌شده',
  'GroupCaption': 'سلول عنوان گروه',
  'Expanded': 'باز شده',
  'Collapsed': 'بسته شده',
  
  // Filtering
  'InvalidFilterMessage': 'داده فیلتر نامعتبر است',
  'FilterbarTitle': 'سلول نوار فیلتر',
  'Matchs': 'نتیجه‌ای یافت نشد',
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
  'SelectAll': 'انتخاب همه',
  'Blanks': 'خالی‌ها',
  'FilterTrue': 'بله',
  'FilterFalse': 'خیر',
  'NoResult': 'نتیجه‌ای یافت نشد',
  'ClearFilter': 'پاک کردن فیلتر',
  'NumberFilter': 'فیلترهای عددی',
  'TextFilter': 'فیلترهای متنی',
  'DateFilter': 'فیلترهای تاریخ',
  'DateTimeFilter': 'فیلترهای تاریخ و زمان',
  'MatchCase': 'تطابق حروف',
  'Between': 'بین',
  'CustomFilter': 'فیلتر سفارشی',
  'CustomFilterPlaceHolder': 'مقدار را وارد کنید',
  'CustomFilterDatePlaceHolder': 'تاریخ را انتخاب کنید',
  'AND': 'و',
  'OR': 'یا',
  'ShowRowsWhere': 'نمایش ردیف‌هایی که:',
  'NotStartsWith': 'شروع نمی‌شود با',
  'Like': 'مانند',
  'NotEndsWith': 'پایان نمی‌یابد با',
  'NotContains': 'شامل نمی‌شود',
  'IsNull': 'خالی',
  'NotNull': 'غیرخالی',
  'IsEmpty': 'خالی',
  'IsNotEmpty': 'غیرخالی',
  'AddCurrentSelection': 'افزودن انتخاب فعلی به فیلتر',
  'FilterMenuDialogARIA': 'دیالوگ منوی فیلتر',
  'ExcelFilterDialogARIA': 'دیالوگ فیلتر اکسل',
  'CustomFilterDialogARIA': 'دیالوگ فیلتر سفارشی',
  'SortAtoZ': 'مرتب‌سازی از الف تا ی',
  'SortZtoA': 'مرتب‌سازی از ی تا الف',
  'SortByOldest': 'مرتب‌سازی بر اساس قدیمی‌ترین',
  'SortByNewest': 'مرتب‌سازی بر اساس جدیدترین',
  'SortSmallestToLargest': 'مرتب‌سازی از کوچک به بزرگ',
  'SortLargestToSmallest': 'مرتب‌سازی از بزرگ به کوچک',
  'FilterDescription': 'برای باز کردن منوی فیلتر Alt+Down را فشار دهید',
  
  // Excel Filter Specific (non-duplicate keys only)
  'OK': 'تایید',
  'Reset': 'بازنشانی',
  'Done': 'انجام شد',
  'CheckAll': 'انتخاب همه',
  'UncheckAll': 'لغو انتخاب همه',
  'FilterOkButton': 'تایید',
  'FilterCancelButton': 'انصراف',
  'FilterClearButton': 'پاک کردن',
  'ApplyButton': 'اعمال',
  'TextFilterMenu': 'فیلتر متنی',
  'DateFilterMenu': 'فیلتر تاریخ',
  'NumberFilterMenu': 'فیلتر عددی',
  'BooleanFilterMenu': 'فیلتر بولین',
  'SelectAllFilterCheckboxes': 'انتخاب همه فیلترها',
  'FilterCheckboxes': 'چک‌باکس‌های فیلتر',
  'FilterBy': 'فیلتر بر اساس',
  'Operator': 'عملگر',
  'Value': 'مقدار',
  'Column': 'ستون',
  'ShowItemsThat': 'نمایش موارد که',
  'Null': 'خالی',
  
  // Excel Filter Dialog Sections
  'AddCurrent': 'افزودن انتخاب فعلی',
  'SortingAndFiltering': 'مرتب‌سازی و فیلتر',
  'ClearAllFilters': 'پاک کردن همه فیلترها',
  'AdvancedFilter': 'فیلتر پیشرفته',
  'BooleanFilter': 'فیلتر بولین',
  'FilterByValue': 'فیلتر بر اساس مقدار',
  'FilterByColor': 'فیلتر بر اساس رنگ',
  'Loading': 'در حال بارگذاری...',
  
  // Searching
  'Clear': 'پاک کردن',
  
  // Sorting
  'Sort': 'مرتب‌سازی',
  'SortDescription': 'برای مرتب‌سازی Enter را فشار دهید',
  
  // Toolbar
  'Print': 'چاپ',
  'Pdfexport': 'صدور PDF',
  'Excelexport': 'صدور Excel',
  'Csvexport': 'صدور CSV',
  'WordExport': 'صدور Word',
  
  // Column Menu
  'FilterMenu': 'فیلتر',
  'AutoFitAll': 'تنظیم خودکار همه ستون‌ها',
  'AutoFit': 'تنظیم خودکار این ستون',
  'ColumnMenuDialogARIA': 'دیالوگ منوی ستون',
  'ColumnMenuDescription': 'برای باز کردن منوی ستون Alt+Down را فشار دهید',
  
  // Context Menu
  'Copy': 'کپی',
  'Group': 'گروه‌بندی بر اساس این ستون',
  'Ungroup': 'لغو گروه‌بندی این ستون',
  'Export': 'صدور',
  'FirstPage': 'صفحه اول',
  'LastPage': 'صفحه آخر',
  'PreviousPage': 'صفحه قبل',
  'NextPage': 'صفحه بعد',
  'SortAscending': 'مرتب‌سازی صعودی',
  'SortDescending': 'مرتب‌سازی نزولی',
  'EditRecord': 'ویرایش رکورد',
  'DeleteRecord': 'حذف رکورد',
};

/**
 * Persian locale strings for Syncfusion Pager component
 */
const persianPagerLocale = {
  'currentPageInfo': '{0} از {1} صفحه',
  'totalItemsInfo': '({0} مورد)',
  'totalItemInfo': '({0} مورد)',
  'firstPageTooltip': 'رفتن به صفحه اول',
  'lastPageTooltip': 'رفتن به صفحه آخر',
  'nextPageTooltip': 'رفتن به صفحه بعد',
  'previousPageTooltip': 'رفتن به صفحه قبل',
  'nextPagerTooltip': 'رفتن به صفحات بعدی',
  'previousPagerTooltip': 'رفتن به صفحات قبلی',
  'pagerDropDown': 'مورد در صفحه',
  'pagerAllDropDown': 'مورد',
  'All': 'همه',
  'Container': 'کانتینر صفحه‌بندی',
  'Information': 'اطلاعات صفحه‌بندی',
  'ExternalMsg': 'پیام خارجی صفحه‌بندی',
  'Page': 'صفحه',
  'Of': ' از ',
  'Pages': ' صفحه',
};

// Load Persian locale using L10n.load()
L10n.load({
  'fa': {
    'grid': persianGridLocale,
    'pager': persianPagerLocale,
  },
});

/**
 * Set the active locale for Syncfusion components and enable/disable RTL
 * @param locale - 'fa' for Persian or 'en' for English
 */
export function setSyncfusionLocale(locale: 'fa' | 'en'): void {
  if (locale === 'fa') {
    setCulture('fa');
    enableRtl(true);
  } else {
    setCulture('en-US');
    enableRtl(false);
  }
}

/**
 * Initialize Persian locale for Syncfusion
 * Call this function to ensure locale is loaded
 */
export function initSyncfusionPersianLocale(): void {
  // Locale is already loaded on module import via L10n.load()
  // This function exists for explicit initialization if needed
}

// Export locale objects for external use if needed
export { persianGridLocale, persianPagerLocale };
