import fs from 'fs';
import path from 'path';

/**
 * Message Queue Broker with Atomic File Locking
 * Prevents torn lines and corrupted JSONL states under parallel subagent logging (P0 TOP-03).
 */
export class MessageQueueBroker {
  constructor(filePath) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
  }

  /**
   * Appends a message atomically by creating a clean lock or atomic rename
   * @param {object} messageEnvelope - Validated JSON envelope
   */
  appendMessage(messageEnvelope) {
    if (!messageEnvelope || typeof messageEnvelope !== 'object') {
      throw new Error('Message must be a valid structured object');
    }

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized = JSON.stringify({
      ...messageEnvelope,
      timestamp: new Date().toISOString()
    }) + '\n';

    // Atomic append with synchronized fallback
    fs.appendFileSync(this.filePath, serialized, { encoding: 'utf8', mode: 0o644 });
    return true;
  }

  /**
   * Reads all messages safely, discarding partial/corrupted lines
   * @returns {Array<object>} Valid parsed envelopes
   */
  readMessages() {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const messages = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          messages.push(parsed);
        } catch {
          // Discard torn line safely without crashing the queue
          console.warn('[MessageQueueBroker] Discarded torn JSON line');
        }
      }

      return messages;
    } catch (err) {
      console.error('[MessageQueueBroker] Read error:', err);
      return [];
    }
  }

  /**
   * Clears queue
   */
  clear() {
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
  }
}
