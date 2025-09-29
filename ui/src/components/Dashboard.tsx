import React from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';
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
              <Alert variant="info">
                <Alert.Heading>Dashboard Not Available</Alert.Heading>
                <p>
                  Dashboard data is not currently available. The monitoring endpoints have been temporarily disabled as they are not yet implemented on the backend.
                </p>
              </Alert>
              
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-white bg-secondary">
                    <Card.Body>
                      <Card.Title>Total Alarms</Card.Title>
                      <Card.Text className="h2">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-white bg-secondary">
                    <Card.Body>
                      <Card.Title>Active Alarms</Card.Title>
                      <Card.Text className="h2">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-white bg-secondary">
                    <Card.Body>
                      <Card.Title>Warning Alarms</Card.Title>
                      <Card.Text className="h2">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-white bg-secondary">
                    <Card.Body>
                      <Card.Title>Sensors</Card.Title>
                      <Card.Text className="h2">-</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col md={8}>
                  <Card>
                    <Card.Header>
                      <Card.Title>Recent Activity</Card.Title>
                    </Card.Header>
                    <Card.Body>
                      <Alert variant="secondary">
                        No recent activity available at this time.
                      </Alert>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card>
                    <Card.Header>
                      <Card.Title>System Status</Card.Title>
                    </Card.Header>
                    <Card.Body>
                      <div className="text-center">
                        System Status: <span className="badge bg-secondary">
                          UNKNOWN
                        </span>
                      </div>
                      <div className="mt-3">
                        <small className="text-muted">
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
