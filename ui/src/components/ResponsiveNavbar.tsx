import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import './ResponsiveNavbar.css';

interface ResponsiveNavbarProps {
  onToggleSidebar?: () => void;
}

const ResponsiveNavbar: React.FC<ResponsiveNavbarProps> = ({ onToggleSidebar }) => {
  const { t, language } = useLanguage();
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
      data-id-ref="responsive-navbar-root"
    >
      <Container fluid data-id-ref="responsive-navbar-container">
        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            className="btn btn-link text-white me-2 p-0 sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            type="button"
            data-id-ref="responsive-navbar-sidebar-toggle-btn"
          >
            <i className="bi bi-list fs-4" data-id-ref="responsive-navbar-sidebar-toggle-icon"></i>
          </button>
        )}
        
        <Navbar.Brand 
          href="#" 
          className="fw-bold fs-4 text-white navbar-brand-gradient"
          data-id-ref="responsive-navbar-brand"
        >
          {t('monitoring')}
        </Navbar.Brand>
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          className="border-0 text-white"
          data-id-ref="responsive-navbar-toggle"
        />
        <Navbar.Collapse id="basic-navbar-nav" className="custom-collapse" data-id-ref="responsive-navbar-collapse">
          <Nav className="me-auto" data-id-ref="responsive-navbar-nav-main">
                {/*TODO: Add navigation links here*/}
                {/* Example Nav Links */}
          </Nav>
          
          {/* User Menu */}
          <Nav data-id-ref="responsive-navbar-user-nav">
            <NavDropdown
              title={
                <span className="text-white fw-medium" data-id-ref="responsive-navbar-user-dropdown-title">
                  <i className="fas fa-user-circle me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-icon"></i>
                  {getUserDisplayName()}
                </span>
              }
              id="user-nav-dropdown"
              className="user-dropdown"
              align="end"
              data-id-ref="responsive-navbar-user-dropdown"
            >
              <NavDropdown.Item as={Link} to="/dashboard/profile" className="py-2" data-id-ref="responsive-navbar-user-profile-link">
                <i className="fas fa-user me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-profile-icon"></i>
                {t('profile')}
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/dashboard/settings" className="py-2" data-id-ref="responsive-navbar-user-settings-link">
                <i className="fas fa-cog me-2" aria-hidden="true" data-id-ref="responsive-navbar-user-settings-icon"></i>
                {t('settingsMenu')}
              </NavDropdown.Item>
              <NavDropdown.Divider data-id-ref="responsive-navbar-user-divider-2" />
              <NavDropdown.Item 
                onClick={handleLogout}
                className="py-2 text-danger"
                style={{ cursor: 'pointer' }}
                data-id-ref="responsive-navbar-logout-link"
              >
                <i className="fas fa-sign-out-alt me-2" aria-hidden="true" data-id-ref="responsive-navbar-logout-icon"></i>
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