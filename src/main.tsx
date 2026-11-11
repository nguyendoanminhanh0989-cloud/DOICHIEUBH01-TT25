import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMsg: error?.message || String(error || 'Lỗi giao diện không xác định'),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 text-white font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 text-center shadow-2xl">
            <h2 className="text-base font-extrabold text-amber-400">
              ĐÃ XẢY RA LỖI HIỂN THỊ GIAO DIỆN
            </h2>
            <p className="text-xs text-slate-300 break-words bg-slate-900/70 p-3 rounded-xl border border-slate-700">
              {this.state.errorMsg}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  try {
                    sessionStorage.removeItem('bhxh_tt25_auth_session_v1');
                    localStorage.removeItem('bhxh_tt25_auth_session_v1');
                  } catch {}
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white cursor-pointer"
              >
                Quay lại Màn hình Đăng nhập
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white cursor-pointer"
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
