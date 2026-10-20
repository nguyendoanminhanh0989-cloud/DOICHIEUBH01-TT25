/**
 * KÝ SỐ & ĐẨY CỔNG BHXH - GIAO DIỆN THAO TÁC
 * Hỗ trợ: Ký 1 ca / Ký hàng loạt | VNPT SmartCA TOTP / USB Token
 * 
 * Tên phần mềm: ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Send, AlertTriangle, CheckCircle2,
  Loader2, Info, Usb, Smartphone, ChevronDown, XCircle,
  Download, Upload, RefreshCw, FileCode
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { HoSoRecord, SignMethod } from '../lib/signAndSubmitService';
import { checkLocalTokenSigner, LocalSignerStatus } from '../lib/localTokenSignerService';

interface KySoModalProps {
  records: HoSoRecord[];                                    // Danh sách hồ sơ được chọn
  mode: 'sign' | 'submit' | 'sign_then_submit';            // Chế độ thao tác
  onClose: () => void;
  onComplete: (updatedRecords: HoSoRecord[]) => void;      // Callback cập nhật danh sách
}

type Step = 'config' | 'progress' | 'done';

interface ProgressEntry {
  id: string;
  hoTen: string;
  status: 'waiting' | 'running' | 'success' | 'error';
  message: string;
}

export default function KySoModal({ records, mode, onClose, onComplete }: KySoModalProps) {
  const [currentRecords, setCurrentRecords] = useState<HoSoRecord[]>(records);
  const [step, setStep] = useState<Step>('config');
  const [signMethod, setSignMethod] = useState<SignMethod>('USB_TOKEN'); // Default USB Token as requested by user
  const [progressList, setProgressList] = useState<ProgressEntry[]>([]);
  const [resultRecords, setResultRecords] = useState<HoSoRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = React.useRef(false);
  const [summary, setSummary] = useState({ success: 0, error: 0, total: 0 });

  const [localSignerStatus, setLocalSignerStatus] = useState<LocalSignerStatus | null>(null);
  const [isCheckingSigner, setIsCheckingSigner] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const signableRecords = currentRecords.filter(r => r.trangThai !== 'SUBMITTED');
  const unsignedWarning = currentRecords.filter(r => r.trangThai !== 'SIGNED' && mode !== 'sign');

  const checkSigner = async () => {
    setIsCheckingSigner(true);
    try {
      const res = await checkLocalTokenSigner();
      setLocalSignerStatus(res);
    } catch {
      setLocalSignerStatus({ available: false });
    } finally {
      setIsCheckingSigner(false);
    }
  };

  useEffect(() => {
    if (signMethod === 'USB_TOKEN') {
      checkSigner();
    }
  }, [signMethod]);

  const handleDownloadXml = async () => {
    const { buildXml } = await import('../lib/xmlBuilder');
    const { getOrgConfig } = await import('../lib/signAndSubmitService');
    const org = getOrgConfig();

    for (const rec of signableRecords) {
      let xmlContent = rec.xmlContent;
      if (!xmlContent) {
        try { xmlContent = buildXml(rec.type, rec.rawData, org.ma_cskcb); } catch {}
      }
      if (!xmlContent) continue;
      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rec.type}_${rec.hoTen.replace(/\s+/g, '_')}_${rec.maBhyt || rec.id}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleUploadSignedXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let updatedCount = 0;
    const newRecords = [...currentRecords];

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const text = await file.text();
      if (!text.includes('<SignatureValue>')) {
        alert(`File ${file.name} chưa chứa chữ ký số XMLDSig hợp lệ!`);
        continue;
      }

      const matchedIdx = newRecords.findIndex(r => 
        (r.maBhyt && text.includes(r.maBhyt)) || 
        (r.hoTen && text.includes(r.hoTen)) ||
        file.name.includes(r.id)
      );

      if (matchedIdx !== -1) {
        newRecords[matchedIdx] = {
          ...newRecords[matchedIdx],
          trangThai: 'SIGNED',
          xmlContent: text,
          errorMessage: undefined
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      setCurrentRecords(newRecords);
      onComplete(newRecords);
      alert(`Đã nạp thành công ${updatedCount} hồ sơ đã ký số! Bây giờ bạn có thể bấm "Đẩy Cổng BHXH".`);
    } else {
      alert('Không tìm thấy hồ sơ nào trong danh sách khớp với file XML vừa chọn.');
    }

    if (e.target) e.target.value = '';
  };

  const modeLabel = {
    sign: 'Ký Số Hồ Sơ',
    submit: 'Đẩy Cổng BHXH',
    sign_then_submit: 'Ký Số & Đẩy Cổng BHXH',
  }[mode];

  const handleStart = async () => {
    setStep('progress');
    setIsRunning(true);
    setIsCancelled(false);
    cancelRef.current = false;

    const { 
      signOneRecord, submitOneRecord 
    } = await import('../lib/signAndSubmitService');

    const { buildXml } = await import('../lib/xmlBuilder');
    const { getOrgConfig } = await import('../lib/signAndSubmitService');
    const org = getOrgConfig();

    const initialProgress: ProgressEntry[] = signableRecords.map(r => ({
      id: r.id,
      hoTen: r.hoTen,
      status: 'waiting',
      message: 'Đang chờ xử lý...',
    }));
    setProgressList(initialProgress);

    const updated: HoSoRecord[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < signableRecords.length; i++) {
      // Check cancel flag trước mỗi hồ sơ
      if (cancelRef.current) {
        // Đánh dấu tất cả hồ sơ còn lại là hủy
        setProgressList(prev => prev.map((p, idx) =>
          idx >= i ? { ...p, status: 'error', message: '🚫 Đã hủy bởi người dùng' } : p
        ));
        break;
      }

      let rec = signableRecords[i];

      const update = (status: ProgressEntry['status'], message: string) => {
        setProgressList(prev => {
          const copy = [...prev];
          copy[i] = { ...copy[i], status, message };
          return copy;
        });
      };

      try {
        update('running', 'Đang xử lý...');

        // === BƯỚC 1: Tạo XML chuẩn BHXH (luôn làm mới khi ký hoặc nếu chứa thẻ cũ) ===
        if (!rec.xmlContent || mode === 'sign' || mode === 'sign_then_submit' || rec.xmlContent.includes('GIAYCHUNGNHANNGHIVIEC') || rec.xmlContent.includes('<GRV>') || rec.xmlContent.includes('<TOMTATBA>') || rec.xmlContent.includes('GIAYXACNHANNGHIDUONGTHAI')) {
          update('running', '📄 Đang tạo XML chuẩn BHXH...');
          const xmlStr = buildXml(rec.type, rec.rawData, org.ma_cskcb);
          rec = { ...rec, xmlContent: xmlStr };
        }

        // === BƯỚC 2: Ký số ===
        if (mode === 'sign' || mode === 'sign_then_submit') {
          if (cancelRef.current) { update('error', '🚫 Đã hủy'); errorCount++; break; }
          update('running', `🔐 Đang ký số bằng ${signMethod}...`);
          rec = await signOneRecord(rec, signMethod, (msg) => update('running', msg));
          update('running', '✅ Ký số thành công!');
        }

        // === BƯỚC 3: Đẩy cổng ===
        if (mode === 'submit' || mode === 'sign_then_submit') {
          if (cancelRef.current) { update('error', '🚫 Đã hủy'); errorCount++; break; }
          if (rec.trangThai !== 'SIGNED') {
            update('error', '⚠️ Bỏ qua - Hồ sơ chưa được ký số!');
            updated.push({ ...rec, trangThai: 'SIGN_FAILED', errorMessage: 'Chưa ký số' });
            errorCount++;
            continue;
          }
          update('running', '📤 Đang đẩy lên Cổng BHXH...');
          rec = await submitOneRecord(rec, (msg) => update('running', msg));
          update('success', `✅ Thành công! Mã GD: ${rec.maGD}`);
        } else {
          update('success', '✅ Ký số hoàn thành!');
        }

        updated.push(rec);
        successCount++;
      } catch (err: any) {
        update('error', `❌ Lỗi: ${err.message}`);
        updated.push({ ...rec, trangThai: mode === 'sign' ? 'SIGN_FAILED' : 'SUBMIT_FAILED', errorMessage: err.message });
        errorCount++;
      }
    }

    setSummary({ success: successCount, error: errorCount, total: signableRecords.length });
    setResultRecords(updated);
    setStep('done');
    setIsRunning(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsCancelled(true);
  };

  const handleDone = () => {
    onComplete(resultRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow",
              mode === 'sign' && 'bg-blue-600 shadow-blue-200',
              mode === 'submit' && 'bg-emerald-600 shadow-emerald-200',
              mode === 'sign_then_submit' && 'bg-indigo-600 shadow-indigo-200',
            )}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{modeLabel}</h2>
              <div className="text-xs text-slate-500">{records.length} hồ sơ được chọn</div>
            </div>
          </div>
          {isRunning ? (
            <button
              onClick={handleCancel}
              disabled={isCancelled}
              title="Tạm dừng / Hủy ký"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-50 transition"
            >
              <X className="w-4 h-4" />
              {isCancelled ? 'Đang dừng...' : 'Hủy / Dừng ký'}
            </button>
          ) : (
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* === BƯỚC 1: CẤU HÌNH === */}
          {step === 'config' && (
            <div className="space-y-5">

              {/* Cảnh báo hồ sơ chưa ký */}
              {mode === 'submit' && unsignedWarning.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong>Cảnh báo:</strong> Có <strong>{unsignedWarning.length}</strong> hồ sơ chưa được ký số sẽ bị bỏ qua.
                    Chỉ những hồ sơ có trạng thái <strong>"ĐÃ KÝ SỐ"</strong> mới được đẩy cổng BHXH.
                  </div>
                </div>
              )}

              {/* Chọn phương thức ký */}
              {(mode === 'sign' || mode === 'sign_then_submit') && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Phương thức ký số</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { id: 'SMARTCA_TOTP', icon: <Smartphone className="w-5 h-5" />, label: 'VNPT SmartCA', sub: 'Ký tự động qua TOTP' },
                      { id: 'SMARTCA_APP', icon: <Smartphone className="w-5 h-5" />, label: 'VNPT SmartCA App', sub: 'Xác nhận qua ứng dụng' },
                      { id: 'USB_TOKEN', icon: <Usb className="w-5 h-5" />, label: 'USB Token', sub: 'Ký qua thiết bị USB' },
                    ] as { id: SignMethod, icon: React.ReactNode, label: string, sub: string }[]).map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSignMethod(m.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          signMethod === m.id
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                          signMethod === m.id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {m.icon}
                        </div>
                        <div className="text-sm font-bold text-slate-800">{m.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.sub}</div>
                        {m.id === 'USB_TOKEN' && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-1">Yêu cầu phần mềm ký cục bộ</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Panel hỗ trợ riêng cho USB Token */}
                  {signMethod === 'USB_TOKEN' && (
                    <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full animate-pulse",
                            localSignerStatus?.available ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-xs font-bold text-slate-700">
                            {localSignerStatus?.available 
                              ? `Đã kết nối công cụ ký USB Token (Cổng ${localSignerStatus.port})`
                              : "Chưa kết nối công cụ ký USB Token cục bộ"
                            }
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={checkSigner}
                          disabled={isCheckingSigner}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                        >
                          <RefreshCw className={cn("w-3 h-3", isCheckingSigner && "animate-spin")} />
                          Kiểm tra kết nối
                        </button>
                      </div>

                      {localSignerStatus?.available ? (
                        <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                          ✅ <strong>Sẵn sàng ký:</strong> Khi bạn bấm "Ký Số", hộp thoại nhập mã PIN của USB Token sẽ tự động xuất hiện trên máy tính.
                          {localSignerStatus.certSubject && (
                            <div className="mt-1 text-[11px] text-emerald-800 truncate font-mono">
                              Chủ thể: {localSignerStatus.certSubject}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-2">
                          <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                            Hai cách ký số bằng USB Token:
                          </div>
                          <div className="space-y-1.5 pl-5 text-[11px] list-decimal">
                            <div>
                              <strong>Cách 1 (Ký 1-click):</strong> Mở file <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">Chay_Ky_So_USB_Token.bat</code> trong thư mục phần mềm trên máy tính, sau đó bấm <em>"Kiểm tra kết nối"</em>.
                            </div>
                            <div>
                              <strong>Cách 2 (Ký ngoại tuyến):</strong> Bấm <em>"Tải XML chưa ký"</em> để tải file về, dùng phần mềm ký số USB Token của viện/phòng khám ký file, rồi bấm <em>"Tải lên XML đã ký"</em>.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nút thao tác ngoại tuyến và tải tool */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        <a
                          href="/tools/Ky_XML_Bang_USB_Token.bat"
                          download="Ky_XML_Bang_USB_Token.bat"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg shadow-sm transition"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-700" />
                          Tải Ky_XML_Bang_USB_Token.bat
                        </a>

                        <a
                          href="/tools/Chay_Ky_So_USB_Token.bat"
                          download="Chay_Ky_So_USB_Token.bat"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg shadow-sm transition"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-700" />
                          Tải Chay_Ky_So_USB_Token.bat (Ký 1-click)
                        </a>

                        <button
                          type="button"
                          onClick={handleDownloadXml}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          Tải XML chưa ký ({signableRecords.length})
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          Tải lên XML đã ký số
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleUploadSignedXml}
                          multiple
                          accept=".xml"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách hồ sơ */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Danh sách hồ sơ ({signableRecords.length})</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {signableRecords.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                      <div>
                        <span className="text-xs font-black text-indigo-700 mr-2">{r.type}</span>
                        <span className="text-sm font-semibold text-slate-800">{r.hoTen}</span>
                        <span className="text-xs text-slate-500 ml-2">{r.maBhyt}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase",
                        r.trangThai === 'SIGNED' && 'bg-blue-100 text-blue-700',
                        r.trangThai === 'DRAFT' && 'bg-slate-100 text-slate-600',
                        r.trangThai === 'UNSIGNED' && 'bg-amber-100 text-amber-700',
                      )}>
                        {r.trangThai === 'SIGNED' ? 'Đã ký' : r.trangThai === 'DRAFT' ? 'Nháp' : 'Chưa ký'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-700 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Hồ sơ sau khi ký số thật chuẩn XMLDSig (Phụ lục 02 TT25) sẽ được đẩy trực tiếp lên Cổng tiếp nhận BHXH: <strong>egw.baohiemxahoi.gov.vn</strong>.
                  <br />Hỗ trợ đồng thời cả <strong>USB Token cắm máy tính</strong> và <strong>VNPT SmartCA (App / TOTP)</strong>.
                </span>
              </div>
            </div>
          )}

          {/* === BƯỚC 2: TIẾN TRÌNH === */}
          {step === 'progress' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                  {isCancelled
                    ? <><X className="w-4 h-4 text-rose-500" /> <span className="text-rose-600">Đang dừng...</span></>
                    : <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Đang xử lý {signableRecords.length} hồ sơ...</>
                  }
                </div>
                {!isCancelled && (
                  <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition">
                    <X className="w-3.5 h-3.5" /> Dừng lại
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {progressList.map((p, i) => (
                  <div key={p.id} className={cn(
                    "p-3 rounded-xl border flex items-start gap-3 text-sm transition-all",
                    p.status === 'waiting' && 'bg-slate-50 border-slate-200 text-slate-500',
                    p.status === 'running' && 'bg-blue-50 border-blue-200 text-blue-800',
                    p.status === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
                    p.status === 'error' && 'bg-rose-50 border-rose-200 text-rose-800',
                  )}>
                    <div className="shrink-0 mt-0.5">
                      {p.status === 'waiting' && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                      {p.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      {p.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {p.status === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{i + 1}. {p.hoTen}</div>
                      <div className="text-xs mt-0.5 opacity-80">{p.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BƯỚC 3: KẾT QUẢ === */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-3xl font-black text-emerald-600">{summary.success}</div>
                  <div className="text-xs font-bold text-emerald-700 mt-1">Thành công</div>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-3xl font-black text-rose-600">{summary.error}</div>
                  <div className="text-xs font-bold text-rose-700 mt-1">Thất bại</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-3xl font-black text-slate-700">{summary.total}</div>
                  <div className="text-xs font-bold text-slate-600 mt-1">Tổng hồ sơ</div>
                </div>
              </div>

              {/* Banner trợ giúp tải công cụ ký USB Token khi có lỗi */}
              {summary.error > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Tải công cụ hỗ trợ ký số USB Token trên máy tính:
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Bạn có thể tải file <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900 font-bold">Ky_XML_Bang_USB_Token.bat</code> để ký ngoại tuyến hoặc <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-900 font-bold">Chay_Ky_So_USB_Token.bat</code> để ký trực tiếp 1-click từ trình duyệt.
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="/tools/Ky_XML_Bang_USB_Token.bat"
                      download="Ky_XML_Bang_USB_Token.bat"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải Ky_XML_Bang_USB_Token.bat
                    </a>
                    <a
                      href="/tools/Chay_Ky_So_USB_Token.bat"
                      download="Chay_Ky_So_USB_Token.bat"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      Tải Chay_Ky_So_USB_Token.bat (1-Click)
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('config');
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold ml-auto"
                    >
                      Quay lại cấu hình & thử lại →
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {progressList.map(p => (
                  <div key={p.id} className={cn(
                    "p-3 rounded-xl border flex items-start gap-3 text-sm",
                    p.status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  )}>
                    {p.status === 'success'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    }
                    <div>
                      <div className="font-bold text-slate-800">{p.hoTen}</div>
                      <div className={cn("text-xs mt-0.5", p.status === 'success' ? 'text-emerald-700' : 'text-rose-700')}>{p.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25 · NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
          </div>
          <div className="flex items-center gap-3">
            {step === 'config' && (
              <>
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50">
                  Hủy
                </button>
                <button
                  onClick={handleStart}
                  disabled={signableRecords.length === 0}
                  className={cn(
                    "px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md transition-all",
                    mode === 'sign' && 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
                    mode === 'submit' && 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
                    mode === 'sign_then_submit' && 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
                    signableRecords.length === 0 && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {mode === 'sign' && <><ShieldCheck className="w-4 h-4" /> Bắt đầu Ký số</>}
                  {mode === 'submit' && <><Send className="w-4 h-4 -rotate-45 -mt-0.5" /> Bắt đầu Đẩy Cổng</>}
                  {mode === 'sign_then_submit' && <><ShieldCheck className="w-4 h-4" /> Ký & Gửi BHXH</>}
                </button>
              </>
            )}
            {step === 'done' && (
              <button onClick={handleDone} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Xong - Cập nhật danh sách
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
