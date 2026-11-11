/**
 * SERVICE XỬ LÝ NGHIỆP VỤ CHỨNG TỪ TT12 BYT - MẪU 01/BH - MẪU 02/BH
 * Chuyển đổi nguyên bản 100% tính năng từ phần mềm Desktop "HIS XML TT12 BYT" (Module_TT12_2026)
 * Tích hợp hệ thống cấu hình ký số sẵn có của Web App (VNPT SmartCA TOTP/App & USB Token)
 *
 * Tác giả: NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ ĐÀ NẴNG
 */

import * as XLSX from 'xlsx';
import {
  getSmartCAConfig,
  getSmartCaCertificate,
  signSmartCAHash,
  SmartCAConfig,
} from './vnptSmartCaService';
import { signXmlWithUsbToken } from './localTokenSignerService';
import { computeXmlHashBase64 } from './xmlBuilder';

export interface TT12TableConfig {
  tableCode: string;
  tableName: string;
  shortLabel: string;
  templateFileName: string;
  xmlRootElement: string;
  xmlListElement: string;
  xmlItemElement: string;
  requiredColumns: string[];
  targetXmlColumns: string[];
  columnMap: Record<string, string>;
}

export const TT12_CONFIGS: TT12TableConfig[] = [
  {
    tableCode: 'BANG_1',
    tableName: 'Bảng 1 - Danh mục bộ phận chuyên môn',
    shortLabel: 'Bảng 1 (Khoa/Phòng)',
    templateFileName: 'FileMau_Bang1.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DANHSACH_DMBOPHANCHUYENMON',
    xmlItemElement: 'DMBOPHANCHUYENMON',
    requiredColumns: ['STT'],
    columnMap: {},
    targetXmlColumns: [
      'STT',
      'MA_KHOA',
      'TEN_KHOA',
      'BAN_KHAM',
      'GIUONG_PD',
      'GIUONG_TK',
      'GIUONG_HSTC',
      'GIUONG_HSCC',
      'TU_NGAY',
      'DEN_NGAY',
      'MA_CSKCB',
    ],
  },
  {
    tableCode: 'BANG_2',
    tableName: 'Bảng 2 - Danh mục nhân lực KCB',
    shortLabel: 'Bảng 2 (Nhân lực)',
    templateFileName: 'FileMau_Bang2.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DANHSACH_DMNHANLUCKBCB',
    xmlItemElement: 'DMNHANLUCKBCB',
    requiredColumns: ['STT'],
    columnMap: {},
    targetXmlColumns: [
      'STT',
      'MA_KHOA',
      'TEN_KHOA',
      'HO_TEN',
      'GIOI_TINH',
      'SO_DINH_DANH',
      'CHUCDANH_NN',
      'VI_TRI',
      'MACCHN',
      'NGAYCAP_CCHN',
      'NOICAP_CCHN',
      'PHAMVI_CM',
      'PHAMVI_CMBS',
      'DVKT_KHAC',
      'VB_PHANCONG',
      'THOIGIAN_DK',
      'THOIGIAN_NGAY',
      'THOIGIAN_TUAN',
      'CSKCB_KHAC',
      'CSKCB_CGKT',
      'QD_CGKT',
      'TU_NGAY',
      'DEN_NGAY',
      'MA_CSKCB',
    ],
  },
  {
    tableCode: 'BANG_3',
    tableName: 'Bảng 3 - Danh mục thuốc/chế phẩm máu',
    shortLabel: 'Bảng 3 (Thuốc/Máu)',
    templateFileName: 'FileMau_Bang3.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DANHSACH_DMTHUOCMAUCHEPHAMMAU',
    xmlItemElement: 'DMTHUOCMAUCHEPHAMMAU',
    requiredColumns: ['STT'],
    columnMap: {},
    targetXmlColumns: [
      'STT',
      'MA_THUOC',
      'TEN_HOAT_CHAT',
      'TEN_THUOC',
      'DON_VI_TINH',
      'HAM_LUONG',
      'DUONG_DUNG',
      'MA_DUONG_DUNG',
      'DANG_BAO_CHE',
      'SO_DANG_KY',
      'SO_LUONG',
      'DON_GIA',
      'DON_GIA_BH',
      'QUY_CACH',
      'NHA_SX',
      'NUOC_SX',
      'NHA_THAU',
      'TT_THAU',
      'TU_NGAY_HD',
      'DEN_NGAY_HD',
      'MA_CSKCB',
      'LOAI_THUOC',
      'LOAI_THAU',
      'HT_THAU',
      'MA_DVKT',
      'TCCL',
      'BO_PHAN_VT',
      'TEN_KHOA_HOC',
      'NGUON_GOC',
      'PP_CHEBIEN',
      'MA_DL_NHAP',
      'MA_DL_CB',
      'TLHH_CB',
      'TLHH_BQ',
      'MA_CSKCB_THUOC',
      'TU_NGAY',
      'DEN_NGAY',
    ],
  },
  {
    tableCode: 'BANG_4',
    tableName: 'Bảng 4 - Danh mục thiết bị y tế',
    shortLabel: 'Bảng 4 (TBYT)',
    templateFileName: 'FileMau_Bang4.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DSACH_TBYT',
    xmlItemElement: 'DM_TBYT',
    requiredColumns: ['STT'],
    columnMap: {
      MA_MAY: 'MA_TBYT',
      MA_TB: 'MA_TBYT',
      MA_THIET_BI: 'MA_TBYT',
      MA_VAT_TU: 'MA_TBYT',
      TEN_TB: 'TEN_TBYT',
      TEN_THIET_BI: 'TEN_TBYT',
      TEN_MAY: 'TEN_TBYT',
      TEN_VAT_TU: 'TEN_TBYT',
      MA_HIEU: 'KY_HIEU',
      MODEL: 'KY_HIEU',
      HANG_SX: 'CONGTY_SX',
      NHA_SX: 'CONGTY_SX',
      CONG_TY_SX: 'CONGTY_SX',
      TU_NGAY_HD: 'HD_TU',
      DEN_NGAY_HD: 'HD_DEN',
    },
    targetXmlColumns: [
      'STT',
      'MA_TBYT',
      'TEN_TBYT',
      'KY_HIEU',
      'CONGTY_SX',
      'NUOC_SX',
      'NAM_SX',
      'NAM_SD',
      'SO_LUU_HANH',
      'HD_TU',
      'HD_DEN',
      'TU_NGAY',
      'DEN_NGAY',
      'MA_CSKCB',
    ],
  },
  {
    tableCode: 'BANG_5',
    tableName: 'Bảng 5 - Danh mục DV Khám chữa bệnh',
    shortLabel: 'Bảng 5 (DVKT)',
    templateFileName: 'FileMau_Bang5.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DANHSACH_DMDICHVUKBCB',
    xmlItemElement: 'DMDICHVUKBCB',
    requiredColumns: ['STT'],
    columnMap: {
      MA_DVKT: 'MA_DICH_VU',
      MA_DV: 'MA_DICH_VU',
      TEN_DVKT: 'TEN_DICH_VU',
      TEN_DV: 'TEN_DICH_VU',
      DON_GIA_BH: 'GIA_THANH_TOAN',
    },
    targetXmlColumns: [
      'STT',
      'MA_DICH_VU',
      'TEN_DICH_VU',
      'TEN_DVKT_GIA',
      'DON_GIA',
      'QUY_TRINH',
      'SO_LUONG_CGKT',
      'CSKCB_CGKT',
      'CSKCB_CLS',
      'QD_DVKT',
      'QD_PD_GIA',
      'GHI_CHU',
      'TU_NGAY',
      'DEN_NGAY',
      'MA_CSKCB',
      'GIA_THANH_TOAN',
      'THUOCPX_STT',
      'THUOCPX_MA_THUOC',
      'THUOCPX_TEN_THUOC',
      'THUOCPX_SO_DANG_KY',
      'THUOCPX_DON_VI_TINH',
      'THUOCPX_TT_THAU',
      'THUOCPX_DON_GIA_THUOC',
      'THUOCPX_DM_NSX_CDD',
      'THUOCPX_DM_THUCTE_CDD',
      'THUOCPX_LIEU_BQ_PX',
      'THUOCPX_TL_THUCTE_BQ_PX',
      'THUOCPX_THANH_TIEN_THUOC',
    ],
  },
  {
    tableCode: 'BANG_6',
    tableName: 'Bảng 6 - Danh mục TBYT thực hiện dịch vụ',
    shortLabel: 'Bảng 6 (TBYT-DV)',
    templateFileName: 'FileMau_Bang6.xlsx',
    xmlRootElement: 'HSDANHMUC',
    xmlListElement: 'DSACH_TBYTTHDV',
    xmlItemElement: 'DM_TBYTTHDV',
    requiredColumns: ['STT'],
    columnMap: {
      MA_TBYT: 'MA_MAY',
      MA_TB: 'MA_MAY',
      MA_THIET_BI: 'MA_MAY',
      MA_VAT_TU: 'MA_MAY',
      TEN_TBYT: 'TEN_TB',
      TEN_THIET_BI: 'TEN_TB',
      TEN_MAY: 'TEN_TB',
      TEN_VAT_TU: 'TEN_TB',
      MA_HIEU: 'KY_HIEU',
      MODEL: 'KY_HIEU',
      HANG_SX: 'CONGTY_SX',
      NHA_SX: 'CONGTY_SX',
      CONG_TY_SX: 'CONGTY_SX',
      TU_NGAY_HD: 'HD_TU',
      DEN_NGAY_HD: 'HD_DEN',
      MA_DV: 'MA_DICHVU',
      MA_DV_KT: 'MA_DICHVU',
    },
    targetXmlColumns: [
      'STT',
      'TEN_TB',
      'KY_HIEU',
      'CONGTY_SX',
      'NUOC_SX',
      'NAM_SX',
      'NAM_SD',
      'MA_MAY',
      'SO_LUU_HANH',
      'HD_TU',
      'HD_DEN',
      'TU_NGAY',
      'DEN_NGAY',
      'MA_CSKCB',
    ],
  },
  {
    tableCode: 'MAU_01BH',
    tableName: 'Mẫu 01/BH - Bảng Tổng Hợp C79',
    shortLabel: 'Mẫu 01/BH (C79)',
    templateFileName: 'BH_MAU_01_Template.xlsx',
    xmlRootElement: 'HSTH01BH',
    xmlListElement: 'DS_CHITIET',
    xmlItemElement: 'CHITIET_HS01BH',
    requiredColumns: ['STT'],
    columnMap: {
      MA_THE: 'MA_THE_BHYT',
      MA_BH: 'MA_THE_BHYT',
      MA_BENH: 'MA_BENH_CHINH',
      MA_THE_BH: 'MA_THE_BHYT',
      SO_THE_BHYT: 'MA_THE_BHYT',
      MA_LOAIKCB: 'MA_LOAI_KCB',
      LOAI_KCB: 'MA_LOAI_KCB',
      T_TONGCHI: 'T_TONGCHI_BV',
      TONG_CHI: 'T_TONGCHI_BV',
    },
    targetXmlColumns: [
      'STT',
      'HO_TEN',
      'NGAY_SINH',
      'GIOI_TINH',
      'MA_THE_BHYT',
      'MA_BENH_CHINH',
      'NGAY_VAO',
      'NGAY_VAO_NOI_TRU',
      'NGAY_RA',
      'SO_NGAY_DTRI',
      'MA_LOAI_KCB',
      'T_TONGCHI_BV',
      'T_TONGCHI_BH',
      'T_BHTT',
      'T_BNCCT',
      'T_BNTT',
      'T_NGUONKHAC',
      'MA_CSKCB',
      'NAM_QT',
      'THANG_QT',
    ],
  },
  {
    tableCode: 'MAU_01BH_7980',
    tableName: 'Mẫu 01/BH - Form 7980a (Excel / XML Giám định)',
    shortLabel: 'Mẫu 01/BH (7980a)',
    templateFileName: 'FileMau_7980a.xlsx',
    xmlRootElement: 'HSTH01BH',
    xmlListElement: 'DS_CHITIET',
    xmlItemElement: 'CHITIET_HS01BH',
    requiredColumns: ['STT'],
    columnMap: {
      MA_THE: 'MA_THE_BHYT',
      MA_BH: 'MA_THE_BHYT',
      MA_THE_BH: 'MA_THE_BHYT',
      SO_THE_BHYT: 'MA_THE_BHYT',
      MA_BENH: 'MA_BENH_CHINH',
      MA_LOAIKCB: 'MA_LOAI_KCB',
      LOAI_KCB: 'MA_LOAI_KCB',
      T_TONGCHI: 'T_TONGCHI_BV',
      TONG_CHI: 'T_TONGCHI_BV',
    },
    targetXmlColumns: [
      'STT',
      'HO_TEN',
      'NGAY_SINH',
      'GIOI_TINH',
      'MA_THE_BHYT',
      'MA_BENH_CHINH',
      'NGAY_VAO',
      'NGAY_VAO_NOI_TRU',
      'NGAY_RA',
      'SO_NGAY_DTRI',
      'MA_LOAI_KCB',
      'T_TONGCHI_BV',
      'T_TONGCHI_BH',
      'T_BHTT',
      'T_BNCCT',
      'T_BNTT',
      'T_NGUONKHAC',
      'MA_CSKCB',
      'NAM_QT',
      'THANG_QT',
    ],
  },
];

const escXml = (v: any): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function genUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Chuẩn hóa cột số tiền / số lượng giống hệt MainView.xaml.cs (dòng 356-364)
 */
function isNumericMoneyColumn(colName: string): boolean {
  const u = colName.toUpperCase();
  return (
    u.includes('DON_GIA') ||
    u.includes('TIEN') ||
    u.startsWith('T_') ||
    u.includes('GIA_') ||
    u === 'SO_LUONG' ||
    u.includes('LIEU_') ||
    u.includes('TL_')
  );
}

function formatNumericValue(rawVal: any): string {
  const s = String(rawVal ?? '').trim();
  if (!s) return '';
  const normalized = s.replace(/,/g, '.');
  const num = Number(normalized);
  if (!isNaN(num) && isFinite(num)) {
    if (Math.floor(num) === num) {
      return Math.trunc(num).toString();
    }
    return Number(num.toFixed(2)).toString();
  }
  return s;
}

/**
 * Chuẩn hóa ngày tháng cho 01BH thành 12 ký tự yyyyMMddHHmm (giống MainView.xaml.cs dòng 373-388)
 */
function format01BhDateValue(rawVal: any): string {
  if (rawVal === null || rawVal === undefined) return '';
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${rawVal.getFullYear()}${pad(rawVal.getMonth() + 1)}${pad(rawVal.getDate())}${pad(rawVal.getHours())}${pad(rawVal.getMinutes())}`;
  }
  let s = String(rawVal).trim();
  if (!s || s === '0') return '';

  const cleanDigits = s.replace(/\s+/g, '');
  // Nếu chỉ có 4 chữ số năm sinh (VD: 1958 -> 195801010000)
  if (/^\d{4}$/.test(cleanDigits)) {
    return cleanDigits + '01010000';
  }
  // Nếu có 6 chữ số yyyyMM -> yyyyMM010000
  if (/^\d{6}$/.test(cleanDigits)) {
    return cleanDigits + '010000';
  }
  // Nếu là chuỗi 8 chữ số yyyyMMdd -> bù 0000
  if (/^\d{8}$/.test(cleanDigits)) {
    return cleanDigits + '0000';
  }
  if (/^\d{12}$/.test(cleanDigits)) {
    return cleanDigits;
  }
  if (/^\d{14}$/.test(cleanDigits)) {
    return cleanDigits.slice(0, 12);
  }

  // Hỗ trợ định dạng dd/MM/yyyy HH:mm hoặc dd/MM/yyyy
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    const hh = (dmyMatch[4] || '00').padStart(2, '0');
    const min = (dmyMatch[5] || '00').padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
  }

  // Hỗ trợ định dạng yyyy-MM-dd HH:mm
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2}))?/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    const hh = (ymdMatch[4] || '00').padStart(2, '0');
    const min = (ymdMatch[5] || '00').padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
  }

  return s;
}

/**
 * Chuẩn hóa chuỗi tiêu đề cột (bỏ dấu tiếng Việt, ký tự đặc biệt -> IN HOA_GACH_DUOI)
 * Giúp nhận diện chính xác cột dù người dùng viết tiếng Việt có dấu, thiếu dấu gạch dưới, hoặc thừa khoảng trắng
 */
function toAsciiSlug(raw: string): string {
  return String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Từ điển ánh xạ tên cột đồng nghĩa / viết tắt / tiếng Việt sang tên cột chuẩn quy định TT12 & 01/BH
 */
const GLOBAL_COLUMN_ALIASES: Record<string, string> = {
  // Cột dùng chung
  STT: 'STT',
  TT: 'STT',
  SO_TT: 'STT',
  SOTT: 'STT',
  SO_THU_TU: 'STT',
  MA_CSKCB: 'MA_CSKCB',
  MACSKCB: 'MA_CSKCB',
  MA_CS_KCB: 'MA_CSKCB',
  MA_BV: 'MA_CSKCB',
  MA_DON_VI: 'MA_CSKCB',
  CSKCB: 'MA_CSKCB',
  TU_NGAY: 'TU_NGAY',
  TUNGAY: 'TU_NGAY',
  NGAY_AP_DUNG: 'TU_NGAY',
  NGAY_HIEU_LUC: 'TU_NGAY',
  DEN_NGAY: 'DEN_NGAY',
  DENNGAY: 'DEN_NGAY',
  NGAY_KET_THUC: 'DEN_NGAY',
  NGAY_HET_HIEU_LUC: 'DEN_NGAY',

  // Bảng 1 - Bộ phận chuyên môn
  MA_KHOA: 'MA_KHOA',
  MAKHOA: 'MA_KHOA',
  MA_BO_PHAN: 'MA_KHOA',
  MA_KHOA_PHONG: 'MA_KHOA',
  TEN_KHOA: 'TEN_KHOA',
  TENKHOA: 'TEN_KHOA',
  TEN_BO_PHAN: 'TEN_KHOA',
  TEN_KHOA_PHONG: 'TEN_KHOA',
  BAN_KHAM: 'BAN_KHAM',
  BANKHAM: 'BAN_KHAM',
  SO_BAN_KHAM: 'BAN_KHAM',
  GIUONG_PD: 'GIUONG_PD',
  GIUONGPD: 'GIUONG_PD',
  SO_GIUONG_PD: 'GIUONG_PD',
  GIUONG_PHE_DUYET: 'GIUONG_PD',
  GIUONG_TK: 'GIUONG_TK',
  GIUONGTK: 'GIUONG_TK',
  SO_GIUONG_TK: 'GIUONG_TK',
  GIUONG_THUC_KE: 'GIUONG_TK',
  GIUONG_HSTC: 'GIUONG_HSTC',
  GIUONGHSTC: 'GIUONG_HSTC',
  GIUONG_HSCC: 'GIUONG_HSCC',
  GIUONGHSCC: 'GIUONG_HSCC',

  // Bảng 2 - Nhân lực KCB
  HO_TEN: 'HO_TEN',
  HOTEN: 'HO_TEN',
  HO_VA_TEN: 'HO_TEN',
  TEN_NHAN_VIEN: 'HO_TEN',
  TEN_NV: 'HO_TEN',
  TEN_BAC_SI: 'HO_TEN',
  GIOI_TINH: 'GIOI_TINH',
  GIOITINH: 'GIOI_TINH',
  PHAI: 'GIOI_TINH',
  SO_DINH_DANH: 'SO_DINH_DANH',
  SODINHDANH: 'SO_DINH_DANH',
  CCCD: 'SO_DINH_DANH',
  SO_CCCD: 'SO_DINH_DANH',
  CMND: 'SO_DINH_DANH',
  SO_CMND: 'SO_DINH_DANH',
  MA_DINH_DANH: 'SO_DINH_DANH',
  CHUCDANH_NN: 'CHUCDANH_NN',
  CHUC_DANH_NN: 'CHUCDANH_NN',
  CHUCDANHNN: 'CHUCDANH_NN',
  CHUC_DANH_NGHE_NGHIEP: 'CHUCDANH_NN',
  VI_TRI: 'VI_TRI',
  VITRI: 'VI_TRI',
  VI_TRI_VIEC_LAM: 'VI_TRI',
  VI_TRI_LAM_VIEC: 'VI_TRI',
  MACCHN: 'MACCHN',
  MA_CCHN: 'MACCHN',
  SO_CCHN: 'MACCHN',
  CCHN: 'MACCHN',
  SO_GPHN: 'MACCHN',
  MA_GPHN: 'MACCHN',
  NGAYCAP_CCHN: 'NGAYCAP_CCHN',
  NGAY_CAP_CCHN: 'NGAYCAP_CCHN',
  NGAYCAPCCHN: 'NGAYCAP_CCHN',
  NOICAP_CCHN: 'NOICAP_CCHN',
  NOI_CAP_CCHN: 'NOICAP_CCHN',
  NOICAPCCHN: 'NOICAP_CCHN',
  PHAMVI_CM: 'PHAMVI_CM',
  PHAM_VI_CM: 'PHAMVI_CM',
  PHAMVICM: 'PHAMVI_CM',
  PHAM_VI_CHUYEN_MON: 'PHAMVI_CM',
  PHAMVI_CMBS: 'PHAMVI_CMBS',
  PHAM_VI_CMBS: 'PHAMVI_CMBS',
  PHAMVICMBS: 'PHAMVI_CMBS',
  DVKT_KHAC: 'DVKT_KHAC',
  DVKTKHAC: 'DVKT_KHAC',
  VB_PHANCONG: 'VB_PHANCONG',
  VB_PHAN_CONG: 'VB_PHANCONG',
  VBPHANCONG: 'VB_PHANCONG',
  VAN_BAN_PHAN_CONG: 'VB_PHANCONG',
  THOIGIAN_DK: 'THOIGIAN_DK',
  THOI_GIAN_DK: 'THOIGIAN_DK',
  THOIGIANDK: 'THOIGIAN_DK',
  THOIGIAN_NGAY: 'THOIGIAN_NGAY',
  THOI_GIAN_NGAY: 'THOIGIAN_NGAY',
  THOIGIANNGAY: 'THOIGIAN_NGAY',
  THOIGIAN_TUAN: 'THOIGIAN_TUAN',
  THOI_GIAN_TUAN: 'THOIGIAN_TUAN',
  THOIGIANTUAN: 'THOIGIAN_TUAN',
  CSKCB_KHAC: 'CSKCB_KHAC',
  CSKCBKHAC: 'CSKCB_KHAC',
  CSKCB_CGKT: 'CSKCB_CGKT',
  CSKCBCGKT: 'CSKCB_CGKT',
  QD_CGKT: 'QD_CGKT',
  QDCGKT: 'QD_CGKT',

  // Bảng 3 - Thuốc / Máu
  MA_THUOC: 'MA_THUOC',
  MATHUOC: 'MA_THUOC',
  TEN_HOAT_CHAT: 'TEN_HOAT_CHAT',
  TENHOATCHAT: 'TEN_HOAT_CHAT',
  HOAT_CHAT: 'TEN_HOAT_CHAT',
  TEN_THUOC: 'TEN_THUOC',
  TENTHUOC: 'TEN_THUOC',
  DON_VI_TINH: 'DON_VI_TINH',
  DONVITINH: 'DON_VI_TINH',
  DVT: 'DON_VI_TINH',
  HAM_LUONG: 'HAM_LUONG',
  HAMLUONG: 'HAM_LUONG',
  DUONG_DUNG: 'DUONG_DUNG',
  DUONGDUNG: 'DUONG_DUNG',
  MA_DUONG_DUNG: 'MA_DUONG_DUNG',
  MADUONGDUNG: 'MA_DUONG_DUNG',
  DANG_BAO_CHE: 'DANG_BAO_CHE',
  DANGBAOCHE: 'DANG_BAO_CHE',
  SO_DANG_KY: 'SO_DANG_KY',
  SODANGKY: 'SO_DANG_KY',
  SDK: 'SO_DANG_KY',
  SO_LUONG: 'SO_LUONG',
  SOLUONG: 'SO_LUONG',
  DON_GIA: 'DON_GIA',
  DONGIA: 'DON_GIA',
  DON_GIA_BH: 'DON_GIA_BH',
  DONGIABH: 'DON_GIA_BH',
  QUY_CACH: 'QUY_CACH',
  QUYCACH: 'QUY_CACH',
  NHA_SX: 'NHA_SX',
  NHASX: 'NHA_SX',
  NUOC_SX: 'NUOC_SX',
  NUOCSX: 'NUOC_SX',
  NHA_THAU: 'NHA_THAU',
  NHATHAU: 'NHA_THAU',
  TT_THAU: 'TT_THAU',
  TTTHAU: 'TT_THAU',
  TU_NGAY_HD: 'TU_NGAY_HD',
  TUNGAYHD: 'TU_NGAY_HD',
  DEN_NGAY_HD: 'DEN_NGAY_HD',
  DENNGAYHD: 'DEN_NGAY_HD',
  LOAI_THUOC: 'LOAI_THUOC',
  LOAITHUOC: 'LOAI_THUOC',
  LOAI_THAU: 'LOAI_THAU',
  LOAITHAU: 'LOAI_THAU',
  HT_THAU: 'HT_THAU',
  HTTHAU: 'HT_THAU',

  // Bảng 4 & Bảng 6 - Thiết bị y tế
  KY_HIEU: 'KY_HIEU',
  KYHIEU: 'KY_HIEU',
  MA_HIEU: 'KY_HIEU',
  MAHIEU: 'KY_HIEU',
  MODEL: 'KY_HIEU',
  CONGTY_SX: 'CONGTY_SX',
  CONGTYSX: 'CONGTY_SX',
  CONG_TY_SX: 'CONGTY_SX',
  HANG_SX: 'CONGTY_SX',
  HANGSX: 'CONGTY_SX',
  NAM_SX: 'NAM_SX',
  NAMSX: 'NAM_SX',
  NAM_SAN_XUAT: 'NAM_SX',
  NAM_SD: 'NAM_SD',
  NAMSD: 'NAM_SD',
  NAM_SU_DUNG: 'NAM_SD',
  SO_LUU_HANH: 'SO_LUU_HANH',
  SOLUUHANH: 'SO_LUU_HANH',
  HD_TU: 'HD_TU',
  HDTU: 'HD_TU',
  HD_DEN: 'HD_DEN',
  HDDEN: 'HD_DEN',

  // Bảng 5 - Dịch vụ KCB
  MA_DICH_VU: 'MA_DICH_VU',
  MADICHVU: 'MA_DICH_VU',
  TEN_DICH_VU: 'TEN_DICH_VU',
  TENDICHVU: 'TEN_DICH_VU',
  TEN_DVKT_GIA: 'TEN_DVKT_GIA',
  TENDVKTGIA: 'TEN_DVKT_GIA',
  QUY_TRINH: 'QUY_TRINH',
  QUYTRINH: 'QUY_TRINH',
  SO_LUONG_CGKT: 'SO_LUONG_CGKT',
  SOLUONGCGKT: 'SO_LUONG_CGKT',
  CSKCB_CLS: 'CSKCB_CLS',
  CSKCBCLS: 'CSKCB_CLS',
  QD_DVKT: 'QD_DVKT',
  QDDVKT: 'QD_DVKT',
  QD_PD_GIA: 'QD_PD_GIA',
  QDPDGIA: 'QD_PD_GIA',
  GHI_CHU: 'GHI_CHU',
  GHICHU: 'GHI_CHU',
  GIA_THANH_TOAN: 'GIA_THANH_TOAN',
  GIATHANHTOAN: 'GIA_THANH_TOAN',

  // Mẫu 01/BH (C79 & 7980a)
  NGAY_SINH: 'NGAY_SINH',
  NGAYSINH: 'NGAY_SINH',
  MA_THE_BHYT: 'MA_THE_BHYT',
  MATHEBHYT: 'MA_THE_BHYT',
  MA_THE: 'MA_THE_BHYT',
  MATHE: 'MA_THE_BHYT',
  MA_BH: 'MA_THE_BHYT',
  MA_THE_BH: 'MA_THE_BHYT',
  SO_THE_BHYT: 'MA_THE_BHYT',
  MA_BENH_CHINH: 'MA_BENH_CHINH',
  MABENHCHINH: 'MA_BENH_CHINH',
  MA_BENH: 'MA_BENH_CHINH',
  MABENH: 'MA_BENH_CHINH',
  NGAY_VAO: 'NGAY_VAO',
  NGAYVAO: 'NGAY_VAO',
  NGAY_VAO_NOI_TRU: 'NGAY_VAO_NOI_TRU',
  NGAYVAONOITRU: 'NGAY_VAO_NOI_TRU',
  NGAY_VAO_NT: 'NGAY_VAO_NOI_TRU',
  NGAY_RA: 'NGAY_RA',
  NGAYRA: 'NGAY_RA',
  SO_NGAY_DTRI: 'SO_NGAY_DTRI',
  SONGAYDTRI: 'SO_NGAY_DTRI',
  SO_NGAY_DIEU_TRI: 'SO_NGAY_DTRI',
  MA_LOAI_KCB: 'MA_LOAI_KCB',
  MALOAIKCB: 'MA_LOAI_KCB',
  MA_LOAIKCB: 'MA_LOAI_KCB',
  LOAI_KCB: 'MA_LOAI_KCB',
  T_TONGCHI_BV: 'T_TONGCHI_BV',
  TTONGCHIBV: 'T_TONGCHI_BV',
  T_TONGCHI: 'T_TONGCHI_BV',
  TTONGCHI: 'T_TONGCHI_BV',
  TONG_CHI: 'T_TONGCHI_BV',
  T_TONGCHI_BH: 'T_TONGCHI_BH',
  TTONGCHIBH: 'T_TONGCHI_BH',
  TONG_CHI_BH: 'T_TONGCHI_BH',
  T_BHTT: 'T_BHTT',
  TBHTT: 'T_BHTT',
  T_BNCCT: 'T_BNCCT',
  TBNCCT: 'T_BNCCT',
  T_BNTT: 'T_BNTT',
  TBNTT: 'T_BNTT',
  T_NGUONKHAC: 'T_NGUONKHAC',
  TNGUONKHAC: 'T_NGUONKHAC',
  NAM_QT: 'NAM_QT',
  NAMQT: 'NAM_QT',
  THANG_QT: 'THANG_QT',
  THANGQT: 'THANG_QT',
};

/**
 * Chuẩn hóa tên cột bất kỳ trong file Excel / XML về đúng tên cột chuẩn trong `config.targetXmlColumns`
 */
export function resolveStandardColumnName(
  rawColName: string,
  config: TT12TableConfig
): string {
  const trimmed = String(rawColName ?? '').trim();
  if (!trimmed) return '';

  // 1. Nếu khớp trực tiếp (không phân biệt hoa/thường) với targetXmlColumns
  const exactTarget = config.targetXmlColumns.find(
    t => t.toUpperCase() === trimmed.toUpperCase()
  );
  if (exactTarget) return exactTarget;

  // 2. Chuyển sang slug ASCII in hoa (VD: "Mã loại KCB" -> "MA_LOAI_KCB", "ma_loaikcb" -> "MA_LOAIKCB")
  const slug = toAsciiSlug(trimmed);
  if (!slug) return trimmed;

  const slugTarget = config.targetXmlColumns.find(t => t.toUpperCase() === slug);
  if (slugTarget) return slugTarget;

  // 3. Kiểm tra trong config.columnMap của từng bảng (ưu tiên bảng hiện tại)
  for (const [mapFrom, mapTo] of Object.entries(config.columnMap)) {
    if (mapFrom.toUpperCase() === slug || mapFrom.replace(/_/g, '') === slug.replace(/_/g, '')) {
      if (config.targetXmlColumns.includes(mapTo)) {
        return mapTo;
      }
    }
  }

  // 4. Kiểm tra trong từ điển đồng nghĩa toàn cục GLOBAL_COLUMN_ALIASES
  const globalMapped = GLOBAL_COLUMN_ALIASES[slug] || GLOBAL_COLUMN_ALIASES[slug.replace(/_/g, '')];
  if (globalMapped) {
    if (config.targetXmlColumns.includes(globalMapped)) {
      return globalMapped;
    }
    // Xử lý chéo giữa Bảng 3, Bảng 4, Bảng 6 (VD: CONGTY_SX <-> NHA_SX, HD_TU <-> TU_NGAY_HD, MA_TBYT <-> MA_MAY)
    if (config.columnMap[globalMapped] && config.targetXmlColumns.includes(config.columnMap[globalMapped])) {
      return config.columnMap[globalMapped];
    }
  }

  // 5. So sánh bỏ toàn bộ dấu gạch dưới (VD: "DANHSACH" hoặc "MALOAIKCB" vs "MA_LOAI_KCB")
  const compactSlug = slug.replace(/_/g, '');
  const compactTarget = config.targetXmlColumns.find(
    t => t.toUpperCase().replace(/_/g, '') === compactSlug
  );
  if (compactTarget) return compactTarget;

  return slug;
}

/**
 * Tự động nhận diện biểu mẫu TT12 / 01BH phù hợp nhất dựa trên danh sách cột trong file
 * Giúp người dùng dù chọn nhầm Tab bảng hoặc cột bị đảo vị trí vẫn nhận diện và đưa về đúng mẫu
 */
export function detectBestTt12ConfigForHeaders(
  rawHeaders: string[],
  preferredConfig: TT12TableConfig
): TT12TableConfig {
  const scoreConfig = (cfg: TT12TableConfig): { matchCount: number; ratio: number } => {
    const matchedTargets = new Set<string>();
    for (const h of rawHeaders) {
      const resolved = resolveStandardColumnName(h, cfg);
      if (cfg.targetXmlColumns.includes(resolved)) {
        matchedTargets.add(resolved);
      }
    }
    const matchCount = matchedTargets.size;
    const ratio = cfg.targetXmlColumns.length > 0 ? matchCount / cfg.targetXmlColumns.length : 0;
    return { matchCount, ratio };
  };

  const prefScore = scoreConfig(preferredConfig);
  // Nếu bảng đang chọn đã khớp tốt (>= 60% số cột hoặc >= 7 cột chuẩn) thì giữ nguyên bảng đang chọn
  if (prefScore.ratio >= 0.6 || prefScore.matchCount >= 7) {
    return preferredConfig;
  }

  let bestCfg = preferredConfig;
  let bestScore = prefScore;

  for (const cfg of TT12_CONFIGS) {
    const sc = scoreConfig(cfg);
    if (
      sc.matchCount > bestScore.matchCount ||
      (sc.matchCount === bestScore.matchCount && sc.ratio > bestScore.ratio)
    ) {
      bestScore = sc;
      bestCfg = cfg;
    }
  }

  // Chỉ tự động chuyển bảng nếu bảng mới khớp rõ rệt (>= 4 cột chuẩn và nhiều hơn bảng đang chọn ít nhất 2 cột)
  if (bestCfg.tableCode !== preferredConfig.tableCode && bestScore.matchCount >= 4 && bestScore.matchCount >= prefScore.matchCount + 2) {
    return bestCfg;
  }

  return preferredConfig;
}

export interface Tt12ImportResult {
  rows: Record<string, string>[];
  effectiveConfig: TT12TableConfig;
  autoSwitchedTable: boolean;
  reorderedColumns: boolean;
  renamedColumns: string[];
  matchedColumnCount: number;
}

/**
 * Tự động chuẩn hóa tên cột, sắp xếp đúng vị trí quy định và bù đắp dữ liệu thiếu (Mẫu 01/BH & Bảng 1-6 TT12)
 */
export function normalizeAndEnrichRow(
  rawRow: Record<string, string>,
  config: TT12TableConfig,
  fallbackIndex?: number
): Record<string, string> {
  const mapped: Record<string, string> = {};

  // 1. Ánh xạ mọi tên cột (kể cả sai vị trí, viết tắt, thiếu dấu gạch dưới, alias) về tên cột chuẩn của config
  for (const [k, v] of Object.entries(rawRow)) {
    const cleanKey = k.trim();
    if (!cleanKey) continue;
    const valStr = String(v ?? '').trim();
    const resolvedKey = resolveStandardColumnName(cleanKey, config);

    if (mapped[cleanKey] === undefined || mapped[cleanKey] === '') {
      mapped[cleanKey] = valStr;
    }
    if (resolvedKey && (mapped[resolvedKey] === undefined || mapped[resolvedKey] === '')) {
      mapped[resolvedKey] = valStr;
    }
  }

  if (config.tableCode.includes('01BH') && fallbackIndex !== undefined) {
    mapped.STT = String(fallbackIndex);
  } else if ((!mapped.STT || !mapped.STT.trim()) && fallbackIndex !== undefined) {
    mapped.STT = String(fallbackIndex);
  }

  // 2. Chuẩn hóa từng trường dữ liệu theo quy định
  for (const col of Object.keys(mapped)) {
    let val = mapped[col] ?? '';
    if (isNumericMoneyColumn(col)) {
      val = formatNumericValue(val);
    }
    if (col.toUpperCase() === 'MA_LOAI_KCB' && val.length === 1 && /^\d$/.test(val)) {
      val = '0' + val;
    }
    if (config.tableCode.includes('01BH') && col.toUpperCase().startsWith('NGAY_') && val) {
      val = format01BhDateValue(val);
    }
    mapped[col] = val;
  }

  // 3. Tự động chuẩn hóa & bù đắp dữ liệu thiếu cho cả Mẫu 01/BH (C79) và Mẫu 01/BH (7980a)
  if (config.tableCode.includes('01BH')) {
    // GIOI_TINH: chuẩn hóa Nam -> 1, Nữ -> 2 nếu người dùng nhập chữ
    const gt = (mapped.GIOI_TINH || '').trim().toUpperCase();
    if (gt === 'NAM' || gt === 'M') mapped.GIOI_TINH = '1';
    else if (gt === 'NU' || gt === 'NỮ' || gt === 'F') mapped.GIOI_TINH = '2';

    // SO_NGAY_DTRI: mặc định "0" nếu trống
    if (!mapped.SO_NGAY_DTRI || !mapped.SO_NGAY_DTRI.trim()) {
      mapped.SO_NGAY_DTRI = '0';
    } else {
      mapped.SO_NGAY_DTRI = formatNumericValue(mapped.SO_NGAY_DTRI) || '0';
    }

    // MA_LOAI_KCB: bắt buộc 2 chữ số (01, 02, 03...), mặc định "01" nếu trống (giống MainView.xaml.cs dòng 670)
    const mlkcb = (mapped.MA_LOAI_KCB || '').trim();
    if (!mlkcb) {
      mapped.MA_LOAI_KCB = '01';
    } else if (/^\d$/.test(mlkcb)) {
      mapped.MA_LOAI_KCB = '0' + mlkcb;
    }

    // Các trường số tiền của 01/BH: mặc định "0" nếu trống, định dạng số thập phân gọn chuẩn (0.##)
    const moneyFields = [
      'T_TONGCHI_BV',
      'T_TONGCHI_BH',
      'T_BHTT',
      'T_BNCCT',
      'T_BNTT',
      'T_NGUONKHAC',
    ] as const;
    for (const mf of moneyFields) {
      const formatted = formatNumericValue(mapped[mf]);
      mapped[mf] = formatted !== '' ? formatted : '0';
    }

    // Tự động tính T_TONGCHI_BH nếu bị trống hoặc bằng 0 (khi nhập từ file 7980a 42 cột hoặc XML1 chỉ có T_TONGCHI, T_BHTT, T_BNCCT, T_BNTT)
    const curTongChiBh = parseFloat(mapped.T_TONGCHI_BH || '0') || 0;
    const bhtt = parseFloat(mapped.T_BHTT || '0') || 0;
    const bncct = parseFloat(mapped.T_BNCCT || '0') || 0;
    const tongChiBv = parseFloat(mapped.T_TONGCHI_BV || '0') || 0;

    if (curTongChiBh === 0) {
      const sumBh = bhtt + bncct;
      if (sumBh > 0) {
        mapped.T_TONGCHI_BH = formatNumericValue(sumBh);
      } else if (tongChiBv > 0) {
        mapped.T_TONGCHI_BH = formatNumericValue(tongChiBv);
      } else {
        mapped.T_TONGCHI_BH = '0';
      }
    }

    // Tự động trích NAM_QT, THANG_QT từ NGAY_RA (hoặc NGAY_VAO) nếu thiếu, và bỏ số 0 đứng đầu THANG_QT
    const refDate = (mapped.NGAY_RA && mapped.NGAY_RA.length >= 6)
      ? mapped.NGAY_RA
      : (mapped.NGAY_VAO && mapped.NGAY_VAO.length >= 6 ? mapped.NGAY_VAO : '');

    if (refDate.length >= 6) {
      if (!mapped.NAM_QT || !/^\d{4}$/.test(mapped.NAM_QT.trim())) {
        mapped.NAM_QT = refDate.substring(0, 4);
      }
      if (!mapped.THANG_QT || !/^\d{1,2}$/.test(mapped.THANG_QT.trim())) {
        const m = parseInt(refDate.substring(4, 6), 10);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          mapped.THANG_QT = String(m);
        }
      }
    }
    if (mapped.THANG_QT && /^\d+$/.test(mapped.THANG_QT.trim())) {
      mapped.THANG_QT = String(parseInt(mapped.THANG_QT.trim(), 10));
    }
  }

  // 4. Lọc và sắp xếp lại toàn bộ cột theo ĐÚNG THỨ TỰ QUY ĐỊNH (TargetXmlColumns)
  if (config.targetXmlColumns && config.targetXmlColumns.length > 0) {
    const ordered: Record<string, string> = {};
    for (const col of config.targetXmlColumns) {
      ordered[col] = mapped[col] ?? '';
    }
    return ordered;
  }

  return mapped;
}

/**
 * Đọc file Excel (.xlsx, .xls) thông minh:
 * - Chấp nhận các cột bị đảo vị trí (sai thứ tự cột), thừa cột, thiếu cột STT hoặc dùng tên cột tương đương
 * - Tự động phát hiện dòng tiêu đề trong 15 dòng đầu tiên
 * - Tự động nhận diện biểu mẫu nếu người dùng đang đứng ở tab bảng khác
 * - Tự động sắp xếp lại toàn bộ các cột về đúng mẫu quy định (targetXmlColumns)
 */
export function parseTt12ExcelBufferWithMeta(
  buffer: ArrayBuffer,
  preferredConfig: TT12TableConfig
): Tt12ImportResult {
  const wb = XLSX.read(buffer, { type: 'array', raw: false });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('File Excel không có trang tính (Sheet) nào.');
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

  if (!matrix || matrix.length === 0) {
    throw new Error('Sheet Excel trống, không có dữ liệu.');
  }

  // Tìm dòng tiêu đề trong 15 dòng đầu tiên:
  // Chọn dòng có số cột khớp với bộ cột chuẩn nhiều nhất (hoặc có chứa cột STT + ít nhất 2 cột dữ liệu)
  let headerRowIdx = -1;
  let bestHeaderScore = 0;
  const maxSearchRow = Math.min(15, matrix.length);

  for (let r = 0; r < maxSearchRow; r++) {
    const rowCells = (matrix[r] || [])
      .map(c => String(c ?? '').trim())
      .filter(Boolean);
    if (rowCells.length < 2) continue;

    // Tính số cột khớp với bất kỳ biểu mẫu nào trong TT12_CONFIGS
    let maxMatchedForThisRow = 0;
    for (const cfg of TT12_CONFIGS) {
      let matched = 0;
      for (const cell of rowCells) {
        const resolved = resolveStandardColumnName(cell, cfg);
        if (cfg.targetXmlColumns.includes(resolved)) {
          matched++;
        }
      }
      if (matched > maxMatchedForThisRow) {
        maxMatchedForThisRow = matched;
      }
    }

    const hasStt = rowCells.some(c => {
      const slug = toAsciiSlug(c);
      return slug === 'STT' || slug === 'TT' || slug === 'SO_TT';
    });

    const totalScore = maxMatchedForThisRow * 2 + (hasStt ? 3 : 0);
    if (maxMatchedForThisRow >= 2 && totalScore > bestHeaderScore) {
      bestHeaderScore = totalScore;
      headerRowIdx = r;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      `Không tìm thấy dòng tiêu đề hợp lệ trong file Excel!\n` +
        `Các cột chuẩn theo quy định của "${preferredConfig.tableName}" gồm: ${preferredConfig.targetXmlColumns.slice(0, 8).join(', ')}...\n` +
        `Vui lòng bấm "Tải Excel Mẫu" để xem cấu trúc chuẩn.`
    );
  }

  const headerRow = (matrix[headerRowIdx] || []).map(c => String(c ?? '').trim());
  const nonEmptyHeaders = headerRow.filter(Boolean);

  // Tự động nhận diện bảng phù hợp nhất từ dòng tiêu đề
  const effectiveConfig = detectBestTt12ConfigForHeaders(nonEmptyHeaders, preferredConfig);
  const autoSwitchedTable = effectiveConfig.tableCode !== preferredConfig.tableCode;

  const colIndexToName: Record<number, string> = {};
  const renamedColumns: string[] = [];
  const resolvedSequenceInFile: string[] = [];

  for (let c = 0; c < headerRow.length; c++) {
    const rawCol = headerRow[c];
    if (!rawCol) continue;
    const resolvedCol = resolveStandardColumnName(rawCol, effectiveConfig);
    if (
      effectiveConfig.targetXmlColumns.includes(resolvedCol) &&
      rawCol.toUpperCase() !== resolvedCol.toUpperCase()
    ) {
      renamedColumns.push(`${rawCol} → ${resolvedCol}`);
    }
    if (effectiveConfig.targetXmlColumns.includes(resolvedCol)) {
      resolvedSequenceInFile.push(resolvedCol);
    }
    // Nếu trùng tên cột chuẩn trong cùng 1 dòng tiêu đề, ưu tiên cột đầu tiên có trong targetXmlColumns
    if (!Object.values(colIndexToName).includes(resolvedCol)) {
      colIndexToName[c] = resolvedCol;
    } else {
      colIndexToName[c] = `${resolvedCol}_${c}`;
    }
  }

  // Kiểm tra xem thứ tự cột trong file Excel có bị lệch vị trí so với targetXmlColumns hay không
  const expectedFilteredOrder = effectiveConfig.targetXmlColumns.filter(col =>
    resolvedSequenceInFile.includes(col)
  );
  const reorderedColumns =
    resolvedSequenceInFile.length !== effectiveConfig.targetXmlColumns.length ||
    resolvedSequenceInFile.some((col, i) => col !== expectedFilteredOrder[i]);

  const rows: Record<string, string>[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rowArr = matrix[r] || [];
    const rawObj: Record<string, string> = {};
    let nonSttDataCount = 0;

    for (const [colIdxStr, colName] of Object.entries(colIndexToName)) {
      const colIdx = Number(colIdxStr);
      const cellVal = String(rowArr[colIdx] ?? '').trim();
      rawObj[colName] = cellVal;
      if (colName !== 'STT' && cellVal !== '') {
        nonSttDataCount++;
      }
    }

    // Chấp nhận dòng dữ liệu ngay cả khi cột STT bị bỏ trống hoặc nằm lệch cột (miễn là có dữ liệu trên dòng)
    const hasSttVal = Boolean(rawObj.STT && rawObj.STT.trim() !== '');
    if (nonSttDataCount > 0 || (hasSttVal && Object.values(rawObj).some(v => v !== ''))) {
      rows.push(normalizeAndEnrichRow(rawObj, effectiveConfig, rows.length + 1));
    }
  }

  return {
    rows,
    effectiveConfig,
    autoSwitchedTable,
    reorderedColumns,
    renamedColumns,
    matchedColumnCount: expectedFilteredOrder.length,
  };
}

export function parseTt12ExcelBuffer(
  buffer: ArrayBuffer,
  config: TT12TableConfig
): Record<string, string>[] {
  return parseTt12ExcelBufferWithMeta(buffer, config).rows;
}

export const MAU_7980A_TEMPLATE_COLUMNS: string[] = [
  'STT',
  'MA_BN',
  'HO_TEN',
  'NGAY_SINH',
  'GIOI_TINH',
  'DIA_CHI',
  'MA_THE',
  'MA_DKBD',
  'GT_THE_TU',
  'GT_THE_DEN',
  'MA_BENH',
  'MA_BENHKHAC',
  'MA_LYDO_VVIEN',
  'MA_NOI_CHUYEN',
  'NGAY_VAO',
  'NGAY_RA',
  'SO_NGAY_DTRI',
  'KET_QUA_DTRI',
  'TINH_TRANG_RV',
  'T_TONGCHI',
  'T_XN',
  'T_CDHA',
  'T_THUOC',
  'T_MAU',
  'T_PTTT',
  'T_VTYT',
  'T_DVKT_TYLE',
  'T_THUOC_TYLE',
  'T_VTYT_TYLE',
  'T_KHAM',
  'T_GIUONG',
  'T_VCHUYEN',
  'T_BNTT',
  'T_BHTT',
  'T_NGOAIDS',
  'MA_KHOA',
  'NAM_QT',
  'THANG_QT',
  'MA_KHUVUC',
  'MA_LOAIKCB',
  'MA_CSKCB',
  'T_NGUONKHAC',
];

/**
 * Tải về Biểu mẫu Excel trống (Chỉ gồm dòng tiêu đề cột chuẩn theo quy định, không chứa dữ liệu mẫu)
 */
export function downloadBlankTt12ExcelTemplate(config: TT12TableConfig): void {
  const cols =
    config.tableCode === 'MAU_01BH_7980'
      ? MAU_7980A_TEMPLATE_COLUMNS
      : config.targetXmlColumns;
  const ws = XLSX.utils.aoa_to_sheet([cols]);
  ws['!cols'] = cols.map(c => ({ wch: Math.max(14, c.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.tableCode);
  const outName = config.templateFileName.endsWith('.xlsx')
    ? config.templateFileName
    : `${config.tableCode}_MauChuan.xlsx`;
  XLSX.writeFile(wb, outName);
}

/**
 * Xuất lại dữ liệu đang có trên bảng ra file Excel (.xlsx) với thứ tự cột ĐÚNG CHUẨN QUY ĐỊNH 100%
 */
export function exportStandardTt12Excel(
  rows: Record<string, string>[],
  config: TT12TableConfig
): void {
  const cols = config.targetXmlColumns;
  const normalizedRows = rows.map((r, idx) => normalizeAndEnrichRow(r, config, idx + 1));
  const sheetData: string[][] = [
    cols,
    ...normalizedRows.map(r => cols.map(c => String(r[c] ?? ''))),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = cols.map(c => ({ wch: Math.max(14, c.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, config.tableCode);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  XLSX.writeFile(wb, `${config.tableCode}_ChuanQuyDinh_${ts}.xlsx`);
}

/**
 * Giải mã Base64 sang chuỗi UTF-8 an toàn
 */
function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Đọc file XML có sẵn (Hỗ trợ cả XML danh mục thuần HSDANHMUC / HSTH01BH và XML Giám định có NOIDUNGFILE Base64 như MAU_XML79_HIS.xml)
 * Giữ nguyên 100% logic của BtnImportXml_Click và ParseXmlToDataTable trong MainView.xaml.cs (dòng 480-650)
 */
export function parseTt12XmlTextWithMeta(
  xmlText: string,
  preferredConfig: TT12TableConfig
): Tt12ImportResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText.trim(), 'text/xml');
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('File XML không hợp lệ hoặc bị lỗi cú pháp.');
  }

  const allElements = Array.from(xmlDoc.getElementsByTagName('*'));
  const fileHoSoNodes = allElements.filter(el => el.localName === 'FILEHOSO');
  const rawRecords: Record<string, string>[] = [];
  let effectiveConfig = preferredConfig;

  if (fileHoSoNodes.length > 0) {
    // Trường hợp 1: File XML Giám định có chứa thẻ <NOIDUNGFILE> mã hóa Base64 (VD: MAU_XML79_HIS.xml)
    if (!effectiveConfig.tableCode.includes('01BH')) {
      effectiveConfig =
        TT12_CONFIGS.find(c => c.tableCode === 'MAU_01BH_7980') || preferredConfig;
    }
    for (const fileNode of fileHoSoNodes) {
      const children = Array.from(fileNode.children);
      const loaiHoSoEl = children.find(c => c.localName === 'LOAIHOSO');
      const noiDungEl = children.find(c => c.localName === 'NOIDUNGFILE');
      const loaiHoSo = loaiHoSoEl?.textContent?.trim() || '';
      const base64Str = noiDungEl?.textContent?.trim() || '';

      // Chỉ lấy dữ liệu từ XML1 (Bảng Tổng Hợp) cho Mẫu 01/BH
      if (effectiveConfig.tableCode.includes('01BH') && loaiHoSo !== 'XML1') {
        continue;
      }

      if (!base64Str) continue;
      try {
        const decodedXml = decodeBase64Utf8(base64Str);
        const subDoc = parser.parseFromString(decodedXml.trim(), 'text/xml');
        const extracted = extractLeafRecordsFromXmlDoc(subDoc);
        rawRecords.push(...extracted);
      } catch {
        // Bỏ qua nếu không phải Base64 hợp lệ
      }
    }
  } else {
    // Trường hợp 2: File XML thuần (HSDANHMUC hoặc HSTH01BH)
    // Tự động nhận diện bảng theo tên thẻ danh sách / thẻ bản ghi nếu người dùng đang chọn tab khác
    const matchedConfigByTag = TT12_CONFIGS.find(
      cfg =>
        allElements.some(el => el.localName === cfg.xmlItemElement) &&
        allElements.some(el => el.localName === cfg.xmlListElement)
    );
    if (matchedConfigByTag && !preferredConfig.tableCode.includes('01BH')) {
      effectiveConfig = matchedConfigByTag;
    } else if (matchedConfigByTag && matchedConfigByTag.xmlItemElement !== preferredConfig.xmlItemElement) {
      effectiveConfig = matchedConfigByTag;
    }

    const extracted = extractLeafRecordsFromXmlDoc(xmlDoc, effectiveConfig.xmlItemElement);
    rawRecords.push(...extracted);
  }

  if (rawRecords.length === 0) {
    throw new Error('Không tìm thấy dữ liệu bản ghi hợp lệ trong file XML.');
  }

  const firstKeys = Object.keys(rawRecords[0] || {});
  if (fileHoSoNodes.length === 0 && !allElements.some(el => el.localName === effectiveConfig.xmlItemElement)) {
    effectiveConfig = detectBestTt12ConfigForHeaders(firstKeys, effectiveConfig);
  }

  const autoSwitchedTable = effectiveConfig.tableCode !== preferredConfig.tableCode;
  const renamedColumns: string[] = [];
  const resolvedSequence: string[] = [];

  for (const k of firstKeys) {
    const resolved = resolveStandardColumnName(k, effectiveConfig);
    if (effectiveConfig.targetXmlColumns.includes(resolved)) {
      resolvedSequence.push(resolved);
      if (k.toUpperCase() !== resolved.toUpperCase()) {
        renamedColumns.push(`${k} → ${resolved}`);
      }
    }
  }

  const expectedFilteredOrder = effectiveConfig.targetXmlColumns.filter(col =>
    resolvedSequence.includes(col)
  );
  const reorderedColumns =
    resolvedSequence.length !== effectiveConfig.targetXmlColumns.length ||
    resolvedSequence.some((col, i) => col !== expectedFilteredOrder[i]);

  const rows = rawRecords.map((rec, idx) => normalizeAndEnrichRow(rec, effectiveConfig, idx + 1));

  return {
    rows,
    effectiveConfig,
    autoSwitchedTable,
    reorderedColumns,
    renamedColumns,
    matchedColumnCount: expectedFilteredOrder.length,
  };
}

export function parseTt12XmlText(
  xmlText: string,
  config: TT12TableConfig
): Record<string, string>[] {
  return parseTt12XmlTextWithMeta(xmlText, config).rows;
}

/**
 * Trích xuất các bản ghi từ DOM XML (hỗ trợ cả cấu trúc lồng <DS_THUOCPX><TT_THUOCPX> của Bảng 5)
 */
function extractLeafRecordsFromXmlDoc(
  xmlDoc: Document,
  preferredItemName?: string
): Record<string, string>[] {
  const root = xmlDoc.documentElement;
  if (!root) return [];

  const results: Record<string, string>[] = [];
  const allEls = Array.from(xmlDoc.getElementsByTagName('*'));

  // Nếu có chỉ định tên thẻ Item (VD: DMBOPHANCHUYENMON, DMDICHVUKBCB, CHITIET_HS01BH)
  if (preferredItemName) {
    const matchedItems = allEls.filter(el => el.localName === preferredItemName);
    if (matchedItems.length > 0) {
      for (const itemEl of matchedItems) {
        results.push(parseItemElementToRecord(itemEl));
      }
      return results;
    }
  }

  // Nếu là XML1 (<TONG_HOP>)
  if (root.localName === 'TONG_HOP') {
    const hasLeafChildren = Array.from(root.children).some(c => c.children.length === 0);
    if (hasLeafChildren) {
      results.push(parseItemElementToRecord(root));
      return results;
    }
  }

  // Tự động tìm các node bản ghi (có con là các thẻ lá và không nằm trong Signature/CHUKYDONVI)
  const recordNodes = allEls.filter(el => {
    if (el === root) return false;
    const ln = el.localName;
    if (
      ln === 'CHUKYDONVI' ||
      ln === 'Signature' ||
      ln === 'SignedInfo' ||
      ln === 'KeyInfo' ||
      ln === 'X509Data' ||
      ln === 'Object' ||
      ln === 'SignatureProperties' ||
      ln === 'SignatureProperty' ||
      ln === 'Transforms' ||
      ln === 'Reference' ||
      ln === 'TT_THUOCPX' ||
      ln === 'DS_THUOCPX'
    ) {
      return false;
    }
    // Bỏ qua mọi node nằm bên trong CHUKYDONVI hoặc Signature
    let p: Element | null = el.parentElement;
    while (p) {
      if (p.localName === 'CHUKYDONVI' || p.localName === 'Signature') return false;
      p = p.parentElement;
    }
    const childEls = Array.from(el.children);
    return childEls.length > 0 && childEls.some(c => c.children.length === 0);
  });

  for (const node of recordNodes) {
    results.push(parseItemElementToRecord(node));
  }

  return results;
}

function parseItemElementToRecord(itemEl: Element): Record<string, string> {
  const rec: Record<string, string> = {};
  for (const child of Array.from(itemEl.children)) {
    if (child.localName === 'DS_THUOCPX') {
      const ttThuocPx = Array.from(child.children).find(c => c.localName === 'TT_THUOCPX');
      if (ttThuocPx) {
        for (const sub of Array.from(ttThuocPx.children)) {
          rec[`THUOCPX_${sub.localName}`] = sub.textContent?.trim() || '';
        }
      }
    } else if (child.children.length === 0) {
      rec[child.localName] = child.textContent?.trim() || '';
    }
  }
  return rec;
}

/**
 * Đóng gói danh sách dòng thành chuỗi XML chuẩn TT12 / 01BH
 * Giữ nguyên 100% logic của BuildXmlDocument trong MainView.xaml.cs (dòng 760-836)
 */
export function buildTt12Xml(
  rows: Record<string, string>[],
  config: TT12TableConfig,
  customListId?: string
): string {
  const listId = customListId || `Id-${genUuid()}`;
  const columns = config.targetXmlColumns;

  const itemsXml = rows
    .map((row, idx) => {
      const normalized = normalizeAndEnrichRow(row, config, idx + 1);
      const regularTags: string[] = [];
      const thuocPxTags: { tag: string; val: string }[] = [];

      for (const colName of columns) {
        const val = normalized[colName] ?? '';
        if (colName.startsWith('THUOCPX_')) {
          const actualTagName = colName.substring('THUOCPX_'.length);
          thuocPxTags.push({ tag: actualTagName, val });
        } else {
          if (val === '') {
            regularTags.push(`<${colName}/>`);
          } else {
            regularTags.push(`<${colName}>${escXml(val)}</${colName}>`);
          }
        }
      }

      if (thuocPxTags.length > 0) {
        const hasThuocPxData = thuocPxTags.some(t => t.val.trim() !== '');
        if (hasThuocPxData) {
          const inner = thuocPxTags
            .map(t => (t.val === '' ? `<${t.tag}/>` : `<${t.tag}>${escXml(t.val)}</${t.tag}>`))
            .join('');
          regularTags.push(`<DS_THUOCPX><TT_THUOCPX>${inner}</TT_THUOCPX></DS_THUOCPX>`);
        } else {
          regularTags.push(`<DS_THUOCPX/>`);
        }
      }

      return `<${config.xmlItemElement}>${regularTags.join('')}</${config.xmlItemElement}>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<${config.xmlRootElement} xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<${config.xmlListElement} Id="${listId}">${itemsXml}</${config.xmlListElement}>` +
    `<CHUKYDONVI/>` +
    `</${config.xmlRootElement}>`
  );
}

/**
 * Chia dữ liệu thành các phần <= 4999 bản ghi (giống maxRecords = 4999 trong MainView.xaml.cs dòng 703)
 */
export function buildTt12XmlChunks(
  rows: Record<string, string>[],
  config: TT12TableConfig,
  maxRecords = 4999
): Array<{ partIndex: number; totalParts: number; recordCount: number; xmlContent: string; suggestedFileName: string }> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const totalRecords = rows.length;
  const totalParts = Math.max(1, Math.ceil(totalRecords / maxRecords));
  const chunks: Array<{ partIndex: number; totalParts: number; recordCount: number; xmlContent: string; suggestedFileName: string }> = [];

  for (let i = 0; i < totalParts; i++) {
    const slice = rows.slice(i * maxRecords, (i + 1) * maxRecords);
    const xmlContent = buildTt12Xml(slice, config);
    const suffix = totalParts > 1 ? `_P${i + 1}` : '';
    const filePrefix = config.tableCode.includes('01BH') ? 'HSTH01BH' : config.tableCode;
    chunks.push({
      partIndex: i + 1,
      totalParts,
      recordCount: slice.length,
      xmlContent,
      suggestedFileName: `${filePrefix}_${ts}${suffix}.xml`,
    });
  }

  return chunks;
}

/**
 * Ký số chuỗi XML TT12 / 01BH theo đúng chuẩn XMLDSig 2 Reference (#Object-CHUKYDONVI-Id-... và #Id-...)
 * Hỗ trợ cả VNPT SmartCA (TOTP / App) và USB Token dựa trên cấu hình sẵn có của Web App
 */
export async function signTt12XmlString(
  xmlString: string,
  method: 'SMARTCA' | 'USB_TOKEN',
  onProgress?: (msg: string) => void
): Promise<{
  signedXml: string;
  signerSubject: string;
  serialNumber: string;
}> {
  if (method === 'USB_TOKEN') {
    onProgress?.('🔐 Đang kết nối và ký số XML bằng USB Token...');
    const res = await signXmlWithUsbToken(xmlString, onProgress);
    return {
      signedXml: res.signedXml,
      signerSubject: res.subject || 'USB Token',
      serialNumber: res.serialNumber || '',
    };
  }

  // Ký bằng VNPT SmartCA (TOTP hoặc App theo cấu hình sẵn có trên Web App)
  const cfg = getSmartCAConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.userId) {
    throw new Error(
      'Chưa cấu hình chữ ký số VNPT SmartCA!\n' +
        'Vui lòng bấm nút "⚙ Cấu hình Chữ ký số" để nhập thông tin kết nối VNPT SmartCA và bấm "Lấy chứng thư số".'
    );
  }

  onProgress?.('🔐 Đang lấy Chứng thư số từ VNPT SmartCA...');
  const certInfo = await getSmartCaCertificate(cfg);
  const cleanCert = (certInfo.rawCertBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const subjectName = certInfo.subject || 'CN=CSKCB';

  // Tìm Id của thẻ danh sách (VD: <DANHSACH_DMBOPHANCHUYENMON Id="Id-..."> hoặc <DS_CHITIET Id="Id-...">)
  const idMatch = xmlString.match(/<([A-Za-z0-9_]+)\s+Id="([^"]+)"/);
  if (!idMatch) {
    throw new Error('Không tìm thấy thuộc tính Id trên thẻ danh sách XML để ký số.');
  }
  const listTagName = idMatch[1];
  const listId = idMatch[2];

  // Lấy nguyên khối thẻ danh sách để tính DigestValue C14N
  const listRegex = new RegExp(`<${listTagName}\\s+Id="${listId}">[\\s\\S]*?<\\/${listTagName}>`);
  const listBlockMatch = xmlString.match(listRegex);
  if (!listBlockMatch) {
    throw new Error(`Không trích xuất được khối dữ liệu <${listTagName}> để tính mã băm SHA-256.`);
  }
  const rawListXml = listBlockMatch[0];

  // Theo chuẩn Canonical XML 1.0 (C14N), thẻ con khi tách rời sẽ kế thừa xmlns:xsd và xmlns:xsi từ thẻ gốc
  const canonicalListXml = rawListXml.replace(
    `<${listTagName} Id="${listId}">`,
    `<${listTagName} xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Id="${listId}">`
  );
  const listDigestBase64 = await computeXmlHashBase64(canonicalListXml);

  // Tạo Object chứa SigningTime theo đúng chuẩn SignXmlWithSmartCaAsync trong MainView.xaml.cs (dòng 1043-1055)
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const signingTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const canonicalObjectXml = `<Object xmlns="http://www.w3.org/2000/09/xmldsig#" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Id="Object-CHUKYDONVI-${listId}"><SignatureProperties xmlns=""><SignatureProperty Id="SignatureProperty-CHUKYDONVI-${listId}" Target="#CHUKYDONVI-${listId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
  const objectDigestBase64 = await computeXmlHashBase64(canonicalObjectXml);

  // Chuỗi C14N của SignedInfo
  const canonicalSignedInfo =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>` +
    `<Reference URI="#Object-CHUKYDONVI-${listId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${objectDigestBase64}</DigestValue></Reference>` +
    `<Reference URI="#${listId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${listDigestBase64}</DigestValue></Reference>` +
    `</SignedInfo>`;

  const hashToSignBase64 = await computeXmlHashBase64(canonicalSignedInfo);

  const effectiveCfg: SmartCAConfig = {
    ...cfg,
    serialNumber: certInfo.serialNumber || cfg.serialNumber,
  };

  onProgress?.(
    effectiveCfg.signMode === 'APP'
      ? '📱 Đang gửi yêu cầu ký số sang ứng dụng VNPT SmartCA trên điện thoại...'
      : '☁️ Đang ký số tự động qua VNPT SmartCA (TOTP)...'
  );
  const signatureValueBase64 = await signSmartCAHash(effectiveCfg, hashToSignBase64, onProgress);
  const cleanSig = signatureValueBase64.replace(/\s+/g, '');

  const signedInfoElement =
    `<SignedInfo>` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<Reference URI="#Object-CHUKYDONVI-${listId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${objectDigestBase64}</DigestValue></Reference>` +
    `<Reference URI="#${listId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${listDigestBase64}</DigestValue></Reference>` +
    `</SignedInfo>`;

  const keyInfoElement =
    `<KeyInfo><X509Data>` +
    `<X509SubjectName>${escXml(subjectName)}</X509SubjectName>` +
    `<X509Certificate>${cleanCert}</X509Certificate>` +
    `</X509Data></KeyInfo>`;

  const objectElement =
    `<Object Id="Object-CHUKYDONVI-${listId}">` +
    `<SignatureProperties xmlns="">` +
    `<SignatureProperty Target="#CHUKYDONVI-${listId}" Id="SignatureProperty-CHUKYDONVI-${listId}">` +
    `<SigningTime>${signingTime}</SigningTime>` +
    `</SignatureProperty>` +
    `</SignatureProperties>` +
    `</Object>`;

  const chuKyBlock =
    `<CHUKYDONVI>` +
    `<Signature Id="CHUKYDONVI-${listId}" xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `${signedInfoElement}` +
    `<SignatureValue>${cleanSig}</SignatureValue>` +
    `${keyInfoElement}` +
    `${objectElement}` +
    `</Signature>` +
    `</CHUKYDONVI>`;

  let signedXml = xmlString;
  if (/<CHUKYDONVI\s*\/>/.test(signedXml)) {
    signedXml = signedXml.replace(/<CHUKYDONVI\s*\/>/, chuKyBlock);
  } else if (signedXml.includes('<CHUKYDONVI>')) {
    signedXml = signedXml.replace(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/, chuKyBlock);
  } else {
    signedXml = signedXml.replace(/(<\/[A-Za-z0-9_]+>\s*)$/, `${chuKyBlock}$1`);
  }

  onProgress?.('✅ Đã ký số XML thành công!');
  return {
    signedXml,
    signerSubject: subjectName,
    serialNumber: certInfo.serialNumber || cfg.serialNumber || '',
  };
}

