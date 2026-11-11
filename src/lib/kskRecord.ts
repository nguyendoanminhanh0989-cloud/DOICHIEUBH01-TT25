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
import { COMMUNES_BY_PROVINCE } from './diaPhuong';
import { normalizeKskColumnKey, KSK_COLUMN_ALIASES } from './kskExcelTemplates';

export interface KskIssue {
  key?: string;
  msg: string;
  level: 'error' | 'warning';
}

export interface KskClsItem {
  MA_DICH_VU?: string;
  MA_CHI_SO?: string;
  TEN_CHI_SO?: string;
  GIA_TRI?: string;
  DON_VI_DO?: string;
  MO_TA?: string;
  KET_LUAN?: string;
  CKDT_KET_QUA_CLS?: string;
}

/** Cột trong file Excel Trên 18 dùng tên khác với thẻ XML chuẩn */
const KEY_ALIASES: Record<string, string> = {
  ...KSK_COLUMN_ALIASES,
};

const DATE_KEYS = new Set(['NGAY_VAO', 'NGAY_SINH', 'NGAYCAP_CCCD']);
const DECIMAL_KEYS = [
  'CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'BMI', 'NHIET_DO', 'CHIEU_DAI', 'VONG_DAU',
  'CHIEU_DAI_TUOI_SD', 'CAN_NANG_TUOI_SD',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM',
];
/** Mẫu Adult (EMRHub): tên thẻ chuẩn của nhóm Mắt/TMH/RHM khác với bản Excel cũ */
const ADULT_ALIASES: Record<string, string> = {
  BENH_KHAC_TAI_MUI_HONG: 'BENH_TAI_MUI_HONG',
  BENH_KHAC_RANG_HAM_MAT: 'BENH_RANG_HAM_MAT',
};

export const normText = (s: string): string =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Bỏ tiền tố mã ở đầu nhãn, ví dụ "15 - Khám sức khoẻ định kỳ" -> "kham suc khoe dinh ky" */
const stripCodePrefix = (s: string): string =>
  normText(s).replace(/^(?:ma\s*["“']?)?[0-9a-z]+["”']?\s*[-:=]\s*/i, '').trim();

/* ------------------------------ Ngày tháng ------------------------------ */

export function parseDateValue(val: any): Date | null {
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

export function mapOption(field: KskField, rawVal: string): string {
  const val = String(rawVal ?? '').trim();
  if (!val) return val;
  const opts = field.options;
  if (!opts || opts.length === 0) return val;
  if (opts.some(o => o.value === val)) return val;

  // Số nguyên dạng "0.0", "1.0" từ Excel
  if (/^\d+\.0+$/.test(val)) {
    const intVal = String(parseInt(val, 10));
    if (opts.some(o => o.value === intVal)) return intVal;
  }

  const nv = normText(val);

  if (field.kind === 'yesno') {
    if (
      ['0', '0.0', 'khong', 'no', 'false', 'k', 'khong binh thuong', 'khong duoc tiem', 'chua', 'am tinh', '-'].includes(nv) ||
      /^(?:ma\s*["“']?0["”']?\s*[-:=]|0\s*[-:=]|khong\b)/.test(nv)
    ) {
      return '0';
    }
    if (
      ['1', '1.0', 'co', 'yes', 'true', 'c', 'x', '✓', '✔', 'binh thuong', 'duoc tiem', 'duong tinh', '+'].includes(nv) ||
      /^(?:ma\s*["“']?1["”']?\s*[-:=]|1\s*[-:=]|co\b|binh thuong\b)/.test(nv)
    ) {
      return '1';
    }
  }

  if (field.kind === 'phanloai') {
    const r = /loai\s+(iv|v|i{1,3})\b/.exec(nv) || /^(iv|v|i{1,3})$/.exec(nv);
    if (r && ROMAN_TO_PL[r[1]]) return ROMAN_TO_PL[r[1]];
    const mCode = /ma\s*["“']?([1-5])["”']?/.exec(nv) || /^([1-5])\s*[-:=]/.exec(nv);
    if (mCode) return mCode[1];
  }

  // Trích mã ở đầu chuỗi dạng "1 - ...", "01 - ...", "Mã 1 = ..."
  const leadCode = /^(?:ma\s*["“']?)?(\d{1,2})["”']?\s*[-:=]/.exec(nv);
  if (leadCode) {
    const c = leadCode[1];
    const noZero = c.replace(/^0+/, '') || '0';
    const hitCode = opts.find(o => o.value === c || o.value === c.padStart(2, '0') || o.value === noZero);
    if (hitCode) return hitCode.value;
  }

  // Thị lực nhập dạng số "10", "9" -> "10/10", "9/10"
  if (field.key.includes('KINH_MAT') && /^([1-9]|10|11|12)$/.test(val)) {
    const slashVal = `${val}/10`;
    if (opts.some(o => o.value === slashVal)) return slashVal;
  }

  // Nếu chỉ nhập số như "1" cho mã 2 chữ số "01" hoặc "09" cho mã 1 chữ số "9"
  if (/^\d+$/.test(val)) {
    const pad2 = val.padStart(2, '0');
    const hitPad = opts.find(o => o.value === pad2);
    if (hitPad) return hitPad.value;
    const strippedZero = val.replace(/^0+/, '') || '0';
    const hitStripped = opts.find(o => o.value === strippedZero);
    if (hitStripped) return hitStripped.value;
  }

  if (nv === 'khac' || nv === 'chua xac dinh' || nv === 'khong xac dinh') {
    const fallback = opts.find(o => o.value === '9' || o.value === '00' || o.value === '99' || o.value === '16');
    if (fallback) return fallback.value;
  }

  const nvStripped = stripCodePrefix(val);
  const hit =
    opts.find(o => normText(o.label) === nv || stripCodePrefix(o.label) === nvStripped) ||
    (nvStripped.length >= 3
      ? opts.find(o => {
          const ol = stripCodePrefix(o.label);
          return ol.startsWith(nvStripped) || nvStripped.startsWith(ol);
        })
      : undefined);

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

  // 1. Làm sạch + chuẩn hóa tên khóa (kể cả tên cột có khoảng trắng như "NOI KHOA TUAN HOAN" -> "NOI_KHOA_TUAN_HOAN")
  const data: Record<string, any> = {};
  for (const [rawKey, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (rawKey === 'CLS') continue;
    const normalized = normalizeKskColumnKey(rawKey, undefined, type);
    const key =
      KEY_ALIASES[normalized] ||
      (type === 'Adult' ? ADULT_ALIASES[normalized] : undefined) ||
      normalized ||
      rawKey;
    if (data[key] !== undefined && data[key] !== '' && rawKey !== key) continue; // ưu tiên giá trị đã có ở khóa chuẩn
    if (typeof v === 'boolean') {
      data[key] = v ? '1' : '0';
      continue;
    }
    if (typeof v === 'string' && v.trim() === '') continue;
    data[key] = DATE_KEYS.has(key) ? v : String(v).trim();
  }
  data.TYPE = type;

  // Đồng bộ 2 chiều các cặp khóa tương đương giữa Excel / Form / XML
  if (data.BENH_TAI_MUI_HONG !== undefined && data.BENH_KHAC_TAI_MUI_HONG === undefined) {
    data.BENH_KHAC_TAI_MUI_HONG = data.BENH_TAI_MUI_HONG;
  } else if (data.BENH_KHAC_TAI_MUI_HONG !== undefined && data.BENH_TAI_MUI_HONG === undefined) {
    data.BENH_TAI_MUI_HONG = data.BENH_KHAC_TAI_MUI_HONG;
  }
  if (data.BENH_RANG_HAM_MAT !== undefined && data.BENH_KHAC_RANG_HAM_MAT === undefined) {
    data.BENH_KHAC_RANG_HAM_MAT = data.BENH_RANG_HAM_MAT;
  } else if (data.BENH_KHAC_RANG_HAM_MAT !== undefined && data.BENH_RANG_HAM_MAT === undefined) {
    data.BENH_RANG_HAM_MAT = data.BENH_KHAC_RANG_HAM_MAT;
  }
  if (data.TIEM_CHUNG_VAC_XIN_KHAC !== undefined && data.TIEM_CHUNG_CAC_LOAI_KHAC === undefined) {
    data.TIEM_CHUNG_CAC_LOAI_KHAC = '1';
  }

  // Giá trị mặc định theo đặc tả EMRHub
  if (data.MA_LOAI_KCB === undefined) data.MA_LOAI_KCB = '01';
  if (data.LY_DO_VV === undefined) data.LY_DO_VV = 'Khám sức khỏe định kỳ';
  if (data.CAC_VAN_DE_SUC_KHOE === undefined && data.CAC_BENH_TAT_NEU_CO !== undefined) {
    data.CAC_VAN_DE_SUC_KHOE = data.CAC_BENH_TAT_NEU_CO;
  }
  if (data.CAC_BENH_TAT_NEU_CO === undefined && data.CAC_VAN_DE_SUC_KHOE !== undefined) {
    data.CAC_BENH_TAT_NEU_CO = data.CAC_VAN_DE_SUC_KHOE;
  }
  if (data.CAC_VAN_DE_SUC_KHOE === undefined && data.GHI_RO_VAN_DE_SUC_KHOE !== undefined) {
    data.CAC_VAN_DE_SUC_KHOE = data.GHI_RO_VAN_DE_SUC_KHOE;
    if (data.CAC_BENH_TAT_NEU_CO === undefined) data.CAC_BENH_TAT_NEU_CO = data.GHI_RO_VAN_DE_SUC_KHOE;
  }
  if (type === 'Adult') {
    if (data.NOICAP_CCCD === undefined) data.NOICAP_CCCD = 'Cục Cảnh sát QLHC về TTXH';
    if (data.KET_LUAN_BENH === undefined) data.KET_LUAN_BENH = 'Hiện tại chưa phát hiện bệnh lý';
    if (data.CAC_VAN_DE_SUC_KHOE === undefined) {
      data.CAC_VAN_DE_SUC_KHOE = data.KET_LUAN_BENH || 'Đủ sức khỏe làm việc';
      if (data.CAC_BENH_TAT_NEU_CO === undefined) data.CAC_BENH_TAT_NEU_CO = data.CAC_VAN_DE_SUC_KHOE;
    }
  }

  // 2. Ánh xạ tên -> mã theo danh mục của schema + điền mặc định cho các mục Có/Không (yesno)
  const fields = getAllFields(type);
  for (const f of fields) {
    if (data[f.key] !== undefined && f.options && f.options.length > 0) {
      data[f.key] = mapOption(f, String(data[f.key]));
    } else if (data[f.key] === undefined && f.kind === 'yesno' && f.defaultValue !== undefined) {
      // Đảm bảo các trường tích Có/Không luôn có giá trị chuẩn '0' hoặc '1' khi xuất XML
      data[f.key] = f.defaultValue;
    }
  }

  // 2b. Ánh xạ Phường/Xã (MAXA_CU_TRU) từ tên sang mã 5 chữ số theo Tỉnh/Thành phố (MATINH_CU_TRU)
  if (data.MATINH_CU_TRU !== undefined && /^\d$/.test(String(data.MATINH_CU_TRU))) {
    data.MATINH_CU_TRU = String(data.MATINH_CU_TRU).padStart(2, '0');
  }
  if (data.MAXA_CU_TRU !== undefined) {
    const rawXa = String(data.MAXA_CU_TRU).trim();
    const leadXaCode = /^(\d{1,5})\b/.exec(rawXa);
    if (/^\d+$/.test(rawXa)) {
      data.MAXA_CU_TRU = rawXa.padStart(5, '0');
    } else if (leadXaCode && /^\d{1,5}\s*[-:=]/.test(rawXa)) {
      data.MAXA_CU_TRU = leadXaCode[1].padStart(5, '0');
    } else {
      const nXa = normText(rawXa);
      const communes = (data.MATINH_CU_TRU && COMMUNES_BY_PROVINCE[data.MATINH_CU_TRU]) || Object.values(COMMUNES_BY_PROVINCE).flat();
      const matchedCommune =
        communes.find(c => normText(c.label) === nXa) ||
        communes.find(c => normText(c.label).endsWith(nXa) || nXa.endsWith(normText(c.label)));
      if (matchedCommune) {
        data.MAXA_CU_TRU = matchedCommune.value;
      }
    }
  }

  // 3. Giới tính: chỉ 1 - Nam, 2 - Nữ
  if (data.GIOI_TINH !== undefined) {
    const gt = normText(data.GIOI_TINH);
    if (gt === 'nam' || gt === '1' || gt === '1.0' || gt.startsWith('1 -') || gt.startsWith('1-')) data.GIOI_TINH = '1';
    else if (gt === 'nu' || gt === '2' || gt === '2.0' || gt.startsWith('2 -') || gt.startsWith('2-')) data.GIOI_TINH = '2';
    else {
      delete data.GIOI_TINH;
      err('Giới tính chỉ nhận 1 (Nam) hoặc 2 (Nữ)', 'GIOI_TINH');
    }
  }

  // 4. Số thập phân: dấu phẩy -> dấu chấm (Parquet)
  for (const k of DECIMAL_KEYS) {
    if (data[k] !== undefined) data[k] = String(data[k]).replace(/,/g, '.');
  }
  if (data.MA_DAN_TOC !== undefined) {
    const dtoc = normText(data.MA_DAN_TOC);
    const leadDt = /^(\d{1,2})\b/.exec(dtoc);
    if (dtoc === 'kinh' || dtoc === '1' || dtoc === '01' || dtoc.startsWith('01 ') || dtoc.startsWith('1 ')) {
      data.MA_DAN_TOC = '01';
    } else if (leadDt) {
      data.MA_DAN_TOC = leadDt[1].padStart(2, '0');
    } else if (/^\d$/.test(dtoc)) {
      data.MA_DAN_TOC = dtoc.padStart(2, '0');
    }
  }

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

  // 6. BMI tự tính (1 chữ số lẻ theo đặc tả)
  if (data.CHI_SO_BMI === undefined && data.BMI === undefined) {
    const h = parseFloat(data.CHIEU_CAO), w = parseFloat(data.CAN_NANG);
    if (h > 0 && w > 0) data.CHI_SO_BMI = (w / Math.pow(h / 100, 2)).toFixed(1);
  }

  // 7. Mã liên kết
  if (data.MA_LK === undefined && data.NGAY_VAO) {
    const tail = String(data.SO_CCCD || data.SO_CCCD_NGUOI_DI_CUNG || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    data.MA_LK = `${data.MA_CSKCB || ''}${data.NGAY_VAO}${tail}`;
  }

  // 8. Cận lâm sàng (XML11): hỗ trợ cả mảng CLS từ sheet DM_CanLamSang VÀ các cột CLS nằm trực tiếp trên sheet chính
  let rawClsList: KskClsItem[] = Array.isArray(raw.CLS) ? (raw.CLS as KskClsItem[]) : [];
  if (rawClsList.length === 0 && (data.MA_DICH_VU || data.MA_CHI_SO || data.GIA_TRI || data.KET_LUAN_CLS)) {
    rawClsList = [
      {
        MA_DICH_VU: data.MA_DICH_VU,
        MA_CHI_SO: data.MA_CHI_SO,
        TEN_CHI_SO: data.TEN_CHI_SO || data.MO_TA || data.MA_CHI_SO || data.MA_DICH_VU,
        GIA_TRI: data.GIA_TRI,
        DON_VI_DO: data.DON_VI_DO,
        MO_TA: data.MO_TA,
        KET_LUAN: data.KET_LUAN || data.KET_LUAN_CLS,
        CKDT_KET_QUA_CLS: data.CKDT_KET_QUA_CLS || data.CKDT_CLS,
      },
    ];
  }
  if (raw.HAS_CLS !== '0' && rawClsList.length > 0) {
    const fallbackSig = (raw.CKDT_CLS || data.CKDT_CLS) ? String(raw.CKDT_CLS || data.CKDT_CLS).trim() : undefined;
    const cls: KskClsItem[] = rawClsList
      .map(c => {
        const o: KskClsItem = {};
        (['MA_DICH_VU', 'MA_CHI_SO', 'TEN_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN', 'CKDT_KET_QUA_CLS'] as const).forEach(k => {
          const v = c?.[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') o[k] = String(v).trim();
        });
        if (!o.CKDT_KET_QUA_CLS && fallbackSig) {
          o.CKDT_KET_QUA_CLS = fallbackSig;
        }
        if (o.KET_LUAN && normText(o.KET_LUAN) === 'bt') {
          o.KET_LUAN = 'Bình thường';
        }
        // Kết quả dạng số: thay dấu phẩy bằng dấu chấm
        if (o.GIA_TRI && /^-?\d+,\d+$/.test(o.GIA_TRI)) o.GIA_TRI = o.GIA_TRI.replace(',', '.');
        if (o.MO_TA && /^-?\d+,\d+$/.test(o.MO_TA)) o.MO_TA = o.MO_TA.replace(',', '.');
        return o;
      })
      .filter(o => o.GIA_TRI || o.MO_TA || o.KET_LUAN || o.MA_DICH_VU || o.MA_CHI_SO);
    if (cls.length > 0) {
      data.CLS = cls;
      data.HAS_CLS = '1';
    }
  }

  // Đồng bộ ngược các khóa đặc thù của mẫu Excel Trên 18 để khi Xuất lại Excel luôn đầy đủ
  if (data.NGAYCAP_CCCD !== undefined) data.NGAY_CAP_CCCD = data.NGAYCAP_CCCD;
  if (data.NOICAP_CCCD !== undefined) data.NOI_CAP_CCCD = data.NOICAP_CCCD;
  if (data.NOI_KHOA_THAN_TN_SD_PL !== undefined) data.NOI_KHOA_THAN_TIETNIEU_PL = data.NOI_KHOA_THAN_TN_SD_PL;
  if (data.CAC_VAN_DE_SUC_KHOE !== undefined && data.CAC_BENH_TAT_NEU_CO === undefined) {
    data.CAC_BENH_TAT_NEU_CO = data.CAC_VAN_DE_SUC_KHOE;
  }
  if (data.CAC_BENH_TAT_NEU_CO !== undefined && data.CAC_VAN_DE_SUC_KHOE === undefined) {
    data.CAC_VAN_DE_SUC_KHOE = data.CAC_BENH_TAT_NEU_CO;
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
    err('Mã cơ sở KCB phải gồm đúng 5 ký tự số', 'MA_CSKCB');
  }
  if (data.SO_CCCD) {
    if (type === 'Adult') {
      if (!/^\d{12}$/.test(data.SO_CCCD)) err('Số CCCD phải gồm đúng 12 chữ số, không chứa khoảng trắng', 'SO_CCCD');
    } else if (!/^(\d{9}|\d{12})$/.test(data.SO_CCCD)) {
      warn('Số CMND/CCCD nên gồm 9 hoặc 12 chữ số', 'SO_CCCD');
    }
  }
  if (data.NGAYCAP_CCCD && !/^\d{8}$/.test(data.NGAYCAP_CCCD)) {
    err('Ngày cấp CCCD phải theo định dạng YYYYMMDD', 'NGAYCAP_CCCD');
  }
  if (data.DIEN_THOAI && !/^\d{10}$/.test(String(data.DIEN_THOAI).replace(/\s/g, ''))) {
    warn('Số điện thoại nên gồm 10 chữ số', 'DIEN_THOAI');
  }
  if (data.PHAN_LOAI_SK && !['1', '2', '3', '4', '5'].includes(data.PHAN_LOAI_SK)) {
    err('Phân loại sức khỏe phải từ 1 đến 5', 'PHAN_LOAI_SK');
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
): HoSoRecord & { kskType: KskType; kskErrors: string[]; kskIssues: KskIssue[]; kskSource: 'manual' | 'excel' } {
  const { data, issues } = finalizeKskRecord(raw, type);
  const xmlContent = buildKskXml([data], data.MA_GTIN_CSKCB || data.MA_CSKCB || '00000');
  return {
    id: opts.id || `ksk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'KHAM_SUC_KHOE',
    kskType: type,
    hoTen: data.HO_TEN || 'Không rõ',
    maBhyt: '',
    maBhxh: '',
    cccd: data.SO_CCCD || '',
    khoa: '',
    ngayVao: data.NGAY_VAO || '',
    ngayRa: '',
    icd: data.KET_LUAN_BENH || '',
    chanDoan: data.CAC_VAN_DE_SUC_KHOE || '',
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
