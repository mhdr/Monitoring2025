import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const AuditTrailPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">{t('auditTrail')}</h4>
            </div>
            <div className="card-body">
              <p className="text-muted">
                {t('auditTrail')} page content will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailPage;