import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Group, Item, MultiValue } from '../../types/api';
import type { ApiError } from '../../types/auth';
import { api } from '../../services/rtkApi';

/**
 * Monitoring state interface
 */
export interface MonitoringState {
  // Groups data
  groups: Group[];
  groupsLoading: boolean;
  groupsError: ApiError | null;
  
  // Items data
  items: Item[];
  itemsLoading: boolean;
  itemsError: ApiError | null;
  
  // Values data
  values: MultiValue[];
  valuesLoading: boolean;
  valuesError: ApiError | null;
  
  // Navigation
  currentFolderId: string | null;
}

/**
 * Initial state
 */
const initialState: MonitoringState = {
  groups: [],
  groupsLoading: false,
  groupsError: null,
  
  items: [],
  itemsLoading: false,
  itemsError: null,
  
  values: [],
  valuesLoading: false,
  valuesError: null,
  
  currentFolderId: null,
};

// Note: Data fetching is now handled by RTK Query
// This slice maintains the state for compatibility with existing components

/**
 * Monitoring slice
 */
const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    /**
     * Set current folder ID for navigation
     */
    setCurrentFolderId: (state, action: PayloadAction<string | null>) => {
      state.currentFolderId = action.payload;
    },
    
    /**
     * Clear all errors
     */
    clearErrors: (state) => {
      state.groupsError = null;
      state.itemsError = null;
    },
    
    /**
     * Reset monitoring state to initial
     */
    resetMonitoring: () => initialState,
  },
  extraReducers: (builder) => {
    // Handle RTK Query getGroups
    builder
      .addMatcher(
        api.endpoints.getGroups.matchPending,
        (state) => {
          state.groupsLoading = true;
          state.groupsError = null;
        }
      )
      .addMatcher(
        api.endpoints.getGroups.matchFulfilled,
        (state, action) => {
          state.groupsLoading = false;
          state.groups = action.payload.groups || [];
        }
      )
      .addMatcher(
        api.endpoints.getGroups.matchRejected,
        (state, action) => {
          state.groupsLoading = false;
          state.groupsError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch groups',
            status: 500,
          };
        }
      );

    // Handle RTK Query getItems
    builder
      .addMatcher(
        api.endpoints.getItems.matchPending,
        (state) => {
          state.itemsLoading = true;
          state.itemsError = null;
        }
      )
      .addMatcher(
        api.endpoints.getItems.matchFulfilled,
        (state, action) => {
          state.itemsLoading = false;
          state.items = action.payload.items || [];
        }
      )
      .addMatcher(
        api.endpoints.getItems.matchRejected,
        (state, action) => {
          state.itemsLoading = false;
          state.itemsError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch items',
            status: 500,
          };
        }
      );

    // Handle RTK Query getValues
    builder
      .addMatcher(
        api.endpoints.getValues.matchPending,
        (state) => {
          state.valuesLoading = true;
          state.valuesError = null;
        }
      )
      .addMatcher(
        api.endpoints.getValues.matchFulfilled,
        (state, action) => {
          state.valuesLoading = false;
          state.values = action.payload.values || [];
        }
      )
      .addMatcher(
        api.endpoints.getValues.matchRejected,
        (state, action) => {
          state.valuesLoading = false;
          state.valuesError = (action.payload as unknown as ApiError) || {
            message: 'Failed to fetch values',
            status: 500,
          };
        }
      );
  },
});

/**
 * Export actions
 */
export const { setCurrentFolderId, clearErrors, resetMonitoring } = monitoringSlice.actions;

/**
 * Export reducer
 */
export default monitoringSlice.reducer;

/**
 * Wrapper thunks for backward compatibility with existing components
 * These dispatch RTK Query endpoints and update the monitoring slice
 */
import type { AppDispatch } from '../index';

export const fetchGroups = () => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getGroups.initiate());
};

export const fetchItems = ({ showOrphans = false }: { showOrphans?: boolean }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getItems.initiate({ showOrphans }));
};

export const fetchValues = ({ itemIds }: { itemIds?: string[] }) => (dispatch: AppDispatch) => {
  return dispatch(api.endpoints.getValues.initiate({ itemIds: itemIds || null }));
};
