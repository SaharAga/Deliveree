import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';
import {
  notificationService,
  NOTIFICATION_PREFS_KEY,
  PUSH_SUBSCRIPTION_KEY,
  DEFAULT_NOTIFICATION_PREFS,
  urlBase64ToUint8Array,
  formatPushPayload
} from './notificationService';

describe('notificationService', () => {
  let mockStore = {};

  beforeAll(() => {
    process.env.TELEGRAM_FEEDBACK_BOT_TOKEN = '123456:mock_bot_token';
    globalThis.localStorage = {
      getItem: (key) => mockStore[key] || null,
      setItem: (key, value) => { mockStore[key] = String(value); },
      removeItem: (key) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; }
    };
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Preferences Management', () => {
    it('returns default preferences when nothing stored', () => {
      const prefs = notificationService.getPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
    });

    it('saves and retrieves updated preferences', () => {
      const updated = notificationService.savePreferences({
        pushEnabled: true,
        telegramEnabled: true,
        telegramChatId: '123456789'
      });

      expect(updated.pushEnabled).toBe(true);
      expect(updated.telegramEnabled).toBe(true);
      expect(updated.telegramChatId).toBe('123456789');

      const retrieved = notificationService.getPreferences();
      expect(retrieved.telegramChatId).toBe('123456789');
      expect(retrieved.notifyOnStatusChange).toBe(true);
    });

    it('handles malformed localStorage JSON gracefully', () => {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, 'invalid-json{');
      const prefs = notificationService.getPreferences();
      expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
    });
  });

  describe('Web Notification & Push Helpers', () => {
    it('converts url safe base64 to Uint8Array', () => {
      const dummyBase64 = 'BMx_abcdef1234567890';
      const arr = urlBase64ToUint8Array(dummyBase64);
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBeGreaterThan(0);
    });

    it('returns empty array when base64 string is empty', () => {
      const arr = urlBase64ToUint8Array('');
      expect(arr).toEqual(new Uint8Array(0));
    });

    it('formats push notification payload properly with actions and tag', () => {
      const payload = formatPushPayload({
        title: 'Delivered',
        body: 'Package arrived in Tel Aviv',
        packageId: 'pkg-999',
        trackingNumber: 'IL123456'
      });

      expect(payload.title).toBe('Delivered');
      expect(payload.body).toBe('Package arrived in Tel Aviv');
      expect(payload.tag).toBe('pkg-pkg-999');
      expect(payload.url).toBe('/?packageId=pkg-999');
      expect(payload.actions).toHaveLength(2);
      expect(payload.actions[0].action).toBe('view');
      expect(payload.actions[1].action).toBe('dismiss');
    });

    it('returns unsupported when Notification API is missing', () => {
      const originalNotification = globalThis.Notification;
      // @ts-expect-error test cleanup
      delete globalThis.Notification;

      expect(notificationService.getNotificationPermission()).toBe('unsupported');

      globalThis.Notification = originalNotification;
    });

    it('returns current permission state if Notification exists', () => {
      globalThis.Notification = {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted')
      };

      expect(notificationService.getNotificationPermission()).toBe('granted');
    });

    it('requests permission and saves preference if granted', async () => {
      const requestMock = vi.fn().mockResolvedValue('granted');
      globalThis.Notification = {
        permission: 'default',
        requestPermission: requestMock
      };

      const result = await notificationService.requestNotificationPermission();
      expect(result).toBe('granted');
      expect(requestMock).toHaveBeenCalled();
      expect(notificationService.getPreferences().pushEnabled).toBe(true);
    });

    it('requests permission and disables push if denied', async () => {
      const requestMock = vi.fn().mockResolvedValue('denied');
      globalThis.Notification = {
        permission: 'default',
        requestPermission: requestMock
      };

      const result = await notificationService.requestNotificationPermission();
      expect(result).toBe('denied');
      expect(notificationService.getPreferences().pushEnabled).toBe(false);
    });

    it('subscribes to push manager when available and stores subscription', async () => {
      const mockPushSubscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/123' };
      const getSubscriptionMock = vi.fn().mockResolvedValue(null);
      const subscribeMock = vi.fn().mockResolvedValue(mockPushSubscription);

      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: getSubscriptionMock,
              subscribe: subscribeMock
            }
          })
        }
      });

      const sub = await notificationService.subscribeToPush('BMx_mock_vapid_key');
      expect(sub).toEqual(mockPushSubscription);
      expect(subscribeMock).toHaveBeenCalled();
      expect(localStorage.getItem(PUSH_SUBSCRIPTION_KEY)).toContain('fcm.googleapis.com');
    });

    it('sends notification via ServiceWorker registration if present', async () => {
      const showNotificationMock = vi.fn().mockResolvedValue(undefined);
      globalThis.Notification = {
        permission: 'granted'
      };
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            showNotification: showNotificationMock
          })
        }
      });

      const res = await notificationService.sendWebNotification('Package Arrived', { body: 'In Modiin' });
      expect(res).toBe(true);
      expect(showNotificationMock).toHaveBeenCalledWith(
        'Package Arrived',
        expect.objectContaining({ body: 'In Modiin' })
      );
    });

    it('falls back to Window Notification constructor if SW showNotification fails', async () => {
      const notificationConstructor = vi.fn();
      globalThis.Notification = Object.assign(notificationConstructor, {
        permission: 'granted'
      });
      vi.stubGlobal('navigator', {});

      await notificationService.sendWebNotification('Package Arrived', { body: 'In Modiin' });
      expect(notificationConstructor).toHaveBeenCalledWith(
        'Package Arrived',
        expect.objectContaining({ body: 'In Modiin' })
      );
    });

    it('does not send notification if permission is not granted', async () => {
      const notificationConstructor = vi.fn();
      globalThis.Notification = Object.assign(notificationConstructor, {
        permission: 'denied'
      });

      const res = await notificationService.sendWebNotification('Package Arrived');
      expect(res).toBeNull();
      expect(notificationConstructor).not.toHaveBeenCalled();
    });
  });

  describe('Telegram Alert Dispatch', () => {
    it('formats and sends payload to Telegram bot API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = fetchMock;

      const mockPkg = {
        id: 'pkg-1',
        title: 'Keychron Keyboard',
        trackingNumber: 'IL123456789',
        carrier: 'israel_post',
        status: 'out_for_delivery',
        expectedDeliveryDate: '2026-08-25',
        destination: 'Tel Aviv'
      };

      const result = await notificationService.sendTelegramPackageAlert('726522010', mockPkg, {
        fromStatus: 'in_transit',
        toStatus: 'out_for_delivery'
      });

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('https://api.telegram.org/bot');
      const body = JSON.parse(options.body);
      expect(body.chat_id).toBe('726522010');
      expect(body.parse_mode).toBe('Markdown');
      expect(body.text).toContain('Keychron Keyboard');
      expect(body.text).toContain('IL123456789');
      expect(body.text).toContain('Out for Delivery');
    });

    it('handles network error during Telegram alert gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const mockPkg = { id: '1', trackingNumber: 'TEST1234' };
      const result = await notificationService.sendTelegramPackageAlert('123', mockPkg);
      expect(result).toBe(false);
    });

    it('returns false if chatId or pkg is missing', async () => {
      expect(await notificationService.sendTelegramPackageAlert('', { id: '1' })).toBe(false);
      expect(await notificationService.sendTelegramPackageAlert('123', null)).toBe(false);
    });
  });

  describe('notifyStatusChange Orchestrator', () => {
    it('skips dispatch if previous and new status are the same', async () => {
      const result = await notificationService.notifyStatusChange(
        { id: '1', status: 'in_transit' },
        'in_transit',
        'in_transit'
      );
      expect(result).toEqual({ pushSent: false, telegramSent: false });
    });

    it('dispatches to enabled channels when status changes', async () => {
      notificationService.savePreferences({
        pushEnabled: true,
        telegramEnabled: true,
        telegramChatId: '726522010',
        notifyOnStatusChange: true
      });

      const notificationConstructor = vi.fn();
      globalThis.Notification = Object.assign(notificationConstructor, {
        permission: 'granted'
      });

      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      globalThis.fetch = fetchMock;

      const mockPkg = {
        id: 'pkg-1',
        title: 'Sony Headphones',
        trackingNumber: 'RS999IL',
        carrier: 'israel_post'
      };

      const res = await notificationService.notifyStatusChange(mockPkg, 'in_transit', 'delivered', 'he');
      expect(res.pushSent).toBe(true);
      expect(res.telegramSent).toBe(true);
      expect(notificationConstructor).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
    });

    it('respects notifyOnException preference toggle', async () => {
      notificationService.savePreferences({
        pushEnabled: true,
        notifyOnStatusChange: true,
        notifyOnException: false
      });

      const notificationConstructor = vi.fn();
      globalThis.Notification = Object.assign(notificationConstructor, {
        permission: 'granted'
      });

      const mockPkg = { id: '1', title: 'Delayed item' };
      const res = await notificationService.notifyStatusChange(mockPkg, 'in_transit', 'exception');
      expect(res.pushSent).toBe(false);
      expect(notificationConstructor).not.toHaveBeenCalled();
    });
  });
});
