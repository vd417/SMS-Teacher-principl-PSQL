import React from 'react';
import { ErrorState } from '@/ui/state/ErrorState';
import { captureError } from '@/lib/sentry';
import { queryClient } from '@/lib/queryClient';

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureError(error, { boundary: 'app-root' });
  }

  handleRetry = () => {
    queryClient.clear();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorState message="Something went wrong." onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
