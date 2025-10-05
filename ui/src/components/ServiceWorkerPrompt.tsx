import { useServiceWorker } from '../hooks/useServiceWorker';
import './ServiceWorkerPrompt.css';

/**
 * ServiceWorkerPrompt Component
 * 
 * Displays notifications for:
 * - New app updates available (with update button)
 * - Offline readiness confirmation
 * 
 * Uses Bootstrap toast-style notifications with RTL support.
 */
const ServiceWorkerPrompt = () => {
  const {
    offlineReady,
    needRefresh,
    updateServiceWorkerAndReload,
    closeUpdateNotification,
    closeOfflineNotification,
    t,
  } = useServiceWorker();

  // Don't render if no notifications
  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <>
      {/* Update Available Notification */}
      {needRefresh && (
        <div 
          className="service-worker-toast toast-update show" 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          data-id-ref="service-worker-update-toast"
        >
          <div className="toast-header">
            <svg 
              className="bi flex-shrink-0 me-2" 
              width="16" 
              height="16" 
              role="img" 
              aria-label="Update:"
              data-id-ref="service-worker-update-icon"
            >
              <use xlinkHref="#info-fill"/>
            </svg>
            <strong className="me-auto" data-id-ref="service-worker-update-title">
              {t('serviceWorker.updateTitle')}
            </strong>
            <button 
              type="button" 
              className="btn-close" 
              onClick={closeUpdateNotification}
              aria-label={t('common.buttons.close')}
              data-id-ref="service-worker-update-close-button"
            />
          </div>
          <div className="toast-body" data-id-ref="service-worker-update-body">
            <p data-id-ref="service-worker-update-message">
              {t('serviceWorker.updateMessage')}
            </p>
            <div className="mt-2 pt-2 border-top">
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={updateServiceWorkerAndReload}
                data-id-ref="service-worker-update-reload-button"
              >
                {t('serviceWorker.updateButton')}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm ms-2"
                onClick={closeUpdateNotification}
                data-id-ref="service-worker-update-later-button"
              >
                {t('common.buttons.later')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Ready Notification */}
      {offlineReady && (
        <div 
          className="service-worker-toast toast-offline show" 
          role="alert" 
          aria-live="polite" 
          aria-atomic="true"
          data-id-ref="service-worker-offline-toast"
        >
          <div className="toast-header">
            <svg 
              className="bi flex-shrink-0 me-2" 
              width="16" 
              height="16" 
              role="img" 
              aria-label="Success:"
              data-id-ref="service-worker-offline-icon"
            >
              <use xlinkHref="#check-circle-fill"/>
            </svg>
            <strong className="me-auto" data-id-ref="service-worker-offline-title">
              {t('serviceWorker.offlineTitle')}
            </strong>
            <button 
              type="button" 
              className="btn-close" 
              onClick={closeOfflineNotification}
              aria-label={t('common.buttons.close')}
              data-id-ref="service-worker-offline-close-button"
            />
          </div>
          <div className="toast-body" data-id-ref="service-worker-offline-body">
            {t('serviceWorker.offlineMessage')}
          </div>
        </div>
      )}

      {/* Bootstrap Icons SVG Symbols */}
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
        <symbol id="check-circle-fill" fill="currentColor" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </symbol>
        <symbol id="info-fill" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
        </symbol>
      </svg>
    </>
  );
};

export default ServiceWorkerPrompt;
