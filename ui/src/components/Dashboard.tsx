import React from 'react';
import { Row, Col, Card, Alert, Badge, Spinner } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { useMonitoringStream, StreamStatus } from '../hooks/useMonitoringStream';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  
  // Connect to gRPC streaming service for real-time active alarms count
  const { 
    alarmCount, 
    lastUpdate, 
    status, 
    error, 
    reconnect 
  } = useMonitoringStream('dashboard-client');

  return (
    <div className="container-fluid py-4" data-id-ref="dashboard-main-container">
      <div className="row" data-id-ref="dashboard-main-row">
        <div className="col-12" data-id-ref="dashboard-main-col">
          <div className="card" data-id-ref="dashboard-main-card">
            <div className="card-header" data-id-ref="dashboard-header">
              <h4 className="card-title mb-0" data-id-ref="dashboard-title">{t('dashboard')}</h4>
            </div>
            <div className="card-body" data-id-ref="dashboard-body">
              {/* gRPC Connection Status Alert */}
              {status === StreamStatus.ERROR && (
                <Alert variant="danger" dismissible data-id-ref="dashboard-grpc-error-alert">
                  <Alert.Heading data-id-ref="dashboard-grpc-error-heading">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {t('common.error')}
                  </Alert.Heading>
                  <p data-id-ref="dashboard-grpc-error-text">{error}</p>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={reconnect}
                    data-id-ref="dashboard-grpc-reconnect-button"
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    {t('common.retry')}
                  </button>
                </Alert>
              )}
              
              {status === StreamStatus.CONNECTING && (
                <Alert variant="info" data-id-ref="dashboard-grpc-connecting-alert">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Connecting to monitoring service...
                </Alert>
              )}

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
                  <Card 
                    className={`text-white ${status === StreamStatus.CONNECTED ? 'bg-danger' : 'bg-secondary'}`}
                    data-id-ref="dashboard-active-alarms-card"
                  >
                    <Card.Body data-id-ref="dashboard-active-alarms-card-body">
                      <Card.Title data-id-ref="dashboard-active-alarms-title">
                        Active Alarms
                        {status === StreamStatus.CONNECTED && (
                          <Badge 
                            bg="success" 
                            className="ms-2"
                            data-id-ref="dashboard-active-alarms-live-badge"
                          >
                            <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }}></i> LIVE
                          </Badge>
                        )}
                      </Card.Title>
                      <Card.Text className="h2" data-id-ref="dashboard-active-alarms-value">
                        {status === StreamStatus.CONNECTING ? (
                          <Spinner animation="border" size="sm" />
                        ) : status === StreamStatus.CONNECTED ? (
                          alarmCount
                        ) : (
                          '-'
                        )}
                      </Card.Text>
                      {lastUpdate && (
                        <small className="text-white-50" data-id-ref="dashboard-active-alarms-last-update">
                          Last update: {new Date(lastUpdate).toLocaleTimeString()}
                        </small>
                      )}
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
                      <div className="mb-3" data-id-ref="dashboard-grpc-connection-status">
                        <div className="d-flex align-items-center justify-content-between">
                          <span>gRPC Connection:</span>
                          <Badge 
                            bg={
                              status === StreamStatus.CONNECTED ? 'success' :
                              status === StreamStatus.CONNECTING ? 'warning' :
                              status === StreamStatus.ERROR ? 'danger' :
                              'secondary'
                            }
                            data-id-ref="dashboard-grpc-status-badge"
                          >
                            {status === StreamStatus.CONNECTED && <i className="bi bi-check-circle-fill me-1"></i>}
                            {status === StreamStatus.CONNECTING && <Spinner animation="border" size="sm" className="me-1" />}
                            {status === StreamStatus.ERROR && <i className="bi bi-x-circle-fill me-1"></i>}
                            {status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center" data-id-ref="dashboard-system-status-text">
                        System Status: <span className="badge bg-secondary" data-id-ref="dashboard-system-status-badge">
                          UNKNOWN
                        </span>
                      </div>
                      <div className="mt-3" data-id-ref="dashboard-system-status-updated">
                        <small className="text-muted" data-id-ref="dashboard-system-status-updated-text">
                          Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Not available'}
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
