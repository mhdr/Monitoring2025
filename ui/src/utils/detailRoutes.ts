// Utility functions for building detail page URLs with query parameters
// Ensures consistency across components opening new tabs or navigating programmatically
// All user-facing text must remain translated at component level; no hard-coded UI strings here.

export type DetailTab =
  | 'trend-analysis'
  | 'data-table'
  | 'live-monitoring'
  | 'active-alarms'
  | 'alarm-log'
  | 'alarm-criteria'
  | 'audit-trail'
  | 'management';

export interface DetailRouteParams {
  itemId: string;
}

/**
 * Build a full absolute URL for a detail tab given the current window origin.
 * Falls back gracefully if window is undefined (e.g., SSR/test environments) by returning a relative URL.
 */
export function buildDetailTabUrl(tab: DetailTab, params: DetailRouteParams): string {
  const search = new URLSearchParams({
    itemId: params.itemId,
  }).toString();

  const origin = (typeof window !== 'undefined' && window.location.origin) || '';
  return `${origin}/item-detail/${tab}?${search}`;
}
