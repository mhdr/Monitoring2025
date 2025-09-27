import { Navbar, Nav, Container } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import './ResponsiveNavbar.css';

const ResponsiveNavbar = () => {
  const { t } = useLanguage();

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="custom-navbar mb-4">
      <Container>
        <Navbar.Brand href="#" className="navbar-brand-custom">
          {t('monitoring')} {t('warehouse')}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link href="#dashboard" className="nav-link-custom">
              {t('dashboard')}
            </Nav.Link>
            <Nav.Link href="#warehouse" className="nav-link-custom">
              {t('warehouse')}
            </Nav.Link>
            <Nav.Link href="#reports" className="nav-link-custom">
              {t('reports')}
            </Nav.Link>
            <Nav.Link href="#settings" className="nav-link-custom">
              {t('settings')}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default ResponsiveNavbar;