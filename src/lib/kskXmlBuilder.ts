/**
 * BỘ SINH XML KHÁM SỨC KHỎE (EMRHUB)
 * -------------------------------------------------------------------------
 * Cấu trúc bám theo "TAILIEU/kham suc khoe/sample xml (final).xml" gồm 12 file con:
 *   XML1  THONG_TIN_HANH_CHINH
 *   XML2  THONG_TIN_CHUNG_VE_LAN_KHAM        (TYPE: Adult | ChildUnder | Minor)
 *   XML3  DANH_GIA_DAU_HIEU_SINH_TON         ┐
 *   XML4  DANH_GIA_DINH_DUONG                │
 *   XML5  DANH_GIA_PHAT_TRIEN_TINH_THAN_VAN_DONG │ chỉ mẫu dưới 6 tuổi
 *   XML6  DANH_GIA_TIEM_CHUNG                │
 *   XML8  KET_LUAN_VA_TU_VAN                 ┘
 *   XML7  KHAM_LAM_SANG                      (mọi mẫu)
 *   XML9  TIEN_SU_BENH_TAT                   ┐
 *   XML10 KHAM_THE_LUC                       │ mẫu 6-18 tuổi và trên 18 tuổi
 *   XML11 KHAM_CAN_LAM_SANG                  │
 *   XML12 KET_LUAN_VA_TU_VAN                 ┘
 * Mỗi bản ghi chỉ sinh các file con đúng với loại mẫu (record.TYPE).
 */

import type { KskType } from './kskSchemas';

// Thứ tự thẻ theo mẫu XML1 trong tài liệu đặc tả EMRHub (TT25/2026)
// Đúng thứ tự chuẩn 100% theo sample xml (final).xml dòng 17-45:
const X1_KEYS = [
  'HO_TEN', 'NGAY_SINH', 'SO_CCCD', 'TUAN_THAI', 'SINH_NON', 'GIOI_TINH', 'MA_DAN_TOC',
  'NHOM_MAU', 'DIA_CHI', 'MATINH_CU_TRU', 'MAXA_CU_TRU',
  'HO_TEN_NGUOI_DI_CUNG', 'SO_CCCD_NGUOI_DI_CUNG', 'MOI_QUAN_HE_VOI_TRE', 'DIEN_THOAI_NGUOI_DI_CUNG',
  'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'TS_TIEP_XUC_LAO',
  'DIEN_THOAI', 'NGAYCAP_CCCD', 'NOICAP_CCCD',
  'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIEN_THOAI_NGH',
  'LY_DO_VV', 'MA_NGHE_NGHIEP', 'NOI_LAM_VIEC_HOC_TAP',
];

/** Tiền sử đã nằm ở XML9 với mẫu 6-18 / trên 18 nên không lặp lại ở XML1 */
const X1_TS_KEYS = new Set(['TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'TS_TIEP_XUC_LAO']);

// Thứ tự thẻ theo mẫu XML2 chuẩn 100% theo sample xml (final).xml dòng 53-60:
const X2_KEYS = ['MA_CSKCB', 'MA_GTIN_CSKCB', 'MA_LK', 'DOI_TUONG', 'NGUON_CHI_TRA', 'MA_LOAI_KCB', 'NGAY_VAO', 'TYPE'];

// XML3 chuẩn 100% dòng 68-73:
const X3_KEYS = ['NHIET_DO', 'DGDHST_NHIET_DO', 'MACH', 'DGDHST_MACH', 'NHIP_THO', 'DGDHST_NHIP_THO'];

// XML4 chuẩn 100% dòng 81-93:
const X4_KEYS = [
  'CHIEU_DAI', 'CHIEU_DAI_TUOI_SD', 'CAN_NANG', 'CAN_NANG_TUOI_SD', 'VONG_DAU', 'DG_VONG_DAU', 'CHU_VI_VONG_CANH_TAY',
  'DGDD_BINH_THUONG', 'PHU_DINH_DUONG', 'DGDD_THIEU_MAU', 'DGDD_COI_XUONG', 'SUY_DINH_DUONG', 'THUA_CAN_BEO_PHI',
];

// XML5 chuẩn 100% dòng 101-103:
const X5_KEYS = ['PT_TTBT_THEO_DO_TUOI', 'PT_VDBT_THEO_DO_TUOI', 'NGUY_CO_TU_KY'];

// XML6 chuẩn 100% dòng 111-113:
const X6_KEYS = ['TIEM_CHUNG_BCG_SS', 'TIEM_CHUNG_VGB_SS_MUI1', 'TIEM_CHUNG_DAY_DU_THEO_DO_TUOI'];

// XML7 chuẩn 100% theo 116 thẻ trong sample xml (final).xml dòng 121-224:
const X7_KEYS = [
  'MAU_SAC_DA', 'LONG_BAN_TAY', 'THOP', 'HINH_DANG_DAU', 'VAN_DONG_CO', 'KHOI_BAT_THUONG_DAU_CO', 'CKDT_DA_DAU_CO',
  'VI_TRI_HAI_MAT', 'MI_MAT_KET_MAC', 'LAC_MAT', 'DONG_TU', 'TAI_MANG_NHI', 'DAP_UNG_AM_THANH',
  'KHOI_SUNG_SAU_TAI', 'CHAY_MU_NUOC_TAI', 'HINH_DANG_MUI', 'CHAY_NUOC_MUI', 'NGHET_MUI', 'HONG', 'CKDT_MAT_TAI_MUI_HONG',
  'HINH_DANG_MIENG', 'RANG_SUA_SO_SINH', 'HINH_DANG_LUOI', 'DINH_THANG_LUOI', 'NAM_MIENG', 'CAM_NHO_TUT_VE_SAU',
  'SAU_MANG_BAM_LO', 'CKDT_MIENG_RANG', 'NHIP_THO_KHONG_DEU', 'THO_RUT_LOM_LONG_NGUC', 'TIENG_THO_BAT_THUONG', 'SUY_HO_HAP',
  'NGHE_PHOI', 'VI_TRI_MOM_TIM', 'MACH_NGOAI_VI', 'TIENG_TIM', 'CKDT_HO_HAP_TIM_MACH', 'HINH_DANG_BUNG_RON', 'GAN_LACH_TO',
  'KHOI_BAT_THUONG', 'LO_HAU_MON', 'CO_QUAN_SINH_DUC_NGOAI', 'CKDT_BUNG_SINH_DUC', 'VAN_DONG_KHONG_DOI_XUNG', 'PHAN_XA_BU',
  'PHAN_XA_NAM', 'PHAN_XA_MORO', 'TRUONG_LUC_CO', 'KHOP_HANG', 'PHAN_XA_CO', 'KIEM_TRA_LUNG_COT_SONG',
  'TU_CHI_KHOP', 'QUAN_SAT_DANG_DI', 'CKDT_THAN_KINH_CO_XUONG_KHOP', 'NHI_KHOA_TUAN_HOAN', 'CKDT_NHI_KHOA_TUAN_HOAN', 'NHI_KHOA_HO_HAP',
  'CKDT_NHI_KHOA_HO_HAP', 'NHI_KHOA_TIEU_HOA', 'CKDT_NHI_KHOA_TIEU_HOA', 'NHI_KHOA_THAN_TN_SD',
  'CKDT_NHI_KHOA_THAN_TN_SD', 'NHI_KHOA_THAN_KINH', 'CKDT_NHI_KHOA_THAN_KINH', 'NHI_KHOA_TAM_THAN',
  'CKDT_NHI_KHOA_TAM_THAN', 'NHI_KHOA_LAM_SANG_KHAC', 'CKDT_NHI_KHOA_LAM_SANG_KHAC', 'KHONG_KINH_MAT_PHAI',
  'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT', 'CKDT_KHAM_MAT',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_TAI_MUI_HONG',
  'CKDT_KHAM_TAI_MUI_HONG', 'HAM_TREN', 'HAM_DUOI', 'BENH_RANG_HAM_MAT', 'CKDT_KHAM_RANG_HAM_MAT',
  'NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_TUAN_HOAN_PL', 'CKDT_NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_HO_HAP',
  'NOI_KHOA_HO_HAP_PL', 'CKDT_NOI_KHOA_HO_HAP', 'NOI_KHOA_TIEU_HOA', 'NOI_KHOA_TIEU_HOA_PL',
  'CKDT_NOI_KHOA_TIEU_HOA', 'NOI_KHOA_THAN_TN_SD', 'NOI_KHOA_THAN_TN_SD_PL', 'CKDT_NOI_KHOA_THAN_TN_SD',
  'NOI_KHOA_NOI_TIET', 'NOI_KHOA_NOI_TIET_PL', 'CKDT_NOI_KHOA_NOI_TIET', 'NOI_KHOA_CO_XUONG_KHOP',
  'NOI_KHOA_CO_XUONG_KHOP_PL', 'CKDT_NOI_KHOA_CO_XUONG_KHOP', 'NOI_KHOA_THAN_KINH', 'NOI_KHOA_THAN_KINH_PL',
  'CKDT_NOI_KHOA_THAN_KINH', 'NOI_KHOA_TAM_THAN', 'NOI_KHOA_TAM_THAN_PL', 'CKDT_NOI_KHOA_TAM_THAN',
  'KET_QUA_KHAM_NGOAI_KHOA', 'KHAM_NGOAI_KHOA_PL', 'CKDT_KHAM_NGOAI_KHOA', 'KET_QUA_KHAM_DA_LIEU',
  'KHAM_DA_LIEU_PL', 'CKDT_KHAM_DA_LIEU', 'KET_QUA_KHAM_SAN_PHU_KHOA', 'KHAM_SAN_PHU_KHOA_PL',
  'CKDT_KHAM_SAN_PHU_KHOA', 'KHAM_MAT_PL', 'BENH_KHAC_TAI_MUI_HONG', 'KHAM_TAI_MUI_HONG_PL',
  'BENH_KHAC_RANG_HAM_MAT', 'KHAM_RANG_HAM_MAT_PL',
];

// XML8 chuẩn 100% dòng 228-234:
const X8_KEYS = [
  'BINH_THUONG', 'NGUY_CO_MAC_LAO', 'VAN_DE_SUC_KHOE', 'KET_LUAN_BENH', 'GHI_RO_VAN_DE_SUC_KHOE', 'HEN_KHAM_LAN_SAU',
  'CHUYEN_CSKCB',
];

// XML9 chuẩn 100% theo 43 thẻ trong sample xml (final).xml dòng 258-300:
const X9_KEYS = [
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

// XML10 chuẩn 100% theo sample xml (final).xml dòng 307-314: dùng thẻ <CHI_SO_BMI>
const X10_KEYS = ['CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'MACH', 'HUYET_AP', 'KHAM_THE_LUC_PL'];

// XML12 chuẩn 100% theo sample xml (final).xml dòng 347-357:
const X12_KEYS = [...X8_KEYS, 'PHAN_LOAI_SK', 'CAC_VAN_DE_SUC_KHOE', 'CAC_BENH_TAT_NEU_CO'];

interface SectionDef {
  file: number;
  tag: string;
  keys: string[];
  /** Luôn sinh đầy đủ thẻ (không bỏ qua khi trống) */
  always?: boolean;
  /** Section đặc biệt: danh sách chỉ số cận lâm sàng */
  cls?: boolean;
}

const SEC = {
  X1: (_type: KskType): SectionDef => ({
    file: 1, tag: 'THONG_TIN_HANH_CHINH', always: true,
    keys: X1_KEYS,
  }),
  X2: { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: X2_KEYS, always: true } as SectionDef,
  X3: { file: 3, tag: 'DANH_GIA_DAU_HIEU_SINH_TON', keys: X3_KEYS, always: true } as SectionDef,
  X4: { file: 4, tag: 'DANH_GIA_DINH_DUONG', keys: X4_KEYS, always: true } as SectionDef,
  X5: { file: 5, tag: 'DANH_GIA_PHAT_TRIEN_TINH_THAN_VAN_DONG', keys: X5_KEYS, always: true } as SectionDef,
  X6: { file: 6, tag: 'DANH_GIA_TIEM_CHUNG', keys: X6_KEYS, always: true } as SectionDef,
  X7: { file: 7, tag: 'KHAM_LAM_SANG', keys: X7_KEYS, always: true } as SectionDef,
  X8: { file: 8, tag: 'KET_LUAN_VA_TU_VAN', keys: X8_KEYS, always: true } as SectionDef,
  X9: { file: 9, tag: 'TIEN_SU_BENH_TAT', keys: X9_KEYS, always: true } as SectionDef,
  X10: { file: 10, tag: 'KHAM_THE_LUC', keys: X10_KEYS, always: true } as SectionDef,
  X11: { file: 11, tag: 'KHAM_CAN_LAM_SANG', keys: [], cls: true, always: true } as SectionDef,
  X12: { file: 12, tag: 'KET_LUAN_VA_TU_VAN', keys: X12_KEYS, always: true } as SectionDef,
};

/* ---- Cấu trúc mẫu Adult theo file đã được Cổng tiếp nhận thành công (2600060109_xml mẫu ksk.xml) ---- */
const ADULT_X1_KEYS = [
  'HO_TEN', 'GIOI_TINH', 'NGAY_SINH', 'TUAN_THAI', 'SINH_NON', 'MA_DAN_TOC', 'SO_CCCD', 'NGAYCAP_CCCD', 'NOICAP_CCCD',
  'NHOM_MAU', 'DIA_CHI', 'MATINH_CU_TRU', 'MAXA_CU_TRU', 'DIEN_THOAI', 'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIEN_THOAI_NGH',
  'HO_TEN_NGUOI_DI_CUNG', 'SO_CCCD_NGUOI_DI_CUNG', 'MOI_QUAN_HE_VOI_TRE', 'DIEN_THOAI_NGUOI_DI_CUNG',
  'MA_NGHE_NGHIEP', 'NOI_LAM_VIEC_HOC_TAP', 'LY_DO_VV',
];
const ADULT_X2_KEYS = ['MA_LK', 'MA_CSKCB', 'MA_GTIN_CSKCB', 'DOI_TUONG', 'NGUON_CHI_TRA', 'MA_LOAI_KCB', 'TYPE', 'NGAY_VAO'];
const ADULT_X7_KEYS = [
  'KHONG_KINH_MAT_PHAI', 'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_TAI_MUI_HONG',
  'HAM_TREN', 'HAM_DUOI', 'BENH_RANG_HAM_MAT',
  'NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_TUAN_HOAN_PL', 'NOI_KHOA_HO_HAP', 'NOI_KHOA_HO_HAP_PL',
  'NOI_KHOA_TIEU_HOA', 'NOI_KHOA_TIEU_HOA_PL', 'NOI_KHOA_THAN_TN_SD', 'NOI_KHOA_THAN_TN_SD_PL',
  'NOI_KHOA_NOI_TIET', 'NOI_KHOA_NOI_TIET_PL', 'NOI_KHOA_CO_XUONG_KHOP', 'NOI_KHOA_CO_XUONG_KHOP_PL',
  'NOI_KHOA_THAN_KINH', 'NOI_KHOA_THAN_KINH_PL', 'NOI_KHOA_TAM_THAN', 'NOI_KHOA_TAM_THAN_PL',
  'KET_QUA_KHAM_NGOAI_KHOA', 'KHAM_NGOAI_KHOA_PL', 'KET_QUA_KHAM_DA_LIEU', 'KHAM_DA_LIEU_PL',
  'KET_QUA_KHAM_SAN_PHU_KHOA', 'KHAM_SAN_PHU_KHOA_PL',
];
const ADULT_X9_KEYS = [
  'TIEN_SU_GIA_DINH',
  'TSGD_MAC_BENH',
  'TSGD_MA_BENH',
  'TIEN_SU_BAN_THAN',
  'BENH_TAT_KHAC',
  'DANG_DIEU_TRI_BENH',
  'TIEN_SU_SAN_PHU_KHOA',
];
const ADULT_X10_KEYS = ['CHIEU_CAO', 'CAN_NANG', 'BMI', 'MACH', 'HUYET_AP', 'KHAM_THE_LUC_PL'];
const ADULT_X12_KEYS = ['PHAN_LOAI_SK', 'KET_LUAN_BENH', 'CAC_VAN_DE_SUC_KHOE', 'CAC_BENH_TAT_NEU_CO'];

/* ---- Mẫu 6 - dưới 18 tuổi (Minor): các cột đúng theo Import_KSK_6 den Duoi 18.xlsm ---- */
const MINOR_X7_KEYS = [
  'NHI_KHOA_TUAN_HOAN', 'NHI_KHOA_HO_HAP', 'NHI_KHOA_TIEU_HOA', 'NHI_KHOA_THAN_TN_SD', 'NHI_KHOA_THAN_KINH',
  'NHI_KHOA_TAM_THAN', 'NHI_KHOA_LAM_SANG_KHAC',
  'KHONG_KINH_MAT_PHAI', 'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_KHAC_TAI_MUI_HONG',
  'HAM_TREN', 'HAM_DUOI', 'BENH_KHAC_RANG_HAM_MAT',
];
const MINOR_X9_KEYS = [
  'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'SAN_KHOA', 'SAN_KHOA_KHONG_BT', 'MA_BENH_SAN_KHOA_KHONG_BT',
  'TIEM_CHUNG_BCG', 'TIEM_CHUNG_BH_HG_UV', 'TIEM_CHUNG_SOI', 'TIEM_CHUNG_BAI_LIET', 'TIEM_CHUNG_VNNB_B',
  'TIEM_CHUNG_VGB', 'TIEM_CHUNG_CAC_LOAI_KHAC', 'TIEM_CHUNG_VAC_XIN_KHAC',
  'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSBT_DANG_DIEU_TRI_BENH', 'BENH_DANG_DIEU_TRI',
];

export function getKskSections(type: KskType): SectionDef[] {
  if (type === 'ChildUnder') {
    return [SEC.X1(type), SEC.X2, SEC.X3, SEC.X4, SEC.X5, SEC.X6, SEC.X7, SEC.X8];
  }
  if (type === 'Adult') {
    return [
      { file: 1, tag: 'THONG_TIN_HANH_CHINH', keys: ADULT_X1_KEYS, always: true },
      { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: ADULT_X2_KEYS, always: true },
      { file: 7, tag: 'KHAM_LAM_SANG', keys: ADULT_X7_KEYS, always: true },
      { file: 9, tag: 'TIEN_SU_BENH_TAT', keys: ADULT_X9_KEYS, always: true },
      { file: 10, tag: 'KHAM_THE_LUC', keys: ADULT_X10_KEYS, always: true },
      SEC.X11,
      { file: 12, tag: 'KET_LUAN', keys: ADULT_X12_KEYS, always: true },
    ];
  }
  // Minor (6 - dưới 18 tuổi)
  return [
    { file: 1, tag: 'THONG_TIN_HANH_CHINH', keys: ADULT_X1_KEYS, always: true },
    { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: ADULT_X2_KEYS, always: true },
    { file: 7, tag: 'KHAM_LAM_SANG', keys: MINOR_X7_KEYS, always: true },
    { file: 9, tag: 'TIEN_SU_BENH_TAT', keys: MINOR_X9_KEYS, always: true },
    { file: 10, tag: 'KHAM_THE_LUC', keys: ADULT_X10_KEYS, always: true },
    SEC.X11,
    { file: 12, tag: 'KET_LUAN_VA_TU_VAN', keys: ['PHAN_LOAI_SK', 'KET_LUAN_BENH', 'CAC_VAN_DE_SUC_KHOE'], always: true },
  ];
}

/** Dùng cho kiểm tra đối chiếu: toàn bộ thẻ XML được hỗ trợ */
export const KSK_SUPPORTED_TAGS: Set<string> = new Set([
  ...ADULT_X1_KEYS, ...ADULT_X2_KEYS, ...ADULT_X7_KEYS, ...ADULT_X9_KEYS, ...ADULT_X10_KEYS, ...ADULT_X12_KEYS,
  ...MINOR_X7_KEYS, ...MINOR_X9_KEYS, 'BMI', 'TEN_CHI_SO',
  ...X1_KEYS, ...X2_KEYS, ...X3_KEYS, ...X4_KEYS, ...X5_KEYS, ...X6_KEYS, ...X7_KEYS,
  ...X8_KEYS, ...X9_KEYS, ...X10_KEYS, ...X12_KEYS,
]);

const escapeXml = (v: any): string =>
  String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const has = (v: any) => v !== undefined && v !== null && String(v) !== '';

/** Kết quả CLS dạng số: bắt buộc dấu chấm thập phân (Parquet) */
const fixDecimal = (v: any): string => {
  const s = String(v).trim();
  return /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s;
};

function resolveType(record: any): KskType {
  const tp = record?.TYPE;
  return tp === 'ChildUnder' || tp === 'Minor' || tp === 'Adult' ? tp : 'Adult';
}

export function buildKskXml(records: any[], maCskcb: string): string {
  const now = new Date();
  const ngayLap =
    now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');

  // Mã đơn vị ở thẻ MACSKCB là mã GLN 13 số
  const donVi = records[0]?.MA_GTIN_CSKCB || maCskcb;

  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<KHAMSUCKHOE xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n';
  xml += '  <THONGTINDONVI>\n';
  xml += `    <MACSKCB>${escapeXml(donVi)}</MACSKCB>\n`;
  xml += '  </THONGTINDONVI>\n';
  xml += '  <THONGTINHOSO>\n';
  xml += `    <NGAYLAP>${ngayLap}</NGAYLAP>\n`;
  xml += `    <SOLUONGHOSO>${records.length}</SOLUONGHOSO>\n`;
  xml += '    <DANHSACHHOSO>\n';

  records.forEach(record => {
    const type = resolveType(record);
    const data: Record<string, any> = { ...record, TYPE: type };

    // Đồng bộ chỉ số BMI theo đúng chuẩn thẻ <CHI_SO_BMI> trong sample xml (final).xml dòng 310
    if (!has(data.CHI_SO_BMI) && has(data.BMI)) {
      data.CHI_SO_BMI = data.BMI;
    } else if (has(data.CHI_SO_BMI)) {
      const n = parseFloat(String(data.CHI_SO_BMI).replace(',', '.'));
      if (!isNaN(n)) data.CHI_SO_BMI = n.toFixed(1);
    }

    // BMI: mẫu Adult dùng thẻ <BMI>, các mẫu khác dùng <CHI_SO_BMI>
    if (has(data.CHI_SO_BMI) && !has(data.BMI)) data.BMI = data.CHI_SO_BMI;

    // Tự động tổng hợp dữ liệu Tiền sử bệnh tật XML9 (Adult) theo file mãu đã lên 18t.txt
    if (type === 'Adult') {
      if (!has(data.TUAN_THAI)) data.TUAN_THAI = '0';
      if (!has(data.SINH_NON)) data.SINH_NON = '0';
      if (!has(data.MOI_QUAN_HE_VOI_TRE)) data.MOI_QUAN_HE_VOI_TRE = '0';
      if (!has(data.TSGD_MAC_BENH)) data.TSGD_MAC_BENH = '0';

      if (!has(data.TIEN_SU_GIA_DINH)) {
        data.TIEN_SU_GIA_DINH =
          data.TSGD_MAC_BENH === '1' || has(data.TSGD_MA_BENH)
            ? `Có mắc bệnh${data.TSGD_MA_BENH ? ` (${data.TSGD_MA_BENH})` : ''}`
            : 'Không phát hiện bất thường';
      }
      if (!has(data.TIEN_SU_BAN_THAN)) {
        const positiveConditions: string[] = [];
        if (data.TSBT_BENH_TRONG_5_NAM_QUA === '1') positiveConditions.push('Bệnh trong 5 năm qua');
        if (data.TSBT_BENH_THAN_KINH === '1') positiveConditions.push('Bệnh thần kinh');
        if (data.TSBT_BENH_MAT === '1') positiveConditions.push('Bệnh mắt');
        if (data.TSBT_BENH_TAI === '1') positiveConditions.push('Bệnh tai');
        if (data.TSBT_BENH_TIM === '1') positiveConditions.push('Bệnh tim');
        if (data.TSBT_PHAU_THUAT_TIM === '1') positiveConditions.push('Phẫu thuật can thiệp tim');
        if (data.TSBT_TANG_HUYET_AP === '1') positiveConditions.push('Tăng huyết áp');
        if (data.TSBT_KHO_THO === '1') positiveConditions.push('Khó thở');
        if (data.TSBT_BENH_PHOI === '1') positiveConditions.push('Bệnh phổi');
        if (data.TSBT_BENH_THAN === '1') positiveConditions.push('Bệnh thận');
        if (data.TSBT_NGHIEN_RUOU === '1') positiveConditions.push('Nghiện rượu');
        if (data.TSBT_DAI_THAO_DUONG === '1') positiveConditions.push('Đái tháo đường');
        if (data.TSBT_BENH_TAM_THAN === '1') positiveConditions.push('Bệnh tâm thần');
        if (data.TSBT_MAT_Y_THUC === '1') positiveConditions.push('Mất ý thức');
        if (data.TSBT_NGAT === '1') positiveConditions.push('Ngất');
        if (data.TSBT_BENH_TIEU_HOA === '1') positiveConditions.push('Bệnh tiêu hóa');
        if (data.TSBT_ROI_LOAN_GIAC_NGU === '1') positiveConditions.push('Rối loạn giấc ngủ');
        if (data.TSBT_TAI_BIEN === '1') positiveConditions.push('Tai biến');
        if (data.TSBT_BENH_COT_SONG === '1') positiveConditions.push('Bệnh cột sống');
        if (data.TSBT_RUOU_THUONG_XUYEN === '1') positiveConditions.push('Rượu thường xuyên');
        if (data.TSBT_MA_TUY === '1') positiveConditions.push('Ma túy');

        if (positiveConditions.length > 0) {
          data.TIEN_SU_BAN_THAN = positiveConditions.join(', ');
        } else if (data.TSBT_MAC_BENH === '1' && has(data.TSBT_MA_BENH)) {
          data.TIEN_SU_BAN_THAN = `Mắc bệnh mã ICD: ${data.TSBT_MA_BENH}`;
        } else {
          data.TIEN_SU_BAN_THAN = 'Khỏe mạnh, không tiền sử bệnh mạn tính';
        }
      }
      if (!has(data.BENH_TAT_KHAC)) {
        data.BENH_TAT_KHAC = data.TSBT_BENH_KHAC || data.TSBT_MA_BENH_KHAC || '';
      }
      if (!has(data.DANG_DIEU_TRI_BENH)) {
        data.DANG_DIEU_TRI_BENH =
          data.TSBT_TEN_THUOC_LIEU_LUONG || data.TSBT_DANG_DIEU_TRI_BENH || data.BENH_DANG_DIEU_TRI || '';
      }
      if (!has(data.TIEN_SU_SAN_PHU_KHOA)) {
        data.TIEN_SU_SAN_PHU_KHOA =
          data.TSBT_THAI_SAN === '1'
            ? data.TSBT_TEN_THUOC_THAI_SAN || data.TSBT_MA_BENH_THAI_SAN || 'Có tiền sử thai sản'
            : 'Bình thường';
      }
    }

    xml += '      <HOSO>\n';
    if (type === 'Adult' || type === 'Minor') xml += `        <TYPE>${type}</TYPE>\n`;

    for (const sec of getKskSections(type)) {
      let body = '';

      if (sec.cls) {
        const list: any[] = Array.isArray(data.CLS) ? data.CLS : [];
        body += '              <DANH_SACH_CLS>\n';
        for (const item of list) {
          body += '                <CHI_TIET_CLS>\n';
          // Thứ tự chuẩn theo sample xml (final).xml dòng 321-343:
          // MA_DICH_VU -> MA_CHI_SO -> GIA_TRI -> DON_VI_DO -> MO_TA -> KET_LUAN -> CKDT_KET_QUA_CLS
          const isAdult = type === 'Adult' || type === 'Minor';
          // Adult (mẫu đã lên cổng): MA_DICH_VU, MA_CHI_SO, TEN_CHI_SO, GIA_TRI, DON_VI_DO, MO_TA, KET_LUAN (CDATA, không có CKDT)
          const clsKeys = isAdult
            ? ['MA_DICH_VU', 'MA_CHI_SO', 'TEN_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN']
            : ['MA_DICH_VU', 'MA_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN', 'CKDT_KET_QUA_CLS'];
          for (const k of clsKeys) {
            let raw = item[k];
            if ((k === 'GIA_TRI' || k === 'MO_TA') && has(raw)) raw = fixDecimal(raw);
            if (isAdult && k !== 'MA_DICH_VU' && k !== 'MA_CHI_SO') {
              const v = has(raw) ? String(raw).replace(/]]>/g, ']]]]><![CDATA[>') : '';
              body += `                  <${k}><![CDATA[${v}]]></${k}>\n`;
            } else if (has(raw)) {
              let val = String(raw);
              if (k.startsWith('CKDT_') && val.includes('base64,')) {
                val = val.split('base64,')[1];
              }
              body += `                  <${k}>${escapeXml(val)}</${k}>\n`;
            } else {
              body += `                  <${k}></${k}>\n`;
            }
          }
          body += '                </CHI_TIET_CLS>\n';
        }
        body += '              </DANH_SACH_CLS>\n';
      } else {
        for (const tag of sec.keys) {
          if (['TIEN_SU_GIA_DINH', 'TIEN_SU_BAN_THAN', 'TIEN_SU_SAN_PHU_KHOA'].includes(tag)) {
            const v = has(data[tag]) ? String(data[tag]).replace(/]]>/g, ']]]]><![CDATA[>') : '';
            body += `              <${tag}>\n                <![CDATA[${v}]]>\n              </${tag}>\n`;
          } else if (has(data[tag])) {
            let val = String(data[tag]);
            if (tag.startsWith('CKDT_') && val.includes('base64,')) {
              val = val.split('base64,')[1];
            }
            body += `              <${tag}>${escapeXml(val)}</${tag}>\n`;
          } else {
            // Luôn giữ nguyên cấu trúc thẻ XML, trường trống thì để trống <TAG></TAG>, không bỏ thẻ
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

  // Chữ ký số đơn vị: luôn giữ cấu trúc <CHUKYDONVI> theo mẫu chuẩn
  const ckBs = has(records[0]?.CKS_NGUOI_KET_LUAN) ? escapeXml(records[0].CKS_NGUOI_KET_LUAN) : '';
  const ckBv = has(records[0]?.CKS_BENH_VIEN) ? escapeXml(records[0].CKS_BENH_VIEN) : '';
  xml += '  <CHUKYDONVI>\n';
  xml += `    <CKS_NGUOI_KET_LUAN>${ckBs}</CKS_NGUOI_KET_LUAN>\n`;
  xml += `    <CKS_BENH_VIEN>${ckBv}</CKS_BENH_VIEN>\n`;
  xml += '  </CHUKYDONVI>\n';
  xml += '</KHAMSUCKHOE>';

  return xml;
}
