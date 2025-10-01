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
    <div className="item-card">
      <div className="item-card-header">
        <h6 className="item-card-title">{name}</h6>
      </div>
      <div className="item-card-body">
        <div className="item-card-row">
          <span className="item-card-label">{t('pointNumber')}:</span>
          <span className="item-card-value">{pointNumber}</span>
        </div>
        <div className="item-card-row">
          <span className="item-card-label">{t('value')}:</span>
          <span className="item-card-value">{value}</span>
        </div>
        <div className="item-card-row">
          <span className="item-card-label">{t('time')}:</span>
          <span className="item-card-value">{time}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
