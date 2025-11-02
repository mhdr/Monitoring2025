/**
 * Sort Preferences Helper
 * 
 * Re-exports from sortStore for backward compatibility.
 * Uses Zustand + localStorage for persistence.
 */

export {
  getAllSortPreferences,
  getSortPreference,
  setSortPreference,
  removeSortPreference,
  clearSortPreference,
  clearAllSortPreferences,
} from '../stores/sortStore';
