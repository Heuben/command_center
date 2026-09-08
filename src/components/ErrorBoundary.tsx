import React from 'react';
import { Button, Card } from './ui/primitives';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Catches uncaught render-time exceptions so a single broken page doesn't
 * white-screen the whole app. Displays the message and a reset button.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-canvas p-6">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-base font-semibold text-ink">Something went wrong.</h1>
          <p className="mt-2 text-[13px] text-ink-muted">
            An unexpected error occurred while rendering this view. The rest of the app is still
            available.
          </p>
          {this.state.error &&
          <pre className="mt-3 max-h-40 overflow-auto scrollbar-none rounded-md border border-line bg-canvas p-3 text-[12px] text-danger">
              {this.state.error.message}
            </pre>
          }
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => window.location.assign('/')}>Go home</Button>
            <Button variant="primary" onClick={this.reset}>
              Try again
            </Button>
          </div>
        </Card>
      </div>);

  }
}