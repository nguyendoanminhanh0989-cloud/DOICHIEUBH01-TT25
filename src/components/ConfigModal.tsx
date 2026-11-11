import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  ShieldCheck,
  Globe,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Network,
  Upload,
  Download,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { bhxhGetToken } from '../lib/bhxhService';
import { getOrgConfig, saveOrgConfig } from '../lib/signAndSubmitService';
import {
  getSmartCAConfig,
  saveSmartCAConfig,
  testSmartCaConnection,
  CertificateInfo,
  VNPT_SMARTCA_DEFAULTS,
  parseCertificateInput,
  getSavedSignatureImage,
  saveSignatureImage,
} from '../lib/vnptSmartCaService';

interface ConfigModalProps {
  onClose: () => void;
  initialTab?: TabType;
}

type TabType = 'facility' | 'smartca' | 'bhyt';

export default function ConfigModal({ onClose, initialTab = 'smartca' }: ConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Lấy cấu hình đã lưu bền vững (localStorage ưu tiên)
  const initialOrg = getOrgConfig();
  const initialSmartCA = getSmartCAConfig();

  // Form states - Facility
  const [maCskcb, setMaCskcb] = useState(() => initialOrg.ma_cskcb || '48225');
  const [tenCskcb, setTenCskcb] = useState(
    () => initialOrg.ten_cskcb || 'NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG'
  );
  const [cskcbList, setCskcbList] = useState<Array<{ ma: string; ten: string }>>([]);
  const [searchResults, setSearchResults] = useState<Array<{ ma: string; ten: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states - SmartCA
  const [smartcaSignMode, setSmartcaSignMode] = useState<'TOTP' | 'APP'>(() => initialSmartCA.signMode || (initialSmartCA.totpSecret ? 'TOTP' : 'APP'));
  const [smartcaBaseUrl, setSmartcaBaseUrl] = useState(() => initialSmartCA.baseUrl || VNPT_SMARTCA_DEFAULTS.prod.baseUrl);
  const [smartcaUrlEseal, setSmartcaUrlEseal] = useState(() => initialSmartCA.urlEseal || VNPT_SMARTCA_DEFAULTS.prod.urlEseal);
  const [smartcaUrlQd769, setSmartcaUrlQd769] = useState(() => initialSmartCA.urlQd769 || VNPT_SMARTCA_DEFAULTS.prod.urlQd769);
  const [smartcaClientId, setSmartcaClientId] = useState(() => initialSmartCA.clientId || '');
  const [smartcaClientSecret, setSmartcaClientSecret] = useState(() => initialSmartCA.clientSecret || '');
  const [smartcaUserId, setSmartcaUserId] = useState(() => initialSmartCA.userId || '');
  const [smartcaPassword, setSmartcaPassword] = useState(() => initialSmartCA.password || '');
  const [smartcaSerialNumber, setSmartcaSerialNumber] = useState(() => initialSmartCA.serialNumber || '');
  const [smartcaTotpSecret, setSmartcaTotpSecret] = useState(() => initialSmartCA.totpSecret || '');
  const [smartcaCertificate, setSmartcaCertificate] = useState(() => initialSmartCA.certificateBase64 || '');
  const [smartcaCaCert, setSmartcaCaCert] = useState(() => initialSmartCA.caCertBase64 || '');
  const [smartcaCertId, setSmartcaCertId] = useState(() => initialSmartCA.certId || '');
  const [smartcaSubject, setSmartcaSubject] = useState(() => initialSmartCA.subjectDN || '');
  const [smartcaStorageMode, setSmartcaStorageMode] = useState<'persistent' | 'session_only'>(
    () => initialSmartCA.storageMode || 'session_only'
  );
  const [signatureImageB64, setSignatureImageB64] = useState<string>(() => getSavedSignatureImage());
  const [fetchedCerts, setFetchedCerts] = useState<CertificateInfo[]>([]);

  // Form states - BHYT
  const [bhytUsername, setBhytUsername] = useState(
    () => initialOrg.bhxh_account?.username || '48225_BV'
  );
  const [bhytPassword, setBhytPassword] = useState(() => initialOrg.bhxh_account?.password || '');

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [isLocalAgentRunning, setIsLocalAgentRunning] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const checkLocalAgent = React.useCallback(async () => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('http://127.0.0.1:18088/ping', { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        setIsLocalAgentRunning(true);
        return;
      }
    } catch {}
    setIsLocalAgentRunning(false);
  }, []);

  useEffect(() => {
    checkLocalAgent();
  }, [checkLocalAgent]);

  useEffect(() => {
    const orgConfig = getOrgConfig();
    if (orgConfig.ma_cskcb) setMaCskcb(orgConfig.ma_cskcb);
    if (orgConfig.ten_cskcb) setTenCskcb(orgConfig.ten_cskcb);
    if (orgConfig.bhxh_account?.username) setBhytUsername(orgConfig.bhxh_account.username);
    if (orgConfig.bhxh_account?.password) setBhytPassword(orgConfig.bhxh_account.password);

    const smartCAConfig = getSmartCAConfig();
    if (smartCAConfig.signMode) setSmartcaSignMode(smartCAConfig.signMode);
    if (smartCAConfig.baseUrl) setSmartcaBaseUrl(smartCAConfig.baseUrl);
    if (smartCAConfig.urlEseal) setSmartcaUrlEseal(smartCAConfig.urlEseal);
    if (smartCAConfig.urlQd769) setSmartcaUrlQd769(smartCAConfig.urlQd769);
    if (smartCAConfig.clientId) setSmartcaClientId(smartCAConfig.clientId);
    if (smartCAConfig.clientSecret) setSmartcaClientSecret(smartCAConfig.clientSecret);
    if (smartCAConfig.serialNumber) setSmartcaSerialNumber(smartCAConfig.serialNumber);
    if (smartCAConfig.userId) setSmartcaUserId(smartCAConfig.userId);
    if (smartCAConfig.password) setSmartcaPassword(smartCAConfig.password);
    if (smartCAConfig.totpSecret) setSmartcaTotpSecret(smartCAConfig.totpSecret);
    if (smartCAConfig.certificateBase64) setSmartcaCertificate(smartCAConfig.certificateBase64);
    if (smartCAConfig.caCertBase64) setSmartcaCaCert(smartCAConfig.caCertBase64);
    if (smartCAConfig.certId) setSmartcaCertId(smartCAConfig.certId);
    if (smartCAConfig.subjectDN) setSmartcaSubject(smartCAConfig.subjectDN);
  }, []);

  // Load danh mục CSKCB
  useEffect(() => {
    import('../data/cskcb_list.json')
      .then(data => {
        setCskcbList(data.default as any[]);
      })
      .catch(() => {});
  }, []);

  // Tự động tra cứu khi nhập mã
  useEffect(() => {
    const code = maCskcb.trim();
    if (code.length < 3 || cskcbList.length === 0 || !showDropdown) {
      setSearchResults([]);
      return;
    }
    const exact = cskcbList.find(c => c.ma === code);
    if (exact) {
      setTenCskcb(exact.ten);
      setSearchResults([]);
      setShowDropdown(false);
    } else {
      const partial = cskcbList
        .filter(c => c.ma.startsWith(code) || c.ten.toLowerCase().includes(code.toLowerCase()))
        .slice(0, 8);
      setSearchResults(partial);
      setShowDropdown(partial.length > 0);
    }
  }, [maCskcb, cskcbList, showDropdown]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          bhxh_account: { username: bhytUsername, password: bhytPassword },
        });
        setTestResult({
          success: true,
          message: 'Xác thực thành công! Kết nối với Cổng BHXH hoạt động tốt.',
        });
      } else if (activeTab === 'smartca') {
        const config = {
          signMode: smartcaSignMode,
          baseUrl: smartcaBaseUrl,
          urlEseal: smartcaUrlEseal,
          urlQd769: smartcaUrlQd769,
          clientId: smartcaClientId,
          clientSecret: smartcaClientSecret,
          userId: smartcaUserId,
          password: smartcaPassword,
          serialNumber: smartcaSerialNumber,
          totpSecret: smartcaTotpSecret,
          certificateBase64: smartcaCertificate || undefined,
          caCertBase64: smartcaCaCert || undefined,
          certId: smartcaCertId || undefined,
          subjectDN: smartcaSubject || undefined,
        };
        const res = await testSmartCaConnection(config);
        if (res.allCertificates && res.allCertificates.length > 0) {
          setFetchedCerts(res.allCertificates);
        }
        if (res.status === 'success' && res.certificate) {
          const newSerial = res.certificate.serialNumber || smartcaSerialNumber;
          const newCert = res.certificate.rawCertBase64 || smartcaCertificate;
          const newSubject = res.certificate.subject || smartcaSubject;
          const newCaCert = res.certificate.caCertBase64 || smartcaCaCert;
          const newCertId = res.certificate.certId || smartcaCertId;

          setSmartcaSerialNumber(newSerial);
          setSmartcaCertificate(newCert);
          setSmartcaSubject(newSubject);
          setSmartcaCaCert(newCaCert);
          setSmartcaCertId(newCertId);

          // Tự động lưu chứng thư vừa lấy vào bộ nhớ để dùng ký ngay
          saveSmartCAConfig({
            ...config,
            serialNumber: newSerial,
            certificateBase64: newCert,
            caCertBase64: newCaCert,
            certId: newCertId,
            subjectDN: newSubject,
          });
        }
        setTestResult({
          success: res.status === 'success',
          message: res.message,
          details: res.details,
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kết nối' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectFetchedCert = (cert: CertificateInfo) => {
    setSmartcaSerialNumber(cert.serialNumber);
    setSmartcaCertificate(cert.rawCertBase64 || '');
    setSmartcaCaCert(cert.caCertBase64 || '');
    setSmartcaCertId(cert.certId || '');
    setSmartcaSubject(cert.subject || '');
  };

  const handleSave = () => {
    saveOrgConfig({
      ma_cskcb: maCskcb,
      ten_cskcb: tenCskcb,
      bhxh_account: {
        username: bhytUsername,
        password: bhytPassword,
      },
    });

    saveSmartCAConfig({
      signMode: smartcaSignMode,
      storageMode: smartcaStorageMode,
      baseUrl: smartcaBaseUrl,
      urlEseal: smartcaUrlEseal,
      urlQd769: smartcaUrlQd769,
      clientId: smartcaClientId,
      clientSecret: smartcaClientSecret,
      userId: smartcaUserId,
      password: smartcaPassword,
      serialNumber: smartcaSerialNumber,
      totpSecret: smartcaTotpSecret,
      certificateBase64: smartcaCertificate || undefined,
      caCertBase64: smartcaCaCert || undefined,
      certId: smartcaCertId || undefined,
      subjectDN: smartcaSubject || undefined,
      signatureImageBase64: signatureImageB64 || undefined,
    });
    saveSignatureImage(signatureImageB64);

    alert('Đã lưu cấu hình Chữ ký số & Đơn vị thành công!');
    onClose();
  };

  const handleClearConfig = () => {
    if (
      confirm(
        'Bạn có chắc chắn muốn xóa cấu hình tài khoản (Mật khẩu, User ID, TOTP)? Các thiết lập hệ thống (Client ID, Secret, Serial) vẫn được giữ lại.'
      )
    ) {
      setSmartcaUserId('');
      setSmartcaPassword('');
      setSmartcaTotpSecret('');
      setBhytUsername('');
      setBhytPassword('');
      setTestResult(null);

      sessionStorage.removeItem('org_config');
      localStorage.removeItem('org_config');
      sessionStorage.removeItem('vnpt_smartca_config');
      localStorage.removeItem('vnpt_smartca_config');
      sessionStorage.removeItem('cskcb_config');
      localStorage.removeItem('cskcb_config');
      sessionStorage.removeItem('bhxh_token');
      sessionStorage.removeItem('bhxh_id_token');

      alert('Đã xóa thông tin tài khoản!');
    }
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Cài Đặt Chữ Ký Số VNPT SmartCA & Thông Tin Đơn Vị
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Chuẩn tích hợp VNPT SmartCA SP769 v2.0 (769/QĐ-BTTTT) •{' '}
                <strong className="text-blue-600">NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setActiveTab('smartca');
              setTestResult(null);
            }}
            className={cn(
              'px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors',
              activeTab === 'smartca'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Cấu hình Chữ ký số VNPT SmartCA
          </button>
          <button
            onClick={() => {
              setActiveTab('facility');
              setTestResult(null);
            }}
            className={cn(
              'px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors',
              activeTab === 'facility'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <Building2 className="w-4 h-4" /> Thông tin cơ sở KCB
          </button>
          <button
            onClick={() => {
              setActiveTab('bhyt');
              setTestResult(null);
            }}
            className={cn(
              'px-4 py-2.5 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors',
              activeTab === 'bhyt' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            <Globe className="w-4 h-4" /> Tài khoản Cổng BHXH
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* Facility Tab */}
          {activeTab === 'facility' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-800 mb-6">
                <strong>Thông tin cơ sở KCB:</strong> Thiết lập mã CSKCB (5 ký tự do BHXH Việt Nam
                cấp) và tên chính thức của đơn vị.
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div ref={dropdownRef} className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã CSKCB (5 ký tự) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={maCskcb}
                    onChange={e => {
                      setMaCskcb(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => maCskcb.length >= 3 && setShowDropdown(true)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="VD: 48225"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nhập mã để tự động tra cứu tên đơn vị.
                  </p>
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                      {searchResults.map(item => (
                        <button
                          key={item.ma}
                          type="button"
                          className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setMaCskcb(item.ma);
                            setTenCskcb(item.ten);
                            setShowDropdown(false);
                          }}
                        >
                          <span className="text-xs font-black text-blue-600 mr-2">{item.ma}</span>
                          <span className="text-sm text-slate-700">{item.ten}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên cơ sở khám chữa bệnh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenCskcb}
                    onChange={e => setTenCskcb(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Tên tự động điền khi chọn mã"
                  />
                </div>
              </div>
            </div>
          )}

          {/* VNPT SmartCA Tab */}
          {activeTab === 'smartca' && (
            <div className="space-y-4">
              {/* Cấu hình 3 đường link kết nối VNPT SmartCA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Cấu hình đường dẫn kết nối VNPT SmartCA (3 Link Gateway)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Hệ thống đã gán sẵn 3 link mặc định của VNPT. Vẫn cho phép chỉnh sửa nếu dùng proxy / cổng riêng.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSmartcaBaseUrl(VNPT_SMARTCA_DEFAULTS.prod.baseUrl);
                        setSmartcaUrlEseal(VNPT_SMARTCA_DEFAULTS.prod.urlEseal);
                        setSmartcaUrlQd769(VNPT_SMARTCA_DEFAULTS.prod.urlQd769);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer',
                        smartcaBaseUrl.includes('gwsca.vnpt.vn')
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      )}
                      title="Gán sẵn 3 link Production chính thức"
                    >
                      Production (gwsca.vnpt.vn)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSmartcaBaseUrl(VNPT_SMARTCA_DEFAULTS.uat.baseUrl);
                        setSmartcaUrlEseal(VNPT_SMARTCA_DEFAULTS.uat.urlEseal);
                        setSmartcaUrlQd769(VNPT_SMARTCA_DEFAULTS.uat.urlQd769);
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1 cursor-pointer',
                        smartcaBaseUrl.includes('rmgateway.vnptit.vn')
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      )}
                      title="Gán sẵn 3 link UAT thử nghiệm"
                    >
                      UAT Thử nghiệm (rmgateway)
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* 1. Url */}
                  <div className="flex items-center border border-teal-600/40 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-600 shadow-xs">
                    <div className="flex items-center gap-2 px-3 py-2 bg-teal-50/50 text-teal-800 border-r border-teal-600/30 w-36 shrink-0 font-medium text-xs">
                      <Network className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Url</span>
                    </div>
                    <input
                      type="text"
                      value={smartcaBaseUrl}
                      onChange={e => setSmartcaBaseUrl(e.target.value)}
                      placeholder="https://gwsca.vnpt.vn/"
                      className="flex-1 px-3 py-2 text-xs font-mono text-slate-800 outline-none bg-transparent"
                    />
                  </div>

                  {/* 2. Url Eseal */}
                  <div className="flex items-center border border-teal-600/40 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-600 shadow-xs">
                    <div className="flex items-center gap-2 px-3 py-2 bg-teal-50/50 text-teal-800 border-r border-teal-600/30 w-36 shrink-0 font-medium text-xs">
                      <Network className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Url Eseal</span>
                    </div>
                    <input
                      type="text"
                      value={smartcaUrlEseal}
                      onChange={e => setSmartcaUrlEseal(e.target.value)}
                      placeholder="https://gwsca.vnpt.vn/esca"
                      className="flex-1 px-3 py-2 text-xs font-mono text-slate-800 outline-none bg-transparent"
                    />
                  </div>

                  {/* 3. Url QD769 */}
                  <div className="flex items-center border border-teal-600/40 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-600 shadow-xs">
                    <div className="flex items-center gap-2 px-3 py-2 bg-teal-50/50 text-teal-800 border-r border-teal-600/30 w-36 shrink-0 font-medium text-xs">
                      <Network className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Url QD769</span>
                    </div>
                    <input
                      type="text"
                      value={smartcaUrlQd769}
                      onChange={e => setSmartcaUrlQd769(e.target.value)}
                      placeholder="https://gwsca.vnpt.vn/sca/sp769"
                      className="flex-1 px-3 py-2 text-xs font-mono text-slate-800 outline-none bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Thẻ trạng thái kết nối Agent ký số cục bộ (Cổng 18088) */}
              <div
                className={cn(
                  'p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors',
                  isLocalAgentRunning
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-300 text-amber-950'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-full shrink-0',
                      isLocalAgentRunning ? 'bg-emerald-500 shadow-xs shadow-emerald-400 animate-pulse' : 'bg-amber-500'
                    )}
                  />
                  <div>
                    <span className="font-bold text-sm">
                      {isLocalAgentRunning
                        ? '🟢 Công cụ đổi IP về Việt Nam cho SmartCA đang chạy (Cổng 18088)'
                        : '🌐 Công cụ đổi IP về Việt Nam cho VNPT SmartCA (Chỉ cần khi ký SmartCA)'}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isLocalAgentRunning
                        ? 'Đã định tuyến kết nối VNPT SmartCA qua mạng máy tính Việt Nam (bỏ qua chặn IP quốc tế trên Cloud Vercel).'
                        : 'Chỉ cần chạy file .bat này khi ký VNPT SmartCA để đổi IP về Việt Nam. (Nếu ký bằng USB Token thì đã tích hợp sẵn trên phần mềm, không cần chạy file .bat).'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/tools/Chay_Ky_So_USB_Token.bat"
                    download="Chay_Ky_So_USB_Token.bat"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Tải công cụ đổi IP về Việt Nam cho VNPT SmartCA"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải công cụ đổi IP (.bat)</span>
                  </a>
                  <button
                    type="button"
                    onClick={checkLocalAgent}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-lg text-xs shadow-2xs cursor-pointer shrink-0 transition-colors"
                  >
                    Kiểm tra lại
                  </button>
                </div>
              </div>

              {/* Thông tin SP & Thuê bao */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="text-xs font-black uppercase text-blue-700 tracking-wide">
                  1. Thông tin tích hợp SP & Thuê bao (Dùng để lấy chứng thư số - API 4.1)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client ID (sp_id do VNPT cấp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={smartcaClientId}
                      onChange={e => setSmartcaClientId(e.target.value)}
                      placeholder="VD: 4184-637127995547330633.apps.signserviceapi.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Secret (sp_password do VNPT cấp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={smartcaClientSecret}
                      onChange={e => setSmartcaClientSecret(e.target.value)}
                      placeholder="Mật khẩu SP do CA cung cấp"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      User ID (user_id: Số CCCD / CMND / MST thuê bao) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={smartcaUserId}
                      onChange={e => setSmartcaUserId(e.target.value)}
                      placeholder="VD: 0131930813216 hoặc MST đơn vị"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Serial Number (serial_number — Có thể để trống để tự lấy)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoComplete="off"
                        value={smartcaSerialNumber}
                        onChange={e => setSmartcaSerialNumber(e.target.value)}
                        placeholder="Bấm 'Lấy CKS' để tự động điền..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50 cursor-pointer"
                        title="Gọi API v1/credentials/get_certificate để lấy chứng thư số và Serial Number từ VNPT SmartCA"
                      >
                        <KeyRound className={cn('w-3.5 h-3.5', isTesting && 'animate-spin')} />
                        {isTesting ? 'Đang lấy...' : 'Lấy CKS & Serial'}
                      </button>
                      <label
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                        title="Nạp trực tiếp tệp chứng thư số (.cer, .crt, .pem) từ máy tính"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Nạp file .CER</span>
                        <input
                          type="file"
                          accept=".cer,.crt,.pem,.txt"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                try {
                                  const parsed = parseCertificateInput(reader.result as ArrayBuffer);
                                  if (parsed.rawCertBase64) {
                                    setSmartcaCertificate(parsed.rawCertBase64);
                                    if (parsed.serialNumber) setSmartcaSerialNumber(parsed.serialNumber);
                                    if (parsed.subject) setSmartcaSubject(parsed.subject);
                                    setTestResult({
                                      success: true,
                                      message: `Đã nạp chứng thư số thành công từ tệp ${file.name}!`,
                                      details: `Chủ thể: ${parsed.subject}\nSerial: ${parsed.serialNumber || smartcaSerialNumber || '---'}`,
                                    });
                                  }
                                } catch (err: any) {
                                  alert('Không thể đọc tệp chứng thư: ' + err.message);
                                }
                              };
                              reader.readAsArrayBuffer(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Danh sách chứng thư số lấy về từ API 4.1 (nếu thuê bao có nhiều chứng thư) */}
                {fetchedCerts.length > 0 && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="text-xs font-bold text-blue-900">
                      Danh sách chứng thư số của thuê bao ({fetchedCerts.length} chứng thư — bấm để chọn):
                    </div>
                    <div className="space-y-1.5">
                      {fetchedCerts.map((c, idx) => {
                        const isSelected =
                          c.serialNumber.toLowerCase() === smartcaSerialNumber.toLowerCase();
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectFetchedCert(c)}
                            className={cn(
                              'p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-2',
                              isSelected
                                ? 'bg-white border-blue-500 shadow-xs text-blue-900'
                                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                            )}
                          >
                            <div>
                              <div className="font-bold">{c.subject}</div>
                              <div className="font-mono text-[11px] text-slate-500">
                                Serial: <b>{c.serialNumber}</b>{' '}
                                {c.certId ? `• Cert ID: ${c.certId}` : ''}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[11px] shrink-0">
                                ✓ Đang chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hiển thị thông tin chứng thư số hiện đang lưu */}
                {smartcaCertificate && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">Đã nạp Chứng thư số X.509 (cert_data):</div>
                      <div className="mt-0.5 truncate">
                        <b>Chủ thể:</b> {smartcaSubject || 'Đã xác thực'}
                      </div>
                      <div className="font-mono text-[11px]">
                        <b>Serial:</b> {smartcaSerialNumber || '---'} • <b>Độ dài Base64:</b>{' '}
                        {smartcaCertificate.length} ký tự
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chế độ ký số: Gói tích hợp v2 (TOTP/OTP) hoặc Xác nhận qua App v1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-indigo-700 tracking-wide">
                    2. Chế độ ký số VNPT SmartCA (Mục 4.2 App v1 / Mục 4.5 Gói tích hợp v2)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSmartcaSignMode('TOTP')}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-bold border transition',
                        smartcaSignMode === 'TOTP'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      Gói tích hợp v2 (Ký tự động bằng Password + OTP/TOTP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmartcaSignMode('APP')}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-bold border transition',
                        smartcaSignMode === 'APP'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      Xác nhận qua App điện thoại v1 (Không cần OTP)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mật khẩu đăng nhập thuê bao (password — Mục 4.5 v2)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={smartcaPassword}
                      onChange={e => setSmartcaPassword(e.target.value)}
                      placeholder="Nhập mật khẩu đăng nhập tài khoản SmartCA"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Khóa Secret (TOTP) hoặc Mã OTP 6 số (otp — Mục 4.5 v2)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={smartcaTotpSecret}
                      onChange={e => setSmartcaTotpSecret(e.target.value)}
                      placeholder="Nhập chuỗi TOTP Secret (để tự sinh OTP) hoặc mã OTP 6 số"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  💡 <b>Hướng dẫn theo tài liệu VNPT SmartCA v2.0:</b>
                  <br />• Nếu dùng <b>Gói tích hợp v2 (`v2/signatures/sign` + `v2/signatures/confirm`)</b>: Nhập{' '}
                  <b>Password</b> và <b>Secret (TOTP)</b> để ký hàng loạt tự động không cần bấm điện thoại.
                  <br />• Nếu dùng <b>Ký xác nhận qua App (`v1/signatures/sign` + `status`)</b>: Chọn chế độ{' '}
                  <b>Xác nhận qua App điện thoại v1</b>, khi bấm ký hệ thống sẽ gửi thông báo về ứng dụng VNPT SmartCA trên điện thoại để bạn bấm xác nhận.
                </div>
              </div>

              {/* 3. Tùy chọn lưu trữ: Lưu vĩnh viễn vs Chỉ lưu tạm (F5/tắt web tự xóa) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center justify-between">
                  <span>3. Tùy chọn lưu trữ cấu hình trên trình duyệt</span>
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full',
                      smartcaStorageMode === 'persistent'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {smartcaStorageMode === 'persistent'
                      ? '🟢 Lưu vĩnh viễn (F5 không mất)'
                      : '🟡 Chỉ lưu tạm (F5/tắt web tự xóa)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <label
                    onClick={() => setSmartcaStorageMode('persistent')}
                    className={cn(
                      'p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition',
                      smartcaStorageMode === 'persistent'
                        ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type="radio"
                      name="storageMode"
                      checked={smartcaStorageMode === 'persistent'}
                      onChange={() => setSmartcaStorageMode('persistent')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Lưu vĩnh viễn trên máy tính này</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Mỗi lần F5 hoặc tắt trình duyệt mở lại vẫn giữ nguyên cấu hình SmartCA, không cần nhập lại.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setSmartcaStorageMode('session_only')}
                    className={cn(
                      'p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition',
                      smartcaStorageMode === 'session_only'
                        ? 'bg-amber-50/70 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-500 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type="radio"
                      name="storageMode"
                      checked={smartcaStorageMode === 'session_only'}
                      onChange={() => setSmartcaStorageMode('session_only')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Chỉ lưu tạm trong phiên (Bảo mật cao)</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Không muốn lưu trên web. Mỗi lần F5 hoặc tắt trang web thì cấu hình sẽ tự động xóa sạch để an toàn.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Ảnh chữ ký tay / Con dấu (Phục vụ Ký số PDF Mẫu 02/BH) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase text-indigo-700 tracking-wide">
                      4. Ảnh chữ ký tay / Con dấu (Phục vụ Ký số PDF Mẫu 02/BH)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Tự động tách nền trắng/xám thành trong suốt và ghép với thông tin chữ ký số màu đỏ ở độ phân giải cao (1200x400).
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      Chọn ảnh chữ ký (.png, .jpg)
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.bmp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Vui lòng chọn ảnh chữ ký có dung lượng nhỏ hơn 2MB!');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const dataUrl = String(ev.target?.result || '');
                            setSignatureImageB64(dataUrl);
                            saveSignatureImage(dataUrl);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {signatureImageB64 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureImageB64('');
                          saveSignatureImage('');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                      >
                        ✕ Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
                {signatureImageB64 ? (
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                    <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center h-20 w-44 shrink-0 overflow-hidden">
                      <img
                        src={signatureImageB64.startsWith('data:') ? signatureImageB64 : `data:image/png;base64,${signatureImageB64}`}
                        alt="Ảnh chữ ký"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã tải ảnh chữ ký tay dùng cho Mẫu 02/BH
                      </div>
                      <div>Khi ký PDF Mẫu 02/BH, hệ thống sẽ tự động xóa phông nền trắng và đè chữ đỏ thông tin chứng thư số lên trên ảnh chữ ký này.</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    Chưa chọn ảnh chữ ký tay (Nếu để trống, khi ký PDF sẽ chỉ hiển thị khung chữ đỏ thông tin Chứng thư số).
                  </div>
                )}
              </div>

              {testResult && activeTab === 'smartca' && (
                <div
                  className={cn(
                    'p-4 mt-4 rounded-xl text-sm flex items-start gap-3 border',
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  )}
                >
                  {testResult.success ? (
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.details && (
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed opacity-90">
                        {testResult.details}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BHYT Tab */}
          {activeTab === 'bhyt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đăng nhập Cổng BHXH (chuẩn liên thông:{' '}
                  <span className="text-blue-600">48225_BV</span>)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={bhytUsername}
                  onChange={e => setBhytUsername(e.target.value)}
                  placeholder="48225_BV"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tài khoản được BHXH Việt Nam cấp cho cơ sở KCB để liên thông qua Cổng tiếp nhận
                  (định dạng: <strong>48225_BV</strong>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={bhytPassword}
                  onChange={e => setBhytPassword(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {testResult && activeTab === 'bhyt' && (
                <div
                  className={cn(
                    'p-3 mt-4 rounded-lg text-sm font-semibold flex items-start gap-2 border',
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {testResult.success ? (
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}
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
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn('w-4 h-4', isTesting && 'animate-spin')} />
              {isTesting
                ? 'Đang kiểm tra...'
                : activeTab === 'smartca'
                ? 'Kiểm tra kết nối & Lấy CKS SmartCA'
                : 'Kiểm tra kết nối'}
            </button>
            <button
              onClick={handleClearConfig}
              className="px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 cursor-pointer"
            >
              Xóa cấu hình
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
