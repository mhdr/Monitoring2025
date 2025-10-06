import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGroups, fetchItems, setCurrentFolderId } from '../store/slices/monitoringSlice';
import { useGetValuesQuery } from '../services/rtkApi';
import type { Group } from '../types/api';
import GroupCard from './GroupCard';
import ItemCard from './ItemCard';

const MonitoringPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  
  // State to manage visible loading indicator with minimum display time
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  
  // Get data from Redux store
  const {
    groups: allGroups,
    groupsLoading: isLoading,
    groupsError: error,
    items: allItems,
    itemsLoading: isLoadingItems,
    itemsError,
  } = useAppSelector((state) => state.monitoring);

  // Fetch groups and items data on mount
  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchItems({ showOrphans: false }));
  }, [dispatch]);

  // Update current folder ID in Redux when URL parameter changes
  useEffect(() => {
    dispatch(setCurrentFolderId(currentFolderId));
  }, [currentFolderId, dispatch]);

  // Get current folder and its children
  const { currentFolder, childGroups, breadcrumbs } = useMemo(() => {
    if (!allGroups || allGroups.length === 0) {
      return { currentFolder: null, childGroups: [], breadcrumbs: [] };
    }
    
    // If no folderId, we're at root
    if (!currentFolderId) {
      const rootGroups = allGroups.filter((g: Group) => !g.parentId || g.parentId === null);
      return { currentFolder: null, childGroups: rootGroups, breadcrumbs: [] };
    }

    // Find current folder
    const folder = allGroups.find((g: Group) => g.id === currentFolderId);
    if (!folder) {
      return { currentFolder: null, childGroups: [], breadcrumbs: [] };
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

    return { currentFolder: folder, childGroups: children, breadcrumbs: trail };
  }, [allGroups, currentFolderId]);

  // Get items for current folder
  const currentFolderItems = useMemo(() => {
    if (!allItems || allItems.length === 0) {
      return [];
    }

    // Filter items by current folder/group
    if (!currentFolderId) {
      // At root level - show items with no groupId
      return allItems.filter((item) => !item.groupId || item.groupId === null);
    }

    // Show items belonging to current folder
    return allItems.filter((item) => item.groupId === currentFolderId);
  }, [allItems, currentFolderId]);

  // Get item IDs for current folder (for values polling)
  const currentFolderItemIds = useMemo(() => {
    return currentFolderItems.map((item) => item.id);
  }, [currentFolderItems]);

  // RTK Query: Poll values every 5 seconds for items in current folder
  // Skip polling if there are no items in the current folder
  const { 
    data: valuesResponse, 
    isLoading: isRefreshing,
    isFetching: isValuesFetching 
  } = useGetValuesQuery(
    { itemIds: currentFolderItemIds.length > 0 ? currentFolderItemIds : null },
    {
      // Poll every 5 seconds (5000ms)
      pollingInterval: 5000,
      // Skip query if there are no items in current folder
      skip: currentFolderItemIds.length === 0,
      // Refetch on focus to ensure fresh data when user returns
      refetchOnFocus: true,
      // Refetch when component mounts
      refetchOnMountOrArgChange: true,
    }
  );

  // Extract values from RTK Query response
  const itemValues = useMemo(() => {
    return valuesResponse?.values || [];
  }, [valuesResponse]);

  // Manage refresh indicator visibility with minimum display time
  useEffect(() => {
    if (isRefreshing || isValuesFetching) {
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
  }, [isRefreshing, isValuesFetching, showRefreshIndicator]);

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

  // Helper function to format timestamp
  const formatTimestamp = (time: number) => {
    const date = new Date(time * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleString(language === 'fa' ? 'fa-IR' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

  return (
    <div className="container-fluid h-100 d-flex flex-column py-4" data-id-ref="monitoring-page-root-container">
      <div className="row flex-fill" data-id-ref="monitoring-page-main-row">
        <div className="col-12 h-100" data-id-ref="monitoring-page-main-col">
          <div className="card h-100 d-flex flex-column" data-id-ref="monitoring-page-main-card">
            <div className="card-header" data-id-ref="monitoring-page-header">
              <div className="d-flex justify-content-between align-items-center" data-id-ref="monitoring-page-header-row">
                <div className="d-flex align-items-center" data-id-ref="monitoring-page-title-row">
                  <h4 className="card-title mb-0" data-id-ref="monitoring-page-title">{t('monitoring')}</h4>
                  {showRefreshIndicator && currentFolderItems.length > 0 && (
                    <div className="ms-3 d-flex align-items-center text-muted" data-id-ref="monitoring-page-refresh-indicator-container">
                      <div 
                        className="spinner-border spinner-border-sm me-2" 
                        role="status"
                        style={{ width: '1rem', height: '1rem' }}
                        data-id-ref="monitoring-page-refresh-spinner"
                      >
                        <span className="visually-hidden" data-id-ref="monitoring-page-refresh-spinner-label">{t('refreshingData')}</span>
                      </div>
                      <small className="d-none d-md-inline" data-id-ref="monitoring-page-refresh-label">{t('refreshingData')}</small>
                    </div>
                  )}
                </div>
                { /* back-to-parent button removed as requested */ }
              </div>
            </div>
            
            <div className="card-body flex-fill overflow-auto" data-id-ref="monitoring-page-body">
              {/* Breadcrumb Navigation */}
              {breadcrumbs.length > 0 && (
                // Hide breadcrumb on small screens (mobile) and show from md and up
                <nav aria-label="breadcrumb" className="mb-4 d-none d-md-block" data-id-ref="monitoring-page-breadcrumb-nav">
                  <ol className="breadcrumb mb-0" data-id-ref="monitoring-page-breadcrumb-list">
                    <li className="breadcrumb-item" data-id-ref="monitoring-page-breadcrumb-root-item">
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleBreadcrumbClick(null);
                        }}
                        data-id-ref="monitoring-page-breadcrumb-root-link"
                      >
                        <i className="bi bi-house-door-fill me-1" data-id-ref="monitoring-page-breadcrumb-root-icon"></i>
                        {t('rootFolder')}
                      </a>
                    </li>
                    {breadcrumbs.map((folder, index) => (
                      <li 
                        key={folder.id} 
                        className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                        aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                        data-id-ref={`monitoring-page-breadcrumb-item-${folder.id}`}
                      >
                        {index === breadcrumbs.length - 1 ? (
                          getDisplayName(folder)
                        ) : (
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleBreadcrumbClick(folder.id);
                            }}
                            data-id-ref={`monitoring-page-breadcrumb-link-${folder.id}`}
                          >
                            {getDisplayName(folder)}
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="d-flex align-items-center justify-content-center h-100" data-id-ref="monitoring-page-loading-groups-container">
                  <div className="text-center" data-id-ref="monitoring-page-loading-groups-center">
                    <div className="spinner-border text-primary mb-3" role="status" data-id-ref="monitoring-page-loading-groups-spinner">
                      <span className="visually-hidden" data-id-ref="monitoring-page-loading-groups-label">{t('loadingGroups')}</span>
                    </div>
                    <p className="text-muted" data-id-ref="monitoring-page-loading-groups-text">{t('loadingGroups')}</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert" data-id-ref="monitoring-page-groups-error-alert">
                  <i className="bi bi-exclamation-triangle-fill me-2" data-id-ref="monitoring-page-groups-error-icon"></i>
                  <div data-id-ref="monitoring-page-groups-error-content">
                    <strong data-id-ref="monitoring-page-groups-error-title">{t('errorLoadingGroups')}</strong>
                    {error.status && (
                      <div className="small mt-1" data-id-ref="monitoring-page-groups-error-status">
                        {`Error ${error.status}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && childGroups.length === 0 && (
                <div className="d-flex align-items-center justify-content-center h-100" data-id-ref="monitoring-page-empty-state-container">
                  <div className="text-center text-muted" data-id-ref="monitoring-page-empty-state-center">
                    <i className="bi bi-folder-x" style={{ fontSize: '3rem' }} data-id-ref="monitoring-page-empty-state-icon"></i>
                    <p className="mt-3" data-id-ref="monitoring-page-empty-state-text">
                      {currentFolder ? t('noItemsInFolder') : t('noGroups')}
                    </p>
                  </div>
                </div>
              )}

              {/* Folder Grid View */}
              {!isLoading && !error && childGroups.length > 0 && (
                <div className="mb-4" data-id-ref="monitoring-page-folder-grid-section">
                  {/* Hide header on small screens (mobile); show from md and up */}
                  <div className="d-none d-md-flex align-items-center mb-3" data-id-ref="monitoring-page-folder-grid-header">
                    <i className="bi bi-folder-fill me-2 text-warning" data-id-ref="monitoring-page-folder-grid-icon"></i>
                    <h5 className="mb-0" data-id-ref="monitoring-page-folder-grid-title">
                      {t('folders')}
                    </h5>
                    <span className="badge bg-secondary ms-2" data-id-ref="monitoring-page-folder-grid-count">
                      {childGroups.length}
                    </span>
                  </div>
                  
                  <div className="groups-grid" data-id-ref="monitoring-page-folder-grid">
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
                  </div>
                </div>
              )}

              {/* Items List View */}
              {!isLoadingItems && !itemsError && currentFolderItems.length > 0 && (
                <div data-id-ref="monitoring-page-items-list-section">
              <div className="d-none d-md-flex align-items-center mb-3" data-id-ref="monitoring-page-items-list-header">
                    <i className="bi bi-file-earmark-text-fill me-2 text-primary" data-id-ref="monitoring-page-items-list-icon"></i>
                    <h5 className="mb-0" data-id-ref="monitoring-page-items-list-title">
                      {t('items')}
                    </h5>
                    <span className="badge bg-secondary ms-2" data-id-ref="monitoring-page-items-list-count">
                      {currentFolderItems.length}
                    </span>
                  </div>
                  
                  <div className="items-grid" data-id-ref="monitoring-page-items-grid">
                    {currentFolderItems.map((item: typeof currentFolderItems[0]) => {
                      const itemValue = getItemValue(item.id);
                      return (
                        <ItemCard
                          key={item.id}
                          itemId={item.id}
                          name={getItemDisplayName(item)}
                          pointNumber={item.pointNumber}
                          value={itemValue ? formatItemValue(item, itemValue.value) : t('loadingValue')}
                          time={itemValue ? formatTimestamp(itemValue.time) : t('loadingValue')}
                          data-id-ref={`monitoring-page-item-card-${item.id}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items Loading State */}
              {isLoadingItems && (
                <div className="d-flex align-items-center justify-content-center py-4" data-id-ref="monitoring-page-loading-items-container">
                  <div className="text-center" data-id-ref="monitoring-page-loading-items-center">
                    <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }} data-id-ref="monitoring-page-loading-items-spinner">
                      <span className="visually-hidden" data-id-ref="monitoring-page-loading-items-label">{t('loadingItems')}</span>
                    </div>
                    <p className="text-muted small" data-id-ref="monitoring-page-loading-items-text">{t('loadingItems')}</p>
                  </div>
                </div>
              )}

              {/* Items Error State */}
              {itemsError && (
                <div className="alert alert-warning d-flex align-items-center" role="alert" data-id-ref="monitoring-page-items-error-alert">
                  <i className="bi bi-exclamation-triangle me-2" data-id-ref="monitoring-page-items-error-icon"></i>
                  <div data-id-ref="monitoring-page-items-error-content">
                    <strong data-id-ref="monitoring-page-items-error-title">{t('errorLoadingItems')}</strong>
                    {itemsError.status && (
                      <div className="small mt-1" data-id-ref="monitoring-page-items-error-status">
                        {`Error ${itemsError.status}`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
