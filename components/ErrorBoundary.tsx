'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="rounded-xl bg-red-50 border border-red-200 p-6 max-w-sm">
              <p className="text-sm font-semibold text-red-700 mb-1">
                {this.props.label ?? 'Something went wrong'}
              </p>
              <p className="text-xs text-red-500">{this.state.message}</p>
              <button
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
