import React from 'react';
import { Spinner, Alert, Row, Col, Card } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { useGetDashboardDataQuery } from '../store/api/apiSlice';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { data: dashboardData, error, isLoading } = useGetDashboardDataQuery();

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">{t('dashboard')}</h4>
            </div>
            <div className="card-body">
              {isLoading && (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" />
                </div>
              )}
              
              {error && (
                <Alert variant="danger">
                  Error loading dashboard data: {(error as { message?: string })?.message || 'Unknown error'}
                </Alert>
              )}
              
              {dashboardData && (
                <>
                  <Row className="mb-4">
                    <Col md={3}>
                      <Card className="text-white bg-primary">
                        <Card.Body>
                          <Card.Title>Total Alarms</Card.Title>
                          <Card.Text className="h2">{dashboardData.totalAlarms}</Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-white bg-danger">
                        <Card.Body>
                          <Card.Title>Active Alarms</Card.Title>
                          <Card.Text className="h2">{dashboardData.activeAlarms}</Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-white bg-warning">
                        <Card.Body>
                          <Card.Title>Critical Alarms</Card.Title>
                          <Card.Text className="h2">{dashboardData.criticalAlarms}</Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-white bg-success">
                        <Card.Body>
                          <Card.Title>Acknowledged</Card.Title>
                          <Card.Text className="h2">{dashboardData.acknowledgedAlarms}</Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  
                  <div className="row">
                    <div className="col-lg-8">
                      <h5 className="mb-3">{t('welcome')}</h5>
                      <p className="text-muted mb-4">
                        {t('systemDescription')}
                      </p>
                      <p className="text-muted">
                        System Status: <span className={`badge bg-${dashboardData.systemStatus === 'healthy' ? 'success' : dashboardData.systemStatus === 'warning' ? 'warning' : 'danger'}`}>
                          {dashboardData.systemStatus.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-muted">
                        Last Updated: {new Date(dashboardData.lastUpdate).toLocaleString()}
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
                </>
              )}
              
              {!isLoading && !error && !dashboardData && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;