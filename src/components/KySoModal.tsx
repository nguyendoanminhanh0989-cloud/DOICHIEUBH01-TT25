/**
 * KÝ SỐ & ĐẨY CỔNG BHXH - GIAO DIỆN THAO TÁC
 * Hỗ trợ: Ký 1 ca / Ký hàng loạt | VNPT SmartCA TOTP / USB Token
 * 
 * Tên phần mềm: ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import React, { useState } from 'react';
import {
  X, ShieldCheck, Send, AlertTriangle, CheckCircle2,
  Loader2, Info, Usb, Smartphone, ChevronDown, XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { HoSoRecord, SignMethod } from '../lib/signAndSubmitService';

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
  const [step, setStep] = useState<Step>('config');
  const [signMethod, setSignMethod] = useState<SignMethod>('SMARTCA_TOTP');
  const [progressList, setProgressList] = useState<ProgressEntry[]>([]);
  const [resultRecords, setResultRecords] = useState<HoSoRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState({ success: 0, error: 0, total: 0 });

  const signableRecords = records.filter(r => r.trangThai !== 'SUBMITTED');
  const unsignedWarning = records.filter(r => r.trangThai !== 'SIGNED' && mode !== 'sign');

  const modeLabel = {
    sign: 'Ký Số Hồ Sơ',
    submit: 'Đẩy Cổng BHXH',
    sign_then_submit: 'Ký Số & Đẩy Cổng BHXH',
  }[mode];

  const handleStart = async () => {
    setStep('progress');
    setIsRunning(true);

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

        // === BƯỚC 1: Tạo XML nếu chưa có ===
        if (!rec.xmlContent) {
          update('running', '📄 Đang tạo XML chuẩn BHXH...');
          const xmlStr = buildXml(rec.type, rec.rawData, org.ma_cskcb);
          rec = { ...rec, xmlContent: xmlStr };
        }

        // === BƯỚC 2: Ký số ===
        if (mode === 'sign' || mode === 'sign_then_submit') {
          update('running', `🔐 Đang ký số bằng ${signMethod}...`);
          rec = await signOneRecord(rec, signMethod, (msg) => update('running', msg));
          update('running', '✅ Ký số thành công!');
        }

        // === BƯỚC 3: Đẩy cổng ===
        if (mode === 'submit' || mode === 'sign_then_submit') {
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
          {!isRunning && (
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
                  Hệ thống sẽ tự động tạo XML chuẩn BHXH (TT25), tính hash SHA-256, gửi ký qua VNPT SmartCA Gateway, 
                  nhúng chữ ký vào XML rồi đẩy lên Cổng tiếp nhận BHXH: <strong>egw.baohiemxahoi.gov.vn</strong>.
                  <br />Cần cấu hình trước: <strong>Cổng BHXH (tài khoản) + VNPT SmartCA (Serial/TOTP)</strong>.
                </span>
              </div>
            </div>
          )}

          {/* === BƯỚC 2: TIẾN TRÌNH === */}
          {step === 'progress' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Đang xử lý {signableRecords.length} hồ sơ...
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
