import { parse, format, isValid } from 'date-fns';
import { TemplateRow, ColumnMapping } from '../types';

export const b64DecodeUnicode = (str: string) => {
  try {
    const binString = atob(str);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return '';
  }
};

export const parseGiamDinhXml = (xmlStr: string): any[] => {
  const results: any[] = [];
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
  
  const fileHosos = xmlDoc.getElementsByTagName('FILEHOSO');
  for (let i = 0; i < fileHosos.length; i++) {
    const fileHoso = fileHosos[i];
    const loaiHosoNode = fileHoso.getElementsByTagName('LOAIHOSO')[0];
    if (loaiHosoNode && loaiHosoNode.textContent === 'XML1') {
      const noiDungNode = fileHoso.getElementsByTagName('NOIDUNGFILE')[0];
      if (noiDungNode && noiDungNode.textContent) {
        try {
          const decoded = b64DecodeUnicode(noiDungNode.textContent);
          if (decoded) {
            const tongHopDoc = parser.parseFromString(decoded, "text/xml");
            const tongHopNode = tongHopDoc.getElementsByTagName('TONG_HOP')[0] || tongHopDoc.documentElement;
            if (tongHopNode) {
              const rowData: any = {};
              for (let j = 0; j < tongHopNode.children.length; j++) {
                const child = tongHopNode.children[j];
                rowData[child.tagName] = child.textContent;
              }
              results.push(rowData);
            }
          }
        } catch (e) {
          console.error('Error decoding XML1 base64', e);
        }
      }
    }
  }

  // Fallback direct XML1 or TONG_HOP tags
  if (results.length === 0) {
    const tongHops = xmlDoc.getElementsByTagName('TONG_HOP');
    for (let i = 0; i < tongHops.length; i++) {
      const tongHopNode = tongHops[i];
      const rowData: any = {};
      for (let j = 0; j < tongHopNode.children.length; j++) {
        const child = tongHopNode.children[j];
        rowData[child.tagName] = child.textContent;
      }
      results.push(rowData);
    }
  }

  return results;
};

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

export const parseShortDateStr = (val: any): string => {
  if (!val) return '';
  
  if (val instanceof Date) {
    if (isValid(val)) return format(val, 'yyyyMMdd');
  }

  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isValid(date)) return format(date, 'yyyyMMdd');
  }

  const s = normalizeValue(val);
  
  const formats = [
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'yyyy/MM/dd'
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(s, fmt, new Date());
      if (isValid(parsed)) return format(parsed, 'yyyyMMdd');
    } catch (e) {
      // Continue
    }
  }

  const native = new Date(s);
  if (isValid(native)) {
     return format(native, 'yyyyMMdd');
  }

  const digits = s.replace(/[^0-9]/g, ''); 
  if (digits.length >= 8) {
    return digits.substring(0, 8);
  }

  return digits.padEnd(8, '0');
};

export const getNumericValue = (item: any, column: string): number | null => {
  if (!column) return null;
  let val = item[column];
  if (val === null || val === undefined || val === '') return null;
  
  if (typeof val === 'number') return val;
  
  let cleanStr = String(val).trim();
  if (cleanStr === '') return null;
  
  if (cleanStr.includes('.') && cleanStr.includes(',')) {
    const lastComma = cleanStr.lastIndexOf(',');
    const lastDot = cleanStr.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (cleanStr.includes(',')) {
    if (cleanStr.split(',').length > 2 || cleanStr.length - cleanStr.lastIndexOf(',') === 4) {
      cleanStr = cleanStr.replace(/,/g, '');
    } else {
      cleanStr = cleanStr.replace(',', '.');
    }
  } else if (cleanStr.includes('.')) {
     if (cleanStr.split('.').length > 2 || cleanStr.length - cleanStr.lastIndexOf('.') === 4) {
       cleanStr = cleanStr.replace(/\./g, '');
     }
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

export const mapExcelToRow = (data: any[], mapping: ColumnMapping, source: 'BHXH' | 'HIS'): TemplateRow[] => {
  return data.map((item, index) => {
    let t_tongchi_bv = getNumericValue(item, mapping.T_TONGCHI_BV);
    let t_bhtt = getNumericValue(item, mapping.T_BHTT);
    let t_bncct = getNumericValue(item, mapping.T_BNCCT);
    let t_bntt = getNumericValue(item, mapping.T_BNTT);
    let original_t_tongchi_bh = getNumericValue(item, mapping.T_TONGCHI_BH);
    
    let t_tongchi_bh: number | null = null;
    if (source === 'BHXH') {
      t_tongchi_bh = (t_bhtt || 0) + (t_bncct || 0);
    } else {
      if (original_t_tongchi_bh !== null) {
        t_tongchi_bh = original_t_tongchi_bh;
      } else {
        t_tongchi_bh = (t_bhtt || 0) + (t_bncct || 0);
      }
    }

    const maThe = normalizeValue(item[mapping.MA_THE_BHYT]);
    const ngaySinh = parseShortDateStr(item[mapping.NGAY_SINH]);
    const ngayVao = parseDateStr(item[mapping.NGAY_VAO]);
    const namSinh = ngaySinh.length >= 4 ? ngaySinh.substring(0, 4) : 'XXXX';
    const maLkGenerated = `${maThe}_${namSinh}_${ngayVao}`;

    return {
      STT: normalizeValue(item[mapping.STT] || index + 1),
      MA_LK: maLkGenerated,
      HO_TEN: normalizeValue(item[mapping.HO_TEN]),
      NGAY_SINH: ngaySinh,
      GIOI_TINH: normalizeValue(item[mapping.GIOI_TINH]),
      MA_THE_BHYT: maThe,
      MA_BENH_CHINH: normalizeValue(item[mapping.MA_BENH_CHINH]),
      NGAY_VAO: ngayVao,
      NGAY_VAO_NOI_TRU: parseDateStr(item[mapping.NGAY_VAO_NOI_TRU]),
      NGAY_RA: parseDateStr(item[mapping.NGAY_RA]),
      SO_NGAY_DTRI: normalizeValue(item[mapping.SO_NGAY_DTRI]),
      MA_LOAI_KCB: normalizeValue(item[mapping.MA_LOAI_KCB]),
      T_TONGCHI_BV: t_tongchi_bv,
      T_TONGCHI_BH: t_tongchi_bh,
      T_BHTT: t_bhtt,
      T_BNCCT: getNumericValue(item, mapping.T_BNCCT),
      T_BNTT: getNumericValue(item, mapping.T_BNTT),
      T_NGUONKHAC: getNumericValue(item, mapping.T_NGUONKHAC),
      MA_CSKCB: normalizeValue(item[mapping.MA_CSKCB]),
      NAM_QT: normalizeValue(item[mapping.NAM_QT]),
      THANG_QT: normalizeValue(item[mapping.THANG_QT]),
      source,
      originalData: item
    };
  });
};

export const generateKey = (row: TemplateRow): string => {
  if (row.MA_LK && row.MA_LK.trim() !== '') {
    return row.MA_LK.trim();
  }
  const id = row.MA_THE_BHYT || 'NO_ID';
  const inStr = row.NGAY_VAO ? row.NGAY_VAO.substring(0, 8) : 'NO_IN';
  return `${id}_${inStr}`;
};

export const smartMapHeaders = (headers: string[]): Partial<ColumnMapping> => {
  const mapping: any = {};
  const synonyms: Record<string, string[]> = {
    STT: ['STT', 'SO_THU_TU'],
    MA_LK: ['MA_LK', 'MALK', 'Mã LK', 'Mã liên kết', 'MA_LIEN_KET'],
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
    T_TONGCHI_BV: ['T_TONGCHI_BV', 'TONG_CHI_BV', 'TotalCost', 'Tổng chi phí BV', 'Tổng chi', 'TONG_CHI', 'T_TONGCHI'],
    T_TONGCHI_BH: ['T_TONGCHI_BH', 'TONG_CHI_BH', 'Tổng cộng'],
    T_BHTT: ['T_BHTT', 'Bảo hiểm TT', 'BAO_HIEM_TT', 'BHYT_TRA', 'InsuranceAmount', 'TIEN_BHYT', 'BHYT thanh toán'],
    T_BNCCT: ['T_BNCCT', 'Bệnh nhân CCT', 'BN_CCT', 'BN_CUNG_CHI_TRA', 'CoPayment', 'CCT', 'Cùng chi trả', 'Người bệnh cùng chi trả'],
    T_BNTT: ['T_BNTT', 'Bệnh nhân TT', 'BN_TT', 'BN_TU_TRA', 'PatientPayment', 'BNTT', 'Tự trả', 'Người bệnh tự trả'],
    T_NGUONKHAC: ['T_NGUONKHAC', 'NGUON_KHAC', 'Nguồn khác'],
    MA_CSKCB: ['MA_CSKCB', 'MABV', 'MA_BV'],
    NAM_QT: ['NAM_QT', 'NAM'],
    THANG_QT: ['THANG_QT', 'THANG']
  };

  const normalizedHeaders = headers.map(h => ({ original: h, normalized: h.trim().toUpperCase() }));
  const mappedOriginals = new Set<string>();

  // Pass 1: Exact matches
  Object.entries(synonyms).forEach(([key, aliases]) => {
    if (mapping[key]) return;
    const uppercaseAliases = aliases.map(a => a.toUpperCase());
    const available = normalizedHeaders.filter(h => !mappedOriginals.has(h.original));
    const found = available.find(h => uppercaseAliases.includes(h.normalized));
    if (found) {
      mapping[key] = found.original;
      mappedOriginals.add(found.original);
    }
  });

  // Pass 2: Starts with / Ends with
  Object.entries(synonyms).forEach(([key, aliases]) => {
    if (mapping[key]) return;
    const uppercaseAliases = aliases.map(a => a.toUpperCase());
    const available = normalizedHeaders.filter(h => !mappedOriginals.has(h.original));
    const found = available.find(h => 
      uppercaseAliases.some(a => h.normalized.startsWith(a) || h.normalized.endsWith(a))
    );
    if (found) {
      mapping[key] = found.original;
      mappedOriginals.add(found.original);
    }
  });

  // Pass 3: Includes
  Object.entries(synonyms).forEach(([key, aliases]) => {
    if (mapping[key]) return;
    const uppercaseAliases = aliases.map(a => a.toUpperCase());
    const available = normalizedHeaders.filter(h => !mappedOriginals.has(h.original));
    const found = available.find(h => 
      uppercaseAliases.some(a => h.normalized.includes(a) || a.includes(h.normalized))
    );
    if (found) {
      mapping[key] = found.original;
      mappedOriginals.add(found.original);
    }
  });

  return mapping;
};
