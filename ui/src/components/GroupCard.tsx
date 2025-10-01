import React from 'react';
import type { Group } from '../types/api';
import { useLanguage } from '../hooks/useLanguage';
import './GroupCard.css';

interface GroupCardProps {
  group: Group;
  subgroupCount: number;
  itemCount: number;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, subgroupCount, itemCount, onClick }) => {
  const { t, language } = useLanguage();

  // Display Persian name if language is Persian and nameFa is available, otherwise use name
  const displayName = (language === 'fa' && group.nameFa) ? group.nameFa : group.name;

  return (
    <div 
      className="group-card" 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      title={t('openFolder')}
    >
      <div className="group-card-icon">
        <i className="bi bi-folder-fill"></i>
      </div>
      <div className="group-card-content">
        <h6 className="group-card-title">{displayName}</h6>
        <div className="d-flex flex-wrap gap-2">
          {subgroupCount > 0 && (
            <span className="group-card-badge badge bg-primary">
              {subgroupCount} {subgroupCount === 1 ? t('folder') : t('folders2')}
            </span>
          )}
          {itemCount > 0 && (
            <span className="group-card-badge badge bg-info">
              {itemCount} {itemCount === 1 ? t('item') : t('items2')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
