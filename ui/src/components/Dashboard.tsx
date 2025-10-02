import React from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container-fluid py-4" data-id-ref="dashboard-main-container">
      <div className="row" data-id-ref="dashboard-main-row">
        <div className="col-12" data-id-ref="dashboard-main-col">
          <div className="card" data-id-ref="dashboard-main-card">
            <div className="card-header" data-id-ref="dashboard-header">
              <h4 className="card-title mb-0" data-id-ref="dashboard-title">{t('dashboard')}</h4>
            </div>
            <div className="card-body" data-id-ref="dashboard-body">
              <Alert variant="info" data-id-ref="dashboard-info-alert">
                <Alert.Heading data-id-ref="dashboard-info-alert-heading">Dashboard Not Available</Alert.Heading>
                <p data-id-ref="dashboard-info-alert-text">
                  Dashboard data is not currently available. The monitoring endpoints have been temporarily disabled as they are not yet implemented on the backend.
                </p>
              </Alert>
              <Row className="mb-4" data-id-ref="dashboard-stats-row">
                <Col md={3} data-id-ref="dashboard-total-alarms-col">
                  <Card className="text-white bg-secondary" data-id-ref="dashboard-total-alarms-card">
                    <Card.Body data-id-ref="dashboard-total-alarms-card-body">
                      <Card.Title data-id-ref="dashboard-total-alarms-title">Total Alarms</Card.Title>
                      <Card.Text className="h2" data-id-ref="dashboard-total-alarms-value">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} data-id-ref="dashboard-active-alarms-col">
                  <Card className="text-white bg-secondary" data-id-ref="dashboard-active-alarms-card">
                    <Card.Body data-id-ref="dashboard-active-alarms-card-body">
                      <Card.Title data-id-ref="dashboard-active-alarms-title">Active Alarms</Card.Title>
                      <Card.Text className="h2" data-id-ref="dashboard-active-alarms-value">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} data-id-ref="dashboard-warning-alarms-col">
                  <Card className="text-white bg-secondary" data-id-ref="dashboard-warning-alarms-card">
                    <Card.Body data-id-ref="dashboard-warning-alarms-card-body">
                      <Card.Title data-id-ref="dashboard-warning-alarms-title">Warning Alarms</Card.Title>
                      <Card.Text className="h2" data-id-ref="dashboard-warning-alarms-value">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3} data-id-ref="dashboard-sensors-col">
                  <Card className="text-white bg-secondary" data-id-ref="dashboard-sensors-card">
                    <Card.Body data-id-ref="dashboard-sensors-card-body">
                      <Card.Title data-id-ref="dashboard-sensors-title">Sensors</Card.Title>
                      <Card.Text className="h2" data-id-ref="dashboard-sensors-value">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Row data-id-ref="dashboard-activity-status-row">
                <Col md={8} data-id-ref="dashboard-recent-activity-col">
                  <Card data-id-ref="dashboard-recent-activity-card">
                    <Card.Header data-id-ref="dashboard-recent-activity-header">
                      <Card.Title data-id-ref="dashboard-recent-activity-title">Recent Activity</Card.Title>
                    </Card.Header>
                    <Card.Body data-id-ref="dashboard-recent-activity-body">
                      <Alert variant="secondary" data-id-ref="dashboard-recent-activity-alert">
                        No recent activity available at this time.
                      </Alert>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4} data-id-ref="dashboard-system-status-col">
                  <Card data-id-ref="dashboard-system-status-card">
                    <Card.Header data-id-ref="dashboard-system-status-header">
                      <Card.Title data-id-ref="dashboard-system-status-title">System Status</Card.Title>
                    </Card.Header>
                    <Card.Body data-id-ref="dashboard-system-status-body">
                      <div className="text-center" data-id-ref="dashboard-system-status-text">
                        System Status: <span className="badge bg-secondary" data-id-ref="dashboard-system-status-badge">
                          UNKNOWN
                        </span>
                      </div>
                      <div className="mt-3" data-id-ref="dashboard-system-status-updated">
                        <small className="text-muted" data-id-ref="dashboard-system-status-updated-text">
                          Last updated: Not available
                        </small>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
