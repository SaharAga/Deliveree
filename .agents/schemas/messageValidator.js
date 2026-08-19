/**
 * Structured Agent Message Schema Validator (P0 TOP-02)
 * Ensures all inter-agent communication follows a strict schema envelope
 */

export const AGENT_STATUSES = ['PROGRESS', 'SUCCESS', 'FAILED', 'ESCALATED'];

export function validateAgentMessage(envelope) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, error: 'Envelope must be a non-null object' };
  }

  const { sender, recipient, task_id, status, payload } = envelope;

  if (typeof sender !== 'string' || !sender.trim()) {
    return { valid: false, error: 'Missing or invalid "sender" field' };
  }

  if (typeof recipient !== 'string' || !recipient.trim()) {
    return { valid: false, error: 'Missing or invalid "recipient" field' };
  }

  if (typeof task_id !== 'string' || !task_id.trim()) {
    return { valid: false, error: 'Missing or invalid "task_id" field' };
  }

  if (!AGENT_STATUSES.includes(status)) {
    return { valid: false, error: `Invalid status "${status}". Allowed: ${AGENT_STATUSES.join(', ')}` };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  return {
    valid: true,
    sanitized: {
      sender: sender.trim(),
      recipient: recipient.trim(),
      task_id: task_id.trim(),
      status,
      payload,
      errors: Array.isArray(envelope.errors) ? envelope.errors : []
    }
  };
}
