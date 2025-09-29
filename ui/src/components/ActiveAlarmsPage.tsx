import React from 'react';
import { Alert } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';

const ActiveAlarmsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid h-100 d-flex flex-column py-4">
      <div className="row flex-fill">
        <div className="col-12 h-100">
          <div className="card h-100 d-flex flex-column">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="card-title mb-0">{t('activeAlarms')}</h4>
            </div>
            <div className="card-body flex-fill">
              <Alert variant="info">
                <Alert.Heading>Active Alarms Not Available</Alert.Heading>
                <p>
                  Active alarms data is not currently available. The monitoring endpoints have been temporarily disabled as they are not yet implemented on the backend.
                </p>
              </Alert>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlarmsPage;
