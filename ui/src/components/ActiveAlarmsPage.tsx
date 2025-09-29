import React from 'react';
import { Spinner, Alert, Table, Badge, Button } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import { useGetActiveAlarmsQuery, useAcknowledgeAlarmMutation } from '../store/api/apiSlice';
import type { Alarm } from '../types/api';

const ActiveAlarmsPage: React.FC = () => {
  const { t } = useLanguage();
  const { data: alarms, error, isLoading, refetch } = useGetActiveAlarmsQuery();
  const [acknowledgeAlarm, { isLoading: isAcknowledging }] = useAcknowledgeAlarmMutation();

  const handleAcknowledge = async (alarmId: string) => {
    try {
      await acknowledgeAlarm({ alarmId }).unwrap();
      // Data will automatically refetch due to invalidatesTags
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  };

  const getSeverityVariant = (severity: Alarm['severity']) => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container-fluid h-100 d-flex flex-column py-4">
      <div className="row flex-fill">
        <div className="col-12 h-100">
          <div className="card h-100 d-flex flex-column">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="card-title mb-0">{t('activeAlarms')}</h4>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : 'Refresh'}
              </Button>
            </div>
            <div className="card-body flex-fill">
              {isLoading && (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <Spinner animation="border" />
                </div>
              )}
              
              {error && (
                <Alert variant="danger">
                  Error loading alarms: {(error as { message?: string })?.message || 'Unknown error'}
                </Alert>
              )}
              
              {alarms && alarms.length === 0 && (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <p className="text-muted">No active alarms</p>
                </div>
              )}
              
              {alarms && alarms.length > 0 && (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Source</th>
                        <th>Timestamp</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alarms.map((alarm) => (
                        <tr key={alarm.id}>
                          <td>
                            <Badge bg={getSeverityVariant(alarm.severity)}>
                              {alarm.severity.toUpperCase()}
                            </Badge>
                          </td>
                          <td>{alarm.title}</td>
                          <td>{alarm.description}</td>
                          <td>{alarm.source}</td>
                          <td>{formatTimestamp(alarm.timestamp)}</td>
                          <td>
                            {alarm.status === 'active' && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleAcknowledge(alarm.id)}
                                disabled={isAcknowledging}
                              >
                                {isAcknowledging ? <Spinner size="sm" /> : 'Acknowledge'}
                              </Button>
                            )}
                            {alarm.status === 'acknowledged' && (
                              <Badge bg="success">Acknowledged</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlarmsPage;