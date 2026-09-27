import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  Globe, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bhxhGetToken } from '../lib/bhxhService';
import { getOrgConfig, saveOrgConfig } from '../lib/signAndSubmitService';
import { getSmartCAConfig, saveSmartCAConfig, testSmartCaConnection } from '../lib/vnptSmartCaService';

interface ConfigModalProps {
  onClose: () => void;
}

type TabType = 'facility' | 'smartca' | 'bhyt';

export default function ConfigModal({ onClose }: ConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('smartca');

  // Form states - Facility
  const [maCskcb, setMaCskcb] = useState('');
  const [tenCskcb, setTenCskcb] = useState('');

  // Form states - SmartCA
  const [smartcaBaseUrl, setSmartcaBaseUrl] = useState('https://gwsca.vnpt.vn');
  const [smartcaClientId, setSmartcaClientId] = useState('');
  const [smartcaClientSecret, setSmartcaClientSecret] = useState('');
  const [smartcaUserId, setSmartcaUserId] = useState('');
  const [smartcaPassword, setSmartcaPassword] = useState('');
  const [smartcaSerialNumber, setSmartcaSerialNumber] = useState('');
  const [smartcaTotpSecret, setSmartcaTotpSecret] = useState('');

  // Form states - BHYT
  const [bhytUsername, setBhytUsername] = useState('');
  const [bhytPassword, setBhytPassword] = useState('');

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string, details?: string} | null>(null);

  useEffect(() => {
    // Load config on mount
    const orgConfig = getOrgConfig(); // from sessionStorage

    setMaCskcb(orgConfig.ma_cskcb || '49006');
    setTenCskcb(orgConfig.ten_cskcb || 'Trung tâm Y tế khu vực Duy Xuyên');
    setBhytUsername(orgConfig.bhxh_account?.username || '');
    setBhytPassword(orgConfig.bhxh_account?.password || '');

    const smartCAConfig = getSmartCAConfig(); // from sessionStorage

    setSmartcaBaseUrl(smartCAConfig.baseUrl || 'https://gwsca.vnpt.vn');
    setSmartcaClientId(smartCAConfig.clientId || '49d4-638684879413752914.apps.smartcaapi.com');
    setSmartcaClientSecret(smartCAConfig.clientSecret || 'MzRiZTViMmY-YjM1NC00OWQ0');
    setSmartcaSerialNumber(smartCAConfig.serialNumber || '');
    
    setSmartcaUserId(smartCAConfig.userId || '');
    setSmartcaPassword(smartCAConfig.password || '');
    setSmartcaTotpSecret(smartCAConfig.totpSecret || '');
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (activeTab === 'bhyt') {
        if (!bhytUsername || !bhytPassword) {
          setTestResult({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu!' });
          return;
        }
        await bhxhGetToken({
          ma_cskcb: maCskcb,
          bhxh_account: { username: bhytUsername, password: bhytPassword }
        });
        setTestResult({ success: true, message: 'Xác thực thành công! Kết nối với Cổng BHXH hoạt động tốt.' });
      } 
      else if (activeTab === 'smartca') {
        const config = {
          signMode: 'TOTP' as any,
          baseUrl: smartcaBaseUrl,
          clientId: smartcaClientId,
          clientSecret: smartcaClientSecret,
          userId: smartcaUserId,
          password: smartcaPassword,
          serialNumber: smartcaSerialNumber,
          totpSecret: smartcaTotpSecret
        };
        const res = await testSmartCaConnection(config);
        setTestResult({ 
          success: res.status === 'success', 
          message: res.message,
          details: res.details
        });
      }
      else {
        alert('Tab này không có chức năng kiểm tra kết nối.');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kết nối' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    // Save to sessionStorage for app usage
    saveOrgConfig({
      ma_cskcb: maCskcb,
      ten_cskcb: tenCskcb,
      bhxh_account: {
        username: bhytUsername,
        password: bhytPassword
      }
    });

    saveSmartCAConfig({
      signMode: smartcaTotpSecret ? 'TOTP' : 'APP',
      baseUrl: smartcaBaseUrl,
      clientId: smartcaClientId,
      clientSecret: smartcaClientSecret,
      userId: smartcaUserId,
      password: smartcaPassword,
      serialNumber: smartcaSerialNumber,
      totpSecret: smartcaTotpSecret
    });

    alert('Đã lưu cấu hình thành công!');
    onClose();
  };

  const handleClearConfig = () => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình tài khoản (Mật khẩu, User ID, TOTP)? Các thiết lập hệ thống (Client ID, Secret, Serial) vẫn được giữ lại.')) {
      setSmartcaUserId('');
      setSmartcaPassword('');
      setSmartcaTotpSecret('');
      setBhytUsername('');
      setBhytPassword('');
      setTestResult(null);
      
      // Remove from session
      sessionStorage.removeItem('org_config');
      sessionStorage.removeItem('vnpt_smartca_config');
      sessionStorage.removeItem('cskcb_config');
      sessionStorage.removeItem('bhxh_token');
      sessionStorage.removeItem('bhxh_id_token');
      
      alert('Đã xóa thông tin tài khoản!');
    }
  };

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
                Mã CSKCB: <strong className="text-blue-600">{maCskcb}</strong> - {tenCskcb}
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
            onClick={() => { setActiveTab('facility'); setTestResult(null); }}
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
            onClick={() => { setActiveTab('smartca'); setTestResult(null); }}
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
            onClick={() => { setActiveTab('bhyt'); setTestResult(null); }}
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
                  <input type="text" value={maCskcb} onChange={e => setMaCskcb(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-[11px] text-slate-500 mt-1">Mã 5 chữ số do BHXH Việt Nam cấp cho cơ sở KCB.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên cơ sở khám chữa bệnh <span className="text-rose-500">*</span></label>
                  <input type="text" value={tenCskcb} onChange={e => setTenCskcb(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-[11px] text-slate-500 mt-1">Tên chính thức hiển thị trên tiêu đề và báo cáo.</p>
                </div>
              </div>
            </div>
          )}

          {/* VNPT SmartCA Tab */}
          {activeTab === 'smartca' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Base URL</label>
                <input type="text" value={smartcaBaseUrl} onChange={e => setSmartcaBaseUrl(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client ID (SP ID)</label>
                  <input type="text" value={smartcaClientId} onChange={e => setSmartcaClientId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Secret</label>
                  <input type="password" value={smartcaClientSecret} onChange={e => setSmartcaClientSecret(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">User ID</label>
                  <input type="text" value={smartcaUserId} onChange={e => setSmartcaUserId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input type="password" value={smartcaPassword} onChange={e => setSmartcaPassword(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label>
                  <input type="text" value={smartcaSerialNumber} onChange={e => setSmartcaSerialNumber(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secret (TOTP)</label>
                  <input type="password" value={smartcaTotpSecret} onChange={e => setSmartcaTotpSecret(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>CẢNH BÁO NGUY CƠ:</strong> Việc lưu mã Secret tại đây có thể dẫn đến rủi ro lộ khóa cá nhân nếu máy tính bị xâm nhập. Chỉ sử dụng nếu bạn hiểu rõ và chấp nhận rủi ro bảo mật.
                </div>
              </div>

              {testResult && activeTab === 'smartca' && (
                <div className={cn("p-4 mt-4 rounded-xl text-sm flex items-start gap-3 border", 
                  testResult.success ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
                )}>
                  {testResult.success ? <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.details && <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed opacity-90">{testResult.details}</pre>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BHYT Tab */}
          {activeTab === 'bhyt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập Cổng BHXH (chuẩn liên thông: <span className="text-blue-600">{maCskcb}_BV</span>)</label>
                <input type="text" value={bhytUsername} onChange={e => setBhytUsername(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-[11px] text-slate-500 mt-1">Tài khoản được BHXH Việt Nam cấp cho cơ sở KCB để liên thông qua Cổng tiếp nhận (định dạng: <strong>{maCskcb}_BV</strong>).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
                <input type="password" value={bhytPassword} onChange={e => setBhytPassword(e.target.value)} placeholder="" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              {testResult && activeTab === 'bhyt' && (
                <div className={cn("p-3 mt-4 rounded-lg text-sm font-semibold flex items-start gap-2 border", 
                  testResult.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {testResult.success ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleTestConnection}
              disabled={isTesting || activeTab === 'facility'}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isTesting && "animate-spin")} /> 
              {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
            <button onClick={handleClearConfig} className="px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100">
              Xóa cấu hình
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50">
              Hủy
            </button>
            <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200">
              Lưu cấu hình
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
