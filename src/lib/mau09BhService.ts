/**
 * SERVICE LẬP, CHỈNH SỬA, KÝ SỐ, XUẤT XML / EXCEL / PDF & GỬI CỔNG BHXH CHO HỒ SƠ MẪU SỐ 09/BH
 * (Bảng kê chi tiết điều chỉnh / thu hồi ĐNTT theo Thông tư số 12/2026/TT-BTC & QĐ 326/QĐ-BHXH)
 *
 * Cấu trúc XML chuẩn Mục IX (Loại hồ sơ = 73 - Endpoint: /api/HSDCTT12/GuiHoSoDieuChinh09BH):
 * <HOSO_DIEUCHINH_GD>
 *   <TT_HOSO Id="Id-...">
 *     <TT_MAU>...</TT_MAU>
 *     <TT_XML1>...</TT_XML1>
 *     <TT_DIEUCHINH>
 *       <DS_XML1_DIEUCHINH>
 *         <TT_XML1_DC>...</TT_XML1_DC>
 *       </DS_XML1_DIEUCHINH>
 *       <DSCP_DIEUCHINH>
 *         <CHIPHI>...</CHIPHI>
 *       </DSCP_DIEUCHINH>
 *     </TT_DIEUCHINH>
 *   </TT_HOSO>
 *   <CHUKYDONVI>...</CHUKYDONVI>
 * </HOSO_DIEUCHINH_GD>
 */

import * as XLSX from 'xlsx';
import {
  XML3176_TABLES,
  FIELD_LABELS_3176,
  Xml3176ParsedDoc,
  Xml3176TableId,
} from './xml3176Service';

export interface Mau09TtMau {
  MAU_SO: string;        // Cố định: "09/BH"
  MA_CSKCB: string;      // Mã CSKCB (5 ký tự)
  NGUOILAPBIEU: string;  // Họ tên người lập biểu
  THUTRUONG_DV: string;  // Họ tên thủ trưởng đơn vị
  NGAYTHANGNAM: string;  // Ngày lập biểu (8 ký tự yyyyMMdd)
}

export interface Mau09TtXml1 {
  XML1_ID: string;       // ID hồ sơ XML1 trên Cổng BHXH (nếu có)
  MA_LK: string;         // Mã liên kết hồ sơ gốc
  MA_BN: string;         // Mã bệnh nhân
  HO_TEN: string;        // Họ tên người bệnh
  MA_THE: string;        // Mã thẻ BHYT
  NGAY_VAO: string;      // 12 ký tự yyyyMMddHHmm
  NGAY_RA: string;       // 12 ký tự yyyyMMddHHmm
  KY_QT: string;         // 6 ký tự yyyyMM
  TRANGTHAI: string;     // "1": Đề nghị điều chỉnh / Thu hồi ĐNTT; "2": Đề nghị hủy / Điều chỉnh dữ liệu gốc; "4": Xin ý kiến cấp có thẩm quyền
}

export interface Mau09Xml1DcItem {
  STT: number;
  TRUONG_TT_GOC: string;
  TT_GOC: string;
  TRUONG_TT_DIEUCHINH: string;
  TT_DIEUCHINH: string;
  LYDO_DIEUCHINH: string;
}

export interface Mau09ChiPhiItem {
  STT: number;
  SOBANG_XML: string;    // "2" (XML2), "3" (XML3), ...
  ID_CP: string;         // ID chi phí trên Cổng (nếu có)
  STT_XML: string;       // STT dòng chi phí trong bảng XML gốc
  NGAY_YL: string;       // Ngày y lệnh (12 ký tự yyyyMMddHHmm)
  TRANGTHAI: string;     // "1": Đề nghị điều chỉnh; "2": Đề nghị hủy / Thu hồi; "4": Xin ý kiến
  TRUONG_TT_GOC: string;
  TT_GOC: string;
  LYDO: string;          // Lý do từ chối tự động từ Cổng (nếu có)
  TUCHOI: string;        // Cờ từ chối (0 hoặc 1)
  TRUONG_TT_DIEUCHINH: string;
  TT_DIEUCHINH: string;
  LYDO_DIEUCHINH: string;
}

export interface Mau09Xml1FieldDraft {
  stt: number;
  field: string;
  label: string;
  originalValue: string;
  ttGoc: string;
  ttDieuChinh: string;
  lyDoDieuChinh: string;
}

export interface Mau09CostFieldDraft {
  stt: number;
  field: string;
  label: string;
  originalValue: string;
  ttGoc: string;
  ttDieuChinh: string;
  lyDoDieuChinh: string;
}

export interface Mau09SourceCostRow {
  sourceRowId: string;
  tableId: Xml3176TableId;
  soBangXml: string;
  sttXml: string;
  idCp: string;
  ngayYl: string;
  trangThai: string;      // "1": Điều chỉnh; "2": Hủy / Thu hồi chi phí; "4": Xin ý kiến
  lyDoTuChoi: string;
  tuChoi: string;
  summaryLabel: string;
  thanhTienGoc: number;
  withdrawEntireRow: boolean; // Nếu đánh dấu hủy/thu hồi cả dòng chi phí này
  withdrawReason: string;
  fieldDrafts: Mau09CostFieldDraft[];
}

export interface Mau09BhRecord {
  id: string;
  hosoIndex: number;
  createdAt: string;
  updatedAt: string;
  ttMau: Mau09TtMau;
  ttXml1: Mau09TtXml1;
  xml1FieldsDraft: Mau09Xml1FieldDraft[];
  costRowsDraft: Mau09SourceCostRow[];
  dsXml1Dc: Mau09Xml1DcItem[];
  dscpDc: Mau09ChiPhiItem[];
  isSigned: boolean;
  signedXml?: string;
  signerSubject?: string;
  signingTime?: string;
  submitStatus?: 'PENDING' | 'SUBMITTED' | 'ERROR';
  maGiaoDich?: string;
  submitTime?: string;
  submitMessage?: string;
}

export const MAU09_COST_TABLE_OPTIONS: Array<{
  tableId: Xml3176TableId;
  soBangXml: string;
  label: string;
}> = [
  { tableId: 'XML2', soBangXml: '2', label: 'XML2 - Chi tiết thuốc' },
  { tableId: 'XML3', soBangXml: '3', label: 'XML3 - Chi tiết DVKT/VTYT' },
  { tableId: 'XML4', soBangXml: '4', label: 'XML4 - Chi tiết CLS' },
  { tableId: 'XML5', soBangXml: '5', label: 'XML5 - Diễn biến lâm sàng' },
  { tableId: 'XML6', soBangXml: '6', label: 'XML6 - Điều trị HIV/AIDS' },
  { tableId: 'XML7', soBangXml: '7', label: 'XML7 - Giấy ra viện' },
  { tableId: 'XML8', soBangXml: '8', label: 'XML8 - Tóm tắt hồ sơ bệnh án' },
  { tableId: 'XML9', soBangXml: '9', label: 'XML9 - Giấy chứng sinh' },
  { tableId: 'XML10', soBangXml: '10', label: 'XML10 - Giấy nghỉ dưỡng thai' },
  { tableId: 'XML11', soBangXml: '11', label: 'XML11 - Giấy nghỉ hưởng BHXH' },
  { tableId: 'XML13', soBangXml: '13', label: 'XML13 - Giấy chuyển tuyến' },
  { tableId: 'XML14', soBangXml: '14', label: 'XML14 - Giấy hẹn khám lại' },
  { tableId: 'XML15', soBangXml: '15', label: 'XML15 - Điều trị bệnh lao' },
];

export const MAU09_TRANGTHAI_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: '1 - Đề nghị điều chỉnh' },
  { value: '2', label: '2 - Đề nghị thu hồi / hủy ĐNTT' },
  { value: '4', label: '4 - Xin ý kiến các cấp có thẩm quyền' },
];

function escXml(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function genUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getTodayYyyyMmDd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Chuẩn hóa chuỗi ngày giờ về 12 ký tự yyyyMMddHHmm theo đúng quy định thẻ NGAY_VAO / NGAY_RA của Mẫu 09/BH
 */
export function normalizeTo12DigitDateTime(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // Nếu ở dạng ddMMyyyyHHmm (ví dụ "21/11/2026 07:18" -> "211120260718")
  if (digits.length >= 8 && /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}/.test(digits)) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    const rest = (digits.slice(8) + '0000').slice(0, 4);
    return `${yyyy}${mm}${dd}${rest}`;
  }
  if (digits.length >= 12) return digits.slice(0, 12);
  if (digits.length === 8) return `${digits}0000`;
  return digits.padEnd(12, '0');
}

/**
 * Định dạng hiển thị thân thiện "dd/MM/yyyy HH:mm" từ chuỗi 12 ký tự yyyyMMddHHmm
 */
export function formatDisplayDateTime12(raw: string): string {
  const norm = normalizeTo12DigitDateTime(raw);
  if (norm.length < 8) return raw || '';
  const y = norm.slice(0, 4);
  const m = norm.slice(4, 6);
  const d = norm.slice(6, 8);
  const hh = norm.slice(8, 10) || '00';
  const mi = norm.slice(10, 12) || '00';
  return `${d}/${m}/${y} ${hh}:${mi}`;
}

/**
 * Kiểm tra xem 1 dòng trường hành chính XML1 có được điều chỉnh không
 */
export function isXml1FieldAdjusted(item: Mau09Xml1FieldDraft): boolean {
  if (item.lyDoDieuChinh.trim() !== '') return true;
  const orig = item.originalValue.trim();
  const edited = item.ttDieuChinh.trim();
  const goc = item.ttGoc.trim();
  if (edited !== orig) return true;
  if (goc !== '' && edited !== goc) return true;
  return false;
}

/**
 * Kiểm tra xem 1 trường trong dòng chi phí có được điều chỉnh không
 */
export function isCostFieldAdjusted(f: Mau09CostFieldDraft): boolean {
  if (f.lyDoDieuChinh.trim() !== '') return true;
  const orig = f.originalValue.trim();
  const edited = f.ttDieuChinh.trim();
  const goc = f.ttGoc.trim();
  if (edited !== orig) return true;
  if (goc !== '' && edited !== goc) return true;
  return false;
}

/**
 * Kiểm tra xem 1 dòng chi phí gốc có thay đổi hoặc bị đánh dấu thu hồi/hủy không
 */
export function isCostRowAdjusted(row: Mau09SourceCostRow): boolean {
  if (row.withdrawEntireRow || row.trangThai === '2') return true;
  return row.fieldDrafts.some(isCostFieldAdjusted);
}

/**
 * Tổng hợp danh sách <TT_XML1_DC> và <CHIPHI> từ trạng thái chỉnh sửa trên form Mẫu 09/BH
 */
export function compileMau09Adjustments(
  xml1FieldsDraft: Mau09Xml1FieldDraft[],
  costRowsDraft: Mau09SourceCostRow[]
): {
  dsXml1Dc: Mau09Xml1DcItem[];
  dscpDc: Mau09ChiPhiItem[];
} {
  const dsXml1Dc: Mau09Xml1DcItem[] = [];
  let sttXml1 = 1;
  for (const f of xml1FieldsDraft) {
    if (!isXml1FieldAdjusted(f)) continue;
    dsXml1Dc.push({
      STT: sttXml1++,
      TRUONG_TT_GOC: f.field,
      TT_GOC: f.ttGoc.trim() !== '' ? f.ttGoc.trim() : f.originalValue,
      TRUONG_TT_DIEUCHINH: f.field,
      TT_DIEUCHINH: f.ttDieuChinh.trim(),
      LYDO_DIEUCHINH: f.lyDoDieuChinh.trim() || `Điều chỉnh chỉ tiêu ${f.field}`,
    });
  }

  const dscpDc: Mau09ChiPhiItem[] = [];
  let sttCp = 1;
  for (const row of costRowsDraft) {
    const modifiedFields = row.fieldDrafts.filter(isCostFieldAdjusted);
    if (modifiedFields.length > 0) {
      for (const mf of modifiedFields) {
        dscpDc.push({
          STT: sttCp++,
          SOBANG_XML: row.soBangXml,
          ID_CP: row.idCp.trim(),
          STT_XML: row.sttXml.trim() || '1',
          NGAY_YL: normalizeTo12DigitDateTime(row.ngayYl) || row.ngayYl.trim(),
          TRANGTHAI: row.trangThai || '1',
          TRUONG_TT_GOC: mf.field,
          TT_GOC: mf.ttGoc.trim() !== '' ? mf.ttGoc.trim() : mf.originalValue,
          LYDO: row.lyDoTuChoi.trim(),
          TUCHOI: row.tuChoi.trim() || '0',
          TRUONG_TT_DIEUCHINH: mf.field,
          TT_DIEUCHINH: mf.ttDieuChinh.trim(),
          LYDO_DIEUCHINH:
            mf.lyDoDieuChinh.trim() ||
            row.withdrawReason.trim() ||
            row.lyDoTuChoi.trim() ||
            `Điều chỉnh chỉ tiêu ${mf.field}`,
        });
      }
    } else if (row.withdrawEntireRow || row.trangThai === '2') {
      // Thu hồi / hủy cả dòng chi phí
      const keyField =
        row.tableId === 'XML2'
          ? 'TEN_THUOC'
          : row.tableId === 'XML3'
          ? 'TEN_DICH_VU'
          : row.fieldDrafts[0]?.field || 'THANH_TIEN_BV';
      const targetDraft =
        row.fieldDrafts.find(x => x.field === keyField && x.originalValue) ||
        row.fieldDrafts.find(x => x.field === 'THANH_TIEN_BV') ||
        row.fieldDrafts[0];
      dscpDc.push({
        STT: sttCp++,
        SOBANG_XML: row.soBangXml,
        ID_CP: row.idCp.trim(),
        STT_XML: row.sttXml.trim() || '1',
        NGAY_YL: normalizeTo12DigitDateTime(row.ngayYl) || row.ngayYl.trim(),
        TRANGTHAI: '2',
        TRUONG_TT_GOC: targetDraft?.field || keyField,
        TT_GOC: targetDraft?.originalValue || String(row.thanhTienGoc || ''),
        LYDO: row.lyDoTuChoi.trim(),
        TUCHOI: row.tuChoi.trim() || '0',
        TRUONG_TT_DIEUCHINH: targetDraft?.field || keyField,
        TT_DIEUCHINH: '0',
        LYDO_DIEUCHINH:
          row.withdrawReason.trim() ||
          row.lyDoTuChoi.trim() ||
          'Thu hồi / hủy chi phí đề nghị thanh toán',
      });
    }
  }

  return { dsXml1Dc, dscpDc };
}

/**
 * Khởi tạo hồ sơ Mẫu 09/BH nháp từ 1 hồ sơ bệnh nhân (hosoIndex) đã nạp trong XML 3176
 */
export function createMau09DraftFromHoso(
  doc: Xml3176ParsedDoc,
  hosoIndex: number,
  defaults?: {
    maCskcb?: string;
    nguoiLapBieu?: string;
    thuTruongDv?: string;
    trangThai?: string;
  }
): Mau09BhRecord {
  const xml1Row = doc.tables.XML1.find(r => r.hosoIndex === hosoIndex) || doc.tables.XML1[0];
  const f1 = xml1Row?.fields || {};

  const namQt = (f1.NAM_QT || '').trim();
  const thangQt = (f1.THANG_QT || '').trim();
  const ngayRaNorm = normalizeTo12DigitDateTime(f1.NGAY_RA || '');
  const kyQt =
    namQt && thangQt
      ? `${namQt}${thangQt.padStart(2, '0')}`
      : ngayRaNorm.length >= 6
      ? ngayRaNorm.slice(0, 6)
      : getTodayYyyyMmDd().slice(0, 6);

  const xml1Meta = XML3176_TABLES.find(t => t.id === 'XML1')!;
  const allXml1Cols = Array.from(
    new Set([...xml1Meta.defaultFields, ...Object.keys(f1)])
  );

  // Theo đúng giao diện Mẫu 09/BH: MA_LK, STT, MA_BN có sẵn cả bên TT gốc và TT điều chỉnh; các trường khác sẵn bên TT điều chỉnh để người dùng đối chiếu & sửa
  const prefillTtGocFields = new Set(['MA_LK', 'STT', 'MA_BN']);
  const xml1FieldsDraft: Mau09Xml1FieldDraft[] = allXml1Cols.map((col, idx) => {
    const val = f1[col] ?? '';
    return {
      stt: idx + 1,
      field: col,
      label: FIELD_LABELS_3176[col] || col,
      originalValue: val,
      ttGoc: prefillTtGocFields.has(col) ? val : '',
      ttDieuChinh: val,
      lyDoDieuChinh: '',
    };
  });

  const costRowsDraft: Mau09SourceCostRow[] = [];
  for (const opt of MAU09_COST_TABLE_OPTIONS) {
    const tMeta = XML3176_TABLES.find(t => t.id === opt.tableId);
    const rowsInTable = (doc.tables[opt.tableId] || []).filter(
      r => r.hosoIndex === hosoIndex
    );
    rowsInTable.forEach((r, rIdx) => {
      const rf = r.fields || {};
      const cols = Array.from(
        new Set([...(tMeta?.defaultFields || []), ...Object.keys(rf)])
      );
      const sttXml = rf.STT || String(rIdx + 1);
      const ngayYl =
        rf.NGAY_YL ||
        rf.NGAY_TH_YL ||
        rf.NGAY_KQ ||
        rf.THOI_DIEM_DBLS ||
        rf.NGAY_CT ||
        f1.NGAY_VAO ||
        '';
      const thanhTienGoc =
        Number(
          String(rf.THANH_TIEN_BV ?? rf.THANH_TIEN_BH ?? rf.T_BHTT ?? '0').replace(/,/g, '.')
        ) || 0;
      const summaryLabel =
        rf.TEN_THUOC ||
        rf.TEN_DICH_VU ||
        rf.TEN_VAT_TU ||
        rf.TEN_CHI_SO ||
        rf.DIEN_BIEN_LS ||
        rf.CHAN_DOAN_RV ||
        `${opt.tableId} #${sttXml}`;

      const fieldDrafts: Mau09CostFieldDraft[] = cols.map((col, fIdx) => {
        const val = rf[col] ?? '';
        return {
          stt: fIdx + 1,
          field: col,
          label: FIELD_LABELS_3176[col] || col,
          originalValue: val,
          ttGoc: val,
          ttDieuChinh: val,
          lyDoDieuChinh: '',
        };
      });

      costRowsDraft.push({
        sourceRowId: r.rowId,
        tableId: opt.tableId,
        soBangXml: opt.soBangXml,
        sttXml,
        idCp: rf.ID_CP || rf.ID_CHIPHI || '',
        ngayYl,
        trangThai: '1',
        lyDoTuChoi: '',
        tuChoi: '0',
        summaryLabel,
        thanhTienGoc,
        withdrawEntireRow: false,
        withdrawReason: '',
        fieldDrafts,
      });
    });
  }

  const nowIso = new Date().toISOString();
  return {
    id: `mau09_${hosoIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    hosoIndex,
    createdAt: nowIso,
    updatedAt: nowIso,
    ttMau: {
      MAU_SO: '09/BH',
      MA_CSKCB: (defaults?.maCskcb || f1.MA_CSKCB || doc.maCskcb || '48225').trim(),
      NGUOILAPBIEU: (defaults?.nguoiLapBieu || '').trim(),
      THUTRUONG_DV: (defaults?.thuTruongDv || '').trim(),
      NGAYTHANGNAM: getTodayYyyyMmDd(),
    },
    ttXml1: {
      XML1_ID: (f1.XML1_ID || '').trim(),
      MA_LK: (f1.MA_LK || '').trim(),
      MA_BN: (f1.MA_BN || '').trim(),
      HO_TEN: (f1.HO_TEN || '').trim(),
      MA_THE: (f1.MA_THE_BHYT || f1.MA_THE || '').trim(),
      NGAY_VAO: normalizeTo12DigitDateTime(f1.NGAY_VAO || ''),
      NGAY_RA: normalizeTo12DigitDateTime(f1.NGAY_RA || ''),
      KY_QT: kyQt,
      TRANGTHAI: defaults?.trangThai || '1',
    },
    xml1FieldsDraft,
    costRowsDraft,
    dsXml1Dc: [],
    dscpDc: [],
    isSigned: false,
  };
}

/**
 * Tạo chuỗi XML chuẩn <HOSO_DIEUCHINH_GD> theo đúng Mục IX Quyết định 326/QĐ-BHXH (trang 66-69)
 */
export function buildMau09BhXml(record: Mau09BhRecord): string {
  const ttHosoId = `Id-${genUuid()}`;
  const { ttMau, ttXml1 } = record;
  const compiled = compileMau09Adjustments(record.xml1FieldsDraft, record.costRowsDraft);
  const dsXml1 = record.dsXml1Dc.length > 0 ? record.dsXml1Dc : compiled.dsXml1Dc;
  const dscp = record.dscpDc.length > 0 ? record.dscpDc : compiled.dscpDc;

  const xml1DcNodes = dsXml1
    .map(
      (item, idx) => `        <TT_XML1_DC>
          <STT>${idx + 1}</STT>
          <TRUONG_TT_GOC>${escXml(item.TRUONG_TT_GOC)}</TRUONG_TT_GOC>
          <TT_GOC>${escXml(item.TT_GOC)}</TT_GOC>
          <TRUONG_TT_DIEUCHINH>${escXml(item.TRUONG_TT_DIEUCHINH)}</TRUONG_TT_DIEUCHINH>
          <TT_DIEUCHINH>${escXml(item.TT_DIEUCHINH)}</TT_DIEUCHINH>
          <LYDO_DIEUCHINH>${escXml(item.LYDO_DIEUCHINH)}</LYDO_DIEUCHINH>
        </TT_XML1_DC>`
    )
    .join('\n');

  const chiPhiNodes = dscp
    .map(
      (cp, idx) => `        <CHIPHI>
          <STT>${idx + 1}</STT>
          <SOBANG_XML>${escXml(cp.SOBANG_XML)}</SOBANG_XML>
          <ID_CP>${escXml(cp.ID_CP)}</ID_CP>
          <STT_XML>${escXml(cp.STT_XML)}</STT_XML>
          <NGAY_YL>${escXml(normalizeTo12DigitDateTime(cp.NGAY_YL) || cp.NGAY_YL)}</NGAY_YL>
          <TRANGTHAI>${escXml(cp.TRANGTHAI || '1')}</TRANGTHAI>
          <TRUONG_TT_GOC>${escXml(cp.TRUONG_TT_GOC)}</TRUONG_TT_GOC>
          <TT_GOC>${escXml(cp.TT_GOC)}</TT_GOC>
          <LYDO>${escXml(cp.LYDO)}</LYDO>
          <TUCHOI>${escXml(cp.TUCHOI || '0')}</TUCHOI>
          <TRUONG_TT_DIEUCHINH>${escXml(cp.TRUONG_TT_DIEUCHINH)}</TRUONG_TT_DIEUCHINH>
          <TT_DIEUCHINH>${escXml(cp.TT_DIEUCHINH)}</TT_DIEUCHINH>
          <LYDO_DIEUCHINH>${escXml(cp.LYDO_DIEUCHINH)}</LYDO_DIEUCHINH>
        </CHIPHI>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<HOSO_DIEUCHINH_GD>
  <TT_HOSO Id="${ttHosoId}">
    <TT_MAU>
      <MAU_SO>${escXml(ttMau.MAU_SO || '09/BH')}</MAU_SO>
      <MA_CSKCB>${escXml(ttMau.MA_CSKCB)}</MA_CSKCB>
      <NGUOILAPBIEU>${escXml(ttMau.NGUOILAPBIEU)}</NGUOILAPBIEU>
      <THUTRUONG_DV>${escXml(ttMau.THUTRUONG_DV)}</THUTRUONG_DV>
      <NGAYTHANGNAM>${escXml(ttMau.NGAYTHANGNAM || getTodayYyyyMmDd())}</NGAYTHANGNAM>
    </TT_MAU>
    <TT_XML1>
      <XML1_ID>${escXml(ttXml1.XML1_ID)}</XML1_ID>
      <MA_LK>${escXml(ttXml1.MA_LK)}</MA_LK>
      <MA_BN>${escXml(ttXml1.MA_BN)}</MA_BN>
      <HO_TEN>${escXml(ttXml1.HO_TEN)}</HO_TEN>
      <MA_THE>${escXml(ttXml1.MA_THE)}</MA_THE>
      <NGAY_VAO>${escXml(normalizeTo12DigitDateTime(ttXml1.NGAY_VAO))}</NGAY_VAO>
      <NGAY_RA>${escXml(normalizeTo12DigitDateTime(ttXml1.NGAY_RA))}</NGAY_RA>
      <KY_QT>${escXml(ttXml1.KY_QT)}</KY_QT>
      <TRANGTHAI>${escXml(ttXml1.TRANGTHAI || '1')}</TRANGTHAI>
    </TT_XML1>
    <TT_DIEUCHINH>
      <DS_XML1_DIEUCHINH>${xml1DcNodes ? `\n${xml1DcNodes}\n      ` : ''}</DS_XML1_DIEUCHINH>
      <DSCP_DIEUCHINH>${chiPhiNodes ? `\n${chiPhiNodes}\n      ` : ''}</DSCP_DIEUCHINH>
    </TT_DIEUCHINH>
  </TT_HOSO>
  <CHUKYDONVI/>
</HOSO_DIEUCHINH_GD>`;
}

/**
 * Xuất danh sách Hồ sơ Mẫu 09/BH ra file Excel đúng 22 cột chuẩn của Cổng BHXH (Mau09BH.xlsx)
 */
export function exportMau09BhToExcel(records: Mau09BhRecord[], fileName?: string): void {
  const excelRows: Record<string, any>[] = [];

  for (const rec of records) {
    const compiled = compileMau09Adjustments(rec.xml1FieldsDraft, rec.costRowsDraft);
    const dsXml1 = rec.dsXml1Dc.length > 0 ? rec.dsXml1Dc : compiled.dsXml1Dc;
    const dscp = rec.dscpDc.length > 0 ? rec.dscpDc : compiled.dscpDc;
    const namQt = rec.ttXml1.KY_QT.slice(0, 4);
    const thangQt = rec.ttXml1.KY_QT.slice(4, 6);

    for (const x1 of dsXml1) {
      excelRows.push({
        XML1_ID: rec.ttXml1.XML1_ID || '',
        ID_CHIPHI: '',
        SO_BANG_XML: 1,
        MA_LK: rec.ttXml1.MA_LK,
        STT_TRONG_BANG_XML: '1',
        MA_BENH_NHAN: rec.ttXml1.MA_BN,
        HO_TEN: rec.ttXml1.HO_TEN,
        MA_THE_BHYT: rec.ttXml1.MA_THE,
        NGAY_VAO: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_VAO),
        NGAY_RA: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_RA),
        NGAY_Y_LENH: '',
        TRUONG_THONG_TIN_GOC: x1.TRUONG_TT_GOC,
        THONG_TIN_GOC: x1.TT_GOC,
        LY_DO: '',
        TU_CHOI: '0',
        TRUONG_THONG_TIN_DIEU_CHINH: x1.TRUONG_TT_DIEUCHINH,
        THONG_TIN_DIEU_CHINH: x1.TT_DIEUCHINH,
        LY_DO_DIEU_CHINH: x1.LYDO_DIEUCHINH,
        TRANG_THAI: rec.ttXml1.TRANGTHAI || '1',
        MA_CSKCB: rec.ttMau.MA_CSKCB,
        NAM_QT: namQt,
        THANG_QT: thangQt,
      });
    }

    for (const cp of dscp) {
      excelRows.push({
        XML1_ID: rec.ttXml1.XML1_ID || '',
        ID_CHIPHI: cp.ID_CP || '',
        SO_BANG_XML: Number(cp.SOBANG_XML) || cp.SOBANG_XML,
        MA_LK: rec.ttXml1.MA_LK,
        STT_TRONG_BANG_XML: cp.STT_XML,
        MA_BENH_NHAN: rec.ttXml1.MA_BN,
        HO_TEN: rec.ttXml1.HO_TEN,
        MA_THE_BHYT: rec.ttXml1.MA_THE,
        NGAY_VAO: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_VAO),
        NGAY_RA: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_RA),
        NGAY_Y_LENH: normalizeTo12DigitDateTime(cp.NGAY_YL) || cp.NGAY_YL,
        TRUONG_THONG_TIN_GOC: cp.TRUONG_TT_GOC,
        THONG_TIN_GOC: cp.TT_GOC,
        LY_DO: cp.LYDO || '',
        TU_CHOI: cp.TUCHOI || '0',
        TRUONG_THONG_TIN_DIEU_CHINH: cp.TRUONG_TT_DIEUCHINH,
        THONG_TIN_DIEU_CHINH: cp.TT_DIEUCHINH,
        LY_DO_DIEU_CHINH: cp.LYDO_DIEUCHINH,
        TRANG_THAI: cp.TRANGTHAI || rec.ttXml1.TRANGTHAI || '1',
        MA_CSKCB: rec.ttMau.MA_CSKCB,
        NAM_QT: namQt,
        THANG_QT: thangQt,
      });
    }

    // Nếu là hồ sơ Thu hồi ĐNTT toàn bộ mà chưa chọn dòng con, vẫn xuất 1 dòng tổng hợp
    if (dsXml1.length === 0 && dscp.length === 0) {
      excelRows.push({
        XML1_ID: rec.ttXml1.XML1_ID || '',
        ID_CHIPHI: '',
        SO_BANG_XML: 1,
        MA_LK: rec.ttXml1.MA_LK,
        STT_TRONG_BANG_XML: '1',
        MA_BENH_NHAN: rec.ttXml1.MA_BN,
        HO_TEN: rec.ttXml1.HO_TEN,
        MA_THE_BHYT: rec.ttXml1.MA_THE,
        NGAY_VAO: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_VAO),
        NGAY_RA: normalizeTo12DigitDateTime(rec.ttXml1.NGAY_RA),
        NGAY_Y_LENH: '',
        TRUONG_THONG_TIN_GOC: 'MA_LK',
        THONG_TIN_GOC: rec.ttXml1.MA_LK,
        LY_DO: '',
        TU_CHOI: '0',
        TRUONG_THONG_TIN_DIEU_CHINH: 'MA_LK',
        THONG_TIN_DIEU_CHINH: rec.ttXml1.MA_LK,
        LY_DO_DIEU_CHINH:
          rec.ttXml1.TRANGTHAI === '2'
            ? 'Đề nghị thu hồi / hủy hồ sơ ĐNTT'
            : 'Đề nghị điều chỉnh hồ sơ',
        TRANG_THAI: rec.ttXml1.TRANGTHAI || '1',
        MA_CSKCB: rec.ttMau.MA_CSKCB,
        NAM_QT: namQt,
        THANG_QT: thangQt,
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mẫu 09-BH');
  XLSX.writeFile(wb, fileName || `Mau09BH_${Date.now()}.xlsx`);
}

/**
 * Đọc file Excel Mẫu 09/BH tải từ Cổng BHXH (Mau09BH_*.xlsx) để điền nhanh XML1_ID, ID_CHIPHI, LY_DO, TU_CHOI
 */
export async function importMau09BhExcelRows(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });
}

function parseNum(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim().replace(/,/g, '.');
  if (!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoneyXml(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Tính toán lại thành tiền của 1 dòng chi phí (XML2 hoặc XML3) khi người dùng sửa Số lượng / Đơn giá / Tỷ lệ / Mức hưởng
 * Theo đúng quy định tại trang 6 của PL1_HDSD_TT12_2026_03_05_09_BH ("Kiểm tra lại giá trị điều chỉnh và cập nhật đồng bộ thành tiền")
 * và công thức chuẩn QĐ 3176/QĐ-BYT & TT 12/2026/TT-BTC (trang 62-63).
 */
export function recalculateSingleMau09CostRow(
  costRow: Mau09SourceCostRow,
  defaultReason = 'Đồng bộ thành tiền theo đơn giá/số lượng điều chỉnh'
): { nextRow: Mau09SourceCostRow; changed: boolean } {
  if (costRow.tableId !== 'XML2' && costRow.tableId !== 'XML3') {
    return { nextRow: costRow, changed: false };
  }
  if (costRow.withdrawEntireRow || costRow.trangThai === '2') {
    return { nextRow: costRow, changed: false };
  }

  const getFieldVal = (name: string): string => {
    const f = costRow.fieldDrafts.find(x => x.field === name);
    return f ? f.ttDieuChinh : '';
  };
  const getOrigVal = (name: string): string => {
    const f = costRow.fieldDrafts.find(x => x.field === name);
    return f ? f.originalValue : '';
  };

  // Tìm lý do điều chỉnh mà người dùng đã nhập trên dòng này để gán đồng bộ cho các trường thành tiền ăn theo
  const existingRowReason =
    costRow.fieldDrafts.find(x => x.lyDoDieuChinh.trim() !== '')?.lyDoDieuChinh.trim() ||
    costRow.withdrawReason.trim() ||
    costRow.lyDoTuChoi.trim() ||
    defaultReason;

  const soLuong = parseNum(getFieldVal('SO_LUONG'), 0);
  const mucHuong = parseNum(getFieldVal('MUC_HUONG'), 100);
  const tNguonKhac = parseNum(getFieldVal('T_NGUONKHAC'), 0);

  let thanhTienBv = parseNum(getFieldVal('THANH_TIEN_BV'), 0);
  let thanhTienBh = parseNum(getFieldVal('THANH_TIEN_BH'), 0);

  if (costRow.tableId === 'XML2') {
    const donGia = parseNum(getFieldVal('DON_GIA'), 0);
    const tyleTtBh = parseNum(getFieldVal('TYLE_TT_BH'), 100);
    const driverChanged = ['SO_LUONG', 'DON_GIA', 'TYLE_TT_BH'].some(
      k => getFieldVal(k).trim() !== getOrigVal(k).trim()
    );
    if (driverChanged || (soLuong > 0 && donGia > 0)) {
      thanhTienBv = Math.round((soLuong * donGia + Number.EPSILON) * 100) / 100;
      thanhTienBh =
        Math.round((soLuong * donGia * (tyleTtBh / 100) + Number.EPSILON) * 100) / 100;
    }
  } else if (costRow.tableId === 'XML3') {
    let donGiaBv = parseNum(getFieldVal('DON_GIA_BV'), 0);
    let donGiaBh = parseNum(getFieldVal('DON_GIA_BH'), 0);
    const origDonGiaBv = parseNum(getOrigVal('DON_GIA_BV'), 0);
    const origDonGiaBh = parseNum(getOrigVal('DON_GIA_BH'), 0);

    // Nếu gốc DON_GIA_BV == DON_GIA_BH và người dùng chỉ vừa sửa 1 trong 2 ô giá, tự đồng bộ ô giá còn lại
    const bvChanged = getFieldVal('DON_GIA_BV').trim() !== getOrigVal('DON_GIA_BV').trim();
    const bhChanged = getFieldVal('DON_GIA_BH').trim() !== getOrigVal('DON_GIA_BH').trim();
    if (origDonGiaBv === origDonGiaBh) {
      if (bvChanged && !bhChanged) donGiaBh = donGiaBv;
      else if (bhChanged && !bvChanged) donGiaBv = donGiaBh;
    }

    const tyleDv = parseNum(getFieldVal('TYLE_TT_DV'), 100);
    const tyleBh = parseNum(getFieldVal('TYLE_TT_BH'), 100);
    const tTranTt = parseNum(getFieldVal('T_TRANTT'), 0);

    // Kiểm tra xem ở dữ liệu gốc THANH_TIEN_BV có nhân TYLE_TT_DV hay không
    const origSl = parseNum(getOrigVal('SO_LUONG'), 1);
    const origTtBv = parseNum(getOrigVal('THANH_TIEN_BV'), 0);
    const origTyleDv = parseNum(getOrigVal('TYLE_TT_DV'), 100);
    const usesTyleDvOnBv =
      origTyleDv > 0 &&
      origTyleDv < 100 &&
      Math.abs(origTtBv - origSl * origDonGiaBv * (origTyleDv / 100)) <
        Math.abs(origTtBv - origSl * origDonGiaBv);

    const driverChanged = [
      'SO_LUONG',
      'DON_GIA_BV',
      'DON_GIA_BH',
      'TYLE_TT_DV',
      'TYLE_TT_BH',
      'T_TRANTT',
    ].some(k => getFieldVal(k).trim() !== getOrigVal(k).trim());

    if (driverChanged || (soLuong > 0 && (donGiaBv > 0 || donGiaBh > 0))) {
      thanhTienBv = usesTyleDvOnBv
        ? Math.round((soLuong * donGiaBv * (tyleDv / 100) + Number.EPSILON) * 100) / 100
        : Math.round((soLuong * donGiaBv + Number.EPSILON) * 100) / 100;

      const effTyleBh = (tyleDv < 100 ? tyleDv / 100 : 1) * (tyleBh < 100 ? tyleBh / 100 : 1);
      let rawTtBh = Math.round((soLuong * donGiaBh * effTyleBh + Number.EPSILON) * 100) / 100;
      if (tTranTt > 0 && rawTtBh > tTranTt) {
        rawTtBh = tTranTt;
      }
      thanhTienBh = rawTtBh;
    }

    // Cập nhật lại DON_GIA_BV / DON_GIA_BH nếu vừa tự đồng bộ
    costRow = {
      ...costRow,
      fieldDrafts: costRow.fieldDrafts.map(fd => {
        if (fd.field === 'DON_GIA_BV' && fmtMoneyXml(donGiaBv) !== fd.ttDieuChinh) {
          return {
            ...fd,
            ttDieuChinh: fmtMoneyXml(donGiaBv),
            lyDoDieuChinh: fd.lyDoDieuChinh.trim() || existingRowReason,
          };
        }
        if (fd.field === 'DON_GIA_BH' && fmtMoneyXml(donGiaBh) !== fd.ttDieuChinh) {
          return {
            ...fd,
            ttDieuChinh: fmtMoneyXml(donGiaBh),
            lyDoDieuChinh: fd.lyDoDieuChinh.trim() || existingRowReason,
          };
        }
        return fd;
      }),
    };
  }

  // Tính T_BHTT, T_BNCCT, T_BNTT từ THANH_TIEN_BV, THANH_TIEN_BH, T_NGUONKHAC, MUC_HUONG
  const baseBhForFund = Math.max(0, thanhTienBh - tNguonKhac);
  const tBhtt = Math.round((baseBhForFund * (mucHuong / 100) + Number.EPSILON) * 100) / 100;
  const tBncct = Math.max(0, Math.round((baseBhForFund - tBhtt + Number.EPSILON) * 100) / 100);
  const tBntt = Math.max(
    0,
    Math.round((thanhTienBv - thanhTienBh + Number.EPSILON) * 100) / 100
  );

  const computedMap: Record<string, string> = {
    THANH_TIEN_BV: fmtMoneyXml(thanhTienBv),
    THANH_TIEN_BH: fmtMoneyXml(thanhTienBh),
    T_BHTT: fmtMoneyXml(tBhtt),
    T_BNCCT: fmtMoneyXml(tBncct),
    T_BNTT: fmtMoneyXml(tBntt),
  };

  let changed = false;
  const nextFieldDrafts = costRow.fieldDrafts.map(fd => {
    if (!(fd.field in computedMap)) return fd;
    const newVal = computedMap[fd.field];
    const oldVal = fd.ttDieuChinh.trim();
    const origNum = parseNum(fd.originalValue, 0);
    const newNum = parseNum(newVal, 0);
    const isDiffFromOrig = Math.abs(newNum - origNum) >= 0.01;

    if (newVal !== oldVal || (isDiffFromOrig && !fd.lyDoDieuChinh.trim())) {
      if (newVal !== oldVal) changed = true;
      return {
        ...fd,
        ttGoc: fd.ttGoc || fd.originalValue,
        ttDieuChinh: newVal,
        lyDoDieuChinh: isDiffFromOrig
          ? fd.lyDoDieuChinh.trim() || existingRowReason
          : fd.lyDoDieuChinh,
      };
    }
    return fd;
  });

  return {
    nextRow: {
      ...costRow,
      fieldDrafts: nextFieldDrafts,
    },
    changed,
  };
}

/**
 * Đồng bộ & Tính toán lại toàn bộ Giá -> Thành tiền từng dịch vụ/thuốc (XML2, XML3) -> Tổng chi phí hồ sơ (XML1)
 * cho 1 Hồ sơ Mẫu 09/BH:
 * 1. Tính lại THANH_TIEN_BV, THANH_TIEN_BH, T_BHTT, T_BNCCT, T_BNTT cho các dòng XML2/XML3 có thay đổi giá/số lượng/tỷ lệ/mức hưởng.
 * 2. Cộng tổng các dòng XML2 & XML3 còn hiệu lực (trừ các dòng bị đánh dấu Thu hồi/Hủy TRANGTHAI=2) để cập nhật
 *    T_THUOC, T_VTYT, T_TONGCHI_BV, T_TONGCHI_BH, T_BHTT, T_BNCCT, T_BNTT, T_NGUONKHAC trên Bảng 1 (XML1).
 */
export function recalculateAndSyncMau09Prices(
  record: Mau09BhRecord,
  options?: {
    syncXml1TotalsToDsXml1Dc?: boolean;
    customReason?: string;
  }
): {
  updatedRecord: Mau09BhRecord;
  changedCostRowsCount: number;
  changedXml1TotalsCount: number;
  totalsComparison: {
    T_THUOC: { goc: number; dc: number };
    T_VTYT: { goc: number; dc: number };
    T_TONGCHI_BV: { goc: number; dc: number };
    T_TONGCHI_BH: { goc: number; dc: number };
    T_BHTT: { goc: number; dc: number };
    T_BNCCT: { goc: number; dc: number };
    T_BNTT: { goc: number; dc: number };
    T_NGUONKHAC: { goc: number; dc: number };
  };
} {
  const syncXml1 = options?.syncXml1TotalsToDsXml1Dc ?? true;
  const reasonText =
    options?.customReason?.trim() ||
    'Đồng bộ thành tiền và tổng chi phí hồ sơ sau khi điều chỉnh/thu hồi chi phí';

  let changedCostRowsCount = 0;
  const nextCostRows = record.costRowsDraft.map(cr => {
    if (cr.tableId !== 'XML2' && cr.tableId !== 'XML3') return cr;
    // Chỉ tính lại thành tiền những dòng có sửa thông tin hoặc được người dùng điều chỉnh
    const hasAnyFieldChange = cr.fieldDrafts.some(
      fd => fd.ttDieuChinh.trim() !== fd.originalValue.trim()
    );
    if (!hasAnyFieldChange && !cr.withdrawEntireRow && cr.trangThai !== '2') {
      return cr;
    }
    const { nextRow, changed } = recalculateSingleMau09CostRow(cr, reasonText);
    if (changed || cr.withdrawEntireRow || cr.trangThai === '2') {
      changedCostRowsCount++;
    }
    return nextRow;
  });

  // Cộng tổng chi phí từ tất cả dòng XML2 & XML3
  let sumThuocDc = 0;
  let sumVtytDc = 0;
  let sumTongChiBvDc = 0;
  let sumTongChiBhDc = 0;
  let sumBhttDc = 0;
  let sumBncctDc = 0;
  let sumBnttDc = 0;
  let sumNguonKhacDc = 0;

  const hasCostRows = nextCostRows.some(r => r.tableId === 'XML2' || r.tableId === 'XML3');

  for (const cr of nextCostRows) {
    if (cr.tableId !== 'XML2' && cr.tableId !== 'XML3') continue;
    if (cr.withdrawEntireRow || cr.trangThai === '2') {
      // Dòng chi phí bị thu hồi / hủy -> không cộng vào tổng đề nghị thanh toán sau điều chỉnh
      continue;
    }
    const getVal = (name: string) =>
      parseNum(cr.fieldDrafts.find(f => f.field === name)?.ttDieuChinh, 0);
    const getStr = (name: string) =>
      (cr.fieldDrafts.find(f => f.field === name)?.ttDieuChinh || '').trim();

    const ttBv = getVal('THANH_TIEN_BV');
    const ttBh = getVal('THANH_TIEN_BH');
    const bhtt = getVal('T_BHTT');
    const bncct = getVal('T_BNCCT');
    const bntt = getVal('T_BNTT');
    const nk = getVal('T_NGUONKHAC');

    sumTongChiBvDc += ttBv;
    sumTongChiBhDc += ttBh;
    sumBhttDc += bhtt;
    sumBncctDc += bncct;
    sumBnttDc += bntt;
    sumNguonKhacDc += nk;

    if (cr.tableId === 'XML2') {
      sumThuocDc += ttBv;
    } else if (cr.tableId === 'XML3') {
      const maNhom = getStr('MA_NHOM');
      const maVatTu = getStr('MA_VAT_TU');
      if (maNhom === '10' || maNhom === '11' || maVatTu !== '') {
        sumVtytDc += ttBv;
      }
    }
  }

  const getXml1Orig = (name: string) =>
    parseNum(record.xml1FieldsDraft.find(f => f.field === name)?.originalValue, 0);

  const totalsComparison = {
    T_THUOC: { goc: getXml1Orig('T_THUOC'), dc: hasCostRows ? sumThuocDc : getXml1Orig('T_THUOC') },
    T_VTYT: { goc: getXml1Orig('T_VTYT'), dc: hasCostRows ? sumVtytDc : getXml1Orig('T_VTYT') },
    T_TONGCHI_BV: {
      goc: getXml1Orig('T_TONGCHI_BV'),
      dc: hasCostRows ? sumTongChiBvDc : getXml1Orig('T_TONGCHI_BV'),
    },
    T_TONGCHI_BH: {
      goc: getXml1Orig('T_TONGCHI_BH'),
      dc: hasCostRows ? sumTongChiBhDc : getXml1Orig('T_TONGCHI_BH'),
    },
    T_BHTT: { goc: getXml1Orig('T_BHTT'), dc: hasCostRows ? sumBhttDc : getXml1Orig('T_BHTT') },
    T_BNCCT: { goc: getXml1Orig('T_BNCCT'), dc: hasCostRows ? sumBncctDc : getXml1Orig('T_BNCCT') },
    T_BNTT: { goc: getXml1Orig('T_BNTT'), dc: hasCostRows ? sumBnttDc : getXml1Orig('T_BNTT') },
    T_NGUONKHAC: {
      goc: getXml1Orig('T_NGUONKHAC'),
      dc: hasCostRows ? sumNguonKhacDc : getXml1Orig('T_NGUONKHAC'),
    },
  };

  let changedXml1TotalsCount = 0;
  const nextXml1Fields = record.xml1FieldsDraft.map(f => {
    if (!hasCostRows || !(f.field in totalsComparison)) return f;
    const item = totalsComparison[f.field as keyof typeof totalsComparison];
    const isDiff = Math.abs(item.dc - item.goc) >= 0.01;
    const newStr = fmtMoneyXml(item.dc);

    if (syncXml1 && isDiff) {
      changedXml1TotalsCount++;
      return {
        ...f,
        ttGoc: f.ttGoc || f.originalValue,
        ttDieuChinh: newStr,
        lyDoDieuChinh: f.lyDoDieuChinh.trim() || reasonText,
      };
    } else if (!isDiff && f.ttDieuChinh !== f.originalValue && f.lyDoDieuChinh === reasonText) {
      // Nếu tổng tiền quay về đúng bằng giá trị gốc thì khôi phục trường tổng XML1 về gốc
      return {
        ...f,
        ttGoc: '',
        ttDieuChinh: f.originalValue,
        lyDoDieuChinh: '',
      };
    }
    return f;
  });

  const compiled = compileMau09Adjustments(nextXml1Fields, nextCostRows);
  const updatedRecord: Mau09BhRecord = {
    ...record,
    xml1FieldsDraft: nextXml1Fields,
    costRowsDraft: nextCostRows,
    dsXml1Dc: compiled.dsXml1Dc,
    dscpDc: compiled.dscpDc,
    updatedAt: new Date().toISOString(),
    isSigned: false,
    signedXml: undefined,
  };

  return {
    updatedRecord,
    changedCostRowsCount,
    changedXml1TotalsCount,
    totalsComparison,
  };
}

/**
 * Mở cửa sổ In / Xuất PDF Bảng kê chi tiết điều chỉnh Mẫu số 09/BH (đúng biểu mẫu trang 16 Tài liệu HDSD)
 */
export function printMau09BhPdfWindow(records: Mau09BhRecord[], tenDonVi = ''): void {
  if (records.length === 0) return;
  const first = records[0];
  const maDonVi = first.ttMau.MA_CSKCB || '';
  const nguoiLap = first.ttMau.NGUOILAPBIEU || '';
  const thuTruong = first.ttMau.THUTRUONG_DV || '';

  const tableBodyRows: string[] = [];
  for (const rec of records) {
    const compiled = compileMau09Adjustments(rec.xml1FieldsDraft, rec.costRowsDraft);
    const dsXml1 = rec.dsXml1Dc.length > 0 ? rec.dsXml1Dc : compiled.dsXml1Dc;
    const dscp = rec.dscpDc.length > 0 ? rec.dscpDc : compiled.dscpDc;
    const trangThaiText =
      rec.ttXml1.TRANGTHAI === '2'
        ? 'Thu hồi đề nghị thanh toán'
        : rec.ttXml1.TRANGTHAI === '4'
        ? 'Xin ý kiến cấp có thẩm quyền'
        : 'Điều chỉnh thông tin dữ liệu gốc';

    for (const x1 of dsXml1) {
      tableBodyRows.push(`
        <tr>
          <td>${escXml(rec.ttXml1.XML1_ID)}</td>
          <td></td>
          <td style="text-align:center">1</td>
          <td>${escXml(rec.ttXml1.MA_LK)}</td>
          <td style="text-align:center">1</td>
          <td>${escXml(rec.ttXml1.MA_BN)}</td>
          <td>${escXml(rec.ttXml1.HO_TEN)}</td>
          <td>${escXml(rec.ttXml1.MA_THE)}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_VAO))}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_RA))}</td>
          <td></td>
          <td>${escXml(x1.TRUONG_TT_GOC)}</td>
          <td>${escXml(x1.TT_GOC)}</td>
          <td></td>
          <td style="text-align:center">0</td>
          <td>${escXml(x1.TRUONG_TT_DIEUCHINH)}</td>
          <td>${escXml(x1.TT_DIEUCHINH)}</td>
          <td>${escXml(x1.LYDO_DIEUCHINH)}</td>
          <td>${escXml(trangThaiText)}</td>
        </tr>
      `);
    }

    for (const cp of dscp) {
      const cpTrangThai =
        cp.TRANGTHAI === '2'
          ? 'Thu hồi đề nghị thanh toán'
          : cp.TRANGTHAI === '4'
          ? 'Xin ý kiến cấp có thẩm quyền'
          : 'Điều chỉnh thông tin dữ liệu gốc';
      tableBodyRows.push(`
        <tr>
          <td>${escXml(rec.ttXml1.XML1_ID)}</td>
          <td>${escXml(cp.ID_CP)}</td>
          <td style="text-align:center">${escXml(cp.SOBANG_XML)}</td>
          <td>${escXml(rec.ttXml1.MA_LK)}</td>
          <td style="text-align:center">${escXml(cp.STT_XML)}</td>
          <td>${escXml(rec.ttXml1.MA_BN)}</td>
          <td>${escXml(rec.ttXml1.HO_TEN)}</td>
          <td>${escXml(rec.ttXml1.MA_THE)}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_VAO))}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_RA))}</td>
          <td>${escXml(formatDisplayDateTime12(cp.NGAY_YL))}</td>
          <td>${escXml(cp.TRUONG_TT_GOC)}</td>
          <td>${escXml(cp.TT_GOC)}</td>
          <td>${escXml(cp.LYDO)}</td>
          <td style="text-align:center">${escXml(cp.TUCHOI || '0')}</td>
          <td>${escXml(cp.TRUONG_TT_DIEUCHINH)}</td>
          <td>${escXml(cp.TT_DIEUCHINH)}</td>
          <td>${escXml(cp.LYDO_DIEUCHINH)}</td>
          <td>${escXml(cpTrangThai)}</td>
        </tr>
      `);
    }

    if (dsXml1.length === 0 && dscp.length === 0) {
      tableBodyRows.push(`
        <tr>
          <td>${escXml(rec.ttXml1.XML1_ID)}</td>
          <td></td>
          <td style="text-align:center">1</td>
          <td>${escXml(rec.ttXml1.MA_LK)}</td>
          <td style="text-align:center">1</td>
          <td>${escXml(rec.ttXml1.MA_BN)}</td>
          <td>${escXml(rec.ttXml1.HO_TEN)}</td>
          <td>${escXml(rec.ttXml1.MA_THE)}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_VAO))}</td>
          <td>${escXml(formatDisplayDateTime12(rec.ttXml1.NGAY_RA))}</td>
          <td></td>
          <td>MA_LK</td>
          <td>${escXml(rec.ttXml1.MA_LK)}</td>
          <td></td>
          <td style="text-align:center">0</td>
          <td>MA_LK</td>
          <td>${escXml(rec.ttXml1.MA_LK)}</td>
          <td>Thu hồi / điều chỉnh hồ sơ KCB</td>
          <td>${escXml(trangThaiText)}</td>
        </tr>
      `);
    }
  }

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Mẫu số 09/BH - Bảng kê chi tiết điều chỉnh</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: "Times New Roman", serif; font-size: 11px; color: #000; margin: 0; padding: 12px; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .mau-so { text-align: right; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
    .title { text-align: center; font-weight: bold; font-size: 14px; margin: 12px 0; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; word-wrap: break-word; }
    th, td { border: 1px solid #000; padding: 4px 3px; font-size: 10px; vertical-align: middle; }
    th { font-weight: bold; text-align: center; background: #f8fafc; }
    .col-code td { text-align: center; font-weight: bold; font-size: 9.5px; }
    .footer { display: flex; justify-content: space-around; margin-top: 22px; text-align: center; }
  </style>
</head>
<body>
  <div class="mau-so">Mẫu số 09/BH</div>
  <div class="top-bar">
    <div>
      <div><b>TÊN ĐƠN VỊ: ${escXml(tenDonVi || maDonVi)}</b></div>
      <div><b>MÃ ĐƠN VỊ: ${escXml(maDonVi)}</b></div>
    </div>
    <div style="text-align:center">
      <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></div>
      <div style="text-decoration:underline"><b>Độc lập - Tự do - Hạnh phúc</b></div>
    </div>
  </div>
  <div class="title">BẢNG KÊ CHI TIẾT ĐIỀU CHỈNH</div>
  <table>
    <thead>
      <tr>
        <th style="width:5%">XML1_ID</th>
        <th style="width:5%">ID chi phí</th>
        <th style="width:3.5%">Số bảng XML</th>
        <th style="width:6%">Mã liên kết</th>
        <th style="width:3.5%">STT trong bảng XML</th>
        <th style="width:5%">Mã bệnh nhân</th>
        <th style="width:7%">Họ tên</th>
        <th style="width:7%">Mã thẻ</th>
        <th style="width:5.5%">Ngày vào</th>
        <th style="width:5.5%">Ngày ra</th>
        <th style="width:5.5%">Ngày y lệnh</th>
        <th style="width:6%">Trường thông tin gốc</th>
        <th style="width:7%">Thông tin gốc</th>
        <th style="width:6%">Lý do</th>
        <th style="width:3%">Từ chối</th>
        <th style="width:6%">Trường thông tin điều chỉnh</th>
        <th style="width:7%">Thông tin điều chỉnh</th>
        <th style="width:6.5%">Lý do điều chỉnh</th>
        <th style="width:5.5%">Trạng thái</th>
      </tr>
      <tr class="col-code">
        <td>(A)</td><td>(B)</td><td>(C)</td><td>(D)</td><td>(E)</td><td>(G)</td><td>(H)</td>
        <td>(I)</td><td>(K)</td><td>(L)</td><td>(M)</td><td>(N)</td><td>(O)</td><td>(P)</td>
        <td>(Q)</td><td>(R)</td><td>(S)</td><td>(T)</td><td>(U)</td>
      </tr>
    </thead>
    <tbody>
      ${tableBodyRows.join('\n')}
    </tbody>
  </table>
  <div class="footer">
    <div>
      <div>&nbsp;</div>
      <div><b>NGƯỜI LẬP BIỂU</b></div>
      <div><i>(Ký, họ tên)</i></div>
      <div style="margin-top:55px;font-weight:bold">${escXml(nguoiLap)}</div>
    </div>
    <div>
      <div><i>Ngày ..... tháng ..... năm .........</i></div>
      <div><b>THỦ TRƯỞNG ĐƠN VỊ</b></div>
      <div><i>(Ký, họ tên, đóng dấu)</i></div>
      <div style="margin-top:55px;font-weight:bold">${escXml(thuTruong)}</div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
</body>
</html>`);
  win.document.close();
}
