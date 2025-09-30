import React from 'react';
import type { Group } from '../types/api';
import { useLanguage } from '../hooks/useLanguage';
import './GroupCard.css';

interface GroupCardProps {
  group: Group;
  subgroupCount: number;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, subgroupCount, onClick }) => {
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
        {subgroupCount > 0 && (
          <span className="group-card-badge badge bg-primary">
            {subgroupCount} {subgroupCount === 1 ? t('folder') : t('folders')}
          </span>
        )}
      </div>
    </div>
  );
};

export default GroupCard;
