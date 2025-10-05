// Type declarations for @majidh1/jalalidatepicker
declare module '@majidh1/jalalidatepicker' {
  export interface JalaliDatePickerOptions {
    date?: boolean;
    time?: boolean;
    hasSecond?: boolean;
    initTime?: string | null;
    autoShow?: boolean;
    autoHide?: boolean;
    hideAfterChange?: boolean;
    useDropDownYears?: boolean;
    separatorChars?: {
      date?: string;
      between?: string;
      time?: string;
    };
    persianDigits?: boolean;
    minDate?: string | null;
    maxDate?: string | null;
    initDate?: string | null;
    today?: () => Date;
    plusHtml?: string;
    minusHtml?: string;
    container?: HTMLElement | string;
    selector?: string;
    zIndex?: number;
    days?: string[];
    months?: string[];
    changeMonthRotateYear?: boolean;
    showTodayBtn?: boolean;
    showEmptyBtn?: boolean;
    showCloseBtn?: boolean;
    autoReadOnlyInput?: boolean;
    topSpace?: number;
    bottomSpace?: number;
    edgeSpace?: number;
    dayRendering?: (dayOptions: Record<string, unknown>, input: HTMLInputElement) => Record<string, unknown>;
    format?: string;
    onChange?: (date: string) => void;
  }

  export interface JalaliDatePicker {
    startWatch(options?: JalaliDatePickerOptions): void;
    show(input: HTMLInputElement, options?: JalaliDatePickerOptions): void;
    hide(): void;
    updateOptions(options: JalaliDatePickerOptions): void;
  }

  const jalaliDatepicker: JalaliDatePicker;
  export default jalaliDatepicker;
}

declare module '@majidh1/jalalidatepicker/dist/jalalidatepicker.min.css' {
  const content: string;
  export default content;
}
