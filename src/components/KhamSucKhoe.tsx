import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, Settings, Play, Download, CheckCircle2, AlertCircle, XCircle, Search, Home, Building2, FileCode2,
  Trash2, FileText, Send, User, Check, ShieldCheck, Cpu, FileSpreadsheet, Printer, KeyRound
} from 'lucide-react';
import { cn } from '../lib/utils';
import { buildKskXml } from '../lib/kskXmlBuilder';
import { createKskHoSoRecord } from '../lib/kskRecord';
import { buildKskExportAoa, buildKskClsExportAoa, KSK_EXCEL_TEMPLATES, CLS_EXCEL_TEMPLATE } from '../lib/kskExcelTemplates';
import type { KskType } from '../lib/kskSchemas';
import KskConfigModal, { KskConfig } from './KskConfigModal';
import ConfigModal from './ConfigModal';
import KySoModal from './KySoModal';
import KskDynamicForm from './forms/KskDynamicForm';
import { type HoSoRecord } from '../lib/signAndSubmitService';
import { pushKskXml } from '../lib/emrhubService';
import { exportKskToWord, printKskPaper } from '../lib/kskWordExporter';



export default function KhamSucKhoe({ onGoHome }: { onGoHome: () => void }) {
  const [records, setRecords] = useState<HoSoRecord[]>([]);
  const [waitingRecords, setWaitingRecords] = useState<HoSoRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSmartCaConfigOpen, setIsSmartCaConfigOpen] = useState(false);
  const [config, setConfig] = useState<KskConfig | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [kySoMode, setKySoMode] = useState<'sign' | 'submit' | 'sign_then_submit' | null>(null);
  const [kySoCustomRecords, setKySoCustomRecords] = useState<HoSoRecord[] | null>(null);
  
  const [showKskForm, setShowKskForm] = useState<{
    type: KskType;
    recordId?: string;
    waitingId?: string;
    initialData?: any;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ksk_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  const processExcelFile = (
    file: File,
    templateLabel: string = 'AUTO',
    opts?: { append?: boolean; openPaperAfterImport?: boolean; toWaitingList?: boolean }
  ) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });

      // Đọc thêm sheet DM_CanLamSang (nếu có) để gắn kết quả CLS vào đúng bệnh nhân
      const clsByCccd = new Map<string, any[]>();
      const clsByName = new Map<string, any[]>();
      const clsSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('canlamsang'));
      if (clsSheetName && wb.Sheets[clsSheetName]) {
        const clsRaw = XLSX.utils.sheet_to_json(wb.Sheets[clsSheetName], { header: 1, defval: '' }) as any[][];
        if (clsRaw.length > 2) {
          clsRaw.slice(2).forEach(cRow => {
            const hoTen = String(cRow[1] ?? '').trim();
            const soCccd = String(cRow[2] ?? '').trim();
            const col3 = String(cRow[3] ?? '').trim(); // Tên chỉ số hoặc Mã chỉ số
            const col4 = String(cRow[4] ?? '').trim(); // DV Cận lâm sàng / Mã chỉ số
            const donViDo = String(cRow[5] ?? '').trim();
            const giaTri = String(cRow[6] ?? '').trim();
            const moTa = String(cRow[7] ?? '').trim();
            const ketLuan = String(cRow[8] ?? '').trim();
            if ((!hoTen && !soCccd) || (!giaTri && !moTa && !ketLuan)) return;
            const item = {
              MA_DICH_VU: col4 || col3,
              MA_CHI_SO: col4 || col3,
              TEN_CHI_SO: col3,
              DON_VI_DO: donViDo,
              GIA_TRI: giaTri,
              MO_TA: moTa,
              KET_LUAN: ketLuan,
            };
            if (soCccd) {
              const list = clsByCccd.get(soCccd) || [];
              list.push(item);
              clsByCccd.set(soCccd, list);
            }
            if (hoTen) {
              const keyName = hoTen.toUpperCase();
              const list = clsByName.get(keyName) || [];
              list.push(item);
              clsByName.set(keyName, list);
            }
          });
        }
      }

      // Hàm nhận diện loại KskType từ tên sheet hoặc các cột trong sheet
      const detectKskTypeFromSheet = (sheetName: string, keys: any[]): KskType => {
        if (templateLabel === 'Trên 18') return 'Adult';
        if (templateLabel === 'Từ 6-18') return 'Minor';
        if (templateLabel === 'Dưới 6') return 'ChildUnder';
        const lower = sheetName.toLowerCase();
        if (lower.includes('duoi 6') || lower.includes('dưới 6') || (lower.includes('duoi') && !lower.includes('18'))) {
          return 'ChildUnder';
        }
        if (lower.includes('6') && (lower.includes('18') || lower.includes('duoi') || lower.includes('dưới'))) {
          return 'Minor';
        }
        if (lower.includes('trên 18') || lower.includes('tren 18')) {
          return 'Adult';
        }
        const keySet = new Set(keys.map(k => String(k || '').trim()));
        if (keySet.has('SINH_NON') || keySet.has('VONG_DAU') || keySet.has('MOI_QUAN_HE_VOI_TRE')) return 'ChildUnder';
        if (keySet.has('NHI_KHOA_TUAN_HOAN') || keySet.has('SAN_KHOA') || keySet.has('HO_TEN_NGH')) return 'Minor';
        return 'Adult';
      };

      // Tìm danh sách các sheet cần đọc
      let targetSheets: string[] = [];
      if (templateLabel !== 'AUTO') {
        const matched = wb.SheetNames.find(n => {
          const lower = n.toLowerCase();
          if (templateLabel === 'Trên 18') return lower.includes('trên 18') || lower.includes('tren 18') || (n.includes('18') && !n.includes('Duoi') && !lower.includes('dưới'));
          if (templateLabel === 'Từ 6-18') return n.includes('6') && (n.includes('18') || n.includes('Duoi') || lower.includes('dưới'));
          if (templateLabel === 'Dưới 6') return lower.includes('duoi 6') || lower.includes('dưới 6') || (n.includes('Duoi') && !n.includes('18'));
          return false;
        });
        if (matched) targetSheets = [matched];
      }

      if (targetSheets.length === 0) {
        // Tự động tìm mọi sheet dữ liệu KSK hợp lệ trong file Excel
        targetSheets = wb.SheetNames.filter(n => {
          const lower = n.toLowerCase();
          if (lower.includes('canlamsang') || lower.includes('danhmuc') || lower.includes('dm_') || lower.includes('huongdan')) {
            return false;
          }
          return (
            lower.includes('18') ||
            lower.includes('duoi 6') ||
            lower.includes('dưới 6') ||
            lower.includes('ksk') ||
            wb.SheetNames.length === 1
          );
        });
        if (targetSheets.length === 0 && wb.SheetNames.length > 0) {
          targetSheets = [wb.SheetNames[0]];
        }
      }

      const allParsedRecords: HoSoRecord[] = [];

      targetSheets.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        if (!ws) return;
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        if (rawData.length <= 1) return;

        // Tự động tìm dòng chứa mã trường (MA_CSKCB / HO_TEN / SO_CCCD) ở dòng 1 hoặc dòng 2
        let keyRowIdx = 1;
        if (
          rawData[0]?.some((c: any) => ['MA_CSKCB', 'HO_TEN', 'HOTEN', 'HO_VA_TEN', 'SO_CCCD'].includes(String(c || '').trim())) &&
          !rawData[1]?.some((c: any) => ['MA_CSKCB', 'HO_TEN', 'HOTEN', 'HO_VA_TEN', 'SO_CCCD'].includes(String(c || '').trim()))
        ) {
          keyRowIdx = 0;
        }
        const keys = rawData[keyRowIdx] || [];
        const headerRow0 = rawData[0] || [];
        const hasValidKeys = keys.some((c: any) =>
          ['MA_CSKCB', 'HO_TEN', 'HOTEN', 'HO_VA_TEN', 'SO_CCCD', 'NGAY_SINH'].includes(String(c || '').trim())
        );
        if (!hasValidKeys) return;

        // Tìm cột Họ tên dự phòng từ dòng tiêu đề tiếng Việt nếu cột mã bị khuyết
        const fallbackHoTenColIdx = keys.findIndex((k: any, idx: number) => {
          const ks = String(k || '').trim().toUpperCase();
          const h0 = String(headerRow0[idx] || '').trim().toLowerCase();
          return (
            ks === 'HO_TEN' ||
            ks === 'HOTEN' ||
            ks === 'HO_VA_TEN' ||
            (h0.includes('họ và tên') && !h0.includes('giám hộ') && !h0.includes('kết luận')) ||
            (h0.includes('họ tên') && !h0.includes('giám hộ') && !h0.includes('kết luận'))
          );
        });

        const kskType = detectKskTypeFromSheet(sheetName, keys);

        const dataRows = rawData.slice(keyRowIdx + 1).filter(row => {
          if (!row.some(cell => cell !== '' && cell !== null && cell !== undefined)) return false;
          const c0 = String(row[0] ?? '').trim().toLowerCase();
          const c1 = String(row[1] ?? '').trim().toLowerCase();
          const c4 = String(row[4] ?? '').trim().toLowerCase();
          if (c0 === 'số thứ tự' || c1.includes('ghi mã cơ sở') || c4.includes('nhập họ tên')) return false;
          return true;
        });

        dataRows.forEach((row, index) => {
          const obj: any = {};
          let seenDienThoai = false;
          keys.forEach((rawKey: string, i: number) => {
            const k = String(rawKey || '').trim();
            if (!k) return;
            if (k === 'DIEN_THOAI') {
              if (!seenDienThoai) {
                seenDienThoai = true;
                obj['DIEN_THOAI'] = row[i];
              } else if (row[i] !== '' && row[i] !== undefined) {
                obj['DIEN_THOAI_NGH'] = row[i];
                if (!obj['DIEN_THOAI']) obj['DIEN_THOAI'] = row[i];
              }
              return;
            }
            obj[k] = row[i];
          });

          if (!obj.HO_TEN && fallbackHoTenColIdx >= 0 && row[fallbackHoTenColIdx]) {
            obj.HO_TEN = row[fallbackHoTenColIdx];
          }

          const cccdKey = String(obj.SO_CCCD ?? '').trim();
          const nameKey = String(obj.HO_TEN ?? '').trim().toUpperCase();
          const matchedCls = (cccdKey && clsByCccd.get(cccdKey)) || (nameKey && clsByName.get(nameKey));
          if (matchedCls && matchedCls.length > 0) {
            obj.CLS = matchedCls;
            obj.HAS_CLS = '1';
          }

          allParsedRecords.push(
            createKskHoSoRecord(obj, kskType, { id: `${Date.now()}_${sheetName}_${index}`, source: 'excel' })
          );
        });
      });

      if (allParsedRecords.length > 0) {
        if (opts?.toWaitingList) {
          setWaitingRecords(prev => (opts?.append ? [...prev, ...allParsedRecords] : allParsedRecords));
          const first = allParsedRecords[0];
          setShowKskForm({
            type: ((first as any).kskType || first.rawData?.TYPE || 'Adult') as KskType,
            waitingId: first.id,
            recordId: undefined,
            initialData: first.rawData,
          });
          return;
        }

        setRecords(prev => {
          const next = opts?.append ? [...prev, ...allParsedRecords] : allParsedRecords;
          setSelectedIds(new Set(next.map(r => r.id)));
          return next;
        });
        setActiveTab('preview');
        if (opts?.openPaperAfterImport) {
          const first = allParsedRecords[0];
          setShowKskForm({
            type: ((first as any).kskType || first.rawData?.TYPE || 'Adult') as KskType,
            recordId: first.id,
            initialData: first.rawData,
          });
        }
      } else {
        alert('Không tìm thấy dòng dữ liệu Khám sức khỏe hợp lệ trong file Excel đã chọn. Vui lòng kiểm tra file theo đúng mẫu Excel (.xlsm/.xlsx).');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    templateLabel: string = 'AUTO',
    opts?: { append?: boolean; openPaperAfterImport?: boolean; toWaitingList?: boolean }
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file, templateLabel, opts);
    e.target.value = '';
  };

  /** Bước 2: Chuyển danh sách Excel thành XML chuẩn 12 file con hàng loạt & cho phép tải về */
  const handleConvertBatchToXml = (alsoDownload: boolean = false) => {
    if (records.length === 0) return;
    const targetIds = selectedIds.size > 0 ? selectedIds : new Set(records.map(r => r.id));
    let convertedCount = 0;
    const updatedRecords = records.map(r => {
      if (!targetIds.has(r.id)) return r;
      convertedCount++;
      const kType = ((r as any).kskType || r.rawData?.TYPE || 'Adult') as KskType;
      return createKskHoSoRecord(r.rawData, kType, { id: r.id, source: r.source || 'excel' });
    });
    setRecords(updatedRecords);
    setSelectedIds(targetIds);
    if (alsoDownload) {
      const selectedList = updatedRecords.filter(r => targetIds.has(r.id));
      const rawDataArray = selectedList.map(r => r.rawData);
      const xmlStr = buildKskXml(rawDataArray, rawDataArray[0]?.MA_GTIN_CSKCB || rawDataArray[0]?.MA_CSKCB || '00000');
      const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KSK_BATCH_${rawDataArray[0]?.MA_CSKCB || 'XML'}_${selectedList.length}HS_${new Date().getTime()}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert(`Đã chuyển đổi & chuẩn hóa thành công ${convertedCount} hồ sơ từ Excel sang cấu trúc XML 12 bảng chuẩn Bộ Y Tế! Bạn có thể bấm "Bước 3: Ký số hàng loạt" hoặc "Bước 4: Đẩy cổng API".`);
    }
  };

  const handleExportXML = () => {
    if (records.length === 0) return;
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    if (selectedRecords.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bản ghi để xuất XML');
      return;
    }
    const rawDataArray = selectedRecords.map(r => r.rawData);
    const xmlStr =
      selectedRecords.length === 1 && selectedRecords[0].trangThai === 'SIGNED' && selectedRecords[0].xmlContent?.includes('<KHAMSUCKHOE')
        ? selectedRecords[0].xmlContent
        : buildKskXml(rawDataArray, rawDataArray[0]?.MA_GTIN_CSKCB || rawDataArray[0]?.MA_CSKCB || '00000');
    const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSK_${rawDataArray[0]?.MA_CSKCB || 'XML'}_${new Date().getTime()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleXml = (r: HoSoRecord) => {
    const xmlStr =
      r.trangThai === 'SIGNED' && r.xmlContent?.includes('<KHAMSUCKHOE')
        ? r.xmlContent
        : buildKskXml([r.rawData], r.rawData?.MA_GTIN_CSKCB || r.rawData?.MA_CSKCB || '00000');
    const blob = new Blob([xmlStr], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSK_${(r.rawData?.HO_TEN || r.hoTen || 'HOSO').replace(/\s+/g, '_')}_${r.rawData?.SO_CCCD || r.id}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [isPushing, setIsPushing] = useState(false);

  const handlePushEmrhub = async () => {
    if (!config?.senderId || !config?.privateKey || !config?.password) {
      alert('Vui lòng cấu hình API EMRHUB (mã GLN sender_id, mật khẩu, Private Key) trước khi đẩy.');
      setIsConfigOpen(true);
      return;
    }
    const targets = records.filter(r => selectedIds.has(r.id));
    if (targets.length === 0) return;

    setIsPushing(true);
    const results = new Map<string, HoSoRecord>();
    let okCount = 0;
    for (const r of targets) {
      const hasError = ((r as any).kskIssues || []).some((i: any) => i.level === 'error');
      if (hasError) {
        results.set(r.id, { ...r, trangThai: 'INVALID_FORMAT', errorMessage: 'Dữ liệu còn lỗi, chưa đẩy.' });
        continue;
      }
      try {
        const xml = r.xmlContent || buildKskXml([r.rawData], r.rawData?.MA_CSKCB || '00000');
        const res = await pushKskXml(config, xml);
        if (res.ok) {
          okCount++;
          results.set(r.id, { ...r, trangThai: 'SUBMITTED', errorMessage: undefined, maGD: res.syncCode || res.msgId });
        } else {
          results.set(r.id, { ...r, trangThai: 'SUBMIT_FAILED', errorMessage: `${res.code ?? res.httpStatus}: ${res.message || 'Cổng từ chối hồ sơ'}` });
        }
      } catch (e: any) {
        results.set(r.id, { ...r, trangThai: 'SUBMIT_FAILED', errorMessage: e?.message || String(e) });
      }
    }
    setRecords(prev => prev.map(r => results.get(r.id) || r));
    setIsPushing(false);
    alert(`Đã đẩy thành công ${okCount}/${targets.length} hồ sơ lên EMRHUB.`);
  };

  const handleExportExcel = () => {
    if (records.length === 0) return;
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    if (selectedRecords.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bản ghi để xuất Excel');
      return;
    }

    const wb = XLSX.utils.book_new();

    const grouped = {
      'Adult': selectedRecords.filter(r => r.kskType === 'Adult'),
      'Minor': selectedRecords.filter(r => r.kskType === 'Minor'),
      'ChildUnder': selectedRecords.filter(r => r.kskType === 'ChildUnder'),
    };

    // Xuất đúng 100% cột của mẫu quy định, cột nào chưa có dữ liệu thì để trống (không bỏ cột)
    (['Adult', 'Minor', 'ChildUnder'] as const).forEach(tp => {
      const group = grouped[tp];
      if (group.length === 0) return;
      const aoa = buildKskExportAoa(tp, group.map(r => r.rawData || {}));
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, KSK_EXCEL_TEMPLATES[tp].sheetName);
    });

    const clsAoa = buildKskClsExportAoa(selectedRecords.map(r => r.rawData || {}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clsAoa), CLS_EXCEL_TEMPLATE.sheetName);

    XLSX.writeFile(wb, `Export_KSK_${new Date().getTime()}.xlsx`);
  };

  const handleKySoComplete = (updated: HoSoRecord[]) => {
    setRecords(prev => {
      const map = new Map(prev.map(r => [r.id, r]));
      updated.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
  };

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

  const selectedRecords = records.filter(r => selectedIds.has(r.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onGoHome}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-semibold bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-lg"
            >
              <Home className="w-4 h-4" />
              Trang Chủ
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800 leading-tight">KHÁM SỨC KHỎE (EMRHUB)</h1>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hỗ trợ 3 biểu mẫu XML</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSmartCaConfigOpen(true)}
              className="px-3.5 py-2 rounded-xl text-sm font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center gap-2 cursor-pointer transition-colors"
              title="Cài đặt Chữ ký số VNPT SmartCA (Lấy CKS & Serial) và USB Token"
            >
              <KeyRound className="w-4 h-4" />
              Cài đặt Ký số (SmartCA / Token)
            </button>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="px-3.5 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
              title="Cấu hình tài khoản liên thông API EMRHUB (Mã GLN sender_id, mật khẩu, Private Key)"
            >
              <Settings className="w-4 h-4" />
              Cấu hình API EMRHUB
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
              activeTab === 'upload'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            Nhập file Excel (.xlsm/.xlsx)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            disabled={records.length === 0}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
              activeTab === 'preview'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
              records.length === 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            Dữ liệu & Xử lý ({records.length})
          </button>

          {/* Nút Import Excel nhanh luôn hiển thị ở mọi màn hình */}
          <label
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 shadow-xs cursor-pointer"
            title="Chọn file Excel (.xlsm/.xlsx) theo mẫu để tự động nhận diện và nạp danh sách"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel (.xlsm/.xlsx)
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xlsm"
              onChange={(e) => handleFileUpload(e, 'AUTO')}
            />
          </label>

          <label
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 shadow-xs cursor-pointer"
            title="Import danh sách bệnh nhân đợi khám (chỉ cần thông tin hành chính theo mẫu Excel) vào cột bên trái để kích chọn khám từng ca"
          >
            <User className="w-4 h-4" />
            Import DS Đợi Khám (Cột trái)
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xlsm"
              onChange={(e) => handleFileUpload(e, 'AUTO', { toWaitingList: true })}
            />
          </label>

          <div className="flex-1" />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowKskForm({ type: 'Adult' })}
              className="px-3.5 py-2 rounded-lg text-sm font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Mẫu 03 (Trên 18 tuổi)
            </button>
            <button
              onClick={() => setShowKskForm({ type: 'Minor' })}
              className="px-3.5 py-2 rounded-lg text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Mẫu 02 (6 - 18 tuổi)
            </button>
            <button
              onClick={() => setShowKskForm({ type: 'ChildUnder' })}
              className="px-3.5 py-2 rounded-lg text-sm font-bold transition-all bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Mẫu 01 (Dưới 6 tuổi)
            </button>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Import dữ liệu Khám sức khỏe từ File Excel (.xlsm / .xlsx)
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Quy trình chuẩn: <b>1. Import Excel</b> ➔ <b>2. Chuyển thành XML (hoặc In hàng loạt theo Mẫu KSK)</b> ➔ <b>3. Ký số hàng loạt</b> ➔ <b>4. Đẩy cổng API EMRHUB</b>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer">
                  <User className="w-4 h-4" />
                  Import DS Bệnh Nhân Đợi Khám (Cột Trái Mẫu KSK)
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xlsm"
                    onChange={(e) => handleFileUpload(e, 'AUTO', { toWaitingList: true })}
                  />
                </label>
                <label className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Import File Excel Đầy Đủ (.xlsm/.xlsx)
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xlsm"
                    onChange={(e) => handleFileUpload(e, 'AUTO')}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Trên 18', sub: 'Mẫu số 03 (Từ đủ 18 tuổi trở lên)', file: 'Import_KSK_Tren 18.xlsm' },
                { label: 'Từ 6-18', sub: 'Mẫu số 02 (Từ 06 đến dưới 18 tuổi)', file: 'Import_KSK_6 den Duoi 18.xlsm' },
                { label: 'Dưới 6', sub: 'Mẫu số 01 (Trẻ em dưới 06 tuổi)', file: 'Import_KSK_Duoi 6.xlsm' }
              ].map((tpl, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-600 cursor-pointer hover:bg-emerald-50/40 hover:border-emerald-500 hover:text-emerald-700 transition-all text-center flex-1">
                    <FileUp className="w-9 h-9 mb-2 text-emerald-600" />
                    <span className="font-bold text-base">Import Excel Mẫu {tpl.label}</span>
                    <span className="text-xs mt-1 text-slate-500">{tpl.sub}</span>
                    <span className="mt-3 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                      Chọn file .xlsm / .xlsx
                    </span>
                    <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, tpl.label)} />
                  </label>
                  <a href={`/templates/${tpl.file}`} download className="flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                    <Download className="w-4 h-4" /> Tải file Excel mẫu gốc {tpl.label}
                  </a>
                </div>
              ))}
            </div>
            {fileName && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm flex items-center justify-between">
                <span>Đã nạp: <b>{fileName}</b></span>
                <span className="text-xs bg-emerald-100 px-2 py-1 rounded-md font-bold">{records.length} hồ sơ</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)]">
            {/* THANH QUY TRÌNH 4 BƯỚC: IMPORT EXCEL -> CHUYỂN XML -> KÝ SỐ HÀNG LOẠT -> ĐẨY CỔNG API + IN HÀNG LOẠT */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                {/* Bước 1 */}
                <div className="bg-white border border-teal-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black uppercase text-teal-600">Bước 1: Dữ liệu Excel</div>
                    <div className="text-xs font-bold text-slate-700">Đã nạp {records.length} hồ sơ</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
                      <FileUp className="w-3.5 h-3.5" /> Import mới
                      <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, 'AUTO')} />
                    </label>
                    <label
                      className="px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold cursor-pointer"
                      title="Nạp nối tiếp thêm file Excel vào danh sách hiện tại"
                    >
                      + Thêm file
                      <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, 'AUTO', { append: true })} />
                    </label>
                  </div>
                </div>

                {/* Bước 2 */}
                <div className="bg-white border border-blue-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black uppercase text-blue-600">Bước 2: Chuyển thành XML</div>
                    <div className="text-xs font-bold text-slate-700">Chuẩn 12 bảng BYT ({selectedIds.size} chọn)</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleConvertBatchToXml(false)}
                      disabled={selectedIds.size === 0}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Chuyển toàn bộ danh sách Excel đã chọn sang cấu trúc XML chuẩn Bộ Y Tế"
                    >
                      <FileCode2 className="w-3.5 h-3.5" /> Chuyển XML
                    </button>
                    <button
                      onClick={handleExportXML}
                      disabled={selectedIds.size === 0}
                      className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Tải file XML của danh sách đã chọn về máy"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải XML
                    </button>
                  </div>
                </div>

                {/* Bước 3 */}
                <div className="bg-white border border-indigo-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black uppercase text-indigo-600">Bước 3: Ký số XML (Token / SmartCA)</div>
                    <div className="text-xs font-bold text-slate-700">
                      Đã ký XML: {records.filter(r => r.trangThai === 'SIGNED' || r.trangThai === 'SUBMITTED').length}/{records.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (selectedIds.size === 0) {
                          alert('Vui lòng chọn ít nhất 1 hồ sơ để ký số XML.');
                          return;
                        }
                        setKySoCustomRecords(null);
                        setKySoMode('sign');
                      }}
                      disabled={selectedIds.size === 0}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Mở bảng Ký số XML (chọn USB Token hoặc VNPT SmartCA) cho các hồ sơ đã chọn"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Ký đã chọn ({selectedIds.size})
                    </button>
                    <button
                      onClick={() => {
                        if (records.length === 0) return;
                        setSelectedIds(new Set(records.map(r => r.id)));
                        setKySoCustomRecords(records);
                        setKySoMode('sign');
                      }}
                      disabled={records.length === 0}
                      className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                      title="Chọn tất cả và mở bảng Ký số XML (USB Token hoặc VNPT SmartCA)"
                    >
                      Ký tất cả ({records.length})
                    </button>
                  </div>
                </div>

                {/* Bước 4 */}
                <div className="bg-white border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <div className="text-[11px] font-black uppercase text-emerald-600">Bước 4: Gửi XML (Đẩy cổng)</div>
                    <div className="text-xs font-bold text-slate-700">
                      Đã gửi: {records.filter(r => r.trangThai === 'SUBMITTED').length}/{records.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (selectedIds.size === 0) {
                          alert('Vui lòng chọn hồ sơ đã ký ở Bước 3 để đẩy cổng.');
                          return;
                        }
                        const signedTargets = records.filter(r => selectedIds.has(r.id) && r.trangThai === 'SIGNED');
                        if (signedTargets.length === 0) {
                          alert('Các hồ sơ đang chọn chưa được ký số ở Bước 3! Hãy bấm "Bước 3: Ký số XML" trước, hoặc bấm nút "Ký & Gửi (Token/SmartCA)" bên cạnh để ký và gửi chung.');
                          return;
                        }
                        setKySoCustomRecords(signedTargets);
                        setKySoMode('submit');
                      }}
                      disabled={selectedIds.size === 0 || isPushing}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Gửi các hồ sơ đã ký số ở Bước 3 lên Cổng EMRHUB Quốc Gia"
                    >
                      <Send className="w-3.5 h-3.5" /> Gửi đã ký (Bước 3)
                    </button>
                    <button
                      onClick={() => {
                        if (selectedIds.size === 0) {
                          alert('Vui lòng chọn ít nhất 1 hồ sơ để Ký & Gửi.');
                          return;
                        }
                        setKySoCustomRecords(null);
                        setKySoMode('sign_then_submit');
                      }}
                      disabled={selectedIds.size === 0}
                      className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Ký số và Gửi chung bằng USB Token hoặc VNPT SmartCA"
                    >
                      <Play className="w-3 h-3" /> Ký & Gửi (Token/SmartCA)
                    </button>
                  </div>
                </div>
              </div>

              {/* Thanh công cụ Kiểm tra trên Mẫu KSK & In hàng loạt theo mẫu quy định */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800">Danh sách hồ sơ ({records.length})</h3>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md">
                    Đã chọn: {selectedIds.size} hồ sơ
                  </span>
                  {fileName && (
                    <span className="text-xs text-slate-500 font-medium">
                      File nguồn: <b>{fileName}</b>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const first = records.find(r => selectedIds.has(r.id)) || records[0];
                      if (!first) return;
                      setShowKskForm({
                        type: ((first as any).kskType || first.rawData?.TYPE || 'Adult') as KskType,
                        recordId: first.id,
                        initialData: first.rawData,
                      });
                    }}
                    disabled={records.length === 0}
                    className="px-3.5 py-1.5 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    title="Mở tờ giấy Mẫu KSK Phụ lục XXIV để kiểm tra và chỉnh sửa từng hồ sơ trong danh sách Excel"
                  >
                    <FileText className="w-4 h-4" />
                    Xem & Sửa trên Mẫu KSK ({records.length} hồ sơ)
                  </button>

                  <button
                    onClick={() => {
                      const targets = records.filter(r => selectedIds.has(r.id));
                      if (targets.length === 0) return;
                      printKskPaper(
                        targets.map(r => ({
                          rawData: r.rawData,
                          type: ((r as any).kskType || r.rawData?.TYPE || 'Adult') as KskType,
                        }))
                      );
                    }}
                    disabled={selectedIds.size === 0}
                    className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    title="In hàng loạt toàn bộ các hồ sơ đã chọn theo đúng Mẫu KSK quy định (Mẫu 01, 02, 03 - khổ A4)"
                  >
                    <Printer className="w-4 h-4" />
                    In Hàng Loạt theo Mẫu KSK ({selectedIds.size} phiếu A4)
                  </button>

                  <button
                    onClick={() => {
                      const targets = records.filter(r => selectedIds.has(r.id));
                      if (targets.length === 0) return;
                      exportKskToWord(
                        targets.map(r => ({
                          rawData: r.rawData,
                          type: ((r as any).kskType || r.rawData?.TYPE || 'Adult') as KskType,
                        }))
                      );
                    }}
                    disabled={selectedIds.size === 0}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    title="Xuất các hồ sơ đã chọn ra file Word (.doc) đúng loại mẫu Phụ lục XXIV (Mẫu 01, 02, 03)"
                  >
                    <FileText className="w-4 h-4" />
                    Xuất Word Hàng Loạt ({selectedIds.size})
                  </button>

                  <button
                    onClick={handleExportExcel}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-xs hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất lại Excel
                  </button>

                  <button
                    onClick={() => {
                      setRecords([]);
                      setSelectedIds(new Set());
                      setFileName('');
                      setActiveTab('upload');
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-xs hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa danh sách
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 shadow-sm">
                    <th className="p-3 border-b border-r w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 w-4 h-4 text-emerald-600"
                        checked={selectedIds.size === records.length && records.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 border-b border-r font-semibold w-12 text-center">STT</th>
                    <th className="p-3 border-b border-r font-semibold w-44">Thao tác (Mẫu / Word / XML)</th>
                    <th className="p-3 border-b border-r font-semibold">Trạng thái XML</th>
                    <th className="p-3 border-b border-r font-semibold">Họ tên</th>
                    <th className="p-3 border-b border-r font-semibold text-center">Năm sinh</th>
                    <th className="p-3 border-b border-r font-semibold">Mẫu KSK</th>
                    <th className="p-3 border-b border-r font-semibold">Mã CSKCB</th>
                    <th className="p-3 border-b border-r font-semibold">CCCD</th>
                    <th className="p-3 border-b border-r font-semibold">Giới tính</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày vào</th>
                    <th className="p-3 border-b font-semibold w-48">Lỗi & Thông báo</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const rowType = ((r as any).kskType || (r.rawData.TYPE as KskType) || 'Adult') as KskType;
                    const mauBadge =
                      rowType === 'ChildUnder'
                        ? 'Mẫu 01 (<6T)'
                        : rowType === 'Minor'
                        ? 'Mẫu 02 (6-18T)'
                        : 'Mẫu 03 (≥18T)';
                    const rawNs = String(r.rawData.NGAY_SINH || '').trim();
                    const namSinh = rawNs.match(/^(\d{4})/)?.[1] || rawNs.match(/(\d{4})$/)?.[1] || rawNs || '---';
                    return (
                    <tr 
                      key={r.id} 
                      className={cn("hover:bg-slate-50 cursor-pointer", selectedIds.has(r.id) && "bg-emerald-50/50", (r as any).kskErrors?.length > 0 && "bg-rose-50/30")}
                      onClick={() => toggleSelect(r.id)}
                    >
                      <td className="p-3 border-b border-r text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 w-4 h-4 text-emerald-600"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="p-3 border-b border-r text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-b border-r text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setShowKskForm({ type: rowType, recordId: r.id, initialData: r.rawData })}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                            title="Mở biểu mẫu Phụ lục XXIV để xem & chỉnh sửa trực tiếp"
                          >
                            Mẫu KSK / Sửa
                          </button>
                          <button
                            onClick={() => printKskPaper([{ rawData: r.rawData, type: rowType }])}
                            title="In phiếu Khám sức khỏe này (A4)"
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-semibold border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" /> In
                          </button>
                          <button
                            onClick={() => exportKskToWord([{ rawData: r.rawData, type: rowType }])}
                            title="Xuất phiếu Khám sức khỏe ra Word (.doc) theo đúng mẫu Phụ lục XXIV"
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" /> Word
                          </button>
                          <button
                            onClick={() => handleDownloadSingleXml(r)}
                            title="Tải XML của bản ghi này"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded text-xs font-semibold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> XML
                          </button>
                        </div>
                      </td>
                      <td className="p-3 border-b border-r">
                        {r.trangThai === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã gửi XML
                          </span>
                        ) : r.trangThai === 'SIGNED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" /> Đã ký số XML
                          </span>
                        ) : r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Lỗi xử lý
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                            <FileCode2 className="w-3.5 h-3.5" /> Chưa ký XML
                          </span>
                        )}
                      </td>
                      <td className="p-3 border-b border-r font-bold text-slate-900">{r.rawData.HO_TEN}</td>
                      <td className="p-3 border-b border-r text-center font-mono font-bold text-slate-700">{namSinh}</td>
                      <td className="p-3 border-b border-r text-xs font-bold text-slate-700">{mauBadge}</td>
                      <td className="p-3 border-b border-r">{r.rawData.MA_CSKCB}</td>
                      <td className="p-3 border-b border-r">{r.rawData.SO_CCCD}</td>
                      <td className="p-3 border-b border-r text-center">{r.rawData.GIOI_TINH === '1' ? 'Nam' : r.rawData.GIOI_TINH === '2' ? 'Nữ' : r.rawData.GIOI_TINH}</td>
                      <td className="p-3 border-b border-r font-mono text-xs">{r.rawData.NGAY_VAO}</td>
                      <td className="p-3 border-b text-xs">
                        {(r as any).kskErrors && (r as any).kskErrors.length > 0 ? (
                          <div className="flex flex-col gap-1 text-rose-600 font-medium">
                            {(r as any).kskErrors.map((err: string, eIdx: number) => (
                              <div key={eIdx} className="flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0"/> {err}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hợp lệ</span>
                        )}
                        {r.errorMessage && <div className="text-rose-600 font-bold mt-1">Lỗi: {r.errorMessage}</div>}
                        {r.trangThai === 'SUBMITTED' && <div className="text-emerald-600 font-bold mt-1">Đã đẩy EMRHUB</div>}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <KskConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        onSave={(newConfig) => setConfig(newConfig)} 
      />

      {isSmartCaConfigOpen && (
        <ConfigModal
          initialTab="smartca"
          onClose={() => setIsSmartCaConfigOpen(false)}
        />
      )}

      {kySoMode && (
        <KySoModal
          records={kySoCustomRecords || selectedRecords}
          mode={kySoMode}
          onClose={() => {
            setKySoMode(null);
            setKySoCustomRecords(null);
          }}
          onComplete={handleKySoComplete}
          onOpenEmrhubConfig={() => setIsConfigOpen(true)}
        />
      )}

      {showKskForm && (
        <KskDynamicForm
          type={showKskForm.type}
          initialData={showKskForm.initialData}
          waitingRecords={waitingRecords}
          currentWaitingId={showKskForm.waitingId}
          onImportWaitingExcelFile={(file) => {
            processExcelFile(file, 'AUTO', { toWaitingList: true });
          }}
          onSelectWaitingRecord={(waitingRec) => {
            const wType = ((waitingRec as any).kskType || waitingRec.rawData?.TYPE || showKskForm.type || 'Adult') as KskType;
            setShowKskForm({
              type: wType,
              waitingId: waitingRec.id,
              recordId: undefined,
              initialData: waitingRec.rawData,
            });
          }}
          allRecords={records}
          currentRecordId={showKskForm.recordId}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onImportExcelFile={(file) => {
            processExcelFile(file, 'AUTO', { openPaperAfterImport: true });
          }}
          onStartNewCase={(preserveOrgData) => {
            setShowKskForm({
              type: showKskForm.type,
              recordId: undefined,
              waitingId: undefined,
              initialData: preserveOrgData || {},
            });
          }}
          onSaveCaseWithSignChoice={async (data, signXmlNow) => {
            let savedRecord = createKskHoSoRecord(data, showKskForm.type, {
              id: showKskForm.recordId,
              source: 'manual',
            });
            savedRecord = { ...savedRecord, trangThai: 'DRAFT' };

            // 1. Đẩy ca vừa hoàn tất sang Danh sách Đã hoàn thành bên phải
            setRecords(prev => {
              const exists = prev.some(r => r.id === savedRecord.id);
              return exists
                ? prev.map(r => (r.id === savedRecord.id ? savedRecord : r))
                : [...prev, savedRecord];
            });
            setSelectedIds(prev => new Set([...Array.from(prev), savedRecord.id]));

            // Nếu người dùng chọn "YES — Ký số XML", mở bảng KySoModal (USB Token / VNPT SmartCA) cho ca này
            if (signXmlNow) {
              setKySoCustomRecords([savedRecord]);
              setKySoMode('sign');
            }

            // 2. Nếu ca này lấy từ Danh sách Đợi khám (bên trái), rút khỏi danh sách bên trái và nạp ca đợi tiếp theo
            const finishedWaitingId = showKskForm.waitingId;
            const remainingWaiting = finishedWaitingId
              ? waitingRecords.filter(w => w.id !== finishedWaitingId)
              : waitingRecords;

            if (finishedWaitingId) {
              setWaitingRecords(remainingWaiting);
            }

            if (remainingWaiting.length > 0 && finishedWaitingId) {
              const nextWaiting = remainingWaiting[0];
              const nextType = ((nextWaiting as any).kskType || nextWaiting.rawData?.TYPE || showKskForm.type) as KskType;
              setShowKskForm({
                type: nextType,
                waitingId: nextWaiting.id,
                recordId: undefined,
                initialData: nextWaiting.rawData,
              });
            } else {
              setShowKskForm({
                type: showKskForm.type,
                waitingId: undefined,
                recordId: undefined,
                initialData: {
                  MA_CSKCB: data.MA_CSKCB,
                  MA_GTIN_CSKCB: data.MA_GTIN_CSKCB,
                  NGAY_VAO: data.NGAY_VAO,
                  NGUOI_KET_LUAN: data.NGUOI_KET_LUAN,
                  DIA_DANH_KET_LUAN: data.DIA_DANH_KET_LUAN,
                },
              });
            }
          }}
          onSignBatchFromSidebar={async (signAll) => {
            const targetIds = signAll ? new Set(records.map(r => r.id)) : selectedIds;
            if (targetIds.size === 0) {
              alert('Vui lòng chọn ít nhất 1 ca trong danh sách bên phải để ký số XML.');
              return;
            }
            if (signAll) {
              setSelectedIds(targetIds);
            }
            const toSign = records.filter(r => targetIds.has(r.id));
            setKySoCustomRecords(toSign);
            setKySoMode('sign');
          }}
          onSendXmlFromSidebar={async () => {
            const signedTargets = records.filter(
              r => (selectedIds.size === 0 || selectedIds.has(r.id)) && r.trangThai === 'SIGNED'
            );
            if (signedTargets.length === 0) {
              alert('Chưa có hồ sơ nào ở trạng thái "Đã ký số XML". Vui lòng ký số trước khi gửi.');
              return;
            }
            setKySoCustomRecords(signedTargets);
            setKySoMode('submit');
          }}
          onDownloadXmlFromSidebar={() => {
            handleExportXML();
          }}
          onSelectRecord={(targetRecord, currentFormData) => {
            // Nếu đang sửa 1 ca đã có trong danh sách thì tự động cập nhật dữ liệu mới nhất trước khi chuyển ca
            if (showKskForm.recordId && currentFormData) {
              const existing = records.find(r => r.id === showKskForm.recordId);
              const savedCurrent = createKskHoSoRecord(currentFormData, showKskForm.type, {
                id: showKskForm.recordId,
                source: 'manual',
              });
              if (existing && (existing.trangThai === 'SIGNED' || existing.trangThai === 'SUBMITTED')) {
                savedCurrent.trangThai = existing.trangThai;
              }
              setRecords(prev => prev.map(r => (r.id === showKskForm.recordId ? savedCurrent : r)));
            }
            const nextType = ((targetRecord as any).kskType || targetRecord.rawData?.TYPE || 'Adult') as KskType;
            setShowKskForm({
              type: nextType,
              recordId: targetRecord.id,
              initialData: targetRecord.rawData,
            });
          }}
          onBatchPrintAll={(currentFormData) => {
            let latestRecords = records;
            if (showKskForm.recordId && currentFormData) {
              const existing = records.find(r => r.id === showKskForm.recordId);
              const savedCurrent = createKskHoSoRecord(currentFormData, showKskForm.type, {
                id: showKskForm.recordId,
                source: 'manual',
              });
              if (existing) savedCurrent.trangThai = existing.trangThai;
              latestRecords = records.map(r => (r.id === showKskForm.recordId ? savedCurrent : r));
              setRecords(latestRecords);
            }
            const targets = latestRecords.filter(r => selectedIds.has(r.id));
            const listToPrint = targets.length > 0 ? targets : latestRecords;
            printKskPaper(
              listToPrint.map(r => ({
                rawData: r.rawData,
                type: ((r as any).kskType || r.rawData?.TYPE || 'Adult') as KskType,
              }))
            );
          }}
          onBatchExportWordAll={(currentFormData) => {
            let latestRecords = records;
            if (showKskForm.recordId && currentFormData) {
              const existing = records.find(r => r.id === showKskForm.recordId);
              const savedCurrent = createKskHoSoRecord(currentFormData, showKskForm.type, {
                id: showKskForm.recordId,
                source: 'manual',
              });
              if (existing) savedCurrent.trangThai = existing.trangThai;
              latestRecords = records.map(r => (r.id === showKskForm.recordId ? savedCurrent : r));
              setRecords(latestRecords);
            }
            const targets = latestRecords.filter(r => selectedIds.has(r.id));
            const listToExport = targets.length > 0 ? targets : latestRecords;
            exportKskToWord(
              listToExport.map(r => ({
                rawData: r.rawData,
                type: ((r as any).kskType || r.rawData?.TYPE || 'Adult') as KskType,
              }))
            );
          }}
          onClose={() => {
            setShowKskForm(null);
            if (records.length > 0) setActiveTab('preview');
          }}
          onSave={(data) => {
            if (showKskForm.recordId) {
              const updatedRecord = createKskHoSoRecord(data, showKskForm.type, { id: showKskForm.recordId, source: 'manual' });
              setRecords(prev => prev.map(r => r.id === showKskForm.recordId ? updatedRecord : r));
              setSelectedIds(prev => new Set([...Array.from(prev), updatedRecord.id]));
            } else {
              const newRecord = createKskHoSoRecord(data, showKskForm.type, { source: 'manual' });
              setRecords(prev => [...prev, newRecord]);
              setSelectedIds(prev => new Set([...Array.from(prev), newRecord.id]));
            }
            setShowKskForm(null);
            setActiveTab('preview');
          }}
        />
      )}
    </div>
  );
}
