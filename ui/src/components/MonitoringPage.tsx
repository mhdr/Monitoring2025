import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useGetGroupsQuery } from '../store/api/apiSlice';
import type { Group } from '../types/api';
import GroupCard from './GroupCard';

const MonitoringPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  
  const { data, isLoading, isError, error } = useGetGroupsQuery();

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

  const allGroups = data?.groups || [];

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
                <nav aria-label="breadcrumb" className="mb-3">
                  <ol className="breadcrumb">
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
                          folder.name
                        ) : (
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleBreadcrumbClick(folder.id);
                            }}
                          >
                            {folder.name}
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
              {isError && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>
                    <strong>{t('errorLoadingGroups')}</strong>
                    {error && 'status' in error && (
                      <div className="small mt-1">
                        {typeof error.status === 'number' 
                          ? `Error ${error.status}` 
                          : error.status}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && childGroups.length === 0 && (
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
              {!isLoading && !isError && childGroups.length > 0 && (
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-folder-fill me-2 text-warning"></i>
                    <h5 className="mb-0">
                      {currentFolder ? currentFolder.name : t('rootFolder')}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
