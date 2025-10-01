import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { monitoringApi } from '../../services/api';
import type { Group, GroupsResponseDto, ItemsResponseDto, Item, ValuesResponseDto, MultiValue } from '../../types/api';
import type { ApiError } from '../../types/auth';

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

/**
 * Async thunk to fetch groups
 */
export const fetchGroups = createAsyncThunk<
  GroupsResponseDto,
  void,
  { rejectValue: ApiError }
>(
  'monitoring/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await monitoringApi.getGroups();
      return response;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk to fetch items
 */
export const fetchItems = createAsyncThunk<
  ItemsResponseDto,
  { showOrphans?: boolean },
  { rejectValue: ApiError }
>(
  'monitoring/fetchItems',
  async ({ showOrphans = false }, { rejectWithValue }) => {
    try {
      const response = await monitoringApi.getItems({ showOrphans });
      return response;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

/**
 * Async thunk to fetch values for monitoring items
 */
export const fetchValues = createAsyncThunk<
  ValuesResponseDto,
  { itemIds?: string[] },
  { rejectValue: ApiError }
>(
  'monitoring/fetchValues',
  async ({ itemIds }, { rejectWithValue }) => {
    try {
      const response = await monitoringApi.getValues({ itemIds: itemIds || null });
      return response;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  }
);

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
    // Fetch groups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.groupsLoading = true;
        state.groupsError = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groupsLoading = false;
        state.groups = action.payload.groups || [];
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.groupsLoading = false;
        state.groupsError = action.payload || {
          message: 'Failed to fetch groups',
          status: 500,
        };
      });

    // Fetch items
    builder
      .addCase(fetchItems.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.items = action.payload.items || [];
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload || {
          message: 'Failed to fetch items',
          status: 500,
        };
      });

    // Fetch values
    builder
      .addCase(fetchValues.pending, (state) => {
        state.valuesLoading = true;
        state.valuesError = null;
      })
      .addCase(fetchValues.fulfilled, (state, action) => {
        state.valuesLoading = false;
        state.values = action.payload.values || [];
      })
      .addCase(fetchValues.rejected, (state, action) => {
        state.valuesLoading = false;
        state.valuesError = action.payload || {
          message: 'Failed to fetch values',
          status: 500,
        };
      });
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
