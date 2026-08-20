import { describe, it, expect } from 'vitest';

describe('Navbar Logged-Out vs Logged-In Toolbar Logic', () => {
  const getVisibleActions = ({ user, isDemoMode }) => {
    const isInternalToolbarActive = Boolean(user || isDemoMode);
    return {
      canAddPackage: isInternalToolbarActive,
      canSmartImport: isInternalToolbarActive,
      canAutoIngest: isInternalToolbarActive,
      canExport: isInternalToolbarActive,
      canViewAnalytics: isInternalToolbarActive,
      canManageBackup: isInternalToolbarActive,
      canViewAbout: true,
      canSendFeedback: true,
      canToggleTheme: true,
      canToggleLanguage: true,
      canLoginOrAccount: true,
    };
  };

  it('hides all internal action buttons when user is logged out and not in demo mode', () => {
    const actions = getVisibleActions({ user: null, isDemoMode: false });

    // Internal actions hidden
    expect(actions.canAddPackage).toBe(false);
    expect(actions.canSmartImport).toBe(false);
    expect(actions.canAutoIngest).toBe(false);
    expect(actions.canExport).toBe(false);
    expect(actions.canViewAnalytics).toBe(false);
    expect(actions.canManageBackup).toBe(false);

    // Essential public controls present
    expect(actions.canViewAbout).toBe(true);
    expect(actions.canSendFeedback).toBe(true);
    expect(actions.canToggleTheme).toBe(true);
    expect(actions.canToggleLanguage).toBe(true);
    expect(actions.canLoginOrAccount).toBe(true);
  });

  it('shows full internal toolbar actions when user is logged in', () => {
    const mockUser = { id: 'usr-1', name: 'Tester', email: 'test@example.com' };
    const actions = getVisibleActions({ user: mockUser, isDemoMode: false });

    expect(actions.canAddPackage).toBe(true);
    expect(actions.canSmartImport).toBe(true);
    expect(actions.canAutoIngest).toBe(true);
    expect(actions.canExport).toBe(true);
    expect(actions.canViewAnalytics).toBe(true);
    expect(actions.canManageBackup).toBe(true);
    expect(actions.canLoginOrAccount).toBe(true);
  });

  it('shows full internal toolbar actions when in demo mode even if user is logged out', () => {
    const actions = getVisibleActions({ user: null, isDemoMode: true });

    expect(actions.canAddPackage).toBe(true);
    expect(actions.canSmartImport).toBe(true);
    expect(actions.canAutoIngest).toBe(true);
    expect(actions.canExport).toBe(true);
    expect(actions.canViewAnalytics).toBe(true);
    expect(actions.canManageBackup).toBe(true);
    expect(actions.canLoginOrAccount).toBe(true);
  });
});
