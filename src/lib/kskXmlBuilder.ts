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

const X1_KEYS = [
  'HO_TEN', 'NGAY_SINH', 'SO_CCCD', 'TUAN_THAI', 'SINH_NON', 'GIOI_TINH', 'MA_DAN_TOC', 'NHOM_MAU', 'DIA_CHI',
  'MATINH_CU_TRU', 'MAXA_CU_TRU', 'HO_TEN_NGUOI_DI_CUNG', 'SO_CCCD_NGUOI_DI_CUNG', 'MOI_QUAN_HE_VOI_TRE',
  'DIEN_THOAI_NGUOI_DI_CUNG', 'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'TS_TIEP_XUC_LAO',
  'DIEN_THOAI', 'NGAYCAP_CCCD', 'NOICAP_CCCD', 'NGUOI_GIAM_HO', 'SO_CCCD_NGH', 'DIEN_THOAI_NGH', 'LY_DO_VV',
  'MA_NGHE_NGHIEP', 'NOI_LAM_VIEC_HOC_TAP',
];
/** Tiền sử đã nằm ở XML9 với mẫu 6-18 / trên 18 nên không lặp lại ở XML1 */
const X1_TS_KEYS = new Set(['TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'TS_TIEP_XUC_LAO']);

const X2_KEYS = ['MA_CSKCB', 'MA_GTIN_CSKCB', 'MA_LK', 'DOI_TUONG', 'NGUON_CHI_TRA', 'MA_LOAI_KCB', 'NGAY_VAO', 'TYPE'];

const X3_KEYS = ['NHIET_DO', 'DGDHST_NHIET_DO', 'MACH', 'DGDHST_MACH', 'NHIP_THO', 'DGDHST_NHIP_THO'];

const X4_KEYS = [
  'CHIEU_DAI', 'CHIEU_DAI_TUOI_SD', 'CAN_NANG', 'CAN_NANG_TUOI_SD', 'VONG_DAU', 'DG_VONG_DAU', 'CHU_VI_VONG_CANH_TAY',
  'DGDD_BINH_THUONG', 'PHU_DINH_DUONG', 'DGDD_THIEU_MAU', 'DGDD_COI_XUONG', 'SUY_DINH_DUONG', 'THUA_CAN_BEO_PHI',
];

const X5_KEYS = ['PT_TTBT_THEO_DO_TUOI', 'PT_VDBT_THEO_DO_TUOI', 'NGUY_CO_TU_KY'];

const X6_KEYS = ['TIEM_CHUNG_BCG_SS', 'TIEM_CHUNG_VGB_SS_MUI1', 'TIEM_CHUNG_DAY_DU_THEO_DO_TUOI'];

const X7_KEYS = [
  'MAU_SAC_DA', 'LONG_BAN_TAY', 'THOP', 'HINH_DANG_DAU', 'VAN_DONG_CO', 'KHOI_BAT_THUONG_DAU_CO', 'CKDT_DA_DAU_CO',
  'VI_TRI_HAI_MAT', 'MI_MAT_KET_MAC', 'LAC_MAT', 'DONG_TU', 'TAI_MANG_NHI', 'DAP_UNG_AM_THANH', 'KHOI_SUNG_SAU_TAI', 'CHAY_MU_NUOC_TAI',
  'HINH_DANG_MUI', 'CHAY_NUOC_MUI', 'NGHET_MUI', 'HONG', 'CKDT_MAT_TAI_MUI_HONG',
  'HINH_DANG_MIENG', 'RANG_SUA_SO_SINH', 'HINH_DANG_LUOI', 'DINH_THANG_LUOI', 'NAM_MIENG', 'CAM_NHO_TUT_VE_SAU', 'SAU_MANG_BAM_LO', 'CKDT_MIENG_RANG',
  'NHIP_THO_KHONG_DEU', 'THO_RUT_LOM_LONG_NGUC', 'TIENG_THO_BAT_THUONG', 'SUY_HO_HAP', 'NGHE_PHOI', 'VI_TRI_MOM_TIM', 'MACH_NGOAI_VI', 'TIENG_TIM', 'CKDT_HO_HAP_TIM_MACH',
  'HINH_DANG_BUNG_RON', 'GAN_LACH_TO', 'KHOI_BAT_THUONG', 'LO_HAU_MON', 'CO_QUAN_SINH_DUC_NGOAI', 'CKDT_BUNG_SINH_DUC',
  'VAN_DONG_KHONG_DOI_XUNG', 'PHAN_XA_BU', 'PHAN_XA_NAM', 'PHAN_XA_MORO', 'TRUONG_LUC_CO', 'KHOP_HANG', 'PHAN_XA_CO', 'KIEM_TRA_LUNG_COT_SONG', 'TU_CHI_KHOP',
  'QUAN_SAT_DANG_DI', 'CKDT_THAN_KINH_CO_XUONG_KHOP',
  'NHI_KHOA_TUAN_HOAN', 'CKDT_NHI_KHOA_TUAN_HOAN', 'NHI_KHOA_HO_HAP', 'CKDT_NHI_KHOA_HO_HAP', 'NHI_KHOA_TIEU_HOA',
  'CKDT_NHI_KHOA_TIEU_HOA', 'NHI_KHOA_THAN_TN_SD', 'CKDT_NHI_KHOA_THAN_TN_SD', 'NHI_KHOA_THAN_KINH',
  'CKDT_NHI_KHOA_THAN_KINH', 'NHI_KHOA_TAM_THAN', 'CKDT_NHI_KHOA_TAM_THAN', 'NHI_KHOA_LAM_SANG_KHAC',
  'CKDT_NHI_KHOA_LAM_SANG_KHAC',
  'KHONG_KINH_MAT_PHAI', 'KHONG_KINH_MAT_TRAI', 'CO_KINH_MAT_PHAI', 'CO_KINH_MAT_TRAI', 'BENH_KHAC_MAT', 'CKDT_KHAM_MAT',
  'TAI_TRAI_NOI_THUONG', 'TAI_TRAI_NOI_THAM', 'TAI_PHAI_NOI_THUONG', 'TAI_PHAI_NOI_THAM', 'BENH_TAI_MUI_HONG',
  'CKDT_KHAM_TAI_MUI_HONG', 'HAM_TREN', 'HAM_DUOI', 'BENH_RANG_HAM_MAT', 'CKDT_KHAM_RANG_HAM_MAT',
  'NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_TUAN_HOAN_PL', 'CKDT_NOI_KHOA_TUAN_HOAN', 'NOI_KHOA_HO_HAP', 'NOI_KHOA_HO_HAP_PL',
  'CKDT_NOI_KHOA_HO_HAP', 'NOI_KHOA_TIEU_HOA', 'NOI_KHOA_TIEU_HOA_PL', 'CKDT_NOI_KHOA_TIEU_HOA', 'NOI_KHOA_THAN_TN_SD',
  'NOI_KHOA_THAN_TN_SD_PL', 'CKDT_NOI_KHOA_THAN_TN_SD', 'NOI_KHOA_NOI_TIET', 'NOI_KHOA_NOI_TIET_PL',
  'CKDT_NOI_KHOA_NOI_TIET', 'NOI_KHOA_CO_XUONG_KHOP', 'NOI_KHOA_CO_XUONG_KHOP_PL', 'CKDT_NOI_KHOA_CO_XUONG_KHOP',
  'NOI_KHOA_THAN_KINH', 'NOI_KHOA_THAN_KINH_PL', 'CKDT_NOI_KHOA_THAN_KINH', 'NOI_KHOA_TAM_THAN', 'NOI_KHOA_TAM_THAN_PL',
  'CKDT_NOI_KHOA_TAM_THAN', 'KET_QUA_KHAM_NGOAI_KHOA', 'KHAM_NGOAI_KHOA_PL', 'CKDT_KHAM_NGOAI_KHOA',
  'KET_QUA_KHAM_DA_LIEU', 'KHAM_DA_LIEU_PL', 'CKDT_KHAM_DA_LIEU', 'KET_QUA_KHAM_SAN_PHU_KHOA', 'KHAM_SAN_PHU_KHOA_PL',
  'CKDT_KHAM_SAN_PHU_KHOA', 'KHAM_MAT_PL', 'BENH_KHAC_TAI_MUI_HONG', 'KHAM_TAI_MUI_HONG_PL', 'BENH_KHAC_RANG_HAM_MAT',
  'KHAM_RANG_HAM_MAT_PL',
];

const X8_KEYS = [
  'BINH_THUONG', 'NGUY_CO_MAC_LAO', 'VAN_DE_SUC_KHOE', 'KET_LUAN_BENH', 'GHI_RO_VAN_DE_SUC_KHOE', 'HEN_KHAM_LAN_SAU',
  'CHUYEN_CSKCB',
];

const X9_KEYS = [
  'TSGD_MAC_BENH', 'TSGD_MA_BENH', 'SAN_KHOA', 'SAN_KHOA_KHONG_BT', 'MA_BENH_SAN_KHOA_KHONG_BT', 'TIEM_CHUNG_BCG',
  'TIEM_CHUNG_BH_HG_UV', 'TIEM_CHUNG_SOI', 'TIEM_CHUNG_BAI_LIET', 'TIEM_CHUNG_VNNB_B', 'TIEM_CHUNG_VGB',
  'TIEM_CHUNG_CAC_LOAI_KHAC', 'TIEM_CHUNG_VAC_XIN_KHAC', 'TSBT_MAC_BENH', 'TSBT_MA_BENH', 'TSBT_DANG_DIEU_TRI_BENH',
  'BENH_DANG_DIEU_TRI', 'TSBT_BENH_TRONG_5_NAM_QUA', 'TSBT_BENH_THAN_KINH', 'TSBT_BENH_MAT', 'TSBT_BENH_TAI',
  'TSBT_BENH_TIM', 'TSBT_PHAU_THUAT_TIM', 'TSBT_TANG_HUYET_AP', 'TSBT_KHO_THO', 'TSBT_BENH_PHOI', 'TSBT_BENH_THAN',
  'TSBT_NGHIEN_RUOU', 'TSBT_DAI_THAO_DUONG', 'TSBT_BENH_TAM_THAN', 'TSBT_MAT_Y_THUC', 'TSBT_NGAT', 'TSBT_BENH_TIEU_HOA',
  'TSBT_ROI_LOAN_GIAC_NGU', 'TSBT_TAI_BIEN', 'TSBT_BENH_COT_SONG', 'TSBT_RUOU_THUONG_XUYEN', 'TSBT_MA_TUY',
  'TSBT_BENH_KHAC', 'TSBT_MA_BENH_KHAC', 'TSBT_TEN_THUOC_LIEU_LUONG', 'TSBT_THAI_SAN', 'TSBT_MA_BENH_THAI_SAN',
  'TSBT_TEN_THUOC_THAI_SAN',
];

const X10_KEYS = ['CHIEU_CAO', 'CAN_NANG', 'CHI_SO_BMI', 'MACH', 'HUYET_AP', 'KHAM_THE_LUC_PL'];

const X12_KEYS = [...X8_KEYS, 'PHAN_LOAI_SK', 'CAC_VAN_DE_SUC_KHOE', 'CAC_BENH_TAT_NEU_CO'];

interface SectionDef {
  file: number;
  tag: string;
  keys: string[];
  /** Sinh XML kể cả khi không có thẻ nào (XML1, XML2 luôn bắt buộc) */
  always?: boolean;
  /** Section đặc biệt: danh sách chỉ số cận lâm sàng */
  cls?: boolean;
}

const SEC = {
  X1: (type: KskType): SectionDef => ({
    file: 1, tag: 'THONG_TIN_HANH_CHINH', always: true,
    keys: type === 'ChildUnder' ? X1_KEYS : X1_KEYS.filter(k => !X1_TS_KEYS.has(k)),
  }),
  X2: { file: 2, tag: 'THONG_TIN_CHUNG_VE_LAN_KHAM', keys: X2_KEYS, always: true } as SectionDef,
  X3: { file: 3, tag: 'DANH_GIA_DAU_HIEU_SINH_TON', keys: X3_KEYS } as SectionDef,
  X4: { file: 4, tag: 'DANH_GIA_DINH_DUONG', keys: X4_KEYS } as SectionDef,
  X5: { file: 5, tag: 'DANH_GIA_PHAT_TRIEN_TINH_THAN_VAN_DONG', keys: X5_KEYS } as SectionDef,
  X6: { file: 6, tag: 'DANH_GIA_TIEM_CHUNG', keys: X6_KEYS } as SectionDef,
  X7: { file: 7, tag: 'KHAM_LAM_SANG', keys: X7_KEYS } as SectionDef,
  X8: { file: 8, tag: 'KET_LUAN_VA_TU_VAN', keys: X8_KEYS } as SectionDef,
  X9: { file: 9, tag: 'TIEN_SU_BENH_TAT', keys: X9_KEYS } as SectionDef,
  X10: { file: 10, tag: 'KHAM_THE_LUC', keys: X10_KEYS } as SectionDef,
  X11: { file: 11, tag: 'KHAM_CAN_LAM_SANG', keys: [], cls: true } as SectionDef,
  X12: { file: 12, tag: 'KET_LUAN_VA_TU_VAN', keys: X12_KEYS } as SectionDef,
};

export function getKskSections(type: KskType): SectionDef[] {
  if (type === 'ChildUnder') {
    return [SEC.X1(type), SEC.X2, SEC.X3, SEC.X4, SEC.X5, SEC.X6, SEC.X7, SEC.X8];
  }
  return [SEC.X1(type), SEC.X2, SEC.X7, SEC.X9, SEC.X10, SEC.X11, SEC.X12];
}

/** Dùng cho kiểm tra đối chiếu: toàn bộ thẻ XML được hỗ trợ */
export const KSK_SUPPORTED_TAGS: Set<string> = new Set([
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
    const data = { ...record, TYPE: type };
    xml += '      <HOSO>\n';

    for (const sec of getKskSections(type)) {
      let body = '';

      if (sec.cls) {
        const list: any[] = Array.isArray(data.CLS) ? data.CLS : [];
        if (list.length === 0) continue;
        body += '              <DANH_SACH_CLS>\n';
        for (const item of list) {
          body += '                <CHI_TIET_CLS>\n';
          for (const k of ['MA_DICH_VU', 'MA_CHI_SO', 'GIA_TRI', 'DON_VI_DO', 'MO_TA', 'KET_LUAN']) {
            body += has(item[k]) ? `                  <${k}>${escapeXml(item[k])}</${k}>\n` : `                  <${k} />\n`;
          }
          body += '                </CHI_TIET_CLS>\n';
        }
        body += '              </DANH_SACH_CLS>\n';
      } else {
        for (const tag of sec.keys) {
          if (has(data[tag])) {
            let val = String(data[tag]);
            if (tag.startsWith('CKDT_') && val.includes('base64,')) {
              val = val.split('base64,')[1];
            }
            body += `              <${tag}>${escapeXml(val)}</${tag}>\n`;
          }
        }
        if (!body && !sec.always) continue;
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
  xml += '</KHAMSUCKHOE>';

  return xml;
}
