import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchGroups, fetchItems, setCurrentFolderId, fetchValues } from '../store/slices/monitoringSlice';
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
    values: itemValues,
    valuesLoading: isRefreshing,
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

  // Poll values every 5 seconds for items in current folder
  useEffect(() => {
    // Only poll if we're in a folder with items
    if (!currentFolderItems || currentFolderItems.length === 0) {
      return;
    }

    // Extract item IDs from current folder items
    const itemIds = currentFolderItems.map((item) => item.id);

    // Fetch values immediately on mount or folder change
    dispatch(fetchValues({ itemIds }));

    // Set up interval to fetch values every 5 seconds
    const intervalId = setInterval(() => {
      dispatch(fetchValues({ itemIds }));
    }, 5000);

    // Cleanup: clear interval when component unmounts or folder changes
    return () => {
      clearInterval(intervalId);
    };
  }, [currentFolderItems, dispatch]);

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
      return boolValue ? (item.onText || t('on')) : (item.offText || t('off'));
    }

    // For analog items (type 3 or 4), show value with unit
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return `${numValue.toFixed(2)} ${item.unit || ''}`;
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
    <div className="container-fluid h-100 d-flex flex-column py-4">
      <div className="row flex-fill">
        <div className="col-12 h-100">
          <div className="card h-100 d-flex flex-column">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <h4 className="card-title mb-0">{t('monitoring')}</h4>
                  {showRefreshIndicator && currentFolderItems.length > 0 && (
                    <div className="ms-3 d-flex align-items-center text-muted">
                      <div 
                        className="spinner-border spinner-border-sm me-2" 
                        role="status"
                        style={{ width: '1rem', height: '1rem' }}
                      >
                        <span className="visually-hidden">{t('refreshingData')}</span>
                      </div>
                      <small className="d-none d-md-inline">{t('refreshingData')}</small>
                    </div>
                  )}
                </div>
                {currentFolder && (
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleBreadcrumbClick(currentFolder.parentId || null)}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    {t('backToParent')}
                  </button>
                )}
              </div>
            </div>
            
            <div className="card-body flex-fill overflow-auto">
              {/* Breadcrumb Navigation */}
              {breadcrumbs.length > 0 && (
                <nav aria-label="breadcrumb" className="mb-4">
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleBreadcrumbClick(null);
                        }}
                      >
                        <i className="bi bi-house-door-fill me-1"></i>
                        {t('rootFolder')}
                      </a>
                    </li>
                    {breadcrumbs.map((folder, index) => (
                      <li 
                        key={folder.id} 
                        className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                        aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
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
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">{t('loadingGroups')}</span>
                    </div>
                    <p className="text-muted">{t('loadingGroups')}</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>
                    <strong>{t('errorLoadingGroups')}</strong>
                    {error.status && (
                      <div className="small mt-1">
                        {`Error ${error.status}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && childGroups.length === 0 && (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="text-center text-muted">
                    <i className="bi bi-folder-x" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3">
                      {currentFolder ? t('noItemsInFolder') : t('noGroups')}
                    </p>
                  </div>
                </div>
              )}

              {/* Folder Grid View */}
              {!isLoading && !error && childGroups.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-folder-fill me-2 text-warning"></i>
                    <h5 className="mb-0">
                      {t('folders')}
                    </h5>
                    <span className="badge bg-secondary ms-2">
                      {childGroups.length}
                    </span>
                  </div>
                  
                  <div className="groups-grid">
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
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items List View */}
              {!isLoadingItems && !itemsError && currentFolderItems.length > 0 && (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-file-earmark-text-fill me-2 text-primary"></i>
                    <h5 className="mb-0">
                      {t('items')}
                    </h5>
                    <span className="badge bg-secondary ms-2">
                      {currentFolderItems.length}
                    </span>
                  </div>
                  
                  <div className="items-grid">
                    {currentFolderItems.map((item: typeof currentFolderItems[0]) => {
                      const itemValue = getItemValue(item.id);
                      return (
                        <ItemCard
                          key={item.id}
                          name={getItemDisplayName(item)}
                          pointNumber={item.pointNumber}
                          value={itemValue ? formatItemValue(item, itemValue.value) : t('loadingValue')}
                          time={itemValue ? formatTimestamp(itemValue.time) : t('loadingValue')}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items Loading State */}
              {isLoadingItems && (
                <div className="d-flex align-items-center justify-content-center py-4">
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }}>
                      <span className="visually-hidden">{t('loadingItems')}</span>
                    </div>
                    <p className="text-muted small">{t('loadingItems')}</p>
                  </div>
                </div>
              )}

              {/* Items Error State */}
              {itemsError && (
                <div className="alert alert-warning d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div>
                    <strong>{t('errorLoadingItems')}</strong>
                    {itemsError.status && (
                      <div className="small mt-1">
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
