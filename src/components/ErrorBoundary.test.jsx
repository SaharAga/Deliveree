import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Simulated Component Crash');
  }
  return <div>Component is Healthy</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component is Healthy')).toBeInTheDocument();
  });

  it('catches render error and displays localized fallback in compact mode', () => {
    // Suppress console.error in test log
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary compact componentName="ModalTest">
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/ModalTest failed to render/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated Component Crash/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('recovers state when user clicks Try again', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onResetMock = vi.fn();

    render(
      <ErrorBoundary compact componentName="ModalTest" onReset={onResetMock}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainBtn = screen.getByText('Try again');
    fireEvent.click(tryAgainBtn);

    expect(onResetMock).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
