import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const DisabledAlarmsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div
      className="container-fluid h-100 d-flex flex-column py-4"
      data-id-ref="disabled-alarms-page-root-container"
    >
      <div className="row flex-fill" data-id-ref="disabled-alarms-page-row">
        <div className="col-12 h-100" data-id-ref="disabled-alarms-page-col">
          <div className="card h-100 d-flex flex-column" data-id-ref="disabled-alarms-page-card">
            <div className="card-header" data-id-ref="disabled-alarms-page-card-header">
              <h4 className="card-title mb-0" data-id-ref="disabled-alarms-page-title">
                {t('disabledAlarms')}
              </h4>
            </div>
            <div className="card-body flex-fill d-flex align-items-center justify-content-center" data-id-ref="disabled-alarms-page-card-body">
              <p className="text-muted" data-id-ref="disabled-alarms-page-content-placeholder">
                {t('disabledAlarms')} page content will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisabledAlarmsPage;