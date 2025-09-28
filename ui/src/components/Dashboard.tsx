import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import ResponsiveNavbar from './ResponsiveNavbar';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="d-flex flex-column vh-100">
      <ResponsiveNavbar />
      <Container fluid className="flex-grow-1 px-2 px-md-3 px-lg-4 py-3">
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            <header className="bg-gradient text-white p-3 p-md-4 rounded-3 mb-3 mb-md-4 shadow text-center">
              <h1 className="h2 h-md-1 fw-bold mb-0">{t('monitoring')} {t('warehouse')}</h1>
            </header>
          </Col>
        </Row>
        
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            <main className="bg-light bg-opacity-10 p-3 p-md-4 rounded-3 border border-light border-opacity-25">
              <div className="text-center mb-4 mb-md-5">
                <h2 className="h3 h-md-2 text-primary mb-3">{t('welcome')}</h2>
                <p className="lead mb-0 text-light text-opacity-75">{t('systemDescription')}</p>
              </div>
              
              <Row className="g-3 g-md-4 mt-3 mt-md-4">
                <Col xs={12} sm={6} lg={4}>
                  <Card className="h-100 bg-light bg-opacity-10 border-light border-opacity-25 shadow-sm hover-lift">
                    <Card.Body className="d-flex flex-column text-center p-3 p-md-4">
                      <Card.Title as="h3" className="h5 text-info mb-3">{t('notifications')}</Card.Title>
                      <Card.Text className="flex-grow-1 text-light text-opacity-75 mb-0">
                        {t('notificationDescription')}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                  <Card className="h-100 bg-light bg-opacity-10 border-light border-opacity-25 shadow-sm hover-lift">
                    <Card.Body className="d-flex flex-column text-center p-3 p-md-4">
                      <Card.Title as="h3" className="h5 text-info mb-3">{t('users')}</Card.Title>
                      <Card.Text className="flex-grow-1 text-light text-opacity-75 mb-0">
                        {t('userDescription')}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                  <Card className="h-100 bg-light bg-opacity-10 border-light border-opacity-25 shadow-sm hover-lift">
                    <Card.Body className="d-flex flex-column text-center p-3 p-md-4">
                      <Card.Title as="h3" className="h5 text-info mb-3">{t('reports')}</Card.Title>
                      <Card.Text className="flex-grow-1 text-light text-opacity-75 mb-0">
                        {t('reportDescription')}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </main>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Dashboard;