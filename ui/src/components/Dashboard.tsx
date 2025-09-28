import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">{t('dashboard')}</h4>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-8">
                  <h5 className="mb-3">{t('welcome')}</h5>
                  <p className="text-muted mb-4">
                    {t('systemDescription')}
                  </p>
                  <p className="text-muted">
                    Use the sidebar navigation to access different sections of the monitoring system.
                  </p>
                </div>
                <div className="col-lg-4">
                  <div className="card bg-primary text-white">
                    <div className="card-body">
                      <h6 className="card-title">{t('systemTitle')}</h6>
                      <p className="card-text small">
                        Navigate using the menu to explore monitoring features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;