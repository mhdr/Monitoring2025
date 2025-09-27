import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { initializeAuth } from '../store/slices/authSlice';
import { Container, Spinner, Row, Col } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { t } = useLanguage();

  // Initialize auth state on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center">
        <Row>
          <Col className="text-center">
            <Spinner animation="border" role="status" variant="primary" className="mb-3">
              <span className="visually-hidden">{t('loading')}</span>
            </Spinner>
            <p className="text-muted">{t('loading')}</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;