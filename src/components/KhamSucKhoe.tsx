import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, Settings, Play, Download, CheckCircle2, AlertCircle, XCircle, Search, Home, Building2, FileCode2,
  Trash2, FileText, Send, User, Check, ShieldCheck, Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { buildKskXml } from '../lib/kskXmlBuilder';
import KskConfigModal, { KskConfig } from './KskConfigModal';

export default function KhamSucKhoe({ onGoHome }: { onGoHome: () => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<KskConfig | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ksk_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const parsedRecords = dataRows.map(row => {
            const obj: any = {};
            keys.forEach((k: string, i: number) => {
              if (k) obj[k] = row[i];
            });
            return obj;
          });
          setRecords(parsedRecords);
          setActiveTab('preview');
        }
      } else {
        alert('Không tìm thấy sheet dữ liệu Khám sức khỏe hợp lệ (Trên 18, 6>Duoi 18, Duoi 6)');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportXML = () => {
    if (records.length === 0) return;
    const xmlStr = buildKskXml(records, records[0]?.MA_CSKCB || '00000');
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSK_${records[0]?.MA_CSKCB || 'XML'}_${new Date().getTime()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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
            Dữ liệu & Xuất XML
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto mt-10">
            <h2 className="text-xl font-bold mb-4">Nhập file Khám sức khỏe (.xlsm)</h2>
            <label className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all">
              <FileUp className="w-10 h-10 mb-3" />
              <span className="font-semibold">Chọn file Excel Khám sức khỏe</span>
              <span className="text-xs mt-1 text-slate-400">Hỗ trợ các mẫu Trên 18, 6-18, Dưới 6</span>
              <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={handleFileUpload} />
            </label>
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
              <h3 className="font-bold">Danh sách bản ghi ({records.length})</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleExportXML}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Xuất XML
                </button>
                <button
                  onClick={() => {
                    if (!config?.apiUrl || !config?.privateKey) {
                      alert('Vui lòng Cấu hình API EMRHUB (URL và Private Key) trước khi đẩy.');
                      setIsConfigOpen(true);
                      return;
                    }
                    alert('Chức năng ký số và đẩy API đang được hoàn thiện.');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Đẩy lên Cổng
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border font-semibold">Mã CSKCB</th>
                    <th className="p-2 border font-semibold">Họ tên</th>
                    <th className="p-2 border font-semibold">CCCD</th>
                    <th className="p-2 border font-semibold">Ngày sinh</th>
                    <th className="p-2 border font-semibold">Giới tính</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 border">{r.MA_CSKCB}</td>
                      <td className="p-2 border">{r.HO_TEN}</td>
                      <td className="p-2 border">{r.SO_CCCD}</td>
                      <td className="p-2 border">{r.NGAY_SINH}</td>
                      <td className="p-2 border">{r.GIOI_TINH}</td>
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
    </div>
  );
}
