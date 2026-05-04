import { parse, format, isValid } from 'date-fns';
import { TemplateRow, ColumnMapping } from '../types';

export const normalizeValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

export const parseDateStr = (val: any): string => {
  if (!val) return '';
  
  if (val instanceof Date) {
    if (isValid(val)) return format(val, 'yyyyMMddHHmm');
  }

  // Try to parse Excel Serial Date
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isValid(date)) return format(date, 'yyyyMMddHHmm');
  }

  const s = normalizeValue(val);
  
  // Common string formats
  const formats = [
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'yyyy-MM-dd HH:mm:ss',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'yyyy/MM/dd'
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(s, fmt, new Date());
      if (isValid(parsed)) return format(parsed, 'yyyyMMddHHmm');
    } catch (e) {
      // Continue
    }
  }

  const native = new Date(s);
  if (isValid(native)) {
     return format(native, 'yyyyMMddHHmm');
  }

  const digits = s.replace(/[^0-9]/g, ''); 
  if (digits.length >= 12) {
    return digits.substring(0, 12);
  }
  if (digits.length === 8) {
    return digits + '0000';
  }

  return digits.padEnd(12, '0').substring(0, 12);
};

export const mapExcelToRow = (data: any[], mapping: ColumnMapping, source: 'BHXH' | 'HIS'): TemplateRow[] => {
  return data.map((item, index) => {
    return {
      STT: normalizeValue(item[mapping.STT] || index + 1),
      HO_TEN: normalizeValue(item[mapping.HO_TEN]),
      NGAY_SINH: normalizeValue(item[mapping.NGAY_SINH]),
      GIOI_TINH: normalizeValue(item[mapping.GIOI_TINH]),
      MA_THE_BHYT: normalizeValue(item[mapping.MA_THE_BHYT]),
      MA_BENH_CHINH: normalizeValue(item[mapping.MA_BENH_CHINH]),
      NGAY_VAO: parseDateStr(item[mapping.NGAY_VAO]),
      NGAY_VAO_NOI_TRU: parseDateStr(item[mapping.NGAY_VAO_NOI_TRU]),
      NGAY_RA: parseDateStr(item[mapping.NGAY_RA]),
      SO_NGAY_DTRI: normalizeValue(item[mapping.SO_NGAY_DTRI]),
      MA_LOAI_KCB: normalizeValue(item[mapping.MA_LOAI_KCB]),
      T_TONGCHI_BV: parseFloat(normalizeValue(item[mapping.T_TONGCHI_BV])) || 0,
      T_TONGCHI_BH: parseFloat(normalizeValue(item[mapping.T_TONGCHI_BH])) || 0,
      T_BHTT: parseFloat(normalizeValue(item[mapping.T_BHTT])) || 0,
      T_BNCCT: parseFloat(normalizeValue(item[mapping.T_BNCCT])) || 0,
      T_BNTT: parseFloat(normalizeValue(item[mapping.T_BNTT])) || 0,
      T_NGUONKHAC: parseFloat(normalizeValue(item[mapping.T_NGUONKHAC])) || 0,
      MA_CSKCB: normalizeValue(item[mapping.MA_CSKCB]),
      NAM_QT: normalizeValue(item[mapping.NAM_QT]),
      THANG_QT: normalizeValue(item[mapping.THANG_QT]),
      source,
      originalData: item
    };
  });
};

export const generateKey = (row: TemplateRow): string => {
  const id = row.MA_THE_BHYT || 'NO_ID';
  const inStr = row.NGAY_VAO ? row.NGAY_VAO.substring(0, 8) : 'NO_IN';
  return `${id}_${inStr}`;
};

export const smartMapHeaders = (headers: string[]): Partial<ColumnMapping> => {
  const mapping: any = {};
  const synonyms: Record<string, string[]> = {
    STT: ['STT', 'SO_THU_TU'],
    HO_TEN: ['HO_TEN', 'HOTEN', 'PatientName', 'Họ tên', 'TEN_BENH_NHAN'],
    NGAY_SINH: ['NGAY_SINH', 'NGAYSINH', 'Ngày sinh', 'BirthDay'],
    GIOI_TINH: ['GIOI_TINH', 'GIOITINH', 'Giới tính', 'Gender'],
    MA_THE_BHYT: ['MA_THE_BHYT', 'MA_THE', 'Mã thẻ', 'BHYTNumber', 'BHYT_NUMBER'],
    MA_BENH_CHINH: ['MA_BENH_CHINH', 'MA_BENH', 'Chẩn đoán', 'CHAN_DOAN', 'ICD10'],
    NGAY_VAO: ['NGAY_VAO', 'Ngày vào', 'IN_DATE', 'AdmissionDate', 'NGAYVAO'],
    NGAY_VAO_NOI_TRU: ['NGAY_VAO_NOI_TRU', 'NGAY_VAO_NT'],
    NGAY_RA: ['NGAY_RA', 'Ngày ra', 'OUT_DATE', 'DischargeDate', 'NGAYRA'],
    SO_NGAY_DTRI: ['SO_NGAY_DTRI', 'SONGAY_DT', 'SO_NGAY_DIEU_TRI'],
    MA_LOAI_KCB: ['MA_LOAI_KCB', 'MALOAIKCB', 'LOAI_KCB'],
    T_TONGCHI_BV: ['T_TONGCHI_BV', 'TONG_CHI_BV', 'TotalCost'],
    T_TONGCHI_BH: ['T_TONGCHI_BH', 'Tổng chi', 'TONG_CHI_BH', 'TONG_CHI'],
    T_BHTT: ['T_BHTT', 'Bảo hiểm TT', 'BAO_HIEM_TT', 'BHYT_TRA', 'InsuranceAmount', 'TIEN_BHYT'],
    T_BNCCT: ['T_BNCCT', 'Bệnh nhân CCT', 'BN_CCT', 'BN_CUNG_CHI_TRA', 'CoPayment', 'CCT'],
    T_BNTT: ['T_BNTT', 'Bệnh nhân TT', 'BN_TT', 'BN_TU_TRA', 'PatientPayment', 'BNTT'],
    T_NGUONKHAC: ['T_NGUONKHAC', 'NGUON_KHAC'],
    MA_CSKCB: ['MA_CSKCB', 'MABV', 'MA_BV'],
    NAM_QT: ['NAM_QT', 'NAM'],
    THANG_QT: ['THANG_QT', 'THANG']
  };

  const normalizedHeaders = headers.map(h => ({ original: h, normalized: h.trim().toUpperCase() }));

  Object.entries(synonyms).forEach(([key, aliases]) => {
    const uppercaseAliases = aliases.map(a => a.toUpperCase());
    
    let found = normalizedHeaders.find(h => uppercaseAliases.includes(h.normalized));
    
    if (!found) {
      found = normalizedHeaders.find(h => 
        uppercaseAliases.some(a => h.normalized.startsWith(a) || h.normalized.endsWith(a))
      );
    }

    if (!found) {
      found = normalizedHeaders.find(h => 
        uppercaseAliases.some(a => h.normalized.includes(a) || a.includes(h.normalized))
      );
    }

    if (found) mapping[key] = found.original;
  });

  return mapping;
};
