import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

const DataTablePage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div
      className="container-fluid h-100 d-flex flex-column py-4"
      data-id-ref="data-table-page-container"
    >
      <div className="row flex-fill" data-id-ref="data-table-page-row">
        <div className="col-12 h-100" data-id-ref="data-table-page-col">
          <div
            className="card h-100 d-flex flex-column"
            data-id-ref="data-table-page-card"
          >
            <div className="card-header" data-id-ref="data-table-page-card-header">
              <h4 className="card-title mb-0" data-id-ref="data-table-page-title">
                {t('dataTable')}
              </h4>
            </div>
            <div
              className="card-body flex-fill d-flex align-items-center justify-content-center"
              data-id-ref="data-table-page-card-body"
            >
              <p className="text-muted" data-id-ref="data-table-page-placeholder">
                {t('dataTable')} page content will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTablePage;
