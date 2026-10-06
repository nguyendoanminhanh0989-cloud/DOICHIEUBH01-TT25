/**
 * CHUẨN HÓA & TẠO BẢN GHI KSK
 * -------------------------------------------------------------------------
 * Điểm hội tụ DUY NHẤT của 2 luồng nhập liệu:
 *    Nhập thủ công (form)  ─┐
 *                           ├─> finalizeKskRecord() ─> buildKskXml() ─> ký số ─> đẩy cổng
 *    Import Excel (.xlsm)  ─┘
 * Nhờ vậy cùng một dữ liệu luôn cho ra cùng một file XML.
 */

import type { HoSoRecord } from './signAndSubmitService';
import { buildKskXml } from './kskXmlBuilder';
import { KskType, KskField, getAllFields, KSK_SCHEMAS, calcAgeYears } from './kskSchemas';

export interface KskIssue {
  key?: string;
  msg: string;
  level: 'error' | 'warning';
}

export interface KskClsItem {
  MA_DICH_VU?: string;
  MA_CHI_SO?: string;
  GIA_TRI?: string;
  DON_VI_DO?: string;
  MO_TA?: string;
  KET_LUAN?: string;
}

/** Cột trong file Excel Trên 18 dùng tên khác với thẻ XML chuẩn */
const KEY_ALIASES: Record<string, string> = {
  NGAY_CAP_CCCD: 'NGAYCAP_CCCD',
  NOI_CAP_CCCD: 'NOICAP_CCCD',
  NOI_KHOA_THAN_TIETNIEU_PL: 'NOI_KHOA_THAN_TN_SD_PL',
};

const DATE_KEYS = new Set(['NGAY_VAO', 'NGAY_SINH', 'NGAYCAP_CCCD']);
const DECIMAL_KEYS = ['CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'NHIET_DO', 'CHIEU_DAI', 'VONG_DAU'];

export const normText = (s: string): string =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/* ------------------------------ Ngày tháng ------------------------------ */

function parseDateValue(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number' && String(Math.trunc(val)).length >= 8) val = String(val);

  if (typeof val === 'number') {
    // Số serial của Excel
    const utcDays = Math.floor(val - 25569);
    const base = new Date(utcDays * 86400 * 1000);
    const frac = val - Math.floor(val) + 0.0000001;
    let totalSeconds = Math.floor(86400 * frac);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, seconds);
  }

  const str = String(val).trim();
  let m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}):(\d{2}))?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toYmd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function toYmdHm(d: Date): string {
  return `${toYmd(d)}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/* ------------------------------ Danh mục ------------------------------ */

const ROMAN_TO_PL: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };

function mapOption(field: KskField, val: string): string {
  const opts = field.options;
  if (!opts || opts.length === 0) return val;
  if (opts.some(o => o.value === val)) return val;

  const nv = normText(val);
  if (field.kind === 'yesno') {
    if (['khong', 'no', 'false'].includes(nv)) return '0';
    if (['co', 'yes', 'true'].includes(nv)) return '1';
  }
  if (field.kind === 'phanloai') {
    const r = /loai\s+(iv|v|i{1,3})\b/.exec(nv);
    if (r && ROMAN_TO_PL[r[1]]) return ROMAN_TO_PL[r[1]];
  }
  if (/^\d+\.0+$/.test(val)) {
    const intVal = String(parseInt(val, 10));
    if (opts.some(o => o.value === intVal)) return intVal;
  }
  const hit =
    opts.find(o => normText(o.label) === nv) ||
    (nv.length >= 3 ? opts.find(o => normText(o.label).startsWith(nv) || nv.startsWith(normText(o.label))) : undefined);
  return hit ? hit.value : val;
}

/* ------------------------------ Chuẩn hóa ------------------------------ */

export function finalizeKskRecord(
  raw: Record<string, any>,
  type: KskType
): { data: Record<string, any>; issues: KskIssue[] } {
  const issues: KskIssue[] = [];
  const err = (msg: string, key?: string) => issues.push({ msg, key, level: 'error' });
  const warn = (msg: string, key?: string) => issues.push({ msg, key, level: 'warning' });

  // 1. Làm sạch + đổi tên khóa
  const data: Record<string, any> = {};
  for (const [rawKey, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (rawKey === 'CLS') continue;
    const key = KEY_ALIASES[rawKey] || rawKey;
    if (rawKey !== key && raw[key] !== undefined && raw[key] !== '') continue; // đã có khóa chuẩn
    if (typeof v === 'string' && v.trim() === '') continue;
    data[key] = DATE_KEYS.has(key) ? v : String(v).trim();
  }
  data.TYPE = type;

  // 2. Ánh xạ tên -> mã theo danh mục của schema
  const fields = getAllFields(type);
  for (const f of fields) {
    if (data[f.key] === undefined || !f.options) continue;
    data[f.key] = mapOption(f, String(data[f.key]));
  }

  // 3. Giới tính
  if (data.GIOI_TINH !== undefined) {
    const gt = normText(data.GIOI_TINH);
    if (gt === 'nam' || gt === '1') data.GIOI_TINH = '1';
    else if (gt === 'nu' || gt === '2') data.GIOI_TINH = '2';
    else data.GIOI_TINH = '3';
  }

  // 4. Số thập phân: dấu phẩy -> dấu chấm
  for (const k of DECIMAL_KEYS) {
    if (data[k] !== undefined) data[k] = String(data[k]).replace(',', '.');
  }
  if (data.MA_DAN_TOC !== undefined && normText(data.MA_DAN_TOC) === 'kinh') data.MA_DAN_TOC = '01';

  // 5. Ngày tháng
  const fixDate = (key: string, mode: '8' | '12') => {
    const val = data[key];
    if (val === undefined) return;
    const s = String(val).trim();
    if (mode === '12' && /^\d{12}$/.test(s)) { data[key] = s; return; }
    if (mode === '12' && /^\d{8}$/.test(s)) { data[key] = `${s}0000`; return; }
    if (mode === '8' && /^\d{8}$/.test(s)) { data[key] = s; return; }
    if (mode === '8' && /^\d{12}$/.test(s)) { data[key] = s.slice(0, 8); return; }
    const dObj = parseDateValue(val);
    if (dObj && !isNaN(dObj.getTime())) {
      data[key] = mode === '12' ? toYmdHm(dObj) : toYmd(dObj);
    } else {
      delete data[key];
      err(`Định dạng ${key} không hợp lệ`, key);
    }
  };
  fixDate('NGAY_VAO', '12');
  fixDate('NGAY_SINH', '12'); // theo "sample xml (final).xml": yyyymmddHHMM
  fixDate('NGAYCAP_CCCD', '8');

  // 6. BMI tự tính
  if (data.CHI_SO_BMI === undefined) {
    const h = parseFloat(data.CHIEU_CAO), w = parseFloat(data.CAN_NANG);
    if (h > 0 && w > 0) data.CHI_SO_BMI = (w / Math.pow(h / 100, 2)).toFixed(2);
  }

  // 7. Mã liên kết
  if (data.MA_LK === undefined && data.NGAY_VAO) {
    const tail = String(data.SO_CCCD || data.SO_CCCD_NGUOI_DI_CUNG || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    data.MA_LK = `${data.MA_CSKCB || ''}${data.NGAY_VAO}${tail}`;
  }

  // 8. Cận lâm sàng (XML11)
  if (Array.isArray(raw.CLS)) {
    const cls: KskClsItem[] = (raw.CLS as KskClsItem[])
      .map(c => {
        const o: KskClsItem = {};
        (['MA_DICH_VU', 'MA_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN'] as const).forEach(k => {
          const v = c?.[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') o[k] = String(v).trim();
        });
        return o;
      })
      .filter(o => o.GIA_TRI || o.MO_TA || o.KET_LUAN);
    if (cls.length > 0) data.CLS = cls;
  }

  // 9. Kiểm tra
  for (const f of fields) {
    if (f.required && (data[f.key] === undefined || data[f.key] === '')) {
      err(`Thiếu ${f.label}`, f.key);
    }
  }
  if (data.MA_GTIN_CSKCB && !/^\d{13}$/.test(data.MA_GTIN_CSKCB)) {
    err('Mã GLN cơ sở KCB phải gồm 13 chữ số', 'MA_GTIN_CSKCB');
  }
  if (data.MA_CSKCB && !/^\d{5}$/.test(data.MA_CSKCB)) {
    warn('Mã cơ sở KCB nên gồm 5 ký tự số', 'MA_CSKCB');
  }
  if (data.SO_CCCD && !/^(\d{9}|\d{12})$/.test(data.SO_CCCD)) {
    warn('Số CMND/CCCD nên gồm 9 hoặc 12 chữ số', 'SO_CCCD');
  }
  if (data.NGAY_SINH) {
    const age = calcAgeYears(data.NGAY_SINH, parseDateValue(data.NGAY_VAO) || new Date());
    if (age !== null) {
      const ok = type === 'ChildUnder' ? age < 6 : type === 'Minor' ? age >= 6 && age < 18 : age >= 18;
      if (!ok) warn(`Tuổi ${age} không phù hợp mẫu "${KSK_SCHEMAS[type].title}"`, 'NGAY_SINH');
    }
  }
  const the = String(data.MA_THE_BHYT || data.MA_THE || '').trim();
  if (the && the.length !== 15 && the.length !== 17) err('Mã thẻ nhận diện phải 15 hoặc 17 ký tự');

  return { data, issues };
}

/** Chuỗi lỗi hiển thị trong bảng (cảnh báo có tiền tố ⚠) */
export function issuesToMessages(issues: KskIssue[]): string[] {
  return issues.map(i => (i.level === 'warning' ? `⚠ ${i.msg}` : i.msg));
}

/** Tạo HoSoRecord từ dữ liệu thô (form hoặc 1 dòng Excel) */
export function createKskHoSoRecord(
  raw: Record<string, any>,
  type: KskType,
  opts: { id?: string; source?: 'manual' | 'excel' } = {}
): HoSoRecord & { kskErrors: string[]; kskIssues: KskIssue[]; kskSource: 'manual' | 'excel' } {
  const { data, issues } = finalizeKskRecord(raw, type);
  const xmlContent = buildKskXml([data], data.MA_GTIN_CSKCB || data.MA_CSKCB || '00000');
  return {
    id: opts.id || `ksk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'KHAM_SUC_KHOE',
    hoTen: data.HO_TEN || 'Không rõ',
    maBhyt: '',
    maBhxh: '',
    cccd: data.SO_CCCD || '',
    khoa: '',
    ngayVao: '',
    ngayRa: '',
    icd: '',
    chanDoan: '',
    nguoiKy: '',
    cchn: '',
    trangThai: 'UNSIGNED',
    kskErrors: issuesToMessages(issues),
    kskIssues: issues,
    kskSource: opts.source || 'excel',
    rawData: data,
    xmlContent,
    displayFields: {
      khoaPrimary: '', khoaSecondary: '', chanDoanPrimary: '', chanDoanSecondary: '', nguoiKyPrimary: '', nguoiKySecondary: '',
    },
  };
}
