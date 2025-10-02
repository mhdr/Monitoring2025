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
      data-id-ref="group-card-root-container"
    >
      <div className="group-card-icon" data-id-ref="group-card-icon-container">
        <i className="bi bi-folder-fill" data-id-ref="group-card-folder-icon"></i>
      </div>
      <div className="group-card-content" data-id-ref="group-card-content-container">
        <h6 className="group-card-title" data-id-ref="group-card-title-heading">{displayName}</h6>
        <div className="d-flex flex-wrap gap-2" data-id-ref="group-card-badges-row">
          {subgroupCount > 0 && (
            <span className="group-card-badge badge bg-primary" data-id-ref="group-card-subgroup-badge">
              {subgroupCount} {subgroupCount === 1 ? t('folder') : t('folders2')}
            </span>
          )}
          {itemCount > 0 && (
            <span className="group-card-badge badge bg-info" data-id-ref="group-card-item-badge">
              {itemCount} {itemCount === 1 ? t('item') : t('items2')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
