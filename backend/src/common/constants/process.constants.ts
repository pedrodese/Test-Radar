export const PROCESS_CONSTANTS = {
  STAGES: {
    R: { name: 'Receive', sla: 3600 }, // 1 hour
    I: { name: 'Identify', sla: 7200 }, // 2 hours
    D: { name: 'Decide', sla: 3600 }, // 1 hour
    E: { name: 'Execute', sla: 14400 }, // 4 hours
    C: { name: 'Conclude', sla: 1800 }  // 30 minutes
  },
  ALERT_THRESHOLDS: {
    WARNING: 0.8, // 80% of SLA
    CRITICAL: 1.0 // 100% of SLA
  },
  PROCESS_TYPES: ['maintenance', 'financial', 'supply'] as const,
  MAINTENANCE_TYPES: ['preventive', 'corrective', 'emergency'] as const
} as const; 