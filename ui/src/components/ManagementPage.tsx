import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const ManagementPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid h-100 d-flex flex-column py-4">
      <div className="row flex-fill">
        <div className="col-12 h-100">
          <div className="card h-100 d-flex flex-column">
            <div className="card-header">
              <h4 className="card-title mb-0">{t('management')}</h4>
            </div>
            <div className="card-body flex-fill d-flex align-items-center justify-content-center">
              <p className="text-muted">
                {t('management')} page content will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;