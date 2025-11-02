/**
 * Sort Preferences Helper
 * 
 * Re-exports from sortStore for backward compatibility.
 * Uses Zustand + localStorage instead of IndexedDB.
 */

export {
  getAllSortPreferences,
  getSortPreference,
  setSortPreference,
  removeSortPreference,
  clearSortPreference,
  clearAllSortPreferences,
} from '../stores/sortStore';
