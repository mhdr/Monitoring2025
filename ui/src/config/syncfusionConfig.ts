/**
 * Syncfusion Configuration
 * 
 * This file contains the Syncfusion license key and initialization logic.
 * The license key is registered when this module is imported.
 */

import { registerLicense } from '@syncfusion/ej2-base';

// Syncfusion License Key
// This key should be kept secure and not exposed in public repositories
const SYNCFUSION_LICENSE_KEY = 'Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH1ccnRQRmFcVkVxWEpWYEs=';

/**
 * Initialize Syncfusion license
 * Call this function once at app startup
 */
export function initSyncfusion(): void {
  registerLicense(SYNCFUSION_LICENSE_KEY);
}

// Auto-register license when this module is imported
registerLicense(SYNCFUSION_LICENSE_KEY);
