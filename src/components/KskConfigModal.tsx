import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, ShieldCheck, RotateCcw, Eye, EyeOff, KeyRound, ExternalLink } from 'lucide-react';
import {
  EmrhubConfig,
  EMRHUB_DEFAULT_BASE_URL,
  EMRHUB_DEFAULT_LOGIN_URL,
  EMRHUB_DEFAULT_PUSH_URL,
  EMRHUB_DEFAULT_RECEIVER_ID,
  EMRHUB_PROTOCOL_VERSION,
  EMRHUB_SERVICE_TYPE,
  EMRHUB_DEFAULT_TXN_TYPE,
  EMRHUB_DEFAULT_MSG_TYPE,
  EMRHUB_DEFAULT_GUI_CONG_VNEID_MOI,
} from '../lib/emrhubService';

export type KskConfig = EmrhubConfig;

const DEFAULT_SYSTEM_FIELDS = {
  apiUrl: EMRHUB_DEFAULT_BASE_URL,
  loginUrl: EMRHUB_DEFAULT_LOGIN_URL,
  pushUrl: EMRHUB_DEFAULT_PUSH_URL,
  version: EMRHUB_PROTOCOL_VERSION,
  serviceType: EMRHUB_SERVICE_TYPE,
  receiverId: EMRHUB_DEFAULT_RECEIVER_ID,
  txnType: EMRHUB_DEFAULT_TXN_TYPE,
  msgType: EMRHUB_DEFAULT_MSG_TYPE,
  guiCongVneidMoi: EMRHUB_DEFAULT_GUI_CONG_VNEID_MOI,
};

interface KskConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: KskConfig) => void;
}

export default function KskConfigModal({ isOpen, onClose, onSave }: KskConfigModalProps) {
  const [config, setConfig] = useState<KskConfig>({
    ...DEFAULT_SYSTEM_FIELDS,
    username: '',
    password: '',
    senderId: '',
    publicKey: '',
    privateKey: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ksk_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Nếu cấu hình cũ đang để mặc định cũ là 'emrhub' hoặc rỗng thì tự động nâng cấp lên 'TTYQG'
        const resolvedReceiver =
          !parsed.receiverId || parsed.receiverId === 'emrhub'
            ? EMRHUB_DEFAULT_RECEIVER_ID
            : parsed.receiverId;
        setConfig({
          ...DEFAULT_SYSTEM_FIELDS,
          ...parsed,
          apiUrl: parsed.apiUrl || DEFAULT_SYSTEM_FIELDS.apiUrl,
          loginUrl: parsed.loginUrl || DEFAULT_SYSTEM_FIELDS.loginUrl,
          pushUrl: parsed.pushUrl || DEFAULT_SYSTEM_FIELDS.pushUrl,
          version: parsed.version || DEFAULT_SYSTEM_FIELDS.version,
          serviceType: parsed.serviceType || DEFAULT_SYSTEM_FIELDS.serviceType,
          receiverId: resolvedReceiver,
          txnType: parsed.txnType || DEFAULT_SYSTEM_FIELDS.txnType,
          msgType: parsed.msgType || DEFAULT_SYSTEM_FIELDS.msgType,
          guiCongVneidMoi: parsed.guiCongVneidMoi || DEFAULT_SYSTEM_FIELDS.guiCongVneidMoi,
          username: parsed.username || '',
          password: parsed.password || '',
          senderId: parsed.senderId || '',
          publicKey: parsed.publicKey || '',
          privateKey: parsed.privateKey || '',
        });
      } catch (e) {}
    }
  }, [isOpen]);

  const handleResetDefaults = () => {
    setConfig(prev => ({
      ...prev,
      ...DEFAULT_SYSTEM_FIELDS,
    }));
  };

  const handleSave = () => {
    const trimmed: KskConfig = {
      ...config,
      apiUrl: (config.apiUrl || DEFAULT_SYSTEM_FIELDS.apiUrl).trim(),
      loginUrl: (config.loginUrl || DEFAULT_SYSTEM_FIELDS.loginUrl).trim(),
      pushUrl: (config.pushUrl || DEFAULT_SYSTEM_FIELDS.pushUrl).trim(),
      version: (config.version || DEFAULT_SYSTEM_FIELDS.version).trim(),
      serviceType: (config.serviceType || DEFAULT_SYSTEM_FIELDS.serviceType).trim(),
      receiverId: (config.receiverId || DEFAULT_SYSTEM_FIELDS.receiverId).trim(),
      txnType: (config.txnType || DEFAULT_SYSTEM_FIELDS.txnType).trim(),
      msgType: (config.msgType || DEFAULT_SYSTEM_FIELDS.msgType).trim(),
      guiCongVneidMoi: (config.guiCongVneidMoi || DEFAULT_SYSTEM_FIELDS.guiCongVneidMoi).trim(),
      username: (config.username || '').trim(),
      password: config.password || '',
      senderId: (config.senderId || '').trim(),
      publicKey: (config.publicKey || '').trim(),
      privateKey: (config.privateKey || '').trim(),
    };
    localStorage.setItem('ksk_config', JSON.stringify(trimmed));
    onSave(trimmed);
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
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cấu hình API Khám sức khỏe (EMRHUB)</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Đã setup sẵn 9 thông số chuẩn kết nối • Chỉ cần nhập 5 thông tin tài khoản &amp; khóa bảo mật bên dưới
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* PHẦN 1: 5 THÔNG TIN CẦN NHẬP */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-sm font-extrabold text-emerald-900">
                    1. 5 THÔNG TIN CẦN NHẬP (Cổng KSK Toàn Dân)
                  </h4>
                </div>
                <a
                  href="https://admin.emrhub.vn/profile"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                >
                  Lấy Key tại admin.emrhub.vn/profile
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] mr-1">1</span>
                    kskUsername <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={config.username}
                    onChange={e => setConfig({ ...config, username: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nhập Username API cổng KSK toàn dân"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Nhập Username API của cổng KSK toàn dân</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] mr-1">2</span>
                    kskPassword <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={config.password || ''}
                      onChange={e => setConfig({ ...config, password: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nhập Password API cổng KSK"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Nhập Password API của cổng KSK toàn dân</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] mr-1">3</span>
                    kskSenderId <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={config.senderId}
                    onChange={e => setConfig({ ...config, senderId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nhập Username chính cổng KSK toàn dân"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Nhập Username chính của cổng KSK toàn dân</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] mr-1">4</span>
                    kskPublicKey <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={config.publicKey || ''}
                    onChange={e => setConfig({ ...config, publicKey: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={'-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'}
                  />
                  <p className="text-[11px] text-amber-800 font-medium mt-1">
                    Sao chép Public Key trên <b>https://admin.emrhub.vn/profile</b>. Giữ nguyên{' '}
                    <code className="bg-amber-100 px-1 rounded">-----BEGIN PUBLIC KEY-----</code> và{' '}
                    <code className="bg-amber-100 px-1 rounded">-----END PUBLIC KEY-----</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] mr-1">5</span>
                    kskPrivateKey <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={config.privateKey}
                    onChange={e => setConfig({ ...config, privateKey: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'}
                  />
                  <p className="text-[11px] text-amber-800 font-medium mt-1">
                    Sao chép Private Key trên <b>https://admin.emrhub.vn/profile</b>. Giữ nguyên{' '}
                    <code className="bg-amber-100 px-1 rounded">-----BEGIN PRIVATE KEY-----</code> và{' '}
                    <code className="bg-amber-100 px-1 rounded">-----END PRIVATE KEY-----</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* PHẦN 2: CÁC THÔNG SỐ ĐÃ SETUP SẴN */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                    2. Thông số API hệ thống (Đã cấu hình sẵn theo chuẩn EMRHUB)
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, apiUrl: 'https://api-sandbox.emrhub.vn' })}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      config.apiUrl.includes('sandbox')
                        ? 'text-blue-700 bg-blue-100 border-blue-300'
                        : 'text-blue-600 bg-white hover:bg-blue-50 border-blue-200'
                    }`}
                  >
                    Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, apiUrl: 'https://api.emrhub.vn' })}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      !config.apiUrl.includes('sandbox')
                        ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                        : 'text-emerald-700 bg-white hover:bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    Chính thức (Production)
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-300 cursor-pointer"
                    title="Khôi phục 9 thông số hệ thống về mặc định chuẩn"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Mặc định
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskUrlDomain</label>
                  <input
                    type="text"
                    value={config.apiUrl}
                    onChange={e => setConfig({ ...config, apiUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskLoginUrl</label>
                  <input
                    type="text"
                    value={config.loginUrl || ''}
                    onChange={e => setConfig({ ...config, loginUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskPushUrl</label>
                  <input
                    type="text"
                    value={config.pushUrl || ''}
                    onChange={e => setConfig({ ...config, pushUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskVersion</label>
                  <input
                    type="text"
                    value={config.version || ''}
                    onChange={e => setConfig({ ...config, version: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskServiceType</label>
                  <input
                    type="text"
                    value={config.serviceType || ''}
                    onChange={e => setConfig({ ...config, serviceType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskReceiverId</label>
                  <input
                    type="text"
                    value={config.receiverId || ''}
                    onChange={e => setConfig({ ...config, receiverId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskTxnType</label>
                  <input
                    type="text"
                    value={config.txnType || ''}
                    onChange={e => setConfig({ ...config, txnType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskMsgType</label>
                  <input
                    type="text"
                    value={config.msgType || ''}
                    onChange={e => setConfig({ ...config, msgType: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">kskGuiCongVneidMoi</label>
                  <input
                    type="text"
                    value={config.guiCongVneidMoi || ''}
                    onChange={e => setConfig({ ...config, guiCongVneidMoi: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 mt-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm shadow-emerald-200 flex items-center gap-2 cursor-pointer"
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
