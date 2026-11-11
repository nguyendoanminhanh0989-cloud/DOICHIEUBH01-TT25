import React from 'react';
import {
  Upload,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  X,
  CheckCircle2,
  Settings,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  PenTool,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  KskType,
  OPT_DOI_TUONG,
  OPT_NGUON_CHI_TRA,
  OPT_NGHE_NGHIEP,
  OPT_PHAN_LOAI,
  OPT_NHOM_MAU,
  OPT_THI_LUC,
  OPT_SAN_KHOA_KHONG_BT,
  ADULT_TSBT,
  calcAgeYears,
} from '../../lib/kskSchemas';
import { PROVINCES, COMMUNES_BY_PROVINCE } from '../../lib/diaPhuong';
import { parseDateValue } from '../../lib/kskRecord';
import {
  DAN_TOC_MAP,
  extractPaperClsFromData,
  upsertPaperClsIntoFormData,
  PaperClsFields,
} from '../../lib/kskWordExporter';
import { getSmartCAConfig } from '../../lib/vnptSmartCaService';
import ConfigModal from '../ConfigModal';

interface KskPaperFormProps {
  type: KskType;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onBatchChange: (updates: Record<string, any>) => void;
}

/** Chuyển giá trị ngày XML (yyyymmdd / yyyymmddHHMM) hoặc DD/MM/YYYY sang YYYY-MM-DD */
function toDateInput(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mIso = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (mIso) return mIso[1];
  const mXml = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (mXml) return `${mXml[1]}-${mXml[2]}-${mXml[3]}`;
  const mVn = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mVn) return `${mVn[3]}-${mVn[2]}-${mVn[1]}`;
  return '';
}

/** Danh sách các ô ký chuyên khoa theo từng loại mẫu KSK để hỗ trợ Ký đồng loạt 1 chạm */
export const KSK_CLINICAL_SIG_FIELDS: Record<KskType, Array<{ field: string; label: string }>> = {
  Adult: [
    { field: 'CKDT_NOI_KHOA_TUAN_HOAN', label: 'Nội khoa' },
    { field: 'CKDT_KHAM_NGOAI_KHOA', label: 'Ngoại khoa' },
    { field: 'CKDT_KHAM_DA_LIEU', label: 'Da liễu' },
    { field: 'CKDT_KHAM_SAN_PHU_KHOA', label: 'Sản phụ khoa' },
    { field: 'CKDT_KHAM_MAT', label: 'Mắt' },
    { field: 'CKDT_KHAM_TAI_MUI_HONG', label: 'Tai - Mũi - Họng' },
    { field: 'CKDT_KHAM_RANG_HAM_MAT', label: 'Răng - Hàm - Mặt' },
  ],
  Age6_18: [
    { field: 'CKDT_NHI_KHOA_TUAN_HOAN', label: 'Nhi khoa' },
    { field: 'CKDT_KHAM_MAT', label: 'Mắt' },
    { field: 'CKDT_KHAM_TAI_MUI_HONG', label: 'Tai - Mũi - Họng' },
    { field: 'CKDT_KHAM_RANG_HAM_MAT', label: 'Răng - Hàm - Mặt' },
  ],
  ChildUnder: [
    { field: 'CKDT_DA_DAU_CO', label: 'Đầu - Cổ' },
    { field: 'CKDT_MAT_TAI_MUI_HONG', label: 'Mắt - Tai - Mũi - Họng' },
    { field: 'CKDT_MIENG_RANG', label: 'Miệng - Răng' },
    { field: 'CKDT_HO_HAP_TIM_MACH', label: 'Hô hấp - Tim mạch' },
    { field: 'CKDT_BUNG_SINH_DUC', label: 'Bụng - Sinh dục' },
    { field: 'CKDT_THAN_KINH_CO_XUONG_KHOP', label: 'Thần kinh - Cơ xương khớp' },
  ],
};

/** Tạo tem con dấu / chữ ký số điện tử chuẩn y tế (SVG vector không vỡ hạt, hỗ trợ tiếng Việt UTF-8 chuẩn xác) */
export function generateSmartCaVisualBadge({
  signerName,
  title,
  orgName,
  serialNumber,
  dateStr,
  isConclusion,
  color,
}: {
  signerName: string;
  title: string;
  orgName?: string;
  serialNumber?: string;
  dateStr?: string;
  isConclusion?: boolean;
  color?: 'red' | 'blue' | 'emerald';
}): string {
  const chosenColor = color || (isConclusion ? 'red' : 'blue');
  const stroke = chosenColor === 'red' ? '#b91c1c' : chosenColor === 'emerald' ? '#047857' : '#1d4ed8';
  const bg = chosenColor === 'red' ? '#fff5f5' : chosenColor === 'emerald' ? '#f0fdf4' : '#eff6ff';
  const timeText = dateStr || new Date().toLocaleString('vi-VN');
  const org = (orgName || 'CƠ SỞ KHÁM CHỮA BỆNH').toUpperCase();
  const serial = serialNumber ? ` • Serial: ${serialNumber.slice(-10)}` : '';

  const w = isConclusion ? 280 : 230;
  const h = isConclusion ? 86 : 72;

  const escapeXmlText = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="5" fill="${bg}" stroke="${stroke}" stroke-width="1.8" />
  <rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="3" fill="none" stroke="${stroke}" stroke-width="0.8" opacity="0.6" />
  <g transform="translate(10, 10)">
    <circle cx="10" cy="10" r="9" fill="none" stroke="${stroke}" stroke-width="1.5"/>
    <path d="M6 10l3 3 6-6" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="36" y="19" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${stroke}">ĐÃ KÝ SỐ ĐIỆN TỬ • VNPT SMARTCA</text>
  <text x="12" y="37" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${escapeXmlText(signerName)}</text>
  <text x="12" y="51" font-family="Arial, sans-serif" font-size="9" font-weight="600" fill="${stroke}">${escapeXmlText(title)}</text>
  <text x="12" y="65" font-family="Arial, sans-serif" font-size="8.5" fill="#475569">${escapeXmlText(org)}${serial}</text>
  ${isConclusion ? `<text x="12" y="78" font-family="Arial, sans-serif" font-size="8" fill="#64748b">Thời gian ký: ${timeText} • Hợp lệ</text>` : ''}
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface KskPaperFormContextType {
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  openSignDialog: (field: string, label: string, isConclusion?: boolean) => void;
}

const KskPaperFormContext = React.createContext<KskPaperFormContextType>({
  formData: {},
  onChange: () => {},
  openSignDialog: () => {},
});

/** Ô tích vuông giống hệt mẫu Word □ / ☑, click để chọn giá trị */
const PaperCheck = React.memo(function PaperCheck({
  field,
  targetValue,
  label,
  toggleOffValue,
}: {
  field: string;
  targetValue: string;
  label?: string;
  toggleOffValue?: string;
}) {
  const { formData, onChange } = React.useContext(KskPaperFormContext);
  const cur = String(formData[field] ?? '');
  const checked = cur === targetValue;
  return (
    <button
      type="button"
      onClick={() => {
        if (checked && toggleOffValue !== undefined) {
          onChange(field, toggleOffValue);
        } else {
          onChange(field, targetValue);
        }
      }}
      className="inline-flex items-center gap-1 cursor-pointer select-none group hover:text-emerald-700 focus:outline-none mr-3 my-0.5"
    >
      <span
        className={`inline-flex items-center justify-center w-[16px] h-[16px] border text-[13px] leading-none font-bold transition-colors ${
          checked
            ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
            : 'border-black bg-white text-transparent group-hover:border-emerald-600'
        }`}
      >
        ✓
      </span>
      {label && <span className={checked ? 'font-semibold text-emerald-950' : ''}>{label}</span>}
    </button>
  );
});

/** Ô nhập dòng chấm inline trên mặt giấy */
const DotInput = React.memo(function DotInput({
  field,
  placeholder = '....................',
  width = 'w-40',
  uppercase = false,
  bold = false,
}: {
  field: string;
  placeholder?: string;
  width?: string;
  uppercase?: boolean;
  bold?: boolean;
}) {
  const { formData, onChange } = React.useContext(KskPaperFormContext);
  const val = formData[field] !== undefined && formData[field] !== null ? String(formData[field]) : '';
  return (
    <input
      type="text"
      value={val}
      placeholder={placeholder}
      onChange={e => onChange(field, uppercase ? e.target.value.toUpperCase() : e.target.value)}
      className={`${width} border-b border-dotted border-slate-700 bg-amber-50/30 hover:bg-amber-50/70 focus:bg-amber-50 focus:border-solid focus:border-emerald-700 outline-none px-1 py-0 text-[15px] text-slate-900 ${
        uppercase ? 'uppercase' : ''
      } ${bold ? 'font-bold' : ''}`}
    />
  );
});

/** Ô chọn danh mục inline trên dòng chấm */
const DotSelect = React.memo(function DotSelect({
  field,
  options,
  placeholder = '-- Chọn --',
  width = 'w-44',
}: {
  field: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  width?: string;
}) {
  const { formData, onChange } = React.useContext(KskPaperFormContext);
  const val = formData[field] !== undefined && formData[field] !== null ? String(formData[field]) : '';
  return (
    <select
      value={val}
      onChange={e => onChange(field, e.target.value)}
      className={`${width} border-b border-dotted border-slate-700 bg-amber-50/30 hover:bg-amber-50/70 focus:bg-amber-50 focus:border-solid focus:border-emerald-700 outline-none px-1 py-0 text-[14.5px] text-slate-900 cursor-pointer`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label.replace(/^\d+\s*-\s*/, '')}
        </option>
      ))}
    </select>
  );
});

/** Ô ký tên Bác sĩ / Người kết luận trong bảng Khám lâm sàng & Cuối tờ KSK */
const PaperSigBox = React.memo(function PaperSigBox({
  field,
  label = 'Chuyên khoa',
  isConclusion = false,
}: {
  field: string;
  label?: string;
  isConclusion?: boolean;
}) {
  const { formData, onChange, openSignDialog } = React.useContext(KskPaperFormContext);
  const rawVal = formData[field];
  const val = String(
    rawVal !== undefined && rawVal !== null && rawVal !== ''
      ? rawVal
      : field === 'CKDT_CLS_XET_NGHIEM'
      ? formData.CKDT_CLS || ''
      : ''
  );
  const [scale, setScale] = React.useState<number>(isConclusion ? 1.4 : 1.05);

  const baseMaxH = isConclusion ? 120 : 62;
  const baseMaxW = isConclusion ? 260 : 160;
  const currentMaxH = Math.round(baseMaxH * scale);
  const currentMaxW = Math.round(baseMaxW * scale);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-1',
        isConclusion ? 'min-h-[125px] w-full' : 'min-h-[60px]'
      )}
    >
      {val ? (
        <div className="relative group flex flex-col items-center">
          <img
            src={val}
            alt="Chữ ký"
            style={{
              maxHeight: `${currentMaxH}px`,
              maxWidth: `${currentMaxW}px`,
            }}
            className="object-contain mix-blend-multiply transition-all duration-150"
          />
          {/* Thanh công cụ phóng to / thu nhỏ / xóa chữ ký (chỉ hiện khi hover trên màn hình, tự ẩn khi in) */}
          <div className="hidden group-hover:flex items-center gap-1.5 absolute -top-3 bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded shadow text-[10px] z-10 print:hidden">
            <button
              type="button"
              onClick={() => setScale(s => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
              className="px-1 hover:text-amber-300 font-bold cursor-pointer"
              title="Thu nhỏ con dấu / chữ ký"
            >
              -
            </button>
            <span className="font-mono text-[9px] text-amber-200">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale(s => Math.min(2.8, Number((s + 0.15).toFixed(2))))}
              className="px-1 hover:text-amber-300 font-bold cursor-pointer"
              title="Phóng to con dấu / chữ ký"
            >
              +
            </button>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={() => setScale(isConclusion ? 1.4 : 1.05)}
              className="hover:text-cyan-300 text-[9px] cursor-pointer"
              title="Đặt lại kích thước chuẩn"
            >
              100%
            </button>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={() => {
                onChange(field, '');
                if (field === 'CKDT_CLS_XET_NGHIEM') {
                  onChange('CKDT_CLS', '');
                }
              }}
              className="text-rose-300 hover:text-rose-100 font-bold px-0.5 cursor-pointer"
              title="Xóa chữ ký này"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 italic py-1">Chưa ký</div>
      )}

      <div className="flex items-center gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  onChange(field, reader.result);
                  if (field === 'CKDT_CLS_XET_NGHIEM') {
                    onChange('CKDT_CLS', reader.result);
                  }
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }}
          className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 flex items-center gap-1 cursor-pointer transition shadow-2xs"
          title="Tải ảnh chữ ký / con dấu từ máy tính"
        >
          <Upload className="w-3 h-3 text-slate-600" /> Ảnh
        </button>
        <button
          type="button"
          onClick={() => openSignDialog(field, label, isConclusion)}
          className="px-2.5 py-0.5 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded border border-emerald-300 flex items-center gap-1 cursor-pointer transition shadow-2xs"
          title="Bấm để mở hộp thoại Ký số VNPT SmartCA / Con dấu điện tử"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Ký
        </button>
      </div>
    </div>
  );
});

/** Danh sách DVKT mẫu phổ biến để bác sĩ/nhân viên y tế bấm thêm 1 chạm ngay trong mục III. KHÁM CẬN LÂM SÀNG */
const QUICK_CLS_PRESETS = [
  { MA_DICH_VU: '22.0001', MA_CHI_SO: 'CBC', TEN_CHI_SO: 'Tổng phân tích tế bào máu ngoại vi', GIA_TRI: 'Bình thường', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0056', MA_CHI_SO: 'GLU', TEN_CHI_SO: 'Định lượng Glucose (Đường máu)', GIA_TRI: '5.1', DON_VI_DO: 'mmol/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0169', MA_CHI_SO: 'URE', TEN_CHI_SO: 'Định lượng Urê máu', GIA_TRI: '4.8', DON_VI_DO: 'mmol/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0044', MA_CHI_SO: 'CRE', TEN_CHI_SO: 'Định lượng Creatinin máu', GIA_TRI: '76', DON_VI_DO: 'µmol/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0018', MA_CHI_SO: 'GOT', TEN_CHI_SO: 'Hoạt độ AST (GOT)', GIA_TRI: '24', DON_VI_DO: 'U/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0014', MA_CHI_SO: 'GPT', TEN_CHI_SO: 'Hoạt độ ALT (GPT)', GIA_TRI: '25', DON_VI_DO: 'U/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0156', MA_CHI_SO: 'URA', TEN_CHI_SO: 'Tổng phân tích nước tiểu 10 thông số', GIA_TRI: 'Bình thường', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '18.0061', MA_CHI_SO: 'XQTP', TEN_CHI_SO: 'Chụp Xquang ngực thẳng (Tim phổi)', GIA_TRI: 'Tim phổi bình thường', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '19.0001', MA_CHI_SO: 'SAOB', TEN_CHI_SO: 'Siêu âm ổ bụng tổng quát', GIA_TRI: 'Bình thường', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '03.0001', MA_CHI_SO: 'ECG', TEN_CHI_SO: 'Điện tâm đồ (ECG)', GIA_TRI: 'Nhịp xoang đều', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '23.0035', MA_CHI_SO: 'CHOL', TEN_CHI_SO: 'Cholesterol toàn phần', GIA_TRI: '4.6', DON_VI_DO: 'mmol/L', KET_LUAN: 'Bình thường' },
  { MA_DICH_VU: '24.0085', MA_CHI_SO: 'HBSAG', TEN_CHI_SO: 'HBsAg test nhanh', GIA_TRI: 'Âm tính', DON_VI_DO: '', KET_LUAN: 'Bình thường' },
];

interface PaperClsDvktInlineBoxProps {
  clsList: any[];
  presets: typeof QUICK_CLS_PRESETS;
  onAdd: (preset?: typeof QUICK_CLS_PRESETS[0]) => void;
  onUpdate: (idx: number, key: string, rawVal: string) => void;
  onRemove: (idx: number) => void;
}

const PaperClsDvktInlineBox = React.memo(function PaperClsDvktInlineBox({
  clsList,
  presets,
  onAdd,
  onUpdate,
  onRemove,
}: PaperClsDvktInlineBoxProps) {
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-slate-300 font-sans text-xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-800 uppercase tracking-wide">
            Danh mục DVKT Cận lâm sàng ({clsList.length} dịch vụ)
          </span>
          <span className="text-[11px] text-slate-500">
            (Tự động đồng bộ vào mẫu in A4, file Word & thẻ XML11)
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAdd()}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> + Tự thêm DVKT
        </button>
      </div>

      {/* Thanh chọn nhanh DVKT phổ biến */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-semibold text-slate-500 mr-1">Thêm nhanh DVKT:</span>
        {presets.map(p => (
          <button
            key={p.MA_CHI_SO}
            type="button"
            onClick={() => onAdd(p)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border border-slate-300 rounded text-[11px] font-medium cursor-pointer transition-colors"
            title={`Thêm nhanh: ${p.TEN_CHI_SO} (${p.MA_DICH_VU})`}
          >
            + {p.TEN_CHI_SO.replace('Tổng phân tích tế bào máu ngoại vi', 'Công thức máu').replace('Định lượng ', '').replace('Hoạt độ ', '').replace('Tổng phân tích nước tiểu 10 thông số', 'Nước tiểu').replace('Chụp Xquang ngực thẳng (Tim phổi)', 'XQ tim phổi')}
          </button>
        ))}
      </div>

      {clsList.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 bg-white text-[12px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 px-1.5 py-1 text-center w-8">#</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left w-24">Mã DVKT</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left w-20">Mã chỉ số</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left">Tên DVKT / Xét nghiệm / CĐHA</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left w-28">Kết quả / Giá trị</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left w-16">Đơn vị</th>
                <th className="border border-slate-300 px-1.5 py-1 text-left w-24">Kết luận</th>
                <th className="border border-slate-300 px-1 py-1 text-center w-7">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {clsList.map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-amber-50/40">
                  <td className="border border-slate-300 px-1 py-1 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.MA_DICH_VU || ''}
                      onChange={e => onUpdate(idx, 'MA_DICH_VU', e.target.value)}
                      placeholder="VD: 23.0056"
                      className="w-full px-1 py-0.5 outline-none bg-transparent font-mono text-[11.5px]"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.MA_CHI_SO || ''}
                      onChange={e => onUpdate(idx, 'MA_CHI_SO', e.target.value)}
                      placeholder="GLU"
                      className="w-full px-1 py-0.5 outline-none bg-transparent font-mono text-[11.5px]"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.TEN_CHI_SO || ''}
                      onChange={e => onUpdate(idx, 'TEN_CHI_SO', e.target.value)}
                      placeholder="Nhập tên dịch vụ kỹ thuật / xét nghiệm..."
                      className="w-full px-1 py-0.5 outline-none bg-transparent font-semibold text-blue-800"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.GIA_TRI || c.MO_TA || ''}
                      onChange={e => onUpdate(idx, 'GIA_TRI', e.target.value)}
                      placeholder="5.2 / Bình thường"
                      className="w-full px-1 py-0.5 outline-none bg-transparent font-bold text-slate-900"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.DON_VI_DO || ''}
                      onChange={e => onUpdate(idx, 'DON_VI_DO', e.target.value)}
                      placeholder="mmol/L"
                      className="w-full px-1 py-0.5 outline-none bg-transparent text-slate-600 text-[11.5px]"
                    />
                  </td>
                  <td className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={c.KET_LUAN || 'Bình thường'}
                      onChange={e => onUpdate(idx, 'KET_LUAN', e.target.value)}
                      placeholder="Bình thường"
                      className="w-full px-1 py-0.5 outline-none bg-transparent"
                    />
                  </td>
                  <td className="border border-slate-300 p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                      title="Xóa DVKT này"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default function KskPaperForm({ type, formData, onChange, onBatchChange }: KskPaperFormProps) {
  const paperCls = extractPaperClsFromData(formData);
  const age = calcAgeYears(formData.NGAY_SINH, parseDateValue(formData.NGAY_VAO) || new Date());

  const handlePaperClsChange = (clsField: keyof PaperClsFields, val: string) => {
    const next = upsertPaperClsIntoFormData(formData, clsField, val);
    onBatchChange({
      [clsField]: val,
      CLS: next.CLS,
      HAS_CLS: next.HAS_CLS,
    });
  };

  const handleAddClsDvkt = (preset?: typeof QUICK_CLS_PRESETS[0]) => {
    const currentCls = Array.isArray(formData.CLS) ? [...formData.CLS] : [];
    const newItem = preset
      ? { ...preset, MO_TA: preset.GIA_TRI }
      : { MA_DICH_VU: '', MA_CHI_SO: '', TEN_CHI_SO: '', GIA_TRI: '', DON_VI_DO: '', MO_TA: '', KET_LUAN: 'Bình thường' };
    const nextCls = [...currentCls, newItem];
    onBatchChange({
      CLS: nextCls,
      HAS_CLS: '1',
    });
  };

  const handleUpdateClsRow = (idx: number, key: string, rawVal: string) => {
    const currentCls = Array.isArray(formData.CLS) ? [...formData.CLS] : [];
    const val = key === 'GIA_TRI' && /^-?\d+,\d*$/.test(rawVal) ? rawVal.replace(',', '.') : rawVal;
    const nextCls = currentCls.map((item: any, i: number) =>
      i === idx ? { ...item, [key]: val, ...(key === 'GIA_TRI' ? { MO_TA: val } : {}) } : item
    );
    onBatchChange({
      CLS: nextCls,
      HAS_CLS: nextCls.length > 0 ? '1' : formData.HAS_CLS,
    });
  };

  const handleRemoveClsRow = (idx: number) => {
    const currentCls = Array.isArray(formData.CLS) ? [...formData.CLS] : [];
    const nextCls = currentCls.filter((_: any, i: number) => i !== idx);
    onBatchChange({
      CLS: nextCls,
      HAS_CLS: nextCls.length > 0 ? '1' : '0',
    });
  };

  /** Điền nhanh mặc định "Bình thường / Loại I" cho toàn bộ phần khám lâm sàng trên mặt giấy */
  const handleQuickFillNormal = () => {
    if (type === 'Adult') {
      const updates: Record<string, any> = {
        TSGD_MAC_BENH: '0',
        TSBT_DANG_DIEU_TRI_BENH: '0',
        TSBT_THAI_SAN: '0',
        KHAM_THE_LUC_PL: formData.KHAM_THE_LUC_PL || '1',
        NOI_KHOA_TUAN_HOAN: formData.NOI_KHOA_TUAN_HOAN || 'Bình thường',
        NOI_KHOA_TUAN_HOAN_PL: formData.NOI_KHOA_TUAN_HOAN_PL || '1',
        NOI_KHOA_HO_HAP: formData.NOI_KHOA_HO_HAP || 'Bình thường',
        NOI_KHOA_HO_HAP_PL: formData.NOI_KHOA_HO_HAP_PL || '1',
        NOI_KHOA_TIEU_HOA: formData.NOI_KHOA_TIEU_HOA || 'Bình thường',
        NOI_KHOA_TIEU_HOA_PL: formData.NOI_KHOA_TIEU_HOA_PL || '1',
        NOI_KHOA_THAN_TN_SD: formData.NOI_KHOA_THAN_TN_SD || 'Bình thường',
        NOI_KHOA_THAN_TN_SD_PL: formData.NOI_KHOA_THAN_TN_SD_PL || '1',
        NOI_KHOA_NOI_TIET: formData.NOI_KHOA_NOI_TIET || 'Bình thường',
        NOI_KHOA_NOI_TIET_PL: formData.NOI_KHOA_NOI_TIET_PL || '1',
        NOI_KHOA_CO_XUONG_KHOP: formData.NOI_KHOA_CO_XUONG_KHOP || 'Bình thường',
        NOI_KHOA_CO_XUONG_KHOP_PL: formData.NOI_KHOA_CO_XUONG_KHOP_PL || '1',
        NOI_KHOA_THAN_KINH: formData.NOI_KHOA_THAN_KINH || 'Bình thường',
        NOI_KHOA_THAN_KINH_PL: formData.NOI_KHOA_THAN_KINH_PL || '1',
        NOI_KHOA_TAM_THAN: formData.NOI_KHOA_TAM_THAN || 'Bình thường',
        NOI_KHOA_TAM_THAN_PL: formData.NOI_KHOA_TAM_THAN_PL || '1',
        KET_QUA_KHAM_NGOAI_KHOA: formData.KET_QUA_KHAM_NGOAI_KHOA || 'Bình thường',
        KHAM_NGOAI_KHOA_PL: formData.KHAM_NGOAI_KHOA_PL || '1',
        KET_QUA_KHAM_DA_LIEU: formData.KET_QUA_KHAM_DA_LIEU || 'Bình thường',
        KHAM_DA_LIEU_PL: formData.KHAM_DA_LIEU_PL || '1',
        KET_QUA_KHAM_SAN_PHU_KHOA: formData.KET_QUA_KHAM_SAN_PHU_KHOA || 'Bình thường',
        KHAM_SAN_PHU_KHOA_PL: formData.KHAM_SAN_PHU_KHOA_PL || '1',
        KHONG_KINH_MAT_PHAI: formData.KHONG_KINH_MAT_PHAI || '10/10',
        KHONG_KINH_MAT_TRAI: formData.KHONG_KINH_MAT_TRAI || '10/10',
        BENH_KHAC_MAT: formData.BENH_KHAC_MAT || 'Không',
        KHAM_MAT_PL: formData.KHAM_MAT_PL || '1',
        TAI_TRAI_NOI_THUONG: formData.TAI_TRAI_NOI_THUONG || '5',
        TAI_TRAI_NOI_THAM: formData.TAI_TRAI_NOI_THAM || '0.5',
        TAI_PHAI_NOI_THUONG: formData.TAI_PHAI_NOI_THUONG || '5',
        TAI_PHAI_NOI_THAM: formData.TAI_PHAI_NOI_THAM || '0.5',
        BENH_TAI_MUI_HONG: formData.BENH_TAI_MUI_HONG || 'Không',
        KHAM_TAI_MUI_HONG_PL: formData.KHAM_TAI_MUI_HONG_PL || '1',
        HAM_TREN: formData.HAM_TREN || 'Bình thường',
        HAM_DUOI: formData.HAM_DUOI || 'Bình thường',
        BENH_RANG_HAM_MAT: formData.BENH_RANG_HAM_MAT || 'Không',
        KHAM_RANG_HAM_MAT_PL: formData.KHAM_RANG_HAM_MAT_PL || '1',
        BINH_THUONG: '1',
        NGUY_CO_MAC_LAO: '0',
        VAN_DE_SUC_KHOE: '0',
        PHAN_LOAI_SK: formData.PHAN_LOAI_SK || '1',
        CAC_VAN_DE_SUC_KHOE: formData.CAC_VAN_DE_SUC_KHOE || 'Đủ sức khỏe làm việc',
        KET_LUAN_BENH: formData.KET_LUAN_BENH || 'Hiện tại chưa phát hiện bệnh lý',
      };
      ADULT_TSBT.forEach(([k]) => {
        updates[k] = '0';
      });
      onBatchChange(updates);
    } else if (type === 'Minor') {
      onBatchChange({
        TSGD_MAC_BENH: '0',
        SAN_KHOA: '1',
        TSBT_MAC_BENH: '0',
        TSBT_DANG_DIEU_TRI_BENH: '0',
        TIEM_CHUNG_BCG: '1',
        TIEM_CHUNG_BH_HG_UV: '1',
        TIEM_CHUNG_SOI: '1',
        TIEM_CHUNG_BAI_LIET: '1',
        TIEM_CHUNG_VNNB_B: '1',
        TIEM_CHUNG_VGB: '1',
        TIEM_CHUNG_CAC_LOAI_KHAC: '1',
        NHI_KHOA_TUAN_HOAN: formData.NHI_KHOA_TUAN_HOAN || 'Bình thường',
        NHI_KHOA_HO_HAP: formData.NHI_KHOA_HO_HAP || 'Bình thường',
        NHI_KHOA_TIEU_HOA: formData.NHI_KHOA_TIEU_HOA || 'Bình thường',
        NHI_KHOA_THAN_TN_SD: formData.NHI_KHOA_THAN_TN_SD || 'Bình thường',
        NHI_KHOA_THAN_KINH: formData.NHI_KHOA_THAN_KINH || 'Bình thường',
        NHI_KHOA_TAM_THAN: formData.NHI_KHOA_TAM_THAN || 'Bình thường',
        NHI_KHOA_LAM_SANG_KHAC: formData.NHI_KHOA_LAM_SANG_KHAC || 'Bình thường',
        KHONG_KINH_MAT_PHAI: formData.KHONG_KINH_MAT_PHAI || '10/10',
        KHONG_KINH_MAT_TRAI: formData.KHONG_KINH_MAT_TRAI || '10/10',
        BENH_KHAC_MAT: formData.BENH_KHAC_MAT || 'Không',
        TAI_TRAI_NOI_THUONG: formData.TAI_TRAI_NOI_THUONG || '5',
        TAI_TRAI_NOI_THAM: formData.TAI_TRAI_NOI_THAM || '0.5',
        TAI_PHAI_NOI_THUONG: formData.TAI_PHAI_NOI_THUONG || '5',
        TAI_PHAI_NOI_THAM: formData.TAI_PHAI_NOI_THAM || '0.5',
        BENH_KHAC_TAI_MUI_HONG: formData.BENH_KHAC_TAI_MUI_HONG || 'Không',
        HAM_TREN: formData.HAM_TREN || 'Bình thường',
        HAM_DUOI: formData.HAM_DUOI || 'Bình thường',
        BENH_KHAC_RANG_HAM_MAT: formData.BENH_KHAC_RANG_HAM_MAT || 'Không',
        BINH_THUONG: '1',
        NGUY_CO_MAC_LAO: '0',
        VAN_DE_SUC_KHOE: '0',
        PHAN_LOAI_SK: formData.PHAN_LOAI_SK || '1',
        CAC_VAN_DE_SUC_KHOE: formData.CAC_VAN_DE_SUC_KHOE || 'Sức khỏe bình thường',
      });
    } else {
      onBatchChange({
        SINH_NON: '0',
        TSBT_MAC_BENH: '0',
        TSGD_MAC_BENH: '0',
        TS_TIEP_XUC_LAO: '0',
        DGDHST_NHIET_DO: '1',
        DGDHST_MACH: '1',
        DGDHST_NHIP_THO: '1',
        DG_VONG_DAU: '1',
        DGDD_BINH_THUONG: '1',
        PHU_DINH_DUONG: '0',
        DGDD_THIEU_MAU: '0',
        DGDD_COI_XUONG: '0',
        SUY_DINH_DUONG: '0',
        THUA_CAN_BEO_PHI: '0',
        PT_TTBT_THEO_DO_TUOI: '1',
        PT_VDBT_THEO_DO_TUOI: '1',
        NGUY_CO_TU_KY: '0',
        TIEM_CHUNG_BCG_SS: '1',
        TIEM_CHUNG_VGB_SS_MUI1: '1',
        TIEM_CHUNG_DAY_DU_THEO_DO_TUOI: '1',
        MAU_SAC_DA: '1',
        LONG_BAN_TAY: '1',
        THOP: '1',
        HINH_DANG_DAU: '1',
        VAN_DONG_CO: '1',
        KHOI_BAT_THUONG_DAU_CO: '0',
        VI_TRI_HAI_MAT: '1',
        MI_MAT_KET_MAC: '1',
        DONG_TU: '1',
        LAC_MAT: '0',
        TAI_MANG_NHI: '1',
        DAP_UNG_AM_THANH: '1',
        KHOI_SUNG_SAU_TAI: '0',
        CHAY_MU_NUOC_TAI: '0',
        HINH_DANG_MUI: '1',
        CHAY_NUOC_MUI: '0',
        NGHET_MUI: '0',
        HONG: '1',
        HINH_DANG_MIENG: '1',
        RANG_SUA_SO_SINH: '0',
        HINH_DANG_LUOI: '1',
        DINH_THANG_LUOI: '0',
        NAM_MIENG: '0',
        CAM_NHO_TUT_VE_SAU: '0',
        SAU_MANG_BAM_LO: '0',
        NHIP_THO_KHONG_DEU: '0',
        THO_RUT_LOM_LONG_NGUC: '0',
        TIENG_THO_BAT_THUONG: '0',
        SUY_HO_HAP: '0',
        NGHE_PHOI: '1',
        VI_TRI_MOM_TIM: '1',
        MACH_NGOAI_VI: '1',
        TIENG_TIM: '0',
        HINH_DANG_BUNG_RON: '1',
        GAN_LACH_TO: '0',
        KHOI_BAT_THUONG: '0',
        LO_HAU_MON: '1',
        CO_QUAN_SINH_DUC_NGOAI: '1',
        VAN_DONG_KHONG_DOI_XUNG: '0',
        PHAN_XA_BU: '1',
        PHAN_XA_NAM: '1',
        PHAN_XA_MORO: '1',
        TRUONG_LUC_CO: '1',
        KHOP_HANG: '1',
        PHAN_XA_CO: '1',
        KIEM_TRA_LUNG_COT_SONG: '1',
        TU_CHI_KHOP: '1',
        QUAN_SAT_DANG_DI: '1',
        BINH_THUONG: '1',
        NGUY_CO_MAC_LAO: '0',
        VAN_DE_SUC_KHOE: '0',
      });
    }
  };

  const provinceOptions = Object.entries(PROVINCES).map(([value, label]) => ({ value, label }));
  const communeOptions =
    formData.MATINH_CU_TRU && COMMUNES_BY_PROVINCE[formData.MATINH_CU_TRU]
      ? COMMUNES_BY_PROVINCE[formData.MATINH_CU_TRU]
      : [];
  const danTocOptions = Object.entries(DAN_TOC_MAP).map(([value, label]) => ({ value, label: `${value} - ${label}` }));

  // Trạng thái mở modal ký số Bác sĩ chuyên khoa / Người kết luận
  const [signModalState, setSignModalState] = React.useState<{
    isOpen: boolean;
    field: string;
    label: string;
    isConclusion: boolean;
  } | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false);

  const openSignDialog = React.useCallback(
    (field: string, label: string, isConclusion: boolean = false) => {
      setSignModalState({
        isOpen: true,
        field,
        label,
        isConclusion,
      });
    },
    []
  );

  const handleApplySingleSign = React.useCallback(
    (field: string, badgeSvg: string, signerName?: string) => {
      onChange(field, badgeSvg);
      if (field === 'CKDT_CLS_XET_NGHIEM') {
        onChange('CKDT_CLS', badgeSvg);
      }
      if (field === 'CKDT_KET_LUAN' && signerName && !formData.NGUOI_KET_LUAN) {
        onChange('NGUOI_KET_LUAN', signerName);
      }
    },
    [onChange, formData.NGUOI_KET_LUAN]
  );

  const handleApplyAllClinicalSign = React.useCallback(
    (badgeSvg: string) => {
      const list = KSK_CLINICAL_SIG_FIELDS[type] || KSK_CLINICAL_SIG_FIELDS.Adult;
      const updates: Record<string, any> = {};
      list.forEach(item => {
        updates[item.field] = badgeSvg;
      });
      onBatchChange(updates);
    },
    [type, onBatchChange]
  );

  return (
    <KskPaperFormContext.Provider value={{ formData, onChange, openSignDialog }}>
      <div className="space-y-4">
      {/* Thanh hỗ trợ nhập nhanh & mã kỹ thuật liên thông XML */}
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-emerald-900 uppercase tracking-wide">Thông tin liên thông XML2:</span>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Mã CSKCB (5 số):</span>
            <input
              type="text"
              value={formData.MA_CSKCB || ''}
              onChange={e => onChange('MA_CSKCB', e.target.value)}
              placeholder="VD: 01001"
              className="w-24 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-800"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Mã GLN (13 số):</span>
            <input
              type="text"
              value={formData.MA_GTIN_CSKCB || ''}
              onChange={e => onChange('MA_GTIN_CSKCB', e.target.value)}
              placeholder="893..."
              className="w-36 bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-800"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Ngày giờ khám:</span>
            <input
              type="date"
              value={toDateInput(formData.NGAY_VAO)}
              onChange={e => onChange('NGAY_VAO', e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-slate-600 font-semibold">Điện thoại:</span>
            <input
              type="text"
              value={formData.DIEN_THOAI || ''}
              onChange={e => onChange('DIEN_THOAI', e.target.value)}
              placeholder="09..."
              className="w-28 bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleQuickFillNormal}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Điền nhanh mặc định: Bình thường / Loại I
        </button>
      </div>

      {/* TỜ GIẤY A4 PHỤ LỤC SỐ XXIV (GIỐNG HỆT FILE WORD BỘ Y TẾ) */}
      <div
        className="bg-white shadow-lg border border-slate-300 mx-auto p-8 md:p-12 text-black leading-relaxed"
        style={{
          maxWidth: '210mm',
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '15.5px',
        }}
      >
        <div className="text-center text-[14px] text-slate-600 mb-1">
          <b>PHỤ LỤC SỐ XXIV</b> <i>(Ban hành kèm theo Thông tư số /2026/TT-BYT của Bộ trưởng Bộ Y tế)</i>
        </div>

        {/* =====================================================================
            MẪU SỐ 01: TRẺ EM DƯỚI 06 TUỔI (ChildUnder)
           ===================================================================== */}
        {type === 'ChildUnder' && (
          <div className="space-y-2">
            <div className="text-center font-bold text-[17px]">Mẫu số 01</div>
            <div className="text-center italic text-[15px] mb-3">
              Giấy khám sức khỏe và khám sức khoẻ định kỳ dùng cho trẻ em dưới 06 tuổi
            </div>

            <div className="grid grid-cols-12 gap-2 text-center mb-4">
              <div className="col-span-5">
                <div className="font-bold">
                  CƠ SỞ KCB: <DotInput field="MA_CSKCB" placeholder="Mã CSKCB" width="w-28" bold />
                </div>
                <div>-------</div>
                <div className="mt-1">
                  Số: <DotInput field="MA_LK" placeholder="......" width="w-28" />
                  /GKSK
                </div>
              </div>
              <div className="col-span-7">
                <div className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold">Độc lập - Tự do - Hạnh phúc</div>
                <div>---------------</div>
              </div>
            </div>

            <div className="text-center font-bold text-[18px] uppercase my-4">
              GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO
              <br />
              TRẺ EM DƯỚI 06 TUỔI
            </div>

            <div className="font-bold uppercase mt-2">THÔNG TIN HÀNH CHÍNH</div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                1. Họ và tên (In hoa):{' '}
                <DotInput field="HO_TEN" placeholder="NHẬP HỌ VÀ TÊN TRẺ" width="w-60" uppercase bold />
              </div>
              <div>
                2. Số CCCD/Hộ chiếu/Mã định danh: <DotInput field="SO_CCCD" placeholder="12 chữ số" width="w-40" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                3. Ngày sinh:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAY_SINH)}
                  onChange={e => onChange('NGAY_SINH', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />
              </div>
              <div>
                4. Giới: <PaperCheck field="GIOI_TINH" targetValue="1" label="Nam" />
                <PaperCheck field="GIOI_TINH" targetValue="2" label="Nữ" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                5. Sinh non: &nbsp;
                <PaperCheck field="SINH_NON" targetValue="0" label="Không" />
                <PaperCheck field="SINH_NON" targetValue="1" label="Có" />
              </div>
              <div>
                6. Tuần thai khi sinh: <DotInput field="TUAN_THAI" placeholder="38" width="w-16" /> tuần
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                7. Dân tộc: <DotSelect field="MA_DAN_TOC" options={danTocOptions} width="w-40" />
              </div>
              <div>
                8. Đối tượng: <DotSelect field="DOI_TUONG" options={OPT_DOI_TUONG} width="w-64" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                9. Nguồn chi trả: <DotSelect field="NGUON_CHI_TRA" options={OPT_NGUON_CHI_TRA} width="w-56" />
              </div>
              <div>
                10. Nhóm máu: <DotSelect field="NHOM_MAU" options={OPT_NHOM_MAU} placeholder="Chọn" width="w-24" /> (nếu có)
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span>11. Nơi ở hiện tại: Tỉnh/ thành:</span>
              <DotSelect field="MATINH_CU_TRU" options={provinceOptions} placeholder="Chọn Tỉnh/TP" width="w-44" />
              <span>phường/ xã:</span>
              <DotSelect field="MAXA_CU_TRU" options={communeOptions} placeholder="Chọn Phường/Xã" width="w-44" />
              <span>số nhà/ thôn/ xóm:</span>
              <DotInput field="DIA_CHI" placeholder="Số nhà, thôn, xóm..." width="w-52" />
            </div>

            <div>
              12. Họ tên người đi cùng trẻ/ Người giám hộ:{' '}
              <DotInput field="HO_TEN_NGUOI_DI_CUNG" placeholder="Họ tên người đi cùng trẻ" width="w-80" />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2">13. Mối quan hệ với trẻ:</span>
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="1" label="Cha" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="2" label="Mẹ" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="3" label="Ông/bà" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="4" label="Anh/chị" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="5" label="Họ hàng" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="9" label="Khác" />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                14. Số điện thoại liên hệ: <DotInput field="DIEN_THOAI_NGUOI_DI_CUNG" placeholder="09..." width="w-36" />
              </div>
              <div>
                15. Mã định danh/CCCD người đi cùng trẻ:{' '}
                <DotInput field="SO_CCCD_NGUOI_DI_CUNG" placeholder="12 chữ số" width="w-40" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                16. Ngày khám:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAY_VAO)}
                  onChange={e => onChange('NGAY_VAO', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />
              </div>
              <div>
                17. Cơ sở khám: <DotInput field="MA_CSKCB" placeholder="Mã CSKCB" width="w-44" />
              </div>
            </div>

            <div>
              <div className="font-bold">18. Tiền sử:</div>
              <div className="pl-2">
                - Bản thân: &nbsp;
                <PaperCheck field="TSBT_MAC_BENH" targetValue="0" label="Không" />
                <PaperCheck field="TSBT_MAC_BENH" targetValue="1" label="Có" />
                (ghi rõ tên bệnh nếu có): <DotInput field="TSBT_MA_BENH" placeholder="Mã ICD-10 / Tên bệnh" width="w-64" />
              </div>
              <div className="pl-2">
                - Gia đình: &nbsp;
                <PaperCheck field="TSGD_MAC_BENH" targetValue="0" label="Không" />
                <PaperCheck field="TSGD_MAC_BENH" targetValue="1" label="Có" />
                (ghi rõ tên bệnh nếu có): <DotInput field="TSGD_MA_BENH" placeholder="Mã ICD-10 / Tên bệnh" width="w-64" />
              </div>
              <div className="pl-2">
                - Tiền sử tiếp xúc với người bệnh lao: &nbsp;
                <PaperCheck field="TS_TIEP_XUC_LAO" targetValue="0" label="Không" />
                <PaperCheck field="TS_TIEP_XUC_LAO" targetValue="1" label="Có" />
              </div>
            </div>

            <div className="italic mt-2">
              Tôi xin cam đoan những điều khai trên đây hoàn toàn đúng với sự thật theo sự hiểu biết của tôi.
            </div>

            {/* ĐÁNH GIÁ DẤU HIỆU SINH TỒN */}
            <div className="font-bold uppercase pt-3 border-t border-slate-200">ĐÁNH GIÁ DẤU HIỆU SINH TỒN</div>
            <div>
              Nhiệt độ: <DotInput field="NHIET_DO" placeholder="36.8" width="w-16" /> độ C &nbsp;&nbsp;&nbsp;
              <PaperCheck field="DGDHST_NHIET_DO" targetValue="1" label="Bình thường" />
              <PaperCheck field="DGDHST_NHIET_DO" targetValue="2" label="Sốt" />
              <PaperCheck field="DGDHST_NHIET_DO" targetValue="3" label="Hạ thân nhiệt" />
            </div>
            <div>
              Mạch: <DotInput field="MACH" placeholder="95" width="w-16" /> lần/phút &nbsp;&nbsp;&nbsp;
              <PaperCheck field="DGDHST_MACH" targetValue="1" label="Bình thường" />
              <PaperCheck field="DGDHST_MACH" targetValue="2" label="Nhanh" />
            </div>
            <div>
              Nhịp thở: <DotInput field="NHIP_THO" placeholder="28" width="w-16" /> lần/phút &nbsp;&nbsp;&nbsp;
              <PaperCheck field="DGDHST_NHIP_THO" targetValue="1" label="Bình thường" />
              <PaperCheck field="DGDHST_NHIP_THO" targetValue="2" label="Thở nhanh" />
              <PaperCheck field="DGDHST_NHIP_THO" targetValue="3" label="Thở chậm" />
            </div>

            {/* ĐÁNH GIÁ DINH DƯỠNG */}
            <div className="font-bold uppercase pt-3">ĐÁNH GIÁ DINH DƯỠNG</div>
            <div className="flex flex-wrap gap-6">
              <div>
                Chiều dài (cm): <DotInput field="CHIEU_DAI" placeholder="85" width="w-24" />
              </div>
              <div>
                Chiều dài/Tuổi: <DotInput field="CHIEU_DAI_TUOI_SD" placeholder="0" width="w-20" /> SD
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                Cân nặng (kg): <DotInput field="CAN_NANG" placeholder="12.5" width="w-24" />
              </div>
              <div>
                Cân nặng/Tuổi: <DotInput field="CAN_NANG_TUOI_SD" placeholder="0" width="w-20" /> SD
              </div>
            </div>
            <div>
              Vòng đầu (cm): <DotInput field="VONG_DAU" placeholder="48" width="w-20" /> &nbsp;&nbsp;&nbsp;
              <PaperCheck field="DG_VONG_DAU" targetValue="1" label="Bình thường" />
              <PaperCheck field="DG_VONG_DAU" targetValue="2" label="Đầu to" />
              <PaperCheck field="DG_VONG_DAU" targetValue="3" label="Đầu nhỏ" />
            </div>
            <div>
              Chu vi vòng cánh tay (mm): <DotInput field="CHU_VI_VONG_CANH_TAY" placeholder="145" width="w-24" />
            </div>
            <div>
              <span className="mr-3">Tình trạng dinh dưỡng:</span>
              <PaperCheck field="DGDD_BINH_THUONG" targetValue="1" toggleOffValue="0" label="Bình thường" />
              <PaperCheck field="PHU_DINH_DUONG" targetValue="1" toggleOffValue="0" label="Phù dinh dưỡng" />
              <PaperCheck field="DGDD_THIEU_MAU" targetValue="1" toggleOffValue="0" label="Dấu hiệu thiếu máu" />
              <PaperCheck field="DGDD_COI_XUONG" targetValue="1" toggleOffValue="0" label="Dấu hiệu còi xương" />
              <PaperCheck field="SUY_DINH_DUONG" targetValue="1" toggleOffValue="0" label="Suy dinh dưỡng" />
              <PaperCheck field="THUA_CAN_BEO_PHI" targetValue="1" toggleOffValue="0" label="Thừa cân/béo phì" />
            </div>

            {/* ĐÁNH GIÁ PHÁT TRIỂN TINH THẦN - VẬN ĐỘNG */}
            <div className="font-bold uppercase pt-3">ĐÁNH GIÁ PHÁT TRIỂN TINH THẦN - VẬN ĐỘNG</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[72%]" rowSpan={2}>
                    Hành vi và năng lực trẻ theo độ tuổi
                  </th>
                  <th className="border border-black p-1 text-center" colSpan={2}>
                    Kết quả
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1 text-center w-[14%]">Có</th>
                  <th className="border border-black p-1 text-center w-[14%]">Không</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1.5">- Phát triển tinh thần bình thường của trẻ theo độ tuổi</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="PT_TTBT_THEO_DO_TUOI" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="PT_TTBT_THEO_DO_TUOI" targetValue="0" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">- Phát triển vận động bình thường của trẻ theo độ tuổi</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="PT_VDBT_THEO_DO_TUOI" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="PT_VDBT_THEO_DO_TUOI" targetValue="0" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">- Trẻ có nguy cơ tự kỷ (với trẻ từ 16-30 tháng tuổi)</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="NGUY_CO_TU_KY" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="NGUY_CO_TU_KY" targetValue="0" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ĐÁNH GIÁ TIÊM CHỦNG */}
            <div className="font-bold uppercase pt-3">ĐÁNH GIÁ TIÊM CHỦNG</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[72%]">Kiểm tra sổ tiêm chủng</th>
                  <th className="border border-black p-1.5 text-center w-[14%]">Có</th>
                  <th className="border border-black p-1.5 text-center w-[14%]">Không</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1.5">- Lao (sơ sinh)</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_BCG_SS" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_BCG_SS" targetValue="0" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">- Viêm gan B mũi 1 (sơ sinh)</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_VGB_SS_MUI1" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_VGB_SS_MUI1" targetValue="0" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">- Tiêm chủng đầy đủ các loại vắc xin theo độ tuổi</td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_DAY_DU_THEO_DO_TUOI" targetValue="1" />
                  </td>
                  <td className="border border-black p-1 text-center">
                    <PaperCheck field="TIEM_CHUNG_DAY_DU_THEO_DO_TUOI" targetValue="0" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* KHÁM LÂM SÀNG (MẪU 01) */}
            <div className="font-bold uppercase pt-3">KHÁM LÂM SÀNG</div>
            <div className="italic text-[14.5px]">
              Quan sát: Nét mặt/tư thế/tỷ lệ, sự đối xứng với các bộ phận cơ thể/sự chuyển động của trẻ. Tìm dấu hiệu bệnh cấp hoặc mạn tính.
            </div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[76%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[24%]">Họ tên và chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">1. Toàn trạng</div>
                    <div>
                      - Màu sắc da: &nbsp;
                      <PaperCheck field="MAU_SAC_DA" targetValue="1" label="Hồng hào" />
                      <PaperCheck field="MAU_SAC_DA" targetValue="2" label="Nhợt" />
                      <PaperCheck field="MAU_SAC_DA" targetValue="3" label="Tím" />
                      <PaperCheck field="MAU_SAC_DA" targetValue="4" label="Vàng" />
                      <PaperCheck field="MAU_SAC_DA" targetValue="5" label="Sạm da" />
                    </div>
                    <div>
                      - Lòng bàn tay: &nbsp;
                      <PaperCheck field="LONG_BAN_TAY" targetValue="1" label="Bình thường (không nhợt)" />
                      <PaperCheck field="LONG_BAN_TAY" targetValue="2" label="Không bình thường (nhợt)" />
                    </div>
                    <div className="font-bold pt-1">2. Đầu - cổ</div>
                    <div className="font-bold">2.1. Khám đầu - cổ</div>
                    <div>
                      - Thóp (trẻ nhỏ còn thóp): &nbsp;
                      <PaperCheck field="THOP" targetValue="1" label="Bình thường" />
                      <PaperCheck field="THOP" targetValue="2" label="Rộng" />
                      <PaperCheck field="THOP" targetValue="3" label="Hẹp" />
                      <PaperCheck field="THOP" targetValue="4" label="Thóp phồng" />
                    </div>
                    <div>
                      - Kích thước và hình dạng đầu: &nbsp;
                      <PaperCheck field="HINH_DANG_DAU" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HINH_DANG_DAU" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Vận động cổ: &nbsp;
                      <PaperCheck field="VAN_DONG_CO" targetValue="1" label="Bình thường" />
                      <PaperCheck field="VAN_DONG_CO" targetValue="2" label="Giới hạn" />
                    </div>
                    <div>
                      - Khối bất thường: &nbsp;
                      <PaperCheck field="KHOI_BAT_THUONG_DAU_CO" targetValue="0" label="Không" />
                      <PaperCheck field="KHOI_BAT_THUONG_DAU_CO" targetValue="1" label="Có" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_DA_DAU_CO" label="Khám Đầu - Cổ" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">2.2. Khám mắt</div>
                    <div>
                      - Vị trí 2 mắt: &nbsp;
                      <PaperCheck field="VI_TRI_HAI_MAT" targetValue="1" label="Bình thường" />
                      <PaperCheck field="VI_TRI_HAI_MAT" targetValue="2" label="2 mắt xa nhau" />
                    </div>
                    <div>
                      - Mí mắt và kết mạc: &nbsp;
                      <PaperCheck field="MI_MAT_KET_MAC" targetValue="1" label="Bình thường" />
                      <PaperCheck field="MI_MAT_KET_MAC" targetValue="2" label="Sưng/ đỏ" />
                      <PaperCheck field="MI_MAT_KET_MAC" targetValue="3" label="Chảy ghèn/mủ" />
                    </div>
                    <div>
                      - Đồng tử (kích thước, phản xạ): &nbsp;
                      <PaperCheck field="DONG_TU" targetValue="1" label="Bình thường" />
                      <PaperCheck field="DONG_TU" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Lác mắt: &nbsp;
                      <PaperCheck field="LAC_MAT" targetValue="0" label="Không" />
                      <PaperCheck field="LAC_MAT" targetValue="1" label="Có" />
                    </div>

                    <div className="font-bold pt-1">2.3. Khám tai</div>
                    <div>
                      - Tai và màng nhĩ: &nbsp;
                      <PaperCheck field="TAI_MANG_NHI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="TAI_MANG_NHI" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Đáp ứng với âm thanh: &nbsp;
                      <PaperCheck field="DAP_UNG_AM_THANH" targetValue="1" label="Bình thường" />
                      <PaperCheck field="DAP_UNG_AM_THANH" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Có khối sưng sau tai: &nbsp;
                      <PaperCheck field="KHOI_SUNG_SAU_TAI" targetValue="0" label="Không" />
                      <PaperCheck field="KHOI_SUNG_SAU_TAI" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Dấu hiệu chảy mủ, nước tai: &nbsp;
                      <PaperCheck field="CHAY_MU_NUOC_TAI" targetValue="0" label="Không" />
                      <PaperCheck field="CHAY_MU_NUOC_TAI" targetValue="1" label="Có" />
                    </div>

                    <div className="font-bold pt-1">2.4. Khám mũi - họng</div>
                    <div>
                      - Hình dạng mũi: &nbsp;
                      <PaperCheck field="HINH_DANG_MUI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HINH_DANG_MUI" targetValue="2" label="Mũi to, dày" />
                      <PaperCheck field="HINH_DANG_MUI" targetValue="3" label="Bất sản xương mũi" />
                    </div>
                    <div>
                      - Chảy nước mũi: &nbsp;
                      <PaperCheck field="CHAY_NUOC_MUI" targetValue="0" label="Không" />
                      <PaperCheck field="CHAY_NUOC_MUI" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Nghẹt mũi: &nbsp;
                      <PaperCheck field="NGHET_MUI" targetValue="0" label="Không" />
                      <PaperCheck field="NGHET_MUI" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Họng: &nbsp;
                      <PaperCheck field="HONG" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HONG" targetValue="0" label="Không bình thường" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_MAT_TAI_MUI_HONG" label="Khám Mắt - Tai - Mũi - Họng" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">2.5. Khám miệng, răng (với trẻ đã có răng)</div>
                    <div>
                      - Hình dạng miệng: &nbsp;
                      <PaperCheck field="HINH_DANG_MIENG" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HINH_DANG_MIENG" targetValue="2" label="Sứt môi, chẻ vòm" />
                    </div>
                    <div>
                      - Răng sữa sơ sinh: &nbsp;
                      <PaperCheck field="RANG_SUA_SO_SINH" targetValue="0" label="Không" />
                      <PaperCheck field="RANG_SUA_SO_SINH" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Hình dạng lưỡi: &nbsp;
                      <PaperCheck field="HINH_DANG_LUOI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HINH_DANG_LUOI" targetValue="2" label="Lưỡi to bè" />
                    </div>
                    <div>
                      - Dính thắng lưỡi: &nbsp;
                      <PaperCheck field="DINH_THANG_LUOI" targetValue="0" label="Không" />
                      <PaperCheck field="DINH_THANG_LUOI" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Nấm miệng: &nbsp;
                      <PaperCheck field="NAM_MIENG" targetValue="0" label="Không" />
                      <PaperCheck field="NAM_MIENG" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Cằm nhỏ, tụt về sau: &nbsp;
                      <PaperCheck field="CAM_NHO_TUT_VE_SAU" targetValue="0" label="Không" />
                      <PaperCheck field="CAM_NHO_TUT_VE_SAU" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Vết sâu, mảng bám, lỗ trên răng: &nbsp;
                      <PaperCheck field="SAU_MANG_BAM_LO" targetValue="0" label="Không" />
                      <PaperCheck field="SAU_MANG_BAM_LO" targetValue="1" label="Có" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_MIENG_RANG" label="Khám Miệng - Răng" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">3. Hô hấp</div>
                    <div>
                      - Nhịp thở không đều: &nbsp;
                      <PaperCheck field="NHIP_THO_KHONG_DEU" targetValue="0" label="Không" />
                      <PaperCheck field="NHIP_THO_KHONG_DEU" targetValue="1" label="Có cơn ngưng thở trên 5 giây" />
                    </div>
                    <div>
                      - Thở rút lõm lồng ngực: &nbsp;
                      <PaperCheck field="THO_RUT_LOM_LONG_NGUC" targetValue="0" label="Không" />
                      <PaperCheck field="THO_RUT_LOM_LONG_NGUC" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Tiếng thở bất thường: &nbsp;
                      <PaperCheck field="TIENG_THO_BAT_THUONG" targetValue="0" label="Không" />
                      <PaperCheck field="TIENG_THO_BAT_THUONG" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Dấu hiệu suy hô hấp: &nbsp;
                      <PaperCheck field="SUY_HO_HAP" targetValue="0" label="Không" />
                      <PaperCheck field="SUY_HO_HAP" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Nghe phổi: &nbsp;
                      <PaperCheck field="NGHE_PHOI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="NGHE_PHOI" targetValue="0" label="Không bình thường" />
                    </div>

                    <div className="font-bold pt-1">4. Tim mạch</div>
                    <div>
                      - Vị trí mỏm tim: &nbsp;
                      <PaperCheck field="VI_TRI_MOM_TIM" targetValue="1" label="Bình thường" />
                      <PaperCheck field="VI_TRI_MOM_TIM" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Mạch ngoại vi (mạch quay-bẹn): &nbsp;
                      <PaperCheck field="MACH_NGOAI_VI" targetValue="1" label="Bắt rõ" />
                      <PaperCheck field="MACH_NGOAI_VI" targetValue="2" label="Mạch nhẹ" />
                      <PaperCheck field="MACH_NGOAI_VI" targetValue="3" label="Không bắt được" />
                    </div>
                    <div>
                      - Nghe tim (loạn nhịp, tiếng thổi): &nbsp;
                      <PaperCheck field="TIENG_TIM" targetValue="0" label="Không" />
                      <PaperCheck field="TIENG_TIM" targetValue="1" label="Có" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_HO_HAP_TIM_MACH" label="Khám Hô hấp - Tim mạch" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">5. Bụng và cơ quan sinh dục</div>
                    <div>
                      - Hình dáng bụng, rốn: &nbsp;
                      <PaperCheck field="HINH_DANG_BUNG_RON" targetValue="1" label="Bình thường" />
                      <PaperCheck field="HINH_DANG_BUNG_RON" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Gan, lách to: &nbsp;
                      <PaperCheck field="GAN_LACH_TO" targetValue="0" label="Không" />
                      <PaperCheck field="GAN_LACH_TO" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Khối bất thường: &nbsp;
                      <PaperCheck field="KHOI_BAT_THUONG" targetValue="0" label="Không" />
                      <PaperCheck field="KHOI_BAT_THUONG" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Lỗ hậu môn: &nbsp;
                      <PaperCheck field="LO_HAU_MON" targetValue="1" label="Bình thường" />
                      <PaperCheck field="LO_HAU_MON" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Cơ quan sinh dục ngoài: &nbsp;
                      <PaperCheck field="CO_QUAN_SINH_DUC_NGOAI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="CO_QUAN_SINH_DUC_NGOAI" targetValue="0" label="Không bình thường" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_BUNG_SINH_DUC" label="Khám Bụng - Sinh dục" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">6. Cơ xương và thần kinh</div>
                    <div>
                      - Vận động không đối xứng: &nbsp;
                      <PaperCheck field="VAN_DONG_KHONG_DOI_XUNG" targetValue="0" label="Không" />
                      <PaperCheck field="VAN_DONG_KHONG_DOI_XUNG" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Phản xạ bú: &nbsp;
                      <PaperCheck field="PHAN_XA_BU" targetValue="0" label="Không" />
                      <PaperCheck field="PHAN_XA_BU" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Phản xạ nắm: &nbsp;
                      <PaperCheck field="PHAN_XA_NAM" targetValue="0" label="Không" />
                      <PaperCheck field="PHAN_XA_NAM" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Phản xạ Moro: &nbsp;
                      <PaperCheck field="PHAN_XA_MORO" targetValue="0" label="Không" />
                      <PaperCheck field="PHAN_XA_MORO" targetValue="1" label="Có" />
                    </div>
                    <div>
                      - Trương lực cơ: &nbsp;
                      <PaperCheck field="TRUONG_LUC_CO" targetValue="1" label="Bình thường" />
                      <PaperCheck field="TRUONG_LUC_CO" targetValue="2" label="Tăng" />
                      <PaperCheck field="TRUONG_LUC_CO" targetValue="3" label="Giảm" />
                    </div>
                    <div>
                      - Khớp háng: &nbsp;
                      <PaperCheck field="KHOP_HANG" targetValue="1" label="Bình thường" />
                      <PaperCheck field="KHOP_HANG" targetValue="2" label="Trật khớp háng" />
                    </div>
                    <div>
                      - Phản xạ cơ: &nbsp;
                      <PaperCheck field="PHAN_XA_CO" targetValue="1" label="Bình thường" />
                      <PaperCheck field="PHAN_XA_CO" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Kiểm tra lưng, cột sống: &nbsp;
                      <PaperCheck field="KIEM_TRA_LUNG_COT_SONG" targetValue="1" label="Bình thường" />
                      <PaperCheck field="KIEM_TRA_LUNG_COT_SONG" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Khám tứ chi và khớp: &nbsp;
                      <PaperCheck field="TU_CHI_KHOP" targetValue="1" label="Bình thường" />
                      <PaperCheck field="TU_CHI_KHOP" targetValue="0" label="Không bình thường" />
                    </div>
                    <div>
                      - Quan sát dáng đi: &nbsp;
                      <PaperCheck field="QUAN_SAT_DANG_DI" targetValue="1" label="Bình thường" />
                      <PaperCheck field="QUAN_SAT_DANG_DI" targetValue="0" label="Không bình thường" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_THAN_KINH_CO_XUONG_KHOP" label="Khám Cơ xương và Thần kinh" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* KẾT LUẬN VÀ TƯ VẤN (MẪU 01) */}
            <div className="font-bold uppercase pt-3">KẾT LUẬN VÀ TƯ VẤN</div>
            <div className="font-bold">Kết luận về sức khỏe:</div>
            <div>
              <PaperCheck field="BINH_THUONG" targetValue="1" toggleOffValue="0" label="Bình thường." />
            </div>
            <div>
              <PaperCheck field="NGUY_CO_MAC_LAO" targetValue="1" toggleOffValue="0" label="Có nguy cơ mắc lao (tiền sử tiếp xúc)." />
            </div>
            <div>
              <PaperCheck field="VAN_DE_SUC_KHOE" targetValue="1" toggleOffValue="0" label="Có vấn đề về sức khỏe." />
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span>Ghi rõ:</span>
              <DotInput field="GHI_RO_VAN_DE_SUC_KHOE" placeholder="Ghi rõ vấn đề sức khỏe..." width="w-72" />
              <span>Mã ICD-10 (nếu có):</span>
              <DotInput field="KET_LUAN_BENH" placeholder="VD: J00" width="w-40" />
            </div>
            <div>
              Tư vấn và hẹn khám lần sau:{' '}
              <PaperCheck field="HEN_KHAM_LAN_SAU" targetValue="1" toggleOffValue="0" label="Có hẹn khám" />
              &nbsp; hoặc chuyển cơ sở khám bệnh, chữa bệnh:{' '}
              <PaperCheck field="CHUYEN_CSKCB" targetValue="1" toggleOffValue="0" label="Chuyển CSKCB" />
            </div>
          </div>
        )}

        {/* =====================================================================
            MẪU SỐ 02: TỪ ĐỦ 06 TUỔI ĐẾN DƯỚI 18 TUỔI (Minor)
           ===================================================================== */}
        {type === 'Minor' && (
          <div className="space-y-2">
            <div className="text-center font-bold text-[17px]">Mẫu số 02</div>
            <div className="text-center italic text-[15px] mb-3">
              Giấy khám sức khỏe và khám sức khoẻ định kỳ dùng cho người từ đủ 06 tuổi đến dưới 18 tuổi
            </div>

            <div className="grid grid-cols-12 gap-2 text-center mb-4">
              <div className="col-span-5">
                <div className="font-bold">
                  CƠ SỞ KCB: <DotInput field="MA_CSKCB" placeholder="Mã CSKCB" width="w-28" bold />
                </div>
                <div>-------</div>
                <div className="mt-1">
                  Số: <DotInput field="MA_LK" placeholder="......" width="w-28" />
                  /GKSK
                </div>
              </div>
              <div className="col-span-7">
                <div className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold">Độc lập - Tự do - Hạnh phúc</div>
                <div>---------------</div>
              </div>
            </div>

            <div className="text-center font-bold text-[18px] uppercase my-4">
              GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO
              <br />
              NGƯỜI TỪ ĐỦ 06 TUỔI ĐẾN DƯỚI 18 TUỔI
            </div>

            <div>
              1. Họ và tên (viết chữ in hoa):{' '}
              <DotInput field="HO_TEN" placeholder="NHẬP HỌ VÀ TÊN (IN HOA)" width="w-80" uppercase bold />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                2. Giới tính: <PaperCheck field="GIOI_TINH" targetValue="1" label="Nam" />
                <PaperCheck field="GIOI_TINH" targetValue="2" label="Nữ" />
              </div>
              <div>
                3. Ngày tháng năm sinh:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAY_SINH)}
                  onChange={e => onChange('NGAY_SINH', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />
                ; &nbsp; Tuổi: <span className="font-bold px-2 border-b border-dotted border-slate-700">{age ?? '...'}</span>
              </div>
            </div>

            <div>
              4. Số CCCD/Hộ chiếu/Mã định danh: <DotInput field="SO_CCCD" placeholder="Số CCCD / Mã định danh" width="w-64" />
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                5. Cấp ngày:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAYCAP_CCCD)}
                  onChange={e => onChange('NGAYCAP_CCCD', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />
              </div>
              <div>
                Nơi cấp: <DotInput field="NOICAP_CCCD" placeholder="Cục Cảnh sát QLHC về TTXH" width="w-64" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                6. Dân tộc: <DotSelect field="MA_DAN_TOC" options={danTocOptions} width="w-40" />
              </div>
              <div>
                7. Đối tượng: <DotSelect field="DOI_TUONG" options={OPT_DOI_TUONG} width="w-64" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                8. Nguồn chi trả: <DotSelect field="NGUON_CHI_TRA" options={OPT_NGUON_CHI_TRA} width="w-56" />
              </div>
              <div>
                9. Nhóm máu: <DotSelect field="NHOM_MAU" options={OPT_NHOM_MAU} placeholder="Chọn" width="w-24" /> (nếu có)
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span>10. Nơi ở hiện tại: Tỉnh/ thành:</span>
              <DotSelect field="MATINH_CU_TRU" options={provinceOptions} placeholder="Chọn Tỉnh/TP" width="w-44" />
              <span>phường/ xã:</span>
              <DotSelect field="MAXA_CU_TRU" options={communeOptions} placeholder="Chọn Phường/Xã" width="w-44" />
              <span>số nhà/ thôn/ xóm:</span>
              <DotInput field="DIA_CHI" placeholder="Số nhà, thôn, xóm..." width="w-52" />
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <div>
                11. Họ tên người đi cùng trẻ/ Người giám hộ (đối với trẻ ≤16 tuổi):{' '}
                <DotInput field="NGUOI_GIAM_HO" placeholder="Họ tên bố/mẹ/người giám hộ" width="w-60" />
              </div>
              <div>
                CCCD NGH: <DotInput field="SO_CCCD_NGH" placeholder="CCCD NGH" width="w-32" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2">12. Mối quan hệ với trẻ:</span>
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="1" label="Cha" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="2" label="Mẹ" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="3" label="Ông/bà" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="4" label="Anh/chị" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="5" label="Họ hàng" />
              <PaperCheck field="MOI_QUAN_HE_VOI_TRE" targetValue="9" label="Khác" />
            </div>

            <div>
              13. Lý do khám sức khỏe: <DotInput field="LY_DO_VV" placeholder="Khám sức khỏe định kỳ" width="w-96" />
            </div>

            {/* TIỀN SỬ BỆNH TẬT (MẪU 02) */}
            <div className="font-bold uppercase pt-3 border-t border-slate-200">TIỀN SỬ BỆNH TẬT</div>
            <div className="font-bold">1. Tiền sử gia đình</div>
            <div>Có ai trong gia đình mắc các bệnh bẩm sinh hoặc bệnh truyền nhiễm không:</div>
            <div>
              a) <PaperCheck field="TSGD_MAC_BENH" targetValue="0" label="Không" /> &nbsp;&nbsp; b){' '}
              <PaperCheck field="TSGD_MAC_BENH" targetValue="1" label="Có" />; Nếu “có”, đề nghị ghi cụ thể tên bệnh:{' '}
              <DotInput field="TSGD_MA_BENH" placeholder="Tên/mã bệnh ICD-10" width="w-64" />
            </div>

            <div className="font-bold pt-1">2. Tiền sử bản thân:</div>
            <div className="font-bold">a) Sản khoa:</div>
            <div>
              <PaperCheck field="SAN_KHOA" targetValue="1" label="Bình thường." />
            </div>
            <div>
              <PaperCheck field="SAN_KHOA" targetValue="0" label="Không bình thường:" />
              <DotSelect field="SAN_KHOA_KHONG_BT" options={OPT_SAN_KHOA_KHONG_BT} placeholder="Chọn tình trạng sản khoa" width="w-56" />
              &nbsp; Ghi rõ tên bệnh (nếu có):{' '}
              <DotInput field="MA_BENH_SAN_KHOA_KHONG_BT" placeholder="Mã bệnh ICD-10" width="w-48" />
            </div>

            <div className="font-bold pt-1">b) Tiêm chủng:</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1 text-center w-[8%]" rowSpan={2}>
                    STT
                  </th>
                  <th className="border border-black p-1 text-center w-[50%]" rowSpan={2}>
                    Loại vắc xin
                  </th>
                  <th className="border border-black p-1 text-center" colSpan={3}>
                    Tình trạng tiêm/uống vắc xin
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1 text-center w-[14%]">Có</th>
                  <th className="border border-black p-1 text-center w-[14%]">Không</th>
                  <th className="border border-black p-1 text-center w-[14%]">Không nhớ rõ</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['1', 'BCG', 'TIEM_CHUNG_BCG'],
                    ['2', 'Bạch hầu, ho gà, uốn ván', 'TIEM_CHUNG_BH_HG_UV'],
                    ['3', 'Sởi', 'TIEM_CHUNG_SOI'],
                    ['4', 'Bại liệt', 'TIEM_CHUNG_BAI_LIET'],
                    ['5', 'Viêm não Nhật Bản B', 'TIEM_CHUNG_VNNB_B'],
                    ['6', 'Viêm gan B', 'TIEM_CHUNG_VGB'],
                    ['7', 'Các loại khác', 'TIEM_CHUNG_CAC_LOAI_KHAC'],
                  ] as const
                ).map(([stt, label, key]) => (
                  <tr key={key}>
                    <td className="border border-black p-1 text-center">{stt}</td>
                    <td className="border border-black p-1">
                      {label}
                      {key === 'TIEM_CHUNG_CAC_LOAI_KHAC' && (
                        <span className="ml-2">
                          (<DotInput field="TIEM_CHUNG_VAC_XIN_KHAC" placeholder="Tên vắc xin khác" width="w-44" />)
                        </span>
                      )}
                    </td>
                    <td className="border border-black p-1 text-center">
                      <PaperCheck field={key} targetValue="1" />
                    </td>
                    <td className="border border-black p-1 text-center">
                      <PaperCheck field={key} targetValue="0" />
                    </td>
                    <td className="border border-black p-1 text-center">
                      <PaperCheck field={key} targetValue="99" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="font-bold pt-1">c) Tiền sử bệnh/tật: (Các bệnh bẩm sinh và mãn tính)</div>
            <div>
              <PaperCheck field="TSBT_MAC_BENH" targetValue="0" label="Không" />
              <PaperCheck field="TSBT_MAC_BENH" targetValue="1" label="Có" />
              Nếu “có”: ghi cụ thể tên bệnh: <DotInput field="TSBT_MA_BENH" placeholder="Mã bệnh ICD-10" width="w-64" />
            </div>

            <div className="font-bold pt-1">d) Hiện tại có đang điều trị bệnh gì không?</div>
            <div>
              <PaperCheck field="TSBT_DANG_DIEU_TRI_BENH" targetValue="0" label="Không" />
              <PaperCheck field="TSBT_DANG_DIEU_TRI_BENH" targetValue="1" label="Có" />
              Nếu có, ghi rõ tên bệnh và liệt kê các thuốc đang dùng:{' '}
              <DotInput field="BENH_DANG_DIEU_TRI" placeholder="Tên bệnh, thuốc đang dùng..." width="w-64" />
            </div>

            {/* I. KHÁM THỂ LỰC (MẪU 02) */}
            <div className="font-bold uppercase pt-3 border-t border-slate-200">I. KHÁM THỂ LỰC</div>
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                - Chiều cao: <DotInput field="CHIEU_CAO" placeholder="155" width="w-20" /> cm;
              </div>
              <div>
                - Cân nặng: <DotInput field="CAN_NANG" placeholder="45" width="w-20" /> Kg;
              </div>
              <div>
                - Chỉ số BMI: <DotInput field="CHI_SO_BMI" placeholder="18.7" width="w-20" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                - Mạch: <DotInput field="MACH" placeholder="80" width="w-20" /> lần/phút;
              </div>
              <div>
                - Huyết áp: <DotInput field="HUYET_AP" placeholder="110/70" width="w-24" /> mmHg;
              </div>
              <div>
                - Phân loại thể lực: <DotSelect field="KHAM_THE_LUC_PL" options={OPT_PHAN_LOAI} width="w-44" />
              </div>
            </div>

            {/* II. KHÁM LÂM SÀNG (MẪU 02) */}
            <div className="font-bold uppercase pt-3">II. KHÁM LÂM SÀNG</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[74%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[26%]">Họ tên và chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">1. Nhi khoa</div>
                    <div>
                      a) Tuần hoàn: <DotInput field="NHI_KHOA_TUAN_HOAN" placeholder="Bình thường" width="w-80" />
                    </div>
                    <div>
                      b) Hô hấp: <DotInput field="NHI_KHOA_HO_HAP" placeholder="Bình thường" width="w-80" />
                    </div>
                    <div>
                      c) Tiêu hóa: <DotInput field="NHI_KHOA_TIEU_HOA" placeholder="Bình thường" width="w-80" />
                    </div>
                    <div>
                      d) Thận-Tiết niệu, Sinh dục: <DotInput field="NHI_KHOA_THAN_TN_SD" placeholder="Bình thường" width="w-64" />
                    </div>
                    <div>
                      đ) Thần kinh: <DotInput field="NHI_KHOA_THAN_KINH" placeholder="Bình thường" width="w-80" />
                    </div>
                    <div>
                      e) Tâm thần: <DotInput field="NHI_KHOA_TAM_THAN" placeholder="Bình thường" width="w-80" />
                    </div>
                    <div>
                      g) Khám lâm sàng khác: <DotInput field="NHI_KHOA_LAM_SANG_KHAC" placeholder="Bình thường" width="w-72" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_NHI_KHOA_TUAN_HOAN" label="Nhi khoa" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">2. Mắt:</div>
                    <div>
                      - Kết quả khám thị lực: Không kính: Mắt phải{' '}
                      <DotSelect field="KHONG_KINH_MAT_PHAI" options={OPT_THI_LUC} placeholder="10/10" width="w-20" />
                      &nbsp; Mắt trái{' '}
                      <DotSelect field="KHONG_KINH_MAT_TRAI" options={OPT_THI_LUC} placeholder="10/10" width="w-20" />
                    </div>
                    <div className="pl-36">
                      Có kính: &nbsp;&nbsp;&nbsp;&nbsp; Mắt phải{' '}
                      <DotSelect field="CO_KINH_MAT_PHAI" options={OPT_THI_LUC} placeholder="--" width="w-20" />
                      &nbsp; Mắt trái{' '}
                      <DotSelect field="CO_KINH_MAT_TRAI" options={OPT_THI_LUC} placeholder="--" width="w-20" />
                    </div>
                    <div>
                      - Các bệnh về mắt (nếu có): <DotInput field="BENH_KHAC_MAT" placeholder="Không" width="w-80" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_MAT" label="Mắt" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">3. Tai - Mũi - Họng</div>
                    <div>- Kết quả khám thính lực:</div>
                    <div className="pl-4">
                      Tai trái: Nói thường <DotInput field="TAI_TRAI_NOI_THUONG" placeholder="5" width="w-16" /> m; &nbsp; Nói thầm{' '}
                      <DotInput field="TAI_TRAI_NOI_THAM" placeholder="0.5" width="w-16" /> m
                    </div>
                    <div className="pl-4">
                      Tai phải: Nói thường <DotInput field="TAI_PHAI_NOI_THUONG" placeholder="5" width="w-16" /> m; &nbsp; Nói thầm{' '}
                      <DotInput field="TAI_PHAI_NOI_THAM" placeholder="0.5" width="w-16" /> m
                    </div>
                    <div>
                      - Các bệnh về tai mũi họng (nếu có):{' '}
                      <DotInput field="BENH_KHAC_TAI_MUI_HONG" placeholder="Không" width="w-72" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_TAI_MUI_HONG" label="Tai - Mũi - Họng" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">4. Răng - Hàm - Mặt</div>
                    <div>
                      - Kết quả khám: &nbsp; Hàm trên: <DotInput field="HAM_TREN" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div className="pl-28">
                      Hàm dưới: <DotInput field="HAM_DUOI" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div>
                      - Các bệnh về răng hàm mặt (nếu có):{' '}
                      <DotInput field="BENH_KHAC_RANG_HAM_MAT" placeholder="Không" width="w-72" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_RANG_HAM_MAT" label="Răng - Hàm - Mặt" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* III. KHÁM CẬN LÂM SÀNG (MẪU 02) */}
            <div className="font-bold uppercase pt-3">III. KHÁM CẬN LÂM SÀNG</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[74%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[26%]">Họ tên, chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div>Cận lâm sàng thực hiện theo chỉ định của bác sỹ:</div>
                    <div>
                      Kết quả:{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_DINH_KY_KET_QUA}
                        onChange={e => handlePaperClsChange('CLS_DINH_KY_KET_QUA', e.target.value)}
                        placeholder="Nhập kết quả cận lâm sàng..."
                        className="w-96 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                    <PaperClsDvktInlineBox
                      clsList={Array.isArray(formData.CLS) ? formData.CLS : []}
                      presets={QUICK_CLS_PRESETS}
                      onAdd={handleAddClsDvkt}
                      onUpdate={handleUpdateClsRow}
                      onRemove={handleRemoveClsRow}
                    />
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_CLS" label="Cận lâm sàng" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* IV. KẾT LUẬN CHUNG (MẪU 02) */}
            <div className="font-bold uppercase pt-3">IV. KẾT LUẬN CHUNG:</div>
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              <PaperCheck field="BINH_THUONG" targetValue="1" toggleOffValue="0" label="Sức khỏe bình thường" />
              <PaperCheck field="NGUY_CO_MAC_LAO" targetValue="1" toggleOffValue="0" label="Có nguy cơ mắc lao" />
              <PaperCheck field="VAN_DE_SUC_KHOE" targetValue="1" toggleOffValue="0" label="Có vấn đề sức khỏe" />
            </div>
            <div>
              Tình trạng sức khỏe; mắc các bệnh, tật (nếu có):{' '}
              <DotInput field="CAC_VAN_DE_SUC_KHOE" placeholder="Sức khỏe bình thường" width="w-72" />
              &nbsp; Mã ICD-10: <DotInput field="KET_LUAN_BENH" placeholder="VD: Z00.0" width="w-36" />
            </div>
            <div>
              Phân loại sức khỏe (theo quy định của Bộ Y tế):{' '}
              <DotSelect field="PHAN_LOAI_SK" options={OPT_PHAN_LOAI} width="w-56" />
            </div>
          </div>
        )}

        {/* =====================================================================
            MẪU SỐ 03: TỪ ĐỦ 18 TUỔI TRỞ LÊN (Adult)
           ===================================================================== */}
        {type === 'Adult' && (
          <div className="space-y-2">
            <div className="text-center font-bold text-[17px]">Mẫu số 03</div>
            <div className="text-center italic text-[15px] mb-3">
              Giấy khám sức khỏe và khám sức khỏe định kỳ dùng cho người từ đủ 18 tuổi trở lên
            </div>

            <div className="grid grid-cols-12 gap-2 text-center mb-4">
              <div className="col-span-5">
                <div className="font-bold">
                  CƠ SỞ KCB: <DotInput field="MA_CSKCB" placeholder="Mã CSKCB" width="w-28" bold />
                </div>
                <div>-------</div>
                <div className="mt-1">
                  Số: <DotInput field="MA_LK" placeholder="......" width="w-28" />
                  /GKSK
                </div>
              </div>
              <div className="col-span-7">
                <div className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-bold">Độc lập - Tự do - Hạnh phúc</div>
                <div>---------------</div>
              </div>
            </div>

            <div className="text-center font-bold text-[18px] uppercase my-4">
              GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHỎE ĐỊNH KỲ DÙNG CHO NGƯỜI TỪ ĐỦ 18 TUỔI TRỞ LÊN
            </div>

            <div>
              1. Họ và tên (viết chữ in hoa):{' '}
              <DotInput field="HO_TEN" placeholder="NHẬP HỌ VÀ TÊN (IN HOA)" width="w-80" uppercase bold />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                2. Giới tính: <PaperCheck field="GIOI_TINH" targetValue="1" label="Nam" />
                <PaperCheck field="GIOI_TINH" targetValue="2" label="Nữ" />
              </div>
              <div>
                3. Ngày tháng năm sinh:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAY_SINH)}
                  onChange={e => onChange('NGAY_SINH', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />{' '}
                (Tuổi: <span className="font-bold px-2 border-b border-dotted border-slate-700">{age ?? '...'}</span>)
              </div>
            </div>

            <div>
              4. Số CCCD/Hộ chiếu/Mã định danh: <DotInput field="SO_CCCD" placeholder="12 chữ số CCCD" width="w-64" />
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                5. Cấp ngày:{' '}
                <input
                  type="date"
                  value={toDateInput(formData.NGAYCAP_CCCD)}
                  onChange={e => onChange('NGAYCAP_CCCD', e.target.value)}
                  className="border-b border-dotted border-slate-700 bg-amber-50/30 px-1 text-[15px] outline-none"
                />
              </div>
              <div>
                Nơi cấp: <DotInput field="NOICAP_CCCD" placeholder="Cục Cảnh sát QLHC về TTXH" width="w-64" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                6. Dân tộc: <DotSelect field="MA_DAN_TOC" options={danTocOptions} width="w-40" />
              </div>
              <div>
                7. Đối tượng: <DotSelect field="DOI_TUONG" options={OPT_DOI_TUONG} width="w-64" />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                8. Nguồn chi trả: <DotSelect field="NGUON_CHI_TRA" options={OPT_NGUON_CHI_TRA} width="w-56" />
              </div>
              <div>
                9. Nhóm máu: <DotSelect field="NHOM_MAU" options={OPT_NHOM_MAU} placeholder="Chọn" width="w-24" /> (nếu có)
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span>10. Nơi ở hiện tại: Tỉnh/ thành:</span>
              <DotSelect field="MATINH_CU_TRU" options={provinceOptions} placeholder="Chọn Tỉnh/TP" width="w-44" />
              <span>phường/ xã:</span>
              <DotSelect field="MAXA_CU_TRU" options={communeOptions} placeholder="Chọn Phường/Xã" width="w-44" />
              <span>số nhà/ thôn/ xóm:</span>
              <DotInput field="DIA_CHI" placeholder="Số nhà, thôn, xóm..." width="w-52" />
            </div>

            <div>
              11. Nghề nghiệp: <DotSelect field="MA_NGHE_NGHIEP" options={OPT_NGHE_NGHIEP} width="w-96" />
            </div>

            <div>
              12. Nơi làm việc, học tập: <DotInput field="NOI_LAM_VIEC_HOC_TAP" placeholder="Cơ quan, công ty, trường học..." width="w-96" />
            </div>

            <div>
              13. Lý do khám sức khỏe: <DotInput field="LY_DO_VV" placeholder="Khám sức khỏe định kỳ" width="w-96" />
            </div>

            {/* TIỀN SỬ BỆNH CỦA ĐỐI TƯỢNG KHÁM SỨC KHỎE (MẪU 03) */}
            <div className="font-bold uppercase pt-3 border-t border-slate-200">
              TIỀN SỬ BỆNH CỦA ĐỐI TƯỢNG KHÁM SỨC KHỎE
            </div>
            <div className="font-bold">1. Tiền sử gia đình:</div>
            <div>
              Có ai trong gia đình ông (bà) mắc một trong các bệnh: truyền nhiễm, tim mạch, đái tháo đường, lao, hen phế quản, ung thư, động kinh, rối loạn tâm thần, bệnh khác:
            </div>
            <div>
              a) <PaperCheck field="TSGD_MAC_BENH" targetValue="0" label="Không" /> &nbsp;&nbsp; b){' '}
              <PaperCheck field="TSGD_MAC_BENH" targetValue="1" label="Có" />; Nếu “có”, đề nghị ghi cụ thể tên bệnh:{' '}
              <DotInput field="TSGD_MA_BENH" placeholder="Mã bệnh ICD-10 (cách nhau dấu ;)" width="w-64" />
            </div>

            <div className="font-bold pt-1">
              2. Tiền sử bản thân: <span className="font-normal">Ông (bà) đã/đang mắc bệnh, tình trạng bệnh nào sau đây không:</span>
            </div>
            <table className="w-full border-collapse border border-black text-[14px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1 text-center w-[5%]">TT</th>
                  <th className="border border-black p-1 text-center w-[33%]">Tên bệnh, tật</th>
                  <th className="border border-black p-1 text-center w-[6%]">Có</th>
                  <th className="border border-black p-1 text-center w-[6%]">Không</th>
                  <th className="border border-black p-1 text-center w-[5%]">STT</th>
                  <th className="border border-black p-1 text-center w-[33%]">Tên bệnh, tật</th>
                  <th className="border border-black p-1 text-center w-[6%]">Có</th>
                  <th className="border border-black p-1 text-center w-[6%]">Không</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 11 }, (_, i) => {
                  const [leftKey, leftLabel] = ADULT_TSBT[i];
                  const [rightKey, rightLabel] = ADULT_TSBT[i + 11];
                  return (
                    <tr key={leftKey}>
                      <td className="border border-black p-1 text-center">{i + 1}</td>
                      <td className="border border-black p-1">{leftLabel}</td>
                      <td className="border border-black p-1 text-center">
                        <PaperCheck field={leftKey} targetValue="1" />
                      </td>
                      <td className="border border-black p-1 text-center">
                        <PaperCheck field={leftKey} targetValue="0" />
                      </td>
                      <td className="border border-black p-1 text-center">{i + 12}</td>
                      <td className="border border-black p-1">
                        {rightLabel}
                        {i + 11 === 21 && (
                          <div className="mt-0.5">
                            (ghi rõ): <DotInput field="TSBT_MA_BENH_KHAC" placeholder="Tên bệnh khác" width="w-36" />
                          </div>
                        )}
                      </td>
                      <td className="border border-black p-1 text-center">
                        <PaperCheck field={rightKey} targetValue="1" />
                      </td>
                      <td className="border border-black p-1 text-center">
                        <PaperCheck field={rightKey} targetValue="0" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="font-bold pt-1">3. Câu hỏi khác (nếu có):</div>
            <div>a) Ông (bà) có đang điều trị bệnh gì không?</div>
            <div className="pl-2">
              <PaperCheck field="TSBT_DANG_DIEU_TRI_BENH" targetValue="0" label="Không" />
              <PaperCheck field="TSBT_DANG_DIEU_TRI_BENH" targetValue="1" label="Có" />
              (Nếu có, xin hãy liệt kê tên bệnh, các thuốc đang dùng và liều lượng): Mã ICD-10:{' '}
              <DotInput field="TSBT_MA_BENH" placeholder="VD: I10" width="w-28" /> &nbsp; Thuốc & liều lượng:{' '}
              <DotInput field="TSBT_TEN_THUOC_LIEU_LUONG" placeholder="Tên thuốc, liều lượng..." width="w-56" />
            </div>

            <div>b) Tiền sử thai sản (Đối với phụ nữ):</div>
            <div className="pl-2">
              <PaperCheck field="TSBT_THAI_SAN" targetValue="0" label="Không" />
              <PaperCheck field="TSBT_THAI_SAN" targetValue="1" label="Có" />
              (Nếu có, xin hãy liệt kê tên bệnh, các thuốc đang dùng và liều lượng): Mã ICD-10:{' '}
              <DotInput field="TSBT_MA_BENH_THAI_SAN" placeholder="Mã ICD-10" width="w-28" /> &nbsp; Thuốc:{' '}
              <DotInput field="TSBT_TEN_THUOC_THAI_SAN" placeholder="Thuốc điều trị..." width="w-56" />
            </div>

            {/* I. KHÁM THỂ LỰC (MẪU 03) */}
            <div className="font-bold uppercase pt-3 border-t border-slate-200">I. KHÁM THỂ LỰC</div>
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                - Chiều cao: <DotInput field="CHIEU_CAO" placeholder="165" width="w-20" /> cm;
              </div>
              <div>
                - Cân nặng: <DotInput field="CAN_NANG" placeholder="60" width="w-20" /> kg;
              </div>
              <div>
                - Chỉ số BMI: <DotInput field="CHI_SO_BMI" placeholder="22.0" width="w-20" />
              </div>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                - Mạch: <DotInput field="MACH" placeholder="76" width="w-20" /> lần/phút;
              </div>
              <div>
                - Huyết áp: <DotInput field="HUYET_AP" placeholder="120/80" width="w-24" /> mmHg
              </div>
            </div>
            <div>
              - Phân loại thể lực: <DotSelect field="KHAM_THE_LUC_PL" options={OPT_PHAN_LOAI} width="w-48" />
            </div>

            {/* II. KHÁM LÂM SÀNG (MẪU 03) */}
            <div className="font-bold uppercase pt-3">II. KHÁM LÂM SÀNG</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[74%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[26%]">Họ tên và chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1.5">
                    <div className="font-bold">1. Nội khoa</div>
                    {(
                      [
                        ['a) Tuần hoàn', 'NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_TUAN_HOAN_PL'],
                        ['b) Hô hấp', 'NOI_KHOA_HO_HAP', 'NOI_KHOA_HO_HAP_PL'],
                        ['c) Tiêu hóa', 'NOI_KHOA_TIEU_HOA', 'NOI_KHOA_TIEU_HOA_PL'],
                        ['d) Thận-Tiết niệu-Sinh dục', 'NOI_KHOA_THAN_TN_SD', 'NOI_KHOA_THAN_TN_SD_PL'],
                        ['đ) Nội tiết', 'NOI_KHOA_NOI_TIET', 'NOI_KHOA_NOI_TIET_PL'],
                        ['e) Cơ - xương - khớp', 'NOI_KHOA_CO_XUONG_KHOP', 'NOI_KHOA_CO_XUONG_KHOP_PL'],
                        ['g) Thần kinh', 'NOI_KHOA_THAN_KINH', 'NOI_KHOA_THAN_KINH_PL'],
                        ['h) Tâm thần', 'NOI_KHOA_TAM_THAN', 'NOI_KHOA_TAM_THAN_PL'],
                      ] as const
                    ).map(([label, kqKey, plKey]) => (
                      <div key={kqKey} className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          {label}: <DotInput field={kqKey} placeholder="Bình thường" width="w-52" />
                        </div>
                        <div>
                          Phân loại: <DotSelect field={plKey} options={OPT_PHAN_LOAI} width="w-36" />
                        </div>
                      </div>
                    ))}
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_NOI_KHOA_TUAN_HOAN" label="Nội khoa" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div>
                      <b>2. Ngoại khoa:</b> <DotInput field="KET_QUA_KHAM_NGOAI_KHOA" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div>
                      Phân loại: <DotSelect field="KHAM_NGOAI_KHOA_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_NGOAI_KHOA" label="Ngoại khoa" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div>
                      <b>3. Da liễu:</b> <DotInput field="KET_QUA_KHAM_DA_LIEU" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div>
                      Phân loại: <DotSelect field="KHAM_DA_LIEU_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_DA_LIEU" label="Da liễu" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div>
                      <b>4. Sản phụ khoa:</b> <DotInput field="KET_QUA_KHAM_SAN_PHU_KHOA" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div>
                      Phân loại: <DotSelect field="KHAM_SAN_PHU_KHOA_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_SAN_PHU_KHOA" label="Sản phụ khoa" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">5. Mắt:</div>
                    <div>
                      - Kết quả khám thị lực: Không kính: Mắt phải{' '}
                      <DotSelect field="KHONG_KINH_MAT_PHAI" options={OPT_THI_LUC} placeholder="10/10" width="w-20" />
                      &nbsp; Mắt trái{' '}
                      <DotSelect field="KHONG_KINH_MAT_TRAI" options={OPT_THI_LUC} placeholder="10/10" width="w-20" />
                    </div>
                    <div className="pl-36">
                      Có kính: &nbsp;&nbsp;&nbsp;&nbsp; Mắt phải{' '}
                      <DotSelect field="CO_KINH_MAT_PHAI" options={OPT_THI_LUC} placeholder="--" width="w-20" />
                      &nbsp; Mắt trái{' '}
                      <DotSelect field="CO_KINH_MAT_TRAI" options={OPT_THI_LUC} placeholder="--" width="w-20" />
                    </div>
                    <div>
                      - Các bệnh về mắt (nếu có): <DotInput field="BENH_KHAC_MAT" placeholder="Không" width="w-72" />
                    </div>
                    <div>
                      - Phân loại: <DotSelect field="KHAM_MAT_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_MAT" label="Mắt" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">6. Tai - Mũi - Họng</div>
                    <div>- Kết quả khám thính lực:</div>
                    <div className="pl-4">
                      Tai trái: Nói thường <DotInput field="TAI_TRAI_NOI_THUONG" placeholder="5" width="w-16" /> m; &nbsp; Nói thầm{' '}
                      <DotInput field="TAI_TRAI_NOI_THAM" placeholder="0.5" width="w-16" /> m
                    </div>
                    <div className="pl-4">
                      Tai phải: Nói thường <DotInput field="TAI_PHAI_NOI_THUONG" placeholder="5" width="w-16" /> m; &nbsp; Nói thầm{' '}
                      <DotInput field="TAI_PHAI_NOI_THAM" placeholder="0.5" width="w-16" /> m
                    </div>
                    <div>
                      - Các bệnh về tai mũi họng (nếu có): <DotInput field="BENH_TAI_MUI_HONG" placeholder="Không" width="w-64" />
                    </div>
                    <div>
                      - Phân loại: <DotSelect field="KHAM_TAI_MUI_HONG_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_TAI_MUI_HONG" label="Tai - Mũi - Họng" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">7. Răng - Hàm - Mặt</div>
                    <div>
                      - Kết quả khám: &nbsp; Hàm trên: <DotInput field="HAM_TREN" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div className="pl-28">
                      Hàm dưới: <DotInput field="HAM_DUOI" placeholder="Bình thường" width="w-72" />
                    </div>
                    <div>
                      - Các bệnh về răng hàm mặt (nếu có): <DotInput field="BENH_RANG_HAM_MAT" placeholder="Không" width="w-64" />
                    </div>
                    <div>
                      - Phân loại: <DotSelect field="KHAM_RANG_HAM_MAT_PL" options={OPT_PHAN_LOAI} width="w-44" />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_KHAM_RANG_HAM_MAT" label="Răng - Hàm - Mặt" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* III. KHÁM CẬN LÂM SÀNG (MẪU 03) */}
            <div className="font-bold uppercase pt-3">III. KHÁM CẬN LÂM SÀNG</div>
            <div className="font-bold">1. Khám phân loại sức khỏe để đi học, đi làm thực hiện khám cận lâm sàng sau:</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[74%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[26%]">Họ tên, chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="font-bold">a) Xét nghiệm máu:</div>
                    <div>
                      - Huyết học: tổng phân tích tế bào máu ngoại vi:{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_HUYET_HOC}
                        onChange={e => handlePaperClsChange('CLS_HUYET_HOC', e.target.value)}
                        placeholder="Bình thường"
                        className="w-56 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                    <div>
                      - Sinh hóa máu: Đường máu:{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_DUONG_MAU}
                        onChange={e => handlePaperClsChange('CLS_DUONG_MAU', e.target.value)}
                        placeholder="VD: 5.2 mmol/L"
                        className="w-48 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                    <div className="pl-24 flex flex-wrap gap-4">
                      <div>
                        Urê:{' '}
                        <input
                          type="text"
                          value={paperCls.CLS_URE}
                          onChange={e => handlePaperClsChange('CLS_URE', e.target.value)}
                          placeholder="VD: 4.8 mmol/L"
                          className="w-32 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                        />
                      </div>
                      <div>
                        Creatinin:{' '}
                        <input
                          type="text"
                          value={paperCls.CLS_CREATININ}
                          onChange={e => handlePaperClsChange('CLS_CREATININ', e.target.value)}
                          placeholder="VD: 78 µmol/L"
                          className="w-32 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                        />
                      </div>
                    </div>
                    <div className="pl-24 flex flex-wrap gap-4">
                      <div>
                        ASAT(GOT):{' '}
                        <input
                          type="text"
                          value={paperCls.CLS_GOT}
                          onChange={e => handlePaperClsChange('CLS_GOT', e.target.value)}
                          placeholder="VD: 24 U/L"
                          className="w-32 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                        />
                      </div>
                      <div>
                        ALAT (GPT):{' '}
                        <input
                          type="text"
                          value={paperCls.CLS_GPT}
                          onChange={e => handlePaperClsChange('CLS_GPT', e.target.value)}
                          placeholder="VD: 26 U/L"
                          className="w-32 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                        />
                      </div>
                    </div>

                    <div className="font-bold pt-1">b) Xét nghiệm nước tiểu:</div>
                    <div>
                      - Tổng phân tích nước tiểu (bằng máy tự động):{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_NUOC_TIEU}
                        onChange={e => handlePaperClsChange('CLS_NUOC_TIEU', e.target.value)}
                        placeholder="Bình thường"
                        className="w-48 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                    <div>
                      - Khác (nếu có):{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_NUOC_TIEU_KHAC}
                        onChange={e => handlePaperClsChange('CLS_NUOC_TIEU_KHAC', e.target.value)}
                        placeholder="......................."
                        className="w-72 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_CLS_XET_NGHIEM" label="Xét nghiệm (Máu & Nước tiểu)" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2">
                    <b>c) Chẩn đoán hình ảnh (XQ tim phổi thẳng):</b>{' '}
                    <input
                      type="text"
                      value={paperCls.CLS_XQUANG}
                      onChange={e => handlePaperClsChange('CLS_XQUANG', e.target.value)}
                      placeholder="Tim phổi bình thường"
                      className="w-72 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                    />
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_CLS_XQUANG" label="Chẩn đoán hình ảnh (X-Quang)" />
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold">d) Kết quả khám Cận lâm sàng khác</div>
                      <button
                        type="button"
                        onClick={() => handleAddClsDvkt()}
                        className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-sans font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Tự thêm DVKT Cận lâm sàng
                      </button>
                    </div>
                    <div>
                      <PaperCheck field="HAS_CLS" targetValue="0" label="Không" />
                      <PaperCheck field="HAS_CLS" targetValue="1" label="Có" />
                      (Nếu có, hãy liệt kê kết quả chi tiết):{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_KHAC_CHI_TIET}
                        onChange={e => handlePaperClsChange('CLS_KHAC_CHI_TIET', e.target.value)}
                        placeholder="Kết quả cận lâm sàng..."
                        className="w-64 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                    <PaperClsDvktInlineBox
                      clsList={Array.isArray(formData.CLS) ? formData.CLS : []}
                      presets={QUICK_CLS_PRESETS}
                      onAdd={handleAddClsDvkt}
                      onUpdate={handleUpdateClsRow}
                      onRemove={handleRemoveClsRow}
                    />
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_CLS_KHAC" label="Cận lâm sàng khác" />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="font-bold pt-2">2. Khám sức khỏe định kỳ (cận lâm sàng thực hiện theo chỉ định của bác sỹ)</div>
            <table className="w-full border-collapse border border-black text-[15px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-black p-1.5 text-center w-[74%]">Nội dung khám</th>
                  <th className="border border-black p-1.5 text-center w-[26%]">Họ tên, chữ ký của Bác sỹ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>Cận lâm sàng thực hiện theo chỉ định của bác sỹ</div>
                      <button
                        type="button"
                        onClick={() => handleAddClsDvkt()}
                        className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-sans font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Thêm DVKT định kỳ
                      </button>
                    </div>
                    <div>
                      Kết quả:{' '}
                      <input
                        type="text"
                        value={paperCls.CLS_DINH_KY_KET_QUA}
                        onChange={e => handlePaperClsChange('CLS_DINH_KY_KET_QUA', e.target.value)}
                        placeholder="Nhập hoặc tự động tổng hợp từ bảng chỉ số CLS..."
                        className="w-96 border-b border-dotted border-slate-700 bg-amber-50/30 px-1 outline-none"
                      />
                    </div>
                  </td>
                  <td className="border border-black p-1 align-middle">
                    <PaperSigBox field="CKDT_CLS_DINH_KY" label="Cận lâm sàng (Định kỳ)" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* IV. KẾT LUẬN (MẪU 03) */}
            <div className="font-bold uppercase pt-3">IV. KẾT LUẬN</div>
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              <PaperCheck field="BINH_THUONG" targetValue="1" toggleOffValue="0" label="Sức khỏe bình thường" />
              <PaperCheck field="NGUY_CO_MAC_LAO" targetValue="1" toggleOffValue="0" label="Có nguy cơ mắc lao" />
              <PaperCheck field="VAN_DE_SUC_KHOE" targetValue="1" toggleOffValue="0" label="Có vấn đề sức khỏe" />
            </div>
            <div>
              Tình trạng sức khỏe; mắc các bệnh, tật (nếu có):{' '}
              <DotInput field="CAC_VAN_DE_SUC_KHOE" placeholder="Đủ sức khỏe làm việc" width="w-64" />
              &nbsp; Chẩn đoán/ICD-10:{' '}
              <DotInput field="KET_LUAN_BENH" placeholder="Hiện tại chưa phát hiện bệnh lý" width="w-56" />
            </div>
            <div>
              Phân loại sức khỏe (theo quy định của Bộ Y tế):{' '}
              <DotSelect field="PHAN_LOAI_SK" options={OPT_PHAN_LOAI} width="w-56" />
            </div>
          </div>
        )}

        {/* Chữ ký NGƯỜI KẾT LUẬN chung cho cả 3 mẫu */}
        <div className="grid grid-cols-12 pt-6 pb-4">
          <div className="col-span-6"></div>
          <div className="col-span-6 text-center space-y-1">
            <div className="italic">
              <DotInput field="DIA_DANH_KET_LUAN" placeholder="........." width="w-24" /> ngày{' '}
              <DotInput
                field="NGAY_KET_LUAN_DD"
                placeholder={toDateInput(formData.NGAY_VAO)?.slice(8, 10) || '.....'}
                width="w-10"
              />{' '}
              tháng{' '}
              <DotInput
                field="NGAY_KET_LUAN_MM"
                placeholder={toDateInput(formData.NGAY_VAO)?.slice(5, 7) || '.....'}
                width="w-10"
              />{' '}
              năm{' '}
              <DotInput
                field="NGAY_KET_LUAN_YYYY"
                placeholder={toDateInput(formData.NGAY_VAO)?.slice(0, 4) || '202...'}
                width="w-14"
              />
            </div>
            <div className="font-bold uppercase mt-0.5">NGƯỜI KẾT LUẬN</div>
            <div className="italic text-[13.5px]">(Ký, ghi rõ họ tên và đóng dấu)</div>
            <div className="py-1 flex justify-center">
              <PaperSigBox field="CKDT_KET_LUAN" label="Người kết luận" isConclusion={true} />
            </div>
            <div>
              <DotInput field="NGUOI_KET_LUAN" placeholder="Họ và tên Người kết luận..." width="w-56" bold />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* MODAL KÝ SỐ BÁC SĨ CHUYÊN KHOA & NGƯỜI KẾT LUẬN */}
    {signModalState?.isOpen && (
      <KskDoctorSignModal
        state={signModalState}
        type={type}
        formData={formData}
        onClose={() => setSignModalState(null)}
        onApplySingle={handleApplySingleSign}
        onApplyAll={handleApplyAllClinicalSign}
        onOpenConfig={() => setIsConfigModalOpen(true)}
      />
    )}

    {/* MODAL CÀI ĐẶT VNPT SMARTCA NẾU NGƯỜI DÙNG MUỐN THAY ĐỔI CẤU HÌNH */}
    {isConfigModalOpen && (
      <ConfigModal
        initialTab="smartca"
        onClose={() => setIsConfigModalOpen(false)}
      />
    )}
  </KskPaperFormContext.Provider>
  );
}

/** Hộp thoại Ký số Bác sĩ chuyên khoa / Người kết luận */
function KskDoctorSignModal({
  state,
  type,
  formData,
  onClose,
  onApplySingle,
  onApplyAll,
  onOpenConfig,
}: {
  state: {
    isOpen: boolean;
    field: string;
    label: string;
    isConclusion: boolean;
  };
  type: KskType;
  formData: Record<string, any>;
  onClose: () => void;
  onApplySingle: (field: string, badgeSvg: string, signerName?: string) => void;
  onApplyAll: (badgeSvg: string) => void;
  onOpenConfig: () => void;
}) {
  const cfg = getSmartCAConfig();

  // Trích xuất tên mặc định từ SmartCA hoặc formData
  const defaultSigner = React.useMemo(() => {
    if (state.isConclusion) {
      return formData.NGUOI_KET_LUAN || 'Nguyễn Thị Lệ Thủy';
    }
    // Trích xuất tên từ Subject nếu có CN=
    if (cfg.subjectDN) {
      const match = cfg.subjectDN.match(/CN=([^,]+)/i);
      if (match) return match[1].trim();
    }
    return `BS. Khám ${state.label}`;
  }, [state.isConclusion, state.label, formData.NGUOI_KET_LUAN, cfg.subjectDN]);

  const [signerName, setSignerName] = React.useState(defaultSigner);
  const [signerTitle, setSignerTitle] = React.useState(() => {
    if (state.isConclusion) return 'Chủ tịch Hội đồng / Người kết luận';
    if (state.field === 'CKDT_CLS_XET_NGHIEM') return 'Bác sĩ Chuyên khoa Xét nghiệm';
    if (state.field === 'CKDT_CLS_XQUANG') return 'Bác sĩ Chẩn đoán hình ảnh (X-Quang)';
    if (state.field === 'CKDT_CLS_KHAC') return 'Bác sĩ Cận lâm sàng';
    if (state.field === 'CKDT_CLS_DINH_KY') return 'Bác sĩ Cận lâm sàng định kỳ';
    return `Bác sĩ Chuyên khoa ${state.label}`;
  });
  const [stampColor, setStampColor] = React.useState<'red' | 'blue' | 'emerald'>(
    state.isConclusion ? 'red' : 'blue'
  );

  const orgName = React.useMemo(() => {
    if (cfg.subjectDN) {
      const oMatch = cfg.subjectDN.match(/O=([^,]+)/i);
      if (oMatch) return oMatch[1].trim();
      const cnMatch = cfg.subjectDN.match(/CN=([^,]+)/i);
      if (cnMatch) return cnMatch[1].trim();
    }
    return 'PHÒNG KHÁM ĐA KHOA ĐỒNG TÂM SÀI GÒN';
  }, [cfg.subjectDN]);

  // Sinh badge thời gian thực để xem trước
  const previewBadge = React.useMemo(() => {
    return generateSmartCaVisualBadge({
      signerName: signerName.trim() || 'Bác sĩ Khám bệnh',
      title: signerTitle.trim() || 'Chuyên khoa',
      orgName,
      serialNumber: cfg.serialNumber || '4001299742',
      isConclusion: state.isConclusion,
      color: stampColor,
    });
  }, [signerName, signerTitle, orgName, cfg.serialNumber, state.isConclusion, stampColor]);

  const handleSignSingle = () => {
    onApplySingle(state.field, previewBadge, signerName.trim());
    onClose();
  };

  const handleSignAll = () => {
    onApplyAll(previewBadge);
    onClose();
  };

  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onApplySingle(state.field, String(reader.result), signerName.trim());
          onClose();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {state.isConclusion ? 'Ký số & Đóng dấu Người Kết luận' : `Ký số Bác sĩ — ${state.label}`}
              </h3>
              <p className="text-[11px] text-slate-500">
                Xác thực chữ ký số điện tử VNPT SmartCA chuẩn Bộ Y tế
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Trạng thái VNPT SmartCA */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Hệ thống VNPT SmartCA
              </span>
              <button
                type="button"
                onClick={onOpenConfig}
                className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Settings className="w-3 h-3" /> Cấu hình
              </button>
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              <b>Chủ thể:</b> {cfg.subjectDN || 'PHÒNG KHÁM ĐA KHOA ĐỒNG TÂM SÀI GÒN'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              MST/User: <b>{cfg.userId || '4001299742'}</b> • Serial: <b>{cfg.serialNumber ? cfg.serialNumber.slice(-12) : 'Tự động'}</b>
            </div>
          </div>

          {/* Form nhập thông tin */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {state.isConclusion ? 'Họ tên Người kết luận' : 'Họ tên Bác sĩ khám'}:
              </label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="VD: BS. Nguyễn Thị Lệ Thủy"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chức danh / Chuyên khoa:</label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={e => setSignerTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Màu sắc con dấu:</label>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setStampColor('red')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer',
                      stampColor === 'red'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Đỏ (Chuẩn)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStampColor('blue')}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer',
                      stampColor === 'blue'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Xanh
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Xem trước con dấu chữ ký số:</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center min-h-[90px]">
                <img
                  src={previewBadge}
                  alt="Xem trước"
                  className={cn(
                    'object-contain mix-blend-multiply drop-shadow-2xs',
                    state.isConclusion ? 'max-h-[85px]' : 'max-h-[68px]'
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignSingle}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition text-xs"
            >
              <ShieldCheck className="w-4 h-4" /> Ký số vào ô này
            </button>
            <button
              type="button"
              onClick={handleUploadImage}
              className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer text-xs"
              title="Tải ảnh con dấu tròn / chữ ký scan từ máy tính"
            >
              <Upload className="w-3.5 h-3.5" /> Tải ảnh scan
            </button>
          </div>

          {!state.isConclusion && !state.field.startsWith('CKDT_CLS') && (
            <button
              type="button"
              onClick={handleSignAll}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition text-xs"
              title="Tự động gán chữ ký số này cho TẤT CẢ các chuyên khoa khám lâm sàng trong hồ sơ"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Ký số & Áp dụng cho TẤT CẢ chuyên khoa Lâm sàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

