import './App.css'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { useLanguage } from './hooks/useLanguage'
import LanguageSwitcher from './components/LanguageSwitcher'
import ResponsiveNavbar from './components/ResponsiveNavbar'

function App() {
  const { t } = useLanguage()

  return (
    <>
      <LanguageSwitcher />
      <ResponsiveNavbar />
      <Container fluid className="px-2 px-md-3 px-lg-4">
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            <header className="app-header">
              <h1>{t('monitoring')} {t('warehouse')}</h1>
            </header>
          </Col>
        </Row>
        
        <Row className="justify-content-center">
          <Col xs={12} lg={10} xl={8}>
            <main className="app-main">
              <div className="welcome-section">
                <h2>{t('welcome')}</h2>
                <p>{t('systemDescription')}</p>
              </div>
              
              <Row className="features-grid g-3 g-md-4">
                <Col xs={12} sm={6} lg={4}>
                  <Card className="feature-card h-100">
                    <Card.Body className="d-flex flex-column text-center">
                      <Card.Title as="h3">{t('notifications')}</Card.Title>
                      <Card.Text className="flex-grow-1">
                        {t('notificationDescription')}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                  <Card className="feature-card h-100">
                    <Card.Body className="d-flex flex-column text-center">
                      <Card.Title as="h3">{t('users')}</Card.Title>
                      <Card.Text className="flex-grow-1">
                        {t('userDescription')}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                  <Card className="feature-card h-100">
                    <Card.Body className="d-flex flex-column text-center">
                      <Card.Title as="h3">{t('reports')}</Card.Title>
                      <Card.Text className="flex-grow-1">
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
    </>
  )
}

export default App
