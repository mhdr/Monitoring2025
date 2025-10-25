import React, { Suspense } from 'react';
import LoadingScreen from './LoadingScreen';
import LazyErrorBoundary from './LazyErrorBoundary';

interface LazyRouteProps {
  component: React.LazyExoticComponent<React.ComponentType<object>>;
}

const LazyRoute = ({ component: Component }: LazyRouteProps): React.ReactElement => {
  return (
    <LazyErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Component />
      </Suspense>
    </LazyErrorBoundary>
  );
};

export default LazyRoute;
