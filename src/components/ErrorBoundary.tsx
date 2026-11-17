import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">
              เกิดข้อผิดพลาดระหว่างการทำงานของระบบ
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              ระบบตรวจพบปัญหาในการเชื่อมต่อหรือสิทธิ์การเข้าถึงข้อมูล กรุณารีเฟรชหน้าเว็บหรือเข้าสู่ระบบใหม่อีกครั้ง
            </p>
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-rose-700 overflow-x-auto whitespace-pre-wrap">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
