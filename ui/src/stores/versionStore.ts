/**
 * Version Store
 * 
 * Zustand store for managing system and user version information with localStorage persistence.
 * Used to detect when settings have changed and trigger background data synchronization.
 * 
 * The Version field represents the global system settings version that changes when system-wide
 * configuration is updated. The UserVersion field is user-specific and changes when that user's
 * settings or permissions are modified.
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('VersionStore');

/**
 * Version state stored in localStorage
 */
interface VersionState {
  /** Global system settings version */
  version: string | null;
  /** User-specific settings version */
  userVersion: string | null;
  /** Last time the version was checked (Unix timestamp) */
  lastChecked: number | null;
}

/**
 * Version store actions
 */
interface VersionActions {
  /**
   * Set both system and user versions
   * @param version - System version
   * @param userVersion - User-specific version
   */
  setVersions: (version: string | null | undefined, userVersion: string | null | undefined) => void;
  
  /**
   * Check if versions have changed
   * @param newVersion - New system version to compare
   * @param newUserVersion - New user version to compare
   * @returns true if either version has changed
   */
  hasVersionChanged: (newVersion: string | null | undefined, newUserVersion: string | null | undefined) => boolean;
  
  /**
   * Clear all version data (e.g., on logout)
   */
  clearVersions: () => void;
  
  /**
   * Get current versions
   */
  getVersions: () => { version: string | null; userVersion: string | null };
}

/**
 * Initial version state
 */
const initialState: VersionState = {
  version: null,
  userVersion: null,
  lastChecked: null,
};

/**
 * Zustand store for version management with localStorage persistence
 * Redux DevTools integration enabled for debugging
 */
export const useVersionStore = create<VersionState & VersionActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setVersions: (version, userVersion) => {
          const newVersion = version ?? null;
          const newUserVersion = userVersion ?? null;
          
          logger.info('Setting versions', {
            version: newVersion,
            userVersion: newUserVersion,
          });
          
          set({
            version: newVersion,
            userVersion: newUserVersion,
            lastChecked: Date.now(),
          });
        },
        
        hasVersionChanged: (newVersion, newUserVersion) => {
          const currentVersion = get().version;
          const currentUserVersion = get().userVersion;
          
          const newVersionValue = newVersion ?? null;
          const newUserVersionValue = newUserVersion ?? null;
          
          const versionChanged = currentVersion !== newVersionValue;
          const userVersionChanged = currentUserVersion !== newUserVersionValue;
          
          logger.log('Checking version changes', {
            currentVersion,
            newVersion: newVersionValue,
            versionChanged,
            currentUserVersion,
            newUserVersion: newUserVersionValue,
            userVersionChanged,
            anyChanged: versionChanged || userVersionChanged,
          });
          
          return versionChanged || userVersionChanged;
        },
        
        clearVersions: () => {
          logger.info('Clearing versions');
          set(initialState);
        },
        
        getVersions: () => {
          const { version, userVersion } = get();
          return { version, userVersion };
        },
      }),
      {
        name: 'version-storage',
        version: 1,
      }
    ),
    { name: 'VersionStore', enabled: true }
  )
);
