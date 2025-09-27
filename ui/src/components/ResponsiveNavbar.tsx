import { Navbar, Nav, Container } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import './ResponsiveNavbar.css';

const ResponsiveNavbar = () => {
  const { t } = useLanguage();

  return (
    <Navbar 
      expand="lg" 
      className="custom-navbar shadow rounded-3 mx-2 mx-md-3 mb-3 mb-md-4"
    >
      <Container>
        <Navbar.Brand 
          href="#" 
          className="fw-bold fs-4 text-white navbar-brand-gradient"
        >
          {t('monitoring')} {t('warehouse')}
        </Navbar.Brand>
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          className="border-0 text-white"
        />
        <Navbar.Collapse id="basic-navbar-nav" className="custom-collapse">
          <Nav className="ms-auto">
            <Nav.Link 
              href="#dashboard" 
              className="text-white fw-medium px-3 py-2 rounded nav-link-hover me-1"
            >
              {t('dashboard')}
            </Nav.Link>
            <Nav.Link 
              href="#warehouse" 
              className="text-white fw-medium px-3 py-2 rounded nav-link-hover me-1"
            >
              {t('warehouse')}
            </Nav.Link>
            <Nav.Link 
              href="#reports" 
              className="text-white fw-medium px-3 py-2 rounded nav-link-hover me-1"
            >
              {t('reports')}
            </Nav.Link>
            <Nav.Link 
              href="#settings" 
              className="text-white fw-medium px-3 py-2 rounded nav-link-hover"
            >
              {t('settings')}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default ResponsiveNavbar;