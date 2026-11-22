import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileCode2,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  Settings,
  Search,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Copy,
  X,
  RefreshCw,
  Move,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  TT12_CONFIGS,
  TT12TableConfig,
  Tt12XmlChunk,
  parseTt12ExcelBufferWithMeta,
  parseTt12XmlTextWithMeta,
  downloadBlankTt12ExcelTemplate,
  exportStandardTt12Excel,
  buildTt12XmlChunks,
  signTt12XmlString,
  normalizeAndEnrichRow,
} from '../lib/tt12Service';
import {
  renderPdfPageToCanvas,
  signPdfDocument,
  createCompositeSignatureStamp,
  extractCertDisplayInfo,
  removeImageBackgroundToPng,
  normalizeSignatureImageToPng,
  PdfRelativeBox,
  PdfPageInfo,
} from '../lib/pdfSignService';
import {
  getSmartCAConfig,
  SmartCAProfile,
  getSmartCAProfiles,
  getActiveSmartCAProfileId,
  setActiveSmartCAProfile,
  SignatureSlot,
  getSavedSignatureSlots,
  saveSignatureSlots,
  getActiveSignatureSlotIndex,
  saveActiveSignatureSlotIndex,
  DEFAULT_VNPT_SUBJECT,
  DEFAULT_VNPT_CERT,
} from '../lib/vnptSmartCaService';
import ConfigModal from './ConfigModal';
import {
  getSessionCache,
  getSessionSync,
  setSessionCache,
  setSessionSync,
} from '../lib/sessionCache';

const TT12_COLUMN_LABELS: Record<string, string> = {
  STT: 'Số thứ tự',
  MA_KHOA: 'Mã khoa/phòng',
  TEN_KHOA: 'Tên khoa/phòng',
  BAN_KHAM: 'Số bàn khám',
  GIUONG_PD: 'Giường phê duyệt',
  GIUONG_TK: 'Giường thực kê',
  GIUONG_HSTC: 'Giường HSTC',
  GIUONG_HSCC: 'Giường HSCC',
  TU_NGAY: 'Từ ngày hiệu lực',
  DEN_NGAY: 'Đến ngày hiệu lực',
  MA_CSKCB: 'Mã CSKCB',
  HO_TEN: 'Họ và tên',
  GIOI_TINH: 'Giới tính',
  SO_DINH_DANH: 'Số CCCD/Định danh',
  CHUCDANH_NN: 'Chức danh nghề nghiệp',
  VI_TRI: 'Vị trí chuyên môn',
  MACCHN: 'Mã CCHN / GPHN',
  NGAYCAP_CCHN: 'Ngày cấp CCHN',
  NOICAP_CCHN: 'Nơi cấp CCHN',
  PHAMVI_CM: 'Phạm vi chuyên môn',
  PHAMVI_CMBS: 'Phạm vi CM bổ sung',
  DVKT_KHAC: 'DVKT khác thực hiện',
  VB_PHANCONG: 'Văn bản phân công',
  THOIGIAN_DK: 'Thời gian đăng ký',
  THOIGIAN_NGAY: 'TG làm việc/ngày',
  THOIGIAN_TUAN: 'TG làm việc/tuần',
  CSKCB_KHAC: 'CSKCB khác',
  CSKCB_CGKT: 'CSKCB chuyển giao KT',
  QD_CGKT: 'Quyết định CGKT',
  MA_THUOC: 'Mã thuốc/chế phẩm',
  TEN_HOAT_CHAT: 'Tên hoạt chất',
  TEN_THUOC: 'Tên thuốc/chế phẩm',
  DON_VI_TINH: 'Đơn vị tính',
  HAM_LUONG: 'Hàm lượng',
  DUONG_DUNG: 'Đường dùng',
  MA_DUONG_DUNG: 'Mã đường dùng',
  DANG_BAO_CHE: 'Dạng bào chế',
  SO_DANG_KY: 'Số đăng ký',
  SO_LUONG: 'Số lượng',
  DON_GIA: 'Đơn giá',
  DON_GIA_BH: 'Đơn giá BHYT',
  QUY_CACH: 'Quy cách đóng gói',
  NHA_SX: 'Nhà sản xuất',
  NUOC_SX: 'Nước sản xuất',
  NHA_THAU: 'Nhà thầu',
  TT_THAU: 'Thông tin thầu',
  TU_NGAY_HD: 'Từ ngày hợp đồng',
  DEN_NGAY_HD: 'Đến ngày hợp đồng',
  LOAI_THUOC: 'Loại thuốc',
  LOAI_THAU: 'Loại thầu',
  HT_THAU: 'Hình thức thầu',
  MA_DVKT: 'Mã DVKT',
  TCCL: 'Tiêu chuẩn chất lượng',
  BO_PHAN_VT: 'Bộ phận dùng (VT)',
  TEN_KHOA_HOC: 'Tên khoa học',
  NGUON_GOC: 'Nguồn gốc',
  PP_CHEBIEN: 'Phương pháp chế biến',
  MA_DL_NHAP: 'Mã dược liệu nhập',
  MA_DL_CB: 'Mã dược liệu chế biến',
  TLHH_CB: 'Tỷ lệ hư hao CB',
  TLHH_BQ: 'Tỷ lệ hư hao BQ',
  MA_CSKCB_THUOC: 'Mã CSKCB thuốc',
  MA_TBYT: 'Mã thiết bị y tế',
  TEN_TBYT: 'Tên thiết bị y tế',
  TEN_TB: 'Tên thiết bị',
  KY_HIEU: 'Ký hiệu (Model)',
  CONGTY_SX: 'Công ty sản xuất',
  NAM_SX: 'Năm sản xuất',
  NAM_SD: 'Năm sử dụng',
  MA_MAY: 'Mã máy',
  SO_LUU_HANH: 'Số lưu hành',
  HD_TU: 'Hợp đồng từ ngày',
  HD_DEN: 'Hợp đồng đến ngày',
  MA_DICH_VU: 'Mã dịch vụ KCB',
  TEN_DICH_VU: 'Tên dịch vụ KCB',
  TEN_DVKT_GIA: 'Tên DVKT theo giá',
  QUY_TRINH: 'Quy trình chuyên môn',
  SO_LUONG_CGKT: 'Số lượng CGKT',
  CSKCB_CLS: 'CSKCB thực hiện CLS',
  QD_DVKT: 'Quyết định DVKT',
  QD_PD_GIA: 'Quyết định phê duyệt giá',
  GHI_CHU: 'Ghi chú',
  GIA_THANH_TOAN: 'Giá thanh toán BHYT',
  THUOCPX_STT: 'STT thuốc phóng xạ',
  THUOCPX_MA_THUOC: 'Mã thuốc phóng xạ',
  THUOCPX_TEN_THUOC: 'Tên thuốc phóng xạ',
  THUOCPX_SO_DANG_KY: 'SĐK thuốc phóng xạ',
  THUOCPX_DON_VI_TINH: 'ĐVT thuốc phóng xạ',
  THUOCPX_TT_THAU: 'TT thầu thuốc PX',
  THUOCPX_DON_GIA_THUOC: 'Đơn giá thuốc PX',
  THUOCPX_DM_NSX_CDD: 'Định mức NSX',
  THUOCPX_DM_THUCTE_CDD: 'Định mức thực tế',
  THUOCPX_LIEU_BQ_PX: 'Liều bình quân PX',
  THUOCPX_TL_THUCTE_BQ_PX: 'Tỷ lệ thực tế/BQ PX',
  THUOCPX_THANH_TIEN_THUOC: 'Thành tiền thuốc PX',
  NGAY_SINH: 'Ngày sinh',
  MA_THE_BHYT: 'Mã thẻ BHYT',
  MA_BENH_CHINH: 'Mã bệnh chính',
  NGAY_VAO: 'Ngày vào viện',
  NGAY_VAO_NOI_TRU: 'Ngày vào nội trú',
  NGAY_RA: 'Ngày ra viện',
  SO_NGAY_DTRI: 'Số ngày điều trị',
  MA_LOAI_KCB: 'Mã loại KCB',
  T_TONGCHI_BV: 'Tổng chi phí BV',
  T_TONGCHI_BH: 'Tổng chi phí BHYT',
  T_BHTT: 'Quỹ BHYT thanh toán',
  T_BNCCT: 'BN cùng chi trả',
  T_BNTT: 'BN tự trả',
  T_NGUONKHAC: 'Nguồn khác',
  NAM_QT: 'Năm quyết toán',
  THANG_QT: 'Tháng quyết toán',
};

/** Độ rộng cân đối (px) cho từng cột để hiển thị đủ 20 cột C79/7980a, không dư cột tên và không khuất ký tự ngày/mã thẻ */
function getCompactTt12ColumnWidth(col: string): number {
  switch (col) {
    case 'STT':
      return 36;
    case 'GIOI_TINH':
      return 42;
    case 'THANG_QT':
      return 44;
    case 'NAM_QT':
      return 46;
    case 'SO_NGAY_DTRI':
    case 'MA_LOAI_KCB':
      return 48;
    case 'MA_CSKCB':
    case 'MA_KHOA':
    case 'KET_QUA_DTRI':
    case 'TINH_TRANG_RV':
      return 52;
    case 'T_NGUONKHAC':
      return 56;
    case 'MA_BENH_CHINH':
    case 'MA_BENH_KT':
    case 'T_BNCCT':
    case 'T_BNTT':
      return 62;
    case 'T_BHTT':
    case 'T_TONGCHI_BV':
    case 'T_TONGCHI_BH':
    case 'T_THUOC':
    case 'T_VTYT':
      return 70;
    case 'NGAY_SINH':
    case 'NGAY_VAO':
    case 'NGAY_VAO_NOI_TRU':
    case 'NGAY_RA':
    case 'TU_NGAY':
    case 'DEN_NGAY':
      return 96;
    case 'MA_THE_BHYT':
    case 'SO_DINH_DANH':
    case 'MA_LK':
    case 'MA_BN':
      return 124;
    case 'HO_TEN':
    case 'TEN_THUOC':
    case 'TEN_HOAT_CHAT':
    case 'TEN_DVKT':
    case 'TEN_KHOA':
    case 'DIA_CHI':
      return 165;
    default:
      return 80;
  }
}

export default function ChungTuTt12Module() {
  const [subTab, setSubTab] = useState<'XML_TT12_01BH' | 'PDF_02BH'>(() =>
    getSessionSync('tt12_sub_tab', 'XML_TT12_01BH')
  );
  const [showConfigModal, setShowConfigModal] = useState(false);

  // ============================================================================
  // STATE TAB 1: DANH MỤC TT12 (BẢNG 1-6) & BÁO CÁO MẪU 01/BH (C79 / 7980a)
  // ============================================================================
  const [selectedTableCode, setSelectedTableCode] = useState<string>(() =>
    getSessionSync('tt12_selected_table_code', 'BANG_1')
  );
  const currentConfig: TT12TableConfig = useMemo(
    () => TT12_CONFIGS.find(c => c.tableCode === selectedTableCode) || TT12_CONFIGS[0],
    [selectedTableCode]
  );

  // Lưu trữ dữ liệu đã import theo từng bảng trong phiên trình duyệt (giữ qua F5, tắt trình duyệt tự xóa)
  const [rowsByTable, setRowsByTable] = useState<Record<string, Record<string, string>[]>>(() =>
    getSessionSync('tt12_rows_by_table_v1', {})
  );
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const userModifiedTablesRef = useRef<Set<string>>(new Set());
  const [appendOnImport, setAppendOnImport] = useState<boolean>(false);

  const rows = useMemo(
    () => rowsByTable[selectedTableCode] || [],
    [rowsByTable, selectedTableCode]
  );

  // Tự động tính toán phương án chia file XML (tối đa 4.999 hồ sơ / 1 file XML)
  const plannedXmlParts = useMemo(() => {
    const total = rows.length;
    if (total === 0) return [];
    const maxPerFile = 4999;
    const totalParts = Math.ceil(total / maxPerFile);
    const parts: Array<{
      partIndex: number;
      totalParts: number;
      recordCount: number;
      startRow: number;
      endRow: number;
    }> = [];
    for (let i = 0; i < totalParts; i++) {
      const startRow = i * maxPerFile + 1;
      const endRow = Math.min((i + 1) * maxPerFile, total);
      parts.push({
        partIndex: i + 1,
        totalParts,
        recordCount: endRow - startRow + 1,
        startRow,
        endRow,
      });
    }
    return parts;
  }, [rows.length]);

  const setRows = (
    updater:
      | Record<string, string>[]
      | ((prev: Record<string, string>[]) => Record<string, string>[]),
    overrideTableCode?: string
  ) => {
    const targetCode = overrideTableCode || selectedTableCode;
    userModifiedTablesRef.current.add(targetCode);
    setRowsByTable(prevMap => {
      const prevRows = prevMap[targetCode] || [];
      const nextRows = typeof updater === 'function' ? updater(prevRows) : updater;
      return {
        ...prevMap,
        [targetCode]: nextRows,
      };
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const [statusMsg, setStatusMsg] = useState<string>('Sẵn sàng. Hãy chọn danh mục, tải mẫu trống hoặc nhập dữ liệu.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'loading'>('info');
  const [isBusy, setIsBusy] = useState(false);

  // Lưu danh sách các bộ file XML vừa xuất / ký số để người dùng có thể tải lại từng bộ bất kỳ lúc nào
  const [lastExportedChunks, setLastExportedChunks] = useState<
    Array<{
      partIndex: number;
      totalParts: number;
      recordCount: number;
      startRow: number;
      endRow: number;
      fileName: string;
      xmlContent: string;
      isSigned: boolean;
    }>
  >([]);

  // Xem trước XML đã tạo / đã ký (hỗ trợ nhiều bộ file khi > 4.999 hồ sơ)
  const [previewXmlModal, setPreviewXmlModal] = useState<{
    title: string;
    fileName: string;
    xmlContent: string;
    isSigned: boolean;
    chunks?: Array<{
      partIndex: number;
      totalParts: number;
      recordCount: number;
      startRow: number;
      endRow: number;
      fileName: string;
      xmlContent: string;
      isSigned: boolean;
    }>;
    activePartIndex?: number;
  } | null>(null);

  // ============================================================================
  // STATE TAB 2: KÝ SỐ PDF (MẪU 02/BH) & IMPORT ẢNH CHỮ KÝ TAY
  // ============================================================================
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfSignedCount, setPdfSignedCount] = useState<number>(0);
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [pdfPageInfo, setPdfPageInfo] = useState<PdfPageInfo | null>(null);
  const [pdfStatusMsg, setPdfStatusMsg] = useState<string>(
    'Chưa chọn file PDF. Bạn có thể bấm "Mở Biểu Mẫu Trống 02/BH.pdf" hoặc chọn file PDF từ máy tính.'
  );
  const [pdfStatusType, setPdfStatusType] = useState<'info' | 'success' | 'error' | 'loading'>('info');
  const [isPdfBusy, setIsPdfBusy] = useState(false);

  // Danh sách 4 ô lưu trữ ảnh chữ ký tay + ghi chú + tên người ký dưới ảnh
  const [sigSlots, setSigSlots] = useState<SignatureSlot[]>(() => getSavedSignatureSlots());
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(() => getActiveSignatureSlotIndex());
  const [autoRemoveBgOnUpload, setAutoRemoveBgOnUpload] = useState<boolean>(true);
  const [bgStrength, setBgStrength] = useState<number>(45);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');
  const [lastCertDisplay, setLastCertDisplay] = useState<{ signerName: string; orgName: string } | null>(null);
  const [smartCaProfiles, setSmartCaProfiles] = useState<SmartCAProfile[]>(() => getSmartCAProfiles());
  const [activeSmartCaId, setActiveSmartCaId] = useState<string>(() => getActiveSmartCAProfileId());
  const rawSlotImagesRef = useRef<Record<number, string>>({});

  useEffect(() => {
    const syncSmartCaProfiles = () => {
      setSmartCaProfiles(getSmartCAProfiles());
      setActiveSmartCaId(getActiveSmartCAProfileId());
      setLastCertDisplay(null);
    };
    window.addEventListener('smartca-profiles-changed', syncSmartCaProfiles);
    return () => window.removeEventListener('smartca-profiles-changed', syncSmartCaProfiles);
  }, []);

  const handleSelectSmartCaProfile = (profileId: string) => {
    const activated = setActiveSmartCAProfile(profileId);
    setActiveSmartCaId(profileId);
    setLastCertDisplay(null);
    if (activated) {
      setPdfStatusMsg(`🔄 Đã chọn CKS SmartCA: "${activated.name}" (${activated.userId || 'chưa có User ID'})`);
      setPdfStatusType('info');
    }
  };

  const activeSlot = sigSlots[activeSlotIdx] || sigSlots[0];

  const updateActiveSlot = (patch: Partial<SignatureSlot>) => {
    setSigSlots(prev => {
      const next = prev.map((s, idx) => (idx === activeSlotIdx ? { ...s, ...patch } : s));
      saveSignatureSlots(next);
      return next;
    });
  };

  const handleSelectSigSlot = (idx: number) => {
    setActiveSlotIdx(idx);
    saveActiveSignatureSlotIndex(idx);
  };

  // Tọa độ tương đối của khung chữ ký trên trang PDF (0..1)
  const [sigBox, setSigBox] = useState<PdfRelativeBox>(() =>
    getSessionSync('tt12_pdf_sig_box', {
      relX: 0.65,
      relY: 0.62,
      relW: 0.24,
      relH: 0.14,
    })
  );
  const [sigScalePercent, setSigScalePercent] = useState<number>(() =>
    getSessionSync('tt12_pdf_sig_scale', 100)
  );

  // Khôi phục dữ liệu từ IndexedDB khi bấm F5 (nếu dữ liệu lớn vượt quá sessionStorage)
  useEffect(() => {
    let mounted = true;
    Promise.all([
      getSessionCache<Record<string, Record<string, string>[]>>('tt12_rows_by_table_v1'),
      getSessionCache<{
        pdfBytes: Uint8Array;
        pdfFileName: string;
        pdfSignedCount: number;
        pdfPageNumber: number;
      }>('tt12_pdf_state_v1'),
    ])
      .then(([cachedRowsMap, cachedPdf]) => {
        if (!mounted) return;
        if (cachedRowsMap && typeof cachedRowsMap === 'object') {
          setRowsByTable(prev => {
            const merged: Record<string, Record<string, string>[]> = {
              ...prev,
              ...cachedRowsMap,
            };
            // Giữ nguyên các bảng mà người dùng vừa thao tác/import trong lần mount hiện tại
            for (const modifiedKey of userModifiedTablesRef.current) {
              if (prev[modifiedKey]) {
                merged[modifiedKey] = prev[modifiedKey];
              }
            }
            return merged;
          });
        }
        if (cachedPdf && cachedPdf.pdfBytes) {
          const bytes =
            cachedPdf.pdfBytes instanceof Uint8Array
              ? cachedPdf.pdfBytes
              : new Uint8Array(Object.values(cachedPdf.pdfBytes as any));
          if (bytes.length > 0) {
            setPdfBytes(bytes);
            setPdfFileName(cachedPdf.pdfFileName || 'MAU_02BH.pdf');
            setPdfSignedCount(cachedPdf.pdfSignedCount || 0);
            setPdfPageNumber(cachedPdf.pdfPageNumber || 1);
          }
        }
      })
      .finally(() => {
        if (mounted) setCacheHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSessionSync('tt12_sub_tab', subTab);
  }, [subTab]);

  useEffect(() => {
    setSessionSync('tt12_selected_table_code', selectedTableCode);
  }, [selectedTableCode]);

  useEffect(() => {
    if (!cacheHydrated) return;
    setSessionCache('tt12_rows_by_table_v1', rowsByTable).catch(() => {});
  }, [cacheHydrated, rowsByTable]);

  useEffect(() => {
    if (!cacheHydrated || !pdfBytes) return;
    setSessionCache('tt12_pdf_state_v1', {
      pdfBytes,
      pdfFileName,
      pdfSignedCount,
      pdfPageNumber,
    }).catch(() => {});
  }, [cacheHydrated, pdfBytes, pdfFileName, pdfSignedCount, pdfPageNumber]);

  useEffect(() => {
    setSessionSync('tt12_pdf_sig_box', sigBox);
    setSessionSync('tt12_pdf_sig_scale', sigScalePercent);
  }, [sigBox, sigScalePercent]);

  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfWrapperRef = useRef<HTMLDivElement | null>(null);
  const pdfScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize' | null;
    startX: number;
    startY: number;
    initBox: PdfRelativeBox;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    initBox: { relX: 0.65, relY: 0.62, relW: 0.24, relH: 0.14 },
  });

  // Đổi bảng (vẫn giữ dữ liệu đã import của từng bảng trong phiên làm việc)
  const handleSelectTable = (code: string) => {
    setSelectedTableCode(code);
    setSearchQuery('');
    setColumnFilters({});
    setCurrentPage(1);
    const cfg = TT12_CONFIGS.find(c => c.tableCode === code);
    const existingCount = (rowsByTable[code] || []).length;
    if (existingCount > 0) {
      setStatusMsg(`Đang hiển thị ${existingCount.toLocaleString()} dòng đã nạp của ${cfg?.tableName}.`);
      setStatusType('success');
    } else {
      setStatusMsg(`Đã chọn: ${cfg?.tableName}. Vui lòng Tải Excel Mẫu Trống, Nhập Excel hoặc Import XML.`);
      setStatusType('info');
    }
  };

  // Tự động tạo bản xem trước con dấu chữ ký (ảnh chữ ký tay bên trái + tên người ký dưới ảnh + thông tin CKS bên phải)
  useEffect(() => {
    let cancelled = false;
    const cfg = getSmartCAConfig();
    const subject = cfg.subjectDN || DEFAULT_VNPT_SUBJECT;
    const certB64 = cfg.certificateBase64 || DEFAULT_VNPT_CERT;
    const { signerName, orgName } = lastCertDisplay || extractCertDisplayInfo(subject, undefined, certB64);

    createCompositeSignatureStamp({
      signerName,
      orgName,
      signatureImageBase64: activeSlot?.imageDataUrl || '',
      signerDisplayText: activeSlot?.signerText || '',
      removeBackground: activeSlot?.bgRemoved ? false : true,
    })
      .then(res => {
        if (!cancelled) setStampPreviewUrl(res.dataUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    activeSlot?.imageDataUrl,
    activeSlot?.signerText,
    activeSlot?.bgRemoved,
    showConfigModal,
    lastCertDisplay,
    activeSmartCaId,
  ]);

  // Render trang PDF lên Canvas mỗi khi pdfBytes hoặc pdfPageNumber thay đổi
  useEffect(() => {
    if (subTab !== 'PDF_02BH' || !pdfBytes || !pdfCanvasRef.current) return;
    let cancelled = false;
    const savedScrollTop = pdfScrollContainerRef.current?.scrollTop ?? 0;
    const savedScrollLeft = pdfScrollContainerRef.current?.scrollLeft ?? 0;

    renderPdfPageToCanvas(pdfBytes, pdfPageNumber, pdfCanvasRef.current, 1.5)
      .then(info => {
        if (!cancelled) {
          setPdfPageInfo(info);
          if (pdfScrollContainerRef.current) {
            pdfScrollContainerRef.current.scrollTop = savedScrollTop;
            pdfScrollContainerRef.current.scrollLeft = savedScrollLeft;
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          setPdfStatusMsg(`Lỗi hiển thị PDF: ${err.message}`);
          setPdfStatusType('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [subTab, pdfBytes, pdfPageNumber]);

  // Tự động nạp Mẫu 02/BH.pdf lần đầu khi mở sang tab PDF_02BH nếu chưa có file trong cache
  useEffect(() => {
    if (cacheHydrated && subTab === 'PDF_02BH' && !pdfBytes) {
      handleLoadSamplePdf02BH();
    }
  }, [cacheHydrated, subTab, pdfBytes]);

  // ============================================================================
  // CÁC HÀM XỬ LÝ TAB 1 (EXCEL / XML TT12 & MẪU 01/BH)
  // ============================================================================

  const handleDownloadExcelTemplate = () => {
    downloadBlankTt12ExcelTemplate(currentConfig);
    setStatusMsg(
      `✅ Đã tải biểu mẫu Excel trống (${currentConfig.templateFileName}) chỉ gồm dòng tiêu đề cột chuẩn quy định!`
    );
    setStatusType('success');
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (fileList.length === 0) return;

    setIsBusy(true);
    setStatusType('loading');
    setStatusMsg(
      `⏳ Đang đọc và tự động chuẩn hóa vị trí các cột từ ${fileList.length} file Excel (${fileList.map(f => f.name).join(', ')})...`
    );

    try {
      // Nhường 1 nhịp frame để UI kịp hiển thị trạng thái loading đối với file lớn (5.000 - 50.000 dòng)
      await new Promise(resolve => setTimeout(resolve, 30));

      let effectiveCfg = currentConfig;
      let autoSwitched = false;
      let reordered = false;
      const renamedSet = new Set<string>();
      const collectedRows: Record<string, string>[] = [];

      for (const file of fileList) {
        const buf = await file.arrayBuffer();
        const meta = parseTt12ExcelBufferWithMeta(buf, effectiveCfg);
        if (meta.autoSwitchedTable) {
          effectiveCfg = meta.effectiveConfig;
          autoSwitched = true;
        }
        if (meta.reorderedColumns) reordered = true;
        for (const col of meta.renamedColumns) renamedSet.add(col);
        for (let i = 0; i < meta.rows.length; i++) {
          collectedRows.push(meta.rows[i]);
        }
      }

      if (autoSwitched) {
        setSelectedTableCode(effectiveCfg.tableCode);
      }

      const existingRows = appendOnImport ? rowsByTable[effectiveCfg.tableCode] || [] : [];
      const finalRows =
        existingRows.length > 0
          ? [...existingRows, ...collectedRows].map((row, idx) => ({
              ...row,
              STT: String(idx + 1),
            }))
          : collectedRows.map((row, idx) => ({
              ...row,
              STT: String(idx + 1),
            }));

      setRows(finalRows, effectiveCfg.tableCode);
      setLastExportedChunks([]);
      setCurrentPage(1);

      const totalXmlFiles = Math.ceil(finalRows.length / 4999);
      const splitInfo =
        totalXmlFiles > 1
          ? ` • Tự động chia thành ${totalXmlFiles} bộ file XML (tối đa 4.999 HS/file: ${Array.from(
              { length: totalXmlFiles },
              (_, idx) => {
                const s = idx * 4999 + 1;
                const eRow = Math.min((idx + 1) * 4999, finalRows.length);
                return `Bộ ${idx + 1}: ${(eRow - s + 1).toLocaleString()} HS`;
              }
            ).join(', ')})`
          : '';

      const notes: string[] = [];
      if (autoSwitched) {
        notes.push(`tự động nhận diện đúng biểu mẫu "${effectiveCfg.tableName}"`);
      }
      if (reordered) {
        notes.push(
          `tự động điều chỉnh & sắp xếp lại vị trí ${effectiveCfg.targetXmlColumns.length} cột về đúng quy định`
        );
      }
      if (renamedSet.size > 0) {
        notes.push(`chuẩn hóa tên cột (${Array.from(renamedSet).slice(0, 4).join(', ')})`);
      }

      const detailNote = notes.length > 0 ? ` — Đã ${notes.join(', ')}!` : '';
      setStatusMsg(
        `✅ Đã nhập thành công ${collectedRows.length.toLocaleString()} hồ sơ từ ${fileList.length} file Excel (Tổng danh sách: ${finalRows.length.toLocaleString()} hồ sơ - ${effectiveCfg.tableName})${splitInfo}${detailNote}`
      );
      setStatusType('success');
    } catch (err: any) {
      setStatusMsg(`❌ ${err.message}`);
      setStatusType('error');
      alert(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportXmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (fileList.length === 0) return;

    setIsBusy(true);
    setStatusType('loading');
    setStatusMsg(
      `⏳ Đang đọc và tự động chuẩn hóa cấu trúc từ ${fileList.length} file XML (${fileList.map(f => f.name).join(', ')})...`
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 30));

      let effectiveCfg = currentConfig;
      let autoSwitched = false;
      let reordered = false;
      const collectedRows: Record<string, string>[] = [];

      for (const file of fileList) {
        const text = await file.text();
        const meta = parseTt12XmlTextWithMeta(text, effectiveCfg);
        if (meta.autoSwitchedTable) {
          effectiveCfg = meta.effectiveConfig;
          autoSwitched = true;
        }
        if (meta.reorderedColumns) reordered = true;
        for (let i = 0; i < meta.rows.length; i++) {
          collectedRows.push(meta.rows[i]);
        }
      }

      if (autoSwitched) {
        setSelectedTableCode(effectiveCfg.tableCode);
      }

      const existingRows = appendOnImport ? rowsByTable[effectiveCfg.tableCode] || [] : [];
      const finalRows =
        existingRows.length > 0
          ? [...existingRows, ...collectedRows].map((row, idx) => ({
              ...row,
              STT: String(idx + 1),
            }))
          : collectedRows.map((row, idx) => ({
              ...row,
              STT: String(idx + 1),
            }));

      setRows(finalRows, effectiveCfg.tableCode);
      setLastExportedChunks([]);
      setCurrentPage(1);

      const totalXmlFiles = Math.ceil(finalRows.length / 4999);
      const splitInfo =
        totalXmlFiles > 1
          ? ` • Tự động chia thành ${totalXmlFiles} bộ file XML (tối đa 4.999 HS/file: ${Array.from(
              { length: totalXmlFiles },
              (_, idx) => {
                const s = idx * 4999 + 1;
                const eRow = Math.min((idx + 1) * 4999, finalRows.length);
                return `Bộ ${idx + 1}: ${(eRow - s + 1).toLocaleString()} HS`;
              }
            ).join(', ')})`
          : '';

      const notes: string[] = [];
      if (autoSwitched) {
        notes.push(`tự động chuyển sang biểu mẫu "${effectiveCfg.tableName}"`);
      }
      if (reordered) {
        notes.push(
          `tự động điều chỉnh & sắp xếp lại đủ ${effectiveCfg.targetXmlColumns.length} cột theo đúng quy định`
        );
      }

      const detailNote = notes.length > 0 ? ` (${notes.join('; ')})` : '';
      setStatusMsg(
        `✅ Đã Import thành công ${collectedRows.length.toLocaleString()} hồ sơ từ ${fileList.length} file XML (Tổng danh sách: ${finalRows.length.toLocaleString()} hồ sơ - ${effectiveCfg.tableName})${splitInfo}${detailNote}.`
      );
      setStatusType('success');
    } catch (err: any) {
      setStatusMsg(`❌ Lỗi đọc file XML: ${err.message}`);
      setStatusType('error');
      alert(`Lỗi khi đọc file XML: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const triggerDownloadXml = (xmlContent: string, fileName: string) => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const triggerDownloadAllChunks = async (
    chunkItems: Array<{ fileName: string; xmlContent: string }>
  ) => {
    for (let i = 0; i < chunkItems.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 450));
      }
      triggerDownloadXml(chunkItems[i].xmlContent, chunkItems[i].fileName);
    }
  };

  const handleProcessXmlAction = async (
    signAction: boolean,
    signMethod: 'SMARTCA' | 'USB_TOKEN' = 'SMARTCA'
  ) => {
    if (rows.length === 0) {
      alert('Chưa có dữ liệu! Vui lòng Nhập Excel hoặc Import XML trước.');
      return;
    }

    setIsBusy(true);
    setStatusType('loading');

    try {
      await new Promise(resolve => setTimeout(resolve, 25));
      // Tự động chia thành các bộ <= 4999 hồ sơ / 1 file XML (kể cả ký số hay không ký số)
      const chunks: Tt12XmlChunk[] = buildTt12XmlChunks(rows, currentConfig, 4999);
      const processedChunks: Array<{
        partIndex: number;
        totalParts: number;
        recordCount: number;
        startRow: number;
        endRow: number;
        fileName: string;
        xmlContent: string;
        isSigned: boolean;
      }> = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!signAction) {
          setStatusMsg(
            `⏳ Đang xuất bộ file XML ${chunk.partIndex}/${chunk.totalParts} (${chunk.recordCount.toLocaleString()} hồ sơ: dòng ${chunk.startRow.toLocaleString()} → ${chunk.endRow.toLocaleString()})...`
          );
          if (i > 0) {
            // Giãn cách 450ms giữa các lần tải file để trình duyệt Chrome/Edge không chặn tải nhiều file cùng lúc
            await new Promise(resolve => setTimeout(resolve, 450));
          }
          triggerDownloadXml(chunk.xmlContent, chunk.suggestedFileName);
          processedChunks.push({
            partIndex: chunk.partIndex,
            totalParts: chunk.totalParts,
            recordCount: chunk.recordCount,
            startRow: chunk.startRow,
            endRow: chunk.endRow,
            fileName: chunk.suggestedFileName,
            xmlContent: chunk.xmlContent,
            isSigned: false,
          });
        } else {
          setStatusMsg(
            `🔐 Đang ký số XML (${signMethod === 'SMARTCA' ? 'VNPT SmartCA' : 'USB Token'}) bộ ${chunk.partIndex}/${chunk.totalParts} (${chunk.recordCount.toLocaleString()} hồ sơ: dòng ${chunk.startRow.toLocaleString()} → ${chunk.endRow.toLocaleString()})...`
          );
          const signRes = await signTt12XmlString(chunk.xmlContent, signMethod, msg => {
            setStatusMsg(
              `[Bộ ${chunk.partIndex}/${chunk.totalParts} • ${chunk.recordCount.toLocaleString()} HS] ${msg}`
            );
          });
          const signedFileName = chunk.suggestedFileName.replace(/\.xml$/i, '_Signed.xml');
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 450));
          }
          triggerDownloadXml(signRes.signedXml, signedFileName);
          processedChunks.push({
            partIndex: chunk.partIndex,
            totalParts: chunk.totalParts,
            recordCount: chunk.recordCount,
            startRow: chunk.startRow,
            endRow: chunk.endRow,
            fileName: signedFileName,
            xmlContent: signRes.signedXml,
            isSigned: true,
          });
        }
      }

      setLastExportedChunks(processedChunks);

      const partsSummary =
        processedChunks.length > 1
          ? ` (${processedChunks
              .map(
                c =>
                  `Bộ ${c.partIndex}: ${c.recordCount.toLocaleString()} HS [${c.startRow.toLocaleString()}-${c.endRow.toLocaleString()}]`
              )
              .join(' | ')})`
          : '';

      const successText = signAction
        ? `✅ Đã Ký số & Xuất thành công ${processedChunks.length} bộ file XML (Tổng ${rows.length.toLocaleString()} hồ sơ)${partsSummary}!`
        : `✅ Đã Xuất thành công ${processedChunks.length} bộ file XML (Tổng ${rows.length.toLocaleString()} hồ sơ)${partsSummary}!`;
      setStatusMsg(successText);
      setStatusType('success');

      if (processedChunks.length > 0) {
        const firstChunk = processedChunks[0];
        setPreviewXmlModal({
          title: signAction
            ? `XML ĐÃ KÝ SỐ (${signMethod === 'SMARTCA' ? 'VNPT SMARTCA' : 'USB TOKEN'}) — ${processedChunks.length} BỘ FILE (${rows.length.toLocaleString()} HỒ SƠ)`
            : `XEM TRƯỚC MÃ NGUỒN XML CHUẨN TT12 / 01BH — ${processedChunks.length} BỘ FILE (${rows.length.toLocaleString()} HỒ SƠ)`,
          fileName: firstChunk.fileName,
          xmlContent: firstChunk.xmlContent,
          isSigned: signAction,
          chunks: processedChunks,
          activePartIndex: 1,
        });
      }
    } catch (err: any) {
      setStatusMsg(`❌ Lỗi xử lý XML: ${err.message}`);
      setStatusType('error');
      alert(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    for (const col of currentConfig.targetXmlColumns) {
      newRow[col] = '';
    }
    newRow.STT = String(rows.length + 1);
    const updated = [...rows, normalizeAndEnrichRow(newRow, currentConfig, rows.length + 1)];
    setRows(updated);
    setLastExportedChunks([]);
    setCurrentPage(Math.ceil(updated.length / pageSize));
  };

  const handleDeleteRow = (globalIdx: number) => {
    const next = rows.filter((_, i) => i !== globalIdx).map((r, i) => ({
      ...r,
      STT: String(i + 1),
    }));
    setRows(next);
    setLastExportedChunks([]);
  };

  const handleCellEdit = (globalIdx: number, colName: string, val: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[globalIdx] = {
        ...copy[globalIdx],
        [colName]: val,
      };
      return copy;
    });
    setLastExportedChunks([]);
  };

  // Tùy chỉnh kéo rộng / thu hẹp độ rộng từng cột bằng chuột
  const [customColWidths, setCustomColWidths] = useState<Record<string, number>>({});

  const getEffectiveTt12ColWidth = (col: string): number => {
    const key = `${selectedTableCode}:${col}`;
    return customColWidths[key] ?? getCompactTt12ColumnWidth(col);
  };

  const startResizeTt12Col = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `${selectedTableCode}:${col}`;
    const startX = e.clientX;
    const startWidth = getEffectiveTt12ColWidth(col);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(28, Math.round(startWidth + delta));
      setCustomColWidths(prev => ({ ...prev, [key]: nextWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleExpandTt12Col = (col: string) => {
    const key = `${selectedTableCode}:${col}`;
    const defW = getCompactTt12ColumnWidth(col);
    setCustomColWidths(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = Math.max(defW + 90, 210);
      return next;
    });
  };

  const activeColFilterEntries = useMemo(
    () =>
      Object.entries(columnFilters as Record<string, string>)
        .map(([k, v]) => [k, v.trim().toLowerCase()] as const)
        .filter(([, v]) => v.length > 0),
    [columnFilters]
  );

  const filteredRowsWithIndex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .map((row, idx) => ({ row, globalIdx: idx }))
      .filter(({ row }) => {
        if (q) {
          const matchesGlobal = Object.values(row).some(v =>
            String(v ?? '').toLowerCase().includes(q)
          );
          if (!matchesGlobal) return false;
        }
        for (const [colKey, colQuery] of activeColFilterEntries) {
          const cellVal = String(row[colKey] ?? '').toLowerCase();
          if (!cellVal.includes(colQuery)) return false;
        }
        return true;
      });
  }, [rows, searchQuery, activeColFilterEntries]);

  const totalPages = Math.max(1, Math.ceil(filteredRowsWithIndex.length / pageSize));
  const paginatedRows = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredRowsWithIndex.slice(start, start + pageSize);
  }, [filteredRowsWithIndex, currentPage, totalPages]);

  // ============================================================================
  // CÁC HÀM XỬ LÝ TAB 2 (KÝ SỐ PDF MẪU 02/BH & ẢNH CHỮ KÝ TAY)
  // ============================================================================

  const handleLoadSamplePdf02BH = async () => {
    setIsPdfBusy(true);
    setPdfStatusType('loading');
    setPdfStatusMsg('⏳ Đang tải biểu mẫu MAU_02BH.pdf...');
    try {
      const res = await fetch('/templates/tt12/MAU_02BH.pdf');
      if (!res.ok) throw new Error('Không tải được file mẫu MAU_02BH.pdf');
      const buf = await res.arrayBuffer();
      setPdfBytes(new Uint8Array(buf));
      setPdfFileName('MAU_02BH.pdf');
      setPdfSignedCount(0);
      setPdfPageNumber(1);
      // Đặt sẵn ô chữ ký vào vị trí Thủ trưởng đơn vị trên Mẫu 02/BH
      setSigBox({ relX: 0.65, relY: 0.62, relW: 0.24, relH: 0.14 });
      setSigScalePercent(100);
      setPdfStatusMsg(
        '✅ Đã nạp Mẫu 02/BH.pdf! Hãy kéo khung màu đỏ tới vị trí cần ký (Người lập biểu / Kế toán trưởng / Thủ trưởng đơn vị) rồi bấm Ký số.'
      );
      setPdfStatusType('success');
    } catch (err: any) {
      setPdfStatusMsg(`❌ Lỗi tải Mẫu 02/BH.pdf: ${err.message}`);
      setPdfStatusType('error');
    } finally {
      setIsPdfBusy(false);
    }
  };

  const handleSelectLocalPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsPdfBusy(true);
    setPdfStatusType('loading');
    setPdfStatusMsg(`⏳ Đang mở file PDF "${file.name}"...`);
    try {
      const buf = await file.arrayBuffer();
      setPdfBytes(new Uint8Array(buf));
      setPdfFileName(file.name);
      setPdfSignedCount(0);
      setPdfPageNumber(1);
      setPdfStatusMsg(
        `✅ Đã mở "${file.name}". Kéo khung chữ ký màu đỏ vào vị trí mong muốn và chọn phương thức ký số.`
      );
      setPdfStatusType('success');
    } catch (err: any) {
      setPdfStatusMsg(`❌ Không đọc được file PDF: ${err.message}`);
      setPdfStatusType('error');
    } finally {
      setIsPdfBusy(false);
    }
  };

  const handleUploadSignatureImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh chữ ký có dung lượng nhỏ hơn 5MB!');
      return;
    }
    const isJpgOrBmp = /\.(jpe?g|bmp)$/i.test(file.name) || file.type === 'image/jpeg' || file.type === 'image/bmp';
    const reader = new FileReader();
    reader.onload = async ev => {
      const rawDataUrl = String(ev.target?.result || '');
      if (!rawDataUrl) return;
      rawSlotImagesRef.current[activeSlotIdx] = rawDataUrl;
      setIsRemovingBg(true);
      try {
        if (autoRemoveBgOnUpload || isJpgOrBmp) {
          const pngUrl = await removeImageBackgroundToPng(rawDataUrl, bgStrength);
          updateActiveSlot({ imageDataUrl: pngUrl, bgRemoved: true });
          setPdfStatusMsg(
            isJpgOrBmp
              ? `✅ Đã chuyển ảnh "${file.name}" (JPG/BMP) sang PNG xóa nền trong suốt và lưu vào Ô chữ ký #${activeSlotIdx + 1} (${activeSlot?.label || ''})!`
              : `✅ Đã xóa nền & lưu ảnh chữ ký vào Ô #${activeSlotIdx + 1} (${activeSlot?.label || ''})!`
          );
        } else {
          const pngUrl = await normalizeSignatureImageToPng(rawDataUrl);
          updateActiveSlot({ imageDataUrl: pngUrl, bgRemoved: false });
          setPdfStatusMsg(`✅ Đã lưu ảnh chữ ký (giữ nền gốc) vào Ô #${activeSlotIdx + 1} (${activeSlot?.label || ''}).`);
        }
        setPdfStatusType('success');
      } catch (err: any) {
        setPdfStatusMsg(`❌ Không xử lý được ảnh chữ ký: ${err?.message || err}`);
        setPdfStatusType('error');
      } finally {
        setIsRemovingBg(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyBgRemovalWithStrength = async (strengthVal: number) => {
    const sourceImg = rawSlotImagesRef.current[activeSlotIdx] || activeSlot?.imageDataUrl;
    if (!sourceImg) return;
    setIsRemovingBg(true);
    try {
      const pngUrl = await removeImageBackgroundToPng(sourceImg, strengthVal);
      updateActiveSlot({ imageDataUrl: pngUrl, bgRemoved: true });
      setPdfStatusMsg(
        `✨ Đã xóa nền trắng/xám (độ mạnh ${strengthVal}) và chuyển Ô #${activeSlotIdx + 1} sang PNG trong suốt!`
      );
      setPdfStatusType('success');
    } catch (err: any) {
      setPdfStatusMsg(`❌ Lỗi khi xóa nền ảnh: ${err?.message || err}`);
      setPdfStatusType('error');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleRemoveBgActiveSlot = () => {
    void applyBgRemovalWithStrength(bgStrength);
  };

  const handleDownloadActiveSlotPng = () => {
    if (!activeSlot?.imageDataUrl) return;
    const slug = (activeSlot.label || `chu_ky_${activeSlotIdx + 1}`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    const a = document.createElement('a');
    a.href = activeSlot.imageDataUrl;
    a.download = `chu_ky_${activeSlotIdx + 1}_${slug || 'png'}.png`;
    a.click();
  };

  const handleScaleSliderChange = (newScale: number) => {
    const ratio = newScale / sigScalePercent;
    setSigScalePercent(newScale);
    setSigBox(prev => {
      const newW = Math.max(0.08, Math.min(0.6, prev.relW * ratio));
      const newH = Math.max(0.05, Math.min(0.45, prev.relH * ratio));
      const clampedX = Math.max(0, Math.min(1 - newW, prev.relX));
      const clampedY = Math.max(0, Math.min(1 - newH, prev.relY));
      return { relX: clampedX, relY: clampedY, relW: newW, relH: newH };
    });
  };

  // Kéo thả & Thay đổi kích thước khung chữ ký trên trang PDF
  const handleStartDragSigBox = (
    e: React.MouseEvent,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pdfWrapperRef.current) return;

    dragStateRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initBox: { ...sigBox },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state.mode || !pdfWrapperRef.current) return;
      const rect = pdfWrapperRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = (moveEvent.clientX - state.startX) / rect.width;
      const dy = (moveEvent.clientY - state.startY) / rect.height;

      if (state.mode === 'move') {
        const nextX = Math.max(0, Math.min(1 - state.initBox.relW, state.initBox.relX + dx));
        const nextY = Math.max(0, Math.min(1 - state.initBox.relH, state.initBox.relY + dy));
        setSigBox({
          ...state.initBox,
          relX: nextX,
          relY: nextY,
        });
      } else if (state.mode === 'resize') {
        const nextW = Math.max(0.08, Math.min(1 - state.initBox.relX, state.initBox.relW + dx));
        const nextH = Math.max(0.05, Math.min(1 - state.initBox.relY, state.initBox.relH + dy));
        setSigBox({
          ...state.initBox,
          relW: nextW,
          relH: nextH,
        });
      }
    };

    const handleMouseUp = () => {
      dragStateRef.current.mode = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSignPdf = async (method: 'SMARTCA' | 'USB_TOKEN') => {
    if (!pdfBytes) {
      alert('Vui lòng chọn file PDF hoặc nạp Mẫu 02/BH.pdf trước khi ký số!');
      return;
    }

    setIsPdfBusy(true);
    setPdfStatusType('loading');
    setPdfStatusMsg(
      `🔐 Đang khởi tạo ký số PDF bằng ${method === 'SMARTCA' ? 'VNPT SmartCA' : 'USB Token'}...`
    );

    try {
      const res = await signPdfDocument({
        pdfBytes,
        pageNumber: pdfPageNumber,
        box: sigBox,
        method,
        signatureImageBase64: activeSlot?.imageDataUrl || '',
        signerDisplayText: activeSlot?.signerText || '',
        removeBackground: activeSlot?.bgRemoved ? false : true,
        onProgress: msg => setPdfStatusMsg(msg),
      });

      const nextCount = pdfSignedCount + 1;
      setPdfBytes(res.signedPdfBytes);
      setPdfSignedCount(nextCount);
      setLastCertDisplay({ signerName: res.signerName, orgName: res.orgName });

      // Tự động dịch nhẹ khung chữ ký để nếu người dùng muốn ký tiếp chữ ký thứ 2, 3 thì không bị đè lên nhau
      setSigBox(prev => ({
        ...prev,
        relX: Math.max(0.05, prev.relX - 0.28),
      }));

      setPdfStatusMsg(
        `🎉 Đã ký số PDF thành công (Chữ ký lần #${nextCount} — ${res.signerName})! Bạn có thể kéo khung đỏ sang vị trí khác để ký thêm chữ ký tiếp theo, hoặc bấm "XUẤT PDF ĐÃ KÝ" để tải về.`
      );
      setPdfStatusType('success');
    } catch (err: any) {
      setPdfStatusMsg(`❌ Lỗi ký số PDF: ${err.message}`);
      setPdfStatusType('error');
      alert(err.message);
    } finally {
      setIsPdfBusy(false);
    }
  };

  const handlePreviewCurrentPdf = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownloadSignedPdf = () => {
    if (!pdfBytes) return;
    const baseName = (pdfFileName || 'MAU_02BH.pdf').replace(/(_signed)?\.pdf$/i, '');
    const outName = pdfSignedCount > 0 ? `${baseName}_signed.pdf` : `${baseName}.pdf`;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setPdfStatusMsg(`💾 Đã xuất file PDF: ${outName}`);
    setPdfStatusType('success');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
      {/* HEADER MODULE THU GỌN TRÊN 1 DÒNG */}
      <div className="shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl px-3 py-1.5 text-white shadow-sm border border-blue-700/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
          </div>
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
            CHỨNG TỪ TT12 BHXH - BH01 - BH02
          </h1>
          <span className="hidden md:inline-block bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
            CHUẨN TT12 &amp; BHXH 2026
          </span>
        </div>

        {/* Chuyển đổi 2 Tab lớn & Nút Cấu hình Ký số */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('XML_TT12_01BH')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer border',
              subTab === 'XML_TT12_01BH'
                ? 'bg-white text-blue-950 border-white shadow-xs'
                : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
            )}
          >
            <FileCode2 className="w-3.5 h-3.5 text-blue-600" />
            1. DANH MỤC TT12 &amp; MẪU 01/BH (XML)
          </button>

          <button
            type="button"
            onClick={() => setSubTab('PDF_02BH')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer border',
              subTab === 'PDF_02BH'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-white/10 text-amber-200 border-white/20 hover:bg-white/20'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            2. KÝ SỐ PDF (MẪU 02/BH)
          </button>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 flex items-center gap-1 shadow-xs transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            ⚙ Cấu hình CKS
          </button>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* TAB 1: DANH MỤC TT12 (BẢNG 1–6) & BÁO CÁO MẪU 01/BH (C79 / 7980a)          */}
      {/* ========================================================================== */}
      {subTab === 'XML_TT12_01BH' && (
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
          {/* KHỐI CÔNG CỤ THU GỌN TỐI ĐA ĐỂ DÀNH KHÔNG GIAN CHO BẢNG DANH SÁCH */}
          <div className="shrink-0 bg-white rounded-xl px-2.5 py-1.5 border border-slate-200 shadow-2xs space-y-1.5">
            {/* Dòng 1: Chọn nhanh 8 biểu mẫu TT12 & 01/BH trên 1 hàng gọn */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10.5px] font-black uppercase text-slate-600 mr-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  Biểu mẫu:
                </span>
                {TT12_CONFIGS.map(cfg => {
                  const active = cfg.tableCode === selectedTableCode;
                  const is01Bh = cfg.tableCode.includes('01BH');
                  const countInTable = (rowsByTable[cfg.tableCode] || []).length;
                  return (
                    <button
                      key={cfg.tableCode}
                      type="button"
                      onClick={() => handleSelectTable(cfg.tableCode)}
                      title={`${cfg.tableName} (${cfg.targetXmlColumns.length} cột chuẩn)`}
                      className={cn(
                        'px-2 py-0.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer inline-flex items-center gap-1',
                        active
                          ? is01Bh
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs ring-1 ring-emerald-300'
                            : 'bg-indigo-600 text-white border-indigo-700 shadow-2xs ring-1 ring-indigo-300'
                          : is01Bh
                            ? 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      <span>{cfg.shortLabel}</span>
                      {countInTable > 0 && (
                        <span
                          className={cn(
                            'px-1 py-px rounded text-[9.5px] font-black',
                            active ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          {countInTable.toLocaleString()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:flex items-center gap-1.5 text-[10.5px] text-slate-500 shrink-0">
                <span>
                  Mẫu: <strong className="text-indigo-700">{currentConfig.tableName}</strong>
                </span>
                <span>•</span>
                <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-px rounded">
                  &lt;{currentConfig.xmlRootElement}&gt;
                </code>
                <span>•</span>
                <strong className="text-slate-700">{currentConfig.targetXmlColumns.length} cột</strong>
              </div>
            </div>

            {/* Dòng 2: Gộp chung Import Excel/XML + Xuất & Ký số XML + Trạng thái vào 1 thanh ngang gọn */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              {/* Nhóm nút 1: Mẫu trống & Import */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleDownloadExcelTemplate}
                  className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  title={`Tải file Excel mẫu trống (${currentConfig.templateFileName})`}
                >
                  <Download className="w-3 h-3" />
                  Mẫu Trống
                </button>

                <label className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer">
                  <Upload className="w-3 h-3" />
                  Nhập Excel (.xlsx/.xls)
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    multiple
                    className="hidden"
                    disabled={isBusy}
                    onChange={handleImportExcelFile}
                  />
                </label>

                <label className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer">
                  <FileCode2 className="w-3 h-3" />
                  Import XML
                  <input
                    type="file"
                    accept=".xml"
                    multiple
                    className="hidden"
                    disabled={isBusy}
                    onChange={handleImportXmlFile}
                  />
                </label>

                <label
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer select-none"
                  title="Khi bật: chọn thêm file Excel/XML sẽ nối tiếp vào danh sách hiện có thay vì ghi đè"
                >
                  <input
                    type="checkbox"
                    checked={appendOnImport}
                    onChange={e => setAppendOnImport(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                  />
                  Gộp nối tiếp
                </label>

                <span className="hidden sm:inline-block h-4 w-px bg-slate-200 mx-0.5" />

                {/* Nhóm nút 2: Xuất & Ký số XML (Tự động chia <= 4.999 HS/file) */}
                <button
                  type="button"
                  disabled={isBusy || rows.length === 0}
                  onClick={() => handleProcessXmlAction(false)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition cursor-pointer',
                    rows.length > 0 && !isBusy
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Download className="w-3 h-3" />
                  XUẤT XML
                </button>

                {smartCaProfiles.length > 0 && (
                  <select
                    value={activeSmartCaId}
                    onChange={e => handleSelectSmartCaProfile(e.target.value)}
                    title="Chọn chữ ký số VNPT SmartCA để ký XML"
                    className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-300 text-sky-900 text-[11px] font-bold max-w-[185px] outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    {smartCaProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.userId ? ` (${p.userId})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  disabled={isBusy || rows.length === 0}
                  onClick={() => handleProcessXmlAction(true, 'SMARTCA')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition cursor-pointer',
                    rows.length > 0 && !isBusy
                      ? 'bg-sky-600 hover:bg-sky-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <ShieldCheck className="w-3 h-3" />
                  ☁ KÝ SMARTCA
                </button>

                <button
                  type="button"
                  disabled={isBusy || rows.length === 0}
                  onClick={() => handleProcessXmlAction(true, 'USB_TOKEN')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition cursor-pointer',
                    rows.length > 0 && !isBusy
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <KeyRound className="w-3 h-3" />
                  🔐 KÝ USB TOKEN
                </button>

                {plannedXmlParts.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                    {plannedXmlParts.length === 1
                      ? `1 file XML (${rows.length.toLocaleString()} HS)`
                      : `Tự chia ${plannedXmlParts.length} bộ XML (${plannedXmlParts
                          .map(p => `${p.recordCount.toLocaleString()}`)
                          .join(' + ')} HS)`}
                  </span>
                )}
              </div>

              {/* Thanh trạng thái & nút tải nhanh các bộ đã chia */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {lastExportedChunks.length > 1 &&
                  lastExportedChunks.map(c => (
                    <button
                      key={c.partIndex}
                      type="button"
                      onClick={() => triggerDownloadXml(c.xmlContent, c.fileName)}
                      className="text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer shadow-2xs"
                      title={`Tải về ${c.fileName} (${c.recordCount.toLocaleString()} hồ sơ)`}
                    >
                      <Download className="w-2.5 h-2.5" />
                      Bộ {c.partIndex} ({c.recordCount.toLocaleString()} HS)
                    </button>
                  ))}

                <div
                  className={cn(
                    'px-2 py-0.5 rounded-lg border text-[10.5px] font-bold flex items-center gap-1.5 max-w-xl truncate',
                    statusType === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    statusType === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
                    statusType === 'loading' && 'bg-blue-50 text-blue-800 border-blue-200',
                    statusType === 'info' && 'bg-slate-50 text-slate-600 border-slate-200'
                  )}
                  title={statusMsg}
                >
                  {statusType === 'loading' && <RefreshCw className="w-3 h-3 animate-spin text-blue-600 shrink-0" />}
                  {statusType === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                  {statusType === 'error' && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                  <span className="truncate">{statusMsg}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG DỮ LIỆU XEM TRƯỚC & CHỈNH SỬA TRỰC TIẾP (MỞ RỘNG TỐI ĐA CHIỀU CAO) */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="shrink-0 px-2.5 py-1 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase text-slate-700">
                  Danh sách hồ sơ:
                </span>
                <span className="text-[10.5px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full">
                  {filteredRowsWithIndex.length.toLocaleString()} / {rows.length.toLocaleString()} dòng
                </span>
                {plannedXmlParts.length > 1 &&
                  plannedXmlParts.map(p => (
                    <span
                      key={p.partIndex}
                      className="hidden md:inline-block text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-px rounded"
                      title={`Bộ ${p.partIndex}/${p.totalParts}: từ dòng ${p.startRow.toLocaleString()} đến dòng ${p.endRow.toLocaleString()}`}
                    >
                      Bộ {p.partIndex}: {p.recordCount.toLocaleString()} HS ({p.startRow.toLocaleString()}→{p.endRow.toLocaleString()})
                    </span>
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm kiếm nhanh..."
                    className="pl-6 pr-2.5 py-0.5 bg-white border border-slate-300 rounded-md text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Thêm dòng
                </button>

                {rows.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const normalized = rows.map((r, idx) =>
                          normalizeAndEnrichRow(r, currentConfig, idx + 1)
                        );
                        setRows(normalized);
                        setLastExportedChunks([]);
                        setStatusMsg(
                          `✅ Đã tự động chuẩn hóa dữ liệu & sắp xếp đúng vị trí ${currentConfig.targetXmlColumns.length} cột theo quy định cho ${normalized.length} dòng!`
                        );
                        setStatusType('success');
                      }}
                      className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Tự động chuẩn hóa định dạng ngày/số tiền, bù dữ liệu thiếu và sắp xếp đúng thứ tự cột theo quy định"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Chuẩn hóa
                    </button>

                    {Object.keys(customColWidths).some(k => k.startsWith(`${selectedTableCode}:`)) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomColWidths(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(k => {
                              if (k.startsWith(`${selectedTableCode}:`)) delete next[k];
                            });
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Khôi phục độ rộng mặc định cho tất cả các cột của biểu mẫu này"
                      >
                        Đặt lại cỡ cột
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        exportStandardTt12Excel(rows, currentConfig);
                        setStatusMsg(
                          `✅ Đã xuất file Excel với thứ tự ${currentConfig.targetXmlColumns.length} cột chuẩn quy định của ${currentConfig.tableName}!`
                        );
                        setStatusType('success');
                      }}
                      className="px-2 py-0.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Tải về file Excel đã được sắp xếp lại đúng vị trí các cột theo quy định"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Xuất Excel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const chunks = buildTt12XmlChunks(rows, currentConfig, 4999);
                        if (chunks.length > 0) {
                          const mappedChunks = chunks.map(c => ({
                            partIndex: c.partIndex,
                            totalParts: c.totalParts,
                            recordCount: c.recordCount,
                            startRow: c.startRow,
                            endRow: c.endRow,
                            fileName: c.suggestedFileName,
                            xmlContent: c.xmlContent,
                            isSigned: false,
                          }));
                          setPreviewXmlModal({
                            title: `XEM TRƯỚC MÃ NGUỒN XML (${currentConfig.tableName} — ${mappedChunks.length} BỘ FILE / ${rows.length.toLocaleString()} HỒ SƠ)`,
                            fileName: mappedChunks[0].fileName,
                            xmlContent: mappedChunks[0].xmlContent,
                            isSigned: false,
                            chunks: mappedChunks,
                            activePartIndex: 1,
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      Xem XML ({plannedXmlParts.length} bộ)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đang hiển thị trên bảng?')) {
                          setRows([]);
                          setCurrentPage(1);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa bảng
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto flex flex-col">
              <table
                className="w-full table-fixed text-left border-collapse text-[11px]"
                style={{
                  minWidth: `${
                    26 +
                    currentConfig.targetXmlColumns.reduce(
                      (sum, col) => sum + getEffectiveTt12ColWidth(col),
                      0
                    )
                  }px`,
                }}
              >
                <colgroup>
                  <col style={{ width: '26px' }} />
                  {currentConfig.targetXmlColumns.map(col => (
                    <col key={col} style={{ width: `${getEffectiveTt12ColWidth(col)}px` }} />
                  ))}
                </colgroup>
                <thead className="bg-slate-100 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="px-0.5 py-1 border-b border-r border-slate-200 text-center font-black text-slate-600 align-middle">
                      <div className="text-[9px]">Xóa</div>
                      {activeColFilterEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setColumnFilters({});
                            setCurrentPage(1);
                          }}
                          className="mt-0.5 px-0.5 py-px rounded bg-rose-100 hover:bg-rose-200 text-rose-700 text-[8px] font-bold transition cursor-pointer whitespace-nowrap"
                          title="Xóa tất cả bộ lọc cột"
                        >
                          Bỏ
                        </button>
                      )}
                    </th>
                    {currentConfig.targetXmlColumns.map((col, idx) => {
                      const colFilterVal = columnFilters[col] || '';
                      return (
                        <th
                          key={col}
                          className="relative px-0.5 py-1 border-b border-r border-slate-200 align-bottom overflow-hidden select-none group/th"
                          title={`${idx + 1}. ${col} — ${TT12_COLUMN_LABELS[col] || col} (Kéo mép phải cột để chỉnh rộng/hẹp, nhấp đúp mép phải để mở rộng nhanh)`}
                        >
                          <div className="flex items-start gap-0.5 leading-[1.1] min-h-[20px]">
                            <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-0.5 rounded border border-indigo-200 shrink-0 mt-px">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-slate-800 font-mono text-[8.5px] break-words line-clamp-2">
                              {col.replace(/_/g, '_\u200B')}
                            </span>
                          </div>
                          <div className="text-[8.5px] font-medium text-slate-500 leading-[1.1] line-clamp-2 min-h-[18px] mt-0.5">
                            {TT12_COLUMN_LABELS[col] || '\u00A0'}
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
                                  ? 'pr-3.5 bg-indigo-50/70 border-indigo-500 text-indigo-950 font-semibold ring-1 ring-indigo-400'
                                  : 'bg-white border-slate-300 text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400'
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
                          {/* Thanh kéo thay đổi độ rộng cột */}
                          <div
                            onMouseDown={e => startResizeTt12Col(e, col)}
                            onDoubleClick={e => {
                              e.stopPropagation();
                              toggleExpandTt12Col(col);
                            }}
                            title="Kéo qua trái/phải để tùy chỉnh độ rộng cột • Nhấp đúp để mở rộng/thu gọn nhanh"
                            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/70 active:bg-indigo-600 z-30 transition-colors"
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.length === 0 ? (
                    <tr className="bg-slate-50/40">
                      <td className="px-0.5 py-1.5 border-b border-r border-slate-200 text-center text-slate-300">
                        —
                      </td>
                      {currentConfig.targetXmlColumns.map((col, idx) => (
                        <td
                          key={col}
                          className="px-1 py-1.5 border-b border-r border-slate-200 text-[10px] text-slate-400 italic truncate"
                          title={`Cột ${idx + 1}: ${col}`}
                        >
                          ({idx + 1}) {col}
                        </td>
                      ))}
                    </tr>
                  ) : (
                    paginatedRows.map(({ row, globalIdx }) => (
                      <tr key={globalIdx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-0 py-0.5 border-r border-slate-200 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(globalIdx)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                        {currentConfig.targetXmlColumns.map(col => (
                          <td key={col} className="p-0 border-r border-slate-200 overflow-hidden">
                            <input
                              type="text"
                              value={row[col] ?? ''}
                              onChange={e => handleCellEdit(globalIdx, col, e.target.value)}
                              title={String(row[col] ?? '')}
                              className="w-full px-0.5 py-0.5 text-[11px] tabular-nums leading-tight bg-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800 truncate"
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {rows.length === 0 && (
                <div className="flex-1 min-h-[140px] p-4 text-center flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Chưa có dữ liệu cho {currentConfig.tableName} ({currentConfig.targetXmlColumns.length} cột hiển thị phía trên)
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                    Bấm <b>"Mẫu Trống"</b>, <b>"Nhập Excel"</b>, <b>"Import XML"</b> hoặc <b>"+ Thêm dòng"</b> để nhập dữ liệu.
                  </p>
                </div>
              )}
            </div>

            {/* Phân trang cố định dưới chân bảng (Kèm danh sách số trang & Ô nhập nhảy tới trang bất kỳ) */}
            {rows.length > 0 && (
              <div className="shrink-0 px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-slate-600 font-medium">
                  <span>
                    Trang <b className="text-indigo-700">{currentPage}</b> / <b>{totalPages}</b> (Hiển thị{' '}
                    <b>
                      {filteredRowsWithIndex.length === 0
                        ? 0
                        : (currentPage - 1) * pageSize + 1}
                      –
                      {Math.min(currentPage * pageSize, filteredRowsWithIndex.length)}
                    </b>{' '}
                    / <b>{filteredRowsWithIndex.length.toLocaleString()}</b> dòng)
                  </span>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500">Hiển thị:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                      className="w-14 px-1.5 py-0.5 text-center font-extrabold text-indigo-700 bg-indigo-50/60 border border-indigo-300 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                      title={`Nhập số trang từ 1 đến ${totalPages}`}
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">/ {totalPages}</span>
                  </div>

                  {/* Nút Đầu */}
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
                    title="Về trang đầu tiên (Trang 1)"
                  >
                    « Đầu
                  </button>

                  {/* Nút Trước */}
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-0.5 text-[11px] cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Trước
                  </button>

                  {/* Danh sách các ô số trang */}
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
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                          )}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}

                  {/* Nút Sau */}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-0.5 text-[11px] cursor-pointer"
                  >
                    Sau <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Nút Cuối */}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
                    title={`Đến trang cuối cùng (Trang ${totalPages})`}
                  >
                    Cuối »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* TAB 2: KÝ SỐ PDF (MẪU 02/BH) & IMPORT ẢNH CHỮ KÝ TAY TRONG SUỐT             */}
      {/* ========================================================================== */}
      {subTab === 'PDF_02BH' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {/* THANH CÔNG CỤ ĐIỀU KHIỂN KÝ SỐ PDF CỐ ĐỊNH TRÊN CÙNG (KHÔNG BAO GIỜ BỊ CUỘN MẤT) */}
          <div className="shrink-0 bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  📂 Chọn File PDF...
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isPdfBusy}
                    onChange={e => {
                      if (pdfScrollContainerRef.current) pdfScrollContainerRef.current.scrollTop = 0;
                      handleSelectLocalPdf(e);
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={isPdfBusy}
                  onClick={() => {
                    if (pdfScrollContainerRef.current) pdfScrollContainerRef.current.scrollTop = 0;
                    handleLoadSamplePdf02BH();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Mở Biểu Mẫu Trống 02/BH.pdf
                </button>

                <a
                  href="/templates/tt12/MAU_02BH.pdf"
                  download="MAU_02BH_MauTrong.pdf"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải Mẫu 02/BH.pdf Trống
                </a>
              </div>

              {/* Các nút Ký số PDF & Xuất file */}
              <div className="flex flex-wrap items-center gap-1.5">
                {smartCaProfiles.length > 0 && (
                  <div className="flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-xl px-2 py-1">
                    <span className="text-[10.5px] font-extrabold text-sky-800 whitespace-nowrap">
                      CKS SmartCA:
                    </span>
                    <select
                      value={activeSmartCaId}
                      onChange={e => handleSelectSmartCaProfile(e.target.value)}
                      title="Chọn chữ ký số VNPT SmartCA đã cấu hình trước khi ký"
                      className="bg-white border border-sky-300 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 max-w-[200px] outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      {smartCaProfiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.userId ? ` (${p.userId})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isPdfBusy || !pdfBytes}
                  onClick={() => handleSignPdf('SMARTCA')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer',
                    pdfBytes && !isPdfBusy
                      ? 'bg-sky-600 hover:bg-sky-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <ShieldCheck className="w-4 h-4" />
                  ☁ KÝ SỐ PDF VNPT SMARTCA
                </button>

                <button
                  type="button"
                  disabled={isPdfBusy || !pdfBytes}
                  onClick={() => handleSignPdf('USB_TOKEN')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer',
                    pdfBytes && !isPdfBusy
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <KeyRound className="w-4 h-4" />
                  🖋 KÝ SỐ PDF USB TOKEN
                </button>

                <button
                  type="button"
                  disabled={!pdfBytes}
                  onClick={handlePreviewCurrentPdf}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-40"
                >
                  <Eye className="w-4 h-4" />
                  👁 XEM LẠI PDF
                </button>

                <button
                  type="button"
                  disabled={!pdfBytes}
                  onClick={handleDownloadSignedPdf}
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  💾 XUẤT PDF ĐÃ KÝ
                </button>
              </div>
            </div>

            {/* Khung Import 4 Ảnh Chữ Ký Tay + Ghi chú + Tên người ký + Xóa nền JPG -> PNG & Chỉnh kích thước */}
            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 space-y-2">
              {/* Thanh chọn nhanh 4 ô chữ ký đã lưu */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1 mr-1">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Kho 4 chữ ký:
                  </span>
                  {sigSlots.map((slot, idx) => {
                    const isActive = idx === activeSlotIdx;
                    const hasImg = Boolean(slot.imageDataUrl);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSelectSigSlot(idx)}
                        className={cn(
                          'px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer',
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50'
                        )}
                        title={
                          hasImg
                            ? `Ô #${idx + 1}: ${slot.label}${slot.signerText ? ` — ${slot.signerText}` : ''}`
                            : `Ô #${idx + 1}: ${slot.label} (chưa có ảnh)`
                        }
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            hasImg ? 'bg-emerald-400' : isActive ? 'bg-indigo-200' : 'bg-slate-300'
                          )}
                        />
                        {hasImg && (
                          <img
                            src={slot.imageDataUrl}
                            alt={slot.label}
                            className="h-4 w-7 object-contain rounded-xs bg-white/90 px-0.5"
                          />
                        )}
                        <span className="max-w-[125px] truncate">
                          #{idx + 1}. {slot.label || `Chữ ký ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                >
                  ⚙ Cấu hình CKS
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                {/* Cột trái: Xem trước + Ghi chú + Tên người ký dưới ảnh + Import & Xóa nền PNG */}
                <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div
                    className="border border-dashed border-rose-300 rounded-xl p-1 h-16 w-44 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                      backgroundColor: '#ffffff',
                    }}
                    title="Xem trước mẫu chữ ký sẽ đóng lên PDF"
                  >
                    {stampPreviewUrl ? (
                      <img
                        src={stampPreviewUrl}
                        alt="Xem trước chữ ký"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Xem trước chữ ký</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-600">
                        <span className="shrink-0">Ghi chú:</span>
                        <input
                          type="text"
                          value={activeSlot?.label || ''}
                          onChange={e => updateActiveSlot({ label: e.target.value })}
                          placeholder={`Tên loại chữ ký #${activeSlotIdx + 1}`}
                          className="w-full px-2 py-0.5 rounded-md border border-slate-300 bg-white text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-600">
                        <span className="shrink-0">Tên dưới ảnh:</span>
                        <input
                          type="text"
                          value={activeSlot?.signerText || ''}
                          onChange={e => updateActiveSlot({ signerText: e.target.value })}
                          placeholder="VD: NGUYỄN THỊ LIÊN"
                          className="w-full px-2 py-0.5 rounded-md border border-slate-300 bg-white text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          title="Chèn tên người ký dạng text ngay phía dưới ảnh chữ ký"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition">
                        <Upload className="w-3 h-3" />
                        {activeSlot?.imageDataUrl ? `Đổi ảnh #${activeSlotIdx + 1}` : `Import ảnh #${activeSlotIdx + 1} (.jpg, .png)`}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.bmp,.webp"
                          className="hidden"
                          onChange={handleUploadSignatureImage}
                        />
                      </label>

                      <label
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-700 cursor-pointer select-none px-1.5 py-0.5 rounded bg-white border border-slate-200"
                        title="Ảnh JPG/JPEG/BMP khi import sẽ tự động xóa nền trắng/xám thành PNG trong suốt"
                      >
                        <input
                          type="checkbox"
                          checked={autoRemoveBgOnUpload}
                          onChange={e => setAutoRemoveBgOnUpload(e.target.checked)}
                          className="accent-indigo-600"
                        />
                        Tự xóa nền → PNG
                      </label>

                      {activeSlot?.imageDataUrl && (
                        <>
                          <button
                            type="button"
                            disabled={isRemovingBg}
                            onClick={handleRemoveBgActiveSlot}
                            className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            title="Xóa nền trắng/xám hiện tại và xuất thành ảnh PNG trong suốt"
                          >
                            <Sparkles className="w-3 h-3" />
                            Xóa nền → PNG
                          </button>

                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600"
                            title="Kéo để chỉnh độ mạnh xóa nền giấy xám/tối rồi thả chuột (hoặc bấm Xóa nền → PNG)"
                          >
                            <span>Độ mạnh: {bgStrength}</span>
                            <input
                              type="range"
                              min={10}
                              max={90}
                              value={bgStrength}
                              onChange={e => setBgStrength(Number(e.target.value))}
                              onMouseUp={e => void applyBgRemovalWithStrength(Number((e.target as HTMLInputElement).value))}
                              onTouchEnd={e => void applyBgRemovalWithStrength(Number((e.target as HTMLInputElement).value))}
                              className="w-16 accent-teal-600 cursor-pointer"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleDownloadActiveSlotPng}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            title="Tải ảnh chữ ký PNG đã xóa nền về máy"
                          >
                            <Download className="w-3 h-3" />
                            Tải PNG
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              delete rawSlotImagesRef.current[activeSlotIdx];
                              updateActiveSlot({ imageDataUrl: '', bgRemoved: false });
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-bold transition cursor-pointer"
                          >
                            ✕ Xóa ảnh
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cột phải: Thanh trượt kích thước & 4 vị trí gợi ý Mẫu 02/BH */}
                <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-3">
                  <div className="space-y-0.5 shrink-0">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 gap-2">
                      <span>Kích thước khung:</span>
                      <span className="text-indigo-700 font-extrabold">{sigScalePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={sigScalePercent}
                      onChange={e => handleScaleSliderChange(Number(e.target.value))}
                      className="w-32 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10.5px] font-bold text-slate-600">
                      Đặt nhanh vị trí trên Mẫu 02/BH:
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSigBox(prev => ({ ...prev, relX: 0.04, relY: 0.62 }))}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        1. Lập biểu
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigBox(prev => ({ ...prev, relX: 0.28, relY: 0.62 }))}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        2. KHTH
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigBox(prev => ({ ...prev, relX: 0.51, relY: 0.62 }))}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        3. Kế toán
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigBox(prev => ({ ...prev, relX: 0.73, relY: 0.62 }))}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        4. Thủ trưởng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trạng thái PDF & Chuyển trang */}
            <div
              className={cn(
                'px-3.5 py-1.5 rounded-xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2',
                pdfStatusType === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                pdfStatusType === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
                pdfStatusType === 'loading' && 'bg-blue-50 text-blue-800 border-blue-200',
                pdfStatusType === 'info' && 'bg-slate-50 text-slate-700 border-slate-200'
              )}
            >
              <div className="flex items-center gap-2">
                {pdfStatusType === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
                <span>{pdfStatusMsg}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {pdfSignedCount > 0 && (
                  <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                    Đã ký {pdfSignedCount} chữ ký trên file này
                  </span>
                )}
                {pdfPageInfo && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pdfPageNumber <= 1}
                      onClick={() => {
                        if (pdfScrollContainerRef.current) pdfScrollContainerRef.current.scrollTop = 0;
                        setPdfPageNumber(p => Math.max(1, p - 1));
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300 disabled:opacity-40 text-[11px] font-bold cursor-pointer"
                    >
                      ◀ Trang trước
                    </button>
                    <span className="text-[11px] font-extrabold text-slate-800">
                      Trang {pdfPageNumber} / {pdfPageInfo.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={pdfPageNumber >= pdfPageInfo.totalPages}
                      onClick={() => {
                        if (pdfScrollContainerRef.current) pdfScrollContainerRef.current.scrollTop = 0;
                        setPdfPageNumber(p => Math.min(pdfPageInfo.totalPages, p + 1));
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300 disabled:opacity-40 text-[11px] font-bold cursor-pointer"
                    >
                      Trang sau ▶
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VÙNG HIỂN THỊ TRANG PDF & KÉO THẢ KHUNG CHỮ KÝ TRỰC QUAN (CHỈ CUỘN VÙNG NÀY KHI LĂN CHUỘT) */}
          <div
            ref={pdfScrollContainerRef}
            className="flex-1 min-h-0 bg-slate-200/85 rounded-2xl p-4 border border-slate-300 flex flex-col items-center justify-start overflow-auto"
          >
            <div
              ref={pdfWrapperRef}
              className="relative bg-white shadow-2xl border border-slate-400 select-none inline-block my-auto"
            >
              <canvas ref={pdfCanvasRef} className="block max-w-full h-auto" />

              {/* Khung chữ ký kéo thả (SignatureBox) */}
              {pdfBytes && (
                <div
                  onMouseDown={e => handleStartDragSigBox(e, 'move')}
                  style={{
                    left: `${sigBox.relX * 100}%`,
                    top: `${sigBox.relY * 100}%`,
                    width: `${sigBox.relW * 100}%`,
                    height: `${sigBox.relH * 100}%`,
                  }}
                  className="absolute border-2 border-dashed border-rose-600 bg-rose-500/10 hover:bg-rose-500/15 cursor-move flex items-center justify-center group transition-colors"
                  title="Giữ chuột trái để kéo di chuyển vị trí chữ ký. Kéo góc dưới bên phải để phóng to/thu nhỏ."
                >
                  {/* Hiển thị trực tiếp bản xem trước con dấu chữ ký (ảnh chữ ký trong suốt + chữ đỏ) */}
                  {stampPreviewUrl ? (
                    <img
                      src={stampPreviewUrl}
                      alt="Chữ ký sẽ đặt tại đây"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="text-center text-rose-700 font-bold text-[11px] pointer-events-none px-2">
                      CHỮ KÝ SẼ ĐẶT TẠI ĐÂY
                      <br />
                      <span className="text-[9px] font-normal">(Giữ chuột để kéo di chuyển)</span>
                    </div>
                  )}

                  {/* Nhãn hướng dẫn nhỏ phía trên */}
                  <div className="absolute -top-5 left-0 bg-rose-600 text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-t flex items-center gap-1 shadow-xs pointer-events-none whitespace-nowrap">
                    <Move className="w-2.5 h-2.5" /> Kéo để di chuyển vị trí ký
                  </div>

                  {/* Nút kéo thay đổi kích thước ở góc dưới bên phải (ResizeHandle) */}
                  <div
                    onMouseDown={e => handleStartDragSigBox(e, 'resize')}
                    className="w-3.5 h-3.5 bg-rose-600 border border-white rounded-xs cursor-nwse-resize absolute -bottom-1.5 -right-1.5 shadow-sm"
                    title="Kéo để thay đổi kích thước khung chữ ký"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC & SAO CHÉP MÃ NGUỒN XML */}
      {previewXmlModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-sm font-black">{previewXmlModal.title}</div>
                  <div className="text-[11px] text-slate-300 font-mono">{previewXmlModal.fileName}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {previewXmlModal.chunks && previewXmlModal.chunks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => triggerDownloadAllChunks(previewXmlModal.chunks!)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải tất cả ({previewXmlModal.chunks.length} file XML)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewXmlModal.xmlContent);
                    alert('Đã sao chép toàn bộ nội dung XML của bộ đang chọn vào bộ nhớ tạm!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Sao chép XML
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerDownloadXml(previewXmlModal.xmlContent, previewXmlModal.fileName)
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Tải về ({previewXmlModal.fileName})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewXmlModal(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thanh chọn các Bộ XML được chia tự động (tối đa 4.999 hồ sơ / bộ) */}
            {previewXmlModal.chunks && previewXmlModal.chunks.length > 1 && (
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-amber-300 mr-1">
                    Danh sách bộ file XML đã chia (tối đa 4.999 HS/file):
                  </span>
                  {previewXmlModal.chunks.map(chunk => {
                    const isActive =
                      (previewXmlModal.activePartIndex || 1) === chunk.partIndex;
                    return (
                      <div key={chunk.partIndex} className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewXmlModal(prev =>
                              prev
                                ? {
                                    ...prev,
                                    activePartIndex: chunk.partIndex,
                                    fileName: chunk.fileName,
                                    xmlContent: chunk.xmlContent,
                                  }
                                : null
                            )
                          }
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer',
                            isActive
                              ? 'bg-cyan-500 text-slate-950 shadow-xs'
                              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          )}
                        >
                          Bộ {chunk.partIndex}/{chunk.totalParts}: {chunk.recordCount.toLocaleString()} HS (dòng{' '}
                          {chunk.startRow.toLocaleString()}→{chunk.endRow.toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerDownloadXml(chunk.xmlContent, chunk.fileName)}
                          className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                          title={`Tải ngay ${chunk.fileName}`}
                        >
                          ⬇ Tải
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-auto flex-1 leading-relaxed whitespace-pre-wrap break-all">
              {previewXmlModal.xmlContent.length > 16000
                ? `${previewXmlModal.xmlContent.slice(0, 10000)}\n\n... [Đã rút gọn hiển thị trên màn hình (${previewXmlModal.xmlContent.length.toLocaleString()} ký tự) để tránh đơ trình duyệt — Khi bấm "Tải về" hoặc "Sao chép XML" vẫn giữ nguyên đủ 100% toàn bộ hồ sơ] ...\n\n${previewXmlModal.xmlContent.slice(-5000)}`
                : previewXmlModal.xmlContent}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH CHỮ KÝ SỐ SẴN CÓ CỦA WEB APP */}
      {showConfigModal && (
        <ConfigModal
          onClose={() => {
            setShowConfigModal(false);
            setSmartCaProfiles(getSmartCAProfiles());
            setActiveSmartCaId(getActiveSmartCAProfileId());
            setLastCertDisplay(null);
          }}
          initialTab="smartca"
        />
      )}
    </div>
  );
}

