import { describe, it, expect } from 'vitest';
import { validateAgentMessage } from './messageValidator';

describe('validateAgentMessage', () => {
  it('validates compliant message envelopes', () => {
    const envelope = {
      sender: 'auditor',
      recipient: 'meta_judge',
      task_id: 'AUDIT-01',
      status: 'SUCCESS',
      payload: { healthScore: 9.8 }
    };

    const res = validateAgentMessage(envelope);
    expect(res.valid).toBe(true);
    expect(res.sanitized.sender).toBe('auditor');
  });

  it('rejects invalid statuses or missing sender fields', () => {
    const invalid = {
      sender: '',
      recipient: 'meta_judge',
      task_id: 'TASK-1',
      status: 'UNKNOWN_STATUS',
      payload: {}
    };

    const res = validateAgentMessage(invalid);
    expect(res.valid).toBe(false);
  });
});
