import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { monitoringApi } from '../services/api';
import type { Group, GroupsResponseDto, ItemsResponseDto } from '../types/api';
import type { ApiError } from '../types/auth';
import GroupCard from './GroupCard';

const MonitoringPage: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  
  const [data, setData] = useState<GroupsResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  
  const [itemsData, setItemsData] = useState<ItemsResponseDto | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState<ApiError | null>(null);

  // Fetch groups data
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await monitoringApi.getGroups();
        setData(response);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []); // Empty dependency array - fetch once on mount

  // Fetch items data
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoadingItems(true);
        setItemsError(null);
        const response = await monitoringApi.getItems({ showOrphans: false });
        setItemsData(response);
      } catch (err) {
        setItemsError(err as ApiError);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, []); // Empty dependency array - fetch once on mount

  // Get current folder and its children
  const { currentFolder, childGroups, breadcrumbs } = useMemo(() => {
    if (!data?.groups) {
      return { currentFolder: null, childGroups: [], breadcrumbs: [] };
    }

    const allGroups = data.groups;
    
    // If no folderId, we're at root
    if (!currentFolderId) {
      const rootGroups = allGroups.filter(g => !g.parentId || g.parentId === null);
      return { currentFolder: null, childGroups: rootGroups, breadcrumbs: [] };
    }

    // Find current folder
    const folder = allGroups.find(g => g.id === currentFolderId);
    if (!folder) {
      return { currentFolder: null, childGroups: [], breadcrumbs: [] };
    }

    // Get children of current folder
    const children = allGroups.filter(g => g.parentId === currentFolderId);

    // Build breadcrumb trail
    const trail: Group[] = [];
    let current: Group | undefined = folder;
    while (current) {
      trail.unshift(current);
      current = current.parentId ? allGroups.find(g => g.id === current!.parentId) : undefined;
    }

    return { currentFolder: folder, childGroups: children, breadcrumbs: trail };
  }, [data?.groups, currentFolderId]);

  // Get items for current folder
  const currentFolderItems = useMemo(() => {
    if (!itemsData?.items) {
      return [];
    }

    // Filter items by current folder/group
    if (!currentFolderId) {
      // At root level - show items with no groupId
      return itemsData.items.filter(item => !item.groupId || item.groupId === null);
    }

    // Show items belonging to current folder
    return itemsData.items.filter(item => item.groupId === currentFolderId);
  }, [itemsData?.items, currentFolderId]);

  const allGroups = data?.groups || [];

  // Helper function to get display name based on language
  const getDisplayName = (group: Group) => {
    return (language === 'fa' && group.nameFa) ? group.nameFa : group.name;
  };

  // Helper function to get item display name based on language
  const getItemDisplayName = (item: typeof currentFolderItems[0]) => {
    return (language === 'fa' && item.nameFa) ? item.nameFa : item.name;
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
                <h4 className="card-title mb-0">{t('monitoring')}</h4>
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
                    {childGroups.map((group) => {
                      const subgroupCount = allGroups.filter(g => g.parentId === group.id).length;
                      return (
                        <GroupCard
                          key={group.id}
                          group={group}
                          subgroupCount={subgroupCount}
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
                  
                  <div className="list-group">
                    {currentFolderItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      >
                        <div className="d-flex align-items-center flex-grow-1">
                          <i className="bi bi-file-earmark me-3 text-muted"></i>
                          <div>
                            <div className="fw-semibold">{getItemDisplayName(item)}</div>
                            <small className="text-muted">
                              {t('pointNumber')}: {item.pointNumber}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
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
