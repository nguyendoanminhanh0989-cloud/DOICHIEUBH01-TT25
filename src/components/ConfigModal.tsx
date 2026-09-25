import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  Globe, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfigModalProps {
  onClose: () => void;
}

type TabType = 'facility' | 'smartca' | 'bhyt';

export default function ConfigModal({ onClose }: ConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('smartca');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Cấu Hình Đơn Vị & Liên Thông Cổng BHXH</h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Mã CSKCB: <strong className="text-blue-600">49006</strong> - Trung tâm Y tế khu vực Duy Xuyên
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('facility')}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors",
              activeTab === 'facility' 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Building2 className="w-4 h-4" /> Thông tin cơ sở KCB
          </button>
          <button
            onClick={() => setActiveTab('smartca')}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors",
              activeTab === 'smartca' 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Cấu hình VNPT SmartCA
          </button>
          <button
            onClick={() => setActiveTab('bhyt')}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors",
              activeTab === 'bhyt' 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Globe className="w-4 h-4" /> Liên thông BHYT
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Facility Tab */}
          {activeTab === 'facility' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-800 mb-6">
                <strong>Thông tin cơ sở KCB:</strong> Thiết lập mã CSKCB (5 ký tự do BHXH Việt Nam cấp) và tên chính thức của đơn vị. Mã này được dùng trong XML chứng từ và xác thực liên thông Cổng BHXH.
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã CSKCB (5 ký tự) <span className="text-rose-500">*</span></label>
                  <input type="text" defaultValue="49006" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-[11px] text-slate-500 mt-1">Mã 5 chữ số do BHXH Việt Nam cấp cho cơ sở KCB.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên cơ sở khám chữa bệnh <span className="text-rose-500">*</span></label>
                  <input type="text" defaultValue="Trung tâm Y tế khu vực Duy Xuyên" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-[11px] text-slate-500 mt-1">Tên chính thức hiển thị trên tiêu đề và báo cáo.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ đơn vị</label>
                <input type="text" defaultValue="Địa chỉ chưa cập nhật" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input type="text" placeholder="Số điện thoại..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email đơn vị</label>
                  <input type="text" placeholder="Email liên hệ..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* VNPT SmartCA Tab */}
          {activeTab === 'smartca' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Base URL</label>
                <input type="text" defaultValue="https://gwsca.vnpt.vn" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client ID (SP ID)</label>
                  <input type="text" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Secret</label>
                  <input type="password" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">User ID</label>
                  <input type="text" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input type="password" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label>
                  <input type="text" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secret (TOTP)</label>
                  <input type="password" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>CẢNH BÁO NGUY CƠ:</strong> Việc lưu mã Secret tại đây có thể dẫn đến rủi ro lộ khóa cá nhân nếu máy tính bị xâm nhập. Chỉ sử dụng nếu bạn hiểu rõ và chấp nhận rủi ro bảo mật.
                </div>
              </div>
            </div>
          )}

          {/* BHYT Tab */}
          {activeTab === 'bhyt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập Cổng BHXH (chuẩn liên thông: <span className="text-blue-600">49006_BV</span>)</label>
                <input type="text" defaultValue="49006_BV" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-[11px] text-slate-500 mt-1">Tài khoản được BHXH Việt Nam cấp cho cơ sở KCB để liên thông qua Cổng tiếp nhận (định dạng: <strong>49006_BV</strong>).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
                <input type="password" placeholder="" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Kiểm tra kết nối
            </button>
            <button className="px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100">
              Xóa cấu hình
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50">
              Hủy
            </button>
            <button className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200">
              Lưu cấu hình
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
