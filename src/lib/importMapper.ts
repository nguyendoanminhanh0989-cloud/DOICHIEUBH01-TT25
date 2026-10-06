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

export function detectDocType(fileNameLower: string, firstRow: Record<string, any>): HoSoType {
  if (fileNameLower.includes('ct03') || fileNameLower.includes('giayravien') || fileNameLower.includes('dsgrav')) return 'CT03';
  if (fileNameLower.includes('ct04') || fileNameLower.includes('tomtathosobenhan') || fileNameLower.includes('tomtathoso')) return 'CT04';
  if (fileNameLower.includes('ct05') || fileNameLower.includes('chungsinh') || fileNameLower.includes('dschungsinh')) return 'CT05';
  if (fileNameLower.includes('ct06') || fileNameLower.includes('nghiduongthai') || fileNameLower.includes('giayxacnhan')) return 'CT06';
  if (fileNameLower.includes('ct07') || fileNameLower.includes('nghiviec') || fileNameLower.includes('nghiviechuong')) return 'CT07';

  const maCtRaw = (firstRow['MA_CT'] || firstRow['MAU_SO'] || '').toString().toLowerCase().trim();
  if (maCtRaw === 'ct03') return 'CT03';
  if (maCtRaw === 'ct04') return 'CT04';
  if (maCtRaw === 'ct05') return 'CT05';
  if (maCtRaw === 'ct06') return 'CT06';
  if (maCtRaw === 'ct07') return 'CT07';

  const cols = Object.keys(firstRow).map(k => k.toUpperCase());
  if (cols.includes('HOTEN_NND') || cols.includes('MA_SOBHXH_ME') || cols.includes('HO_TEN_ME')) return 'CT05';
  if (cols.includes('CHANDOAN_DIEUTRI') && cols.includes('TU_NGAY') && cols.includes('TEN_BSY')) return 'CT07';
  if (cols.includes('TU_NGAY') && cols.includes('TEN_BS') && cols.includes('MA_BS') && !cols.includes('TEN_BSY')) return 'CT06';
  if (cols.includes('CHAN_DOAN_VAO') && cols.includes('QT_BENHLY')) return 'CT04';
  if (cols.includes('NGAY_RA') && cols.includes('THU_TRUONG_DVI')) return 'CT03';

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
  const s = (k: string) => String(row[k] ?? '').trim();
  const su = (k: string) => String(row[k.toUpperCase()] ?? row[k] ?? '').trim();

  switch (type) {
    case 'CT03': return {
      hoTen: s('HO_TEN'),
      maBhyt: s('MA_THE'),
      maBhxh: s('MA_BHXH'),
      cccd: s('SO_CCCD'),
      khoaPrimary: s('MA_KHOA') || s('MA_YTE'),
      khoaSecondary: [s('NGAY_VAO'), s('NGAY_RA')].filter(Boolean).join(' → '),
      chanDoanPrimary: s('BENHICD10_ID') || s('BENH_ICD10_ID'),
      chanDoanSecondary: s('CHAN_DOAN'),
      nguoiKyPrimary: s('TEN_TRUONGKHOA') || s('THU_TRUONG_DVI'),
      nguoiKySecondary: s('MA_CCHN_TRUONGKHOA') || s('MA_CCHN') || s('MA_TRUONGKHOA'),
    };
    case 'CT04': return {
      hoTen: s('HO_TEN'),
      maBhyt: s('MA_THE'),
      maBhxh: s('MA_BHXH'),
      cccd: s('SO_CCCD'),
      khoaPrimary: [s('NGAY_VAO'), s('NGAY_RA')].filter(Boolean).join(' → '),
      khoaSecondary: s('TT_RAVIEN') ? `Ra viện: ${s('TT_RAVIEN')}` : '',
      chanDoanPrimary: s('BENHICD10') || s('CHAN_DOAN_RA'),
      chanDoanSecondary: s('TENBENHICD10') || s('CHAN_DOAN_VAO'),
      nguoiKyPrimary: s('NGUOI_DAI_DIEN'),
      nguoiKySecondary: s('MA_CCHN') || '',
    };
    case 'CT05': return {
      hoTen: s('HO_TEN_ME') || s('HOTEN_NND'),
      maBhyt: s('MA_THE') || s('MA_THE_NND'),
      maBhxh: s('MA_SOBHXH_ME') || s('MA_BHXH_NND') || s('MA_SOBHXH'),
      cccd: s('CMND') || s('SO_CMND_NND'),
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
      hoTen: s('HO_TEN'),
      maBhyt: s('MA_THE'),
      maBhxh: s('MA_BHXH'),
      cccd: s('SO_CCCD'),
      khoaPrimary: [s('TU_NGAY'), s('DEN_NGAY')].filter(Boolean).join(' → '),
      khoaSecondary: s('TUOI_THAI') ? `Thai ${s('TUOI_THAI')} tuần` : '',
      chanDoanPrimary: s('BENHICD10') || s('CHAN_DOAN'),
      chanDoanSecondary: s('TENBENHICD10') || '',
      nguoiKyPrimary: s('TEN_BS'),
      nguoiKySecondary: s('MA_BS'),
    };
    case 'CT07': return {
      hoTen: s('HO_TEN'),
      maBhyt: s('MA_THE'),
      maBhxh: s('MA_SOBHXH') || s('MA_BHXH'),
      cccd: s('SO_CCCD'),
      khoaPrimary: [s('TU_NGAY'), s('DEN_NGAY')].filter(Boolean).join(' → '),
      khoaSecondary: s('SO_NGAY') ? `${s('SO_NGAY')} ngày nghỉ` : '',
      chanDoanPrimary: s('BENHICD10') || s('CHANDOAN_DIEUTRI'),
      chanDoanSecondary: s('TENBENHICD10') || '',
      nguoiKyPrimary: s('TEN_BSY') || s('NGUOI_DAI_DIEN'),
      nguoiKySecondary: s('MA_BS') || s('MA_CCHN'),
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
  Object.entries(row).forEach(([k, v]) => { raw[k.toUpperCase()] = String(v ?? '').trim(); });

  if (!raw['MA_BHXH'] && raw['MA_SOBHXH']) raw['MA_BHXH'] = raw['MA_SOBHXH'];

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
      if (!raw['BENH_ICD10_ID'] && raw['BENHICD10']) raw['BENH_ICD10_ID'] = raw['BENHICD10'];
      if (!raw['TEN_NGUOI_HANH_NGHE'] && raw['TEN_BSY']) raw['TEN_NGUOI_HANH_NGHE'] = raw['TEN_BSY'];
      if (!raw['MA_CCHN'] && raw['MA_BS']) raw['MA_CCHN'] = raw['MA_BS'];
      if (!raw['CHANDOAN_DIEUTRI'] && raw['PP_DIEUTRI']) raw['CHANDOAN_DIEUTRI'] = raw['PP_DIEUTRI'];
      if (!raw['THU_TRUONG_DV'] && raw['NGUOI_DAI_DIEN']) raw['THU_TRUONG_DV'] = raw['NGUOI_DAI_DIEN'];
      if (!raw['SO_KCB'] && raw['SERI']) raw['SO_KCB'] = raw['SERI'];
      if (!raw['NGAY_CHUNG_TU'] && raw['NGAY_CT']) raw['NGAY_CHUNG_TU'] = raw['NGAY_CT'];
      if (!raw['MAU_SO']) raw['MAU_SO'] = 'CT07';
      break;
  }
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
      if (!parsed || (isTime && parsed.length !== 12) || (!isTime && parsed.length !== 8)) {
        errors.push(`Sai định dạng thời gian: ${name} (Cột ${field})`);
      }
    }
  };

  req('HO_TEN', 'Họ tên');
  
  if (type === 'CT03') {
    req('NGAY_VAO', 'Ngày vào');
    req('NGAY_RA', 'Ngày ra');
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
    checkDate('TU_NGAY', 'Từ ngày', true);
    checkDate('DEN_NGAY', 'Đến ngày', true);
  } else if (type === 'CT07') {
    req('TU_NGAY', 'Từ ngày');
    req('DEN_NGAY', 'Đến ngày');
    checkDate('TU_NGAY', 'Từ ngày', true);
    checkDate('DEN_NGAY', 'Đến ngày', true);
  }

  return errors;
}
