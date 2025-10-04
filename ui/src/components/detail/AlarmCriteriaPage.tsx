import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const AlarmCriteriaPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div
      className="container-fluid h-100 d-flex flex-column py-4"
      data-id-ref="alarm-criteria-page-container"
    >
      <div className="row flex-fill" data-id-ref="alarm-criteria-page-row">
        <div className="col-12 h-100" data-id-ref="alarm-criteria-page-col">
          <div
            className="card h-100 d-flex flex-column"
            data-id-ref="alarm-criteria-page-card"
          >
            <div className="card-header" data-id-ref="alarm-criteria-page-card-header">
              <h4 className="card-title mb-0" data-id-ref="alarm-criteria-page-title">
                {t('alarmCriteria')}
              </h4>
            </div>
            <div
              className="card-body flex-fill d-flex align-items-center justify-content-center"
              data-id-ref="alarm-criteria-page-card-body"
            >
              <p className="text-muted" data-id-ref="alarm-criteria-page-placeholder">
                {t('alarmCriteria')} page content will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlarmCriteriaPage;
