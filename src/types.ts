export interface TemplateRow {
  STT: string;
  MA_LK: string;
  HO_TEN: string;
  NGAY_SINH: string;
  GIOI_TINH: string;
  MA_THE_BHYT: string;
  MA_BENH_CHINH: string;
  NGAY_VAO: string;
  NGAY_VAO_NOI_TRU: string;
  NGAY_RA: string;
  SO_NGAY_DTRI: string;
  MA_LOAI_KCB: string;
  T_TONGCHI_BV: number | null;
  T_TONGCHI_BH: number | null;
  T_BHTT: number | null;
  T_BNCCT: number | null;
  T_BNTT: number | null;
  T_NGUONKHAC: number | null;
  MA_CSKCB: string;
  NAM_QT: string;
  THANG_QT: string;

  source: 'BHXH' | 'HIS';
  originalData: any;
}

export type ColumnMapping = Record<keyof Omit<TemplateRow, 'source' | 'originalData'>, string>;

export interface ComparisonResult {
  match: boolean;
  type: 'MATCH' | 'MISSING_BHXH' | 'MISSING_HIS' | 'DISCREPANCY' | 'WARNING';
  details: string[];
  bhxhItem?: TemplateRow;
  hisItem?: TemplateRow;
}

export interface AuditSummary {
  totalBHXH: number;
  totalHIS: number;
  totalMatch: number;
  missingBHXH: number;
  missingHIS: number;
  discrepancies: number;
  warnings: number;
}
