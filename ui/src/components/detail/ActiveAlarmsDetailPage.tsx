import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const ActiveAlarmsDetailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid py-4" data-id-ref="active-alarms-detail-page-root">
      <div className="row" data-id-ref="active-alarms-detail-page-header-row">
        <div className="col-12" data-id-ref="active-alarms-detail-page-header-col">
          <h2 className="mb-4" data-id-ref="active-alarms-detail-page-title">
            {t('activeAlarmsDetail')}
          </h2>
        </div>
      </div>
      <div className="row" data-id-ref="active-alarms-detail-page-content-row">
        <div className="col-12" data-id-ref="active-alarms-detail-page-content-col">
          <div className="card" data-id-ref="active-alarms-detail-page-card">
            <div className="card-body" data-id-ref="active-alarms-detail-page-card-body">
              <p className="text-muted" data-id-ref="active-alarms-detail-page-placeholder-text">
                {/* Content will be added later */}
                Active Alarms content coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlarmsDetailPage;
