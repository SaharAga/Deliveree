import { describe, it, expect, beforeEach } from 'vitest';
import { MessageQueueBroker } from './messageQueue';
import path from 'path';
import fs from 'fs';

describe('MessageQueueBroker', () => {
  const testLogPath = path.resolve(__dirname, 'test_inbox.jsonl');
  let broker;

  beforeEach(() => {
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
    broker = new MessageQueueBroker(testLogPath);
  });

  it('appends and reads messages reliably', () => {
    broker.appendMessage({
      sender: 'developer',
      recipient: 'reviewer',
      task_id: 'TASK-1',
      status: 'PROGRESS',
      payload: { changedFiles: ['src/App.jsx'] }
    });

    const messages = broker.readMessages();
    expect(messages.length).toBe(1);
    expect(messages[0].sender).toBe('developer');
    expect(messages[0].task_id).toBe('TASK-1');
  });

  it('gracefully handles torn lines without throwing an exception', () => {
    fs.writeFileSync(testLogPath, '{"sender":"subagent1"}\n{"torn_json: true\n{"sender":"subagent2"}\n');
    const messages = broker.readMessages();
    expect(messages.length).toBe(2);
    expect(messages[0].sender).toBe('subagent1');
    expect(messages[1].sender).toBe('subagent2');
  });
});
