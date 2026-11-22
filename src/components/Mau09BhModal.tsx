import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Save,
  FileCode2,
  FileSpreadsheet,
  Printer,
  Upload,
  ChevronDown,
  ChevronRight,
  Search,
  PlusSquare,
  MinusSquare,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import {
  Mau09BhRecord,
  MAU09_COST_TABLE_OPTIONS,
  MAU09_TRANGTHAI_OPTIONS,
  compileMau09Adjustments,
  isXml1FieldAdjusted,
  isCostFieldAdjusted,
  isCostRowAdjusted,
  formatDisplayDateTime12,
  normalizeTo12DigitDateTime,
  buildMau09BhXml,
  exportMau09BhToExcel,
  importMau09BhExcelRows,
  printMau09BhPdfWindow,
  recalculateSingleMau09CostRow,
  recalculateAndSyncMau09Prices,
} from '../lib/mau09BhService';
import { Xml3176TableId } from '../lib/xml3176Service';
import { getSavedSignatureSlots } from '../lib/vnptSmartCaService';

interface Mau09BhModalProps {
  initialRecords: Mau09BhRecord[];
  tenCskcb?: string;
  onClose: () => void;
  onSaveRecords: (records: Mau09BhRecord[], syncToXml3176Doc: boolean) => void;
}

export default function Mau09BhModal({
  initialRecords,
  tenCskcb = '',
  onClose,
  onSaveRecords,
}: Mau09BhModalProps) {
  const [draftRecords, setDraftRecords] = useState<Mau09BhRecord[]>(() =>
    initialRecords.map(r => JSON.parse(JSON.stringify(r)))
  );
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Trạng thái đóng/mở 4 phần theo đúng giao diện Tạo Mẫu 09/BH
  const [openSec1, setOpenSec1] = useState<boolean>(true);
  const [openSec2, setOpenSec2] = useState<boolean>(true);
  const [openSec3, setOpenSec3] = useState<boolean>(false);
  const [openSec4, setOpenSec4] = useState<boolean>(true);

  // Bộ lọc Phần 3 (Điều chỉnh thông tin hành chính XML1)
  const [xml1Search, setXml1Search] = useState<string>('');
  const [onlyModifiedXml1, setOnlyModifiedXml1] = useState<boolean>(false);

  // Bộ lọc Phần 4 (Điều chỉnh / hủy chi phí)
  const [selectedCostTable, setSelectedCostTable] = useState<Xml3176TableId | 'ALL'>(() => {
    const firstRec = initialRecords[0];
    if (firstRec) {
      const hasXml3 = firstRec.costRowsDraft.some(r => r.tableId === 'XML3');
      if (hasXml3) return 'XML3';
      const hasXml2 = firstRec.costRowsDraft.some(r => r.tableId === 'XML2');
      if (hasXml2) return 'XML2';
    }
    return 'XML3';
  });
  const [onlyModifiedCost, setOnlyModifiedCost] = useState<boolean>(false);
  const [expandedCostRowIds, setExpandedCostRowIds] = useState<Record<string, boolean>>({});
  const [syncTo3176Doc, setSyncTo3176Doc] = useState<boolean>(true);
  const [syncXml1TotalsOnCalc, setSyncXml1TotalsOnCalc] = useState<boolean>(false);
  const [previewXmlContent, setPreviewXmlContent] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);

  // Gợi ý tên Người lập biểu / Thủ trưởng đơn vị từ 4 ô chữ ký đã lưu
  const signerSuggestions = useMemo(() => {
    const slots = getSavedSignatureSlots();
    const names = slots
      .map(s => (s.signerText || '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, []);

  const currentRec = draftRecords[activeIdx] || draftRecords[0];

  const showTempToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const updateCurrentRecord = (updater: (rec: Mau09BhRecord) => Mau09BhRecord) => {
    setDraftRecords(prev =>
      prev.map((item, idx) => {
        if (idx !== activeIdx) return item;
        const next = updater(item);
        const compiled = compileMau09Adjustments(next.xml1FieldsDraft, next.costRowsDraft);
        return {
          ...next,
          dsXml1Dc: compiled.dsXml1Dc,
          dscpDc: compiled.dscpDc,
          updatedAt: new Date().toISOString(),
          isSigned: false,
          signedXml: undefined,
        };
      })
    );
  };

  // Danh sách dòng hành chính XML1 hiển thị ở Phần 3
  const filteredXml1Drafts = useMemo(() => {
    if (!currentRec) return [];
    const q = xml1Search.trim().toLowerCase();
    return currentRec.xml1FieldsDraft.filter(f => {
      if (onlyModifiedXml1 && !isXml1FieldAdjusted(f)) return false;
      if (!q) return true;
      return (
        f.field.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.originalValue.toLowerCase().includes(q) ||
        f.ttDieuChinh.toLowerCase().includes(q) ||
        f.lyDoDieuChinh.toLowerCase().includes(q)
      );
    });
  }, [currentRec, xml1Search, onlyModifiedXml1]);

  // Danh sách dòng chi phí gốc hiển thị ở Phần 4
  const filteredCostRows = useMemo(() => {
    if (!currentRec) return [];
    return currentRec.costRowsDraft.filter(r => {
      if (selectedCostTable !== 'ALL' && r.tableId !== selectedCostTable) return false;
      if (onlyModifiedCost && !isCostRowAdjusted(r)) return false;
      return true;
    });
  }, [currentRec, selectedCostTable, onlyModifiedCost]);

  // Tính Thành tiền sau điều chỉnh thực tế của 1 dòng chi phí (tự tính theo đơn giá/số lượng đã sửa)
  const getEffectiveRowThanhTienDc = (r: Mau09BhRecord['costRowsDraft'][number]): number => {
    const gocVal = r.thanhTienGoc || 0;
    if (r.withdrawEntireRow || r.trangThai === '1') return 0;
    const recalcRow =
      r.tableId === 'XML2' || r.tableId === 'XML3'
        ? recalculateSingleMau09CostRow(r).nextRow
        : r;
    const ttField =
      recalcRow.fieldDrafts.find(f => f.field === 'THANH_TIEN_BV') ||
      recalcRow.fieldDrafts.find(f => f.field === 'THANH_TIEN_BH') ||
      recalcRow.fieldDrafts.find(f => f.field === 'T_BHTT');
    const dcNum = ttField
      ? Number(String(ttField.ttDieuChinh || '0').replace(/,/g, '.'))
      : gocVal;
    return Number.isFinite(dcNum) ? dcNum : gocVal;
  };

  // Tính Tổng gốc / Tổng ĐC / Chênh lệch cho Phần 4 và đối chiếu Tổng đơn toàn hồ sơ (XML2 + XML3 -> XML1)
  const costTotals = useMemo(() => {
    let tongGoc = 0;
    let tongDc = 0;
    for (const r of filteredCostRows) {
      const gocVal = r.thanhTienGoc || 0;
      tongGoc += gocVal;
      tongDc += getEffectiveRowThanhTienDc(r);
    }
    return {
      tongGoc,
      tongDc,
      chenhLech: tongDc - tongGoc,
    };
  }, [filteredCostRows]);

  // Đối chiếu trực tiếp Tổng tiền toàn hồ sơ (XML1: T_THUOC, T_TONGCHI_BV, T_TONGCHI_BH, T_BHTT, T_BNCCT, T_BNTT)
  const liveHosoTotalsPreview = useMemo(() => {
    if (!currentRec) return null;
    return recalculateAndSyncMau09Prices(currentRec, {
      syncXml1Totals: syncXml1TotalsOnCalc,
    }).totalsComparison;
  }, [currentRec, syncXml1TotalsOnCalc]);

  // Đồng bộ & Tính lại Giá / Thành tiền từng dòng thuốc, DVKT, VTYT (XML2, XML3) và cập nhật Tổng chi phí hồ sơ (XML1)
  const handleRecalculateAndSyncAllPrices = (applyToAllDrafts = false) => {
    let totalRecalcRows = 0;
    let totalSyncedXml1 = 0;

    setDraftRecords(prev =>
      prev.map((rec, idx) => {
        if (!applyToAllDrafts && idx !== activeIdx) return rec;
        const res = recalculateAndSyncMau09Prices(rec, {
          syncXml1Totals: syncXml1TotalsOnCalc,
          defaultReason:
            'Đồng bộ thành tiền và tổng chi phí sau điều chỉnh giá / số lượng / thu hồi chi phí',
        });
        totalRecalcRows += res.recalculatedRowCount;
        totalSyncedXml1 += res.updatedXml1TotalCount;
        return res.record;
      })
    );

    showTempToast(
      `🧮 Đã tính lại thành tiền (${totalRecalcRows} dòng XML2/XML3) và đồng bộ ${totalSyncedXml1} chỉ tiêu Tổng tiền lên Phần 3 (XML1)!`
    );
  };

  // Tính lại thành tiền cho 1 dòng chi phí XML2 / XML3 cụ thể
  const handleRecalculateSingleRow = (sourceRowId: string) => {
    updateCurrentRecord(rec => {
      const nextRows = rec.costRowsDraft.map(cr => {
        if (cr.sourceRowId !== sourceRowId) return cr;
        return recalculateSingleMau09CostRow(
          cr,
          'Cập nhật đồng bộ thành tiền theo đơn giá / số lượng điều chỉnh'
        ).updatedRow;
      });
      const tempRec: Mau09BhRecord = {
        ...rec,
        costRowsDraft: nextRows,
      };
      if (syncXml1TotalsOnCalc) {
        return recalculateAndSyncMau09Prices(tempRec, {
          syncXml1Totals: true,
        }).record;
      }
      return tempRec;
    });
    showTempToast('🧮 Đã tính lại Thành tiền (THANH_TIEN_BV, THANH_TIEN_BH, T_BHTT, T_BNCCT, T_BNTT) và đồng bộ Tổng hồ sơ!');
  };

  const modifiedCounts = useMemo(() => {
    if (!currentRec) return { xml1Count: 0, costCount: 0 };
    const compiled = compileMau09Adjustments(
      currentRec.xml1FieldsDraft,
      currentRec.costRowsDraft
    );
    return {
      xml1Count: compiled.dsXml1Dc.length,
      costCount: compiled.dscpDc.length,
    };
  }, [currentRec]);

  // Nạp file Excel Mẫu 09/BH tải từ Cổng BHXH để tự động điền XML1_ID, ID_CHIPHI, LY_DO, TU_CHOI
  const handleImportGatewayExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = await importMau09BhExcelRows(file);
      if (rows.length === 0) {
        alert('File Excel không có dữ liệu Mẫu 09/BH!');
        return;
      }

      let matchedCount = 0;
      setDraftRecords(prev =>
        prev.map(rec => {
          const matchingRows = rows.filter(r => {
            const rMaLk = String(r.MA_LK || '').trim();
            const rMaBn = String(r.MA_BENH_NHAN || '').trim();
            const rMaThe = String(r.MA_THE_BHYT || '').trim();
            return (
              (rMaLk && rMaLk === rec.ttXml1.MA_LK) ||
              (rMaBn && rMaBn === rec.ttXml1.MA_BN) ||
              (rMaThe && rMaThe === rec.ttXml1.MA_THE)
            );
          });
          const targetRows = matchingRows.length > 0 ? matchingRows : prev.length === 1 ? rows : [];
          if (targetRows.length === 0) return rec;

          matchedCount += targetRows.length;
          const firstRow = targetRows[0];
          const nextXml1Id = String(firstRow.XML1_ID || rec.ttXml1.XML1_ID || '').trim();
          const nextTrangThai = String(firstRow.TRANG_THAI || rec.ttXml1.TRANGTHAI || '2').trim();

          const nextXml1Fields = rec.xml1FieldsDraft.map(f => {
            const hit = targetRows.find(
              r =>
                String(r.SO_BANG_XML || '').trim() === '1' &&
                String(r.TRUONG_THONG_TIN_GOC || '').trim().toUpperCase() === f.field.toUpperCase()
            );
            if (!hit) return f;
            return {
              ...f,
              ttGoc: String(hit.THONG_TIN_GOC ?? f.originalValue),
              ttDieuChinh: String(hit.THONG_TIN_DIEU_CHINH ?? f.ttDieuChinh),
              lyDoDieuChinh: String(hit.LY_DO_DIEU_CHINH || hit.LY_DO || f.lyDoDieuChinh),
            };
          });

          const nextCostRows = rec.costRowsDraft.map(cRow => {
            const rowHits = targetRows.filter(r => {
              const sb = String(r.SO_BANG_XML || '').trim();
              const stt = String(r.STT_TRONG_BANG_XML || '').trim();
              // Một số file Excel Mẫu 09/BH từ Cổng để SO_BANG_XML=1 nhưng có ID_CHIPHI và STT_TRONG_BANG_XML
              const matchBang = sb === cRow.soBangXml || (sb === '1' && Boolean(r.ID_CHIPHI));
              return matchBang && (!stt || stt === cRow.sttXml);
            });
            if (rowHits.length === 0) return cRow;
            const h0 = rowHits[0];
            return {
              ...cRow,
              idCp: String(h0.ID_CHIPHI || cRow.idCp || '').trim(),
              lyDoTuChoi: String(h0.LY_DO || cRow.lyDoTuChoi || '').trim(),
              tuChoi: String(h0.TU_CHOI ?? cRow.tuChoi ?? '0').trim(),
              trangThai: String(h0.TRANG_THAI || cRow.trangThai || '2').trim(),
              fieldDrafts: cRow.fieldDrafts.map(fd => {
                const fHit = rowHits.find(
                  r =>
                    String(r.TRUONG_THONG_TIN_GOC || '').trim().toUpperCase() ===
                    fd.field.toUpperCase()
                );
                if (!fHit) return fd;
                return {
                  ...fd,
                  ttGoc: String(fHit.THONG_TIN_GOC ?? fd.originalValue),
                  ttDieuChinh: String(fHit.THONG_TIN_DIEU_CHINH ?? fd.ttDieuChinh),
                  lyDoDieuChinh: String(
                    fHit.LY_DO_DIEU_CHINH || fHit.LY_DO || fd.lyDoDieuChinh
                  ),
                };
              }),
            };
          });

          const compiled = compileMau09Adjustments(nextXml1Fields, nextCostRows);
          return {
            ...rec,
            ttXml1: {
              ...rec.ttXml1,
              XML1_ID: nextXml1Id,
              TRANGTHAI: nextTrangThai,
            },
            xml1FieldsDraft: nextXml1Fields,
            costRowsDraft: nextCostRows,
            dsXml1Dc: compiled.dsXml1Dc,
            dscpDc: compiled.dscpDc,
          };
        })
      );

      showTempToast(`✅ Đã nạp ${matchedCount} dòng dữ liệu từ file Excel Mẫu 09/BH!`);
    } catch (err: any) {
      alert(`Không thể đọc file Excel Mẫu 09/BH: ${err?.message || err}`);
    }
  };

  const handleSaveSection = (secLabel: string) => {
    setDraftRecords(prev =>
      prev.map(rec => {
        const compiled = compileMau09Adjustments(rec.xml1FieldsDraft, rec.costRowsDraft);
        return {
          ...rec,
          dsXml1Dc: compiled.dsXml1Dc,
          dscpDc: compiled.dscpDc,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showTempToast(`✅ Đã ghi nhận dữ liệu ${secLabel}!`);
  };

  const handleFinalSaveAndOpenTable = () => {
    const finalized = draftRecords.map(rec => {
      const compiled = compileMau09Adjustments(rec.xml1FieldsDraft, rec.costRowsDraft);
      return {
        ...rec,
        dsXml1Dc: compiled.dsXml1Dc,
        dscpDc: compiled.dscpDc,
        updatedAt: new Date().toISOString(),
      };
    });
    onSaveRecords(finalized, syncTo3176Doc);
  };

  const handleDownloadSingleXml = () => {
    if (!currentRec) return;
    const xml = buildMau09BhXml(currentRec);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeLk = (currentRec.ttXml1.MA_LK || 'HOSO').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `MAU_09BH_${safeLk}.xml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  if (!currentRec) return null;

  return (
    <div className="fixed inset-0 z-[260] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-[1380px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* THANH TIÊU ĐỀ XANH ĐẬM CHUẨN CỔNG BHXH: "Tạo Mẫu 09/BH" */}
        <div className="bg-[#004a8f] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm tracking-wide">Tạo Mẫu 09/BH</span>
            <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded font-medium">
              Bảng kê chi tiết điều chỉnh / thu hồi ĐNTT (TT12/2026/TT-BTC)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportGatewayExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              title="Nạp file Excel Mẫu 09/BH tải từ Cổng BHXH (để tự điền XML1_ID, ID_CHIPHI, Lý do từ chối)"
            >
              <Upload className="w-3.5 h-3.5" />
              Nạp Excel 09/BH từ Cổng
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-white/20 text-white cursor-pointer transition"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nếu chọn nhiều bệnh nhân cùng lúc: Thanh chuyển đổi giữa các hồ sơ bệnh nhân */}
        {draftRecords.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-300 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-xs font-bold text-slate-700 mr-1 shrink-0">
              Đang chọn {draftRecords.length} hồ sơ:
            </span>
            {draftRecords.map((r, idx) => {
              const comp = compileMau09Adjustments(r.xml1FieldsDraft, r.costRowsDraft);
              const totalChanges = comp.dsXml1Dc.length + comp.dscpDc.length;
              const isActive = idx === activeIdx;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 cursor-pointer transition ${
                    isActive
                      ? 'bg-[#004a8f] text-white border-[#004a8f] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                  }`}
                >
                  <span>
                    #{idx + 1}. {r.ttXml1.HO_TEN || r.ttXml1.MA_LK}
                  </span>
                  {totalChanges > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-amber-300 text-slate-900' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {totalChanges} sửa
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Thông báo nhanh */}
        {toastMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* NỘI DUNG 4 PHẦN CHUẨN MẪU 09/BH */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50">
          {/* ================================================================= */}
          {/* 1. THÔNG TIN BIỂU (TT_MAU)                                        */}
          {/* ================================================================= */}
          <div className="bg-white border border-[#b6d4fe] rounded shadow-2xs overflow-hidden">
            <div
              onClick={() => setOpenSec1(v => !v)}
              className="bg-[#e7f1ff] hover:bg-[#dbeafe] px-3.5 py-2 flex items-center justify-between cursor-pointer select-none border-b border-[#b6d4fe]"
            >
              <span className="text-xs font-bold text-[#004a8f] uppercase">
                1. THÔNG TIN BIỂU (TT_MAU)
              </span>
              {openSec1 ? (
                <ChevronDown className="w-4 h-4 text-[#004a8f]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#004a8f]" />
              )}
            </div>

            {openSec1 && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <label className="w-48 font-semibold text-slate-700 shrink-0">
                    Mẫu số (MAU_SO) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttMau.MAU_SO}
                    readOnly
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-800 font-semibold"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-48 font-semibold text-slate-700 shrink-0">
                    Mã CSKCB (MA_CSKCB) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttMau.MA_CSKCB}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttMau: { ...r.ttMau, MA_CSKCB: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-48 font-semibold text-slate-700 shrink-0">
                    Người lập biểu (NGUOILAPBIEU)
                  </label>
                  <input
                    type="text"
                    list="mau09-signer-suggestions"
                    value={currentRec.ttMau.NGUOILAPBIEU}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttMau: { ...r.ttMau, NGUOILAPBIEU: e.target.value },
                      }))
                    }
                    placeholder="--Chọn hoặc nhập họ tên--"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-48 font-semibold text-slate-700 shrink-0">
                    Thủ trưởng đơn vị (THUTRUONG_DV)
                  </label>
                  <input
                    type="text"
                    list="mau09-signer-suggestions"
                    value={currentRec.ttMau.THUTRUONG_DV}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttMau: { ...r.ttMau, THUTRUONG_DV: e.target.value },
                      }))
                    }
                    placeholder="--Chọn hoặc nhập họ tên--"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-48 font-semibold text-slate-700 shrink-0">
                    Ngày lập biểu (NGAYTHANGNAM) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttMau.NGAYTHANGNAM}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttMau: { ...r.ttMau, NGAYTHANGNAM: e.target.value },
                      }))
                    }
                    placeholder="yyyyMMdd (VD: 20261122)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <datalist id="mau09-signer-suggestions">
                  {signerSuggestions.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 2. HỒ SƠ XML1 GỐC BỊ ĐIỀU CHỈNH (TT_XML1)                         */}
          {/* ================================================================= */}
          <div className="bg-white border border-[#b6d4fe] rounded shadow-2xs overflow-hidden">
            <div
              onClick={() => setOpenSec2(v => !v)}
              className="bg-[#e7f1ff] hover:bg-[#dbeafe] px-3.5 py-1.5 flex items-center justify-between cursor-pointer select-none border-b border-[#b6d4fe]"
            >
              <span className="text-xs font-bold text-[#004a8f] uppercase">
                2. HỒ SƠ XML1 GỐC BỊ ĐIỀU CHỈNH (TT_XML1)
              </span>
              <div className="flex items-center gap-2">
                {openSec2 ? (
                  <ChevronDown className="w-4 h-4 text-[#004a8f]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#004a8f]" />
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSaveSection('Phần 2 (TT_XML1)');
                  }}
                  className="px-3 py-1 rounded bg-[#004a8f] hover:bg-blue-800 text-white text-[11px] font-bold cursor-pointer"
                >
                  LƯU
                </button>
              </div>
            </div>

            {openSec2 && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <label className="w-36 font-semibold text-slate-700 shrink-0">
                    Mã liên kết (MA_LK) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.MA_LK}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, MA_LK: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    Mã BN (MA_BN)
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.MA_BN}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, MA_BN: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    Họ tên (HO_TEN)
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.HO_TEN}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, HO_TEN: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-bold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 font-semibold text-slate-700 shrink-0">
                    Mã thẻ (MA_THE)
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.MA_THE}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, MA_THE: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-mono focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    Ngày vào (NGAY_VAO) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formatDisplayDateTime12(currentRec.ttXml1.NGAY_VAO)}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, NGAY_VAO: e.target.value },
                      }))
                    }
                    title={`Chuẩn XML 12 ký tự: ${normalizeTo12DigitDateTime(currentRec.ttXml1.NGAY_VAO)}`}
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    Ngày ra (NGAY_RA) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formatDisplayDateTime12(currentRec.ttXml1.NGAY_RA)}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, NGAY_RA: e.target.value },
                      }))
                    }
                    title={`Chuẩn XML 12 ký tự: ${normalizeTo12DigitDateTime(currentRec.ttXml1.NGAY_RA)}`}
                    className="flex-1 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-36 font-semibold text-slate-700 shrink-0">
                    Kỳ quyết toán (KY_QT) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.KY_QT}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, KY_QT: e.target.value },
                      }))
                    }
                    placeholder="yyyyMM (VD: 202611)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono font-semibold focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    Trạng thái (TRANGTHAI) <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={currentRec.ttXml1.TRANGTHAI}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, TRANGTHAI: e.target.value },
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-semibold focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    {MAU09_TRANGTHAI_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-32 font-semibold text-slate-700 shrink-0">
                    XML1_ID
                  </label>
                  <input
                    type="text"
                    value={currentRec.ttXml1.XML1_ID}
                    onChange={e =>
                      updateCurrentRecord(r => ({
                        ...r,
                        ttXml1: { ...r.ttXml1, XML1_ID: e.target.value },
                      }))
                    }
                    placeholder="Nhập nếu có ID trên cổng BHXH"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {currentRec.ttXml1.TRANGTHAI === '1' && (
                  <div className="md:col-span-3 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <b>Đang chọn chế độ: 1 - Thu hồi đề nghị thanh toán (thu hồi toàn bộ hồ sơ).</b>{' '}
                      Theo chuẩn Cổng tiếp nhận BHXH (Công văn 2274/BHXH-TTKS &amp; Mẫu XML đối chứng), khi thu hồi toàn bộ hồ sơ ĐNTT, hai thẻ{' '}
                      <code className="font-mono font-bold">&lt;DS_XML1_DIEUCHINH/&gt;</code> và{' '}
                      <code className="font-mono font-bold">&lt;DSCP_DIEUCHINH/&gt;</code> sẽ tự động xuất rỗng (không cần sửa Phần 3 hay Phần 4). Nếu chỉ muốn điều chỉnh/thu hồi từng dịch vụ lẻ trong hồ sơ, hãy chọn Trạng thái{' '}
                      <b>"2 - Điều chỉnh thông tin dữ liệu gốc"</b>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 3. ĐIỀU CHỈNH THÔNG TIN HÀNH CHÍNH (DS_XML1_DIEUCHINH)            */}
          {/* ================================================================= */}
          <div className="bg-white border border-[#b6d4fe] rounded shadow-2xs overflow-hidden">
            <div
              onClick={() => setOpenSec3(v => !v)}
              className="bg-[#e7f1ff] hover:bg-[#dbeafe] px-3.5 py-1.5 flex items-center justify-between cursor-pointer select-none border-b border-[#b6d4fe]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#004a8f] uppercase">
                  3. ĐIỀU CHỈNH THÔNG TIN HÀNH CHÍNH (DS_XML1_DIEUCHINH)
                </span>
                {modifiedCounts.xml1Count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-500 text-white">
                    Đã sửa {modifiedCounts.xml1Count} trường
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {openSec3 ? (
                  <ChevronDown className="w-4 h-4 text-[#004a8f]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#004a8f]" />
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSaveSection('Phần 3 (DS_XML1_DIEUCHINH)');
                  }}
                  className="px-3 py-1 rounded bg-[#004a8f] hover:bg-blue-800 text-white text-[11px] font-bold cursor-pointer"
                >
                  LƯU
                </button>
              </div>
            </div>

            {openSec3 && (
              <div className="p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={xml1Search}
                      onChange={e => setXml1Search(e.target.value)}
                      placeholder="Tìm trường XML1 (VD: HO_TEN, MA_THE_BHYT, NGAY_RA...)"
                      className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg w-80 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyModifiedXml1}
                      onChange={e => setOnlyModifiedXml1(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-600 rounded"
                    />
                    Chỉ hiện dòng đã điều chỉnh ({modifiedCounts.xml1Count})
                  </label>
                </div>

                <div className="border border-[#004a8f] rounded overflow-hidden">
                  <div className="bg-[#004a8f] text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between">
                    <span>Điều chỉnh thông tin hành chính</span>
                    <span className="text-[11px] font-normal text-blue-100">
                      Sửa cột "TT điều chỉnh" và nhập "Lý do điều chỉnh" cho các chỉ tiêu cần điều chỉnh
                    </span>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-[#0b5394] text-white sticky top-0 z-10">
                        <tr>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-center w-12">STT</th>
                          <th className="border-r border-blue-800 px-2.5 py-1.5 text-left w-48">Trường TT gốc</th>
                          <th className="border-r border-blue-800 px-2.5 py-1.5 text-left">TT gốc</th>
                          <th className="border-r border-blue-800 px-2.5 py-1.5 text-left w-48">Trường TT điều chỉnh</th>
                          <th className="border-r border-blue-800 px-2.5 py-1.5 text-left">TT điều chỉnh</th>
                          <th className="px-2.5 py-1.5 text-left">Lý do điều chỉnh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredXml1Drafts.map(item => {
                          const isMod = isXml1FieldAdjusted(item);
                          return (
                            <tr
                              key={item.field}
                              className={
                                isMod ? 'bg-amber-50/80 hover:bg-amber-100/70' : 'hover:bg-blue-50/40'
                              }
                            >
                              <td className="border-r border-slate-200 px-2 py-1 text-center font-mono text-slate-600">
                                {item.stt}
                              </td>
                              <td
                                className="border-r border-slate-200 px-2.5 py-1 font-mono font-semibold text-slate-800"
                                title={item.label}
                              >
                                {item.field}
                              </td>
                              <td className="border-r border-slate-200 p-1">
                                <input
                                  type="text"
                                  value={item.ttGoc}
                                  placeholder={item.originalValue}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateCurrentRecord(r => ({
                                      ...r,
                                      xml1FieldsDraft: r.xml1FieldsDraft.map(f =>
                                        f.field === item.field ? { ...f, ttGoc: val } : f
                                      ),
                                    }));
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                              <td
                                className="border-r border-slate-200 px-2.5 py-1 font-mono font-semibold text-slate-800"
                                title={item.label}
                              >
                                {item.field}
                              </td>
                              <td className="border-r border-slate-200 p-1">
                                <input
                                  type="text"
                                  value={item.ttDieuChinh}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateCurrentRecord(r => ({
                                      ...r,
                                      xml1FieldsDraft: r.xml1FieldsDraft.map(f =>
                                        f.field === item.field
                                          ? {
                                              ...f,
                                              ttGoc: f.ttGoc || f.originalValue,
                                              ttDieuChinh: val,
                                            }
                                          : f
                                      ),
                                    }));
                                  }}
                                  className={`w-full px-2 py-1 border rounded focus:border-blue-600 focus:outline-none ${
                                    isMod
                                      ? 'border-amber-400 bg-white font-bold text-blue-900'
                                      : 'border-slate-200 bg-white text-slate-800'
                                  }`}
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={item.lyDoDieuChinh}
                                  placeholder={isMod ? 'Nhập lý do điều chỉnh (*)...' : ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateCurrentRecord(r => ({
                                      ...r,
                                      xml1FieldsDraft: r.xml1FieldsDraft.map(f =>
                                        f.field === item.field
                                          ? {
                                              ...f,
                                              ttGoc: f.ttGoc || f.originalValue,
                                              lyDoDieuChinh: val,
                                            }
                                          : f
                                      ),
                                    }));
                                  }}
                                  className={`w-full px-2 py-1 border rounded focus:border-blue-600 focus:outline-none ${
                                    isMod && !item.lyDoDieuChinh.trim()
                                      ? 'border-red-400 bg-red-50/40'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 4. ĐIỀU CHỈNH / HỦY CHI PHÍ (DSCP_DIEUCHINH)                      */}
          {/* ================================================================= */}
          <div className="bg-white border border-[#b6d4fe] rounded shadow-2xs overflow-hidden">
            <div
              onClick={() => setOpenSec4(v => !v)}
              className="bg-[#e7f1ff] hover:bg-[#dbeafe] px-3.5 py-1.5 flex items-center justify-between cursor-pointer select-none border-b border-[#b6d4fe]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#004a8f] uppercase">
                  4. ĐIỀU CHỈNH / HỦY CHI PHÍ (DSCP_DIEUCHINH)
                </span>
                {modifiedCounts.costCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-600 text-white">
                    Đã chọn {modifiedCounts.costCount} mục chi phí
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {openSec4 ? (
                  <ChevronDown className="w-4 h-4 text-[#004a8f]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#004a8f]" />
                )}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleSaveSection('Phần 4 (DSCP_DIEUCHINH)');
                  }}
                  className="px-3 py-1 rounded bg-[#004a8f] hover:bg-blue-800 text-white text-[11px] font-bold cursor-pointer"
                >
                  LƯU
                </button>
              </div>
            </div>

            {openSec4 && (
              <div className="p-3.5 space-y-3">
                {/* Thanh Chọn bảng dữ liệu & Checkbox Chỉ hiện dòng đã điều chỉnh */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Chọn bảng dữ liệu
                    </label>
                    <select
                      value={selectedCostTable}
                      onChange={e =>
                        setSelectedCostTable(e.target.value as Xml3176TableId | 'ALL')
                      }
                      className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-900 bg-white min-w-[260px] focus:border-blue-600 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">
                        Tất cả các bảng có dữ liệu ({currentRec.costRowsDraft.length} dòng)
                      </option>
                      {MAU09_COST_TABLE_OPTIONS.map(opt => {
                        const cnt = currentRec.costRowsDraft.filter(
                          r => r.tableId === opt.tableId
                        ).length;
                        return (
                          <option key={opt.tableId} value={opt.tableId}>
                            {opt.label} ({cnt} dòng)
                          </option>
                        );
                      })}
                    </select>

                    {filteredCostRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason =
                            prompt(
                              'Nhập lý do thu hồi / hủy đề nghị thanh toán cho các dòng chi phí đang hiển thị:',
                              'Thu hồi chi phí đề nghị thanh toán'
                            ) || '';
                          if (!reason.trim()) return;
                          updateCurrentRecord(r => {
                            const updatedRec: Mau09BhRecord = {
                              ...r,
                              costRowsDraft: r.costRowsDraft.map(cr => {
                                if (
                                  selectedCostTable !== 'ALL' &&
                                  cr.tableId !== selectedCostTable
                                ) {
                                  return cr;
                                }
                                return {
                                  ...cr,
                                  trangThai: '1',
                                  withdrawEntireRow: true,
                                  withdrawReason: reason.trim(),
                                };
                              }),
                            };
                            return syncXml1TotalsOnCalc
                              ? recalculateAndSyncMau09Prices(updatedRec, { syncXml1Totals: true }).record
                              : updatedRec;
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer transition"
                      >
                        Thu hồi tất cả dòng đang chọn
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRecalculateAndSyncAllPrices(false)}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                      title="Tính lại Thành tiền (THANH_TIEN_BV, THANH_TIEN_BH, T_BHTT, T_BNCCT, T_BNTT) của từng dòng Thuốc/DVKT bị sửa giá/số lượng hoặc thu hồi, và cập nhật đồng bộ Tổng tiền hồ sơ (T_THUOC, T_TONGCHI_BV, T_TONGCHI_BH, T_BHTT, T_BNCCT, T_BNTT) lên Bảng 1 (XML1)"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Đồng bộ &amp; Tính lại Giá / Tổng tiền
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded cursor-pointer select-none"
                      title="Khi sửa giá hoặc thu hồi thuốc/DVKT, tự động đẩy các trường Tổng tiền bị thay đổi (T_THUOC, T_TONGCHI_BV, T_TONGCHI_BH, T_BHTT, T_BNCCT, T_BNTT) vào Phần 3 (DS_XML1_DIEUCHINH)"
                    >
                      <input
                        type="checkbox"
                        checked={syncXml1TotalsOnCalc}
                        onChange={e => setSyncXml1TotalsOnCalc(e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded"
                      />
                      Tự đồng bộ Tổng tiền lên XML1 (Phần 3)
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyModifiedCost}
                        onChange={e => setOnlyModifiedCost(e.target.checked)}
                        className="w-3.5 h-3.5 accent-blue-600 rounded"
                      />
                      Chỉ hiện dòng đã điều chỉnh
                    </label>
                  </div>
                </div>

                {/* Bảng Điều chỉnh / hủy chi phí */}
                <div className="border border-[#004a8f] rounded overflow-hidden">
                  <div className="bg-[#004a8f] text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between">
                    <span>Điều chỉnh / hủy chi phí</span>
                    <span className="text-[11px] font-normal text-blue-100">
                      Bấm vào từng "Dòng chi phí gốc #..." để mở các trường cần sửa hoặc bấm "Thu hồi dòng này"
                    </span>
                  </div>

                  <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
                    <table className="w-full text-xs border-collapse min-w-[1150px]">
                      <thead className="bg-[#0b5394] text-white sticky top-0 z-10">
                        <tr>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-center w-10">STT</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-center w-16">Số bảng</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-28">ID_CP</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-center w-16">STT_XML</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-28">Ngày y lệnh</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-36">Trạng thái</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-36">Trường TT gốc</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-40">TT gốc</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-36">Lý do từ chối</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-center w-16">Từ chối</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-36">Trường TT điều chỉnh</th>
                          <th className="border-r border-blue-800 px-2 py-1.5 text-left w-40">TT điều chỉnh</th>
                          <th className="px-2 py-1.5 text-left">Lý do điều chỉnh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredCostRows.length === 0 ? (
                          <tr>
                            <td colSpan={13} className="px-4 py-6 text-center text-slate-500">
                              Không có dòng chi phí nào trong bảng đã chọn.
                            </td>
                          </tr>
                        ) : (
                          filteredCostRows.map((costRow, cIdx) => {
                            const isExpanded = Boolean(expandedCostRowIds[costRow.sourceRowId]);
                            const rowMod = isCostRowAdjusted(costRow);
                            const visibleFields = onlyModifiedCost
                              ? costRow.fieldDrafts.filter(isCostFieldAdjusted)
                              : costRow.fieldDrafts;

                            return (
                              <React.Fragment key={costRow.sourceRowId}>
                                {/* Dòng tiêu đề nhóm: [+] Dòng chi phí gốc #1 */}
                                <tr
                                  className={`border-b border-slate-300 ${
                                    rowMod ? 'bg-amber-50/90' : 'bg-slate-100/90 hover:bg-slate-200/70'
                                  }`}
                                >
                                  <td colSpan={13} className="px-2.5 py-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedCostRowIds(prev => ({
                                            ...prev,
                                            [costRow.sourceRowId]: !prev[costRow.sourceRowId],
                                          }))
                                        }
                                        className="flex items-center gap-1.5 font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                                      >
                                        {isExpanded ? (
                                          <MinusSquare className="w-4 h-4 text-blue-700 shrink-0" />
                                        ) : (
                                          <PlusSquare className="w-4 h-4 text-blue-700 shrink-0" />
                                        )}
                                        <span>
                                          Dòng chi phí gốc #{cIdx + 1} ({costRow.tableId} • STT_XML:{' '}
                                          {costRow.sttXml}):{' '}
                                          <span className="text-blue-900">{costRow.summaryLabel}</span>
                                        </span>
                                        {costRow.thanhTienGoc > 0 && (
                                          <span className="text-[11px] font-mono text-slate-600 ml-1">
                                            — Thành tiền gốc:{' '}
                                            <b>{costRow.thanhTienGoc.toLocaleString('vi-VN')}</b>
                                            {rowMod && (
                                              <span className="text-blue-700 font-extrabold ml-1">
                                                ➔ Sau ĐC:{' '}
                                                {getEffectiveRowThanhTienDc(costRow).toLocaleString(
                                                  'vi-VN'
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                        {rowMod && (
                                          <span className="ml-1.5 px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                                            {costRow.withdrawEntireRow || costRow.trangThai === '1'
                                              ? 'Thu hồi / Hủy CP'
                                              : 'Đã điều chỉnh'}
                                          </span>
                                        )}
                                      </button>

                                      <div className="flex flex-wrap items-center gap-2">
                                        <input
                                          type="text"
                                          value={costRow.idCp}
                                          onChange={e => {
                                            const val = e.target.value;
                                            updateCurrentRecord(r => ({
                                              ...r,
                                              costRowsDraft: r.costRowsDraft.map(cr =>
                                                cr.sourceRowId === costRow.sourceRowId
                                                  ? { ...cr, idCp: val }
                                                  : cr
                                              ),
                                            }));
                                          }}
                                          placeholder="ID_CP (nếu có)"
                                          className="px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] font-mono w-28"
                                        />

                                        <select
                                          value={costRow.trangThai}
                                          onChange={e => {
                                            const val = e.target.value;
                                            updateCurrentRecord(r => ({
                                              ...r,
                                              costRowsDraft: r.costRowsDraft.map(cr =>
                                                cr.sourceRowId === costRow.sourceRowId
                                                  ? {
                                                      ...cr,
                                                      trangThai: val,
                                                      withdrawEntireRow: val === '1',
                                                    }
                                                  : cr
                                              ),
                                            }));
                                          }}
                                          className="px-2 py-0.5 border border-slate-300 rounded bg-white text-[11px] font-semibold cursor-pointer"
                                        >
                                          <option value="2">2 - Điều chỉnh thông tin dữ liệu gốc</option>
                                          <option value="1">1 - Thu hồi đề nghị thanh toán (hủy CP)</option>
                                          <option value="4">4 - Xin ý kiến thẩm quyền</option>
                                        </select>

                                        {costRow.withdrawEntireRow || costRow.trangThai === '1' ? (
                                          <input
                                            type="text"
                                            value={costRow.withdrawReason}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? { ...cr, withdrawReason: val }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            placeholder="Nhập lý do thu hồi chi phí (*)"
                                            className="px-2 py-0.5 border border-rose-400 rounded bg-white text-[11px] w-56"
                                          />
                                        ) : null}

                                        {(costRow.tableId === 'XML2' || costRow.tableId === 'XML3') &&
                                          !(costRow.withdrawEntireRow || costRow.trangThai === '1') && (
                                            <button
                                              type="button"
                                              onClick={() => handleRecalculateSingleRow(costRow.sourceRowId)}
                                              className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition"
                                              title="Tính lại Thành tiền BV, Thành tiền BH, Quỹ BHTT, BNCCT, BNTT theo Đơn giá / Số lượng / Tỷ lệ / Mức hưởng đã sửa của dòng này"
                                            >
                                              <Calculator className="w-3 h-3" />
                                              Tính lại thành tiền
                                            </button>
                                          )}

                                        {rowMod && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? {
                                                        ...cr,
                                                        trangThai: '2',
                                                        withdrawEntireRow: false,
                                                        withdrawReason: '',
                                                        fieldDrafts: cr.fieldDrafts.map(fd => ({
                                                          ...fd,
                                                          ttGoc: fd.originalValue,
                                                          ttDieuChinh: fd.originalValue,
                                                          lyDoDieuChinh: '',
                                                        })),
                                                      }
                                                    : cr
                                                ),
                                              }))
                                            }
                                            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                                            title="Khôi phục dòng chi phí này về giá trị gốc"
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                            Khôi phục gốc
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>

                                {/* Các trường chi tiết của dòng chi phí khi mở rộng */}
                                {isExpanded &&
                                  visibleFields.map(fd => {
                                    const fMod = isCostFieldAdjusted(fd);
                                    return (
                                      <tr
                                        key={`${costRow.sourceRowId}_${fd.field}`}
                                        className={
                                          fMod
                                            ? 'bg-amber-50/70 hover:bg-amber-100/60'
                                            : 'bg-white hover:bg-blue-50/30'
                                        }
                                      >
                                        <td className="border-r border-slate-200 px-2 py-1 text-center font-mono text-slate-500">
                                          {fd.stt}
                                        </td>
                                        <td className="border-r border-slate-200 px-2 py-1 text-center font-mono">
                                          {costRow.soBangXml}
                                        </td>
                                        <td className="border-r border-slate-200 px-2 py-1 font-mono text-[11px] text-slate-600">
                                          {costRow.idCp || '—'}
                                        </td>
                                        <td className="border-r border-slate-200 px-2 py-1 text-center font-mono">
                                          {costRow.sttXml}
                                        </td>
                                        <td className="border-r border-slate-200 px-2 py-1 font-mono text-[11px]">
                                          {formatDisplayDateTime12(costRow.ngayYl)}
                                        </td>
                                        <td className="border-r border-slate-200 px-2 py-1 text-[11px]">
                                          {costRow.trangThai === '1'
                                            ? '1 - Thu hồi / Hủy'
                                            : costRow.trangThai === '4'
                                            ? '4 - Xin ý kiến'
                                            : '2 - Điều chỉnh'}
                                        </td>
                                        <td
                                          className="border-r border-slate-200 px-2 py-1 font-mono font-semibold text-slate-800"
                                          title={fd.label}
                                        >
                                          {fd.field}
                                        </td>
                                        <td className="border-r border-slate-200 p-1">
                                          <input
                                            type="text"
                                            value={fd.ttGoc}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? {
                                                        ...cr,
                                                        fieldDrafts: cr.fieldDrafts.map(item =>
                                                          item.field === fd.field
                                                            ? { ...item, ttGoc: val }
                                                            : item
                                                        ),
                                                      }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            className="w-full px-1.5 py-0.5 border border-slate-200 rounded bg-slate-50 text-slate-700"
                                          />
                                        </td>
                                        <td className="border-r border-slate-200 p-1">
                                          <input
                                            type="text"
                                            value={costRow.lyDoTuChoi}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? { ...cr, lyDoTuChoi: val }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            placeholder="Lý do từ chối..."
                                            className="w-full px-1.5 py-0.5 border border-slate-200 rounded bg-white text-slate-700"
                                          />
                                        </td>
                                        <td className="border-r border-slate-200 p-1 text-center">
                                          <input
                                            type="text"
                                            value={costRow.tuChoi}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? { ...cr, tuChoi: val }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            className="w-10 text-center px-1 py-0.5 border border-slate-200 rounded bg-white"
                                          />
                                        </td>
                                        <td
                                          className="border-r border-slate-200 px-2 py-1 font-mono font-semibold text-slate-800"
                                          title={fd.label}
                                        >
                                          {fd.field}
                                        </td>
                                        <td className="border-r border-slate-200 p-1">
                                          <input
                                            type="text"
                                            value={fd.ttDieuChinh}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? {
                                                        ...cr,
                                                        fieldDrafts: cr.fieldDrafts.map(item =>
                                                          item.field === fd.field
                                                            ? { ...item, ttDieuChinh: val }
                                                            : item
                                                        ),
                                                      }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            className={`w-full px-1.5 py-0.5 border rounded focus:border-blue-600 focus:outline-none ${
                                              fMod
                                                ? 'border-amber-400 bg-white font-bold text-blue-900'
                                                : 'border-slate-200 bg-white text-slate-800'
                                            }`}
                                          />
                                        </td>
                                        <td className="p-1">
                                          <input
                                            type="text"
                                            value={fd.lyDoDieuChinh}
                                            placeholder={fMod ? 'Nhập lý do điều chỉnh (*)...' : ''}
                                            onChange={e => {
                                              const val = e.target.value;
                                              updateCurrentRecord(r => ({
                                                ...r,
                                                costRowsDraft: r.costRowsDraft.map(cr =>
                                                  cr.sourceRowId === costRow.sourceRowId
                                                    ? {
                                                        ...cr,
                                                        fieldDrafts: cr.fieldDrafts.map(item =>
                                                          item.field === fd.field
                                                            ? { ...item, lyDoDieuChinh: val }
                                                            : item
                                                        ),
                                                      }
                                                    : cr
                                                ),
                                              }));
                                            }}
                                            className={`w-full px-1.5 py-0.5 border rounded focus:border-blue-600 focus:outline-none ${
                                              fMod && !fd.lyDoDieuChinh.trim()
                                                ? 'border-red-400 bg-red-50/40'
                                                : 'border-slate-200 bg-white'
                                            }`}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Dòng tổng cộng dưới chân bảng Chi phí (Tổng gốc | Tổng ĐC | Chênh lệch + Đối chiếu Tổng đơn XML1) */}
                  <div className="bg-slate-100 border-t border-slate-300 px-4 py-2.5 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRecalculateAndSyncAllPrices(false)}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                          title="Theo hướng dẫn Phụ lục 1 TT12/2026/TT-BTC (trang 6): Cập nhật đồng bộ thành tiền của từng thuốc/DVKT và tính lại Tổng chi phí toàn hồ sơ (XML1)"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Đồng bộ &amp; Tính lại Giá / Thành tiền toàn hồ sơ
                        </button>
                        <span className="text-[11px] text-slate-600">
                          (Sửa Đơn giá / Số lượng / Tỷ lệ hoặc Thu hồi dịch vụ ➔ Bấm để tự tính lại Thành tiền &amp; Tổng chi Bảng 1)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                          Tổng gốc (bảng đang xem):{' '}
                          <b className="text-slate-900 font-mono">
                            {costTotals.tongGoc.toLocaleString('vi-VN')}
                          </b>
                        </div>
                        <div className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                          Tổng ĐC:{' '}
                          <b className="text-blue-700 font-mono">
                            {costTotals.tongDc.toLocaleString('vi-VN')}
                          </b>
                        </div>
                        <div className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700">
                          Chênh lệch:{' '}
                          <b
                            className={`font-mono ${
                              costTotals.chenhLech < 0
                                ? 'text-rose-600'
                                : costTotals.chenhLech > 0
                                ? 'text-emerald-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {costTotals.chenhLech.toLocaleString('vi-VN')}
                          </b>
                        </div>
                      </div>
                    </div>

                    {/* Bảng tóm tắt tác động tới Tổng tiền toàn đơn/hồ sơ (XML1) */}
                    {liveHosoTotalsPreview && (
                      <div className="bg-white border border-blue-200 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                        {[
                          { key: 'T_TONGCHI_BV', label: 'Tổng chi BV (T_TONGCHI_BV)' },
                          { key: 'T_TONGCHI_BH', label: 'Tổng chi BH (T_TONGCHI_BH)' },
                          { key: 'T_BHTT', label: 'Quỹ BHYT trả (T_BHTT)' },
                          { key: 'T_BNCCT', label: 'BN cùng chi trả (T_BNCCT)' },
                          { key: 'T_BNTT', label: 'BN tự trả (T_BNTT)' },
                          { key: 'T_THUOC', label: 'Tổng tiền thuốc (T_THUOC)' },
                        ].map(item => {
                          const pair = liveHosoTotalsPreview[item.key] || { goc: 0, dc: 0 };
                          const diff = Math.round((pair.dc - pair.goc) * 100) / 100;
                          const changed = Math.abs(diff) >= 0.01;
                          return (
                            <div
                              key={item.key}
                              className={`px-2.5 py-1.5 rounded border ${
                                changed
                                  ? 'bg-amber-50/80 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="font-bold text-slate-600 truncate" title={item.label}>
                                {item.label}
                              </div>
                              <div className="flex items-baseline justify-between gap-1 mt-0.5 font-mono">
                                <span className="text-slate-500 line-through text-[10px]">
                                  {changed ? pair.goc.toLocaleString('vi-VN') : ''}
                                </span>
                                <span
                                  className={`font-extrabold text-xs ${
                                    changed ? 'text-blue-800' : 'text-slate-800'
                                  }`}
                                >
                                  {pair.dc.toLocaleString('vi-VN')}
                                </span>
                              </div>
                              {changed && (
                                <div
                                  className={`text-[10px] font-mono font-bold text-right ${
                                    diff < 0 ? 'text-rose-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {diff > 0 ? `+${diff.toLocaleString('vi-VN')}` : diff.toLocaleString('vi-VN')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* THANH CÔNG CỤ DƯỚI CÙNG: ĐỒNG BỘ, XEM XML, XUẤT EXCEL, IN PDF & LƯU SANG BẢNG MỚI 09/BH */}
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncTo3176Doc}
              onChange={e => setSyncTo3176Doc(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
            <span>
              Đồng bộ cập nhật các trường đã sửa vào dữ liệu XML 3176 đang mở
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleRecalculateAndSyncAllPrices(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition"
              title="Đồng bộ & Tính lại Thành tiền từng dịch vụ/thuốc (XML2, XML3) và Tổng chi phí hồ sơ (XML1) cho tất cả hồ sơ đang mở"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-700" />
              Đồng bộ &amp; Tính lại Giá ({draftRecords.length} HS)
            </button>

            <button
              type="button"
              onClick={() => setPreviewXmlContent(buildMau09BhXml(currentRec))}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
              Xem XML 09/BH
            </button>

            <button
              type="button"
              onClick={handleDownloadSingleXml}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-700" />
              Xuất XML 09/BH
            </button>

            <button
              type="button"
              onClick={() => exportMau09BhToExcel(draftRecords)}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Xuất Excel 09/BH
            </button>

            <button
              type="button"
              onClick={() => printMau09BhPdfWindow(draftRecords, tenCskcb)}
              className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5 text-purple-700" />
              In Mẫu 09/BH (PDF)
            </button>

            <button
              type="button"
              onClick={handleFinalSaveAndOpenTable}
              className="px-4 py-1.5 rounded-lg bg-[#004a8f] hover:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu &amp; Chuyển sang Bảng Hồ sơ 09/BH ({draftRecords.length})
            </button>
          </div>
        </div>
      </div>

      {/* Modal xem trước chuỗi XML <HOSO_DIEUCHINH_GD> */}
      {previewXmlContent && (
        <div className="fixed inset-0 z-[280] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-blue-600" />
                <span>Cấu trúc XML Mẫu số 09/BH (&lt;HOSO_DIEUCHINH_GD&gt; - Loại hồ sơ 73)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewXmlContent(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-auto flex-1 leading-relaxed whitespace-pre-wrap break-all">
              {previewXmlContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
