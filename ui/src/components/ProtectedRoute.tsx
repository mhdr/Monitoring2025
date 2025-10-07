import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppSelector } from '../hooks/useRedux';
import { Container, Spinner, Row, Col } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { isDataSyncNeeded, buildSyncUrl, pathRequiresSync } from '../utils/syncUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const monitoringState = useAppSelector((state) => state.monitoring);

  if (isLoading) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center" data-id-ref="protected-route-loading-container">
        <Row data-id-ref="protected-route-loading-row">
          <Col className="text-center" data-id-ref="protected-route-loading-col">
            <Spinner animation="border" role="status" variant="primary" className="mb-3" data-id-ref="protected-route-loading-spinner">
              <span className="visually-hidden" data-id-ref="protected-route-loading-spinner-label">{t('loading')}</span>
            </Spinner>
            <p className="text-muted" data-id-ref="protected-route-loading-text">{t('loading')}</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!isAuthenticated) {
    // Save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated and current path requires sync but data is not synced, redirect to sync
  if (pathRequiresSync(location.pathname) && isDataSyncNeeded(monitoringState)) {
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const syncUrl = buildSyncUrl(currentUrl);
    return <Navigate to={syncUrl} replace data-id-ref="protected-route-navigate-sync" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;