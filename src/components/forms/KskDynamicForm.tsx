import React, { useState, useEffect } from 'react';
import {
  Upload,
  Save,
  X,
  Plus,
  Trash2,
  ShieldCheck,
  Check,
  Download,
  RotateCcw,
  FileText,
  Printer,
  LayoutList,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  Clock,
  UserPlus,
  Users,
  Search,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { KskType, KSK_SCHEMAS, KskField, getAllFields, getDefaultKskFormData } from '../../lib/kskSchemas';
import { mapOption, finalizeKskRecord } from '../../lib/kskRecord';
import { buildKskXml } from '../../lib/kskXmlBuilder';
import { COMMUNES_BY_PROVINCE } from '../../lib/diaPhuong';
import SearchableSelect from '../SearchableSelect';
import KskPaperForm from './KskPaperForm';
import { exportKskToWord, printKskPaper } from '../../lib/kskWordExporter';
import type { HoSoRecord } from '../../lib/signAndSubmitService';

interface KskDynamicFormProps {
  type: KskType;
  onClose: () => void;
  onSave: (data: any, keepOpen?: boolean) => void;
  initialData?: any;
  /** Danh sách bệnh nhân đợi khám hiển thị ở cột bên trái (chỉ cần thông tin hành chính từ Excel) */
  waitingRecords?: HoSoRecord[];
  currentWaitingId?: string;
  onSelectWaitingRecord?: (record: HoSoRecord) => void;
  onImportWaitingExcelFile?: (file: File) => void;
  /** Danh sách toàn bộ hồ sơ đã hoàn thành & lưu để hiển thị ở cột bên phải */
  allRecords?: HoSoRecord[];
  currentRecordId?: string;
  onSelectRecord?: (record: HoSoRecord, currentFormData: any) => void;
  onImportExcelFile?: (file: File) => void;
  onBatchPrintAll?: (currentFormData: any) => void;
  onBatchExportWordAll?: (currentFormData: any) => void;
  /** Lưu từng ca kèm lựa chọn Có ký số XML ngay hay Không, sau đó chuyển sang danh sách bên phải */
  onSaveCaseWithSignChoice?: (data: any, signXmlNow: boolean) => Promise<void> | void;
  onStartNewCase?: (preserveOrgData?: Record<string, any>) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onSignBatchFromSidebar?: (signAll: boolean) => Promise<void> | void;
  onSendXmlFromSidebar?: () => Promise<void> | void;
  onDownloadXmlFromSidebar?: () => void;
}

/** Trích năm sinh 4 chữ số từ NGAY_SINH (yyyymmdd, YYYY-MM-DD, DD/MM/YYYY) */
function extractBirthYear(val: any): string {
  if (!val) return '---';
  const s = String(val).trim();
  const mStart = s.match(/^(\d{4})/);
  if (mStart) return mStart[1];
  const mEnd = s.match(/(\d{4})$/);
  if (mEnd) return mEnd[1];
  return s;
}

/** Bảng ánh xạ tĩnh cho Tailwind v4 để tránh lỗi mất class động md:col-span-* */
const SPAN_CLASSES: Record<number, string> = {
  2: 'col-span-12 md:col-span-2',
  3: 'col-span-12 md:col-span-3',
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  7: 'col-span-12 md:col-span-7',
  8: 'col-span-12 md:col-span-8',
  9: 'col-span-12 md:col-span-9',
  12: 'col-span-12',
};

/** Chuyển giá trị ngày XML (yyyymmdd / yyyymmddHHMM) hoặc DD/MM/YYYY sang YYYY-MM-DD cho input[type="date"] */
function toDateInputValue(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mIso = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (mIso) return mIso[1];
  const mXml = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (mXml) return `${mXml[1]}-${mXml[2]}-${mXml[3]}`;
  const mVn = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mVn) return `${mVn[3]}-${mVn[2]}-${mVn[1]}`;
  return s;
}

/** Chuyển giá trị ngày giờ XML (yyyymmddHHMM) sang YYYY-MM-DDTHH:mm cho input[type="datetime-local"] */
function toDateTimeInputValue(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  const mXml12 = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (mXml12) return `${mXml12[1]}-${mXml12[2]}-${mXml12[3]}T${mXml12[4]}:${mXml12[5]}`;
  const mXml8 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (mXml8) return `${mXml8[1]}-${mXml8[2]}-${mXml8[3]}T08:00`;
  const mVn = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (mVn) return `${mVn[3]}-${mVn[2]}-${mVn[1]}T${mVn[4] || '08'}:${mVn[5] || '00'}`;
  return s;
}

/** Chuẩn hóa dữ liệu ban đầu cho Form để dấu tích Có/Không và danh mục luôn hiển thị chính xác 100% */
function prepareInitialFormData(type: KskType, initialData?: Record<string, any>): Record<string, any> {
  const base = getDefaultKskFormData(type);
  const merged: Record<string, any> = { ...base, ...(initialData || {}), TYPE: type };

  for (const field of getAllFields(type)) {
    const rawVal = merged[field.key];
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      if (field.options && field.options.length > 0) {
        merged[field.key] = mapOption(field, String(rawVal));
      } else {
        merged[field.key] = String(rawVal);
      }
    } else if (field.defaultValue !== undefined) {
      merged[field.key] = field.defaultValue;
    }
  }

  // Đồng bộ trạng thái Cận lâm sàng (HAS_CLS & CKDT_CLS)
  if (Array.isArray(merged.CLS) && merged.CLS.length > 0) {
    merged.HAS_CLS = '1';
    if (!merged.CKDT_CLS && merged.CLS[0]?.CKDT_KET_QUA_CLS) {
      merged.CKDT_CLS = merged.CLS[0].CKDT_KET_QUA_CLS;
    }
  } else if (!merged.HAS_CLS) {
    merged.HAS_CLS = '0';
  }

  return merged;
}

export default function KskDynamicForm({
  type,
  onClose,
  onSave,
  initialData,
  waitingRecords = [],
  currentWaitingId,
  onSelectWaitingRecord,
  onImportWaitingExcelFile,
  allRecords = [],
  currentRecordId,
  onSelectRecord,
  onImportExcelFile,
  onBatchPrintAll,
  onBatchExportWordAll,
  onSaveCaseWithSignChoice,
  onStartNewCase,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onSignBatchFromSidebar,
  onSendXmlFromSidebar,
  onDownloadXmlFromSidebar,
}: KskDynamicFormProps) {
  const schema = KSK_SCHEMAS[type];
  const [viewMode, setViewMode] = useState<'paper' | 'tabs'>('paper');
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(() => prepareInitialFormData(type, initialData));
  const [showSaveSignModal, setShowSaveSignModal] = useState(false);
  const [isSavingOrSigning, setIsSavingOrSigning] = useState(false);
  const [waitingSearch, setWaitingSearch] = useState('');

  useEffect(() => {
    setFormData(prepareInitialFormData(type, initialData));
  }, [type, currentRecordId, currentWaitingId, initialData]);

  const filteredWaitingRecords = waitingRecords.filter(r => {
    if (!waitingSearch.trim()) return true;
    const q = waitingSearch.trim().toLowerCase();
    const name = String(r.rawData?.HO_TEN || r.hoTen || '').toLowerCase();
    const cccd = String(r.rawData?.SO_CCCD || (r as any).soCCCD || '').toLowerCase();
    const ns = extractBirthYear(r.rawData?.NGAY_SINH || (r as any).ngaySinh).toLowerCase();
    return name.includes(q) || cccd.includes(q) || ns.includes(q);
  });

  const currentIdx = currentRecordId ? allRecords.findIndex(r => r.id === currentRecordId) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allRecords.length - 1;

  const signedRecordsCount = allRecords.filter(r => r.trangThai === 'SIGNED' || r.trangThai === 'SUBMITTED').length;
  const selectedSignedCount = allRecords.filter(
    r => selectedIds.has(r.id) && (r.trangThai === 'SIGNED' || r.trangThai === 'SUBMITTED')
  ).length;

  const handleConfirmSaveAndSign = async (signXmlNow: boolean) => {
    setIsSavingOrSigning(true);
    try {
      if (onSaveCaseWithSignChoice) {
        await onSaveCaseWithSignChoice(formData, signXmlNow);
        // Sau khi lưu và đẩy sang danh sách bên phải, làm mới form để làm tiếp ca mới
        const preserveOrg = {
          MA_CSKCB: formData.MA_CSKCB,
          MA_GTIN_CSKCB: formData.MA_GTIN_CSKCB,
          NGAY_VAO: formData.NGAY_VAO,
          NGUOI_KET_LUAN: formData.NGUOI_KET_LUAN,
          DIA_DANH_KET_LUAN: formData.DIA_DANH_KET_LUAN,
        };
        setFormData(prepareInitialFormData(type, preserveOrg));
      } else {
        onSave(formData);
      }
    } finally {
      setIsSavingOrSigning(false);
      setShowSaveSignModal(false);
    }
  };

  const handleBatchChange = (updates: Record<string, any>) => {
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      if (field === 'MATINH_CU_TRU') {
        newData['MAXA_CU_TRU'] = '';
      }
      // Tự động tính BMI khi nhập Chiều cao hoặc Cân nặng
      if (field === 'CHIEU_CAO' || field === 'CAN_NANG') {
        const h = parseFloat(String(newData['CHIEU_CAO'] || '').replace(',', '.'));
        const w = parseFloat(String(newData['CAN_NANG'] || '').replace(',', '.'));
        if (h > 0 && w > 0) {
          newData['CHI_SO_BMI'] = (w / Math.pow(h / 100, 2)).toFixed(1);
        }
      }
      // Khi tích "Có" ở Cận lâm sàng mà bảng CLS đang trống thì khởi tạo sẵn 1 dòng
      if (field === 'HAS_CLS' && value === '1' && (!Array.isArray(newData.CLS) || newData.CLS.length === 0)) {
        newData.CLS = [
          { MA_DICH_VU: '', MA_CHI_SO: '', TEN_CHI_SO: '', GIA_TRI: '', DON_VI_DO: '', MO_TA: '', KET_LUAN: 'Bình thường' },
        ];
      }
      return newData;
    });
  };

  /** Tích nhanh toàn bộ các câu hỏi Có/Không trong 1 section */
  const setSectionYesNo = (fields: KskField[], targetVal: '0' | '1' | 'default') => {
    setFormData((prev: any) => {
      const next = { ...prev };
      for (const f of fields) {
        if (f.kind === 'yesno') {
          next[f.key] = targetVal === 'default' ? (f.defaultValue ?? '0') : targetVal;
        }
      }
      return next;
    });
  };

  /** Xuất thử XML trực tiếp từ dữ liệu đang nhập trên Form */
  const handleQuickDownloadXml = () => {
    const { data } = finalizeKskRecord(formData, type);
    const xmlStr = buildKskXml([data], data.MA_GTIN_CSKCB || data.MA_CSKCB || '00000');
    const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSK_${type}_${(data.HO_TEN || 'HOSO').replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderField = (field: KskField) => {
    const rawVal = formData[field.key];
    const val = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
    const labelText = field.required ? `${field.label} *` : field.label;
    const spanClass = SPAN_CLASSES[field.span || 12] || 'col-span-12';

    return (
      <div key={field.key} className={spanClass}>
        <label className="block text-sm font-bold text-slate-700 mb-1.5 min-h-[20px] leading-snug">
          {(!field.hideLabel || field.label.trim()) ? labelText : '\u00A0'}
        </label>

        {field.kind === 'text' && (
          <input
            type="text"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            placeholder={field.placeholder}
            value={val}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}

        {field.kind === 'textarea' && (
          <textarea
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            placeholder={field.placeholder}
            value={val}
            rows={3}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}

        {field.kind === 'date' && (
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            value={toDateInputValue(val)}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}

        {field.kind === 'datetime' && (
          <input
            type="datetime-local"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            value={toDateTimeInputValue(val)}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}

        {(field.kind === 'select' || field.kind === 'phanloai') && (() => {
          let optionsToRender = field.options;
          if (field.key === 'MAXA_CU_TRU') {
            const maTinh = formData['MATINH_CU_TRU'];
            optionsToRender = maTinh && COMMUNES_BY_PROVINCE[maTinh] ? COMMUNES_BY_PROVINCE[maTinh] : [];
          }
          return (
            <SearchableSelect
              options={optionsToRender || []}
              value={val}
              onChange={(value) => handleInputChange(field.key, value)}
            />
          );
        })()}

        {field.kind === 'yesno' && (
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {field.options?.map(opt => {
              const normalizedVal = field.options ? mapOption(field, val) : val;
              const isChecked = String(normalizedVal) === String(opt.value);
              const isPositive = opt.value === '1';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleInputChange(field.key, opt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer select-none',
                    isChecked
                      ? isPositive
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs ring-1 ring-blue-600'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
                  )}
                >
                  <input
                    type="radio"
                    name={field.key}
                    value={opt.value}
                    checked={isChecked}
                    onChange={() => handleInputChange(field.key, opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0',
                      isChecked
                        ? isPositive
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-400 bg-white'
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span>{opt.label}</span>
                  <span className="text-[11px] opacity-60 font-mono">({opt.value})</span>
                </button>
              );
            })}
          </div>
        )}

        {field.kind === 'signature' && (
          <div className="flex gap-2 h-[38px]">
            <div
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => handleInputChange(field.key, reader.result);
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="flex-1 flex flex-col justify-center items-center border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer overflow-hidden relative group bg-white"
              title="Tải ảnh chữ ký hiển thị"
            >
              {val ? (
                <>
                  <img src={val} alt="Chữ ký" className="h-full object-contain mix-blend-multiply" />
                  <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                    <span className="text-xs text-white font-medium">Đổi ảnh</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 group-hover:text-emerald-600">
                  <Upload className="w-4 h-4" />
                  <span className="text-xs font-medium">Tải Ảnh</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const isConfirmed = window.confirm('Gửi yêu cầu ký số SmartCA/Token đến thiết bị cho phần khám này?');
                if (isConfirmed) {
                  setTimeout(() => {
                    handleInputChange(
                      field.key,
                      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMzAiPjx0ZXh0IHk9IjIwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMwaGE3NDciIGZvbnQtd2VpZ2h0PSJib2xkIj5Lw60gYsBvIEjDoG5oPC90ZXh0Pjwvc3ZnPg=='
                    );
                  }, 800);
                }
              }}
              className="flex-shrink-0 px-3 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
              title="Ký số bằng SmartCA / Token"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        )}

        {field.hint && <p className="text-xs text-slate-500 mt-1">{field.hint}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col h-screen overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-2 bg-slate-50 text-slate-800 font-bold text-xs">
            {schema.title}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('paper')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                viewMode === 'paper'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Mẫu giấy Phụ lục XXIV (Giống Word)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tabs')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                viewMode === 'tabs'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Nhập theo Tab chi tiết
            </button>
          </div>

          {/* Nút Import Excel ngay trong màn hình Mẫu KSK */}
          {onImportExcelFile && (
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors"
              title="Import file Excel (.xlsm / .xlsx) để tự động đổ dữ liệu vào mẫu KSK"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel (.xlsm/.xlsx)
              <input
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImportExcelFile(file);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          )}

          {/* Thanh chuyển đổi & kiểm tra nhanh từng hồ sơ sau khi Import Excel */}
          {allRecords.length > 0 && onSelectRecord && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => {
                  if (hasPrev) onSelectRecord(allRecords[currentIdx - 1], formData);
                }}
                className="p-1 rounded hover:bg-amber-200 disabled:opacity-40 cursor-pointer"
                title="Lưu hồ sơ hiện tại và chuyển sang hồ sơ trước"
              >
                <ChevronLeft className="w-4 h-4 text-amber-900" />
              </button>
              <select
                value={currentRecordId || ''}
                onChange={e => {
                  const target = allRecords.find(r => r.id === e.target.value);
                  if (target) onSelectRecord(target, formData);
                }}
                className="bg-transparent font-bold text-xs text-amber-950 outline-none max-w-[240px] cursor-pointer"
              >
                {currentRecordId === undefined && <option value="">-- Hồ sơ mới đang nhập --</option>}
                {allRecords.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    Hồ sơ {i + 1}/{allRecords.length}: {r.rawData?.HO_TEN || r.hoTen || 'Chưa tên'} ({r.rawData?.SO_CCCD || 'Chưa CCCD'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => {
                  if (hasNext) onSelectRecord(allRecords[currentIdx + 1], formData);
                }}
                className="p-1 rounded hover:bg-amber-200 disabled:opacity-40 cursor-pointer"
                title="Lưu hồ sơ hiện tại và chuyển sang hồ sơ tiếp theo"
              >
                <ChevronRight className="w-4 h-4 text-amber-900" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => exportKskToWord([{ rawData: formData, type }])}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-semibold text-xs cursor-pointer"
            title="Xuất phiếu đang mở ra file Word (.doc) đúng loại mẫu Phụ lục XXIV"
          >
            <FileText className="w-4 h-4" /> Xuất Word
          </button>
          <button
            type="button"
            onClick={() => printKskPaper([{ rawData: formData, type }])}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 font-semibold text-xs cursor-pointer"
            title="In phiếu khám sức khỏe đang mở khổ A4 theo đúng Phụ lục XXIV"
          >
            <Printer className="w-4 h-4" /> In phiếu này (A4)
          </button>

          {allRecords.length > 1 && onBatchPrintAll && (
            <button
              type="button"
              onClick={() => onBatchPrintAll(formData)}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-xs shadow-xs cursor-pointer"
              title="Lưu chỉnh sửa hiện tại và In hàng loạt toàn bộ danh sách theo mẫu quy định (A4)"
            >
              <Printer className="w-4 h-4" /> In Hàng Loạt ({allRecords.length} phiếu)
            </button>
          )}

          {allRecords.length > 1 && onBatchExportWordAll && (
            <button
              type="button"
              onClick={() => onBatchExportWordAll(formData)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-xs shadow-xs cursor-pointer"
              title="Lưu chỉnh sửa hiện tại và Xuất Word hàng loạt (.doc) cho toàn bộ danh sách"
            >
              <FileText className="w-4 h-4" /> Word Hàng Loạt ({allRecords.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickDownloadXml}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-semibold text-xs cursor-pointer"
            title="Tải file XML của phiếu đang nhập để kiểm tra ngay"
          >
            <Download className="w-4 h-4" /> Tải XML
          </button>
          <button
            type="button"
            onClick={() => setShowSaveSignModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" /> Lưu thông tin
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-xs cursor-pointer"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>
      </div>

      {/* Tabs (chỉ hiển thị khi ở chế độ Nhập theo Tab) */}
      {viewMode === 'tabs' && (
        <div className="bg-white border-b border-slate-200 px-6 flex items-center overflow-x-auto">
          {schema.tabs.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={cn(
                'px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors',
                activeTab === idx
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Bố cục 3 cột: Cột Trái (Danh sách Đợi khám) | Cột Giữa (Form Mẫu KSK) | Cột Phải (Danh sách Đã hoàn thành) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Cột trái: Danh sách Bệnh nhân Đợi khám (Import từ Excel thông tin hành chính -> Kích vào để hiện lên Mẫu) */}
        <div className="w-[310px] xl:w-[340px] border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-sm">
          <div className="p-3 border-b border-slate-200 bg-amber-50/70 space-y-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-black text-amber-950 text-xs uppercase tracking-wide">
                  DS Đợi khám ({waitingRecords.length})
                </span>
              </div>
              {onImportWaitingExcelFile && (
                <label
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                  title="Import file Excel (.xlsm / .xlsx) danh sách bệnh nhân đợi khám (chỉ cần thông tin hành chính)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Import DS Đợi
                  <input
                    type="file"
                    accept=".xlsx,.xlsm"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onImportWaitingExcelFile(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>

            {waitingRecords.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={waitingSearch}
                  onChange={e => setWaitingSearch(e.target.value)}
                  placeholder="Tìm tên, năm sinh, CCCD..."
                  className="w-full bg-white border border-amber-200 rounded-lg pl-8 pr-2.5 py-1 text-xs outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {waitingRecords.length === 0 ? (
              <div className="p-5 text-center text-slate-400 text-xs space-y-2.5 mt-6">
                <Users className="w-8 h-8 mx-auto text-amber-300" />
                <div className="font-bold text-slate-600">Danh sách đợi khám trống</div>
                <div className="leading-relaxed">
                  Bấm nút <b>"Import DS Đợi"</b> ở trên để nạp file Excel bệnh nhân đợi khám (đúng mẫu Excel nhưng chỉ cần có thông tin hành chính).
                  <br />
                  <span className="text-amber-700 font-semibold">
                    Kích vào tên bệnh nhân bên trái ➔ Hiện lên Mẫu ở giữa ➔ Khám xong bấm Lưu ➔ Tự nhảy sang danh sách bên phải!
                  </span>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2 text-center w-9 border-r border-slate-200 font-bold">STT</th>
                    <th className="p-2 border-r border-slate-200 font-bold">Họ và tên (Đợi khám)</th>
                    <th className="p-2 text-center w-16 font-bold">Năm sinh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaitingRecords.map((r, idx) => {
                    const isWaitingSelected = currentWaitingId === r.id;
                    const hoTen = r.rawData?.HO_TEN || r.hoTen || '(Chưa nhập tên)';
                    const namSinh = extractBirthYear(r.rawData?.NGAY_SINH || (r as any).ngaySinh);
                    const gioiTinh =
                      r.rawData?.GIOI_TINH === '1' ? 'Nam' : r.rawData?.GIOI_TINH === '2' ? 'Nữ' : '';
                    const cccd = r.rawData?.SO_CCCD || '';

                    return (
                      <tr
                        key={r.id}
                        onClick={() => onSelectWaitingRecord?.(r)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-amber-50/70',
                          isWaitingSelected && 'bg-amber-100/90 ring-1 ring-inset ring-amber-500'
                        )}
                        title="Kích vào để nạp thông tin hành chính của bệnh nhân này lên Mẫu KSK ở giữa"
                      >
                        <td className="p-2 text-center border-r border-slate-100 font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-100">
                          <div className="font-bold text-slate-800 truncate max-w-[175px]">{hoTen}</div>
                          <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
                            {gioiTinh && <span>{gioiTinh}</span>}
                            {cccd && <span className="font-mono">• {cccd}</span>}
                            {isWaitingSelected && (
                              <span className="text-amber-800 font-black">● Đang khám</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono font-semibold text-slate-700">{namSinh}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cột giữa: Form Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
          {viewMode === 'paper' ? (
            <div className="max-w-[1000px] mx-auto">
              <KskPaperForm
                type={type}
                formData={formData}
                onChange={handleInputChange}
                onBatchChange={handleBatchChange}
              />
            </div>
          ) : (
          <div className="max-w-[1200px] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
            {schema.tabs[activeTab].special === 'cls' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-600 mb-4">D. Kết quả khám Cận lâm sàng khác (XML11)</h3>
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700 block">103. Có khám cận lâm sàng khác không?</label>
                    <div className="flex gap-3 mt-1">
                      {[
                        { value: '0', label: 'Không' },
                        { value: '1', label: 'Có' },
                      ].map(opt => {
                        const isChecked = String(formData.HAS_CLS || '0') === opt.value;
                        const isPositive = opt.value === '1';
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleInputChange('HAS_CLS', opt.value)}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer',
                              isChecked
                                ? isPositive
                                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-600'
                                  : 'bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600'
                                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            <span
                              className={cn(
                                'w-4 h-4 rounded flex items-center justify-center border',
                                isChecked
                                  ? isPositive
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-400 bg-white'
                              )}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {formData.HAS_CLS === '1' && (
                  <div className="w-[260px]">
                    {renderField({ key: 'CKDT_CLS', label: 'Họ tên và chữ ký của Bác sĩ', kind: 'signature', span: 12 })}
                  </div>
                )}
              </div>

              {formData.HAS_CLS === '1' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <span className="font-semibold text-blue-600">Danh sách chỉ số Cận lâm sàng (XML11)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newCls = [
                          ...(formData.CLS || []),
                          { MA_DICH_VU: '', MA_CHI_SO: '', TEN_CHI_SO: '', GIA_TRI: '', DON_VI_DO: '', MO_TA: '', KET_LUAN: 'Bình thường' },
                        ];
                        handleInputChange('CLS', newCls);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white bg-white font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" /> Thêm dịch vụ
                    </button>
                  </div>

                  {Array.isArray(formData.CLS) && formData.CLS.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-3 py-3 font-medium w-10 text-center">STT</th>
                            <th className="px-3 py-3 font-medium w-32">Mã dịch vụ</th>
                            <th className="px-3 py-3 font-medium w-28">Mã chỉ số</th>
                            <th className="px-3 py-3 font-medium">Tên chỉ số</th>
                            <th className="px-3 py-3 font-medium w-32">Giá trị (dấu chấm)</th>
                            <th className="px-3 py-3 font-medium w-24">Đơn vị đo</th>
                            <th className="px-3 py-3 font-medium w-32">Kết luận</th>
                            <th className="px-3 py-3 font-medium w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.CLS.map((item: any, idx: number) => {
                            const setCell = (k: string, v: string) => {
                              const newCls = formData.CLS.map((c: any, i: number) => (i === idx ? { ...c, [k]: v } : c));
                              handleInputChange('CLS', newCls);
                            };
                            const cellCls = 'w-full border border-slate-300 rounded px-2 py-1 text-sm';
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-3 text-center text-slate-500">{idx + 1}</td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="23.0075.1494"
                                    className={cellCls}
                                    value={item.MA_DICH_VU || ''}
                                    onChange={e => setCell('MA_DICH_VU', e.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="H01"
                                    className={cellCls}
                                    value={item.MA_CHI_SO || ''}
                                    onChange={e => setCell('MA_CHI_SO', e.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="VD: Số lượng hồng cầu"
                                    className={cellCls + ' font-medium text-blue-600'}
                                    value={item.TEN_CHI_SO || ''}
                                    onChange={e => setCell('TEN_CHI_SO', e.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="5.7"
                                    className={cellCls}
                                    value={item.GIA_TRI || ''}
                                    onChange={e => {
                                      const v = e.target.value;
                                      const newCls = formData.CLS.map((c: any, i: number) => {
                                        if (i !== idx) return c;
                                        const fixed = /^-?\d+,\d*$/.test(v) ? v.replace(',', '.') : v;
                                        return { ...c, GIA_TRI: fixed, MO_TA: fixed };
                                      });
                                      handleInputChange('CLS', newCls);
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="mmol/l"
                                    className={cellCls}
                                    value={item.DON_VI_DO || ''}
                                    onChange={e => setCell('DON_VI_DO', e.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <select
                                    className={cellCls}
                                    value={item.KET_LUAN || 'Bình thường'}
                                    onChange={e => setCell('KET_LUAN', e.target.value)}
                                  >
                                    <option value="Bình thường">Bình thường</option>
                                    <option value="Bất thường">Bất thường</option>
                                  </select>
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newCls = formData.CLS.filter((_: any, i: number) => i !== idx);
                                      handleInputChange('CLS', newCls);
                                    }}
                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {schema.tabs[activeTab].sections.map((section, sIdx) => {
                const hasYesNo = section.fields.some(f => f.kind === 'yesno');
                return (
                  <div key={sIdx} className="space-y-4">
                    {section.title && (
                      <div className="bg-emerald-50/80 px-4 py-2.5 rounded-lg border border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-emerald-700 font-bold flex items-center gap-2">
                          {section.title}
                        </h3>
                        {hasYesNo && (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setSectionYesNo(section.fields, '0')}
                              className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold transition-colors"
                            >
                              Tích tất cả: Không (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSectionYesNo(section.fields, '1')}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold transition-colors"
                            >
                              Tích tất cả: Có (1)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSectionYesNo(section.fields, 'default')}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-semibold flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Mặc định chuẩn
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-12 gap-x-6 gap-y-5 px-1">
                      {section.fields.map(renderField)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </div>

        {/* Cột phải: Danh sách các ca đã lưu / import (STT, Tên, Năm sinh, Trạng thái Đã ký số XML / Chưa ký XML) */}
        <div className="w-[380px] xl:w-[430px] border-l border-slate-200 bg-white flex flex-col shrink-0 shadow-sm">
          {/* Header cột phải */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <div>
              <div className="font-black text-slate-800 text-xs uppercase tracking-wide">
                Danh sách các ca KSK ({allRecords.length})
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Đã chọn: <b className="text-emerald-700">{selectedIds.size}</b> | Đã ký XML:{' '}
                <b className="text-blue-700">{signedRecordsCount}</b>/{allRecords.length}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const preserveOrg = {
                  MA_CSKCB: formData.MA_CSKCB,
                  MA_GTIN_CSKCB: formData.MA_GTIN_CSKCB,
                  NGAY_VAO: formData.NGAY_VAO,
                  NGUOI_KET_LUAN: formData.NGUOI_KET_LUAN,
                  DIA_DANH_KET_LUAN: formData.DIA_DANH_KET_LUAN,
                };
                if (onStartNewCase) {
                  onStartNewCase(preserveOrg);
                } else {
                  setFormData(prepareInitialFormData(type, preserveOrg));
                }
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
              title="Làm mới biểu mẫu bên trái để nhập ca tiếp theo"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Nhập ca mới
            </button>
          </div>

          {/* Bảng danh sách ca bên phải */}
          <div className="flex-1 overflow-y-auto">
            {allRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs space-y-2 mt-8">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-semibold text-slate-600">Chưa có ca nào trong danh sách</div>
                <div>
                  Sau khi nhập xong thông tin bên trái và bấm <b>"Lưu thông tin"</b>, ca khám sẽ tự động nhảy sang danh sách này.
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-2 text-center w-8 border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={allRecords.length > 0 && selectedIds.size === allRecords.length}
                        onChange={() => onToggleSelectAll?.()}
                        className="rounded border-slate-300 w-3.5 h-3.5 text-emerald-600 cursor-pointer"
                        title="Chọn tất cả / Bỏ chọn tất cả"
                      />
                    </th>
                    <th className="p-2 text-center w-9 border-r border-slate-200 font-bold">STT</th>
                    <th className="p-2 border-r border-slate-200 font-bold">Họ và tên</th>
                    <th className="p-2 text-center w-14 border-r border-slate-200 font-bold">Năm sinh</th>
                    <th className="p-2 text-center w-28 font-bold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRecords.map((r, idx) => {
                    const isCurrent = currentRecordId === r.id;
                    const isChecked = selectedIds.has(r.id);
                    const isSigned = r.trangThai === 'SIGNED' || r.trangThai === 'SUBMITTED';
                    const isSubmitted = r.trangThai === 'SUBMITTED';
                    const hoTen = r.rawData?.HO_TEN || r.hoTen || '(Chưa nhập tên)';
                    const namSinh = extractBirthYear(r.rawData?.NGAY_SINH || (r as any).ngaySinh);

                    return (
                      <tr
                        key={r.id}
                        onClick={() => onSelectRecord?.(r, formData)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-slate-50',
                          isCurrent && 'bg-amber-50/90 ring-1 ring-inset ring-amber-400',
                          !isCurrent && isChecked && 'bg-emerald-50/40'
                        )}
                        title="Bấm để mở lại ca này trên biểu mẫu bên trái"
                      >
                        <td
                          className="p-2 text-center border-r border-slate-100"
                          onClick={e => {
                            e.stopPropagation();
                            onToggleSelect?.(r.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-slate-300 w-3.5 h-3.5 text-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-center border-r border-slate-100 font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-100 font-bold text-slate-800">
                          <div className="truncate max-w-[135px]">{hoTen}</div>
                          {isCurrent && (
                            <span className="text-[10px] text-amber-700 font-semibold">● Đang mở</span>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-slate-100 font-mono text-slate-700">
                          {namSinh}
                        </td>
                        <td className="p-1.5 text-center">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10.5px] border border-teal-300">
                              <CheckCircle2 className="w-3 h-3 shrink-0" /> Đã gửi XML
                            </span>
                          ) : isSigned ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10.5px] border border-emerald-300">
                              <ShieldCheck className="w-3 h-3 shrink-0" /> Đã ký số XML
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[10.5px] border border-amber-200">
                              <Clock className="w-3 h-3 shrink-0" /> Chưa ký XML
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Khu vực Nút Ký số (Ký ca đã chọn / Ký tất cả) & Nút Gửi XML ở chân cột phải */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={selectedIds.size === 0 || isSavingOrSigning}
                onClick={() => onSignBatchFromSidebar?.(false)}
                className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-45 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                title="Ký số XML cho các ca đã tích chọn trong danh sách"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Ký ca đã chọn ({selectedIds.size})
              </button>
              <button
                type="button"
                disabled={allRecords.length === 0 || isSavingOrSigning}
                onClick={() => onSignBatchFromSidebar?.(true)}
                className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                title="Chọn tất cả và Ký số XML cho toàn bộ các ca trong danh sách"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Ký số tất cả ({allRecords.length})
              </button>
            </div>

            {/* Sau khi ký số XML, hiển thị nút Gửi XML (Đẩy cổng API) và Tải XML */}
            {signedRecordsCount > 0 && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSavingOrSigning}
                  onClick={() => onSendXmlFromSidebar?.()}
                  className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  title="Gửi các ca đã ký số XML lên cổng liên thông EMRHUB"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  Gửi XML ({selectedSignedCount > 0 ? selectedSignedCount : signedRecordsCount} ca)
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadXmlFromSidebar?.()}
                  className="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="Tải file XML của các ca đã chọn về máy"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Tải file XML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hộp thoại hỏi "Có ký số XML hay không? (Yes / No)" khi bấm Lưu thông tin */}
      {showSaveSignModal && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Xác nhận Lưu & Ký số XML</h3>
                  <p className="text-xs text-slate-500">Hoàn tất hồ sơ và chuyển vào danh sách bên phải</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveSignModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-bold text-slate-900 uppercase">{formData.HO_TEN || '(Chưa nhập họ tên)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Năm sinh:</span>
                <span className="font-bold text-slate-800">{extractBirthYear(formData.NGAY_SINH)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số CCCD/Định danh:</span>
                <span className="font-mono font-semibold text-slate-800">{formData.SO_CCCD || '---'}</span>
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-800 text-center py-1">
              Bạn có muốn <span className="text-blue-700 font-black">KÝ SỐ XML</span> cho ca khám sức khỏe này ngay không?
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={isSavingOrSigning}
                onClick={() => handleConfirmSaveAndSign(true)}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex flex-col items-center justify-center gap-0.5 shadow-md cursor-pointer transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> YES — Ký số XML
                </span>
                <span className="text-[11px] font-normal opacity-90">Lưu & Đánh dấu Đã ký số XML</span>
              </button>

              <button
                type="button"
                disabled={isSavingOrSigning}
                onClick={() => handleConfirmSaveAndSign(false)}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm flex flex-col items-center justify-center gap-0.5 shadow-md cursor-pointer transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> NO — Chưa ký XML
                </span>
                <span className="text-[11px] font-normal opacity-90">Lưu vào danh sách (Chờ ký sau)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
