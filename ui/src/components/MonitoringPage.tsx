import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Home as HomeIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  CreateNewFolder as AddFolderIcon,
  Add as AddPointIcon,
} from '@mui/icons-material';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoring } from '../hooks/useMonitoring';
import { useAuth } from '../hooks/useAuth';
import { useSortPreferences } from '../hooks/useSortPreferences';
import type { Group } from '../types/api';
import GroupCard from './GroupCard';
import ItemCard from './ItemCard';
import AddGroupDialog from './AddGroupDialog';
import AddItemDialog from './AddItemDialog';
import SortMenu from './SortMenu';
import { createLogger } from '../utils/logger';
import { formatDate } from '../utils/dateFormatting';

const logger = createLogger('MonitoringPage');

const MonitoringPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    state: monitoringState,
    setCurrentFolderId,
    fetchValues,
    fetchGroups,
    fetchItems
  } = useMonitoring();
  const [searchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  
  // Admin menu state
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuPosition, setAdminMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Add Group Dialog state
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);
  
  // Add Item Dialog state
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.roles?.includes('Admin') || false;
  
  // State to manage visible loading indicator with minimum display time
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  
  // State for value history tracking
  const [valueHistory, setValueHistory] = useState<Map<string, Array<{value: number; time: number}>>>(new Map());
  
  // Get data from monitoring context
  const {
    groups: allGroups,
    groupsLoading: isLoading,
    groupsError: error,
    items: allItems,
    itemsLoading: isLoadingItems,
    itemsError,
    values: itemValues,
    valuesLoading: isRefreshing,
    alarms: allAlarms,
  } = monitoringState;

  // Update current folder ID when URL parameter changes
  useEffect(() => {
    setCurrentFolderId(currentFolderId);
  }, [currentFolderId, setCurrentFolderId]);

  // Get current folder and its children
  const { childGroups, breadcrumbs } = useMemo(() => {
    if (!allGroups || allGroups.length === 0) {
      return { childGroups: [], breadcrumbs: [] };
    }
    
    // If no folderId, we're at root
    if (!currentFolderId) {
      const rootGroups = allGroups.filter((g: Group) => !g.parentId || g.parentId === null);
      return { childGroups: rootGroups, breadcrumbs: [] };
    }

    // Find current folder
    const folder = allGroups.find((g: Group) => g.id === currentFolderId);
    if (!folder) {
      return { childGroups: [], breadcrumbs: [] };
    }

    // Get children of current folder
    const children = allGroups.filter((g: Group) => g.parentId === currentFolderId);

    // Build breadcrumb trail
    const trail: Group[] = [];
    let current: Group | undefined = folder;
    while (current) {
      trail.unshift(current);
      current = current.parentId ? allGroups.find((g: Group) => g.id === current!.parentId) : undefined;
    }

    return { childGroups: children, breadcrumbs: trail };
  }, [allGroups, currentFolderId]);

  // Get items for current folder (unsorted)
  const unsortedFolderItems = useMemo(() => {
    if (!allItems || allItems.length === 0) {
      return [];
    }

    // Filter items by current folder/group
    if (!currentFolderId) {
      // At root level - show items with no groupId
      return allItems.filter((item) => !item.groupId || item.groupId === null);
    } else {
      // Show items belonging to current folder
      return allItems.filter((item) => item.groupId === currentFolderId);
    }
  }, [allItems, currentFolderId]);

  // Create timestamps map from item values
  const itemTimestamps = useMemo(() => {
    const timestamps: Record<string, number> = {};
    Object.entries(itemValues || {}).forEach(([itemId, valueData]) => {
      if (valueData && 'time' in valueData) {
        timestamps[itemId] = valueData.time;
      }
    });
    return timestamps;
  }, [itemValues]);

  // Convert itemValues to simple value map (convert string values to numbers where possible)
  const itemValuesMap = useMemo(() => {
    const values: Record<string, number | boolean> = {};
    Object.entries(itemValues || {}).forEach(([itemId, valueData]) => {
      if (valueData && 'value' in valueData && valueData.value !== null) {
        // Try to convert string value to number
        const numValue = Number(valueData.value);
        if (!isNaN(numValue)) {
          values[itemId] = numValue;
        } else {
          // For boolean-like strings
          const lowerValue = valueData.value.toLowerCase();
          if (lowerValue === 'true' || lowerValue === '1') {
            values[itemId] = true;
          } else if (lowerValue === 'false' || lowerValue === '0') {
            values[itemId] = false;
          }
        }
      }
    });
    return values;
  }, [itemValues]);

  // Use sort hook to manage sorting with IndexedDB persistence
  const {
    sortedItems: currentFolderItems,
    sortConfig,
    setSortField,
    toggleDirection,
    resetSort,
  } = useSortPreferences({
    groupId: currentFolderId,
    language,
    items: unsortedFolderItems,
    values: itemValuesMap,
    alarms: allAlarms || [],
    timestamps: itemTimestamps,
  });

  // Get item IDs for current folder (for values polling)
  // CRITICAL: Stringify to stabilize the dependency - only re-poll when IDs actually change
  const currentFolderItemIdsString = useMemo(() => {
    const ids = currentFolderItems.map((item) => item.id);
    return JSON.stringify(ids);
  }, [currentFolderItems]);

  // Poll values every 4 seconds for items in current folder
  useEffect(() => {
    // Parse the stringified IDs
    const currentFolderItemIds: string[] = JSON.parse(currentFolderItemIdsString);
    
    // Skip polling if there are no items in the current folder
    if (currentFolderItemIds.length === 0) {
      return;
    }

    // Fetch values immediately
    fetchValues(currentFolderItemIds);

    // Set up polling interval (every 4 seconds as per requirement)
    pollingIntervalRef.current = window.setInterval(() => {
      fetchValues(currentFolderItemIds);
    }, 4000);

    // Cleanup on unmount or when item IDs change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // CRITICAL: Only depend on the stringified IDs, not fetchValues
    // fetchValues is stable (useCallback in context), no need to include it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderItemIdsString]);

  // Manage refresh indicator visibility with minimum display time
  useEffect(() => {
    if (isRefreshing) {
      // Show indicator immediately when loading starts
      setShowRefreshIndicator(true);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    } else if (showRefreshIndicator) {
      // When loading finishes, keep indicator visible for at least 1000ms
      loadingTimeoutRef.current = setTimeout(() => {
        setShowRefreshIndicator(false);
        loadingTimeoutRef.current = null;
      }, 1000);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isRefreshing, showRefreshIndicator]);

  // Track value history for trend indicators
  useEffect(() => {
    if (!itemValues || itemValues.length === 0) {
      return;
    }

    setValueHistory((prevHistory) => {
      const newHistory = new Map(prevHistory);
      
      itemValues.forEach((itemValue) => {
        const itemId = itemValue.itemId;
        const value = itemValue.value;
        const time = itemValue.time;
        
        // Parse value as number (skip if not a number)
        const numValue = parseFloat(value || '');
        if (isNaN(numValue)) return;
        
        // Get existing history for this item
        const existingHistory = newHistory.get(itemId) || [];
        
        // Check if this value is different from the last recorded value
        const lastValue = existingHistory.length > 0 ? existingHistory[existingHistory.length - 1] : null;
        
        // Only add if value or time changed
        if (!lastValue || lastValue.value !== numValue || lastValue.time !== time) {
          const updatedHistory = [
            ...existingHistory,
            { value: numValue, time }
          ];
          
          // Keep only last 10 values to prevent memory bloat
          const trimmedHistory = updatedHistory.slice(-10);
          
          newHistory.set(itemId, trimmedHistory);
        }
      });
      
      return newHistory;
    });
  }, [itemValues]);

  // Helper function to get display name based on language
  const getDisplayName = (group: Group) => {
    return (language === 'fa' && group.nameFa) ? group.nameFa : group.name;
  };

  // Helper function to get item display name based on language
  const getItemDisplayName = (item: typeof currentFolderItems[0]) => {
    return (language === 'fa' && item.nameFa) ? item.nameFa : item.name;
  };

  // Helper function to get value for an item
  const getItemValue = (itemId: string) => {
    return itemValues.find((v) => v.itemId === itemId);
  };

  // Helper function to format value based on item type
  const formatItemValue = (item: typeof currentFolderItems[0], value: string | null) => {
    if (value === null || value === undefined) {
      return t('noValue');
    }

    // For digital items (type 1 or 2), show on/off text
    if (item.itemType === 1 || item.itemType === 2) {
      const boolValue = value === 'true' || value === '1';
      
      // Use Farsi text if language is Persian and Farsi text is available
      if (boolValue) {
        return (language === 'fa' && item.onTextFa) ? item.onTextFa : (item.onText || t('on'));
      } else {
        return (language === 'fa' && item.offTextFa) ? item.offTextFa : (item.offText || t('off'));
      }
    }

    // For analog items (type 3 or 4), show value with unit
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Use Farsi unit if language is Persian and Farsi unit is available
      const displayUnit = (language === 'fa' && item.unitFa) ? item.unitFa : (item.unit || '');
      return `${numValue.toFixed(2)} ${displayUnit}`;
    }

    return value;
  };

  // Helper function to format timestamp using global date formatting utility
  const formatTimestamp = (time: number) => {
    return formatDate(time, language, 'long');
  };

  const handleFolderClick = (folderId: string) => {
    navigate(`/dashboard/monitoring?folderId=${folderId}`);
  };

  const handleBreadcrumbClick = (folderId: string | null) => {
    if (folderId) {
      navigate(`/dashboard/monitoring?folderId=${folderId}`);
    } else {
      navigate('/dashboard/monitoring');
    }
  };

  /**
   * Admin menu handlers - only for admin role
   */
  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    // Check if the right-click occurred on a GroupCard or ItemCard
    // by checking if the event target is within a card component
    const target = event.target as HTMLElement;
    
    // Check for GroupCard (has group-card-root-container or group-card-action-area)
    const isClickOnGroupCard = target.closest('[data-id-ref="group-card-root-container"]') || 
                                target.closest('[data-id-ref="group-card-action-area"]');
    
    // Check for ItemCard (has item-card-root-container)
    const isClickOnItemCard = target.closest('[data-id-ref="item-card-root-container"]');
    
    // If clicked on any card, don't show this menu
    if (isClickOnGroupCard || isClickOnItemCard) {
      return;
    }
    
    event.preventDefault(); // Prevent default browser context menu
    event.stopPropagation(); // Prevent event bubbling
    
    // Only show admin menu for admin users
    if (!isAdmin) {
      return;
    }
    
    // Capture event coordinates before any async operations
    const clickX = event.clientX;
    const clickY = event.clientY;
    const currentTarget = event.currentTarget;
    
    // Close any existing menu first
    if (adminMenuAnchor !== null) {
      logger.log('Closing existing admin menu before opening new one');
      
      // Use requestAnimationFrame to ensure state updates happen in the right order
      setAdminMenuAnchor(null);
      setAdminMenuPosition(null);
      
      // Wait for next frame to reopen
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          logger.log('Opening admin menu at new position', { 
            currentFolderId,
            x: clickX,
            y: clickY,
          });
          
          setAdminMenuAnchor(currentTarget);
          setAdminMenuPosition({
            top: clickY,
            left: clickX,
          });
        });
      });
    } else {
      logger.log('Opening admin menu via right-click', { 
        currentFolderId,
        x: clickX,
        y: clickY,
      });
      
      // Set anchor element and position under cursor
      setAdminMenuAnchor(currentTarget);
      setAdminMenuPosition({
        top: clickY,
        left: clickX,
      });
    }
  };

  const handleAdminMenuClose = () => {
    logger.log('Closing admin menu');
    setAdminMenuAnchor(null);
    setAdminMenuPosition(null);
  };

  const handleAddFolder = () => {
    logger.log('Add folder clicked', { currentFolderId });
    handleAdminMenuClose();
    setAddGroupDialogOpen(true);
  };

  const handleAddPoint = () => {
    logger.log('Add point clicked', { currentFolderId });
    handleAdminMenuClose();
    setAddItemDialogOpen(true);
  };

  const handleAddItemSuccess = () => {
    logger.log('Point added successfully', { currentFolderId });
    // Refresh groups and items to show the new point
    fetchGroups();
    fetchItems();
  };

  const handleAddGroupSuccess = (groupId: string) => {
    logger.log('Group added successfully', { groupId, currentFolderId });
    // Refresh groups to show the new folder
    fetchGroups();
  };

  return (
    <Container maxWidth={false} data-id-ref="monitoring-page-root-container" sx={{ height: '100%', width: '100%', py: '24px', px: 0, mx: 0 }}>
      <Card data-id-ref="monitoring-page-main-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader 
          data-id-ref="monitoring-page-header"
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} data-id-ref="monitoring-page-title-row">
              <Typography variant="h4" component="h1" data-id-ref="monitoring-page-title">
                {t('monitoring')}
              </Typography>
              {showRefreshIndicator && currentFolderItems.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-id-ref="monitoring-page-refresh-indicator-container">
                  <CircularProgress 
                    size={16} 
                    data-id-ref="monitoring-page-refresh-spinner"
                  />
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ display: { xs: 'none', md: 'inline' } }}
                    data-id-ref="monitoring-page-refresh-label"
                  >
                    {t('refreshingData')}
                  </Typography>
                </Box>
              )}
            </Box>
          }
        />
        
        <CardContent 
          data-id-ref="monitoring-page-body" 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            // Visual hint for admin users that right-click is available
            ...(isAdmin && {
              cursor: 'context-menu',
            }),
          }}
          onContextMenu={handleContextMenu}
        >
          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 0 && (
            <Box 
              sx={{ mb: 3, display: { xs: 'none', md: 'block' } }} 
              data-id-ref="monitoring-page-breadcrumb-nav"
            >
              <Breadcrumbs aria-label="breadcrumb" data-id-ref="monitoring-page-breadcrumb-list">
                <Link
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  color="inherit"
                  onClick={() => handleBreadcrumbClick(null)}
                  data-id-ref="monitoring-page-breadcrumb-root-link"
                >
                  <HomeIcon sx={{ mr: 0.5 }} fontSize="small" data-id-ref="monitoring-page-breadcrumb-root-icon" />
                  {t('rootFolder')}
                </Link>
                {breadcrumbs.map((folder, index) => (
                  index === breadcrumbs.length - 1 ? (
                    <Typography 
                      key={folder.id}
                      color="text.primary"
                      data-id-ref={`monitoring-page-breadcrumb-item-${folder.id}`}
                    >
                      {getDisplayName(folder)}
                    </Typography>
                  ) : (
                    <Link
                      key={folder.id}
                      underline="hover"
                      sx={{ cursor: 'pointer' }}
                      color="inherit"
                      onClick={() => handleBreadcrumbClick(folder.id)}
                      data-id-ref={`monitoring-page-breadcrumb-link-${folder.id}`}
                    >
                      {getDisplayName(folder)}
                    </Link>
                  )
                ))}
              </Breadcrumbs>
            </Box>
          )}

          {/* Loading State */}
          {isLoading && (
            <Box 
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }} 
              data-id-ref="monitoring-page-loading-groups-container"
            >
              <Box sx={{ textAlign: 'center' }} data-id-ref="monitoring-page-loading-groups-center">
                <CircularProgress sx={{ mb: 2 }} data-id-ref="monitoring-page-loading-groups-spinner" />
                <Typography color="text.secondary" data-id-ref="monitoring-page-loading-groups-text">
                  {t('loadingGroups')}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" data-id-ref="monitoring-page-groups-error-alert">
              <Typography variant="body1" fontWeight="bold" data-id-ref="monitoring-page-groups-error-title">
                {t('errorLoadingGroups')}
              </Typography>
              {error.status && (
                <Typography variant="body2" sx={{ mt: 0.5 }} data-id-ref="monitoring-page-groups-error-status">
                  {`Error ${error.status}`}
                </Typography>
              )}
            </Alert>
          )}

          {/* Empty State - Only show when NO folders AND NO items */}
          {!isLoading && !error && !isLoadingItems && !itemsError && 
           childGroups.length === 0 && currentFolderItems.length === 0 && (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: 400,
                textAlign: 'center'
              }} 
              data-id-ref="monitoring-page-empty-state-container"
            >
              <FolderIcon 
                sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} 
                data-id-ref="monitoring-page-empty-state-icon" 
              />
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                data-id-ref="monitoring-page-empty-state-title"
              >
                {currentFolderId ? t('emptyFolder') : t('noItemsFound')}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.disabled"
                sx={{ maxWidth: 500 }}
                data-id-ref="monitoring-page-empty-state-description"
              >
                {currentFolderId ? t('emptyFolderDescription') : t('noItemsDescription')}
              </Typography>
            </Box>
          )}

          {/* Folder Grid View */}
          {!isLoading && !error && childGroups.length > 0 && (
            <Box sx={{ mb: 4 }} data-id-ref="monitoring-page-folder-grid-section">
              {/* Hide header on small screens (mobile); show from md and up */}
              <Box 
                sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, mb: 3 }} 
                data-id-ref="monitoring-page-folder-grid-header"
              >
                <FolderIcon color="warning" data-id-ref="monitoring-page-folder-grid-icon" />
                <Typography variant="h5" component="h2" data-id-ref="monitoring-page-folder-grid-title">
                  {t('folders')}
                </Typography>
                <Chip 
                  label={childGroups.length} 
                  size="small" 
                  color="secondary"
                  data-id-ref="monitoring-page-folder-grid-count"
                />
              </Box>
              
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',               // 2 columns on mobile
                    sm: 'repeat(3, minmax(160px, 1fr))', // 3 columns on small tablets
                    md: 'repeat(4, minmax(180px, 1fr))', // 4 columns on medium screens
                    lg: 'repeat(5, minmax(180px, 1fr))', // 5 columns on large screens
                    xl: 'repeat(6, minmax(200px, 1fr))', // 6 columns on XL screens
                  },
                  gap: { xs: 1.5, sm: 2, md: 3 },
                  marginTop: 2,
                }}
                data-id-ref="monitoring-page-folder-grid"
              >
                {childGroups.map((group: Group) => {
                  const subgroupCount = allGroups.filter((g: Group) => g.parentId === group.id).length;
                  const itemCount = allItems.filter((item) => item.groupId === group.id).length;
                  return (
                    <GroupCard
                      key={group.id}
                      group={group}
                      subgroupCount={subgroupCount}
                      itemCount={itemCount}
                      onClick={() => handleFolderClick(group.id)}
                      data-id-ref={`monitoring-page-group-card-${group.id}`}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Items List View */}
          {!isLoadingItems && !itemsError && currentFolderItems.length > 0 && (
            <Box data-id-ref="monitoring-page-items-list-section">
              <Box 
                sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, mb: 3 }} 
                data-id-ref="monitoring-page-items-list-header"
              >
                <DescriptionIcon color="primary" data-id-ref="monitoring-page-items-list-icon" />
                <Typography variant="h5" component="h2" data-id-ref="monitoring-page-items-list-title">
                  {t('items')}
                </Typography>
                <Chip 
                  label={currentFolderItems.length} 
                  size="small" 
                  color="secondary"
                  data-id-ref="monitoring-page-items-list-count"
                />
                {/* Sort Menu */}
                <Box sx={{ ml: 'auto' }} data-id-ref="monitoring-page-items-sort-container">
                  <SortMenu
                    sortConfig={sortConfig}
                    onSortFieldChange={setSortField}
                    onDirectionToggle={toggleDirection}
                    onReset={resetSort}
                    data-id-ref="monitoring-page-items-sort-menu"
                  />
                </Box>
              </Box>
              
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',                             // 1 column on mobile
                    sm: 'repeat(2, minmax(280px, 1fr))',   // 2 columns on small tablets
                    md: 'repeat(2, 1fr)',                  // 2 columns on medium screens
                    lg: 'repeat(2, 1fr)',                  // 2 columns on large screens
                    xl: 'repeat(2, 1fr)',                  // 2 columns on XL screens
                  },
                  gap: 2,
                  marginTop: 2,
                }}
                data-id-ref="monitoring-page-items-grid"
              >
                {currentFolderItems.map((item: typeof currentFolderItems[0]) => {
                  const itemValue = getItemValue(item.id);
                  const itemValueHistory = valueHistory.get(item.id);
                  return (
                    <ItemCard
                      key={item.id}
                      itemId={item.id}
                      name={getItemDisplayName(item)}
                      pointNumber={item.pointNumber}
                      value={itemValue ? formatItemValue(item, itemValue.value) : t('loadingValue')}
                      time={itemValue ? formatTimestamp(itemValue.time) : t('loadingValue')}
                      valueHistory={itemValueHistory}
                      item={item}
                      data-id-ref={`monitoring-page-item-card-${item.id}`}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Items Loading State */}
          {isLoadingItems && (
            <Box 
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }} 
              data-id-ref="monitoring-page-loading-items-container"
            >
              <Box sx={{ textAlign: 'center' }} data-id-ref="monitoring-page-loading-items-center">
                <CircularProgress sx={{ mb: 1 }} data-id-ref="monitoring-page-loading-items-spinner" />
                <Typography variant="body2" color="text.secondary" data-id-ref="monitoring-page-loading-items-text">
                  {t('loadingItems')}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Items Error State */}
          {itemsError && (
            <Alert severity="warning" data-id-ref="monitoring-page-items-error-alert">
              <Typography variant="body1" fontWeight="bold" data-id-ref="monitoring-page-items-error-title">
                {t('errorLoadingItems')}
              </Typography>
              {itemsError.status && (
                <Typography variant="body2" sx={{ mt: 0.5 }} data-id-ref="monitoring-page-items-error-status">
                  {`Error ${itemsError.status}`}
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Admin Menu */}
      <Menu
        open={Boolean(adminMenuAnchor) && adminMenuPosition !== null}
        onClose={handleAdminMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          adminMenuPosition !== null
            ? { top: adminMenuPosition.top, left: adminMenuPosition.left }
            : undefined
        }
        MenuListProps={{
          onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          },
        }}
        data-id-ref="monitoring-page-admin-menu"
      >
        <MenuItem onClick={handleAddFolder} data-id-ref="monitoring-page-admin-menu-add-folder">
          <ListItemIcon>
            <AddFolderIcon fontSize="small" data-id-ref="monitoring-page-admin-menu-add-folder-icon" />
          </ListItemIcon>
          <ListItemText primary={t('monitoringPage.adminMenu.addFolder')} />
        </MenuItem>
        {/* Only show Add Point menu item when inside a folder (not in root) */}
        {currentFolderId && (
          <MenuItem onClick={handleAddPoint} data-id-ref="monitoring-page-admin-menu-add-point">
            <ListItemIcon>
              <AddPointIcon fontSize="small" data-id-ref="monitoring-page-admin-menu-add-point-icon" />
            </ListItemIcon>
            <ListItemText primary={t('monitoringPage.adminMenu.addPoint')} />
          </MenuItem>
        )}
      </Menu>

      {/* Add Group Dialog */}
      <AddGroupDialog
        open={addGroupDialogOpen}
        onClose={() => setAddGroupDialogOpen(false)}
        onSuccess={handleAddGroupSuccess}
        parentId={currentFolderId}
      />

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        onSuccess={handleAddItemSuccess}
        parentGroupId={currentFolderId || undefined}
      />
    </Container>
  );
};

export default MonitoringPage;
