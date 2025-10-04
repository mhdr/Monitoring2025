import React, { useEffect, useRef } from 'react';

// Extend window type for Bootstrap 5
declare global {
  interface Window {
    bootstrap?: {
  Tooltip?: new (element: HTMLElement) => unknown;
    };
  }
}
import { useLanguage } from '../hooks/useLanguage';
import './ItemCard.css';

interface ItemCardProps {
  name: string;
  pointNumber: number;
  value: string;
  time: string;
}

const ItemCard: React.FC<ItemCardProps> = ({ name, pointNumber, value, time }) => {
  const { t } = useLanguage();
  const openBtnRef = useRef<HTMLButtonElement>(null);
  // Initialize Bootstrap tooltip on mount
  useEffect(() => {
    if (openBtnRef.current && window.bootstrap && window.bootstrap.Tooltip) {
      new window.bootstrap.Tooltip(openBtnRef.current);
    }
  }, []);

  const handleOpenNewTab = () => {
    // Open a blank new tab/window; content will be added later by the user
    try {
      window.open('', '_blank');
    } catch (e) {
      // no-op - window may be undefined in some test environments
      // keep silent to avoid breaking UI; log warning in dev
      console.warn('Could not open new tab', e);
    }
  };

  return (
    <div className="item-card" data-id-ref="item-card-root-container">
      <div className="item-card-header" data-id-ref="item-card-header">
        <h6 className="item-card-title" data-id-ref="item-card-title">{name}</h6>
        <button 
          className="item-card-open-btn" 
          data-id-ref="item-card-open-new-tab-button"
          aria-label={t('openInNewTab')}
          type="button"
          onClick={handleOpenNewTab}
          data-bs-toggle="tooltip"
          title={t('openInNewTab')}
          ref={openBtnRef}
        >
          <i className="bi bi-box-arrow-up-right" data-id-ref="item-card-open-icon"></i>
        </button>
      </div>
      <div className="item-card-body" data-id-ref="item-card-body">
        <div className="item-card-row" data-id-ref="item-card-row-point-number">
          <span className="item-card-label" data-id-ref="item-card-label-point-number">{t('pointNumber')}:</span>
          <span className="item-card-value" data-id-ref="item-card-value-point-number">{pointNumber}</span>
        </div>
        <div className="item-card-row" data-id-ref="item-card-row-value">
          <span className="item-card-label" data-id-ref="item-card-label-value">{t('value')}:</span>
          <span className="item-card-value" data-id-ref="item-card-value-value">{value}</span>
        </div>
        <div className="item-card-row" data-id-ref="item-card-row-time">
          <span className="item-card-label" data-id-ref="item-card-label-time">{t('time')}:</span>
          <span className="item-card-value" data-id-ref="item-card-value-time">{time}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
