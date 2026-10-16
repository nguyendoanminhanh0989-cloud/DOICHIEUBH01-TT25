/**
 * IMPORT MAPPER - Ánh xạ cột Excel -> HoSoRecord cho từng loại mẫu BHXH
 *
 * Mỗi loại CT có cấu trúc cột khác nhau từ HIS/phần mềm xuất ra.
 * File này chuẩn hóa việc đọc và hiển thị đúng theo từng loại.
 *
 * Tên phần mềm: ĐỐI CHIẾU HỒ SƠ VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ANH - IT Y TẾ - ĐÀ NẴNG
 */

import type { DocType } from './xmlBuilder';
import { parseDateStr, parseShortDateStr } from './data-utils';

export type HoSoType = DocType;

export interface ColumnDisplayConfig {
  khoaLabel: string;
  chanDoanLabel: string;
  nguoiKyLabel: string;
  dinhDanhLabel: string;
}

export const COLUMN_DISPLAY: Record<string, ColumnDisplayConfig> = {
  CT03: { khoaLabel: 'KHOA / THỜI GIAN', chanDoanLabel: 'CHẨN ĐOÁN (ICD-10)', nguoiKyLabel: 'TRƯỞNG KHOA / CCHN', dinhDanhLabel: 'CCCD / BHYT' },
  CT04: { khoaLabel: 'THỜI GIAN NẰM VIỆN', chanDoanLabel: 'CHẨN ĐOÁN VÀO / RA', nguoiKyLabel: 'NGƯỜI ĐẠI DIỆN', dinhDanhLabel: 'CCCD / BHYT' },
  CT05: { khoaLabel: 'NGÀY SINH CON', chanDoanLabel: 'THÔNG TIN CON', nguoiKyLabel: 'NGƯỜI ĐỠ ĐẺ / KÝ', dinhDanhLabel: 'CMND / BHYT MẸ' },
  CT06: { khoaLabel: 'THỜI GIAN NGHỈ', chanDoanLabel: 'CHẨN ĐOÁN / THAI KỲ', nguoiKyLabel: 'BÁC SĨ / CCHN', dinhDanhLabel: 'CCCD / BHYT' },
  CT07: { khoaLabel: 'THỜI GIAN NGHỈ VIỆC', chanDoanLabel: 'CHẨN ĐOÁN ICD-10', nguoiKyLabel: 'BÁC SĨ / CCHN', dinhDanhLabel: 'CCCD / BHXH' },
};

export function normalizeHeaderKey(key: string): string {
  return String(key ?? '')
    .replace(/[\r\n\t]+/g, '')     // Xóa ký tự xuống dòng / tab trong cell bị wrap text (e.g. MAU_\nSO -> MAU_SO)
    .replace(/\s+/g, '_')          // Thay khoảng trắng thành dấu gạch dưới
    .replace(/_+/g, '_')           // Gộp nhiều dấu gạch dưới liên tiếp
    .replace(/^_+|_+$/g, '')       // Bỏ dấu gạch dưới ở đầu/cuối
    .toUpperCase();
}

export function normalizeRow(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = normalizeHeaderKey(k);
    if (cleanKey) {
      normalized[cleanKey] = v;
    }
    const upperKey = k.trim().toUpperCase();
    if (upperKey && normalized[upperKey] === undefined) {
      normalized[upperKey] = v;
    }
  }
  return normalized;
}

export function detectDocType(fileNameLower: string, firstRow: Record<string, any>, allRows?: Record<string, any>[]): HoSoType {
  // 1. Kiểm tra trực tiếp giá trị trong các cột chỉ định loại/mẫu chứng từ (ƯU TIÊN CAO NHẤT)
  const rowsToCheck = [firstRow, ...(allRows || []).slice(0, 5)].filter(Boolean);
  const docTypeKeyPattern = /^(MAU_SO|MA_CT|MAU_CT|MAUSO|MA_MAU|LOAI_CT|LOAI_CHUNG_TU|MA_CHUNG_TU|TEN_MAU|SO_MAU|FORM_CODE|DOC_TYPE)$/i;

  for (const row of rowsToCheck) {
    for (const [rawKey, rawVal] of Object.entries(row)) {
      const cleanKey = normalizeHeaderKey(rawKey);
      if (docTypeKeyPattern.test(cleanKey)) {
        const valStr = String(rawVal ?? '').toLowerCase().trim().replace(/[\s\-_]/g, '');
        if (valStr === 'ct07' || valStr === '07' || valStr === '7' || valStr.includes('ct07') || valStr.includes('nghiviec')) return 'CT07';
        if (valStr === 'ct06' || valStr === '06' || valStr === '6' || valStr.includes('ct06') || valStr.includes('duongthai')) return 'CT06';
        if (valStr === 'ct05' || valStr === '05' || valStr === '5' || valStr.includes('ct05') || valStr.includes('chungsinh')) return 'CT05';
        if (valStr === 'ct04' || valStr === '04' || valStr === '4' || valStr.includes('ct04') || valStr.includes('tomtat') || valStr.includes('hsba')) return 'CT04';
        if (valStr === 'ct03' || valStr === '03' || valStr === '3' || valStr.includes('ct03') || valStr.includes('ravien')) return 'CT03';
      }
    }
  }

  // 2. Kiểm tra theo tên file
  const fn = String(fileNameLower ?? '').toLowerCase();
  if (fn.includes('ct07') || fn.includes('nghiviec') || fn.includes('nghi_viec') || fn.includes('huongbhxh') || fn.includes('giaychungnhannghiviec')) return 'CT07';
  if (fn.includes('ct06') || fn.includes('nghiduongthai') || fn.includes('duongthai')) return 'CT06';
  if (fn.includes('ct05') || fn.includes('chungsinh') || fn.includes('dschungsinh')) return 'CT05';
  if (fn.includes('ct04') || fn.includes('tomtathosobenhan') || fn.includes('tomtathoso') || fn.includes('hsba')) return 'CT04';
  if (fn.includes('ct03') || fn.includes('giayravien') || fn.includes('dsgrav') || fn.includes('ravien')) return 'CT03';

  // 3. Phân tích cấu trúc cột (Dấu vân tay đặc trưng của từng loại chứng từ)
  const cols = Object.keys(firstRow || {}).map(k => normalizeHeaderKey(k));

  // CT05 (Giấy chứng sinh): Bắt buộc liên quan đến việc sinh con
  const isBirth = cols.includes('NGAY_SINH_CON') || cols.includes('NGAY_SINHCON') || 
                  cols.includes('CAN_NANG_CON') || cols.includes('TINH_TRANG_CON') || 
                  cols.includes('NGUOI_DO_DE') || cols.includes('SINHCON_PHAUTHUAT') || 
                  cols.includes('SINHCON_DUOI32TUAN') || 
                  (cols.includes('HOTEN_NND') && !cols.includes('TU_NGAY'));
  if (isBirth && !cols.includes('TU_NGAY')) return 'CT05';

  // CT06 (Nghỉ dưỡng thai): Đặc trưng có tuổi thai
  const isDuongThai = cols.includes('TUOI_THAI') || cols.includes('TUOITHAI');
  if (isDuongThai) return 'CT06';

  // CT07 (Nghỉ việc hưởng BHXH): Nghỉ từ ngày - đến ngày, số ngày, chẩn đoán ICD-10, bác sĩ ký (có thể có họ tên mẹ/cha khi chăm con ốm)
  const hasLeaveTime = (cols.includes('TU_NGAY') && cols.includes('DEN_NGAY')) || cols.includes('SO_NGAY');
  const hasCT07Signals = cols.includes('TEN_BSY') || cols.includes('TEN_NGUOI_HANH_NGHE') || 
                         cols.includes('SERI') || cols.includes('SO_SERI') || cols.includes('SO_KCB') || 
                         cols.includes('HO_TEN_ME') || cols.includes('HO_TEN_CHA') || 
                         cols.includes('CHANDOAN_DIEUTRI') || cols.includes('BENHICD10') || cols.includes('TENBENHICD10') || 
                         cols.includes('NGAY_KB') || cols.includes('NGAY_KCB') || cols.includes('LOAI_GIAYTO');

  if (hasLeaveTime && hasCT07Signals && !isBirth) return 'CT07';

  // CT04 (Tóm tắt hồ sơ bệnh án)
  if (cols.includes('CHAN_DOAN_VAO') || cols.includes('CHAN_DOAN_RA') || cols.includes('QT_BENHLY') || cols.includes('TT_RAVIEN') || cols.includes('TOM_TAT_HSBA')) return 'CT04';

  // CT03 (Giấy ra viện)
  if (cols.includes('NGAY_VAO') || cols.includes('NGAY_RA') || cols.includes('MA_KHOA') || cols.includes('TEN_TRUONGKHOA') || cols.includes('THU_TRUONG_DVI')) return 'CT03';

  // Nếu có thời gian nghỉ mà không rõ thì mặc định CT07
  if (hasLeaveTime) return 'CT07';

  return 'CT03';
}

export interface MappedDisplayFields {
  hoTen: string;
  maBhyt: string;
  maBhxh: string;
  cccd: string;
  khoaPrimary: string;
  khoaSecondary: string;
  chanDoanPrimary: string;
  chanDoanSecondary: string;
  nguoiKyPrimary: string;
  nguoiKySecondary: string;
}

export function mapRowToDisplay(type: HoSoType, row: Record<string, any>): MappedDisplayFields {
  const s = (k: string) => String(row[k] ?? row[normalizeHeaderKey(k)] ?? '').trim();

  switch (type) {
    case 'CT03': return {
      hoTen: s('HO_TEN') || s('HOTEN') || s('TEN_BENH_NHAN') || s('TEN_BN'),
      maBhyt: s('MA_THE') || s('MATHE'),
      maBhxh: s('MA_BHXH') || s('MA_SOBHXH'),
      cccd: s('SO_CCCD') || s('CCCD') || s('SO_CMND') || s('CMND'),
      khoaPrimary: s('MA_KHOA') || s('MA_YTE'),
      khoaSecondary: [s('NGAY_VAO'), s('NGAY_RA')].filter(Boolean).join(' → '),
      chanDoanPrimary: s('BENHICD10_ID') || s('BENH_ICD10_ID') || s('BENHICD10'),
      chanDoanSecondary: s('CHAN_DOAN') || s('TENBENHICD10'),
      nguoiKyPrimary: s('TEN_TRUONGKHOA') || s('THU_TRUONG_DVI') || s('NGUOI_DAI_DIEN'),
      nguoiKySecondary: s('MA_CCHN_TRUONGKHOA') || s('MA_CCHN') || s('MA_TRUONGKHOA'),
    };
    case 'CT04': return {
      hoTen: s('HO_TEN') || s('HOTEN') || s('TEN_BENH_NHAN') || s('TEN_BN'),
      maBhyt: s('MA_THE') || s('MATHE'),
      maBhxh: s('MA_BHXH') || s('MA_SOBHXH'),
      cccd: s('SO_CCCD') || s('CCCD') || s('SO_CMND') || s('CMND'),
      khoaPrimary: [s('NGAY_VAO'), s('NGAY_RA')].filter(Boolean).join(' → '),
      khoaSecondary: s('TT_RAVIEN') ? `Ra viện: ${s('TT_RAVIEN')}` : '',
      chanDoanPrimary: s('BENHICD10') || s('CHAN_DOAN_RA') || s('BENHICD10_ID'),
      chanDoanSecondary: s('TENBENHICD10') || s('CHAN_DOAN_VAO') || s('CHAN_DOAN'),
      nguoiKyPrimary: s('NGUOI_DAI_DIEN') || s('THU_TRUONG_DVI'),
      nguoiKySecondary: s('MA_CCHN') || '',
    };
    case 'CT05': return {
      hoTen: s('HO_TEN_ME') || s('HOTEN_NND'),
      maBhyt: s('MA_THE') || s('MA_THE_NND'),
      maBhxh: s('MA_SOBHXH_ME') || s('MA_BHXH_NND') || s('MA_SOBHXH'),
      cccd: s('CMND') || s('SO_CMND_NND') || s('SO_CCCD'),
      khoaPrimary: s('NGAY_SINHCON') || s('NGAY_SINH_CON'),
      khoaSecondary: [
        s('TEN_CON') ? `Con: ${s('TEN_CON')}` : '',
        s('CAN_NANG_CON') ? `${s('CAN_NANG_CON')}g` : '',
        s('GIOI_TINH_CON') === '1' ? 'Nam' : s('GIOI_TINH_CON') === '2' ? 'Nữ' : '',
      ].filter(Boolean).join(' | '),
      chanDoanPrimary: s('TINH_TRANG_CON') ? `Tình trạng: ${s('TINH_TRANG_CON')}` : '',
      chanDoanSecondary: [s('SINHCON_PHAUTHUAT') === '1' ? 'Phẫu thuật' : '', s('SINHCON_DUOI32TUAN') === '1' ? '<32 tuần' : ''].filter(Boolean).join(', '),
      nguoiKyPrimary: s('NGUOI_DAI_DIEN') || s('THU_TRUONG_DVI'),
      nguoiKySecondary: s('NGUOI_DO_DE') ? `Đỡ đẻ: ${s('NGUOI_DO_DE')}` : '',
    };
    case 'CT06': return {
      hoTen: s('HO_TEN') || s('HOTEN') || s('TEN_BENH_NHAN') || s('TEN_BN'),
      maBhyt: s('MA_THE') || s('MATHE'),
      maBhxh: s('MA_BHXH') || s('MA_SOBHXH'),
      cccd: s('SO_CCCD') || s('CCCD') || s('SO_CMND') || s('CMND'),
      khoaPrimary: [s('TU_NGAY'), s('DEN_NGAY')].filter(Boolean).join(' → '),
      khoaSecondary: s('TUOI_THAI') ? `Thai ${s('TUOI_THAI')} tuần` : '',
      chanDoanPrimary: s('BENHICD10') || s('CHAN_DOAN'),
      chanDoanSecondary: s('TENBENHICD10') || '',
      nguoiKyPrimary: s('TEN_BS'),
      nguoiKySecondary: s('MA_BS'),
    };
    case 'CT07': return {
      hoTen: s('HO_TEN') || s('HOTEN') || s('TEN_BENH_NHAN') || s('TEN_BN') || s('HO_VA_TEN') || (s('HO_TEN_ME') ? `Con của ${s('HO_TEN_ME')}` : ''),
      maBhyt: s('MA_THE') || s('MATHE') || s('MA_THE_BHYT') || s('MA_BHYT'),
      maBhxh: s('MA_SOBHXH') || s('MA_BHXH') || s('MASOBHXH') || s('MA_SO_BHXH'),
      cccd: s('SO_CCCD') || s('CCCD') || s('SO_CMND') || s('CMND'),
      khoaPrimary: [s('TU_NGAY'), s('DEN_NGAY')].filter(Boolean).join(' → '),
      khoaSecondary: s('SO_NGAY') ? `${s('SO_NGAY')} ngày nghỉ` : (s('HO_TEN_ME') ? `Mẹ: ${s('HO_TEN_ME')}` : ''),
      chanDoanPrimary: s('BENHICD10') || s('BENH_ICD10_ID') || s('CHANDOAN_DIEUTRI') || s('MA_BENH'),
      chanDoanSecondary: s('TENBENHICD10') || s('TEN_BENH') || s('CHANDOAN_DIEUTRI') || '',
      nguoiKyPrimary: s('TEN_BSY') || s('TEN_NGUOI_HANH_NGHE') || s('NGUOI_DAI_DIEN') || s('TEN_BS'),
      nguoiKySecondary: s('MA_CCHN') || s('MA_BS') || s('MA_BSY') || '',
    };
    default: return {
      hoTen: s('HO_TEN'),
      maBhyt: s('MA_THE'),
      maBhxh: s('MA_BHXH') || s('MA_SOBHXH'),
      cccd: s('SO_CCCD'),
      khoaPrimary: s('MA_KHOA'),
      khoaSecondary: '',
      chanDoanPrimary: s('BENHICD10_ID') || s('BENH_ICD10_ID'),
      chanDoanSecondary: s('CHAN_DOAN') || s('CHANDOAN_DIEUTRI'),
      nguoiKyPrimary: s('THU_TRUONG_DVI') || s('THU_TRUONG_DV') || s('NGUOI_DAI_DIEN'),
      nguoiKySecondary: s('MA_CCHN_TRUONGKHOA') || s('MA_CCHN') || s('MA_BS'),
    };
  }
}

export function mapRowToRawData(type: HoSoType, row: Record<string, any>): Record<string, string> {
  const raw: Record<string, string> = {};
  Object.entries(row).forEach(([k, v]) => {
    const cleanKey = normalizeHeaderKey(k);
    if (cleanKey) raw[cleanKey] = String(v ?? '').trim();
    raw[k.toUpperCase()] = String(v ?? '').trim();
  });

  if (!raw['MA_BHXH'] && raw['MA_SOBHXH']) raw['MA_BHXH'] = raw['MA_SOBHXH'];
  if (!raw['HO_TEN']) raw['HO_TEN'] = raw['HOTEN'] || raw['TEN_BENH_NHAN'] || raw['TEN_BN'] || raw['HO_VA_TEN'] || '';
  if (!raw['MA_THE']) raw['MA_THE'] = raw['MATHE'] || raw['MA_THE_BHYT'] || raw['MA_BHYT'] || '';
  if (!raw['SO_CCCD']) raw['SO_CCCD'] = raw['CCCD'] || raw['SO_CMND'] || raw['CMND'] || '';

  switch (type) {
    case 'CT03':
      if (!raw['MA_KHOA'] && raw['MA_YTE']) raw['MA_KHOA'] = raw['MA_YTE'];
      if (!raw['MA_CCHN_TRUONGKHOA'] && raw['MA_TRUONGKHOA']) raw['MA_CCHN_TRUONGKHOA'] = raw['MA_TRUONGKHOA'];
      break;
    case 'CT04':
      break;
    case 'CT05':
      if (!raw['HOTEN_NND'] && raw['HO_TEN_ME']) raw['HOTEN_NND'] = raw['HO_TEN_ME'];
      if (!raw['MA_BHXH_NND'] && raw['MA_SOBHXH_ME']) raw['MA_BHXH_NND'] = raw['MA_SOBHXH_ME'];
      if (!raw['SO_CMND_NND'] && raw['CMND']) raw['SO_CMND_NND'] = raw['CMND'];
      if (!raw['NGAYCAP_CMND_NND'] && raw['NGAY_CAP_CMND']) raw['NGAYCAP_CMND_NND'] = raw['NGAY_CAP_CMND'];
      if (!raw['NOICAP_CMND_NND'] && raw['NOI_CAP_CMND']) raw['NOICAP_CMND_NND'] = raw['NOI_CAP_CMND'];
      if (!raw['MA_DANTOC_NND'] && raw['DAN_TOC']) raw['MA_DANTOC_NND'] = raw['DAN_TOC'];
      if (!raw['NOI_DK_THUONGTRU_NND'] && raw['DIA_CHI']) raw['NOI_DK_THUONGTRU_NND'] = raw['DIA_CHI'];
      if (!raw['NGAY_SINH_CON'] && raw['NGAY_SINHCON']) raw['NGAY_SINH_CON'] = raw['NGAY_SINHCON'];
      if (!raw['THU_TRUONG_DVI'] && raw['NGUOI_DAI_DIEN']) raw['THU_TRUONG_DVI'] = raw['NGUOI_DAI_DIEN'];
      if (!raw['SO_SERI'] && raw['SO']) raw['SO_SERI'] = raw['SO'];
      if (!raw['NGAYSINH_NND'] && raw['NGAY_SINH']) raw['NGAYSINH_NND'] = raw['NGAY_SINH'];
      if (!raw['MA_THE_NND'] && raw['MA_THE']) raw['MA_THE_NND'] = raw['MA_THE'];
      break;
    case 'CT06':
      if (!raw['MA_CT']) raw['MA_CT'] = 'CT06';
      break;
    case 'CT07':
      if (!raw['BENH_ICD10_ID']) raw['BENH_ICD10_ID'] = raw['BENHICD10'] || raw['MA_BENH'] || raw['ICD10'] || '';
      if (!raw['TEN_NGUOI_HANH_NGHE']) raw['TEN_NGUOI_HANH_NGHE'] = raw['TEN_BSY'] || raw['TEN_BS'] || '';
      if (!raw['MA_CCHN']) raw['MA_CCHN'] = raw['MA_BS'] || raw['MA_BSY'] || '';
      if (!raw['CHANDOAN_DIEUTRI']) raw['CHANDOAN_DIEUTRI'] = raw['PP_DIEUTRI'] || raw['TENBENHICD10'] || raw['TEN_BENH'] || raw['CHAN_DOAN'] || '';
      if (!raw['THU_TRUONG_DV']) raw['THU_TRUONG_DV'] = raw['NGUOI_DAI_DIEN'] || '';
      if (!raw['SO_KCB']) raw['SO_KCB'] = raw['SERI'] || raw['SO_SERI'] || '';
      if (!raw['SO_SERI']) raw['SO_SERI'] = raw['SERI'] || raw['SO_KCB'] || '';
      if (!raw['NGAY_KCB']) raw['NGAY_KCB'] = raw['NGAY_KB'] || '';
      if (!raw['DON_VI']) raw['DON_VI'] = raw['TEN_DVI'] || raw['TEN_DON_VI'] || '';
      if (!raw['NGAY_CHUNG_TU']) raw['NGAY_CHUNG_TU'] = raw['NGAY_CT'] || raw['NGAY_TAO'] || '';
      if (!raw['NGAYCAP_CCCD']) raw['NGAYCAP_CCCD'] = raw['NGAY_CAP_CCCD'] || raw['NGAYCAP_CMND'] || '';
      if (!raw['NOICAP_CCCD']) raw['NOICAP_CCCD'] = raw['NOI_CAP_CCCD'] || raw['NOICAP_CMND'] || '';
      if (!raw['LOAI_GIAYTO']) raw['LOAI_GIAYTO'] = raw['LOAI_GIAY_TO'] || '1';
      if (!raw['MAU_SO']) raw['MAU_SO'] = 'CT07';
      break;
  }

  // Chuẩn hóa giới tính: 1 Nam, 2 Nữ, 3 Không xác định
  const normalizeGender = (val: string) => {
    const v = val.toLowerCase().trim();
    if (v === '1' || v === 'nam') return '1';
    if (v === '2' || v === 'nữ' || v === 'nu') return '2';
    if (v === '3' || v.includes('không')) return '3';
    return val;
  };
  if (raw['GIOI_TINH']) raw['GIOI_TINH'] = normalizeGender(raw['GIOI_TINH']);
  if (raw['GIOI_TINH_CON']) raw['GIOI_TINH_CON'] = normalizeGender(raw['GIOI_TINH_CON']);

  // Chuẩn hóa định dạng thời gian
  const timeFields = ['NGAY_VAO', 'NGAY_RA', 'NGAY_SINH_CON'];
  const dateFields = [
    'NGAY_CHUNG_TU', 'NGOAITRU_TUNGAY', 'NGOAITRU_DENNGAY', 
    'NGAY_SINH', 'NGAYCAP_CCCD', 'TU_NGAY', 'DEN_NGAY', 
    'NGAY_CAP_CMND', 'NGAYCAP_CMND_NND', 'NGAYSINH_NND',
    'NGAY_KCB', 'NGAY_KB'
  ];

  timeFields.forEach(f => {
    if (raw[f]) raw[f] = parseDateStr(raw[f]) || raw[f];
  });
  
  dateFields.forEach(f => {
    if (raw[f]) raw[f] = parseShortDateStr(raw[f]) || raw[f];
  });

  return raw;
}

export function validateRecord(type: HoSoType, raw: Record<string, string>): string[] {
  const errors: string[] = [];
  const req = (field: string, name: string) => {
    if (!raw[field]) errors.push(`Thiếu: ${name}`);
  };

  const checkDate = (field: string, name: string, isTime = false) => {
    if (raw[field]) {
      const parsed = isTime ? parseDateStr(raw[field]) : parseShortDateStr(raw[field]);
      // Cho phép cả 8 ký tự (YYYYMMDD) hoặc 12 ký tự (YYYYMMDDHHmm)
      if (!parsed || (isTime && parsed.length !== 12 && parsed.length !== 8) || (!isTime && parsed.length !== 8 && parsed.length !== 12)) {
        errors.push(`Sai định dạng thời gian: ${name} (Cột ${field})`);
      }
    }
  };

  const checkMaThe = (field: string, name: string) => {
    // Mã thẻ BHYT hợp lệ: 10 ký tự (chuẩn QĐ 1666 mới), 15 ký tự (chuẩn cũ) hoặc 17 ký tự (bổ sung)
    if (raw[field] && raw[field].length !== 10 && raw[field].length !== 15 && raw[field].length !== 17) {
      errors.push(`Sai độ dài: ${name} (Cột ${field}) phải là 10, 15 hoặc 17 ký tự`);
    }
  };

  if (type === 'CT05') {
    req('HOTEN_NND', 'Họ tên mẹ/sản phụ');
    checkMaThe('MA_THE_NND', 'Mã thẻ BHYT mẹ');
  } else {
    req('HO_TEN', 'Họ tên');
    checkMaThe('MA_THE', 'Mã thẻ BHYT');
  }

  if (type === 'CT03') {
    req('NGAY_VAO', 'Ngày vào');
    req('NGAY_RA', 'Ngày ra');
    req('MA_KHOA', 'Mã khoa');
    checkDate('NGAY_VAO', 'Ngày vào', true);
    checkDate('NGAY_RA', 'Ngày ra', true);
  } else if (type === 'CT04') {
    req('NGAY_VAO', 'Ngày vào');
    req('NGAY_RA', 'Ngày ra');
    checkDate('NGAY_VAO', 'Ngày vào', true);
    checkDate('NGAY_RA', 'Ngày ra', true);
  } else if (type === 'CT05') {
    req('NGAY_SINH_CON', 'Ngày sinh con');
    checkDate('NGAY_SINH_CON', 'Ngày sinh con', true);
  } else if (type === 'CT06') {
    req('TU_NGAY', 'Từ ngày');
    req('DEN_NGAY', 'Đến ngày');
    checkDate('TU_NGAY', 'Từ ngày', false);
    checkDate('DEN_NGAY', 'Đến ngày', false);
  } else if (type === 'CT07') {
    req('TU_NGAY', 'Từ ngày');
    req('DEN_NGAY', 'Đến ngày');
    checkDate('TU_NGAY', 'Từ ngày', false);
    checkDate('DEN_NGAY', 'Đến ngày', false);
  }

  return errors;
}

