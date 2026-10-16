import React, { useState, useEffect } from 'react';
import { Cloud, Database, Check, AlertTriangle, X, RefreshCw, Upload, Download, Key, Globe, ExternalLink } from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  syncRecordsToSupabase, 
  loadRecordsFromSupabase 
} from '../lib/supabase';
import type { HoSoRecord } from '../lib/signAndSubmitService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: HoSoRecord[];
  maCskcb: string;
  onRecordsLoaded: (loaded: HoSoRecord[]) => void;
}

export default function SupabaseModal({ isOpen, onClose, records, maCskcb, onRecordsLoaded }: SupabaseModalProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setKey(cfg.key);
      if (cfg.url && cfg.key) {
        handleTest(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSupabaseConfig(url, key);
    handleTest(true);
  };

  const handleTest = async (showAlert = true) => {
    setStatus('testing');
    setStatusMsg('Đang kiểm tra kết nối tới Supabase...');
    saveSupabaseConfig(url, key);

    const res = await testSupabaseConnection();
    if (res.success) {
      setStatus('success');
      setStatusMsg(res.message);
    } else {
      setStatus('error');
      setStatusMsg(res.message);
    }
  };

  const handleSyncToCloud = async () => {
    if (!records.length) {
      alert('Không có hồ sơ nào trong bảng để đồng bộ lên Supabase!');
      return;
    }
    setSyncing(true);
    const res = await syncRecordsToSupabase(records, maCskcb);
    setSyncing(false);
    if (res.success) {
      alert(`✅ Đã đồng bộ thành công ${res.count} hồ sơ lên cơ sở dữ liệu Supabase!`);
    } else {
      alert(`❌ Lỗi đồng bộ: ${res.error}`);
    }
  };

  const handleLoadFromCloud = async () => {
    setLoadingCloud(true);
    const res = await loadRecordsFromSupabase(maCskcb);
    setLoadingCloud(false);
    if (res.success) {
      if (res.records.length === 0) {
        alert('Chưa có hồ sơ nào trên Supabase cho cơ sở này!');
      } else {
        onRecordsLoaded(res.records);
        alert(`✅ Đã tải về thành công ${res.records.length} hồ sơ từ Supabase!`);
        onClose();
      }
    } else {
      alert(`❌ Lỗi tải hồ sơ: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Cấu hình Đám mây Supabase</h2>
              <p className="text-xs text-slate-500">Lưu trữ hồ sơ chứng từ liên tục & đồng bộ đa thiết bị</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          {status !== 'idle' && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              status === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-600" />}
              {status === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
              {status === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Project URL (Supabase URL)
              </label>
              <input
                type="text"
                placeholder="https://xxxxxxxxxxxxxxxx.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Lấy từ: <b>Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ API $\rightarrow$ Project URL</b>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                API Anon Public Key
              </label>
              <textarea
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Khóa công khai <b>anon / public</b> (an toàn để sử dụng ở frontend).
              </span>
            </div>
          </div>

          {/* Actions: Save & Test */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition shadow-sm"
            >
              Lưu & Kiểm tra kết nối
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1"
            >
              Mở Supabase <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Cloud Sync Operations */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thao tác dữ liệu đám mây:</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSyncToCloud}
                disabled={syncing || !url || !key}
                className="p-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-left flex flex-col gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Đẩy lên Supabase ({records.length})
                </div>
                <span className="text-[10px] text-emerald-600">Lưu toàn bộ hồ sơ hiện tại lên đám mây</span>
              </button>

              <button
                onClick={handleLoadFromCloud}
                disabled={loadingCloud || !url || !key}
                className="p-3 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-left flex flex-col gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Download className="w-4 h-4 text-blue-600" />
                  Tải về từ Supabase
                </div>
                <span className="text-[10px] text-blue-600">Khôi phục hồ sơ đã lưu trên đám mây</span>
              </button>
            </div>
          </div>

          {/* SQL Schema Hint */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
            <b>💡 Lưu ý khởi tạo database:</b> Nếu là dự án mới trên Supabase, bạn chỉ cần mở file <code className="bg-white px-1.5 py-0.5 rounded border text-emerald-700 font-bold">supabase_schema.sql</code> trong thư mục dự án và dán vào <b>SQL Editor</b> trên Supabase rồi nhấn <b>Run</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
