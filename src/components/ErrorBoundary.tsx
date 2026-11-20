import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application boundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path || 'record'})`;
        }
      } catch {
        // plain error message
      }

      return (
        <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <p className="text-xs font-medium tracking-wider text-[#0D74CE] mb-2">
              Service Recovery
            </p>
            <h2 className="font-display text-2xl font-semibold text-[#0B1F3A] mb-3">
              Unable to complete this request
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{friendly}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg hover:bg-[#132f57] transition-colors"
            >
              Return to Giftstar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
