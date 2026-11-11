/**
 * KÝ SỐ & ĐẨY CỔNG (BHXH & KHÁM SỨC KHỎE EMRHUB) - GIAO DIỆN THAO TÁC
 * Hỗ trợ 2 hình thức ký số chính:
 *   1. USB Token (Ký 1-click qua Chay_Ky_So_USB_Token.bat hoặc Ký ngoại tuyến Ky_XML_Bang_USB_Token.bat)
 *   2. VNPT SmartCA chuẩn 769/QĐ-BTTTT v2.0 (Gói tích hợp TOTP/OTP v2 & Xác nhận qua App v1)
 *
 * Tên phần mềm: ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Send, AlertTriangle, CheckCircle2,
  Loader2, Info, Usb, Smartphone, XCircle,
  Download, Upload, RefreshCw, Settings, KeyRound
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { HoSoRecord, SignMethod } from '../lib/signAndSubmitService';
import {
  checkLocalTokenSigner,
  LocalSignerStatus,
  unlockAndFetchTokenCertificate,
} from '../lib/localTokenSignerService';
import {
  getSmartCAConfig,
  saveSmartCAConfig,
  testSmartCaConnection,
  SmartCAConfig,
} from '../lib/vnptSmartCaService';
import ConfigModal from './ConfigModal';

interface KySoModalProps {
  records: HoSoRecord[];                                    // Danh sách hồ sơ được chọn
  mode: 'sign' | 'submit' | 'sign_then_submit';            // Chế độ thao tác
  onClose: () => void;
  onComplete: (updatedRecords: HoSoRecord[]) => void;      // Callback cập nhật danh sách
  onOpenEmrhubConfig?: () => void;                         // Mở nhanh Cấu hình API EMRHUB (nếu là KSK)
}

type Step = 'config' | 'progress' | 'done';

interface ProgressEntry {
  id: string;
  hoTen: string;
  status: 'waiting' | 'running' | 'success' | 'error';
  message: string;
}

export default function KySoModal({
  records,
  mode,
  onClose,
  onComplete,
  onOpenEmrhubConfig,
}: KySoModalProps) {
  const [currentRecords, setCurrentRecords] = useState<HoSoRecord[]>(records);
  const [step, setStep] = useState<Step>('config');
  const [smartCaCfg, setSmartCaCfg] = useState<SmartCAConfig>(() => getSmartCAConfig());
  const [showSmartCaSetup, setShowSmartCaSetup] = useState(false);
  const [isFetchingCert, setIsFetchingCert] = useState(false);
  const [smartCaNotice, setSmartCaNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [signMethod, setSignMethod] = useState<SignMethod>(() => {
    const cfg = getSmartCAConfig();
    if (cfg.clientId && cfg.clientSecret && cfg.userId) {
      return cfg.signMode === 'APP' ? 'SMARTCA_APP' : 'SMARTCA_TOTP';
    }
    return 'USB_TOKEN';
  });

  const [progressList, setProgressList] = useState<ProgressEntry[]>([]);
  const [resultRecords, setResultRecords] = useState<HoSoRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = React.useRef(false);
  const [summary, setSummary] = useState({ success: 0, error: 0, total: 0 });

  const [localSignerStatus, setLocalSignerStatus] = useState<LocalSignerStatus | null>(null);
  const [selectedTokenSerial, setSelectedTokenSerial] = useState<string>('');
  const [isCheckingSigner, setIsCheckingSigner] = useState(false);
  const [isUnlockingToken, setIsUnlockingToken] = useState(false);
  const [tokenNotice, setTokenNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isKsk = currentRecords.some(r => r.type === 'KHAM_SUC_KHOE');
  // Ở chế độ Ký số (Bước 3), cho phép ký cả các hồ sơ chưa ký lẫn ký lại các hồ sơ đang chọn
  const signableRecords =
    mode === 'sign'
      ? currentRecords
      : currentRecords.filter(r => r.trangThai !== 'SUBMITTED');
  const unsignedWarning = currentRecords.filter(r => r.trangThai !== 'SIGNED' && mode === 'submit');

  const checkSigner = async () => {
    setIsCheckingSigner(true);
    try {
      const res = await checkLocalTokenSigner(true);
      setLocalSignerStatus(res);
      if (res.certificates.length > 0 && !selectedTokenSerial) {
        setSelectedTokenSerial(res.unlockedCert?.serial || res.certificates[0].serial);
      }
    } catch {
      setLocalSignerStatus(null);
    } finally {
      setIsCheckingSigner(false);
    }
  };

  const handleUnlockUsbToken = async () => {
    setIsUnlockingToken(true);
    setTokenNotice(null);
    try {
      const cert = await unlockAndFetchTokenCertificate(
        selectedTokenSerial || undefined,
        undefined,
        msg => setTokenNotice({ ok: true, msg })
      );
      setSelectedTokenSerial(cert.serial);
      const updatedStatus = await checkLocalTokenSigner(false);
      setLocalSignerStatus(updatedStatus);
      setTokenNotice({
        ok: true,
        msg: `Đã xác thực mật khẩu & lấy thông tin CKS từ ${cert.tokenBrand}: ${cert.commonName} (Serial: ${cert.serial})`,
      });
    } catch (e: any) {
      setTokenNotice({
        ok: false,
        msg: e?.message || 'Không thể mở khóa và lấy thông tin CKS từ USB Token.',
      });
    } finally {
      setIsUnlockingToken(false);
    }
  };

  useEffect(() => {
    checkSigner();
    if (signMethod === 'SMARTCA_TOTP' || signMethod === 'SMARTCA_APP') {
      setSmartCaCfg(getSmartCAConfig());
    }
  }, [signMethod]);

  const handleQuickFetchSmartCaCert = async () => {
    const latest = getSmartCAConfig();
    if (!latest.clientId || !latest.clientSecret || !latest.userId) {
      setShowSmartCaSetup(true);
      return;
    }
    setIsFetchingCert(true);
    setSmartCaNotice(null);
    try {
      const res = await testSmartCaConnection(latest);
      const updated = getSmartCAConfig();
      setSmartCaCfg(updated);
      setSmartCaNotice({ ok: res.status === 'success', msg: res.message });
    } catch (e: any) {
      setSmartCaNotice({ ok: false, msg: e?.message || 'Lỗi kết nối VNPT SmartCA' });
    } finally {
      setIsFetchingCert(false);
    }
  };

  const handleDownloadXml = async () => {
    const { buildXml } = await import('../lib/xmlBuilder');
    const { getOrgConfig } = await import('../lib/signAndSubmitService');
    const org = getOrgConfig();

    for (const rec of signableRecords) {
      let xmlContent = rec.xmlContent;
      if (!xmlContent) {
        try {
          if (isKsk) {
            const { buildKskXml } = await import('../lib/kskXmlBuilder');
            const kType = ((rec as any).kskType || rec.rawData?.TYPE || 'Adult') as any;
            xmlContent = buildKskXml([{ ...rec.rawData, TYPE: kType }], rec.rawData?.MA_GTIN_CSKCB || rec.rawData?.MA_CSKCB || org.ma_cskcb || '00000');
          } else {
            xmlContent = buildXml(rec.type, rec.rawData, org.ma_cskcb);
          }
        } catch {}
      }
      if (!xmlContent) continue;
      const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (rec.rawData?.HO_TEN || rec.hoTen || 'HOSO').replace(/\s+/g, '_');
      a.download = `${rec.type}_${safeName}_${rec.cccd || rec.maBhyt || rec.id}.xml`;
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
      if (!text.includes('<SignatureValue>') && !text.includes('<CKS_BENH_VIEN>') && !text.includes('<CKS_NGUOI_KET_LUAN>')) {
        alert(`File ${file.name} chưa chứa chữ ký số hợp lệ (<SignatureValue> hoặc <CKS_BENH_VIEN>)!`);
        continue;
      }

      let decodedContent = '';
      const base64Matches = Array.from(text.matchAll(/<(?:NOIDUNGFILE|NOI_DUNG_TAP_TIN)>([\s\S]*?)<\/(?:NOIDUNGFILE|NOI_DUNG_TAP_TIN)>/g));
      for (const m of base64Matches) {
        try { decodedContent += ' ' + atob(m[1].trim()); } catch {}
      }
      const fullSearchText = text + ' ' + decodedContent;

      const sigMatch =
        text.match(/<CKS_BENH_VIEN>([\s\S]*?)<\/CKS_BENH_VIEN>/) ||
        text.match(/<SignatureValue>([\s\S]*?)<\/SignatureValue>/);
      const extractedSig = sigMatch ? sigMatch[1].trim() : undefined;

      const matchedIdx = newRecords.findIndex(r =>
        (r.maBhyt && fullSearchText.includes(r.maBhyt)) ||
        (r.hoTen && fullSearchText.includes(r.hoTen)) ||
        (r.rawData?.HO_TEN && fullSearchText.includes(r.rawData.HO_TEN)) ||
        (r.maBhxh && fullSearchText.includes(r.maBhxh)) ||
        (r.cccd && fullSearchText.includes(r.cccd)) ||
        (r.rawData?.SO_CCCD && fullSearchText.includes(r.rawData.SO_CCCD)) ||
        file.name.includes(r.id) ||
        file.name.includes(r.id.slice(-6))
      );

      if (matchedIdx !== -1) {
        const target = newRecords[matchedIdx];
        newRecords[matchedIdx] = {
          ...target,
          trangThai: 'SIGNED',
          xmlContent: text,
          signatureBase64: extractedSig || target.signatureBase64,
          rawData:
            target.type === 'KHAM_SUC_KHOE' && extractedSig
              ? { ...target.rawData, CKS_NGUOI_KET_LUAN: extractedSig, CKS_BENH_VIEN: extractedSig }
              : target.rawData,
          errorMessage: undefined
        };
        updatedCount++;
      } else if (files.length === 1 && newRecords.length === 1) {
        // Nếu chỉ có 1 hồ sơ đang chọn và tải lên 1 file XML đã ký
        const target = newRecords[0];
        newRecords[0] = {
          ...target,
          trangThai: 'SIGNED',
          xmlContent: text,
          signatureBase64: extractedSig || target.signatureBase64,
          rawData:
            target.type === 'KHAM_SUC_KHOE' && extractedSig
              ? { ...target.rawData, CKS_NGUOI_KET_LUAN: extractedSig, CKS_BENH_VIEN: extractedSig }
              : target.rawData,
          errorMessage: undefined
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      setCurrentRecords(newRecords);
      onComplete(newRecords);
      alert(`Đã nạp thành công ${updatedCount} hồ sơ đã ký số!`);
    } else {
      alert('Không tìm thấy hồ sơ nào trong danh sách khớp với file XML vừa chọn.');
    }

    if (e.target) e.target.value = '';
  };

  const modeLabel = isKsk
    ? {
        sign: 'Bước 3: Ký Số XML Khám Sức Khỏe (Token / SmartCA)',
        submit: 'Bước 4: Gửi Hồ Sơ Đã Ký (Bước 3) Lên Cổng EMRHUB',
        sign_then_submit: 'Bước 4: Ký Số & Gửi Chung (Token / SmartCA)',
      }[mode]
    : {
        sign: 'Ký Số Hồ Sơ (USB Token / VNPT SmartCA)',
        submit: 'Đẩy Cổng BHXH',
        sign_then_submit: 'Ký Số & Đẩy Cổng BHXH (Token / SmartCA)',
      }[mode];

  const handleStart = async () => {
    setStep('progress');
    setIsRunning(true);
    setIsCancelled(false);
    cancelRef.current = false;

    const { signOneRecord, submitOneRecord, getOrgConfig } = await import('../lib/signAndSubmitService');
    const { buildXml } = await import('../lib/xmlBuilder');
    const org = getOrgConfig();

    const initialProgress: ProgressEntry[] = signableRecords.map(r => ({
      id: r.id,
      hoTen: r.rawData?.HO_TEN || r.hoTen,
      status: 'waiting',
      message: 'Đang chờ xử lý...',
    }));
    setProgressList(initialProgress);

    const updated: HoSoRecord[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < signableRecords.length; i++) {
      if (cancelRef.current) {
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

        // === BƯỚC 1: Tạo XML chuẩn trước khi ký ===
        if (
          !rec.xmlContent ||
          mode === 'sign' ||
          mode === 'sign_then_submit' ||
          rec.xmlContent.includes('GIAYCHUNGNHANNGHIVIEC') ||
          rec.xmlContent.includes('<GRV>') ||
          rec.xmlContent.includes('<TOMTATBA>') ||
          rec.xmlContent.includes('GIAYXACNHANNGHIDUONGTHAI')
        ) {
          update('running', isKsk ? '📄 Đang tạo XML 12 bảng chuẩn Bộ Y Tế...' : '📄 Đang tạo XML chuẩn BHXH...');
          if (isKsk) {
            const { buildKskXml } = await import('../lib/kskXmlBuilder');
            const kType = ((rec as any).kskType || rec.rawData?.TYPE || 'Adult') as any;
            const xmlStr = buildKskXml([{ ...rec.rawData, TYPE: kType }], rec.rawData?.MA_GTIN_CSKCB || rec.rawData?.MA_CSKCB || org.ma_cskcb || '00000');
            rec = { ...rec, xmlContent: xmlStr };
          } else {
            const xmlStr = buildXml(rec.type, rec.rawData, rec.rawData?.MA_GTIN_CSKCB || rec.rawData?.MA_CSKCB || org.ma_cskcb);
            rec = { ...rec, xmlContent: xmlStr };
          }
        }

        // === BƯỚC 2: Ký số (USB Token hoặc VNPT SmartCA) ===
        if (mode === 'sign' || mode === 'sign_then_submit') {
          if (cancelRef.current) { update('error', '🚫 Đã hủy'); errorCount++; break; }
          if (i > 0 && (signMethod === 'SMARTCA_TOTP' || signMethod === 'SMARTCA_APP')) {
            update('running', '⏳ Đang nghỉ 1.5s giữa các hồ sơ để API SmartCA đồng bộ & tránh khóa CKS...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (cancelRef.current) { update('error', '🚫 Đã hủy'); errorCount++; break; }
          }
          const methodName =
            signMethod === 'USB_TOKEN'
              ? 'USB Token'
              : signMethod === 'SMARTCA_APP'
              ? 'VNPT SmartCA (App)'
              : signMethod === 'SMARTCA_TOTP'
              ? 'VNPT SmartCA (TOTP/OTP)'
              : 'Chứng thư số Đơn vị';
          update('running', `🔐 Đang ký số bằng ${methodName}...`);
          rec = await signOneRecord(rec, signMethod, (msg) => update('running', msg));
          update('running', '✅ Ký số XML thành công!');
        }

        // === BƯỚC 3: Đẩy cổng ===
        if (mode === 'submit' || mode === 'sign_then_submit') {
          if (cancelRef.current) { update('error', '🚫 Đã hủy'); errorCount++; break; }
          if (rec.trangThai !== 'SIGNED') {
            update('error', '⚠️ Bỏ qua - Hồ sơ chưa được ký số ở Bước 3!');
            updated.push({ ...rec, trangThai: 'SIGN_FAILED', errorMessage: 'Chưa ký số XML' });
            errorCount++;
            continue;
          }
          update('running', isKsk ? '📤 Đang đẩy lên Cổng EMRHUB (Bộ Y Tế)...' : '📤 Đang đẩy lên Cổng BHXH...');
          rec = await submitOneRecord(rec, (msg) => update('running', msg));
          update('success', `✅ Đẩy cổng thành công! Mã GD: ${rec.maGD}`);
        } else {
          update('success', '✅ Đã ký số XML thành công!');
        }

        updated.push(rec);
        successCount++;
        onComplete([rec]);
      } catch (err: any) {
        update('error', `❌ Lỗi: ${err.message}`);
        const failedRec: HoSoRecord = {
          ...rec,
          trangThai: mode === 'sign' ? 'SIGN_FAILED' : 'SUBMIT_FAILED',
          errorMessage: err.message,
        };
        updated.push(failedRec);
        onComplete([failedRec]);
        errorCount++;
        // Nếu VNPT SmartCA báo khóa tài khoản hoặc sai mật khẩu thuê bao -> dừng ngay toàn bộ lô để tránh khóa lâu hơn
        if (/ĐANG BỊ KHÓA|Sai Password thuê bao/i.test(err?.message || '')) {
          cancelRef.current = true;
          setIsCancelled(true);
          setProgressList(prev => prev.map((p, idx) =>
            idx > i ? { ...p, status: 'error', message: '🛑 Tạm dừng tự động để bảo vệ tài khoản SmartCA không bị khóa thêm' } : p
          ));
          break;
        }
      }
    }

    setSummary({ success: successCount, error: errorCount, total: signableRecords.length });
    setResultRecords(updated);
    if (updated.length > 0) {
      onComplete(updated);
    }
    setStep('done');
    setIsRunning(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsCancelled(true);
  };

  const handleDone = () => {
    if (resultRecords.length > 0) {
      onComplete(resultRecords);
    }
    onClose();
  };

  const hasSmartCaConfigured = Boolean(smartCaCfg.clientId && smartCaCfg.clientSecret && smartCaCfg.userId);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

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
              <div className="text-xs text-slate-500">
                {signableRecords.length} hồ sơ được chọn · Hỗ trợ <b>USB Token</b> & <b>VNPT SmartCA</b>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSmartCaSetup(true)}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Mở bảng cài đặt VNPT SmartCA & Lấy Chứng thư số"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Cài đặt SmartCA
            </button>
            {isKsk && onOpenEmrhubConfig && (
              <button
                type="button"
                onClick={onOpenEmrhubConfig}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Mở bảng Cấu hình API EMRHUB (GLN sender_id, mật khẩu, Private Key)"
              >
                <Settings className="w-3.5 h-3.5" />
                API EMRHUB
              </button>
            )}
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
              <button
                onClick={() => {
                  if (resultRecords.length > 0) {
                    onComplete(resultRecords);
                  }
                  onClose();
                }}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* === BƯỚC 1: CẤU HÌNH === */}
          {step === 'config' && (
            <div className="space-y-5">

              {/* Cảnh báo hồ sơ chưa ký khi chọn Gửi đã ký (Bước 3) */}
              {mode === 'submit' && unsignedWarning.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="flex-1">
                    <strong>Chú ý:</strong> Có <strong>{unsignedWarning.length}/{currentRecords.length}</strong> hồ sơ chưa được ký số ở Bước 3.
                    Chỉ những hồ sơ có trạng thái <strong>"ĐÃ KÝ SỐ XML"</strong> mới được gửi đi ở chế độ này.
                    Nếu muốn vừa ký vừa gửi ngay, hãy chọn chế độ <strong>"Ký & Gửi chung (Token / SmartCA)"</strong>.
                  </div>
                </div>
              )}

              {/* Chọn 2 hình thức ký số chính: USB Token và VNPT SmartCA */}
              {(mode === 'sign' || mode === 'sign_then_submit') && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Chọn hình thức ký số XML (1. USB Token hoặc 2. VNPT SmartCA)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      {
                        id: 'USB_TOKEN',
                        icon: <Usb className="w-5 h-5" />,
                        badge: 'Hình thức 1',
                        label: 'USB Token (Tích hợp Chay_Ky_So_USB_Token)',
                        sub: 'Nhận diện mọi dòng Token (Viettel, VNPT, Bkav, FPT...) -> Mở phần mềm Token -> Nhập MK lấy CKS & Ký',
                      },
                      {
                        id: 'SMARTCA_TOTP',
                        icon: <Smartphone className="w-5 h-5" />,
                        badge: 'Hình thức 2A',
                        label: 'VNPT SmartCA (Tự động)',
                        sub: 'Ký hàng loạt qua Gói tích hợp v2 (Mật khẩu + TOTP/OTP)',
                      },
                      {
                        id: 'SMARTCA_APP',
                        icon: <Smartphone className="w-5 h-5" />,
                        badge: 'Hình thức 2B',
                        label: 'VNPT SmartCA (Qua App)',
                        sub: 'Gửi yêu cầu ký và bấm xác nhận trên ứng dụng điện thoại (API v1)',
                      },
                    ] as { id: SignMethod; icon: React.ReactNode; badge: string; label: string; sub: string }[]).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSignMethod(m.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative",
                          signMethod === m.id
                            ? "border-blue-600 bg-blue-50/80 shadow-md ring-1 ring-blue-500"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center",
                            signMethod === m.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            {m.icon}
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                            signMethod === m.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {m.badge}
                          </span>
                        </div>
                        <div className="text-sm font-black text-slate-800">{m.label}</div>
                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">{m.sub}</div>
                      </button>
                    ))}
                  </div>

                  {/* === PANEL HỖ TRỢ HÌNH THỨC 1: USB TOKEN (TÍCH HỢP Chay_Ky_So_USB_Token) === */}
                  {signMethod === 'USB_TOKEN' && (
                    <div className="mt-3 p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              localSignerStatus?.unlocked
                                ? 'bg-emerald-500 animate-pulse'
                                : localSignerStatus?.hasToken
                                ? 'bg-blue-600 animate-pulse'
                                : 'bg-amber-500'
                            )}
                          />
                          <span className="text-xs font-bold text-slate-900">
                            {localSignerStatus?.unlocked
                              ? `Đã mở khóa & lấy CKS từ ${localSignerStatus.unlockedCert?.tokenBrand || 'USB Token'}`
                              : localSignerStatus?.hasToken
                              ? `Đã nhận diện thiết bị: ${localSignerStatus.detectedBrands.join(', ')}`
                              : localSignerStatus?.available
                              ? 'Công cụ Chay_Ky_So_USB_Token đang chạy — Vui lòng cắm USB Token vào máy'
                              : 'Tích hợp Chay_Ky_So_USB_Token (Tự động nhận diện Viettel, VNPT, Bkav, FPT, EasyCA, NewCA...)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={checkSigner}
                            disabled={isCheckingSigner}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                          >
                            <RefreshCw className={cn('w-3 h-3', isCheckingSigner && 'animate-spin')} />
                            Quét USB Token
                          </button>
                          {!localSignerStatus?.available && (
                            <a
                              href="/Chay_Ky_So_USB_Token.bat"
                              download="Chay_Ky_So_USB_Token.bat"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                              title="Chạy 1 lần duy nhất để tự động tích hợp vào Windows và nhận diện mọi loại USB Token"
                            >
                              <Download className="w-3 h-3" />
                              Kích hoạt Chay_Ky_So_USB_Token.bat
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Nếu phát hiện nhiều USB Token trên máy tính -> Cho phép chọn */}
                      {localSignerStatus && localSignerStatus.certificates.length > 1 && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Chọn thiết bị USB Token cần sử dụng ({localSignerStatus.certificates.length} Token đang cắm):
                          </label>
                          <select
                            value={selectedTokenSerial}
                            onChange={e => setSelectedTokenSerial(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {localSignerStatus.certificates.map(c => (
                              <option key={c.serial} value={c.serial}>
                                [{c.tokenBrand}] {c.verifiedWithPin ? `${c.commonName} - Serial: ${c.serial}` : `Thiết bị Serial: ${c.serial} (${c.providerName})`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* HIỂN THỊ THÔNG TIN CKS CỦA USB TOKEN (CHỈ HIỆN SAU KHI ĐÃ NHẬP MẬT KHẨU LẤY CKS TỪ TOKEN) */}
                      {localSignerStatus?.unlocked && localSignerStatus.unlockedCert ? (
                        <div className="text-xs text-slate-700 bg-emerald-50/90 p-3 rounded-lg border border-emerald-300 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Thông tin Chứng thư số (Lấy trực tiếp từ {localSignerStatus.unlockedCert.tokenBrand}):
                            </span>
                            <button
                              type="button"
                              onClick={handleUnlockUsbToken}
                              disabled={isUnlockingToken}
                              className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                            >
                              Đổi Token / Nhập lại MK
                            </button>
                          </div>
                          <div>
                            • <strong>Đơn vị / Chủ CKS:</strong>{' '}
                            <span className="font-bold text-slate-900">{localSignerStatus.unlockedCert.commonName}</span>
                            {localSignerStatus.unlockedCert.mst && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                MST: {localSignerStatus.unlockedCert.mst}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 break-all">
                            • <strong>Subject:</strong> {localSignerStatus.unlockedCert.subject}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                            <span>
                              • <strong>Serial Token:</strong>{' '}
                              <span className="font-mono font-bold text-indigo-700">{localSignerStatus.unlockedCert.serial}</span>
                            </span>
                            {localSignerStatus.unlockedCert.issuerName && (
                              <span>
                                • <strong>Nhà cung cấp:</strong>{' '}
                                <span className="font-semibold text-slate-800">{localSignerStatus.unlockedCert.issuerName}</span>
                              </span>
                            )}
                            {localSignerStatus.unlockedCert.notAfter && (
                              <span>
                                • <strong>Hạn CKS:</strong>{' '}
                                <span className="font-semibold text-emerald-700">{localSignerStatus.unlockedCert.notAfter}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs bg-white p-3 rounded-lg border border-blue-200 space-y-2.5">
                          <div className="text-slate-700 leading-relaxed">
                            🔌 <strong>Cơ chế hoạt động:</strong> Khi bạn cắm USB Token vào máy tính, hệ thống tự động nhận diện loại Token (<strong>Viettel-CA, VNPT-CA, BKAV-CA, FPT-CA, CA2, EasyCA, NewCA, SmartSign...</strong>), mở ứng dụng ký số của Token đó và hiện bảng nhập mật khẩu (PIN) để lấy thông tin Chứng thư số (CKS) từ đúng USB Token đang cắm.
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleUnlockUsbToken}
                              disabled={isUnlockingToken}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              {isUnlockingToken ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <KeyRound className="w-3.5 h-3.5" />
                              )}
                              {isUnlockingToken
                                ? 'Đang mở ứng dụng Token & xác thực MK...'
                                : 'Mở ứng dụng Token & Nhập mật khẩu lấy CKS'}
                            </button>
                            <span className="text-[11px] text-slate-500">
                              (Hoặc bấm thẳng <strong>"Bắt đầu Ký số"</strong> bên dưới, hệ thống sẽ tự hiện bảng nhập mật khẩu Token)
                            </span>
                          </div>
                        </div>
                      )}

                      {tokenNotice && (
                        <div
                          className={cn(
                            'p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2',
                            tokenNotice.ok
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border-red-200 text-red-700'
                          )}
                        >
                          {tokenNotice.ok ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                          )}
                          <span className="whitespace-pre-line">{tokenNotice.msg}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/70">
                        <button
                          type="button"
                          onClick={handleDownloadXml}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          Tải XML chưa ký ({signableRecords.length})
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
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

                  {/* === PANEL HỖ TRỢ HÌNH THỨC 2: VNPT SMARTCA (CHUẨN 769/QĐ-BTTTT v2.0) === */}
                  {(signMethod === 'SMARTCA_TOTP' || signMethod === 'SMARTCA_APP') && (
                    <div className="mt-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            hasSmartCaConfigured && smartCaCfg.serialNumber ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                          )} />
                          <span className="text-xs font-bold text-slate-800">
                            {hasSmartCaConfigured
                              ? `Tài khoản SmartCA: ${smartCaCfg.userId} ${smartCaCfg.serialNumber ? `· Serial: ${smartCaCfg.serialNumber}` : '· (Chưa lấy Serial)'}`
                              : 'Chưa cấu hình tài khoản VNPT SmartCA (sp_id, sp_password, user_id)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleQuickFetchSmartCaCert}
                            disabled={isFetchingCert}
                            className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-300 shadow-2xs cursor-pointer"
                            title="Gọi API sp769/v1/credentials/get_certificate để lấy Chứng thư số & Serial Number"
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5", isFetchingCert && "animate-spin")} />
                            {isFetchingCert ? 'Đang lấy CKS...' : 'Lấy CKS & Serial (API 4.1)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSmartCaSetup(true)}
                            className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Cài đặt VNPT SmartCA
                          </button>
                        </div>
                      </div>

                      {smartCaCfg.certSubject && (
                        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono truncate">
                          ✅ Chứng thư số đã nạp: <b>{smartCaCfg.certSubject}</b>
                        </div>
                      )}

                      {smartCaNotice && (
                        <div className={cn(
                          "text-xs p-2.5 rounded-lg border font-medium whitespace-pre-line",
                          smartCaNotice.ok
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-700"
                        )}>
                          {smartCaNotice.msg}
                        </div>
                      )}

                      {signMethod === 'SMARTCA_TOTP' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/70">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Mã OTP 6 số (nếu không dùng TOTP Secret tự động)
                            </label>
                            <input
                              type="text"
                              value={smartCaCfg.manualOtp || ''}
                              onChange={e => {
                                const next = { ...smartCaCfg, manualOtp: e.target.value };
                                setSmartCaCfg(next);
                                saveSmartCAConfig(next);
                              }}
                              placeholder={smartCaCfg.totpSecret ? 'Đã có TOTP Secret tự động sinh mã' : 'Nhập 6 số OTP trên App VNPT SmartCA'}
                              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Luồng ký <b>Gói tích hợp v2</b>: Gọi <code className="bg-white px-1 rounded">sp769/v2/signatures/sign</code> nhận <code className="bg-white px-1 rounded">sad</code> ➔ gọi <code className="bg-white px-1 rounded">sp769/v2/signatures/confirm</code> nhận <code className="bg-white px-1 rounded">signature_value</code>.
                            </p>
                          </div>
                        </div>
                      )}

                      {signMethod === 'SMARTCA_APP' && (
                        <div className="text-[11px] text-blue-800 pt-1 border-t border-blue-200/70">
                          📱 Luồng ký <b>Xác nhận qua App v1</b>: Hệ thống gửi yêu cầu <code className="bg-white px-1 rounded">sp769/v1/signatures/sign</code> tới điện thoại và tự động kiểm tra trạng thái <code className="bg-white px-1 rounded">status</code> cho đến khi bạn bấm Xác nhận ký trên ứng dụng VNPT SmartCA.
                        </div>
                      )}

                      {/* Công cụ đổi IP về Việt Nam chỉ hiển thị khi chọn ký VNPT SmartCA */}
                      <div className="pt-2 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {localSignerStatus?.proxyRunning ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã bật công cụ đổi IP về Việt Nam (Cổng 18088) cho SmartCA
                          </span>
                        ) : (
                          <span className="text-amber-900">
                            🌐 Chỉ khi ký <b>VNPT SmartCA</b> bị chặn IP quốc tế mới cần chạy công cụ đổi IP về Việt Nam:
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <a
                            href="/tools/Chay_Ky_So_USB_Token.bat"
                            download="Chay_Ky_So_USB_Token.bat"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                          >
                            <Download className="w-3 h-3" />
                            Tải công cụ đổi IP (.bat)
                          </a>
                          <button
                            type="button"
                            onClick={checkSigner}
                            className="px-2 py-1 text-[11px] font-semibold bg-white border border-blue-200 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Kiểm tra lại
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách hồ sơ */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Danh sách hồ sơ xử lý ({signableRecords.length})
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {signableRecords.map((r, idx) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                      <div className="truncate pr-2">
                        <span className="text-xs font-mono font-bold text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="text-xs font-black text-indigo-700 mr-2">{r.type}</span>
                        <span className="text-sm font-semibold text-slate-800">{r.rawData?.HO_TEN || r.hoTen}</span>
                        <span className="text-xs text-slate-500 ml-2">{r.rawData?.SO_CCCD || r.cccd || r.maBhyt}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase shrink-0",
                        r.trangThai === 'SIGNED' && 'bg-emerald-100 text-emerald-700',
                        r.trangThai === 'DRAFT' && 'bg-slate-100 text-slate-600',
                        r.trangThai === 'UNSIGNED' && 'bg-amber-100 text-amber-700',
                        (r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED') && 'bg-rose-100 text-rose-700',
                      )}>
                        {r.trangThai === 'SIGNED' ? 'Đã ký XML' : r.trangThai === 'DRAFT' ? 'Chưa ký' : 'Chưa ký XML'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-blue-700 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {isKsk ? (
                    <>
                      Hồ sơ Khám sức khỏe sau khi ký số bằng <strong>USB Token</strong> hoặc <strong>VNPT SmartCA</strong> sẽ được nhúng chữ ký số vào thẻ <code className="bg-white px-1 rounded">&lt;CHUKYDONVI&gt;</code> (<code className="bg-white px-1 rounded">CKS_NGUOI_KET_LUAN</code> & <code className="bg-white px-1 rounded">CKS_BENH_VIEN</code>) và đẩy lên Cổng tiếp nhận Bộ Y Tế: <strong>api.emrhub.vn</strong>.
                    </>
                  ) : (
                    <>
                      Hồ sơ sau khi ký số thật chuẩn XMLDSig (Phụ lục 02 TT25) sẽ được đẩy trực tiếp lên Cổng tiếp nhận BHXH: <strong>egw.baohiemxahoi.gov.vn</strong>. Hỗ trợ đồng thời cả <strong>USB Token cắm máy tính</strong> và <strong>VNPT SmartCA (TOTP / App)</strong>.
                    </>
                  )}
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

              {/* Banner trợ giúp khi có lỗi */}
              {summary.error > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Hướng dẫn khắc phục nhanh lỗi Ký số / Đẩy cổng:
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSmartCaSetup(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Cài đặt / Lấy CKS VNPT SmartCA
                    </button>
                    {signMethod !== 'USB_TOKEN' && (
                      <a
                        href="/tools/Chay_Ky_So_USB_Token.bat"
                        download="Chay_Ky_So_USB_Token.bat"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        Tải công cụ đổi IP về Việt Nam cho SmartCA (.bat)
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setStep('config')}
                      className="text-xs text-blue-600 hover:underline font-semibold ml-auto cursor-pointer"
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
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 cursor-pointer">
                  Hủy
                </button>
                <button
                  onClick={handleStart}
                  disabled={signableRecords.length === 0}
                  className={cn(
                    "px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer",
                    mode === 'sign' && 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
                    mode === 'submit' && 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
                    mode === 'sign_then_submit' && 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
                    signableRecords.length === 0 && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {mode === 'sign' && (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Bắt đầu Ký số ({signMethod === 'USB_TOKEN' ? 'USB Token' : 'VNPT SmartCA'})
                    </>
                  )}
                  {mode === 'submit' && (
                    <>
                      <Send className="w-4 h-4 -rotate-45 -mt-0.5" />
                      {isKsk ? 'Gửi Hồ Sơ Đã Ký Lên EMRHUB' : 'Bắt đầu Đẩy Cổng BHXH'}
                    </>
                  )}
                  {mode === 'sign_then_submit' && (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {isKsk
                        ? `Ký (${signMethod === 'USB_TOKEN' ? 'Token' : 'SmartCA'}) & Gửi EMRHUB`
                        : `Ký (${signMethod === 'USB_TOKEN' ? 'Token' : 'SmartCA'}) & Gửi BHXH`}
                    </>
                  )}
                </button>
              </>
            )}
            {step === 'done' && (
              <button onClick={handleDone} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 cursor-pointer">
                <CheckCircle2 className="w-4 h-4" /> Xong - Cập nhật danh sách
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal cài đặt VNPT SmartCA mở trực tiếp từ trong KySoModal */}
      {showSmartCaSetup && (
        <ConfigModal
          initialTab="smartca"
          onClose={() => {
            setShowSmartCaSetup(false);
            setSmartCaCfg(getSmartCAConfig());
          }}
        />
      )}
    </div>
  );
}
