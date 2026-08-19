import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary Logic & Lifecycle', () => {
  it('instantiates ErrorBoundary class and extracts derived state from error', () => {
    const error = new Error('Test crash in child component');
    const state = ErrorBoundary.getDerivedStateFromError(error);

    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
  });

  it('handles reset state lifecycle by invoking onReset prop and updating state', () => {
    const onResetMock = vi.fn();
    const boundary = new ErrorBoundary({ onReset: onResetMock });
    
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBe(null);

    // Mock setState
    boundary.setState = vi.fn((newState) => {
      boundary.state = { ...boundary.state, ...newState };
    });

    boundary.handleReset();

    expect(boundary.setState).toHaveBeenCalledWith({ hasError: false, error: null, errorInfo: null });
    expect(boundary.state.hasError).toBe(false);
    expect(onResetMock).toHaveBeenCalled();
  });

  it('handles hard reset by clearing all matching /^deliveree_/ localStorage keys and reloading', () => {
    const boundary = new ErrorBoundary({});
    
    const mockStorage = {
      'deliveree_packages_v1': JSON.stringify([{ id: '1' }]),
      'deliveree_packages_guest': JSON.stringify([{ id: 'guest' }]),
      'deliveree_auth_user_v1': 'user_token',
      'deliveree_tester_feedback': 'true',
      'other_app_setting': 'keep_this'
    };

    const removeItemMock = vi.fn((key) => {
      delete mockStorage[key];
    });

    const keyMock = vi.fn((index) => Object.keys(mockStorage)[index] || null);

    const localStorageMock = {
      get length() {
        return Object.keys(mockStorage).length;
      },
      key: keyMock,
      removeItem: removeItemMock,
      getItem: vi.fn((k) => mockStorage[k] || null)
    };

    const reloadMock = vi.fn();
    const windowMock = {
      location: {
        reload: reloadMock
      }
    };

    globalThis.localStorage = localStorageMock;
    globalThis.window = windowMock;

    boundary.handleHardReset();

    expect(removeItemMock).toHaveBeenCalledWith('deliveree_packages_v1');
    expect(removeItemMock).toHaveBeenCalledWith('deliveree_packages_guest');
    expect(removeItemMock).toHaveBeenCalledWith('deliveree_auth_user_v1');
    expect(removeItemMock).toHaveBeenCalledWith('deliveree_tester_feedback');
    expect(removeItemMock).not.toHaveBeenCalledWith('other_app_setting');
    expect(reloadMock).toHaveBeenCalled();
  });
});


