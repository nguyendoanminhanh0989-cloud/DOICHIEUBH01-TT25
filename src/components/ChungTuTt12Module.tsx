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
  PdfRelativeBox,
  PdfPageInfo,
} from '../lib/pdfSignService';
import {
  getSmartCAConfig,
  getSavedSignatureImage,
  saveSignatureImage,
  DEFAULT_VNPT_SUBJECT,
} from '../lib/vnptSmartCaService';
import ConfigModal from './ConfigModal';
import {
  getSessionCache,
  getSessionSync,
  setSessionCache,
  setSessionSync,
} from '../lib/sessionCache';

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

  const rows = useMemo(
    () => rowsByTable[selectedTableCode] || [],
    [rowsByTable, selectedTableCode]
  );

  const setRows = (
    updater:
      | Record<string, string>[]
      | ((prev: Record<string, string>[]) => Record<string, string>[]),
    overrideTableCode?: string
  ) => {
    const targetCode = overrideTableCode || selectedTableCode;
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const [statusMsg, setStatusMsg] = useState<string>('Sẵn sàng. Hãy chọn danh mục, tải mẫu trống hoặc nhập dữ liệu.');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'loading'>('info');
  const [isBusy, setIsBusy] = useState(false);

  // Xem trước XML đã tạo / đã ký
  const [previewXmlModal, setPreviewXmlModal] = useState<{
    title: string;
    fileName: string;
    xmlContent: string;
    isSigned: boolean;
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

  // Ảnh chữ ký tay (DataURL / Base64)
  const [signatureImageB64, setSignatureImageB64] = useState<string>(() => getSavedSignatureImage());
  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');

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
          setRowsByTable(prev => ({ ...cachedRowsMap, ...prev }));
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

  // Tự động tạo bản xem trước con dấu chữ ký (ảnh chữ ký tay trong suốt + chữ đỏ)
  useEffect(() => {
    let cancelled = false;
    const cfg = getSmartCAConfig();
    const subject = cfg.subjectDN || DEFAULT_VNPT_SUBJECT;
    const { signerName, orgName } = extractCertDisplayInfo(subject);

    createCompositeSignatureStamp({
      signerName,
      orgName,
      signatureImageBase64: signatureImageB64,
    })
      .then(res => {
        if (!cancelled) setStampPreviewUrl(res.dataUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [signatureImageB64, showConfigModal]);

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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsBusy(true);
    setStatusType('loading');
    setStatusMsg(`⏳ Đang đọc và tự động chuẩn hóa vị trí các cột từ file Excel "${file.name}"...`);

    try {
      const buf = await file.arrayBuffer();
      const meta = parseTt12ExcelBufferWithMeta(buf, currentConfig);
      if (meta.autoSwitchedTable) {
        setSelectedTableCode(meta.effectiveConfig.tableCode);
      }
      setRows(meta.rows, meta.effectiveConfig.tableCode);
      setCurrentPage(1);

      const notes: string[] = [];
      if (meta.autoSwitchedTable) {
        notes.push(`tự động nhận diện đúng biểu mẫu "${meta.effectiveConfig.tableName}"`);
      }
      if (meta.reorderedColumns) {
        notes.push(
          `tự động điều chỉnh & sắp xếp lại vị trí ${meta.effectiveConfig.targetXmlColumns.length} cột về đúng quy định`
        );
      }
      if (meta.renamedColumns.length > 0) {
        notes.push(`chuẩn hóa tên cột (${meta.renamedColumns.slice(0, 4).join(', ')})`);
      }

      const detailNote = notes.length > 0 ? ` — Đã ${notes.join(', ')}!` : '';
      setStatusMsg(
        `✅ Đã nhập thành công ${meta.rows.length} dòng từ "${file.name}" (${meta.effectiveConfig.tableName})${detailNote}`
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsBusy(true);
    setStatusType('loading');
    setStatusMsg(`⏳ Đang đọc và tự động chuẩn hóa cấu trúc từ file XML "${file.name}"...`);

    try {
      const text = await file.text();
      const meta = parseTt12XmlTextWithMeta(text, currentConfig);
      if (meta.autoSwitchedTable) {
        setSelectedTableCode(meta.effectiveConfig.tableCode);
      }
      setRows(meta.rows, meta.effectiveConfig.tableCode);
      setCurrentPage(1);

      const notes: string[] = [];
      if (meta.autoSwitchedTable) {
        notes.push(`tự động chuyển sang biểu mẫu "${meta.effectiveConfig.tableName}"`);
      }
      if (meta.reorderedColumns) {
        notes.push(
          `tự động điều chỉnh & sắp xếp lại đủ ${meta.effectiveConfig.targetXmlColumns.length} cột theo đúng quy định`
        );
      }

      const detailNote = notes.length > 0 ? ` (${notes.join('; ')})` : '';
      setStatusMsg(
        `✅ Đã Import thành công ${meta.rows.length} bản ghi từ file XML "${file.name}" vào ${meta.effectiveConfig.tableName}${detailNote}.`
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
    setTimeout(() => URL.revokeObjectURL(url), 5000);
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
      // Chia thành các phần <= 4999 dòng giống hệt ProcessXmlActionAsync trong MainView.xaml.cs
      const chunks = buildTt12XmlChunks(rows, currentConfig, 4999);
      let lastXml = '';
      let lastFileName = '';

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!signAction) {
          setStatusMsg(
            `⏳ Đang xuất file XML phần ${chunk.partIndex}/${chunk.totalParts} (${chunk.recordCount} dòng)...`
          );
          triggerDownloadXml(chunk.xmlContent, chunk.suggestedFileName);
          lastXml = chunk.xmlContent;
          lastFileName = chunk.suggestedFileName;
        } else {
          setStatusMsg(
            `🔐 Đang ký số XML (${signMethod === 'SMARTCA' ? 'VNPT SmartCA' : 'USB Token'}) phần ${chunk.partIndex}/${chunk.totalParts}...`
          );
          const signRes = await signTt12XmlString(chunk.xmlContent, signMethod, msg => {
            setStatusMsg(`[Phần ${chunk.partIndex}/${chunk.totalParts}] ${msg}`);
          });
          const signedFileName = chunk.suggestedFileName.replace(/\.xml$/i, '_Signed.xml');
          triggerDownloadXml(signRes.signedXml, signedFileName);
          lastXml = signRes.signedXml;
          lastFileName = signedFileName;
        }
      }

      const successText = signAction
        ? `✅ Đã Xuất và Ký số thành công ${chunks.length} file XML (${rows.length} bản ghi)!`
        : `✅ Đã Xuất thành công ${chunks.length} file XML (${rows.length} bản ghi)!`;
      setStatusMsg(successText);
      setStatusType('success');

      if (lastXml) {
        setPreviewXmlModal({
          title: signAction
            ? `XML ĐÃ KÝ SỐ (${signMethod === 'SMARTCA' ? 'VNPT SMARTCA' : 'USB TOKEN'})`
            : 'XEM TRƯỚC MÃ NGUỒN XML CHUẨN TT12 / 01BH',
          fileName: lastFileName,
          xmlContent: lastXml,
          isSigned: signAction,
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
    setCurrentPage(Math.ceil(updated.length / pageSize));
  };

  const handleDeleteRow = (globalIdx: number) => {
    const next = rows.filter((_, i) => i !== globalIdx).map((r, i) => ({
      ...r,
      STT: String(i + 1),
    }));
    setRows(next);
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
  };

  const filteredRowsWithIndex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows
      .map((row, idx) => ({ row, globalIdx: idx }))
      .filter(({ row }) => {
        if (!q) return true;
        return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
      });
  }, [rows, searchQuery]);

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
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh chữ ký có dung lượng nhỏ hơn 2MB!');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = String(ev.target?.result || '');
      setSignatureImageB64(dataUrl);
      saveSignatureImage(dataUrl);
      setPdfStatusMsg(
        '✅ Đã tải ảnh chữ ký tay và tự động tách nền trắng thành trong suốt! Bạn có thể xem trước ngay trong khung chữ ký.'
      );
      setPdfStatusType('success');
    };
    reader.readAsDataURL(file);
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
        signatureImageBase64: signatureImageB64,
        onProgress: msg => setPdfStatusMsg(msg),
      });

      const nextCount = pdfSignedCount + 1;
      setPdfBytes(res.signedPdfBytes);
      setPdfSignedCount(nextCount);

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
    <div className="h-[calc(100vh-56px)] flex flex-col gap-2.5 overflow-hidden">
      {/* HEADER MODULE CỐ ĐỊNH TRÊN CÙNG */}
      <div className="shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl px-4 py-2.5 text-white shadow-md border border-blue-700/40 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                CHỨNG TỪ TT12 BHXH - BH01 - BH02
              </h1>
              <span className="bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                CHUẨN TT12 BYT & BHXH 2026
              </span>
            </div>
            <p className="text-[11px] text-blue-200 mt-0.5">
              Xuất & Ký số XML Danh mục TT12 (Bảng 1–6) • Báo cáo Mẫu 01/BH (C79 / 7980a) • Ký số PDF Mẫu 02/BH (Hỗ trợ Import Ảnh chữ ký tay trong suốt & Ký nhiều chữ ký)
            </p>
          </div>
        </div>

        {/* Chuyển đổi 2 Tab lớn & Nút Cấu hình Ký số */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('XML_TT12_01BH')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer border',
              subTab === 'XML_TT12_01BH'
                ? 'bg-white text-blue-950 border-white shadow-md'
                : 'bg-white/10 text-blue-100 border-white/20 hover:bg-white/20'
            )}
          >
            <FileCode2 className="w-4 h-4 text-blue-600" />
            1. DANH MỤC TT12 & MẪU 01/BH (XML)
          </button>

          <button
            type="button"
            onClick={() => setSubTab('PDF_02BH')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer border',
              subTab === 'PDF_02BH'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-white/10 text-amber-200 border-white/20 hover:bg-white/20'
            )}
          >
            <FileText className="w-4 h-4" />
            2. KÝ SỐ PDF (MẪU 02/BH)
          </button>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            ⚙ Cấu hình Chữ ký số
          </button>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* TAB 1: DANH MỤC TT12 (BẢNG 1–6) & BÁO CÁO MẪU 01/BH (C79 / 7980a)          */}
      {/* ========================================================================== */}
      {subTab === 'XML_TT12_01BH' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {/* KHỐI CÔNG CỤ & THANH KÝ SỐ CỐ ĐỊNH TRÊN CÙNG (KHÔNG BỊ CUỘN MẤT KHI LĂN CHUỘT) */}
          <div className="shrink-0 space-y-2">
            {/* Thanh chọn nhanh 8 biểu mẫu TT12 & 01/BH */}
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                <div className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Chọn Biểu mẫu Danh mục TT12 (Bảng 1–6) hoặc Báo cáo Mẫu 01/BH:
                </div>
                <div className="text-[11px] text-slate-500">
                  Thẻ gốc XML: <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">&lt;{currentConfig.xmlRootElement}&gt;</code> • Danh sách:{' '}
                  <code className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">&lt;{currentConfig.xmlListElement}&gt;</code> • Số cột chuẩn:{' '}
                  <strong className="text-slate-800">{currentConfig.targetXmlColumns.length} cột</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                {TT12_CONFIGS.map(cfg => {
                  const active = cfg.tableCode === selectedTableCode;
                  const is01Bh = cfg.tableCode.includes('01BH');
                  return (
                    <button
                      key={cfg.tableCode}
                      type="button"
                      onClick={() => handleSelectTable(cfg.tableCode)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between',
                        active
                          ? is01Bh
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                            : 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300'
                          : is01Bh
                            ? 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      <div className="text-[11px] font-extrabold leading-tight">{cfg.shortLabel}</div>
                      <div
                        className={cn(
                          'text-[9.5px] mt-0.5 truncate',
                          active ? 'text-white/85' : 'text-slate-500'
                        )}
                        title={cfg.tableName}
                      >
                        {cfg.tableName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2 Khung thao tác & Thanh ký số cố định */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {/* Khung 1: Thao tác Excel & Biểu mẫu trống */}
              <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200 shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs font-black uppercase text-slate-800 tracking-wide">
                      1. Biểu mẫu Excel Trống & Import:
                    </h2>
                    <strong className="text-xs text-indigo-700">{currentConfig.tableName}</strong>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    Mẫu: {currentConfig.templateFileName}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleDownloadExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Tải file Excel mẫu trống (chỉ gồm tiêu đề các cột chuẩn quy định, không chứa dữ liệu)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải Excel Mẫu Trống
                  </button>

                  <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Nhập Excel (.xlsx / .xls)
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      disabled={isBusy}
                      onChange={handleImportExcelFile}
                    />
                  </label>

                  <label className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer">
                    <FileCode2 className="w-3.5 h-3.5" />
                    Import XML Có Sẵn
                    <input
                      type="file"
                      accept=".xml"
                      className="hidden"
                      disabled={isBusy}
                      onChange={handleImportXmlFile}
                    />
                  </label>
                </div>
              </div>

              {/* Khung 2: Xuất & Ký Số XML cố định */}
              <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200 shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h2 className="text-xs font-black uppercase text-slate-800 tracking-wide">
                    2. Xuất & Ký Số XML (Tự động tách file khi &gt; 4999 dòng)
                  </h2>
                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    SHA-256 XMLDSig
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy || rows.length === 0}
                    onClick={() => handleProcessXmlAction(false)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer',
                      rows.length > 0 && !isBusy
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    XUẤT XML
                  </button>

                  <button
                    type="button"
                    disabled={isBusy || rows.length === 0}
                    onClick={() => handleProcessXmlAction(true, 'SMARTCA')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer',
                      rows.length > 0 && !isBusy
                        ? 'bg-sky-600 hover:bg-sky-700 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ☁ KÝ SỐ VNPT SMARTCA
                  </button>

                  <button
                    type="button"
                    disabled={isBusy || rows.length === 0}
                    onClick={() => handleProcessXmlAction(true, 'USB_TOKEN')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer',
                      rows.length > 0 && !isBusy
                        ? 'bg-purple-700 hover:bg-purple-800 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    🔐 KÝ SỐ USB TOKEN
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Mở cài đặt VNPT SmartCA / USB Token"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Cấu hình CKS
                  </button>
                </div>
              </div>
            </div>

            {/* Thanh thông báo trạng thái */}
            <div
              className={cn(
                'px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3',
                statusType === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                statusType === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
                statusType === 'loading' && 'bg-blue-50 text-blue-800 border-blue-200',
                statusType === 'info' && 'bg-slate-50 text-slate-700 border-slate-200'
              )}
            >
              <div className="flex items-center gap-2">
                {statusType === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
                {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {statusType === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{statusMsg}</span>
              </div>
              <span className="text-[11px] font-extrabold text-indigo-700 shrink-0">
                Tổng số: {rows.length.toLocaleString()} bản ghi
              </span>
            </div>
          </div>

          {/* BẢNG DỮ LIỆU XEM TRƯỚC & CHỈNH SỬA TRỰC TIẾP (CHỈ CUỘN NỘI DUNG BẢNG KHI LĂN CHUỘT) */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-700">
                  Dữ liệu xem trước (Cho phép click vào ô để chỉnh sửa trực tiếp):
                </span>
                <span className="text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                  {filteredRowsWithIndex.length} / {rows.length} dòng
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm kiếm trong bảng..."
                    className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-52"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
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
                        setStatusMsg(
                          `✅ Đã tự động chuẩn hóa dữ liệu & sắp xếp đúng vị trí ${currentConfig.targetXmlColumns.length} cột theo quy định cho ${normalized.length} dòng!`
                        );
                        setStatusType('success');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Tự động chuẩn hóa định dạng ngày/số tiền, bù dữ liệu thiếu và sắp xếp đúng thứ tự cột theo quy định"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Chuẩn hóa đúng mẫu
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportStandardTt12Excel(rows, currentConfig);
                        setStatusMsg(
                          `✅ Đã xuất file Excel với thứ tự ${currentConfig.targetXmlColumns.length} cột chuẩn quy định của ${currentConfig.tableName}!`
                        );
                        setStatusType('success');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Tải về file Excel đã được sắp xếp lại đúng vị trí các cột theo quy định"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Xuất Excel Chuẩn
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const chunks = buildTt12XmlChunks(rows, currentConfig, 4999);
                        if (chunks.length > 0) {
                          setPreviewXmlModal({
                            title: `XEM TRƯỚC MÃ NGUỒN XML (${currentConfig.tableName})`,
                            fileName: chunks[0].suggestedFileName,
                            xmlContent: chunks[0].xmlContent,
                            isSigned: false,
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem XML
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đang hiển thị trên bảng?')) {
                          setRows([]);
                          setCurrentPage(1);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa bảng
                    </button>
                  </>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex-1 min-h-0 overflow-auto p-8 text-center flex flex-col items-center justify-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  Chưa có dữ liệu cho {currentConfig.tableName}
                </div>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  Bạn có thể bấm <b>"Tải Excel Mẫu Trống"</b> để lấy biểu mẫu chuẩn (chỉ gồm dòng tiêu đề cột quy định, không chứa dữ liệu mẫu), sau đó chọn <b>"Nhập Excel"</b> hoặc{' '}
                  <b>"Import XML Có Sẵn"</b> từ máy tính.
                </p>
                <div className="pt-1 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Tải Excel Mẫu Trống ({currentConfig.templateFileName})
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="px-2.5 py-2 border-b border-r border-slate-200 text-center font-black text-slate-600 w-10">
                          Xóa
                        </th>
                        {currentConfig.targetXmlColumns.map(col => (
                          <th
                            key={col}
                            className="px-2.5 py-2 border-b border-r border-slate-200 font-extrabold text-slate-700 whitespace-nowrap font-mono text-[11px]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedRows.map(({ row, globalIdx }) => (
                        <tr key={globalIdx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-2 py-1 border-r border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(globalIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {currentConfig.targetXmlColumns.map(col => (
                            <td key={col} className="p-0 border-r border-slate-200 min-w-[110px]">
                              <input
                                type="text"
                                value={row[col] ?? ''}
                                onChange={e => handleCellEdit(globalIdx, col, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang cố định dưới chân bảng */}
                {totalPages > 1 && (
                  <div className="shrink-0 px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Trang <b>{currentPage}</b> / <b>{totalPages}</b> (Hiển thị {paginatedRows.length} dòng)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Trước
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Sau <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
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

            {/* Khung Import Ảnh Chữ Ký Tay & Chỉnh kích thước / Vị trí nhanh cho Mẫu 02/BH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              {/* Cột trái: Import Ảnh chữ ký tay */}
              <div className="lg:col-span-6 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                <div className="bg-white border border-dashed border-rose-300 rounded-xl p-1 h-12 w-36 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
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

                <div className="space-y-1">
                  <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Ảnh chữ ký tay / Con dấu (Tự động xóa nền trắng):
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition">
                      <Upload className="w-3 h-3" />
                      {signatureImageB64 ? 'Đổi ảnh chữ ký tay' : 'Import Ảnh chữ ký tay (.png, .jpg)'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.bmp"
                        className="hidden"
                        onChange={handleUploadSignatureImage}
                      />
                    </label>
                    {signatureImageB64 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureImageB64('');
                          saveSignatureImage('');
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        ✕ Xóa ảnh chữ ký
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      ⚙ Cấu hình CKS
                    </button>
                  </div>
                </div>
              </div>

              {/* Cột phải: Thanh trượt kích thước & Vị trí gợi ý Mẫu 02/BH */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-3">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 gap-2">
                    <span>Kích thước khung chữ ký:</span>
                    <span className="text-indigo-700 font-extrabold">{sigScalePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    value={sigScalePercent}
                    onChange={e => handleScaleSliderChange(Number(e.target.value))}
                    className="w-40 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-600">
                    Đặt nhanh vị trí ký trên Mẫu 02/BH:
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSigBox(prev => ({ ...prev, relX: 0.08, relY: 0.62 }))}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      1. Người lập biểu
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigBox(prev => ({ ...prev, relX: 0.37, relY: 0.62 }))}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      2. Kế toán trưởng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigBox(prev => ({ ...prev, relX: 0.65, relY: 0.62 }))}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 text-slate-700 border border-slate-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      3. Thủ trưởng đơn vị
                    </button>
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
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-black">{previewXmlModal.title}</div>
                  <div className="text-[11px] text-slate-300 font-mono">{previewXmlModal.fileName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewXmlModal.xmlContent);
                    alert('Đã sao chép toàn bộ nội dung XML vào bộ nhớ tạm!');
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
            <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-auto flex-1 leading-relaxed whitespace-pre-wrap break-all">
              {previewXmlModal.xmlContent}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH CHỮ KÝ SỐ SẴN CÓ CỦA WEB APP */}
      {showConfigModal && (
        <ConfigModal onClose={() => setShowConfigModal(false)} initialTab="smartca" />
      )}
    </div>
  );
}

