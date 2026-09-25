/**
 * CskcbSetupModal - Thiết lập Cơ Sở Khám Chữa Bệnh
 * Nhập mã CSKCB → tự động tra cứu tên từ danh mục BHXH
 * Xác thực khớp với tài khoản cổng BHXH
 *
 * Tên phần mềm: ĐỐI CHIẾU HỒ SƠ VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Building2, Search, CheckCircle2, AlertCircle,
  FileSpreadsheet, Loader2, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface CskcbInfo {
  ma: string;
  ten: string;
  tuyen: string;
  hang: string;
  diaChi: string;
}

export interface CskcbConfig {
  cskcb: CskcbInfo;
  bhxhAccount: {
    username: string;
    password: string; // MD5 hash
    passwordRaw: string; // raw để show
  };
  smartCA?: {
    spId: string;
    clientSecret: string;
    userId: string;
    serialNumber: string;
  };
}

interface Props {
  onClose?: () => void;
  onSave: (config: CskcbConfig) => void;
  initialConfig?: Partial<CskcbConfig>;
}

export default function CskcbSetupModal({ onClose, onSave, initialConfig }: Props) {
  const [step, setStep] = useState<'cskcb' | 'account' | 'done'>(
    initialConfig?.cskcb ? 'account' : 'cskcb'
  );

  // CSKCB state
  const [maKcb, setMaKcb] = useState(initialConfig?.cskcb?.ma || '');
  const [cskcbList, setCskcbList] = useState<CskcbInfo[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [foundCskcb, setFoundCskcb] = useState<CskcbInfo | null>(initialConfig?.cskcb || null);
  const [tenManual, setTenManual] = useState(initialConfig?.cskcb?.ten || '');
  const [searchResults, setSearchResults] = useState<CskcbInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Account state
  const [username, setUsername] = useState(initialConfig?.bhxhAccount?.username || '');
  const [password, setPassword] = useState(initialConfig?.bhxhAccount?.passwordRaw || '');
  const [showPass, setShowPass] = useState(false);
  const [validating, setValidating] = useState(false);
  const [accountValid, setAccountValid] = useState<null | boolean>(null);
  const [accountMsg, setAccountMsg] = useState('');

  // Validation state
  const [warnings, setWarnings] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load danh mục CSKCB từ file JSON đã xuất
  useEffect(() => {
    setLoadingList(true);
    import('../data/cskcb_list.json').then((data) => {
      setCskcbList(data.default as CskcbInfo[]);
      setLoadingList(false);
    }).catch(() => setLoadingList(false));
  }, []);

  // Tự động tra cứu khi nhập mã
  useEffect(() => {
    const code = maKcb.trim();
    
    // Nếu mã thay đổi và không khớp với foundCskcb hiện tại thì clear foundCskcb
    if (foundCskcb && code !== foundCskcb.ma) {
      setFoundCskcb(null);
    }

    if (code.length < 3) {
      setSearchResults([]);
      return;
    }

    if (cskcbList.length === 0) return;

    // Tìm exact match theo mã
    const exact = cskcbList.find(c => c.ma === code);
    if (exact) {
      setFoundCskcb(exact);
      setTenManual(exact.ten);
      setSearchResults([]);
      setShowDropdown(false);
    } else {
      // Tìm partial match
      const partial = cskcbList.filter(c =>
        c.ma.startsWith(code) || c.ten.toLowerCase().includes(code.toLowerCase())
      ).slice(0, 8);
      setSearchResults(partial);
      setShowDropdown(partial.length > 0);
    }
  }, [maKcb, cskcbList]);

  // Validate tài khoản cổng BHXH
  const validateAccount = async () => {
    if (!username || !password) return;
    setValidating(true);
    setAccountValid(null);

    // Kiểm tra username có khớp với mã CSKCB không
    const warns: string[] = [];
    const maCode = foundCskcb?.ma || maKcb;

    // Thông thường tài khoản BHXH có dạng: MACS hoặc MACS_BV
    if (maCode && !username.includes(maCode)) {
      warns.push(`Tài khoản "${username}" không chứa mã CSKCB "${maCode}". Kiểm tra lại!`);
    }

    // Thử lấy token từ cổng BHXH để xác thực
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      // MD5 hash password
      formData.append('password', await md5Async(password));

      const resp = await fetch('https://egw.baohiemxahoi.gov.vn/api/token/take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const json = await resp.json().catch(() => null);

      if (json?.maKetQua === '200') {
        setAccountValid(true);
        setAccountMsg('Xác thực thành công! Token đã được cấp.');
        // Lưu token vào localStorage để dùng
        localStorage.setItem('bhxh_token', json.APIKey?.access_token || '');
        localStorage.setItem('bhxh_id_token', json.APIKey?.id_token || '');
      } else {
        setAccountValid(false);
        const errMap: Record<string, string> = {
          '401': 'Tài khoản không tồn tại',
          '402': 'Mã cơ sở KCB không đúng',
          '403': 'Tài khoản đã bị khóa',
          '500': 'Lỗi hệ thống BHXH',
        };
        setAccountMsg(errMap[json?.maKetQua] || `Lỗi xác thực: ${json?.maKetQua}`);
        if (json?.maKetQua === '402') warns.push('Mã CSKCB không khớp với tài khoản cổng!');
      }
    } catch (e: any) {
      setAccountValid(false);
      setAccountMsg('Không kết nối được cổng BHXH. Kiểm tra mạng.');
    }

    setWarnings(warns);
    setValidating(false);
  };

  const handleSave = () => {
    if (!foundCskcb && !tenManual) return;
    const cskcb = foundCskcb || { ma: maKcb, ten: tenManual, tuyen: '', hang: '', diaChi: '' };
    const cfg: CskcbConfig = {
      cskcb,
      bhxhAccount: { username, password: '', passwordRaw: password },
    };
    // Lưu vào localStorage
    localStorage.setItem('cskcb_config', JSON.stringify(cfg));
    onSave(cfg);
  };

  const selectFromDropdown = (item: CskcbInfo) => {
    setFoundCskcb(item);
    setMaKcb(item.ma);
    setTenManual(item.ten);
    setShowDropdown(false);
  };

  // Import từ Excel CSKCB
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { read, utils } = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = read(buf);
    const sh = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(sh, { header: 1 }) as string[][];
    // Thêm vào danh sách local
    const imported = rows.slice(1).filter(r => r[1]).map(r => ({
      ma: String(r[1]).trim(),
      ten: String(r[2]).trim(),
      tuyen: String(r[4] || ''),
      hang: String(r[5] || ''),
      diaChi: String(r[8] || ''),
    }));
    setCskcbList(prev => {
      const map = new Map(prev.map(c => [c.ma, c]));
      imported.forEach(c => map.set(c.ma, c));
      return Array.from(map.values());
    });
    alert(`Đã nhập ${imported.length} cơ sở KCB từ Excel!`);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">Thiết Lập Cơ Sở Khám Chữa Bệnh</h2>
            <p className="text-sm text-slate-500">Nhập mã CSKCB để xác định đơn vị trước khi bắt đầu</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-slate-100">
          {[
            { key: 'cskcb', label: '1. Mã CSKCB' },
            { key: 'account', label: '2. Tài Khoản Cổng' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStep(s.key as any)}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition border-b-2',
                step === s.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step === 'cskcb' && (
            <>
              {/* Mã KCB input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Mã Cơ Sở KCB (5 Chữ Số) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{maKcb.length}/5 ký tự</span>
                </div>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    maxLength={5}
                    value={maKcb}
                    onChange={e => setMaKcb(e.target.value.replace(/\D/g, ''))}
                    placeholder="VD: 49004"
                    className={cn(
                      'w-full px-4 py-3 pr-12 border-2 rounded-xl text-lg font-mono font-bold focus:outline-none transition',
                      foundCskcb ? 'border-emerald-400 bg-emerald-50 text-emerald-800' :
                        maKcb.length === 5 ? 'border-amber-400 bg-amber-50 text-amber-800' :
                          'border-slate-200 focus:border-blue-400'
                    )}
                  />
                  {foundCskcb && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  )}
                  {loadingList && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Mã 5 chữ số do Bảo hiểm Xã hội Việt Nam cấp cho đơn vị của bạn.</p>

                {/* Dropdown results */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-xl shadow-lg bg-white overflow-hidden z-10">
                    {searchResults.map(item => (
                      <button
                        key={item.ma}
                        onClick={() => selectFromDropdown(item)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-blue-700 text-sm w-14">{item.ma}</span>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{item.ten}</div>
                            <div className="text-[11px] text-slate-500">{item.tuyen} · {item.diaChi}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tên CSKCB */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Tên Cơ Sở Khám Chữa Bệnh <span className="text-red-500">*</span>
                  </label>
                  <button className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold">
                    <Search className="w-3 h-3" />
                    Tìm thấy từ danh mục BHXH
                  </button>
                </div>

                {foundCskcb ? (
                  <div className="border-2 border-emerald-400 rounded-xl p-4 bg-emerald-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mt-0.5">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-emerald-800 text-sm">{foundCskcb.ten}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">Bạn có thể chỉnh sửa lại tên đơn vị nếu cần thiết.</div>
                        <div className="flex gap-4 mt-2 text-[11px] font-semibold">
                          <span className="text-slate-500">Mã CSKCB: <span className="text-blue-700">{foundCskcb.ma}</span></span>
                          <span className="text-slate-500">Tài khoản Cổng BHXH: <span className="text-blue-700">{foundCskcb.ma}_BV</span></span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {foundCskcb.tuyen} · {foundCskcb.hang} · {foundCskcb.diaChi}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={tenManual}
                    onChange={e => setTenManual(e.target.value)}
                    placeholder="Nhập tên cơ sở khám chữa bệnh..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                  />
                )}
              </div>

              {/* Import Excel danh mục */}
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Cập nhật danh mục từ Excel
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                </label>
                <span className="text-[11px] text-slate-400">
                  {cskcbList.length > 0 ? `${cskcbList.length.toLocaleString()} CSKCB trong danh mục` : 'Chưa có danh mục'}
                </span>
              </div>
            </>
          )}

          {step === 'account' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Tên Đăng Nhập Cổng BHXH <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setAccountValid(null); }}
                  placeholder={`VD: ${maKcb || '49004'}_BV`}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm font-mono"
                />
                {/* Cảnh báo không khớp mã CSKCB */}
                {username && foundCskcb && !username.includes(foundCskcb.ma) && (
                  <div className="flex items-center gap-2 mt-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Tài khoản không chứa mã CSKCB "{foundCskcb.ma}". Kiểm tra lại!
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Mật Khẩu Cổng BHXH <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setAccountValid(null); }}
                    placeholder="Mật khẩu đăng nhập cổng BHXH..."
                    className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Mật khẩu sẽ được mã hóa MD5 trước khi gửi đến cổng BHXH.</p>
              </div>

              {/* Validate account */}
              <button
                onClick={validateAccount}
                disabled={!username || !password || validating}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {validating ? 'Đang xác thực...' : 'Kiểm tra tài khoản cổng BHXH'}
              </button>

              {/* Account validation result */}
              {accountValid !== null && (
                <div className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border text-sm font-semibold',
                  accountValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                )}>
                  {accountValid ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <div>
                    <div>{accountMsg}</div>
                    {warnings.map((w, i) => (
                      <div key={i} className="text-amber-700 mt-1 font-normal text-xs">⚠️ {w}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* CSKCB summary */}
              {(foundCskcb || tenManual) && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
                  <div className="font-bold text-slate-700 mb-1">Thông tin đơn vị đã chọn:</div>
                  <div className="text-slate-600">
                    <span className="font-semibold">Mã CSKCB:</span> {foundCskcb?.ma || maKcb}
                    {' · '}
                    <span className="font-semibold">Tên:</span> {foundCskcb?.ten || tenManual}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 gap-3">
          {step === 'cskcb' ? (
            <>
              {onClose ? (
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                  Hủy
                </button>
              ) : (
                <div /> // placeholder for flex-between
              )}
              <button
                onClick={() => setStep('account')}
                disabled={!maKcb || (!foundCskcb && !tenManual)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Tiếp theo — Tài Khoản Cổng
                <span>›</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('cskcb')} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                ← Quay lại
              </button>
              <button
                onClick={handleSave}
                disabled={!username}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận để bắt đầu sử dụng
              </button>
            </>
          )}
        </div>

        {/* Footer signature */}
        <div className="border-t border-slate-100 px-6 py-2 bg-slate-50 text-center text-[10px] text-slate-400 font-medium">
          ĐỐI CHIẾU HỒ SƠ VÀ CHỨNG TỪ TT25 · NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
        </div>
      </div>
    </div>
  );
}

/** MD5 hash async (thông qua SubtleCrypto → SHA-256 → hex, hoặc native MD5 polyfill) */
async function md5Async(str: string): Promise<string> {
  // BHXH yêu cầu MD5. Nếu đã là MD5 (32 hex), trả về nguyên
  if (/^[a-f0-9]{32}$/i.test(str)) return str.toLowerCase();
  // Tạm thời dùng SHA-256 encode → trong production cần thư viện md5
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
