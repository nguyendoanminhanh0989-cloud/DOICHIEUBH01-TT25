import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, Settings, Play, Download, CheckCircle2, AlertCircle, XCircle, Search, Home, Building2, FileCode2,
  Trash2, FileText, Send, User, Check, ShieldCheck, Cpu, FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { buildKskXml } from '../lib/kskXmlBuilder';
import { createKskHoSoRecord } from '../lib/kskRecord';
import type { KskType } from '../lib/kskSchemas';
import KskConfigModal, { KskConfig } from './KskConfigModal';
import KySoModal from './KySoModal';
import KskDynamicForm from './forms/KskDynamicForm';
import type { HoSoRecord } from '../lib/signAndSubmitService';



export default function KhamSucKhoe({ onGoHome }: { onGoHome: () => void }) {
  const [records, setRecords] = useState<HoSoRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<KskConfig | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [kySoMode, setKySoMode] = useState<'sign' | 'submit' | 'sign_then_submit' | null>(null);
  
  const [showKskForm, setShowKskForm] = useState<{ type: KskType; recordId?: string; initialData?: any } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ksk_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, templateLabel: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      
      const mainSheetName = wb.SheetNames.find(n => n.includes('18') || n.includes('Duoi') || n.includes('Dưới'));
      if (mainSheetName) {
        const ws = wb.Sheets[mainSheetName];
        // Parse with header: 1 to get raw array
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        if (rawData.length > 2) {
          const keys = rawData[1];
          const dataRows = rawData.slice(2).filter(row => row.some(cell => cell !== ''));
          
          let kskType: KskType = 'Adult';
          if (templateLabel === 'Từ 6-18') kskType = 'Minor';
          if (templateLabel === 'Dưới 6') kskType = 'ChildUnder';

          const parsedRecords: HoSoRecord[] = dataRows.map((row, index) => {
            const obj: any = {};
            keys.forEach((k: string, i: number) => {
              if (k) obj[k] = row[i];
            });
            
            return createKskHoSoRecord(obj, kskType, { id: `${Date.now()}_${index}`, source: 'excel' });
          });
          setRecords(parsedRecords);
          setActiveTab('preview');
          setSelectedIds(new Set(parsedRecords.map(r => r.id))); // select all by default
        }
      } else {
        alert('Không tìm thấy sheet dữ liệu Khám sức khỏe hợp lệ (Trên 18, 6>Duoi 18, Duoi 6)');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportXML = () => {
    if (records.length === 0) return;
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    if (selectedRecords.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bản ghi để xuất XML');
      return;
    }
    const rawDataArray = selectedRecords.map(r => r.rawData);
    const xmlStr = buildKskXml(rawDataArray, rawDataArray[0]?.MA_CSKCB || '00000');
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSK_${rawDataArray[0]?.MA_CSKCB || 'XML'}_${new Date().getTime()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

    const processGroup = (groupRecords: HoSoRecord[], sheetName: string) => {
      if (groupRecords.length === 0) return;
      
      const allKeysSet = new Set<string>();
      groupRecords.forEach(r => {
        Object.keys(r.rawData).forEach(k => {
          if (!k.startsWith('_')) allKeysSet.add(k);
        });
      });
      const keys = Array.from(allKeysSet);

      const aoa: any[][] = [];
      aoa.push(keys); // Header row 1 
      aoa.push(keys); // Header row 2 (actual keys)

      groupRecords.forEach(r => {
        const row = keys.map(k => {
          let val = r.rawData[k] ?? '';
          if (Array.isArray(val) || typeof val === 'object') {
            val = JSON.stringify(val); // fallback for complex objects
          }
          return val;
        });
        aoa.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    processGroup(grouped.Adult, 'Tren 18');
    processGroup(grouped.Minor, '6>Duoi 18');
    processGroup(grouped.ChildUnder, 'Duoi 6');

    XLSX.writeFile(wb, `Export_KSK_${new Date().getTime()}.xlsx`);
  };

  const handleKySoComplete = (updated: HoSoRecord[]) => {
    setRecords(prev => {
      const map = new Map(prev.map(r => [r.id, r]));
      updated.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
    setKySoMode(null);
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
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Cấu hình API EMRHUB
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'upload' ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200")}
          >
            Nhập file
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            disabled={records.length === 0}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'preview' ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200", records.length === 0 && "opacity-50 cursor-not-allowed")}
          >
            Dữ liệu & Xử lý
          </button>
          
          <div className="flex-1" />
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowKskForm({ type: 'Adult' })}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nhập KSK (Trên 18 tuổi)
            </button>
            <button
              onClick={() => setShowKskForm({ type: 'Minor' })}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nhập KSK (6 - 18 tuổi)
            </button>
            <button
              onClick={() => setShowKskForm({ type: 'ChildUnder' })}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nhập KSK (Dưới 6 tuổi)
            </button>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto mt-10">
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nhập file Khám sức khỏe (.xlsm)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Trên 18', file: 'Import_KSK_Tren 18.xlsm' },
                { label: 'Từ 6-18', file: 'Import_KSK_6 den Duoi 18.xlsm' },
                { label: 'Dưới 6', file: 'Import_KSK_Duoi 6.xlsm' }
              ].map((tpl, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all text-center flex-1">
                    <FileUp className="w-8 h-8 mb-3" />
                    <span className="font-semibold text-sm">Mẫu {tpl.label}</span>
                    <span className="text-xs mt-1 text-slate-400">Chọn file .xlsm</span>
                    <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, tpl.label)} />
                  </label>
                  <a href={`/templates/${tpl.file}`} download className="flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                    <Download className="w-4 h-4" /> Tải mẫu gốc {tpl.label}
                  </a>
                </div>
              ))}
            </div>
            {fileName && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm flex items-center justify-between">
                <span>{fileName}</span>
                <span className="text-xs bg-emerald-100 px-2 py-1 rounded-md">{records.length} dòng</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold">Danh sách bản ghi ({records.length})</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">Đã chọn: {selectedIds.size}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRecords([])}
                  className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-sm hover:bg-rose-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa danh sách
                </button>
                <button
                  onClick={handleExportXML}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Xuất XML
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-sm hover:bg-emerald-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Xuất Excel
                </button>
                <button
                  onClick={() => setKySoMode('sign')}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Ký số Token/SmartCA
                </button>
                <button
                  onClick={() => {
                    if (!config?.apiUrl || !config?.privateKey) {
                      alert('Vui lòng Cấu hình API EMRHUB (URL và Private Key) trước khi đẩy.');
                      setIsConfigOpen(true);
                      return;
                    }
                    alert('Chức năng đẩy trực tiếp lên EMRHUB đang hoàn thiện. Hiện tại bạn có thể xuất XML đã ký để xử lý.');
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Đẩy lên EMRHUB
                </button>
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
                    <th className="p-3 border-b border-r font-semibold w-24">Thao tác</th>
                    <th className="p-3 border-b border-r font-semibold">Trạng thái</th>
                    <th className="p-3 border-b border-r font-semibold">Mã CSKCB</th>
                    <th className="p-3 border-b border-r font-semibold">Họ tên</th>
                    <th className="p-3 border-b border-r font-semibold">CCCD</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày sinh</th>
                    <th className="p-3 border-b border-r font-semibold">Giới tính</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày vào</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày ra</th>
                    <th className="p-3 border-b font-semibold w-48">Lỗi & Thông báo</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
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
                      <td className="p-3 border-b border-r text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setShowKskForm({ type: (r as any).kskType || (r.rawData.TYPE as KskType) || 'Adult', recordId: r.id, initialData: r.rawData })}
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 rounded text-xs font-semibold border border-slate-200 transition-colors"
                        >
                          Sửa
                        </button>
                      </td>
                      <td className="p-3 border-b border-r">
                        {r.trangThai === 'SIGNED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã ký số
                          </span>
                        ) : r.trangThai === 'SIGN_FAILED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Lỗi ký
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            <FileText className="w-3.5 h-3.5" /> Chưa ký
                          </span>
                        )}
                      </td>
                      <td className="p-3 border-b border-r">{r.rawData.MA_CSKCB}</td>
                      <td className="p-3 border-b border-r font-medium text-slate-900">{r.rawData.HO_TEN}</td>
                      <td className="p-3 border-b border-r">{r.rawData.SO_CCCD}</td>
                      <td className="p-3 border-b border-r">{r.rawData.NGAY_SINH}</td>
                      <td className="p-3 border-b border-r text-center">{r.rawData.GIOI_TINH === '1' ? 'Nam' : r.rawData.GIOI_TINH === '2' ? 'Nữ' : r.rawData.GIOI_TINH}</td>
                      <td className="p-3 border-b border-r font-mono text-xs">{r.rawData.NGAY_VAO}</td>
                      <td className="p-3 border-b border-r font-mono text-xs">{r.rawData.NGAY_RA}</td>
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
                  ))}
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

      {kySoMode && (
        <KySoModal
          records={selectedRecords}
          mode={kySoMode}
          onClose={() => setKySoMode(null)}
          onComplete={handleKySoComplete}
        />
      )}

      {showKskForm && (
        <KskDynamicForm
          type={showKskForm.type}
          initialData={showKskForm.initialData}
          onClose={() => setShowKskForm(null)}
          onSave={(data) => {
            if (showKskForm.recordId) {
              const updatedRecord = createKskHoSoRecord(data, showKskForm.type, { id: showKskForm.recordId, source: 'manual' });
              setRecords(prev => prev.map(r => r.id === showKskForm.recordId ? updatedRecord : r));
            } else {
              const newRecord = createKskHoSoRecord(data, showKskForm.type, { source: 'manual' });
              setRecords(prev => [newRecord, ...prev]);
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
