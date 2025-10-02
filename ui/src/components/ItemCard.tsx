import React from 'react';
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

  return (
    <div className="item-card" data-id-ref="item-card-root-container">
      <div className="item-card-header d-flex align-items-center" data-id-ref="item-card-header">
        <h6 className="item-card-title" data-id-ref="item-card-title">{name}</h6>
        <button
          type="button"
          className="btn btn-link ms-auto p-0 item-card-open-btn"
          aria-label={t('itemCard.openInNewTab')}
          title={t('itemCard.openInNewTab')}
          data-id-ref="item-card-open-button"
          onClick={() => window.open('', '_blank')}
        >
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
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
