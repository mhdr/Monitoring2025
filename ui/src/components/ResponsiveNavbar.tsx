import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import './ResponsiveNavbar.css';

interface ResponsiveNavbarProps {
  onToggleSidebar?: () => void;
}

const ResponsiveNavbar: React.FC<ResponsiveNavbarProps> = ({ onToggleSidebar }) => {
  const { t, language, changeLanguage } = useLanguage();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const getUserDisplayName = () => {
    // Use Persian names if language is Persian and they are available
    if (language === 'fa') {
      if (user?.firstNameFa && user?.lastNameFa) {
        return `${user.firstNameFa} ${user.lastNameFa}`;
      }
      if (user?.firstNameFa) {
        return user.firstNameFa;
      }
      if (user?.lastNameFa) {
        return user.lastNameFa;
      }
    }
    
    // Use English names or fall back to English if Persian is not available
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.lastName) {
      return user.lastName;
    }
    
    return user?.userName || '';
  };

  return (
    <Navbar 
      expand="lg" 
      className="custom-navbar shadow"
    >
      <Container fluid>
        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            className="btn btn-link text-white me-2 p-0 sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            type="button"
          >
            <i className="bi bi-list fs-4"></i>
          </button>
        )}
        
        <Navbar.Brand 
          href="#" 
          className="fw-bold fs-4 text-white navbar-brand-gradient"
        >
          {t('monitoring')}
        </Navbar.Brand>
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          className="border-0 text-white"
        />
        <Navbar.Collapse id="basic-navbar-nav" className="custom-collapse">
          <Nav className="me-auto">
                {/*TODO: Add navigation links here*/}
                {/* Example Nav Links */}
          </Nav>
          
          {/* User Menu */}
          <Nav>
            <NavDropdown
              title={
                <span className="text-white fw-medium">
                  <i className="fas fa-user-circle me-2" aria-hidden="true"></i>
                  {getUserDisplayName()}
                </span>
              }
              id="user-nav-dropdown"
              className="user-dropdown"
              align="end"
            >
              <NavDropdown.Item href="#profile" className="py-2">
                <i className="fas fa-user me-2" aria-hidden="true"></i>
                {t('profile')}
              </NavDropdown.Item>
              <NavDropdown.Item href="#settings" className="py-2">
                <i className="fas fa-cog me-2" aria-hidden="true"></i>
                {t('settings')}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              
              {/* Language Switcher */}
              <NavDropdown.Header className="py-1 text-muted small">
                🌐 Language / زبان
              </NavDropdown.Header>
              <NavDropdown.Item 
                onClick={() => changeLanguage('fa')}
                className={`py-2 ${language === 'fa' ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-globe me-2" aria-hidden="true"></i>
                فارسی
                {language === 'fa' && <i className="fas fa-check ms-2 text-success" aria-hidden="true"></i>}
              </NavDropdown.Item>
              <NavDropdown.Item 
                onClick={() => changeLanguage('en')}
                className={`py-2 ${language === 'en' ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-globe me-2" aria-hidden="true"></i>
                English
                {language === 'en' && <i className="fas fa-check ms-2 text-success" aria-hidden="true"></i>}
              </NavDropdown.Item>
              
              <NavDropdown.Divider />
              <NavDropdown.Item 
                onClick={handleLogout}
                className="py-2 text-danger"
                style={{ cursor: 'pointer' }}
              >
                <i className="fas fa-sign-out-alt me-2" aria-hidden="true"></i>
                {t('logout')}
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default ResponsiveNavbar;