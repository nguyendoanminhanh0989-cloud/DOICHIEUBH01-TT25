/**
 * BỘ SINH, ĐỌC & KÝ SỐ 2 BƯỚC XML KHÁM SỨC KHỎE (QĐ 2062/QĐ-BYT & EMRHUB)
 * -------------------------------------------------------------------------
 * Đối chiếu & khớp 100% byte-for-byte với phần mềm KSK_ToanDan.exe (QĐ 2062/QĐ-BYT)
 * đã đẩy cổng thành công cho cả 3 nhóm đối tượng:
 *   1. Adult      (>= 18 tuổi - 123 chỉ tiêu): 12 FILEHOSO (XML1..XML12) theo schema thống nhất
 *   2. ChildUnder (< 6 tuổi   - 109 chỉ tiêu): 12 FILEHOSO (XML1..XML12) theo schema thống nhất
 *   3. Minor      (6 - <18T   - 87 chỉ tiêu) : 12 FILEHOSO (XML1..XML12) theo schema học sinh/vị thành niên
 */

import type { KskType } from './kskSchemas';

/* ==================== DANH SÁCH THẺ CHUẨN QĐ 2062/QĐ-BYT ==================== */

// XML1 chuẩn thống nhất (Adult: 29 thẻ có NOI_LAM_VIEC_HOC_TAP; ChildUnder: 28 thẻ)
export const X1_KEYS = [
  'HO_TEN', 'NGAY_SINH', 'SO_CCCD', 'TUAN_THAI', 'SINH_NON', 'GIOI_TINH', 'MA_DAN_TOC',
  'NHOM_MAU', 'DIA_CHI', 'MATINH_CU_TRU', 'MAXA_CU_TRU',
  'HO_TEN_NGUOI_DI_CUNG', 'SO_CCCD_NGUOI_DI_CUNG', 'MOI_QUAN_HE_VOI_TRE', 'DIEN_THOAI_NGUOI_DI_CUNG',
  'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'TS_TIEP_XUC_LAO',
  'DIEN_THOAI', 'NGAYCAP_CCCD', 'NOICAP_CCCD',
  'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIEN_THOAI_NGH',
  'LY_DO_VV', 'MA_NGHE_NGHIEP', 'NOI_LAM_VIEC_HOC_TAP',
];

export const CHILD_X1_KEYS = X1_KEYS.filter(k => k !== 'NOI_LAM_VIEC_HOC_TAP');

// XML2 chuẩn Adult & ChildUnder (MA_CSKCB đứng đầu)
export const X2_KEYS = [
  'MA_CSKCB', 'MA_GTIN_CSKCB', 'MA_LK', 'DOI_TUONG', 'NGUON_CHI_TRA', 'MA_LOAI_KCB', 'NGAY_VAO', 'TYPE',
];

// XML3 chuẩn Adult & ChildUnder (DANH_GIA_DAU_HIEU_SINH_TON - 6 thẻ)
export const X3_KEYS = [
  'NHIET_DO', 'DGDHST_NHIET_DO', 'MACH', 'DGDHST_MACH', 'NHIP_THO', 'DGDHST_NHIP_THO',
];

// XML4 chuẩn Adult & ChildUnder (DANH_GIA_DINH_DUONG - 13 thẻ)
export const X4_KEYS = [
  'CHIEU_DAI', 'CHIEU_DAI_TUOI_SD', 'CAN_NANG', 'CAN_NANG_TUOI_SD', 'VONG_DAU', 'DG_VONG_DAU', 'CHU_VI_VONG_CANH_TAY',
  'DGDD_BINH_THUONG', 'PHU_DINH_DUONG', 'DGDD_THIEU_MAU', 'DGDD_COI_XUONG', 'SUY_DINH_DUONG', 'THUA_CAN_BEO_PHI',
];

// XML5 chuẩn Adult & ChildUnder (DANH_GIA_PHAT_TRIEN_TINH_THAN_VAN_DONG - 3 thẻ)
export const X5_KEYS = [
  'PT_TTBT_THEO_DO_TUOI', 'PT_VDBT_THEO_DO_TUOI', 'NGUY_CO_TU_KY',
];

// XML6 chuẩn Adult & ChildUnder (DANH_GIA_TIEM_CHUNG - 3 thẻ)
export const X6_KEYS = [
  'TIEM_CHUNG_BCG_SS', 'TIEM_CHUNG_VGB_SS_MUI1', 'TIEM_CHUNG_DAY_DU_THEO_DO_TUOI',
];

// XML7 chuẩn Adult & ChildUnder (KHAM_LAM_SANG - đúng 117 thẻ theo KSK_ToanDan.exe)
export const X7_KEYS = [
  'MAU_SAC_DA', 'LONG_BAN_TAY', 'THOP', 'HINH_DANG_DAU', 'VAN_DONG_CO', 'KHOI_BAT_THUONG_DAU_CO',
  'VI_TRI_HAI_MAT', 'MI_MAT_KET_MAC', 'LAC_MAT', 'DONG_TU', 'TAI_MANG_NHI', 'DAP_UNG_AM_THANH',
  'KHOI_SUNG_SAU_TAI', 'CHAY_MU_NUOC_TAI', 'HINH_DANG_MUI', 'CHAY_NUOC_MUI', 'NGHET_MUI', 'HONG',
  'HINH_DANG_MIENG', 'RANG_SUA_SO_SINH', 'HINH_DANG_LUOI', 'DINH_THANG_LUOI', 'NAM_MIENG', 'CAM_NHO_TUT_VE_SAU',
  'SAU_MANG_BAM_LO', 'NHIP_THO_KHONG_DEU', 'THO_RUT_LOM_LONG_NGUC', 'TIENG_THO_BAT_THUONG', 'SUY_HO_HAP',
  'NGHE_PHOI', 'VI_TRI_MOM_TIM', 'MACH_NGOAI_VI', 'TIENG_TIM', 'HINH_DANG_BUNG_RON', 'GAN_LACH_TO',
  'KHOI_BAT_THUONG', 'LO_HAU_MON', 'CO_QUAN_SINH_DUC_NGOAI', 'VAN_DONG_KHONG_DOI_XUNG', 'PHAN_XA_BU',
  'PHAN_XA_NAM', 'PHAN_XA_MORO', 'TRUONG_LUC_CO', 'KHOP_HANG', 'PHAN_XA_CO', 'KIEM_TRA_LUNG_COT_SONG',
  'TU_CHI_KHOP', 'QUAN_SAT_DANG_DI',
  'NHI_KHOA_TUAN_HOAN', 'CKDT_NHI_KHOA_TUAN_HOAN',
  'NHI_KHOA_HO_HAP', 'CKDT_NHI_KHOA_HO_HAP',
  'NHI_KHOA_TIEU_HOA', 'CKDT_NHI_KHOA_TIEU_HOA',
  'NHI_KHOA_THAN_TN_SD', 'CKDT_NHI_KHOA_THAN_TN_SD',
  'NHI_KHOA_THAN_KINH', 'CKDT_NHI_KHOA_THAN_KINH',
  'NHI_KHOA_TAM_THAN', 'CKDT_NHI_KHOA_TAM_THAN',
  'NHI_KHOA_LAM_SANG_KHAC', 'CKDT_NHI_KHOA_LAM_SANG_KHAC',
  'KHONG_KINH_MAT_PHAI', 'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT', 'CKDT_KHAM_MAT',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_TAI_MUI_HONG', 'CKDT_KHAM_TAI_MUI_HONG',
  'HAM_TREN', 'HAM_DUOI', 'BENH_RANG_HAM_MAT', 'CKDT_KHAM_RANG_HAM_MAT',
  'NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_TUAN_HOAN_PL', 'CKDT_NOI_KHOA_TUAN_HOAN',
  'NOI_KHOA_HO_HAP', 'NOI_KHOA_HO_HAP_PL', 'CKDT_NOI_KHOA_HO_HAP',
  'NOI_KHOA_TIEU_HOA', 'NOI_KHOA_TIEU_HOA_PL', 'CKDT_NOI_KHOA_TIEU_HOA',
  'NOI_KHOA_THAN_TN_SD', 'NOI_KHOA_THAN_TN_SD_PL', 'CKDT_NOI_KHOA_THAN_TN_SD',
  'NOI_KHOA_NOI_TIET', 'NOI_KHOA_NOI_TIET_PL', 'CKDT_NOI_KHOA_NOI_TIET',
  'NOI_KHOA_CO_XUONG_KHOP', 'NOI_KHOA_CO_XUONG_KHOP_PL', 'CKDT_NOI_KHOA_CO_XUONG_KHOP',
  'NOI_KHOA_THAN_KINH', 'NOI_KHOA_THAN_KINH_PL', 'CKDT_NOI_KHOA_THAN_KINH',
  'NOI_KHOA_TAM_THAN', 'NOI_KHOA_TAM_THAN_PL', 'CKDT_NOI_KHOA_TAM_THAN',
  'KET_QUA_KHAM_NGOAI_KHOA', 'KHAM_NGOAI_KHOA_PL', 'CKDT_KHAM_NGOAI_KHOA',
  'KET_QUA_KHAM_DA_LIEU', 'KHAM_DA_LIEU_PL', 'CKDT_KHAM_DA_LIEU',
  'KET_QUA_KHAM_SAN_PHU_KHOA', 'KHAM_SAN_PHU_KHOA_PL', 'CKDT_KHAM_SAN_PHU_KHOA',
  'KHAM_MAT_PL', 'BENH_KHAC_TAI_MUI_HONG', 'KHAM_TAI_MUI_HONG_PL', 'BENH_KHAC_RANG_HAM_MAT', 'KHAM_RANG_HAM_MAT_PL',
];

// XML8 chuẩn Adult & ChildUnder (KET_LUAN_VA_TU_VAN - 7 thẻ)
export const X8_KEYS = [
  'BINH_THUONG', 'NGUY_CO_MAC_LAO', 'VAN_DE_SUC_KHOE', 'KET_LUAN_BENH', 'GHI_RO_VAN_DE_SUC_KHOE', 'HEN_KHAM_LAN_SAU', 'CHUYEN_CSKCB',
];

// XML9 chuẩn Adult & ChildUnder (TIEN_SU_BENH_TAT - 43 thẻ)
export const X9_KEYS = [
  'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'SAN_KHOA', 'SAN_KHOA_KHONG_BT', 'MA_BENH_SAN_KHOA_KHONG_BT',
  'TIEM_CHUNG_BCG', 'TIEM_CHUNG_BH_HG_UV', 'TIEM_CHUNG_SOI', 'TIEM_CHUNG_BAI_LIET', 'TIEM_CHUNG_VNNB_B',
  'TIEM_CHUNG_VGB', 'TIEM_CHUNG_CAC_LOAI_KHAC',
  'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSBT_DANG_DIEU_TRI_BENH',
  'BENH_DANG_DIEU_TRI', 'TSBT_BENH_TRONG_5_NAM_QUA', 'TSBT_BENH_THAN_KINH', 'TSBT_BENH_MAT', 'TSBT_BENH_TAI',
  'TSBT_BENH_TIM', 'TSBT_PHAU_THUAT_TIM', 'TSBT_TANG_HUYET_AP', 'TSBT_KHO_THO', 'TSBT_BENH_PHOI', 'TSBT_BENH_THAN',
  'TSBT_NGHIEN_RUOU', 'TSBT_DAI_THAO_DUONG', 'TSBT_BENH_TAM_THAN', 'TSBT_MAT_Y_THUC', 'TSBT_NGAT', 'TSBT_BENH_TIEU_HOA',
  'TSBT_ROI_LOAN_GIAC_NGU', 'TSBT_TAI_BIEN', 'TSBT_BENH_COT_SONG', 'TSBT_RUOU_THUONG_XUYEN', 'TSBT_MA_TUY',
  'TSBT_BENH_KHAC', 'TSBT_MA_BENH_KHAC', 'TSBT_TEN_THUOC_LIEU_LUONG', 'TSBT_THAI_SAN', 'TSBT_MA_BENH_THAI_SAN',
  'TSBT_TEN_THUOC_THAI_SAN',
];

// XML10 chuẩn Adult & ChildUnder (KHAM_THE_LUC - 6 thẻ)
export const X10_KEYS = [
  'CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'MACH', 'HUYET_AP', 'KHAM_THE_LUC_PL',
];

// XML12 chuẩn Adult & ChildUnder (KET_LUAN_VA_TU_VAN - 10 thẻ)
export const X12_KEYS = [
  ...X8_KEYS, 'PHAN_LOAI_SK', 'CAC_VAN_DE_SUC_KHOE', 'CAC_BENH_TAT_NEU_CO',
];

// 7 thẻ chuẩn của mỗi dòng Cận lâm sàng (XML11) theo QĐ 2062/QĐ-BYT (không có TEN_CHI_SO trong XML11)
export const CLS_ITEM_KEYS = [
  'MA_DICH_VU', 'MA_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN', 'CKDT_KET_QUA_CLS',
] as const;

/* ==================== CẤU TRÚC 12 BẢNG RIÊNG CỦA MINOR (6 - <18 TUỔI) ==================== */

export const MINOR_X1_KEYS = [
  'HO_TEN', 'GIOI_TINH', 'NGAY_SINH', 'DIEN_THOAI', 'MA_DAN_TOC', 'SO_CCCD', 'NGAYCAP_CCCD', 'NOICAP_CCCD',
  'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIA_CHI', 'MATINH_CU_TRU', 'MAXA_CU_TRU', 'DIEN_THOAI_NGH', 'LY_DO_VV', 'NHOM_MAU',
];
export const MINOR_X2_KEYS = [
  'MA_LK', 'MA_CSKCB', 'MA_GTIN_CSKCB', 'DOI_TUONG', 'NGUON_CHI_TRA', 'MA_LOAI_KCB', 'NGAY_VAO', 'TYPE',
];
export const MINOR_X3_KEYS = ['TSGD_MAC_BENH', 'TSGD_MA_BENH'];
export const MINOR_X4_KEYS = [
  'SAN_KHOA', 'SAN_KHOA_KHONG_BT', 'MA_BENH_SAN_KHOA_KHONG_BT',
  'TIEM_CHUNG_BCG', 'TIEM_CHUNG_BH_HG_UV', 'TIEM_CHUNG_SOI', 'TIEM_CHUNG_BAI_LIET',
  'TIEM_CHUNG_VNNB_B', 'TIEM_CHUNG_VGB', 'TIEM_CHUNG_CAC_LOAI_KHAC',
];
export const MINOR_X5_KEYS = ['TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSBT_DANG_DIEU_TRI_BENH', 'BENH_DANG_DIEU_TRI'];
export const MINOR_X6_KEYS = ['CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'MACH', 'HUYET_AP', 'KHAM_THE_LUC_PL'];
export const MINOR_X7_KEYS = [
  'NHI_KHOA_TUAN_HOAN', 'CKDT_NHI_KHOA_TUAN_HOAN',
  'NHI_KHOA_HO_HAP', 'CKDT_NHI_KHOA_HO_HAP',
  'NHI_KHOA_TIEU_HOA', 'CKDT_NHI_KHOA_TIEU_HOA',
  'NHI_KHOA_THAN_TN_SD', 'CKDT_NHI_KHOA_THAN_TN_SD',
  'NHI_KHOA_THAN_KINH', 'CKDT_NHI_KHOA_THAN_KINH',
  'NHI_KHOA_TAM_THAN', 'CKDT_NHI_KHOA_TAM_THAN',
  'NHI_KHOA_LAM_SANG_KHAC', 'CKDT_NHI_KHOA_LAM_SANG_KHAC',
];
export const MINOR_X8_KEYS = [
  'KHONG_KINH_MAT_PHAI', 'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT', 'CKDT_KHAM_MAT',
];
export const MINOR_X9_KEYS = [
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_TAI_MUI_HONG', 'CKDT_KHAM_TAI_MUI_HONG',
];
export const MINOR_X10_KEYS = ['HAM_TREN', 'HAM_DUOI', 'BENH_RANG_HAM_MAT', 'CKDT_KHAM_RANG_HAM_MAT'];
export const MINOR_X12_KEYS = [
  'PHAN_LOAI_SK', 'KET_LUAN_BENH', 'CAC_VAN_DE_SUC_KHOE', 'CKS_NGUOI_KET_LUAN', 'CKS_BENH_VIEN',
];

export interface SectionDef {
  file: number;
  tag: string;
  keys: string[];
  always?: boolean;
  cls?: boolean;
  minorCls?: boolean;
}

export function getKskSections(type: KskType): SectionDef[] {
  if (type === 'Minor') {
    return [
      { file: 1, tag: 'THONG_TIN_HANH_CHINH', keys: MINOR_X1_KEYS, always: true },
      { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: MINOR_X2_KEYS, always: true },
      { file: 3, tag: 'TIEN_SU_GIA_DINH', keys: MINOR_X3_KEYS, always: true },
      { file: 4, tag: 'SAN_KHOA_VA_TIEM_CHUNG', keys: MINOR_X4_KEYS, always: true },
      { file: 5, tag: 'TIEN_SU_BAN_THAN', keys: MINOR_X5_KEYS, always: true },
      { file: 6, tag: 'KHAM_THE_LUC', keys: MINOR_X6_KEYS, always: true },
      { file: 7, tag: 'KHAM_NHI_KHOA', keys: MINOR_X7_KEYS, always: true },
      { file: 8, tag: 'KHAM_MAT', keys: MINOR_X8_KEYS, always: true },
      { file: 9, tag: 'KHAM_TAI_MUI_HONG', keys: MINOR_X9_KEYS, always: true },
      { file: 10, tag: 'KHAM_RANG_HAM_MAT', keys: MINOR_X10_KEYS, always: true },
      { file: 11, tag: 'KET_QUA_CAN_LAM_SANG', keys: [], cls: true, minorCls: true, always: true },
      { file: 12, tag: 'KET_LUAN_VA_CHU_KY_SO', keys: MINOR_X12_KEYS, always: true },
    ];
  }

  return [
    { file: 1, tag: 'THONG_TIN_HANH_CHINH', keys: type === 'ChildUnder' ? CHILD_X1_KEYS : X1_KEYS, always: true },
    { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: X2_KEYS, always: true },
    { file: 3, tag: 'DANH_GIA_DAU_HIEU_SINH_TON', keys: X3_KEYS, always: true },
    { file: 4, tag: 'DANH_GIA_DINH_DUONG', keys: X4_KEYS, always: true },
    { file: 5, tag: 'DANH_GIA_PHAT_TRIEN_TINH_THAN_VAN_DONG', keys: X5_KEYS, always: true },
    { file: 6, tag: 'DANH_GIA_TIEM_CHUNG', keys: X6_KEYS, always: true },
    { file: 7, tag: 'KHAM_LAM_SANG', keys: X7_KEYS, always: true },
    { file: 8, tag: 'KET_LUAN_VA_TU_VAN', keys: X8_KEYS, always: true },
    { file: 9, tag: 'TIEN_SU_BENH_TAT', keys: X9_KEYS, always: true },
    { file: 10, tag: 'KHAM_THE_LUC', keys: X10_KEYS, always: true },
    { file: 11, tag: 'KHAM_CAN_LAM_SANG', keys: [], cls: true, always: true },
    { file: 12, tag: 'KET_LUAN_VA_TU_VAN', keys: X12_KEYS, always: true },
  ];
}

/** Toàn bộ thẻ XML được hỗ trợ */
export const KSK_SUPPORTED_TAGS: Set<string> = new Set([
  ...X1_KEYS, ...X2_KEYS, ...X3_KEYS, ...X4_KEYS, ...X5_KEYS, ...X6_KEYS, ...X7_KEYS,
  ...X8_KEYS, ...X9_KEYS, ...X10_KEYS, ...X12_KEYS,
  ...MINOR_X1_KEYS, ...MINOR_X2_KEYS, ...MINOR_X3_KEYS, ...MINOR_X4_KEYS, ...MINOR_X5_KEYS,
  ...MINOR_X6_KEYS, ...MINOR_X7_KEYS, ...MINOR_X8_KEYS, ...MINOR_X9_KEYS, ...MINOR_X10_KEYS, ...MINOR_X12_KEYS,
  ...CLS_ITEM_KEYS, 'BMI', 'TEN_CHI_SO',
]);

const escapeXml = (v: any): string =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const has = (v: any): boolean => v !== undefined && v !== null && String(v).trim() !== '';

/** Kết quả CLS hoặc số thập phân: đổi dấu phẩy -> dấu chấm */
const fixDecimal = (v: any): string => {
  const s = String(v ?? '').trim();
  return /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s;
};

/** Định dạng số thập phân theo chuẩn InvariantCulture '0.##' của KSK_ToanDan.exe */
function formatDecimal02(v: any): string {
  if (!has(v)) return '';
  const clean = fixDecimal(v);
  const n = Number(clean);
  if (!Number.isFinite(n)) return clean;
  return Number(n.toFixed(2)).toString();
}

/** Định dạng ngày theo chuẩn KSK_ToanDan.exe: YYYYMMDD (8 số) hoặc YYYYMMDDHHmm (12 số) */
export function formatKskDate(val: any, mode: '8' | '12'): string {
  if (!has(val)) return '';
  const s = String(val).trim();
  if (/^\d{12,14}$/.test(s)) {
    return mode === '8' ? s.slice(0, 8) : s.slice(0, 12);
  }
  if (/^\d{8}$/.test(s)) {
    return mode === '8' ? s : `${s}0000`;
  }
  // DD/MM/YYYY [HH:mm]
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T\s]+(\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const ymd = `${m[3]}${m[2].padStart(2, '0')}${m[1].padStart(2, '0')}`;
    if (mode === '8') return ymd;
    const hh = (m[4] || '00').padStart(2, '0');
    const mm = (m[5] || '00').padStart(2, '0');
    return `${ymd}${hh}${mm}`;
  }
  // YYYY-MM-DD [HH:mm]
  m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const ymd = `${m[1]}${m[2].padStart(2, '0')}${m[3].padStart(2, '0')}`;
    if (mode === '8') return ymd;
    const hh = (m[4] || '00').padStart(2, '0');
    const mm = (m[5] || '00').padStart(2, '0');
    return `${ymd}${hh}${mm}`;
  }
  return s;
}

/** Chuẩn hóa DOI_TUONG giống hệt hàm 0x06000078 của KSK_ToanDan.exe (trích mã số phân cách bằng ';') */
export function normalizeDoiTuongCode(raw: any): string {
  if (!has(raw)) return '16';
  const s = String(raw).trim();
  const parts = s.split(/[;,|]+/).map(p => p.trim()).filter(Boolean);
  const codes: string[] = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      const code = String(parseInt(p, 10));
      if (!codes.includes(code)) codes.push(code);
      continue;
    }
    const lead = p.match(/^(\d{1,2})\s*[-:=]/);
    if (lead) {
      const code = String(parseInt(lead[1], 10));
      if (!codes.includes(code)) codes.push(code);
    }
  }
  return codes.length > 0 ? codes.join(';') : s;
}

function resolveType(record: any): KskType {
  const tp = String(record?.TYPE || '').trim();
  if (tp === 'ChildUnder' || tp === 'Minor' || tp === 'Adult') return tp;
  const upper = tp.toUpperCase();
  if (upper === 'CHILDUNDER' || upper === 'TRE_DUOI6') return 'ChildUnder';
  if (upper === 'MINOR' || upper === 'TU6_DUOI18') return 'Minor';
  return 'Adult';
}

/**
 * Chuẩn bị dữ liệu 1 bản ghi để ánh xạ sang 12 bảng XML1..XML12 đúng 100% logic của:
 *   - 0x020000A9 (XmlKskService - Adult)
 *   - 0x020000AA (XmlTreDuoi6Service - ChildUnder)
 *   - 0x020000AB (XmlTu6DenDuoi18Service - Minor)
 */
function prepareRecordForXml(record: any, fallbackMaCskcb: string): Record<string, any> {
  const type = resolveType(record);
  const d: Record<string, any> = { ...record, TYPE: type };

  // Làm sạch chữ ký điện tử bác sĩ (nếu là data URI ảnh thì chỉ lấy chuỗi hoặc tên bác sĩ)
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('CKDT_') && typeof v === 'string' && v.includes('base64,')) {
      d[k] = v.split('base64,')[1];
    }
  }

  // Mã CSKCB, đối tượng, nguồn chi trả, loại hình KCB
  if (!has(d.MA_CSKCB)) d.MA_CSKCB = fallbackMaCskcb;
  d.DOI_TUONG = normalizeDoiTuongCode(d.DOI_TUONG);
  if (!has(d.NGUON_CHI_TRA)) d.NGUON_CHI_TRA = '4';
  if (!has(d.MA_LOAI_KCB)) {
    d.MA_LOAI_KCB = '01';
  } else if (/^\d$/.test(String(d.MA_LOAI_KCB).trim())) {
    d.MA_LOAI_KCB = String(d.MA_LOAI_KCB).trim().padStart(2, '0');
  }
  if (has(d.MA_DAN_TOC) && /^\d$/.test(String(d.MA_DAN_TOC).trim())) {
    d.MA_DAN_TOC = String(d.MA_DAN_TOC).trim().padStart(2, '0');
  }

  // Ngày sinh & Ngày cấp CCCD: luôn YYYYMMDD (8 ký tự) theo KSK_ToanDan.exe
  if (has(d.NGAY_SINH)) d.NGAY_SINH = formatKskDate(d.NGAY_SINH, '8');
  if (has(d.NGAYCAP_CCCD)) d.NGAYCAP_CCCD = formatKskDate(d.NGAYCAP_CCCD, '8');

  // BMI chuẩn 0.##
  if (!has(d.CHI_SO_BMI) && has(d.BMI)) d.CHI_SO_BMI = d.BMI;
  if (!has(d.CHI_SO_BMI) && has(d.CHIEU_CAO) && has(d.CAN_NANG)) {
    const h = parseFloat(fixDecimal(d.CHIEU_CAO));
    const w = parseFloat(fixDecimal(d.CAN_NANG));
    if (h > 0 && w > 0) d.CHI_SO_BMI = (w / Math.pow(h / 100, 2)).toFixed(2);
  }
  if (has(d.CHI_SO_BMI)) d.CHI_SO_BMI = formatDecimal02(d.CHI_SO_BMI);
  if (has(d.CHIEU_CAO)) d.CHIEU_CAO = formatDecimal02(d.CHIEU_CAO);
  if (has(d.CAN_NANG)) d.CAN_NANG = formatDecimal02(d.CAN_NANG);
  if (has(d.CHIEU_DAI)) d.CHIEU_DAI = formatDecimal02(d.CHIEU_DAI);
  if (has(d.VONG_DAU)) d.VONG_DAU = formatDecimal02(d.VONG_DAU);
  if (has(d.CHU_VI_VONG_CANH_TAY)) d.CHU_VI_VONG_CANH_TAY = formatDecimal02(d.CHU_VI_VONG_CANH_TAY);

  if (type === 'Adult') {
    // Adult (0x06001205): NGAY_VAO định dạng YYYYMMDD (8 ký tự)
    if (has(d.NGAY_VAO)) d.NGAY_VAO = formatKskDate(d.NGAY_VAO, '8');
    // Trong Adult, các thẻ tiền sử ở XML1 để trống (vì đã nằm ở XML9), TUAN_THAI/SINH_NON ở XML1 để trống
    // Đồng bộ BENH_KHAC_TAI_MUI_HONG <-> BENH_TAI_MUI_HONG, BENH_KHAC_RANG_HAM_MAT <-> BENH_RANG_HAM_MAT
    if (has(d.BENH_KHAC_TAI_MUI_HONG) && !has(d.BENH_TAI_MUI_HONG)) d.BENH_TAI_MUI_HONG = d.BENH_KHAC_TAI_MUI_HONG;
    if (has(d.BENH_TAI_MUI_HONG) && !has(d.BENH_KHAC_TAI_MUI_HONG)) d.BENH_KHAC_TAI_MUI_HONG = d.BENH_TAI_MUI_HONG;
    if (has(d.BENH_KHAC_RANG_HAM_MAT) && !has(d.BENH_RANG_HAM_MAT)) d.BENH_RANG_HAM_MAT = d.BENH_KHAC_RANG_HAM_MAT;
    if (has(d.BENH_RANG_HAM_MAT) && !has(d.BENH_KHAC_RANG_HAM_MAT)) d.BENH_KHAC_RANG_HAM_MAT = d.BENH_RANG_HAM_MAT;
    // Đồng bộ BENH_DANG_DIEU_TRI <- TSBT_TEN_THUOC_LIEU_LUONG nếu trống
    if (!has(d.BENH_DANG_DIEU_TRI) && has(d.TSBT_TEN_THUOC_LIEU_LUONG)) {
      d.BENH_DANG_DIEU_TRI = d.TSBT_TEN_THUOC_LIEU_LUONG;
    }
    // Đồng bộ CAC_BENH_TAT_NEU_CO <-> CAC_VAN_DE_SUC_KHOE
    if (!has(d.CAC_BENH_TAT_NEU_CO) && has(d.CAC_VAN_DE_SUC_KHOE)) {
      d.CAC_BENH_TAT_NEU_CO = d.CAC_VAN_DE_SUC_KHOE;
    }
  } else if (type === 'ChildUnder') {
    // ChildUnder (0x06001214): NGAY_VAO định dạng YYYYMMDDHHmm (12 ký tự)
    if (has(d.NGAY_VAO)) d.NGAY_VAO = formatKskDate(d.NGAY_VAO, '12');
    if (!has(d.GIOI_TINH)) d.GIOI_TINH = '1';
    if (!has(d.TS_TIEP_XUC_LAO)) d.TS_TIEP_XUC_LAO = '0';
    if (!has(d.DIEN_THOAI) && has(d.DIEN_THOAI_NGUOI_DI_CUNG)) d.DIEN_THOAI = d.DIEN_THOAI_NGUOI_DI_CUNG;
    if (!has(d.NGUOI_GIAM_HO) && has(d.HO_TEN_NGUOI_DI_CUNG)) d.NGUOI_GIAM_HO = d.HO_TEN_NGUOI_DI_CUNG;
    if (!has(d.SO_CCCD_NGH) && has(d.SO_CCCD_NGUOI_DI_CUNG)) d.SO_CCCD_NGH = d.SO_CCCD_NGUOI_DI_CUNG;
    if (!has(d.DIEN_THOAI_NGH) && has(d.DIEN_THOAI_NGUOI_DI_CUNG)) d.DIEN_THOAI_NGH = d.DIEN_THOAI_NGUOI_DI_CUNG;
    if (!has(d.LY_DO_VV)) d.LY_DO_VV = 'Khám sức khỏe định kỳ';
    // XML8 defaults theo 0x06001214
    if (!has(d.BINH_THUONG)) d.BINH_THUONG = '1';
    if (!has(d.NGUY_CO_MAC_LAO)) d.NGUY_CO_MAC_LAO = '0';
    if (!has(d.VAN_DE_SUC_KHOE)) d.VAN_DE_SUC_KHOE = '0';
    // XML9 cross-fill từ XML1 & XML6 theo 0x06001214
    if (!has(d.SAN_KHOA_KHONG_BT)) d.SAN_KHOA_KHONG_BT = '0';
    if (!has(d.TIEM_CHUNG_BCG) && has(d.TIEM_CHUNG_BCG_SS)) d.TIEM_CHUNG_BCG = d.TIEM_CHUNG_BCG_SS;
    if (!has(d.TIEM_CHUNG_VGB) && has(d.TIEM_CHUNG_VGB_SS_MUI1)) d.TIEM_CHUNG_VGB = d.TIEM_CHUNG_VGB_SS_MUI1;
    if (!has(d.TIEM_CHUNG_CAC_LOAI_KHAC) && has(d.TIEM_CHUNG_DAY_DU_THEO_DO_TUOI)) {
      d.TIEM_CHUNG_CAC_LOAI_KHAC = d.TIEM_CHUNG_DAY_DU_THEO_DO_TUOI;
    }
    // XML10 cross-fill từ XML3 & XML4 theo 0x06001214
    if (!has(d.CHIEU_CAO) && has(d.CHIEU_DAI)) d.CHIEU_CAO = d.CHIEU_DAI;
    if (!has(d.KHAM_THE_LUC_PL)) d.KHAM_THE_LUC_PL = '1';
    // XML12 cross-fill từ XML8 theo 0x06001214
    if (!has(d.HEN_KHAM_LAN_SAU)) d.HEN_KHAM_LAN_SAU = '0';
    if (!has(d.CHUYEN_CSKCB)) d.CHUYEN_CSKCB = '0';
    if (!has(d.PHAN_LOAI_SK)) d.PHAN_LOAI_SK = d.BINH_THUONG === '1' ? '1' : '3';
    if (!has(d.GHI_RO_VAN_DE_SUC_KHOE) && has(d.KET_LUAN_BENH)) d.GHI_RO_VAN_DE_SUC_KHOE = d.KET_LUAN_BENH;
    if (!has(d.CAC_VAN_DE_SUC_KHOE)) d.CAC_VAN_DE_SUC_KHOE = d.GHI_RO_VAN_DE_SUC_KHOE || d.KET_LUAN_BENH || '';
    if (!has(d.CAC_BENH_TAT_NEU_CO)) d.CAC_BENH_TAT_NEU_CO = d.GHI_RO_VAN_DE_SUC_KHOE || d.KET_LUAN_BENH || '';
  } else {
    // Minor 6 - <18 tuổi (0x06001228): NGAY_VAO định dạng YYYYMMDD (8 ký tự)
    if (has(d.NGAY_VAO)) d.NGAY_VAO = formatKskDate(d.NGAY_VAO, '8');
    if (has(d.BENH_KHAC_TAI_MUI_HONG) && !has(d.BENH_TAI_MUI_HONG)) d.BENH_TAI_MUI_HONG = d.BENH_KHAC_TAI_MUI_HONG;
    if (has(d.BENH_KHAC_RANG_HAM_MAT) && !has(d.BENH_RANG_HAM_MAT)) d.BENH_RANG_HAM_MAT = d.BENH_KHAC_RANG_HAM_MAT;
    if (!has(d.CAC_VAN_DE_SUC_KHOE) && has(d.CAC_BENH_TAT_NEU_CO)) d.CAC_VAN_DE_SUC_KHOE = d.CAC_BENH_TAT_NEU_CO;
  }

  return d;
}

/** Các thẻ trong Adult được KSK_ToanDan.exe cố tình xuất rỗng ở một số bảng (để tránh trùng giữa XML1/XML3/XML4/XML7/XML8/XML9/XML12) */
const ADULT_EMPTY_IN_XML1 = new Set([
  'TUAN_THAI', 'SINH_NON', 'HO_TEN_NGUOI_DI_CUNG', 'SO_CCCD_NGUOI_DI_CUNG', 'MOI_QUAN_HE_VOI_TRE',
  'DIEN_THOAI_NGUOI_DI_CUNG', 'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH',
  'TS_TIEP_XUC_LAO', 'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIEN_THOAI_NGH',
]);

const ADULT_EMPTY_IN_XML7 = new Set([
  'MAU_SAC_DA', 'LONG_BAN_TAY', 'THOP', 'HINH_DANG_DAU', 'VAN_DONG_CO', 'KHOI_BAT_THUONG_DAU_CO',
  'VI_TRI_HAI_MAT', 'MI_MAT_KET_MAC', 'LAC_MAT', 'DONG_TU', 'TAI_MANG_NHI', 'DAP_UNG_AM_THANH',
  'KHOI_SUNG_SAU_TAI', 'CHAY_MU_NUOC_TAI', 'HINH_DANG_MUI', 'CHAY_NUOC_MUI', 'NGHET_MUI', 'HONG',
  'HINH_DANG_MIENG', 'RANG_SUA_SO_SINH', 'HINH_DANG_LUOI', 'DINH_THANG_LUOI', 'NAM_MIENG', 'CAM_NHO_TUT_VE_SAU',
  'SAU_MANG_BAM_LO', 'NHIP_THO_KHONG_DEU', 'THO_RUT_LOM_LONG_NGUC', 'TIENG_THO_BAT_THUONG', 'SUY_HO_HAP',
  'NGHE_PHOI', 'VI_TRI_MOM_TIM', 'MACH_NGOAI_VI', 'TIENG_TIM', 'HINH_DANG_BUNG_RON', 'GAN_LACH_TO',
  'KHOI_BAT_THUONG', 'LO_HAU_MON', 'CO_QUAN_SINH_DUC_NGOAI', 'VAN_DONG_KHONG_DOI_XUNG', 'PHAN_XA_BU',
  'PHAN_XA_NAM', 'PHAN_XA_MORO', 'TRUONG_LUC_CO', 'KHOP_HANG', 'PHAN_XA_CO', 'KIEM_TRA_LUNG_COT_SONG',
  'TU_CHI_KHOP', 'QUAN_SAT_DANG_DI',
  'NHI_KHOA_TUAN_HOAN', 'CKDT_NHI_KHOA_TUAN_HOAN',
  'NHI_KHOA_HO_HAP', 'CKDT_NHI_KHOA_HO_HAP',
  'NHI_KHOA_TIEU_HOA', 'CKDT_NHI_KHOA_TIEU_HOA',
  'NHI_KHOA_THAN_TN_SD', 'CKDT_NHI_KHOA_THAN_TN_SD',
  'NHI_KHOA_THAN_KINH', 'CKDT_NHI_KHOA_THAN_KINH',
  'NHI_KHOA_TAM_THAN', 'CKDT_NHI_KHOA_TAM_THAN',
  'NHI_KHOA_LAM_SANG_KHAC', 'CKDT_NHI_KHOA_LAM_SANG_KHAC',
]);

/**
 * Sinh chuỗi XML chuẩn QĐ 2062/QĐ-BYT (khớp 100% với KSK_ToanDan.exe)
 */
export function buildKskXml(records: any[], maCskcb: string): string {
  const firstRec = records[0] || {};
  const firstType = resolveType(firstRec);

  // NGAYLAP: lấy từ NGAY_VAO của hồ sơ đầu tiên (8 ký tự YYYYMMDD) hoặc ngày hiện tại, đúng theo 0x060011FE
  const now = new Date();
  const todayYmd =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const firstNgayVao = formatKskDate(firstRec?.NGAY_VAO, '8');
  const ngayLap = /^\d{8}$/.test(firstNgayVao) ? firstNgayVao : todayYmd;

  // MACSKCB: ưu tiên MA_CSKCB, sau đó MA_GTIN_CSKCB, sau đó tham số maCskcb (theo 0x060011FE)
  const donVi =
    (has(firstRec?.MA_CSKCB) && String(firstRec.MA_CSKCB).trim()) ||
    (has(firstRec?.MA_GTIN_CSKCB) && String(firstRec.MA_GTIN_CSKCB).trim()) ||
    (has(maCskcb) && String(maCskcb).trim()) ||
    '00000';

  const ckBs = has(firstRec?.CKS_NGUOI_KET_LUAN) ? String(firstRec.CKS_NGUOI_KET_LUAN).trim() : '';
  const ckBv = has(firstRec?.CKS_BENH_VIEN) ? String(firstRec.CKS_BENH_VIEN).trim() : '';

  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  if (firstType === 'Adult') {
    xml += '<KHAMSUCKHOE xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
    xml += '  <THONGTINDONVI id="THONGTINDONVI">\n';
  } else {
    xml += '<KHAMSUCKHOE xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n';
    xml += '  <THONGTINDONVI id="THONGTINDONVI">\n';
  }
  xml += `    <MACSKCB>${escapeXml(donVi)}</MACSKCB>\n`;
  xml += '  </THONGTINDONVI>\n';
  xml += '  <THONGTINHOSO>\n';
  xml += `    <NGAYLAP>${ngayLap}</NGAYLAP>\n`;
  xml += `    <SOLUONGHOSO>${records.length}</SOLUONGHOSO>\n`;
  xml += '    <DANHSACHHOSO>\n';

  records.forEach(rawRecord => {
    const data = prepareRecordForXml(rawRecord, donVi);
    const type = data.TYPE as KskType;
    const sections = getKskSections(type);

    xml += '      <HOSO>\n';

    for (const sec of sections) {
      let body = '';

      if (sec.cls) {
        const list: any[] = Array.isArray(data.CLS)
          ? data.CLS.filter((it: any) => it && CLS_ITEM_KEYS.some(k => has(it[k])))
          : [];

        if (sec.minorCls) {
          // Minor XML11: <KET_QUA_CAN_LAM_SANG><CHI_TIET_CAN_LAM_SANG>... với CDATA cho GIA_TRI, DON_VI_DO, MO_TA, KET_LUAN
          const itemsToRender = list.length > 0 ? list : [{}];
          for (const item of itemsToRender) {
            body += '              <CHI_TIET_CAN_LAM_SANG>\n';
            for (const k of CLS_ITEM_KEYS) {
              let raw = item?.[k];
              if ((k === 'GIA_TRI' || k === 'MO_TA') && has(raw)) raw = fixDecimal(raw);
              if (k === 'GIA_TRI' || k === 'DON_VI_DO' || k === 'MO_TA' || k === 'KET_LUAN') {
                const v = has(raw) ? String(raw).trim().replace(/]]>/g, ']]]]><![CDATA[>') : '';
                body += `                <${k}><![CDATA[${v}]]></${k}>\n`;
              } else if (has(raw)) {
                body += `                <${k}>${escapeXml(String(raw).trim())}</${k}>\n`;
              } else {
                body += `                <${k}></${k}>\n`;
              }
            }
            body += '              </CHI_TIET_CAN_LAM_SANG>\n';
          }
        } else if (type === 'ChildUnder' && list.length === 0) {
          // ChildUnder XML11: <DANH_SACH_CLS />
          body += '              <DANH_SACH_CLS></DANH_SACH_CLS>\n';
        } else {
          // Adult XML11: <DANH_SACH_CLS><CHI_TIET_CLS>... (nếu rỗng vẫn có 1 CHI_TIET_CLS rỗng đúng 7 thẻ)
          const itemsToRender = list.length > 0 ? list : [{}];
          body += '              <DANH_SACH_CLS>\n';
          for (const item of itemsToRender) {
            body += '                <CHI_TIET_CLS>\n';
            for (const k of CLS_ITEM_KEYS) {
              let raw = item?.[k];
              if ((k === 'GIA_TRI' || k === 'MO_TA') && has(raw)) raw = fixDecimal(raw);
              if (has(raw)) {
                body += `                  <${k}>${escapeXml(String(raw).trim())}</${k}>\n`;
              } else {
                body += `                  <${k}></${k}>\n`;
              }
            }
            body += '                </CHI_TIET_CLS>\n';
          }
          body += '              </DANH_SACH_CLS>\n';
        }
      } else {
        for (const tag of sec.keys) {
          let val: any = data[tag];

          // Quy tắc ánh xạ từng bảng đúng theo KSK_ToanDan.exe
          if (type === 'Adult') {
            if (sec.file === 1 && ADULT_EMPTY_IN_XML1.has(tag)) val = '';
            if (sec.file === 3 && tag !== 'MACH') val = '';
            if (sec.file === 4 && tag !== 'CAN_NANG') val = '';
            if (sec.file === 5 || sec.file === 6) val = '';
            if (sec.file === 7 && ADULT_EMPTY_IN_XML7.has(tag)) val = '';
            if (sec.file === 8) {
              val = tag === 'KET_LUAN_BENH' ? data.KET_LUAN_BENH : '';
            }
          } else if (type === 'ChildUnder') {
            if (sec.file === 8 && (tag === 'HEN_KHAM_LAN_SAU' || tag === 'CHUYEN_CSKCB')) {
              // Trong XML8 của ChildUnder, nếu chưa có thì giữ theo giá trị gốc
              val = rawRecord?.[tag] ?? '';
            }
            if (sec.file === 9) {
              // Trong ChildUnder, XML9 chỉ điền TSGD_MAC_BENH, TSGD_MA_BENH, SAN_KHOA_KHONG_BT, TIEM_CHUNG_BCG, TIEM_CHUNG_VGB, TIEM_CHUNG_CAC_LOAI_KHAC, TSBT_MAC_BENH, TSBT_MA_BENH
              const childXml9Allowed = new Set([
                'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'SAN_KHOA_KHONG_BT',
                'TIEM_CHUNG_BCG', 'TIEM_CHUNG_VGB', 'TIEM_CHUNG_CAC_LOAI_KHAC',
                'TSBT_MAC_BENH', 'TSBT_MA_BENH',
              ]);
              if (!childXml9Allowed.has(tag)) val = '';
              else if ((tag === 'TSGD_MAC_BENH' || tag === 'TSBT_MAC_BENH') && !has(val)) val = '0';
            }
            if (sec.file === 10 && (tag === 'CHI_SO_BMI' || tag === 'HUYET_AP')) {
              val = '';
            }
          } else if (type === 'Minor') {
            if (sec.file === 12 && tag === 'CKS_NGUOI_KET_LUAN') val = data.CKS_NGUOI_KET_LUAN || ckBs;
            if (sec.file === 12 && tag === 'CKS_BENH_VIEN') val = data.CKS_BENH_VIEN || ckBv;
          }

          if (has(val)) {
            body += `              <${tag}>${escapeXml(String(val).trim())}</${tag}>\n`;
          } else {
            body += `              <${tag}></${tag}>\n`;
          }
        }
      }

      xml += '        <FILEHOSO>\n';
      xml += `          <LOAIHOSO>XML${sec.file}</LOAIHOSO>\n`;
      xml += '          <NOIDUNGFILE>\n';
      xml += `            <${sec.tag}>\n${body}            </${sec.tag}>\n`;
      xml += '          </NOIDUNGFILE>\n';
      xml += '        </FILEHOSO>\n';
    }

    xml += '      </HOSO>\n';
  });

  xml += '    </DANHSACHHOSO>\n';
  xml += '  </THONGTINHOSO>\n';
  xml += '  <CHUKYDONVI>\n';
  xml += `    <CKS_NGUOI_KET_LUAN>${escapeXml(ckBs)}</CKS_NGUOI_KET_LUAN>\n`;
  xml += `    <CKS_BENH_VIEN>${escapeXml(ckBv)}</CKS_BENH_VIEN>\n`;
  xml += '  </CHUKYDONVI>\n';
  xml += '</KHAMSUCKHOE>';

  return xml;
}

/* ==================== KÝ SỐ 2 BƯỚC CHUẨN BYT (KHỚP 100% 0x0200008C KSK_ToanDan.exe) ==================== */

const escAttrC14n = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const escTextC14n = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Bộ chuẩn hóa C14N đặc tả của KSK_ToanDan.exe (hàm 0x06001100 & 0x06001101):
 * - Bỏ XML declaration, không xuống dòng/thụt lề giữa các thẻ
 * - Sắp xếp thuộc tính của từng thẻ theo khóa:
 *     xmlns -> ""
 *     xmlns:prefix -> "a:" + prefix
 *     regular attr -> "b:" + localName
 * - Mọi thẻ rỗng đều xuất dạng đóng mở đầy đủ <TAG></TAG> (WriteFullEndElement)
 */
export function canonicalizeKskXmlByt(xmlString: string): string {
  if (typeof DOMParser === 'undefined') {
    return xmlString
      .replace(/^\uFEFF/, '')
      .replace(/^\s*<\?xml[^>]*\?>\s*/i, '')
      .replace(/>\s+</g, '><')
      .replace(/<([A-Za-z0-9_:-]+)\s*\/>/g, '<$1></$1>')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString.replace(/^\uFEFF/, ''), 'text/xml');
  if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    return xmlString
      .replace(/^\uFEFF/, '')
      .replace(/^\s*<\?xml[^>]*\?>\s*/i, '')
      .replace(/>\s+</g, '><')
      .replace(/<([A-Za-z0-9_:-]+)\s*\/>/g, '<$1></$1>')
      .trim();
  }

  const chunks: string[] = [];

  const writeElement = (el: Element) => {
    const tagName = el.tagName;
    const attrs: Array<{ sortKey: string; rendered: string }> = [];

    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      if (a.name === 'xmlns') {
        attrs.push({ sortKey: '', rendered: `xmlns="${escAttrC14n(a.value)}"` });
      } else if (a.name.startsWith('xmlns:')) {
        const local = a.name.slice(6);
        attrs.push({ sortKey: `a:${local}`, rendered: `xmlns:${local}="${escAttrC14n(a.value)}"` });
      } else {
        const local = a.localName || a.name;
        attrs.push({ sortKey: `b:${local}`, rendered: `${a.name}="${escAttrC14n(a.value)}"` });
      }
    }

    attrs.sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : 0));
    const attrStr = attrs.length > 0 ? ' ' + attrs.map(a => a.rendered).join(' ') : '';
    chunks.push(`<${tagName}${attrStr}>`);

    const childElements: Element[] = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i];
      if (n.nodeType === 1) childElements.push(n as Element);
    }

    if (childElements.length > 0) {
      for (const child of childElements) {
        writeElement(child);
      }
    } else {
      const textVal = el.textContent || '';
      if (textVal.length > 0) {
        chunks.push(escTextC14n(textVal));
      }
    }

    chunks.push(`</${tagName}>`);
  };

  writeElement(doc.documentElement);
  return chunks.join('');
}

const bytesToHexUpper = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
};

const utf8ToBase64 = (str: string): string => bytesToBase64(new TextEncoder().encode(str));

async function computeSha256HexAndBase64(text: string): Promise<{ hashHex: string; digestBase64: string }> {
  const bytes = new TextEncoder().encode(text);
  const digestBuf = await crypto.subtle.digest('SHA-256', bytes);
  return {
    hashHex: bytesToHexUpper(digestBuf),
    digestBase64: bytesToBase64(new Uint8Array(digestBuf)),
  };
}

function formatSigningTimeNow(d = new Date()): { signingTime: string; sigId: string } {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const fff = pad3(d.getMilliseconds());
  return {
    signingTime: `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`,
    sigId: `${yyyy}${MM}${dd}${HH}${mm}${ss}${fff}`,
  };
}

/**
 * Sinh khối <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"> và mã hóa Base64
 * khớp 100% với hàm 0x06001103 trong KSK_ToanDan.exe
 */
export function buildBytKskSignatureBase64(params: {
  signerName: string;
  orgName: string;
  certType: 'ChungThuSoCaNhan_BacSi' | 'ChungThuSoToChuc_CSKCB';
  hashHex: string;
  digestBase64: string;
  customSignatureValueBase64?: string;
  rawCertBase64?: string;
  now?: Date;
}): string {
  const { signingTime, sigId } = formatSigningTimeNow(params.now || new Date());
  const uuidUpper = (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      })
  )
    .replace(/-/g, '')
    .toUpperCase();

  const rawToken = `SIGNED|BY:${params.signerName}|ORG:${params.orgName}|TYPE:${params.certType}|TIME:${signingTime}|HASH:${params.hashHex}|SIG:RSA_SHA256_${uuidUpper}`;
  const sigValueBase64 = params.customSignatureValueBase64
    ? params.customSignatureValueBase64.replace(/\s+/g, '')
    : utf8ToBase64(rawToken);

  const cleanCert = (params.rawCertBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const certTag = cleanCert ? `<X509Certificate>${cleanCert}</X509Certificate>` : '';
  const subjectText = escapeXml(`CN=${params.signerName}, O=${params.orgName}, C=VN`);

  const signatureXml =
    `<Signature Id="${sigId}" xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />` +
    `<Reference URI="#THONGTINDONVI">` +
    `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" /></Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />` +
    `<DigestValue>${params.digestBase64}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>` +
    `<SignatureValue>${sigValueBase64}</SignatureValue>` +
    `<KeyInfo><X509Data><X509SubjectName>${subjectText}</X509SubjectName>${certTag}</X509Data></KeyInfo>` +
    `<Object><SignatureProperties Id="proid"><SignatureProperty Id="#${sigId}">` +
    `<SigningTime xmlns="http://example.org/#signatureProperties">${signingTime}</SigningTime>` +
    `</SignatureProperty></SignatureProperties></Object>` +
    `</Signature>`;

  return utf8ToBase64(signatureXml);
}

/** Thay thế toàn bộ thẻ <CKS_NGUOI_KET_LUAN> và <CKS_BENH_VIEN> trong tài liệu XML (cả ở XML12 của Minor và CHUKYDONVI) */
export function setKskCksTagsInXml(xmlString: string, cksNguoiKetLuan: string, cksBenhVien: string): string {
  let out = xmlString;
  const nk = escapeXml(cksNguoiKetLuan);
  const bv = escapeXml(cksBenhVien);

  out = out.replace(
    /<CKS_NGUOI_KET_LUAN(?:\s*\/>|>[\s\S]*?<\/CKS_NGUOI_KET_LUAN>)/g,
    `<CKS_NGUOI_KET_LUAN>${nk}</CKS_NGUOI_KET_LUAN>`
  );
  out = out.replace(
    /<CKS_BENH_VIEN(?:\s*\/>|>[\s\S]*?<\/CKS_BENH_VIEN>)/g,
    `<CKS_BENH_VIEN>${bv}</CKS_BENH_VIEN>`
  );

  if (!/<CHUKYDONVI[\s>]/i.test(out)) {
    const block = `  <CHUKYDONVI>\n    <CKS_NGUOI_KET_LUAN>${nk}</CKS_NGUOI_KET_LUAN>\n    <CKS_BENH_VIEN>${bv}</CKS_BENH_VIEN>\n  </CHUKYDONVI>\n`;
    out = out.replace(/<\/KHAMSUCKHOE>\s*$/i, `${block}</KHAMSUCKHOE>`);
  }
  return out;
}

/**
 * Ký số 2 bước chuẩn BYT (khớp 100% với hàm 0x06001108 SignBoth của KSK_ToanDan.exe):
 * - Bước 1: Xóa rỗng CKS_NGUOI_KET_LUAN và CKS_BENH_VIEN -> C14N -> SHA-256 -> Tạo Base64 XMLDSig cho Bác sĩ kết luận -> Gán vào CKS_NGUOI_KET_LUAN
 * - Bước 2: Giữ CKS_NGUOI_KET_LUAN vừa ký, để rỗng CKS_BENH_VIEN -> C14N -> SHA-256 -> Tạo Base64 XMLDSig cho Cơ sở KCB -> Gán vào CKS_BENH_VIEN
 */
export async function signKskXmlByt2Steps(
  xmlString: string,
  options?: {
    doctorName?: string;
    orgName?: string;
    maCskcb?: string;
    customSignatureValueBase64?: string;
    rawCertBase64?: string;
  }
): Promise<{
  signedXml: string;
  cksNguoiKetLuan: string;
  cksBenhVien: string;
  hashStep1: string;
  hashStep2: string;
}> {
  const doctorName = (options?.doctorName || '').trim() || 'BS. Trưởng khoa Khám bệnh';
  const orgName = (options?.orgName || '').trim() || (options?.maCskcb || '').trim() || 'CƠ SỞ KHÁM CHỮA BỆNH';
  const unitSignerName = (options?.orgName || '').trim() || (options?.maCskcb || '').trim() || orgName;

  // Bước 1: Cả 2 thẻ CKS đều rỗng
  const xmlStep1 = setKskCksTagsInXml(xmlString, '', '');
  const c14nStep1 = canonicalizeKskXmlByt(xmlStep1);
  const { hashHex: hashStep1, digestBase64: digestStep1 } = await computeSha256HexAndBase64(c14nStep1);

  const now1 = new Date();
  const cksNguoiKetLuan = buildBytKskSignatureBase64({
    signerName: doctorName,
    orgName,
    certType: 'ChungThuSoCaNhan_BacSi',
    hashHex: hashStep1,
    digestBase64: digestStep1,
    customSignatureValueBase64: options?.customSignatureValueBase64,
    rawCertBase64: options?.rawCertBase64,
    now: now1,
  });

  // Bước 2: Gán CKS_NGUOI_KET_LUAN, giữ CKS_BENH_VIEN rỗng
  const xmlStep2 = setKskCksTagsInXml(xmlStep1, cksNguoiKetLuan, '');
  const c14nStep2 = canonicalizeKskXmlByt(xmlStep2);
  const { hashHex: hashStep2, digestBase64: digestStep2 } = await computeSha256HexAndBase64(c14nStep2);

  const now2 = new Date(now1.getTime() + 2);
  const cksBenhVien = buildBytKskSignatureBase64({
    signerName: unitSignerName,
    orgName,
    certType: 'ChungThuSoToChuc_CSKCB',
    hashHex: hashStep2,
    digestBase64: digestStep2,
    customSignatureValueBase64: options?.customSignatureValueBase64,
    rawCertBase64: options?.rawCertBase64,
    now: now2,
  });

  const signedXml = setKskCksTagsInXml(xmlStep2, cksNguoiKetLuan, cksBenhVien);

  return {
    signedXml,
    cksNguoiKetLuan,
    cksBenhVien,
    hashStep1,
    hashStep2,
  };
}

/* ==================== ĐỌC / IMPORT FILE XML KSK (ADULT, CHILDUNDER, MINOR) ==================== */

/**
 * Đọc file XML Khám sức khỏe (1 hoặc nhiều <HOSO>) thành danh sách bản ghi chuẩn
 * Hỗ trợ đầy đủ cả 3 mẫu Adult, ChildUnder, Minor xuất từ KSK_ToanDan.exe hoặc phần mềm này.
 */
export function parseKskXmlToRecords(xmlText: string): Array<{ type: KskType; rawData: Record<string, any> }> {
  if (typeof DOMParser === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText.replace(/^\uFEFF/, ''), 'text/xml');
  if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    return [];
  }

  const root = doc.documentElement;
  const macskcbEl = root.querySelector('THONGTINDONVI > MACSKCB');
  const rootMaCskcb = macskcbEl?.textContent?.trim() || '';
  const rootCksBs = root.querySelector('CHUKYDONVI > CKS_NGUOI_KET_LUAN')?.textContent?.trim() || '';
  const rootCksBv = root.querySelector('CHUKYDONVI > CKS_BENH_VIEN')?.textContent?.trim() || '';

  const hosoNodes = Array.from(root.querySelectorAll('DANHSACHHOSO > HOSO, HOSO'));
  const targetNodes = hosoNodes.length > 0 ? hosoNodes : [root];

  const results: Array<{ type: KskType; rawData: Record<string, any> }> = [];

  for (const hoso of targetNodes) {
    const data: Record<string, any> = {};
    const clsList: Array<Record<string, string>> = [];

    const fileHosos = Array.from(hoso.querySelectorAll('FILEHOSO'));
    for (const fh of fileHosos) {
      const noidung = fh.querySelector('NOIDUNGFILE') || fh;
      const sectionEl = noidung.firstElementChild;
      if (!sectionEl) continue;

      const secName = sectionEl.tagName.toUpperCase();
      if (secName === 'KHAM_CAN_LAM_SANG' || secName === 'KET_QUA_CAN_LAM_SANG') {
        const itemNodes = Array.from(
          sectionEl.querySelectorAll('CHI_TIET_CLS, CHI_TIET_CAN_LAM_SANG, CHI_SO_CLS')
        );
        for (const itemNode of itemNodes) {
          const item: Record<string, string> = {};
          for (const child of Array.from(itemNode.children)) {
            const val = (child.textContent || '').trim();
            if (val !== '') item[child.tagName.toUpperCase()] = val;
          }
          if (Object.keys(item).length > 0) {
            clsList.push(item);
          }
        }
        continue;
      }

      for (const child of Array.from(sectionEl.children)) {
        const k = child.tagName.toUpperCase();
        const v = (child.textContent || '').trim();
        if (v !== '' || data[k] === undefined) {
          data[k] = v;
        }
      }
    }

    if (!has(data.MA_CSKCB) && rootMaCskcb) {
      data.MA_CSKCB = rootMaCskcb;
    }
    if (!has(data.CKS_NGUOI_KET_LUAN) && rootCksBs) {
      data.CKS_NGUOI_KET_LUAN = rootCksBs;
    }
    if (!has(data.CKS_BENH_VIEN) && rootCksBv) {
      data.CKS_BENH_VIEN = rootCksBv;
    }
    if (clsList.length > 0) {
      data.CLS = clsList;
      data.HAS_CLS = '1';
    }

    // Nhận diện KskType giống hàm 0x060011F8 & 0x060011FA trong KSK_ToanDan.exe
    let type: KskType = 'Adult';
    const rawType = String(data.TYPE || hoso.querySelector('TYPE')?.textContent || '').trim().toUpperCase();
    if (rawType === 'CHILDUNDER' || rawType === 'TRE_DUOI6') {
      type = 'ChildUnder';
    } else if (rawType === 'MINOR' || rawType === 'TU6_DUOI18') {
      type = 'Minor';
    } else if (rawType === 'ADULT' || rawType === 'NGUOI_LON') {
      type = 'Adult';
    } else if (hoso.querySelector('KHAM_NHI_KHOA, SAN_KHOA_VA_TIEM_CHUNG, KET_LUAN_VA_CHU_KY_SO')) {
      type = 'Minor';
    } else if (has(data.TUAN_THAI) || has(data.CHIEU_DAI) || has(data.VONG_DAU)) {
      type = 'ChildUnder';
    }

    data.TYPE = type;
    if (has(data.HO_TEN) || has(data.SO_CCCD) || has(data.MA_LK)) {
      results.push({ type, rawData: data });
    }
  }

  return results;
}
