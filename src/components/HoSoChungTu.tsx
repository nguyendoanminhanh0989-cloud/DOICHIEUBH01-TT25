import React, { useState } from 'react';
import {
  Building2,
  Settings,
  RefreshCw,
  FileCode2,
  FileSpreadsheet,
  Download,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  Trash2,
  Cloud,
  Usb,
  Send,
  AlertTriangle,
  Loader2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import TaoHoSoModal from './TaoHoSoModal';
import ConfigModal from './ConfigModal';
import KySoModal from './KySoModal';
import CskcbSetupModal, { CskcbConfig } from './CskcbSetupModal';
import type { HoSoRecord } from '../lib/signAndSubmitService';
import { getOrgConfig } from '../lib/signAndSubmitService';
import {
  COLUMN_DISPLAY,
  HoSoType,
  mapRowToDisplay,
  mapRowToRawData,
  validateRecord,
} from '../lib/importMapper';
import { buildXml } from '../lib/xmlBuilder';
import { getSessionCache, getSessionSync, removeSessionCache, setSessionCache } from '../lib/sessionCache';

const TT25_TEMPLATE_OPTIONS: Array<{ code: HoSoType; label: string; shortLabel: string }> = [
  { code: 'CT07', label: 'Mẫu CT07 - Giấy chứng nhận nghỉ việc hưởng BHXH', shortLabel: 'CT07 (Nghỉ việc BHXH)' },
  { code: 'CT03', label: 'Mẫu CT03 - Giấy ra viện', shortLabel: 'CT03 (Giấy ra viện)' },
  { code: 'CT04', label: 'Mẫu CT04 - Tóm tắt hồ sơ bệnh án', shortLabel: 'CT04 (Tóm tắt HSBA)' },
  { code: 'CT05', label: 'Mẫu CT05 - Giấy chứng sinh', shortLabel: 'CT05 (Giấy chứng sinh)' },
  { code: 'CT06', label: 'Mẫu CT06 - Giấy nghỉ dưỡng thai', shortLabel: 'CT06 (Nghỉ dưỡng thai)' },
  { code: 'GIAYDIEUTRINOITRU', label: 'Mẫu 06 - Giấy xác nhận điều trị nội trú', shortLabel: 'Mẫu 06 (Điều trị nội trú)' },
  { code: 'GIAYDIEUTRIVOSINH', label: 'Mẫu 09 - Giấy xác nhận điều trị vô sinh', shortLabel: 'Mẫu 09 (Điều trị vô sinh)' },
  { code: 'GIAYSUCKHOEME', label: 'Mẫu 10 - Giấy xác nhận sức khỏe người mẹ', shortLabel: 'Mẫu 10 (Sức khỏe mẹ)' },
];

const TT25_TABLE_COLUMNS: Record<string, string[]> = {
  CT07: [
    'MA_CT', 'MAU_SO', 'SO_SERI', 'SO_KCB', 'MA_BHXH', 'MA_THE', 'HO_TEN',
    'NGAY_SINH', 'GIOI_TINH', 'DON_VI', 'CHANDOAN_DIEUTRI', 'TU_NGAY', 'DEN_NGAY',
    'SO_NGAY', 'HO_TEN_CHA', 'HO_TEN_ME', 'THU_TRUONG_DV', 'MA_CCHN',
    'TEN_NGUOI_HANH_NGHE', 'NGAY_CHUNG_TU', 'TEKT', 'LOAI_GIAYTO', 'SO_CCCD',
    'NGAYCAP_CCCD', 'NOICAP_CCCD', 'NGAY_KCB', 'BENH_ICD10_ID', 'BENH_ICD10_TEN',
  ],
  CT03: [
    'SO_LUU_TRU', 'MA_YTE', 'MA_KHOA', 'MA_BHXH', 'MA_THE', 'HO_TEN',
    'NGAY_SINH', 'GIOI_TINH', 'MA_DANTOC', 'NGHE_NGHIEP', 'DIA_CHI',
    'NGAY_VAO', 'NGAY_RA', 'DINH_CHI_THAI_NGHEN', 'TUOI_THAI', 'CHAN_DOAN',
    'PP_DIEUTRI', 'GHI_CHU', 'THU_TRUONG_DVI', 'MA_CCHN_TRUONGKHOA',
    'TEN_TRUONGKHOA', 'NGAY_CHUNG_TU', 'TEKT', 'HO_TEN_CHA', 'HO_TEN_ME',
    'NGOAITRU_TUNGAY', 'NGOAITRU_DENNGAY', 'LOAI_GIAYTO', 'SO_CCCD',
    'NGAYCAP_CCCD', 'NOICAP_CCCD', 'BENHICD10_ID', 'TENBENHNICD10',
  ],
  CT04: [
    'MA_CT', 'SO_SERI', 'MA_BHXH', 'MA_THE', 'HO_TEN', 'NGAY_SINH', 'GIOI_TINH',
    'MA_DANTOC', 'DIA_CHI', 'NGHE_NGHIEP', 'HO_TEN_CHA', 'HO_TEN_ME',
    'NGUOI_GIAM_HO', 'TEN_DONVI', 'NGUOI_DAI_DIEN', 'NGAY_CT', 'NGAY_VAO',
    'NGAY_RA', 'CHAN_DOAN_VAO', 'CHAN_DOAN_RA', 'QT_BENHLY', 'TOMTAT_KQ',
    'PP_DIEUTRI', 'NGAY_SINHCON', 'NGAY_CHETCON', 'SO_CONCHET', 'TT_RAVIEN',
    'GHI_CHU', 'TEKT', 'LOAI_GIAYTO', 'SO_CCCD', 'NGAYCAP_CCCD', 'NOICAP_CCCD',
    'LYDO_VVIEN', 'BENH_ICD10_ID', 'BENH_ICD10_TEN',
  ],
  CT05: [
    'SO_SERI', 'MA_BHXH_NND', 'MA_THE_NND', 'HOTEN_NND', 'NGAYSINH_NND',
    'MA_DANTOC_NND', 'SO_CMND_NND', 'NGAYCAP_CMND_NND', 'NOICAP_CMND_NND',
    'NOI_DK_THUONGTRU_NND', 'HO_TEN_CHA', 'TEN_CON', 'GIOI_TINH_CON', 'SO_CON',
    'CAN_NANG_CON', 'NGAY_SINH_CON', 'TINH_TRANG_CON', 'SINHCON_PHAUTHUAT',
    'SINHCON_DUOI32TUAN', 'NGUOI_DO_DE', 'NGUOI_GHI_PHIEU', 'THU_TRUONG_DVI', 'NGAY_CT',
  ],
  CT06: [
    'MA_CT', 'SO_SERI', 'SO_KCB', 'MA_BHXH', 'MA_THE', 'HO_TEN', 'NGAY_SINH',
    'NGAY_VAO', 'NGAY_RA', 'TU_NGAY', 'DEN_NGAY', 'TUOI_THAI', 'CHAN_DOAN',
    'BENH_ICD10_ID', 'BENH_ICD10_TEN', 'MA_BS', 'TEN_BS', 'NGUOI_DAI_DIEN',
    'TEN_DVI', 'NGAY_CT', 'LOAI_GIAYTO', 'SO_CCCD', 'NGAYCAP_CCCD',
    'NOI_CU_TRU_NND', 'MATINH_CU_TRU', 'MAXA_CU_TRU',
  ],
  GIAYDIEUTRINOITRU: [
    'SO_LUU_TRU', 'MA_YTE', 'MA_BHXH', 'MA_THE', 'HO_TEN', 'NGAY_SINH',
    'GIOI_TINH', 'MA_KHOA', 'TEN_DAN_TOC', 'MA_DAN_TOC', 'NGHE_NGHIEP',
    'DIA_CHI', 'NGAY_VAO', 'NGAY_RA', 'CHAN_DOAN', 'PP_DIEUTRI', 'MO_TA',
    'GHI_CHU', 'DAI_DIEN_DVI', 'MA_CCHN_BS', 'TEN_BS', 'LOAI_GIAYTO', 'SO_CCCD',
    'NGAYCAP_CCCD', 'NOICAP_CCCD', 'BENH_ICD10_MA', 'BENH_ICD10_TEN', 'MA_CT',
    'NGAY_CT', 'SO_SERI', 'TUOI_THAI', 'IS_NGHIDUONGTHAI', 'SO_NGAY_NGHIDUONGTHAI',
  ],
  GIAYDIEUTRIVOSINH: [
    'SO_LUU_TRU', 'MA_YTE', 'MA_BHXH', 'MA_THE', 'HO_TEN', 'NGAY_SINH',
    'MA_KHOA', 'MA_TINHCUTRU', 'MA_XACUTRU', 'NGHE_NGHIEP', 'DIA_CHI',
    'NGAY_VAO', 'NGAY_RA', 'CHAN_DOAN', 'PP_DIEUTRI', 'GHI_CHU', 'DAI_DIEN_DVI',
    'MA_CCHN_BS', 'TEN_BS', 'LOAI_GIAYTO', 'SO_CCCD', 'NGAYCAP_CCCD',
    'NOICAP_CCCD', 'BENH_ICD10_MA', 'BENH_ICD10_TEN', 'MA_CT', 'NGAY_CT',
    'SO_SERI', 'LOAI_PHUONG_PHAP',
  ],
  GIAYSUCKHOEME: [
    'SO_LUU_TRU', 'MA_YTE', 'MA_BHXH', 'MA_THE', 'HO_TEN', 'NGAY_SINH',
    'MA_KHOA', 'MA_TINHCUTRU', 'MA_XACUTRU', 'NGHE_NGHIEP', 'DIA_CHI',
    'NGAY_VAO', 'NGAY_RA', 'CHAN_DOAN', 'PP_DIEUTRI', 'KET_LUAN',
    'TINHTRANGBENHHIENTAI', 'DAI_DIEN_DVI', 'MA_CCHN_BS', 'TEN_BS',
    'LOAI_GIAYTO', 'SO_CCCD', 'NGAYCAP_CCCD', 'NOICAP_CCCD', 'BENH_ICD10_MA',
    'BENH_ICD10_TEN', 'MA_CT', 'NGAY_CT', 'SO_SERI',
  ],
};

const TT25_COLUMN_LABELS: Record<string, string> = {
  MA_CT: 'Mã chứng từ',
  MAU_SO: 'Mẫu số',
  SO_SERI: 'Số seri',
  SO_KCB: 'Số KCB',
  SO_LUU_TRU: 'Số lưu trữ',
  MA_YTE: 'Mã y tế',
  MA_KHOA: 'Mã khoa',
  MA_BHXH: 'Mã số BHXH',
  MA_BHXH_NND: 'Mã BHXH mẹ',
  MA_THE: 'Mã thẻ BHYT',
  MA_THE_NND: 'Mã thẻ mẹ',
  HO_TEN: 'Họ và tên',
  HOTEN_NND: 'Họ tên mẹ/NND',
  NGAY_SINH: 'Ngày sinh',
  NGAYSINH_NND: 'Ngày sinh mẹ',
  GIOI_TINH: 'Giới tính',
  GIOI_TINH_CON: 'Giới tính con',
  MA_DANTOC: 'Mã dân tộc',
  MA_DAN_TOC: 'Mã dân tộc',
  TEN_DAN_TOC: 'Tên dân tộc',
  MA_DANTOC_NND: 'Dân tộc mẹ',
  NGHE_NGHIEP: 'Nghề nghiệp',
  DIA_CHI: 'Địa chỉ',
  NOI_DK_THUONGTRU_NND: 'Thường trú mẹ',
  NOI_CU_TRU_NND: 'Nơi cư trú',
  MATINH_CU_TRU: 'Mã tỉnh',
  MAXA_CU_TRU: 'Mã xã',
  MA_TINHCUTRU: 'Mã tỉnh',
  MA_XACUTRU: 'Mã xã',
  DON_VI: 'Đơn vị công tác',
  TEN_DONVI: 'Tên đơn vị',
  TEN_DVI: 'Tên đơn vị',
  NGAY_VAO: 'Ngày vào viện',
  NGAY_RA: 'Ngày ra viện',
  TU_NGAY: 'Nghỉ từ ngày',
  DEN_NGAY: 'Nghỉ đến ngày',
  SO_NGAY: 'Số ngày nghỉ',
  NGOAITRU_TUNGAY: 'Ngoại trú từ',
  NGOAITRU_DENNGAY: 'Ngoại trú đến',
  DINH_CHI_THAI_NGHEN: 'Đình chỉ thai',
  TUOI_THAI: 'Tuổi thai',
  CHAN_DOAN: 'Chẩn đoán',
  CHAN_DOAN_VAO: 'Chẩn đoán vào',
  CHAN_DOAN_RA: 'Chẩn đoán ra',
  CHANDOAN_DIEUTRI: 'Chẩn đoán & ĐT',
  PP_DIEUTRI: 'Phương pháp ĐT',
  QT_BENHLY: 'Quá trình bệnh lý',
  TOMTAT_KQ: 'Tóm tắt KQ CLS',
  MO_TA: 'Mô tả',
  GHI_CHU: 'Ghi chú',
  HO_TEN_CHA: 'Họ tên cha',
  HO_TEN_ME: 'Họ tên mẹ',
  NGUOI_GIAM_HO: 'Người giám hộ',
  TEN_CON: 'Họ tên con',
  SO_CON: 'Số con',
  CAN_NANG_CON: 'Cân nặng (g)',
  NGAY_SINH_CON: 'Ngày sinh con',
  NGAY_SINHCON: 'Ngày sinh con',
  NGAY_CHETCON: 'Ngày con mất',
  SO_CONCHET: 'Số con mất',
  TINH_TRANG_CON: 'Tình trạng con',
  SINHCON_PHAUTHUAT: 'Sinh phẫu thuật',
  SINHCON_DUOI32TUAN: 'Sinh <32 tuần',
  NGUOI_DO_DE: 'Người đỡ đẻ',
  NGUOI_GHI_PHIEU: 'Người ghi phiếu',
  THU_TRUONG_DV: 'Thủ trưởng ĐV',
  THU_TRUONG_DVI: 'Thủ trưởng ĐV',
  NGUOI_DAI_DIEN: 'Người đại diện',
  DAI_DIEN_DVI: 'Đại diện ĐV',
  MA_CCHN: 'Mã CCHN BS',
  MA_CCHN_TRUONGKHOA: 'CCHN Trưởng khoa',
  MA_CCHN_BS: 'Mã CCHN BS',
  MA_BS: 'Mã CCHN BS',
  TEN_NGUOI_HANH_NGHE: 'Bác sĩ KCB',
  TEN_TRUONGKHOA: 'Trưởng khoa',
  TEN_BS: 'Họ tên Bác sĩ',
  NGAY_CHUNG_TU: 'Ngày chứng từ',
  NGAY_CT: 'Ngày chứng từ',
  NGAY_KCB: 'Ngày KCB',
  TEKT: 'Trẻ em không thẻ',
  LOAI_GIAYTO: 'Loại giấy tờ',
  SO_CCCD: 'Số CCCD/ĐDCN',
  SO_CMND_NND: 'Số CCCD mẹ',
  NGAYCAP_CCCD: 'Ngày cấp CCCD',
  NGAYCAP_CMND_NND: 'Ngày cấp CCCD mẹ',
  NOICAP_CCCD: 'Nơi cấp CCCD',
  NOICAP_CMND_NND: 'Nơi cấp CCCD mẹ',
  TT_RAVIEN: 'Tình trạng RV',
  LYDO_VVIEN: 'Lý do vào viện',
  BENH_ICD10_ID: 'Mã ICD-10',
  BENHICD10_ID: 'Mã ICD-10',
  BENH_ICD10_MA: 'Mã ICD-10',
  BENH_ICD10_TEN: 'Tên bệnh ICD-10',
  TENBENHNICD10: 'Tên bệnh ICD-10',
  IS_NGHIDUONGTHAI: 'Nghỉ dưỡng thai',
  SO_NGAY_NGHIDUONGTHAI: 'Số ngày dưỡng thai',
  LOAI_PHUONG_PHAP: 'Loại phương pháp',
  KET_LUAN: 'Kết luận',
  TINHTRANGBENHHIENTAI: 'Tình trạng bệnh',
};

function getCompactTt25ColumnWidth(col: string): number {
  switch (col) {
    case 'GIOI_TINH':
    case 'GIOI_TINH_CON':
    case 'TEKT':
    case 'LOAI_GIAYTO':
    case 'SO_CON':
    case 'SO_NGAY':
    case 'TUOI_THAI':
    case 'SO_CONCHET':
    case 'TT_RAVIEN':
    case 'LYDO_VVIEN':
    case 'KET_LUAN':
    case 'LOAI_PHUONG_PHAP':
      return 42;
    case 'MAU_SO':
    case 'MA_DANTOC':
    case 'MA_DAN_TOC':
    case 'MA_DANTOC_NND':
    case 'SINHCON_PHAUTHUAT':
    case 'SINHCON_DUOI32TUAN':
    case 'DINH_CHI_THAI_NGHEN':
    case 'IS_NGHIDUONGTHAI':
    case 'SO_NGAY_NGHIDUONGTHAI':
    case 'MATINH_CU_TRU':
    case 'MAXA_CU_TRU':
    case 'MA_TINHCUTRU':
    case 'MA_XACUTRU':
      return 48;
    case 'MA_KHOA':
    case 'CAN_NANG_CON':
    case 'BENH_ICD10_ID':
    case 'BENHICD10_ID':
    case 'BENH_ICD10_MA':
    case 'TEN_DAN_TOC':
      return 58;
    case 'MA_CT':
    case 'SO_SERI':
    case 'SO_KCB':
    case 'SO_LUU_TRU':
    case 'MA_YTE':
      return 66;
    case 'NGAY_SINH':
    case 'NGAYSINH_NND':
    case 'TU_NGAY':
    case 'DEN_NGAY':
    case 'NGAY_CHUNG_TU':
    case 'NGAY_CT':
    case 'NGAY_KCB':
    case 'NGAYCAP_CCCD':
    case 'NGAYCAP_CMND_NND':
    case 'NGOAITRU_TUNGAY':
    case 'NGOAITRU_DENNGAY':
    case 'NGAY_SINHCON':
    case 'NGAY_CHETCON':
      return 74;
    case 'MA_BHXH':
    case 'MA_BHXH_NND':
    case 'MA_CCHN':
    case 'MA_CCHN_TRUONGKHOA':
    case 'MA_CCHN_BS':
    case 'MA_BS':
      return 84;
    case 'SO_CCCD':
    case 'SO_CMND_NND':
    case 'NGAY_VAO':
    case 'NGAY_RA':
    case 'NGAY_SINH_CON':
      return 94;
    case 'MA_THE':
    case 'MA_THE_NND':
      return 114;
    case 'HO_TEN':
    case 'HOTEN_NND':
    case 'TEN_CON':
    case 'HO_TEN_CHA':
    case 'HO_TEN_ME':
    case 'TEN_NGUOI_HANH_NGHE':
    case 'THU_TRUONG_DV':
    case 'THU_TRUONG_DVI':
    case 'TEN_TRUONGKHOA':
    case 'NGUOI_DAI_DIEN':
    case 'DAI_DIEN_DVI':
    case 'NGUOI_DO_DE':
    case 'NGUOI_GHI_PHIEU':
    case 'TEN_BS':
    case 'CHANDOAN_DIEUTRI':
    case 'CHAN_DOAN':
    case 'CHAN_DOAN_VAO':
    case 'CHAN_DOAN_RA':
    case 'BENH_ICD10_TEN':
    case 'TENBENHNICD10':
    case 'DON_VI':
    case 'TEN_DONVI':
    case 'TEN_DVI':
    case 'DIA_CHI':
    case 'NOI_DK_THUONGTRU_NND':
    case 'NOI_CU_TRU_NND':
      return 125;
    default:
      return 92;
  }
}

function getTt25FieldValue(r: HoSoRecord, col: string): string {
  const raw = r.rawData || {};
  if (raw[col] !== undefined && raw[col] !== '') return String(raw[col]);
  switch (col) {
    case 'MA_CT':
      return raw.SO_SERI || raw.SERI || '';
    case 'MAU_SO':
      return raw.MAU_SO || r.type || '';
    case 'SO_SERI':
      return raw.SERI || raw.SO_KCB || '';
    case 'SO_KCB':
      return raw.SERI || raw.SO_SERI || '';
    case 'HO_TEN':
      return raw.HOTEN || r.hoTen || '';
    case 'HOTEN_NND':
      return raw.HO_TEN_ME || r.hoTen || '';
    case 'MA_THE':
    case 'MA_THE_NND':
      return raw.MATHE || r.maBhyt || '';
    case 'MA_BHXH':
    case 'MA_BHXH_NND':
      return raw.MA_SOBHXH || r.maBhxh || '';
    case 'SO_CCCD':
    case 'SO_CMND_NND':
      return raw.CCCD || raw.CMND || r.cccd || '';
    case 'BENH_ICD10_ID':
    case 'BENHICD10_ID':
    case 'BENH_ICD10_MA':
      return raw.BENH_ICD10_ID || raw.BENHICD10_ID || raw.BENHICD10 || r.icd || '';
    case 'BENH_ICD10_TEN':
    case 'TENBENHNICD10':
      return raw.BENH_ICD10_TEN || raw.TENBENHNICD10 || raw.TENBENHICD10 || raw.CHANDOAN_DIEUTRI || raw.CHAN_DOAN || r.chanDoan || '';
    case 'CHANDOAN_DIEUTRI':
    case 'CHAN_DOAN':
      return raw.CHANDOAN_DIEUTRI || raw.CHAN_DOAN || r.chanDoan || '';
    case 'TEN_NGUOI_HANH_NGHE':
    case 'TEN_BS':
      return raw.TEN_NGUOI_HANH_NGHE || raw.TEN_BSY || raw.TEN_BS || r.nguoiKy || '';
    case 'MA_CCHN':
    case 'MA_CCHN_TRUONGKHOA':
    case 'MA_CCHN_BS':
    case 'MA_BS':
      return raw.MA_CCHN || raw.MA_CCHN_TRUONGKHOA || raw.MA_BS || r.cchn || '';
    default:
      return '';
  }
}

export default function HoSoChungTu({ onGoHome }: { onGoHome?: () => void }) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showTaoHoSoModal, setShowTaoHoSoModal] = useState(false);
  const [cskcbConfig, setCskcbConfig] = useState<CskcbConfig | null>(() => {
    try {
      const saved = localStorage.getItem('cskcb_config') || sessionStorage.getItem('cskcb_config');
      if (saved) return JSON.parse(saved);

      // Chưa có cskcb_config → thử lấy từ org_config đã lưu bởi ConfigModal
      const orgRaw = localStorage.getItem('org_config') || sessionStorage.getItem('org_config');
      if (orgRaw) {
        const org = JSON.parse(orgRaw);
        if (org.ma_cskcb) {
          // Tạo một partial config để pre-fill màn hình thiết lập
          return {
            cskcb: { ma: org.ma_cskcb, ten: org.ten_cskcb || '', tuyen: '', hang: '', diaChi: '' },
            bhxhAccount: {
              username: org.bhxh_account?.username || '',
              password: '',
              passwordRaw: '',
            }
          } as CskcbConfig;
        }
      }
    } catch (e) { }
    return null;
  });
  const [kySoMode, setKySoMode] = useState<'sign' | 'submit' | 'sign_then_submit' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Lưu cache dữ liệu chứng từ trong phiên trình duyệt (bấm F5 không mất dữ liệu, chỉ khi tắt trình duyệt mới tự xóa)
  const [records, setRecords] = useState<HoSoRecord[]>(() =>
    getSessionSync<HoSoRecord[]>('hoso_chungtu_records_v1', [])
  );
  const [cacheHydrated, setCacheHydrated] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    getSessionCache<HoSoRecord[]>('hoso_chungtu_records_v1')
      .then(cached => {
        if (!mounted) return;
        if (Array.isArray(cached) && cached.length > 0) {
          setRecords(cached);
        }
      })
      .finally(() => {
        if (mounted) setCacheHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!cacheHydrated) return;
    setSessionCache('hoso_chungtu_records_v1', records).catch(() => {});
  }, [cacheHydrated, records]);

  const [cskcbMismatch, setCskcbMismatch] = useState<{ excelMa: string; configMa: string } | null>(null);

  // Helper xác định chính xác trạng thái
  const isRecordSubmitted = (r: HoSoRecord) => r.trangThai === 'SUBMITTED' || Boolean(r.maGD);
  const isRecordSigned = (r: HoSoRecord) => !isRecordSubmitted(r) && (
    r.trangThai === 'SIGNED' || Boolean(r.signatureBase64) || Boolean(r.xmlContent?.includes('<SignatureValue>'))
  );

  const selectedRecords = records.filter(r => selectedIds.has(r.id));
  const signedCount = records.filter(isRecordSigned).length;
  const submittedCount = records.filter(isRecordSubmitted).length;
  const draftCount = records.filter(r => !isRecordSubmitted(r) && !isRecordSigned(r) && r.trangThai !== 'SIGN_FAILED' && r.trangThai !== 'SUBMIT_FAILED' && r.trangThai !== 'INVALID_FORMAT').length;
  const errorCount = records.filter(r => r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED' || r.trangThai === 'INVALID_FORMAT').length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} hồ sơ đã chọn?`)) return;
    setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  const handleDeleteAll = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TẤT CẢ hồ sơ trong danh sách?')) return;
    setRecords([]);
    setSelectedIds(new Set());
    removeSessionCache('hoso_chungtu_records_v1').catch(() => {});
  };

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ này?')) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleKySoComplete = (updated: HoSoRecord[]) => {
    setRecords(prev => {
      const map = new Map(prev.map(r => [r.id, r]));
      updated.forEach(r => {
        // Đảm bảo trạng thái luôn chính xác: nếu có xmlContent chứa SignatureValue thì ít nhất là SIGNED
        const hasSig = Boolean(r.signatureBase64) || Boolean(r.xmlContent?.includes('<SignatureValue>'));
        let finalStatus = r.trangThai;
        if (r.maGD || r.trangThai === 'SUBMITTED') {
          finalStatus = 'SUBMITTED';
        } else if (hasSig && (r.trangThai === 'UNSIGNED' || r.trangThai === 'DRAFT')) {
          finalStatus = 'SIGNED';
        }
        map.set(r.id, { ...r, trangThai: finalStatus });
      });
      return Array.from(map.values());
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const { buildXml } = await import('../lib/xmlBuilder');
      const { getOrgConfig } = await import('../lib/signAndSubmitService');
      const { detectDocType, mapRowToDisplay, mapRowToRawData, validateRecord, normalizeHeaderKey, normalizeRow } = await import('../lib/importMapper');
      const org = getOrgConfig();
      const fileNameLower = file.name.toLowerCase();

      // Đọc bảng tính dưới dạng mảng 2 chiều để kiểm tra header 1 dòng (HIS) hoặc 2 dòng (Template)
      const rawRows = utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
      if (!rawRows || !rawRows.length) { alert('File Excel không có dữ liệu!'); return; }

      let headerRowIndex = 0;
      let dataStartIndex = 1;
      if (rawRows.length > 1) {
        const row0 = rawRows[0].map((c: any) => String(c ?? '').trim());
        const row1 = rawRows[1].map((c: any) => String(c ?? '').trim().toUpperCase());
        const technicalTokens = ['MAU_SO', 'MA_CT', 'HO_TEN', 'TU_NGAY', 'DEN_NGAY', 'SO_SERI', 'SERI', 'HOTEN_NND', 'MA_BHXH', 'SO_KCB', 'NGAY_VAO', 'NGAY_RA', 'BENHICD10'];
        const row1Matches = row1.filter((c: string) => technicalTokens.some(t => c.includes(t))).length;
        const row0Matches = row0.filter((c: string) => technicalTokens.some(t => c.toUpperCase().includes(t))).length;
        if (row1Matches >= 2 && row1Matches > row0Matches) {
          headerRowIndex = 1;
          dataStartIndex = 2;
        }
      }

      const headers = rawRows[headerRowIndex].map((h: any) => normalizeHeaderKey(String(h ?? '')));
      const rawHeaders = rawRows[headerRowIndex].map((h: any) => String(h ?? '').trim());

      const jsonData: Record<string, any>[] = [];
      for (let r = dataStartIndex; r < rawRows.length; r++) {
        const rowData = rawRows[r];
        if (!rowData || !rowData.length) continue;
        const hasData = rowData.some((cell: any) => String(cell ?? '').trim() !== '');
        if (!hasData) continue;

        const rowObj: Record<string, any> = {};
        headers.forEach((hdr: string, colIdx: number) => {
          if (hdr) rowObj[hdr] = rowData[colIdx] ?? '';
          if (rawHeaders[colIdx]) rowObj[rawHeaders[colIdx]] = rowData[colIdx] ?? '';
        });
        jsonData.push(normalizeRow(rowObj));
      }

      if (!jsonData.length) { alert('File Excel không có dòng dữ liệu hợp lệ!'); return; }

      // Nhận dạng loại CT từ file và các dòng dữ liệu
      const detectedType = detectDocType(fileNameLower, jsonData[0], jsonData) as HoSoRecord['type'];

      // Kiểm tra đối chiếu mã CSKCB
      const firstRow = jsonData[0];
      const maCskcbExcel = String(
        firstRow['MA_CSKCB'] ?? firstRow['Ma_CSKCB'] ?? firstRow['ma_cskcb'] ?? ''
      ).trim();
      const maCskcbConfig = (cskcbConfig?.cskcb.ma || org.ma_cskcb || '').trim();
      if (maCskcbExcel && maCskcbConfig && maCskcbExcel !== maCskcbConfig) {
        setCskcbMismatch({ excelMa: maCskcbExcel, configMa: maCskcbConfig });
      } else {
        setCskcbMismatch(null);
      }

      const mappedRecords: HoSoRecord[] = jsonData.map((item, index) => {
        // Nhận diện theo dòng nếu có MAU_SO riêng, ngược lại kế thừa detectedType
        const type = (item['MAU_SO'] || item['MA_CT'] ? detectDocType(fileNameLower, item, [item]) : detectedType) as HoSoRecord['type'] || detectedType;
        const rawData = mapRowToRawData(type, item);
        const display = mapRowToDisplay(type, item);
        const errors = validateRecord(type, rawData);

        let xmlContent: string | undefined;
        try { xmlContent = buildXml(type, rawData, org.ma_cskcb); } catch { }

        return {
          id: `${Date.now()}_${index}`,
          type,
          hoTen: display.hoTen || 'Không rõ',
          maBhyt: display.maBhyt,
          maBhxh: display.maBhxh,
          cccd: display.cccd,
          khoa: display.khoaPrimary,
          ngayVao: '',
          ngayRa: '',
          icd: display.chanDoanPrimary,
          chanDoan: display.chanDoanSecondary,
          nguoiKy: display.nguoiKyPrimary,
          cchn: display.nguoiKySecondary,
          displayFields: {
            khoaPrimary: display.khoaPrimary,
            khoaSecondary: display.khoaSecondary,
            chanDoanPrimary: display.chanDoanPrimary,
            chanDoanSecondary: display.chanDoanSecondary,
            nguoiKyPrimary: display.nguoiKyPrimary,
            nguoiKySecondary: display.nguoiKySecondary,
          },
          trangThai: errors.length > 0 ? 'INVALID_FORMAT' as HoSoRecord['trangThai'] : 'UNSIGNED' as HoSoRecord['trangThai'],
          errors,
          rawData,
          xmlContent,
        };
      });

      setRecords(mappedRecords);
      setSelectedSchemaType(detectedType);
      setCurrentPage(1);
      setSelectedIds(new Set());
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Thông báo kết quả nhận dạng
      const typeNames: Record<string, string> = {
        CT03: 'Giấy ra viện (CT03)', CT04: 'Tóm tắt HSBA (CT04)',
        CT05: 'Giấy chứng sinh (CT05)', CT06: 'Nghỉ dưỡng thai (CT06)', CT07: 'Nghỉ việc BHXH (CT07)',
      };
      const typeName = typeNames[detectedType] || detectedType;
      alert(`✅ Nhận diện thành công: ${typeName}\nSố lượng nhập: ${mappedRecords.length} hồ sơ`);

    } catch (error) {
      console.error('Error parsing excel:', error);
      alert('Có lỗi xảy ra khi đọc file Excel!');
    }
  };

  const handleChangeDocType = async (targetType: HoSoType, targetIds?: string[]) => {
    try {
      const { buildXml } = await import('../lib/xmlBuilder');
      const { getOrgConfig } = await import('../lib/signAndSubmitService');
      const { mapRowToDisplay, mapRowToRawData, validateRecord } = await import('../lib/importMapper');
      const org = getOrgConfig();

      const idsToChange = targetIds && targetIds.length > 0 ? new Set(targetIds) : new Set(records.map(r => r.id));
      if (idsToChange.size === 0) return;

      setRecords(prev => prev.map(r => {
        if (!idsToChange.has(r.id)) return r;
        const type = targetType;
        const sourceData = r.rawData || {};
        const rawData = mapRowToRawData(type, sourceData);
        const display = mapRowToDisplay(type, sourceData);
        const errors = validateRecord(type, rawData);

        let xmlContent: string | undefined;
        try { xmlContent = buildXml(type, rawData, org.ma_cskcb); } catch { }

        return {
          ...r,
          type,
          hoTen: display.hoTen || r.hoTen || 'Không rõ',
          maBhyt: display.maBhyt || r.maBhyt,
          maBhxh: display.maBhxh || r.maBhxh,
          cccd: display.cccd || r.cccd,
          khoa: display.khoaPrimary,
          icd: display.chanDoanPrimary,
          chanDoan: display.chanDoanSecondary,
          nguoiKy: display.nguoiKyPrimary,
          cchn: display.nguoiKySecondary,
          displayFields: {
            khoaPrimary: display.khoaPrimary,
            khoaSecondary: display.khoaSecondary,
            chanDoanPrimary: display.chanDoanPrimary,
            chanDoanSecondary: display.chanDoanSecondary,
            nguoiKyPrimary: display.nguoiKyPrimary,
            nguoiKySecondary: display.nguoiKySecondary,
          },
          trangThai: errors.length > 0 ? 'INVALID_FORMAT' as HoSoRecord['trangThai'] : 'UNSIGNED' as HoSoRecord['trangThai'],
          errors,
          rawData,
          xmlContent,
        };
      }));

      const typeNames: Record<string, string> = {
        CT03: 'Mẫu CT03 - Giấy ra viện',
        CT04: 'Mẫu CT04 - Tóm tắt HSBA',
        CT05: 'Mẫu CT05 - Giấy chứng sinh',
        CT06: 'Mẫu CT06 - Nghỉ dưỡng thai',
        CT07: 'Mẫu CT07 - Nghỉ việc BHXH',
      };
      alert(`✅ Đã chuyển đổi ${idsToChange.size} hồ sơ sang ${typeNames[targetType] || targetType}!`);
    } catch (err) {
      console.error('Error changing doc type:', err);
      alert('Có lỗi khi chuyển đổi loại chứng từ!');
    }
  };


  const handleExportExcel = async () => {
    if (records.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }
    try {
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();

      // Gom nhóm theo loại chứng từ để xuất ra các sheet riêng biệt
      const types = Array.from(new Set(records.map(r => r.type)));

      types.forEach(type => {
        const recordsOfType = records.filter(r => r.type === type);
        const exportData = recordsOfType.map(r => {
          // Xuất đúng định dạng cột chuẩn từ rawData
          const data: any = { ...r.rawData };

          // Thêm các cột trạng thái để dễ theo dõi
          data['TRANG_THAI_KY_SO'] = r.trangThai === 'SUBMITTED' ? 'Đã gửi Cổng' :
            r.trangThai === 'SIGNED' ? 'Đã ký số' :
              r.trangThai === 'INVALID_FORMAT' ? 'Lỗi định dạng' : 'Chưa ký';

          if (r.maGD) data['MA_GIAO_DICH'] = r.maGD;
          if (r.errors && r.errors.length > 0) data['CHI_TIET_LOI'] = r.errors.join('; ');

          return data;
        });

        const ws = utils.json_to_sheet(exportData);
        utils.book_append_sheet(wb, ws, `Mẫu_${type}`);
      });

      writeFile(wb, `DanhSachChungTu_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Export error', err);
      alert('Lỗi xuất Excel');
    }
  };

  const handleExportXml = async (targetRecords?: HoSoRecord[]) => {
    const list = targetRecords || (selectedIds.size > 0 ? selectedRecords : records);
    if (list.length === 0) {
      alert('Không có hồ sơ nào để xuất XML!');
      return;
    }

    try {
      const { buildXml, buildHSCHUNGTU, xmlToBase64, LOAI_HOSO_XML_NAME } = await import('../lib/xmlBuilder');
      const { getOrgConfig } = await import('../lib/signAndSubmitService');
      const org = getOrgConfig();
      const maCskcb = (cskcbConfig?.cskcb.ma || org.ma_cskcb || '48225').trim();

      if (list.length === 1) {
        // Xuất 1 file XML đơn lẻ
        const r = list[0];
        let xmlStr = r.signedXml || r.xmlContent;
        if (!xmlStr) {
          xmlStr = buildXml(r.type, r.rawData, maCskcb);
        }
        const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanName = (r.hoTen || 'HOSO').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
        a.download = `${r.type}_${maCskcb}_${cleanName}_${r.id.slice(-6)}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Xuất gói tổng hợp HSCHUNGTU chứa tất cả hồ sơ theo chuẩn Phụ lục 02
        const { buildDocContent } = await import('../lib/xmlBuilder');
        const hosoList = list.map(r => {
          const loaiHs = LOAI_HOSO_XML_NAME[r.type] || r.type;
          const innerDoc = buildDocContent(r.type, r.rawData);
          const base64Content = xmlToBase64(innerDoc);
          return { loaiHs, base64Content };
        });

        const packageXml = buildHSCHUNGTU(maCskcb, hosoList);
        const blob = new Blob([packageXml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `HSCHUNGTU_${maCskcb}_${list.length}HS_${dateStr}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`✅ Đã xuất gói XML gồm ${list.length} hồ sơ thành công!`);
      }
    } catch (err: any) {
      console.error('Lỗi xuất XML:', err);
      alert('Có lỗi xảy ra khi tạo file XML: ' + (err?.message || ''));
    }
  };

  const handleDownloadSingleXml = (r: HoSoRecord) => {
    handleExportXml([r]);
  };

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedSchemaType, setSelectedSchemaType] = useState<HoSoType>('CT07');

  const activeSchemaType: HoSoType =
    filterType !== 'ALL'
      ? (filterType as HoSoType)
      : (records[0]?.type as HoSoType) || selectedSchemaType || 'CT07';

  const activeColumns: string[] =
    TT25_TABLE_COLUMNS[activeSchemaType] || TT25_TABLE_COLUMNS.CT07;

  const activeColFilterEntries = Object.entries(columnFilters).filter(
    ([, val]) => val && val.trim() !== ''
  );

  const handleCellEdit = (recordId: string, col: string, value: string) => {
    const org = getOrgConfig();
    const maCskcb = (cskcbConfig?.cskcb.ma || org.ma_cskcb || '48225').trim();
    setRecords(prev =>
      prev.map(r => {
        if (r.id !== recordId) return r;
        const updatedSource = { ...(r.rawData || {}), [col]: value };
        const rawData = mapRowToRawData(r.type, updatedSource);
        rawData[col] = value;
        const display = mapRowToDisplay(r.type, rawData);
        const errors = validateRecord(r.type, rawData);
        let xmlContent = r.xmlContent;
        try {
          xmlContent = buildXml(r.type, rawData, maCskcb);
        } catch {}

        const wasSigned = isRecordSigned(r) || isRecordSubmitted(r);
        return {
          ...r,
          hoTen: display.hoTen || r.hoTen || 'Không rõ',
          maBhyt: display.maBhyt || r.maBhyt,
          maBhxh: display.maBhxh || r.maBhxh,
          cccd: display.cccd || r.cccd,
          khoa: display.khoaPrimary,
          icd: display.chanDoanPrimary,
          chanDoan: display.chanDoanSecondary,
          nguoiKy: display.nguoiKyPrimary,
          cchn: display.nguoiKySecondary,
          displayFields: {
            khoaPrimary: display.khoaPrimary,
            khoaSecondary: display.khoaSecondary,
            chanDoanPrimary: display.chanDoanPrimary,
            chanDoanSecondary: display.chanDoanSecondary,
            nguoiKyPrimary: display.nguoiKyPrimary,
            nguoiKySecondary: display.nguoiKySecondary,
          },
          trangThai: wasSigned
            ? r.trangThai
            : errors.length > 0
              ? ('INVALID_FORMAT' as HoSoRecord['trangThai'])
              : ('UNSIGNED' as HoSoRecord['trangThai']),
          errors,
          rawData,
          xmlContent,
        };
      })
    );
  };

  const filteredRecords = records.filter(r => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = r.hoTen.toLowerCase().includes(term);
      const matchBhyt = r.maBhyt.toLowerCase().includes(term);
      const matchCccd = r.cccd.toLowerCase().includes(term);
      const matchRaw = Object.values(r.rawData || {}).some(v =>
        String(v ?? '').toLowerCase().includes(term)
      );
      if (!matchName && !matchBhyt && !matchCccd && !matchRaw) return false;
    }
    // Filter by Type
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    // Filter by Status
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'SUBMITTED' && !isRecordSubmitted(r)) return false;
      if (filterStatus === 'SIGNED' && !isRecordSigned(r)) return false;
      if (filterStatus === 'UNSIGNED' && (isRecordSubmitted(r) || isRecordSigned(r))) return false;
      if (filterStatus === 'ERROR' && r.trangThai !== 'SIGN_FAILED' && r.trangThai !== 'SUBMIT_FAILED' && r.trangThai !== 'INVALID_FORMAT') return false;
    }
    // Filter by per-column inputs
    if (activeColFilterEntries.length > 0) {
      for (const [col, filterVal] of activeColFilterEntries) {
        const cellVal = getTt25FieldValue(r, col).toLowerCase();
        if (!cellVal.includes(filterVal.trim().toLowerCase())) return false;
      }
    }
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-full w-full mx-auto px-1 py-1 flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">

      {/* Facility Info & Stats Compact Bar */}
      <div className="shrink-0 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-extrabold rounded border border-blue-200 shrink-0">
              MÃ: {cskcbConfig?.cskcb.ma && cskcbConfig.cskcb.ma !== '49006' ? cskcbConfig.cskcb.ma : '48225'}
            </span>
            <h2 className="text-xs sm:text-sm font-black text-slate-800 truncate max-w-[420px]" title={cskcbConfig?.cskcb.ten}>
              {cskcbConfig?.cskcb.ten && !cskcbConfig.cskcb.ten.includes('Duy Xuyên')
                ? cskcbConfig.cskcb.ten
                : 'NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG'}
            </h2>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Cấu hình
              </button>
              <button
                onClick={() => setShowFacilityModal(true)}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200 flex items-center gap-1 hover:bg-blue-100 transition cursor-pointer"
              >
                <Building className="w-3.5 h-3.5" />
                Đổi CSKCB
              </button>
              <div
                className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10.5px] font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5"
                title="Dữ liệu chỉ lưu tạm thời trong RAM của phiên làm việc. F5 hoặc tắt trình duyệt dữ liệu sẽ tự động giải phóng sạch."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Lưu tạm RAM • F5 tự hủy
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button className="px-2.5 py-1 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 hover:bg-slate-50 transition cursor-pointer">
              <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
              Nhúng XML
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-50 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Nhập Excel
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="px-2.5 py-1 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1 hover:bg-emerald-50 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Mẫu Excel
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showTemplateMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                    FILE MẪU CHUẨN BHXH (BỘ Y TẾ)
                  </div>
                  {[
                    { id: '01BH', name: 'Mẫu 01BH - Chi tiết KCB', fields: 20 },
                    { id: 'CT03', name: 'Mẫu CT03 - Giấy ra viện', fields: 31 },
                    { id: 'CT04', name: 'Mẫu CT04 - Tóm tắt hồ sơ bệnh án', fields: 25 },
                    { id: 'CT05', name: 'Mẫu CT05 - Giấy chứng sinh', fields: 24 },
                    { id: 'CT06', name: 'Mẫu CT06 - Giấy nghỉ dưỡng thai', fields: 15 },
                    { id: 'CT07', name: 'Mẫu CT07 - Nghỉ việc BHXH', fields: 24 }
                  ].map(tpl => (
                    <a key={tpl.id} href={`/templates/Template_${tpl.id}_Mau_Chuan_BHXH.xlsx`} className="flex gap-3 px-4 py-2 hover:bg-slate-50 transition cursor-pointer items-start" download>
                      <FileSpreadsheet className="w-4 h-4 text-indigo-500 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-slate-700">{tpl.name}</div>
                        <div className="text-[11px] text-slate-500">Template chuẩn {tpl.fields} trường dữ liệu</div>
                      </div>
                    </a>
                  ))}

                  <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-b border-slate-100 my-1">
                    CÔNG CỤ KÝ SỐ USB TOKEN (.BAT)
                  </div>
                  <a href="/tools/Ky_XML_Bang_USB_Token.bat" className="flex gap-3 px-4 py-2 hover:bg-amber-50 transition cursor-pointer items-start" download>
                    <Usb className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Ky_XML_Bang_USB_Token.bat</div>
                      <div className="text-[11px] text-slate-500">Ký hàng loạt XML ngoại tuyến bằng USB Token</div>
                    </div>
                  </a>
                  <a href="/tools/Chay_Ky_So_USB_Token.bat" className="flex gap-3 px-4 py-2 hover:bg-blue-50 transition cursor-pointer items-start" download>
                    <Usb className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Chay_Ky_So_USB_Token.bat</div>
                      <div className="text-[11px] text-slate-500">Dịch vụ ký trực tiếp 1-click từ trình duyệt</div>
                    </div>
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowTaoHoSoModal(true)}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo Hồ Sơ Mới
            </button>
          </div>
        </div>

        {/* Dòng 2: Thống kê thu gọn & Quy trình trên 1 hàng */}
        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center gap-1.5 text-[11px]">
              <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
              Tổng hồ sơ: <strong className="text-slate-900 font-black">{records.length}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Đã gửi (200): <strong className="font-black">{submittedCount}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Đã ký số: <strong className="font-black">{signedCount}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-bold flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Chờ ký duyệt: <strong className="font-black">{draftCount}</strong>
            </span>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-lg border font-bold flex items-center gap-1.5 text-[11px]',
                errorCount > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              )}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Lỗi Rule: <strong className="font-black">{errorCount}</strong>
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500">
            <span className="text-[10px] uppercase font-bold text-slate-400">QUY TRÌNH:</span>
            <span>1. Nhập Excel/XML</span>
            <span>→</span>
            <span>2. Kiểm tra Rule TT25</span>
            <span>→</span>
            <span>3. Ký số</span>
            <span>→</span>
            <span>4. Gửi Cổng BHXH</span>
            <span>→</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">5. Nhận Mã GD (200)</span>
          </div>
        </div>
      </div>

      {/* CSKCB Mismatch Warning Banner */}
      {cskcbMismatch && (
        <div className="shrink-0 bg-amber-50 border border-amber-400 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-amber-800">
              <b>⚠️ Cảnh báo lệch Mã CSKCB:</b> File Excel có mã{' '}
              <span className="font-black bg-amber-200 px-1 py-0.5 rounded text-amber-900">{cskcbMismatch.excelMa}</span>{' '}
              khác với cấu hình đơn vị{' '}
              <span className="font-black bg-blue-100 px-1 py-0.5 rounded text-blue-800">{cskcbMismatch.configMa}</span>.
            </div>
          </div>
          <button
            onClick={() => setCskcbMismatch(null)}
            className="p-1 hover:bg-amber-200 rounded text-amber-600 transition shrink-0"
            title="Đóng cảnh báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table Section (Mở rộng tối đa chiều cao & Hiển thị FULL cột theo mẫu TT25) */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Dòng chọn nhanh Mẫu TT25 để hiển thị full cột tương ứng */}
        <div className="shrink-0 px-2.5 py-1 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10.5px] font-black uppercase text-slate-600 mr-1">
              Mẫu chứng từ ({activeColumns.length} cột):
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterType('ALL');
                setColumnFilters({});
                setCurrentPage(1);
              }}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer',
                filterType === 'ALL'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              )}
            >
              Tất cả ({records.length})
            </button>
            {TT25_TEMPLATE_OPTIONS.map(tpl => {
              const count = records.filter(r => r.type === tpl.code).length;
              const isActive = activeSchemaType === tpl.code;
              const colCount = (TT25_TABLE_COLUMNS[tpl.code] || []).length;
              return (
                <button
                  key={tpl.code}
                  type="button"
                  onClick={() => {
                    setSelectedSchemaType(tpl.code);
                    setFilterType(count > 0 || records.length > 0 ? tpl.code : 'ALL');
                    setColumnFilters({});
                    setCurrentPage(1);
                  }}
                  title={`${tpl.label} — Hiển thị đầy đủ ${colCount} cột`}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer',
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                  )}
                >
                  <span>{tpl.shortLabel}</span>
                  <span
                    className={cn(
                      'text-[9.5px] px-1 rounded-full font-extrabold',
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {count > 0 ? `${count} HS` : `${colCount} cột`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="shrink-0 px-2.5 py-1 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm họ tên, CCCD, thẻ BHYT, mã..."
                className="w-full pl-8 pr-3 py-0.5 bg-white border border-slate-300 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-white border border-slate-300 rounded-md pl-2 pr-6 py-0.5 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUBMITTED">Đã gửi Cổng (200)</option>
                <option value="SIGNED">Đã ký số</option>
                <option value="UNSIGNED">Chờ ký duyệt</option>
                <option value="ERROR">Lỗi Rule TT25</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>

            {activeColFilterEntries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setColumnFilters({});
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
              >
                Bỏ lọc cột ({activeColFilterEntries.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {records.length > 0 && (
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const target = e.target.value as HoSoType;
                      handleChangeDocType(target, selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
                      setSelectedSchemaType(target);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-semibold hover:bg-amber-100 transition cursor-pointer"
                  title="Chuyển đổi loại mẫu chứng từ cho các hồ sơ đang chọn (hoặc tất cả)"
                >
                  <option value="" disabled>
                    🔄 Đổi mẫu {selectedIds.size > 0 ? `(${selectedIds.size})` : `(Tất cả)`}...
                  </option>
                  {TT25_TEMPLATE_OPTIONS.map(tpl => (
                    <option key={tpl.code} value={tpl.code}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={() => setKySoMode('sign')}
                  className="px-2 py-0.5 text-blue-700 text-[11px] font-bold flex items-center gap-1 border border-blue-200 rounded-md bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ký số ({selectedIds.size})
                </button>
                <button
                  onClick={() => setKySoMode('submit')}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 border rounded-md transition cursor-pointer",
                    selectedRecords.some(isRecordSigned)
                      ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gửi BHXH ({selectedRecords.filter(isRecordSigned).length})
                </button>
                <button
                  onClick={() => setKySoMode('sign_then_submit')}
                  className="px-2 py-0.5 text-indigo-700 text-[11px] font-bold flex items-center gap-1 border border-indigo-200 rounded-md bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Ký &amp; Gửi ({selectedIds.size})
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-2 py-0.5 text-rose-700 text-[11px] font-bold flex items-center gap-1 border border-rose-200 rounded-md bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa ({selectedIds.size})
                </button>
              </>
            ) : (
              <>
                <button className="px-2 py-0.5 text-slate-400 text-[11px] font-semibold flex items-center gap-1 border border-slate-100 rounded-md bg-slate-50 cursor-not-allowed">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ký số ({signedCount})
                </button>
                <button className="px-2 py-0.5 text-slate-400 text-[11px] font-semibold flex items-center gap-1 border border-slate-100 rounded-md bg-slate-50 cursor-not-allowed">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã gửi ({submittedCount})
                </button>
              </>
            )}
            {records.length > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-2 py-0.5 text-rose-600 text-[11px] font-semibold flex items-center gap-1 border border-rose-200 rounded-md bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tất cả
              </button>
            )}
            <button
              onClick={() => handleExportXml()}
              disabled={records.length === 0}
              className={cn(
                "px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 border rounded-md transition cursor-pointer",
                records.length > 0
                  ? "text-blue-700 border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 shadow-2xs"
                  : "text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed"
              )}
              title="Xuất file XML chuẩn Phụ lục 02 để nộp hoặc lưu trữ"
            >
              <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
              Xuất XML {selectedIds.size > 0 ? `(${selectedIds.size})` : records.length > 0 ? `(${records.length})` : ''}
            </button>
            <button
              onClick={handleExportExcel}
              className="px-2 py-0.5 text-slate-600 text-[11px] font-semibold flex items-center gap-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất Excel ({records.length})
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-white flex flex-col">
          <table
            className="w-full table-fixed text-left border-collapse text-[11px]"
            style={{
              minWidth: `${
                26 +
                86 +
                96 +
                42 +
                activeColumns.reduce((sum, col) => sum + getCompactTt25ColumnWidth(col), 0)
              }px`,
            }}
          >
            <colgroup>
              <col style={{ width: '26px' }} />
              <col style={{ width: '86px' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '42px' }} />
              {activeColumns.map(col => (
                <col key={col} style={{ width: `${getCompactTt25ColumnWidth(col)}px` }} />
              ))}
            </colgroup>
            <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="px-0.5 py-1 border-b border-r border-slate-200 text-center align-middle">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 cursor-pointer"
                    onChange={toggleSelectAll}
                    checked={records.length > 0 && selectedIds.size === records.length}
                  />
                </th>
                <th className="px-1 py-1 border-b border-r border-slate-200 text-center font-black text-[9.5px] text-slate-700 align-middle">
                  <div>TRẠNG THÁI</div>
                  <div className="text-[8px] font-normal text-slate-500">Ký số / Cổng</div>
                </th>
                <th className="px-1 py-1 border-b border-r border-slate-200 text-center font-black text-[9.5px] text-slate-700 align-middle">
                  <div>THAO TÁC</div>
                  <div className="text-[8px] font-normal text-slate-500">Ký • Gửi • XML</div>
                </th>
                <th className="px-0.5 py-1 border-b border-r border-slate-200 text-center font-black text-[9.5px] text-slate-700 align-middle">
                  <div>MẪU</div>
                </th>
                {activeColumns.map((col, idx) => {
                  const colFilterVal = columnFilters[col] || '';
                  return (
                    <th
                      key={col}
                      className="px-0.5 py-1 border-b border-r border-slate-200 align-bottom overflow-hidden"
                      title={`${idx + 1}. ${col} — ${TT25_COLUMN_LABELS[col] || col}`}
                    >
                      <div className="flex items-start gap-0.5 leading-[1.1] min-h-[20px]">
                        <span className="text-[8px] font-black text-blue-700 bg-blue-50 px-0.5 rounded border border-blue-200 shrink-0 mt-px">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-800 font-mono text-[8.5px] break-words line-clamp-2">
                          {col.replace(/_/g, '_\u200B')}
                        </span>
                      </div>
                      <div className="text-[8.5px] font-medium text-slate-500 leading-[1.1] line-clamp-2 min-h-[18px] mt-0.5">
                        {TT25_COLUMN_LABELS[col] || '\u00A0'}
                      </div>
                      <div className="relative mt-0.5">
                        <input
                          type="text"
                          value={colFilterVal}
                          onChange={e => {
                            const val = e.target.value;
                            setColumnFilters(prev => ({
                              ...prev,
                              [col]: val,
                            }));
                            setCurrentPage(1);
                          }}
                          placeholder="Lọc"
                          className={cn(
                            'w-full px-1 py-px rounded border text-[9.5px] leading-tight font-normal outline-none transition',
                            colFilterVal
                              ? 'pr-3.5 bg-blue-50/70 border-blue-500 text-blue-950 font-semibold ring-1 ring-blue-400'
                              : 'bg-white border-slate-300 text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-400'
                          )}
                        />
                        {colFilterVal && (
                          <button
                            type="button"
                            onClick={() => {
                              setColumnFilters(prev => ({
                                ...prev,
                                [col]: '',
                              }));
                              setCurrentPage(1);
                            }}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Xóa lọc cột này"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr className="bg-slate-50/40">
                  <td className="px-0.5 py-1.5 border-b border-r border-slate-200 text-center text-slate-300">—</td>
                  <td className="px-1 py-1.5 border-b border-r border-slate-200 text-center text-[9.5px] text-slate-400">Chưa có HS</td>
                  <td className="px-1 py-1.5 border-b border-r border-slate-200 text-center text-[9.5px] text-slate-400">—</td>
                  <td className="px-0.5 py-1.5 border-b border-r border-slate-200 text-center text-[9.5px] font-bold text-indigo-600">
                    {activeSchemaType}
                  </td>
                  {activeColumns.map((col, idx) => (
                    <td
                      key={col}
                      className="px-1 py-1.5 border-b border-r border-slate-200 text-[10px] text-slate-400 italic truncate"
                      title={`Cột ${idx + 1}: ${col} (${TT25_COLUMN_LABELS[col] || col})`}
                    >
                      ({idx + 1}) {col}
                    </td>
                  ))}
                </tr>
              ) : (
                paginatedRecords.map(r => {
                  const submitted = isRecordSubmitted(r);
                  const signed = isRecordSigned(r);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'hover:bg-blue-50/40 transition-colors',
                        selectedIds.has(r.id) && 'bg-blue-50/60',
                        r.trangThai === 'INVALID_FORMAT' && 'bg-rose-50/60'
                      )}
                    >
                      <td className="px-0.5 py-0.5 border-r border-slate-200 text-center align-middle">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 cursor-pointer"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      {/* Cột TRẠNG THÁI thu gọn */}
                      <td className="px-1 py-0.5 border-r border-slate-200 align-middle">
                        <div className="flex flex-col gap-0.5 items-center text-center">
                          {submitted ? (
                            <span
                              className="px-1 py-px text-[9px] font-extrabold rounded bg-emerald-100 text-emerald-800 border border-emerald-200 truncate max-w-full"
                              title={r.maGD ? `Đã gửi Cổng — Mã GD: ${r.maGD}` : 'Đã gửi Cổng BHXH'}
                            >
                              ✅ Đã gửi
                            </span>
                          ) : signed ? (
                            <span
                              className="px-1 py-px text-[9px] font-extrabold rounded bg-blue-100 text-blue-700 border border-blue-200 truncate max-w-full"
                              title="Hồ sơ đã được ký số hợp lệ"
                            >
                              🔒 Đã ký số
                            </span>
                          ) : r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED' ? (
                            <span
                              className="px-1 py-px text-[9px] font-extrabold rounded bg-rose-100 text-rose-700 border border-rose-200 truncate max-w-full"
                              title={r.errorMessage || 'Lỗi ký/gửi'}
                            >
                              ❌ Lỗi
                            </span>
                          ) : r.trangThai === 'INVALID_FORMAT' ? (
                            <span
                              className="px-1 py-px text-[9px] font-extrabold rounded bg-rose-50 text-rose-700 border border-rose-200 truncate max-w-full"
                              title={r.errors?.join('\n') || 'Lỗi định dạng'}
                            >
                              ⚠️ Lỗi Rule ({r.errors?.length || 1})
                            </span>
                          ) : (
                            <span className="px-1 py-px text-[9px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 truncate max-w-full">
                              Chưa ký
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Cột THAO TÁC thu gọn */}
                      <td className="px-0.5 py-0.5 border-r border-slate-200 align-middle text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {!submitted && (
                            <>
                              {signed ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleSelect(r.id);
                                    setKySoMode('submit');
                                  }}
                                  title="Đã ký số. Nhấn để gửi Cổng BHXH"
                                  className="px-1 py-0.5 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 bg-emerald-50 text-[9.5px] font-bold cursor-pointer"
                                >
                                  Gửi
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleSelect(r.id);
                                    setKySoMode('sign');
                                  }}
                                  title="Nhấn để ký số VNPT SmartCA / USB Token"
                                  className="px-1 py-0.5 text-blue-700 hover:bg-blue-100 rounded border border-blue-300 bg-blue-50 text-[9.5px] font-bold cursor-pointer"
                                >
                                  Ký
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (r.trangThai !== 'INVALID_FORMAT') {
                                    toggleSelect(r.id);
                                    setKySoMode('sign_then_submit');
                                  }
                                }}
                                title="Ký & Gửi BHXH 1-click"
                                className="p-0.5 rounded border text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleXml(r)}
                            title="Tải file XML hồ sơ này"
                            className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id)}
                            title="Xóa hồ sơ"
                            className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      {/* Cột MẪU */}
                      <td className="px-0.5 py-0.5 border-r border-slate-200 text-center align-middle">
                        <span className="text-[10px] font-black text-indigo-700">{r.type}</span>
                      </td>
                      {/* TOÀN BỘ CÁC CỘT CỦA MẪU TT25 (Cho phép sửa trực tiếp) */}
                      {activeColumns.map(col => {
                        const val = getTt25FieldValue(r, col);
                        return (
                          <td key={col} className="p-0 border-r border-slate-200 overflow-hidden align-middle">
                            <input
                              type="text"
                              value={val}
                              onChange={e => handleCellEdit(r.id, col, e.target.value)}
                              title={val}
                              className="w-full px-0.5 py-0.5 text-[11px] tabular-nums leading-tight bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none font-medium text-slate-800 truncate"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="flex-1 min-h-[140px] p-4 text-center flex flex-col items-center justify-center space-y-1.5">
              <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-700">
                Chưa có hồ sơ chứng từ ({activeSchemaType} — {activeColumns.length} cột hiển thị phía trên)
              </h3>
              <p className="text-[11px] text-slate-500 max-w-md">
                Bạn có thể bấm chọn từng mẫu chứng từ phía trên để xem cấu trúc cột, hoặc <b>Nhập Excel</b> / <b>+ Tạo mới</b>.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Nhập Excel ngay
                </button>
                <button
                  onClick={() => setShowTaoHoSoModal(true)}
                  className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition cursor-pointer"
                >
                  + Tạo mới
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Phân trang cố định dưới chân bảng (Kèm danh sách số trang & Ô nhập nhảy tới trang) */}
        {filteredRecords.length > 0 && (
          <div className="shrink-0 px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
              <span>
                Trang <b className="text-blue-700">{currentPage}</b> / <b>{totalPages}</b> (Hiển thị{' '}
                <b>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRecords.length)}
                </b>{' '}
                / <b>{filteredRecords.length.toLocaleString()}</b> hồ sơ)
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={50}>50 dòng/trang</option>
                  <option value={100}>100 dòng/trang</option>
                  <option value={200}>200 dòng/trang</option>
                  <option value={500}>500 dòng/trang</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {/* Ô nhập số trang trực tiếp */}
              <div className="flex items-center gap-1 mr-1 bg-white px-2 py-0.5 rounded border border-slate-300">
                <span className="text-[11px] font-semibold text-slate-600">Đến trang:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCurrentPage(Math.min(Math.max(1, val), totalPages));
                    }
                  }}
                  className="w-14 px-1.5 py-0.5 text-center font-extrabold text-blue-700 bg-blue-50/60 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500 font-semibold">/ {totalPages}</span>
              </div>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                « Đầu
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-0.5 text-[11px] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>

              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 4) pages.push('...');
                  const start = Math.max(2, currentPage - 2);
                  const end = Math.min(totalPages - 1, currentPage + 2);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 3) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        'min-w-[28px] px-1.5 py-0.5 rounded border text-[11px] font-extrabold transition cursor-pointer',
                        p === currentPage
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                      )}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-0.5 text-[11px] cursor-pointer"
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                Cuối »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {kySoMode && (
        <KySoModal
          records={selectedIds.size > 0 ? selectedRecords : records}
          mode={kySoMode}
          onClose={() => setKySoMode(null)}
          onComplete={handleKySoComplete}
        />
      )}

      {showConfigModal && (
        <ConfigModal onClose={() => setShowConfigModal(false)} />
      )}

      {(showFacilityModal || !cskcbConfig) && (
        <CskcbSetupModal
          initialConfig={cskcbConfig || undefined}
          onClose={cskcbConfig ? () => setShowFacilityModal(false) : onGoHome}
          onSave={(cfg) => {
            setCskcbConfig(cfg);
            setShowFacilityModal(false);
          }}
        />
      )}

      {showTaoHoSoModal && (
        <TaoHoSoModal
          onClose={() => setShowTaoHoSoModal(false)}
          onRecordsCreated={(newRecords: HoSoRecord[]) => {
            setRecords(prev => [...newRecords, ...prev]);
            setShowTaoHoSoModal(false);
          }}
        />
      )}

    </div>
  );
}
