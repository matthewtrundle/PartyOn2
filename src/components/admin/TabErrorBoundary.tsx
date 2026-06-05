'use client';

/**
 * Per-tab error boundary for Brian's Stuff.
 *
 * Catches render-time exceptions inside a single tab panel so the rest
 * of the tab shell + the other tab panels keep working. Without this,
 * a single component crash (typo, bad DB response, etc.) takes the
 * entire /admin/brians-stuff page down with no clue which tab is at
 * fault.
 *
 * Renders a red "this tab crashed" box with the error message + a
 * "Try again" button that re-mounts the children. The other tab
 * panels are unaffected because each one is wrapped in its own
 * boundary instance.
 */
import React from 'react';

type Props = {
  tabName: string;
  children: React.ReactNode;
};

type State = { hasError: boolean; error: Error | null };

export default class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaces in Vercel function logs; nothing user-facing here.
    console.error(`[TabErrorBoundary:${this.props.tabName}]`, error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-md p-5"
          style={{
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
          }}
        >
          <div className="font-bold text-sm tracking-widest mb-2">
            ⚠️ TAB CRASHED · {this.props.tabName.toUpperCase()}
          </div>
          <p className="text-sm leading-relaxed mb-2">
            Something in this tab&apos;s component tree threw an error. The
            other tabs are still working — switch to one of them if you
            need to keep working. Send Brian this screenshot or check the
            Vercel function logs for details.
          </p>
          <pre
            className="text-xs p-2 rounded mb-3 whitespace-pre-wrap break-words"
            style={{ background: 'rgba(0,0,0,0.06)', maxHeight: '200px', overflow: 'auto' }}
          >
            {this.state.error?.message ?? 'No error message available.'}
          </pre>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded-md font-bold text-xs tracking-widest"
            style={{ background: '#991B1B', color: '#FFFFFF' }}
          >
            TRY AGAIN
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
