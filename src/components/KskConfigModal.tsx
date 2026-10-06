import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, ShieldCheck } from 'lucide-react';

export interface KskConfig {
  apiUrl: string;
  senderId: string;
  username: string;
  password?: string;
  privateKey: string;
}

interface KskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: KskConfig) => void;
}

export default function KskConfigModal({ isOpen, onClose, onSave }: KskConfigModalProps) {
  const [config, setConfig] = useState<KskConfig>({
    apiUrl: '',
    senderId: '',
    username: '',
    password: '',
    privateKey: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('ksk_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('ksk_config', JSON.stringify(config));
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cấu hình API Khám sức khỏe (EMRHUB)</h3>
                <p className="text-sm text-slate-500 font-medium">Thiết lập kết nối liên thông SYT</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">URL API Đồng bộ (SYNC_CHECK_UP)</label>
                <input 
                  type="text"
                  value={config.apiUrl}
                  onChange={e => setConfig({...config, apiUrl: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  placeholder="VD: https://api.csdlksk.vn/api/sync..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tài khoản (Username)</label>
                  <input 
                    type="text"
                    value={config.username}
                    onChange={e => setConfig({...config, username: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Tài khoản EMRHUB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu (Password)</label>
                  <input 
                    type="password"
                    value={config.password}
                    onChange={e => setConfig({...config, password: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    placeholder="Mật khẩu EMRHUB"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mã định danh (sender-id)</label>
                <input 
                  type="text"
                  value={config.senderId}
                  onChange={e => setConfig({...config, senderId: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  placeholder="VD: G18/DMSA"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Private Key (Để ký điện tử Payload)</label>
                <textarea 
                  value={config.privateKey}
                  onChange={e => setConfig({...config, privateKey: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono h-32"
                  placeholder="-----BEGIN PRIVATE KEY-----..."
                />
                <p className="text-xs text-slate-500 mt-1">Lấy từ mục Thông tin cá nhân trên trang admin của hệ thống EMRHUB.</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 mt-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-200 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Lưu cấu hình
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
