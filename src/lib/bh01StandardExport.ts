import ExcelJS from 'exceljs';
import { ComparisonResult, TemplateRow } from '../types';

export const BH01_STANDARD_20_COLUMNS = [
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
] as const;

export type Bh01StandardCol = (typeof BH01_STANDARD_20_COLUMNS)[number];

const NUMERIC_COLS = new Set<Bh01StandardCol>([
  'T_TONGCHI_BV',
  'T_TONGCHI_BH',
  'T_BHTT',
  'T_BNCCT',
  'T_BNTT',
  'T_NGUONKHAC',
]);

const REQUIRED_COLS: Bh01StandardCol[] = [
  'HO_TEN',
  'NGAY_SINH',
  'GIOI_TINH',
  'MA_THE_BHYT',
  'MA_BENH_CHINH',
  'NGAY_VAO',
  'NGAY_RA',
  'MA_LOAI_KCB',
  'MA_CSKCB',
  'NAM_QT',
  'THANG_QT',
];

export type Bh01AuditStatus =
  | 'MATCH'
  | 'ADJUSTED_FROM_BHXH'
  | 'MISSING_BHXH_KEEP_HIS'
  | 'MISSING_HIS_ONLY';

export interface Bh01AuditLogItem {
  stt: number;
  hoTen: string;
  maTheBhyt: string;
  ngayVao: string;
  status: Bh01AuditStatus;
  adjustedFields: string[];
  missingRequiredFields: string[];
}

export interface Bh01StandardDataset {
  rows: Record<Bh01StandardCol, string | number>[];
  logs: Bh01AuditLogItem[];
  missingHisLogs: Bh01AuditLogItem[];
  stats: {
    totalOutputRows: number;
    matchCount: number;
    adjustedCount: number;
    missingBhxhCount: number;
    missingHisCount: number;
    incompleteRowCount: number;
  };
}

function normalizeGenderVal(val: string): string {
  const v = String(val ?? '').trim().toUpperCase();
  if (v === '1' || v === 'NAM' || v === 'M') return '1';
  if (v === '2' || v === 'NỮ' || v === 'NU' || v === 'F') return '2';
  return String(val ?? '').trim();
}

function pickMergedRow(
  hisItem: TemplateRow | undefined,
  bhxhItem: TemplateRow | undefined,
  stt: number
): { row: Record<Bh01StandardCol, string | number>; adjustedFields: string[] } {
  const row = {} as Record<Bh01StandardCol, string | number>;
  const adjustedFields: string[] = [];

  for (const col of BH01_STANDARD_20_COLUMNS) {
    if (col === 'STT') {
      row.STT = stt;
      continue;
    }

    if (NUMERIC_COLS.has(col)) {
      const hisVal = hisItem?.[col] as number | null | undefined;
      const bhxhVal = bhxhItem?.[col] as number | null | undefined;

      if (bhxhItem && bhxhVal !== null && bhxhVal !== undefined) {
        row[col] = bhxhVal;
        if (hisItem && hisVal !== null && hisVal !== undefined && Math.abs(hisVal - bhxhVal) > 0.01) {
          adjustedFields.push(`${col}: HIS(${hisVal.toLocaleString('vi-VN')}) → BHXH(${bhxhVal.toLocaleString('vi-VN')})`);
        } else if (hisItem && (hisVal === null || hisVal === undefined)) {
          adjustedFields.push(`${col}: HIS(trống) → BHXH(${bhxhVal.toLocaleString('vi-VN')})`);
        }
      } else {
        row[col] = hisVal ?? 0;
      }
      continue;
    }

    const rawHis = hisItem ? String((hisItem as any)[col] ?? '').trim() : '';
    const rawBhxh = bhxhItem ? String((bhxhItem as any)[col] ?? '').trim() : '';

    if (bhxhItem && rawBhxh !== '') {
      const finalVal = col === 'GIOI_TINH' ? normalizeGenderVal(rawBhxh) : rawBhxh;
      row[col] = finalVal;
      if (hisItem) {
        const cmpHis = col === 'GIOI_TINH' ? normalizeGenderVal(rawHis) : rawHis.toUpperCase();
        const cmpBhxh = col === 'GIOI_TINH' ? normalizeGenderVal(rawBhxh) : rawBhxh.toUpperCase();
        if (cmpHis !== cmpBhxh) {
          adjustedFields.push(`${col}: HIS(${rawHis || 'trống'}) → BHXH(${rawBhxh})`);
        }
      }
    } else {
      row[col] = col === 'GIOI_TINH' && rawHis ? normalizeGenderVal(rawHis) : rawHis;
    }
  }

  return { row, adjustedFields };
}

function findMissingRequiredFields(row: Record<Bh01StandardCol, string | number>): string[] {
  const missing: string[] = [];
  for (const col of REQUIRED_COLS) {
    const val = String(row[col] ?? '').trim();
    if (!val) missing.push(col);
  }
  return missing;
}

/**
 * Xây dựng bộ dữ liệu Chuẩn BH01 (20 cột) từ kết quả đối chiếu:
 * - Giữ đủ toàn bộ hồ sơ bên HIS (bao gồm cả hồ sơ thiếu bên BHXH).
 * - Khi có sai lệch giữa HIS và BHXH: lấy giá trị bên BHXH làm gốc, bỏ qua giá trị sai bên HIS.
 * - Cảnh báo rõ hồ sơ thiếu bên BHXH, hồ sơ thiếu bên HIS, và hồ sơ thiếu cột bắt buộc.
 */
export function buildStandardBh01Dataset(
  results: ComparisonResult[],
  includeMissingHis = false
): Bh01StandardDataset {
  const rows: Record<Bh01StandardCol, string | number>[] = [];
  const logs: Bh01AuditLogItem[] = [];
  const missingHisLogs: Bh01AuditLogItem[] = [];

  let matchCount = 0;
  let adjustedCount = 0;
  let missingBhxhCount = 0;
  let missingHisCount = 0;
  let incompleteRowCount = 0;

  for (const res of results) {
    if (res.type === 'MISSING_HIS') {
      missingHisCount++;
      const bhxhOnly = res.bhxhItem;
      if (bhxhOnly) {
        const nextStt = rows.length + 1;
        const { row } = pickMergedRow(undefined, bhxhOnly, nextStt);
        const missingReq = findMissingRequiredFields(row);
        const logItem: Bh01AuditLogItem = {
          stt: includeMissingHis ? nextStt : missingHisCount,
          hoTen: String(row.HO_TEN || ''),
          maTheBhyt: String(row.MA_THE_BHYT || ''),
          ngayVao: String(row.NGAY_VAO || ''),
          status: 'MISSING_HIS_ONLY',
          adjustedFields: ['Chỉ có trên BHXH, thiếu bên HIS'],
          missingRequiredFields: missingReq,
        };
        missingHisLogs.push(logItem);
        if (includeMissingHis) {
          rows.push(row);
          logs.push(logItem);
          if (missingReq.length > 0) incompleteRowCount++;
        }
      }
      continue;
    }

    const stt = rows.length + 1;
    const { row, adjustedFields } = pickMergedRow(res.hisItem, res.bhxhItem, stt);
    const missingReq = findMissingRequiredFields(row);
    if (missingReq.length > 0) incompleteRowCount++;

    let status: Bh01AuditStatus = 'MATCH';
    if (res.type === 'MISSING_BHXH') {
      status = 'MISSING_BHXH_KEEP_HIS';
      missingBhxhCount++;
    } else if (res.type === 'DISCREPANCY' || adjustedFields.length > 0) {
      status = 'ADJUSTED_FROM_BHXH';
      adjustedCount++;
    } else {
      matchCount++;
    }

    rows.push(row);
    logs.push({
      stt,
      hoTen: String(row.HO_TEN || ''),
      maTheBhyt: String(row.MA_THE_BHYT || ''),
      ngayVao: String(row.NGAY_VAO || ''),
      status,
      adjustedFields,
      missingRequiredFields: missingReq,
    });
  }

  return {
    rows,
    logs,
    missingHisLogs,
    stats: {
      totalOutputRows: rows.length,
      matchCount,
      adjustedCount,
      missingBhxhCount,
      missingHisCount,
      incompleteRowCount,
    },
  };
}

export async function exportStandardBh01Workbook(dataset: Bh01StandardDataset, fileNamePrefix = 'Chuan_BH01') {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Đúng 20 cột chuẩn Mẫu 01/BH (C79) để nạp thẳng vào Chứng từ TT12 / Đẩy Cổng
  const sheetData = workbook.addWorksheet('MAU_01BH');
  sheetData.columns = BH01_STANDARD_20_COLUMNS.map(col => ({
    header: col,
    key: col,
    width: col === 'HO_TEN' ? 24 : col === 'MA_THE_BHYT' ? 18 : col === 'STT' ? 8 : 14,
  }));

  dataset.rows.forEach(r => {
    sheetData.addRow(r);
  });

  // Format header hàng 1
  const headerRow = sheetData.getRow(1);
  headerRow.font = { bold: true };

  // Sheet 2: Nhật ký cảnh báo & điều chỉnh theo BHXH
  const sheetAudit = workbook.addWorksheet('Canh_Bao_Dieu_Chinh');
  sheetAudit.columns = [
    { header: 'STT', key: 'STT', width: 8 },
    { header: 'HO_TEN', key: 'HO_TEN', width: 24 },
    { header: 'MA_THE_BHYT', key: 'MA_THE_BHYT', width: 18 },
    { header: 'NGAY_VAO', key: 'NGAY_VAO', width: 15 },
    { header: 'TRANG_THAI_XU_LY', key: 'TRANG_THAI', width: 28 },
    { header: 'CHI_TIET_DIEU_CHINH_THEO_BHXH', key: 'DIEU_CHINH', width: 55 },
    { header: 'CANH_BAO_THIEU_COT', key: 'THIEU_COT', width: 32 },
  ];
  sheetAudit.getRow(1).font = { bold: true };

  const statusLabel: Record<Bh01AuditStatus, string> = {
    MATCH: 'Khớp dữ liệu',
    ADJUSTED_FROM_BHXH: 'Đã sửa sai lệch theo BHXH',
    MISSING_BHXH_KEEP_HIS: 'Thiếu bên BHXH (lấy từ HIS)',
    MISSING_HIS_ONLY: 'Chỉ có bên BHXH (thiếu HIS)',
  };

  const allAuditItems = [
    ...dataset.logs.filter(l => l.status !== 'MATCH' || l.missingRequiredFields.length > 0),
    ...dataset.missingHisLogs.filter(m => !dataset.logs.some(l => l === m)),
  ];

  allAuditItems.forEach(item => {
    sheetAudit.addRow({
      STT: item.stt,
      HO_TEN: item.hoTen,
      MA_THE_BHYT: item.maTheBhyt,
      NGAY_VAO: item.ngayVao,
      TRANG_THAI: statusLabel[item.status],
      DIEU_CHINH: item.adjustedFields.join(' | '),
      THIEU_COT: item.missingRequiredFields.length > 0 ? `Thiếu: ${item.missingRequiredFields.join(', ')}` : '',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  a.download = `${fileNamePrefix}_${ts}.xlsx`;
  a.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 5000);
}
