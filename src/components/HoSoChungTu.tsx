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
  X,
  Building
} from 'lucide-react';
import { cn } from '../lib/utils';
import TaoHoSoModal from './TaoHoSoModal';
import ConfigModal from './ConfigModal';
import KySoModal from './KySoModal';
import CskcbSetupModal, { CskcbConfig } from './CskcbSetupModal';
import type { HoSoRecord } from '../lib/signAndSubmitService';

export default function HoSoChungTu() {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showTaoHoSoModal, setShowTaoHoSoModal] = useState(false);
  const [cskcbConfig, setCskcbConfig] = useState<CskcbConfig | null>(() => {
    try {
      const saved = localStorage.getItem('cskcb_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [kySoMode, setKySoMode] = useState<'sign' | 'submit' | 'sign_then_submit' | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<HoSoRecord[]>([]);

  const selectedRecords = records.filter(r => selectedIds.has(r.id));
  const signedCount = records.filter(r => r.trangThai === 'SIGNED').length;
  const submittedCount = records.filter(r => r.trangThai === 'SUBMITTED').length;
  const draftCount = records.filter(r => r.trangThai === 'DRAFT' || r.trangThai === 'UNSIGNED').length;
  const errorCount = records.filter(r => r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED').length;

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

  const handleKySoComplete = (updated: HoSoRecord[]) => {
    setRecords(prev => {
      const map = new Map(prev.map(r => [r.id, r]));
      updated.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
    setKySoMode(null);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(firstSheet);
      
      const { buildXml } = await import('../lib/xmlBuilder');
      const { getOrgConfig } = await import('../lib/signAndSubmitService');
      const org = getOrgConfig();

      const fileNameLower = file.name.toLowerCase();

      const mappedRecords: HoSoRecord[] = jsonData.map((item: any, index) => {
        const detectType = () => {
          if (fileNameLower.includes('giayravien') || fileNameLower.includes('ct03')) return 'CT03';
          if (fileNameLower.includes('tomtathosobenhan') || fileNameLower.includes('ct04')) return 'CT04';
          if (fileNameLower.includes('chungsinh') || fileNameLower.includes('ct05')) return 'CT05';
          if (fileNameLower.includes('nghiduongthai') || fileNameLower.includes('ct06')) return 'CT06';
          if (fileNameLower.includes('nghiviechuongbhxh') || fileNameLower.includes('ct07')) return 'CT07';

          const ma = (item['MA_CT'] || item['MAU_SO'] || '').toString().toUpperCase();
          if (ma.includes('CT04')) return 'CT04';
          if (ma.includes('CT05')) return 'CT05';
          if (ma.includes('CT06')) return 'CT06';
          if (ma.includes('CT07')) return 'CT07';
          return 'CT03';
        };
        const type = detectType() as HoSoRecord['type'];

        const rawData: Record<string, string> = {};
        Object.entries(item).forEach(([k, v]) => { rawData[k] = String(v ?? ''); });
        
        // HIS Mapping
        if (!rawData['MA_BHXH'] && rawData['MA_SOBHXH']) rawData['MA_BHXH'] = rawData['MA_SOBHXH'];
        if (!rawData['MA_CCHN_TRUONGKHOA'] && rawData['MA_TRUONGKHOA']) rawData['MA_CCHN_TRUONGKHOA'] = rawData['MA_TRUONGKHOA'];
        if (!rawData['MA_CCHN'] && rawData['MA_TRUONGKHOA']) rawData['MA_CCHN'] = rawData['MA_TRUONGKHOA'];

        let xmlContent: string | undefined;
        try { xmlContent = buildXml(type, rawData, org.ma_cskcb); } catch {}

        return {
          id: `${Date.now()}_${index}`,
          type,
          hoTen: item['HO_TEN'] || item['HOTEN_NND'] || item['Họ và tên'] || 'Không rõ',
          maBhyt: item['MA_THE'] || item['MA_THE_NND'] || '',
          maBhxh: item['MA_BHXH'] || item['MA_SOBHXH'] || item['MA_BHXH_NND'] || '',
          cccd: item['SO_CCCD'] || item['SO_CMND_NND'] || '',
          khoa: item['MA_KHOA'] || 'K01',
          ngayVao: item['NGAY_VAO'] || item['NGAY_VAO_VIEN'] || '',
          ngayRa: item['NGAY_RA'] || item['NGAY_RA_VIEN'] || '',
          icd: item['BENHICD10_ID'] || item['BENH_ICD10_ID'] || item['BENHICD10'] || '',
          chanDoan: item['CHAN_DOAN'] || item['CHANDOAN_DIEUTRI'] || item['CHAN_DOAN_RA'] || item['TENBENHICD10'] || '',
          nguoiKy: item['THU_TRUONG_DVI'] || item['THU_TRUONG_DV'] || item['TEN_NGUOI_HANH_NGHE'] || item['TEN_TRUONGKHOA'] || item['TEN_BS'] || item['TEN_BSY'] || item['NGUOI_DAI_DIEN'] || '',
          cchn: item['MA_CCHN_TRUONGKHOA'] || item['MA_CCHN'] || item['MA_TRUONGKHOA'] || item['MA_BS'] || '',
          trangThai: 'UNSIGNED' as HoSoRecord['trangThai'],
          rawData,
          xmlContent,
        };
      });
      setRecords(prev => [...mappedRecords, ...prev]);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error parsing excel:', error);
      alert('Có lỗi xảy ra khi đọc file Excel!');
    }
  };

  const handleExportExcel = async () => {
    if (records.length === 0) {
      alert('Không có dữ liệu để xuất!');
      return;
    }
    try {
      const { utils, writeFile } = await import('xlsx');
      const exportData = records.map(r => ({
        'Loại HS': r.type,
        'Họ và tên': r.hoTen,
        'Mã BHYT': r.maBhyt,
        'Mã BHXH': r.maBhxh,
        'CCCD': r.cccd,
        'Khoa': r.khoa,
        'Ngày vào': r.ngayVao,
        'Ngày ra': r.ngayRa,
        'Mã Bệnh ICD10': r.icd,
        'Chẩn đoán': r.chanDoan,
        'Người ký': r.nguoiKy,
        'Mã CCHN': r.cchn,
        'Trạng thái': r.trangThai === 'SUBMITTED' ? 'Đã gửi Cổng' : r.trangThai === 'SIGNED' ? 'Đã ký số' : 'Chưa ký số'
      }));
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "DanhSachHoSo");
      writeFile(wb, `DanhSachHoSo_XuatExcel_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Export error', err);
      alert('Lỗi xuất Excel');
    }
  };

  const filteredRecords = records.filter(r => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = r.hoTen.toLowerCase().includes(term);
      const matchBhyt = r.maBhyt.toLowerCase().includes(term);
      const matchCccd = r.cccd.toLowerCase().includes(term);
      if (!matchName && !matchBhyt && !matchCccd) return false;
    }
    // Filter by Type
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    // Filter by Status
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'SUBMITTED' && r.trangThai !== 'SUBMITTED') return false;
      if (filterStatus === 'SIGNED' && r.trangThai !== 'SIGNED') return false;
      if (filterStatus === 'UNSIGNED' && r.trangThai !== 'UNSIGNED' && r.trangThai !== 'DRAFT') return false;
      if (filterStatus === 'ERROR' && r.trangThai !== 'SIGN_FAILED' && r.trangThai !== 'SUBMIT_FAILED') return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-6">
      
      {/* Facility Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CƠ SỞ KHÁM CHỮA BỆNH</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  BHXH API: <span className="font-bold">Chưa kết nối</span>
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Chữ ký số: <span className="font-bold">VNPT SmartCA</span>
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded">MÃ: {cskcbConfig?.cskcb.ma || '49006'}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-4">{cskcbConfig?.cskcb.ten || 'Trung tâm Y tế khu vực Duy Xuyên'}</h2>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
                >
                  <Settings className="w-4 h-4" />
                  Cấu hình
                </button>
                <button 
                  onClick={() => setShowFacilityModal(true)}
                  className="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-blue-100 transition"
                >
                  <Building className="w-4 h-4" />
                  Đổi CSKCB
                </button>
                <button className="px-4 py-1.5 bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                  Trạm trực thuộc (0)
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-4 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition">
              <FileCode2 className="w-4 h-4 text-slate-400" />
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
              className="px-4 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-200 flex items-center gap-2 hover:bg-emerald-50 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Nhập Excel
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="px-4 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-200 flex items-center gap-2 hover:bg-emerald-50 transition"
              >
                <Download className="w-4 h-4" />
                Mẫu Excel
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showTemplateMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
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
                    <a key={tpl.id} href={`/templates/Template_${tpl.id}_Mau_Chuan_BHXH.xlsx`} className="flex gap-3 px-4 py-2.5 hover:bg-slate-50 transition cursor-pointer items-start" download>
                      <FileSpreadsheet className="w-5 h-5 text-indigo-500 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{tpl.name}</div>
                        <div className="text-xs text-slate-500">Template chuẩn {tpl.fields} trường dữ liệu</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setShowTaoHoSoModal(true)}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-200 transition"
            >
              <Plus className="w-4 h-4" />
              Tạo Hồ Sơ Mới
            </button>
          </div>
        </div>
        
        {/* Progress Flow */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2 md:gap-4 text-xs font-semibold text-slate-500">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mr-2">QUY TRÌNH LIÊN THÔNG:</span>
          
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">1</span>
            Nhập hồ sơ (Excel / XML)
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">2</span>
            Kiểm tra Rule TT25
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">3</span>
            Ký số SmartCA
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">4</span>
            Gửi Cổng BHXH
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <span className="w-4 h-4 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] text-emerald-800">5</span>
            Nhận Mã GD (200)
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500">Tổng hồ sơ</span>
            <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <FileCode2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 mb-1">{records.length}</div>
          <div className="text-[11px] text-slate-400">Mã CSKCB: {cskcbConfig?.cskcb.ma || '49004'}</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500">Đã gửi thành công</span>
            <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 mb-1">{submittedCount}</div>
          <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Mã kết quả 200 (BHXH)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500">Đã ký số</span>
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600 mb-1">{signedCount}</div>
          <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Sẵn sàng gửi Cổng
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500">Chờ ký duyệt</span>
            <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 mb-1">{draftCount}</div>
          <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Cần ký SmartCA
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500">Lỗi Rule Engine</span>
            <div className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 mb-1">{errorCount}</div>
          <div className={cn("text-[11px] font-semibold flex items-center gap-1", errorCount > 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {errorCount > 0 ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {errorCount > 0 ? `${errorCount} hồ sơ lỗi` : 'Không phát hiện lỗi'}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm họ tên, CCCD, thẻ BHYT, mã..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
              >
                <option value="ALL">Tất cả loại chứng từ</option>
                <option value="CT03">Giấy ra viện (CT03)</option>
                <option value="CT04">Tóm tắt BA (CT04)</option>
                <option value="CT05">Giấy chứng sinh (CT05)</option>
                <option value="CT06">Giấy nghỉ dưỡng thai (CT06)</option>
                <option value="CT07">Nghỉ việc BHXH (CT07)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUBMITTED">Đã gửi Cổng (200)</option>
                <option value="SIGNED">Đã ký số</option>
                <option value="UNSIGNED">Chờ ký duyệt</option>
                <option value="ERROR">Lỗi Rule TT25</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <button 
                  onClick={() => setKySoMode('sign')}
                  className="px-4 py-2 text-blue-700 text-sm font-bold flex items-center gap-2 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Ký số ({selectedIds.size})
                </button>
                <button 
                  onClick={() => setKySoMode('submit')}
                  className={cn(
                    "px-4 py-2 text-sm font-bold flex items-center gap-2 border rounded-lg transition",
                    selectedRecords.some(r => r.trangThai === 'SIGNED')
                      ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Gửi BHXH ({selectedRecords.filter(r => r.trangThai === 'SIGNED').length})
                </button>
                <button 
                  onClick={() => setKySoMode('sign_then_submit')}
                  className="px-4 py-2 text-indigo-700 text-sm font-bold flex items-center gap-2 border border-indigo-200 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  <ShieldCheck className="w-4 h-4" /> Ký & Gửi ({selectedIds.size})
                </button>
              </>
            ) : (
              <>
                <button className="px-4 py-2 text-slate-400 text-sm font-semibold flex items-center gap-2 border border-slate-100 rounded-lg bg-slate-50 cursor-not-allowed">
                  <ShieldCheck className="w-4 h-4" />
                  Ký số ({signedCount})
                </button>
                <button className="px-4 py-2 text-slate-400 text-sm font-semibold flex items-center gap-2 border border-slate-100 rounded-lg bg-slate-50 cursor-not-allowed">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã gửi ({submittedCount})
                </button>
              </>
            )}
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 text-slate-600 text-sm font-semibold flex items-center gap-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Excel ({records.length})
            </button>
          </div>
        </div>

        {/* Table Headers */}
        <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-[40px_1fr_2fr_1.5fr_1.5fr_1.5fr_1fr_140px] px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <div><input type="checkbox" className="rounded border-slate-300" onChange={toggleSelectAll} checked={records.length > 0 && selectedIds.size === records.length} /></div>
          <div>LOẠI HS</div>
          <div>HỌ VÀ TÊN / ĐỊNH DANH</div>
          <div>KHOA / THỜI GIAN KCB</div>
          <div>CHẨN ĐOÁN (ICD-10)</div>
          <div>NGƯỜI KÝ / CCHN</div>
          <div>TRẠNG THÁI</div>
          <div className="text-center">THAO TÁC</div>
        </div>

        {filteredRecords.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
              <FileCode2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Chưa có hồ sơ chứng từ nào</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">Bạn có thể Tạo hồ sơ mới, Nhập Excel từ mẫu của BHXH, hoặc Nhúng XML.</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" /> Nhập Excel ngay
              </button>
              <button 
                onClick={() => setShowTaoHoSoModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                + Tạo mới
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(r => (
                  <tr key={r.id} className={cn(
                    "hover:bg-slate-50 transition-colors",
                    selectedIds.has(r.id) && 'bg-blue-50/50'
                  )}>
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 mt-1" 
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </td>
                    <td className="px-4 py-3 align-top text-sm font-black text-indigo-700">{r.type}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-bold text-slate-800">{r.hoTen}</div>
                      <div className="text-[11px] font-semibold text-slate-500">{r.maBhyt || r.maBhxh} • {r.cccd}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div><span className="font-bold text-slate-700">{r.khoa}</span></div>
                      <div className="text-[11px] text-slate-500">{r.ngayVao} {r.ngayRa ? `- ${r.ngayRa}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div><span className="font-bold text-slate-700">{r.icd}</span></div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={r.chanDoan}>{r.chanDoan}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div><span className="font-bold text-slate-700">{r.nguoiKy}</span></div>
                      <div className="text-[11px] text-slate-500">{r.cchn}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn(
                        "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border inline-block mt-0.5",
                        r.trangThai === 'SUBMITTED' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        r.trangThai === 'SIGNED' && 'bg-blue-100 text-blue-700 border-blue-200',
                        (r.trangThai === 'UNSIGNED' || r.trangThai === 'DRAFT') && 'bg-amber-50 text-amber-700 border-amber-200',
                        (r.trangThai === 'SIGN_FAILED' || r.trangThai === 'SUBMIT_FAILED') && 'bg-rose-100 text-rose-700 border-rose-200',
                        r.trangThai === 'SIGNING' && 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse',
                      )}>
                        {r.trangThai === 'SUBMITTED' ? '✅ Đã gửi Cổng' :
                         r.trangThai === 'SIGNED' ? '🔒 Đã ký số' :
                         r.trangThai === 'SIGN_FAILED' ? '❌ Lỗi ký' :
                         r.trangThai === 'SUBMIT_FAILED' ? '❌ Lỗi gửi' :
                         r.trangThai === 'SIGNING' ? '⏳ Đang ký...' : '⚠️ Chưa ký số'}
                      </span>
                      {r.maGD && <div className="text-[9px] text-emerald-600 font-bold mt-1">Mã GD: {r.maGD}</div>}
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      <div className="flex items-center justify-center gap-2 mt-0.5">
                        {r.trangThai === 'SUBMITTED' ? (
                          <span className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-1 text-[10px] font-bold" title="Đã hoàn thành đẩy">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Xong
                          </span>
                        ) : (
                          <>
                            {r.trangThai === 'SIGNED' ? (
                              <button 
                                onClick={() => { toggleSelect(r.id); setKySoMode('submit'); }}
                                title="Đã ký số. Nhấn để gửi BHXH"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-100 bg-white" 
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => { toggleSelect(r.id); setKySoMode('sign'); }}
                                title="Chưa ký. Nhấn để ký số"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition border border-rose-100 bg-white" 
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => { toggleSelect(r.id); setKySoMode('sign_then_submit'); }}
                              title="Ký & Gửi BHXH"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Cấu Hình Đơn Vị & Liên Thông Cổng BHXH</h3>
                  <div className="text-xs text-slate-500">Mã CSKCB: <span className="font-bold text-blue-600">{cskcbConfig?.cskcb.ma || '49004'}</span> - {cskcbConfig?.cskcb.ten || 'Bệnh viện đa khoa khu vực miền núi phía Bắc Quảng Nam'}</div>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
                <button className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Thông tin cơ sở KCB</button>
                <button className="px-4 py-2 text-sm font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Cấu hình VNPT SmartCA
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Liên thông BHYT</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Base URL</label>
                  <input type="text" defaultValue="https://gwsca.vnpt.vn" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Client ID (SP ID)</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Client Secret</label>
                    <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">User ID</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
                    <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Serial Number</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Secret (TOTP)</label>
                    <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-medium flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  CẢNH BÁO NGUY CƠ: Việc lưu mã Secret tại đây có thể dẫn đến rủi ro lộ khóa cá nhân nếu máy tính bị xâm nhập. Chỉ sử dụng nếu bạn hiểu rõ và chấp nhận rủi ro bảo mật.
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Kiểm tra kết nối
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-rose-600 border border-rose-100 bg-rose-50 rounded-lg hover:bg-rose-100">
                  Xóa cấu hình
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowConfigModal(false)} className="px-6 py-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50">
                  Hủy
                </button>
                <button className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showFacilityModal || !cskcbConfig) && (
        <CskcbSetupModal
          initialConfig={cskcbConfig || undefined}
          onClose={cskcbConfig ? () => setShowFacilityModal(false) : undefined}
          onSave={(cfg) => {
            setCskcbConfig(cfg);
            setShowFacilityModal(false);
          }}
        />
      )}

      {showTaoHoSoModal && (
        <TaoHoSoModal onClose={() => setShowTaoHoSoModal(false)} />
      )}

      {showConfigModal && (
        <ConfigModal onClose={() => setShowConfigModal(false)} />
      )}

    </div>
  );
}
