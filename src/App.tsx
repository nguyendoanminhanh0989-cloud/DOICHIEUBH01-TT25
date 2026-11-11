/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Settings, 
  Play, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Search,
  FileSpreadsheet,
  ArrowRightLeft,
  Filter,
  BarChart3,
  ShieldCheck,
  LayoutGrid,
  FileCode2,
  Building2,
  Home,
  Users,
  LogOut,
  UserCheck,
  Lock,
  KeyRound
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { mapExcelToRow, generateKey, smartMapHeaders, parseGiamDinhXml } from './lib/data-utils';
import { 
  TemplateRow, 
  ColumnMapping, 
  ComparisonResult, 
  AuditSummary 
} from './types';
import HoSoChungTu from './components/HoSoChungTu';
import KhamSucKhoe from './components/KhamSucKhoe';
import Xml3176Module from './components/Xml3176Module';
import ChungTuTt12Module from './components/ChungTuTt12Module';
import {
  clearAllSessionCache,
  getSessionCache,
  getSessionSync,
  removeSessionCache,
  setSessionCache,
  setSessionSync,
} from './lib/sessionCache';
import QuickLinksSidebar from './components/QuickLinksSidebar';
import AuthScreen from './components/AuthScreen';
import UserManagementModal from './components/UserManagementModal';
import {
  AppUser,
  AppModuleId,
  getCurrentSession,
  verifyActiveSession,
  logoutUser,
} from './lib/authService';

// Default mappings
const DEFAULT_MAPPING: ColumnMapping = {
  STT: 'STT',
  MA_LK: 'MA_LK',
  HO_TEN: 'HO_TEN',
  NGAY_SINH: 'NGAY_SINH',
  GIOI_TINH: 'GIOI_TINH',
  MA_THE_BHYT: 'MA_THE_BHYT',
  MA_BENH_CHINH: 'MA_BENH_CHINH',
  NGAY_VAO: 'NGAY_VAO',
  NGAY_VAO_NOI_TRU: 'NGAY_VAO_NOI_TRU',
  NGAY_RA: 'NGAY_RA',
  SO_NGAY_DTRI: 'SO_NGAY_DTRI',
  MA_LOAI_KCB: 'MA_LOAI_KCB',
  T_TONGCHI_BV: 'T_TONGCHI_BV',
  T_TONGCHI_BH: 'T_TONGCHI_BH',
  T_BHTT: 'T_BHTT',
  T_BNCCT: 'T_BNCCT',
  T_BNTT: 'T_BNTT',
  T_NGUONKHAC: 'T_NGUONKHAC',
  MA_CSKCB: 'MA_CSKCB',
  NAM_QT: 'NAM_QT',
  THANG_QT: 'THANG_QT'
};

const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 12) return dateStr;
  try {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const min = dateStr.substring(10, 12);
    return `${day}/${month}/${year} ${hour}:${min}`;
  } catch (e) {
    return dateStr;
  }
};

export type SortConfig = { key: keyof TemplateRow, dir: 'asc' | 'desc' } | null;

const TableHeaders21 = ({ sortConfig, onSort }: { sortConfig?: SortConfig, onSort?: (key: keyof TemplateRow) => void }) => {
  const Header = ({ title, columnKey, align = 'left' }: { title: string, columnKey: keyof TemplateRow, align?: 'left'|'right' }) => (
    <th 
      className={`px-3 py-2 font-bold text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {title}
        {sortConfig?.key === columnKey && (
          <span className="text-[10px] text-indigo-500">
            {sortConfig.dir === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <>
      <Header title="STT" columnKey="STT" />
      <Header title="MA_LK" columnKey="MA_LK" />
      <Header title="HO_TEN" columnKey="HO_TEN" />
      <Header title="NGAY_SINH" columnKey="NGAY_SINH" />
      <Header title="GIOI_TINH" columnKey="GIOI_TINH" />
      <Header title="MA_THE_BHYT" columnKey="MA_THE_BHYT" />
      <Header title="MA_BENH_CHINH" columnKey="MA_BENH_CHINH" />
      <Header title="NGAY_VAO" columnKey="NGAY_VAO" />
      <Header title="NGAY_VAO_NT" columnKey="NGAY_VAO_NOI_TRU" />
      <Header title="NGAY_RA" columnKey="NGAY_RA" />
      <Header title="NGAY_DTRI" columnKey="SO_NGAY_DTRI" />
      <Header title="LOAI_KCB" columnKey="MA_LOAI_KCB" />
      <Header title="T_TONGCHI_BV" columnKey="T_TONGCHI_BV" align="right" />
      <Header title="T_TONGCHI_BH" columnKey="T_TONGCHI_BH" align="right" />
      <Header title="T_BHTT" columnKey="T_BHTT" align="right" />
      <Header title="T_BNCCT" columnKey="T_BNCCT" align="right" />
      <Header title="T_BNTT" columnKey="T_BNTT" align="right" />
      <Header title="T_NGUONKHAC" columnKey="T_NGUONKHAC" align="right" />
      <Header title="MA_CSKCB" columnKey="MA_CSKCB" />
      <Header title="NAM_QT" columnKey="NAM_QT" />
      <Header title="THANG_QT" columnKey="THANG_QT" />
    </>
  );
};

const TableRow21 = ({ row }: { row: TemplateRow }) => (
  <>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{row.STT}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono text-slate-500">{row.MA_LK}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-bold min-w-[150px]">{row.HO_TEN}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.NGAY_SINH}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.GIOI_TINH}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{row.MA_THE_BHYT}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.MA_BENH_CHINH}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{row.NGAY_VAO}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{row.NGAY_VAO_NOI_TRU}</td>
    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{row.NGAY_RA}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.SO_NGAY_DTRI}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.MA_LOAI_KCB}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right">{row.T_TONGCHI_BV !== null ? row.T_TONGCHI_BV.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right font-bold text-indigo-600">{row.T_TONGCHI_BH !== null ? row.T_TONGCHI_BH.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right font-bold text-emerald-600">{row.T_BHTT !== null ? row.T_BHTT.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right">{row.T_BNCCT !== null ? row.T_BNCCT.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right">{row.T_BNTT !== null ? row.T_BNTT.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap text-right">{row.T_NGUONKHAC !== null ? row.T_NGUONKHAC.toLocaleString() : '-'}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.MA_CSKCB}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.NAM_QT}</td>
    <td className="px-3 py-1.5 whitespace-nowrap">{row.THANG_QT}</td>
  </>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    return getCurrentSession()?.user || null;
  });
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [forcedLogoutMessage, setForcedLogoutMessage] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<'HOME' | 'DOI_SOAT' | 'CHUNG_TU' | 'KHAM_SUC_KHOE' | 'XML_3176' | 'TT12_BH01_BH02'>(() =>
    getSessionSync('app_main_tab', 'HOME')
  );
  const [bhxhData, setBhxhData] = useState<any[]>([]);
  const [hisData, setHisData] = useState<any[]>([]);

  useEffect(() => {
    setSessionSync('app_main_tab', mainTab);
  }, [mainTab]);

  // Kiểm tra định kỳ trạng thái tài khoản từ Cloud (nếu bị Admin tạm ngưng hoặc xóa thì tự động văng ra màn hình đăng nhập)
  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    const checkSessionStatus = async () => {
      try {
        const res = await verifyActiveSession();
        if (!mounted) return;
        if (!res.valid) {
          setCurrentUser(null);
          if (res.reason) {
            setForcedLogoutMessage(res.reason);
          }
        } else if (res.user) {
          setCurrentUser(res.user);
        }
      } catch {}
    };
    checkSessionStatus();
    const timer = setInterval(checkSessionStatus, 20000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [currentUser?.id, mainTab]);

  const resetDoiSoatData = () => {
    setBhxhData([]);
    setHisData([]);
    setBhxhConverted([]);
    setHisConverted([]);
    setBhxhFiles([]);
    setHisFiles([]);
    setResults([]);
    setSummary(null);
    setActiveTab('upload');
    setFilterType('ALL');
    removeSessionCache('doi_soat_state_v1').catch(() => {});
  };

  const handleSelectModuleTab = (tab: 'HOME' | AppModuleId) => {
    if (tab === 'HOME') {
      setMainTab('HOME');
      return;
    }
    if (
      tab !== 'TT12_BH01_BH02' &&
      currentUser &&
      currentUser.role !== 'ADMIN' &&
      Array.isArray(currentUser.allowedModules) &&
      !currentUser.allowedModules.includes(tab)
    ) {
      alert('⛔ Tài khoản của bạn chưa được Quản trị viên cấp quyền sử dụng phân hệ này!');
      return;
    }
    setMainTab(tab);
  };

  const handleLogout = () => {
    logoutUser();
    resetDoiSoatData();
    clearAllSessionCache().catch(() => {});
    setCurrentUser(null);
    setForcedLogoutMessage(null);
    setMainTab('HOME');
  };
  
  const [bhxhConverted, setBhxhConverted] = useState<TemplateRow[]>([]);
  const [hisConverted, setHisConverted] = useState<TemplateRow[]>([]);

  const [bhxhMapping, setBhxhMapping] = useState<ColumnMapping>({ ...DEFAULT_MAPPING });
  const [hisMapping, setHisMapping] = useState<ColumnMapping>({ ...DEFAULT_MAPPING });
  
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping' | 'results'>('upload');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [doiSoatCacheLoaded, setDoiSoatCacheLoaded] = useState(false);

  const [bhxhSort, setBhxhSort] = useState<SortConfig>(null);
  const [hisSort, setHisSort] = useState<SortConfig>(null);

  const handleSort = (key: keyof TemplateRow, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
    if (currentSort?.key === key) {
      if (currentSort.dir === 'asc') setSort({ key, dir: 'desc' });
      else setSort(null);
    } else {
      setSort({ key, dir: 'asc' });
    }
  };

  const getSortedData = (data: TemplateRow[], sortConfig: SortConfig) => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string' && !isNaN(Number(aVal)) && aVal !== '') aVal = Number(aVal);
      if (typeof bVal === 'string' && !isNaN(Number(bVal)) && bVal !== '') bVal = Number(bVal);

      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const displayBhxh = getSortedData(bhxhConverted, bhxhSort).slice(0, 500);
  const displayHis = getSortedData(hisConverted, hisSort).slice(0, 500);

  const [bhxhFiles, setBhxhFiles] = useState<{ name: string; count: number }[]>([]);
  const [hisFiles, setHisFiles] = useState<{ name: string; count: number }[]>([]);

  // Khôi phục dữ liệu Đối chiếu BH01 khi bấm F5 (cùng phiên trình duyệt)
  useEffect(() => {
    let mounted = true;
    getSessionCache<{
      bhxhData: any[];
      hisData: any[];
      bhxhConverted: TemplateRow[];
      hisConverted: TemplateRow[];
      bhxhMapping: ColumnMapping;
      hisMapping: ColumnMapping;
      bhxhFiles: { name: string; count: number }[];
      hisFiles: { name: string; count: number }[];
      results: ComparisonResult[];
      summary: AuditSummary | null;
      activeTab: 'upload' | 'mapping' | 'results';
      filterType: string;
    }>('doi_soat_state_v1')
      .then(cached => {
        if (!mounted) return;
        if (cached) {
          if (Array.isArray(cached.bhxhData)) setBhxhData(cached.bhxhData);
          if (Array.isArray(cached.hisData)) setHisData(cached.hisData);
          if (Array.isArray(cached.bhxhConverted)) setBhxhConverted(cached.bhxhConverted);
          if (Array.isArray(cached.hisConverted)) setHisConverted(cached.hisConverted);
          if (cached.bhxhMapping) setBhxhMapping(cached.bhxhMapping);
          if (cached.hisMapping) setHisMapping(cached.hisMapping);
          if (Array.isArray(cached.bhxhFiles)) setBhxhFiles(cached.bhxhFiles);
          if (Array.isArray(cached.hisFiles)) setHisFiles(cached.hisFiles);
          if (Array.isArray(cached.results)) setResults(cached.results);
          if (cached.summary) setSummary(cached.summary);
          if (cached.activeTab) setActiveTab(cached.activeTab);
          if (cached.filterType) setFilterType(cached.filterType);
        }
      })
      .finally(() => {
        if (mounted) setDoiSoatCacheLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Lưu tự động dữ liệu Đối chiếu BH01 vào cache phiên trình duyệt (giữ qua F5, tắt trình duyệt tự xóa)
  useEffect(() => {
    if (!doiSoatCacheLoaded) return;
    setSessionCache('doi_soat_state_v1', {
      bhxhData,
      hisData,
      bhxhConverted,
      hisConverted,
      bhxhMapping,
      hisMapping,
      bhxhFiles,
      hisFiles,
      results,
      summary,
      activeTab,
      filterType,
    }).catch(() => {});
  }, [
    doiSoatCacheLoaded,
    bhxhData,
    hisData,
    bhxhConverted,
    hisConverted,
    bhxhMapping,
    hisMapping,
    bhxhFiles,
    hisFiles,
    results,
    summary,
    activeTab,
    filterType,
  ]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BHXH' | 'HIS') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesInfo: { name: string; count: number }[] = [];
    let combinedData: any[] = [];
    
    let currentBhxhMapping = { ...bhxhMapping };
    let currentHisMapping = { ...hisMapping };

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await new Promise<any[]>((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const result = evt.target?.result;
          let jsonData: any[] = [];

          if (file.name.toLowerCase().endsWith('.xml')) {
            jsonData = parseGiamDinhXml(result as string);
          } else {
            const wb = XLSX.read(result, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });
          }
          
          if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0] as object);
            const smartMapping = smartMapHeaders(headers);
            if (type === 'BHXH') {
              currentBhxhMapping = { ...currentBhxhMapping, ...smartMapping };
            } else {
              currentHisMapping = { ...currentHisMapping, ...smartMapping };
            }
          }
          
          resolve(jsonData);
        };

        if (file.name.toLowerCase().endsWith('.xml')) {
          reader.readAsText(file);
        } else {
          reader.readAsBinaryString(file);
        }
      });

      combinedData = [...combinedData, ...data];
      newFilesInfo.push({ name: file.name, count: data.length });
    }

    if (type === 'BHXH') {
      setBhxhMapping(currentBhxhMapping);
      const newRaw = [...bhxhData, ...combinedData];
      setBhxhData(newRaw);
      setBhxhFiles(prev => [...prev, ...newFilesInfo]);
      setBhxhConverted(mapExcelToRow(newRaw, currentBhxhMapping, 'BHXH'));
    } else {
      setHisMapping(currentHisMapping);
      const newRaw = [...hisData, ...combinedData];
      setHisData(newRaw);
      setHisFiles(prev => [...prev, ...newFilesInfo]);
      setHisConverted(mapExcelToRow(newRaw, currentHisMapping, 'HIS'));
    }
    
    setIsProcessing(false);
  };

  const applyMappingUpdate = (type: 'BHXH' | 'HIS') => {
    if (type === 'BHXH' && bhxhData.length > 0) {
      setBhxhConverted(mapExcelToRow(bhxhData, bhxhMapping, 'BHXH'));
    }
    if (type === 'HIS' && hisData.length > 0) {
      setHisConverted(mapExcelToRow(hisData, hisMapping, 'HIS'));
    }
  };

  const clearData = (type: 'BHXH' | 'HIS') => {
    if (type === 'BHXH') {
      setBhxhData([]);
      setBhxhConverted([]);
      setBhxhFiles([]);
    } else {
      setHisData([]);
      setHisConverted([]);
      setHisFiles([]);
    }
  };

  const runComparison = () => {
    setIsProcessing(true);
    setActiveTab('results');

    setTimeout(() => {
      const bhxhMap = new Map<string, TemplateRow[]>();
      bhxhConverted.forEach(row => {
        const key = generateKey(row);
        const existing = bhxhMap.get(key) || [];
        bhxhMap.set(key, [...existing, row]);
      });

      const hisMap = new Map<string, TemplateRow[]>();
      hisConverted.forEach(row => {
        const key = generateKey(row);
        const existing = hisMap.get(key) || [];
        hisMap.set(key, [...existing, row]);
      });

      const finalResults: ComparisonResult[] = [];
      const usedBhxhKeys = new Set<string>();

      hisMap.forEach((rows, key) => {
        const bhxhMatches = bhxhMap.get(key);

        if (!bhxhMatches) {
          rows.forEach(row => {
            finalResults.push({
              match: false,
              type: 'MISSING_BHXH',
              details: [`Không tìm thấy trong file BHXH`],
              hisItem: row
            });
          });
        } else {
          usedBhxhKeys.add(key);
          
          rows.forEach((hisRow, index) => {
            const bhxhRow = bhxhMatches[index];
            if (!bhxhRow) {
              finalResults.push({
                match: false,
                type: 'MISSING_BHXH',
                details: [`Dòng thứ ${index + 1} của lượt KCB này không tìm thấy trong BHXH`],
                hisItem: hisRow
              });
            } else {
              const discrepancies: string[] = [];
              
              const compareNum = (a: number | null, b: number | null, label: string) => {
                if (a !== null && b !== null && Math.abs(a - b) > 10) {
                  discrepancies.push(`${label} lệch: HIS(${a.toLocaleString()}) vs BHXH(${b.toLocaleString()})`);
                }
              };

              const compareStr = (a: string | null | undefined, b: string | null | undefined, label: string) => {
                if (a && b && a.trim() !== '' && b.trim() !== '') {
                  const aUpper = a.toString().trim().toUpperCase();
                  const bUpper = b.toString().trim().toUpperCase();
                  if (aUpper !== bUpper) {
                    discrepancies.push(`${label} lệch: HIS(${a}) vs BHXH(${b})`);
                  }
                }
              };

              const compareDate = (a: string | null | undefined, b: string | null | undefined, label: string) => {
                if (a && b && a.trim() !== '' && b.trim() !== '') {
                  if (a !== b) {
                    discrepancies.push(`${label} lệch thời gian: HIS(${formatDateForDisplay(a)}) vs BHXH(${formatDateForDisplay(b)})`);
                  }
                }
              };

              const compareGender = (a: string | null | undefined, b: string | null | undefined) => {
                if (!a || !b || a.trim() === '' || b.trim() === '') return;
                
                const normalize = (val: string) => {
                  const v = val.toString().trim().toUpperCase();
                  if (v === '1' || v === 'NAM') return 'NAM';
                  if (v === '2' || v === 'NỮ' || v === 'NU') return 'NỮ';
                  return v;
                };

                if (normalize(a) !== normalize(b)) {
                  discrepancies.push(`Giới tính lệch: HIS(${a}) vs BHXH(${b})`);
                }
              };

              const compareDob = (a: string | null | undefined, b: string | null | undefined) => {
                if (a && b && a.trim() !== '' && b.trim() !== '') {
                  let aVal = a.toString().trim().toUpperCase();
                  let bVal = b.toString().trim().toUpperCase();
                  
                  // Xử lý logic yyyy0000 = yyyy0101 (nếu chỉ có năm sinh)
                  if (aVal.length === 8 && aVal.endsWith('0000')) aVal = aVal.substring(0, 4) + '0101';
                  if (bVal.length === 8 && bVal.endsWith('0000')) bVal = bVal.substring(0, 4) + '0101';

                  if (aVal !== bVal) {
                    discrepancies.push(`Ngày sinh lệch: HIS(${a}) vs BHXH(${b})`);
                  }
                }
              };

              // Đối chiếu Hành chính
              compareStr(hisRow.HO_TEN, bhxhRow.HO_TEN, 'Họ tên');
              compareDob(hisRow.NGAY_SINH, bhxhRow.NGAY_SINH);
              compareGender(hisRow.GIOI_TINH, bhxhRow.GIOI_TINH);
              
              // Đối chiếu Thời gian & Lâm sàng
              compareStr(hisRow.MA_BENH_CHINH, bhxhRow.MA_BENH_CHINH, 'Mã bệnh chính');
              compareDate(hisRow.NGAY_VAO, bhxhRow.NGAY_VAO, 'Ngày vào');
              compareDate(hisRow.NGAY_VAO_NOI_TRU, bhxhRow.NGAY_VAO_NOI_TRU, 'Ngày vào nội trú');
              compareDate(hisRow.NGAY_RA, bhxhRow.NGAY_RA, 'Ngày ra');
              compareStr(hisRow.SO_NGAY_DTRI, bhxhRow.SO_NGAY_DTRI, 'Số ngày ĐTrị');
              compareStr(hisRow.MA_LOAI_KCB, bhxhRow.MA_LOAI_KCB, 'Loại KCB');

              // Đối chiếu Tài chính
              compareNum(hisRow.T_TONGCHI_BV, bhxhRow.T_TONGCHI_BV, 'T_TONGCHI_BV');
              compareNum(hisRow.T_TONGCHI_BH, bhxhRow.T_TONGCHI_BH, 'T_TONGCHI_BH');
              compareNum(hisRow.T_BHTT, bhxhRow.T_BHTT, 'T_BHTT');
              compareNum(hisRow.T_BNCCT, bhxhRow.T_BNCCT, 'T_BNCCT');
              compareNum(hisRow.T_BNTT, bhxhRow.T_BNTT, 'T_BNTT');
              compareNum(hisRow.T_NGUONKHAC, bhxhRow.T_NGUONKHAC, 'T_NGUONKHAC');

              // Đối chiếu Khác
              compareStr(hisRow.MA_CSKCB, bhxhRow.MA_CSKCB, 'Mã CSKCB');
              compareStr(hisRow.NAM_QT, bhxhRow.NAM_QT, 'Năm QT');
              compareStr(hisRow.THANG_QT, bhxhRow.THANG_QT, 'Tháng QT');

              if (discrepancies.length > 0) {
                finalResults.push({
                  match: false,
                  type: 'DISCREPANCY',
                  details: discrepancies,
                  hisItem: hisRow,
                  bhxhItem: bhxhRow
                });
              } else {
                finalResults.push({
                  match: true,
                  type: 'MATCH',
                  details: ['Khớp dữ liệu'],
                  hisItem: hisRow,
                  bhxhItem: bhxhRow
                });
              }
            }
          });

          if (bhxhMatches.length > rows.length) {
            bhxhMatches.slice(rows.length).forEach(row => {
              finalResults.push({
                match: false,
                type: 'MISSING_HIS',
                details: [`Dữ liệu BHXH thừa so với HIS`],
                bhxhItem: row
              });
            });
          }
        }
      });

      bhxhMap.forEach((rows, key) => {
        if (!usedBhxhKeys.has(key)) {
          rows.forEach(row => {
            finalResults.push({
              match: false,
              type: 'MISSING_HIS',
              details: [`Không tìm thấy trong file HIS`],
              bhxhItem: row
            });
          });
        }
      });
      
      setResults(finalResults);
      setSummary({
        totalBHXH: bhxhConverted.length,
        totalHIS: hisConverted.length,
        totalMatch: finalResults.filter(r => r.type === 'MATCH').length,
        missingBHXH: finalResults.filter(r => r.type === 'MISSING_BHXH').length,
        missingHIS: finalResults.filter(r => r.type === 'MISSING_HIS').length,
        discrepancies: finalResults.filter(r => r.type === 'DISCREPANCY').length,
        warnings: finalResults.filter(r => r.type === 'WARNING').length
      });
      setIsProcessing(false);
    }, 500);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    const createSheet = (sheetName: string, dataToExport: ComparisonResult[]) => {
      const sheet = workbook.addWorksheet(sheetName);
      
      sheet.columns = [
        { header: 'STT', key: 'STT', width: 10 },
        { header: 'MA_LK', key: 'MA_LK', width: 20 },
        { header: 'HO_TEN', key: 'HO_TEN', width: 25 },
        { header: 'NGAY_SINH', key: 'NGAY_SINH', width: 15 },
        { header: 'GIOI_TINH', key: 'GIOI_TINH', width: 10 },
        { header: 'MA_THE_BHYT', key: 'MA_THE_BHYT', width: 20 },
        { header: 'MA_BENH_CHINH', key: 'MA_BENH_CHINH', width: 15 },
        { header: 'NGAY_VAO', key: 'NGAY_VAO', width: 15 },
        { header: 'NGAY_VAO_NOI_TRU', key: 'NGAY_VAO_NOI_TRU', width: 15 },
        { header: 'NGAY_RA', key: 'NGAY_RA', width: 15 },
        { header: 'SO_NGAY_DTRI', key: 'SO_NGAY_DTRI', width: 10 },
        { header: 'MA_LOAI_KCB', key: 'MA_LOAI_KCB', width: 10 },
        { header: 'T_TONGCHI_BV', key: 'T_TONGCHI_BV', width: 15 },
        { header: 'T_TONGCHI_BH', key: 'T_TONGCHI_BH', width: 15 },
        { header: 'T_BHTT', key: 'T_BHTT', width: 15 },
        { header: 'T_BNCCT', key: 'T_BNCCT', width: 15 },
        { header: 'T_BNTT', key: 'T_BNTT', width: 15 },
        { header: 'T_NGUONKHAC', key: 'T_NGUONKHAC', width: 15 },
        { header: 'MA_CSKCB', key: 'MA_CSKCB', width: 15 },
        { header: 'NAM_QT', key: 'NAM_QT', width: 10 },
        { header: 'THANG_QT', key: 'THANG_QT', width: 10 },
        { header: 'KẾT QUẢ ĐỐI CHIẾU', key: 'KET_QUA', width: 30 }
      ];

      dataToExport.forEach((r, idx) => {
        const item = r.hisItem || r.bhxhItem;
        if (item) {
          sheet.addRow({
            STT: item.STT || idx + 1,
            MA_LK: item.MA_LK,
            HO_TEN: item.HO_TEN,
            NGAY_SINH: item.NGAY_SINH,
            GIOI_TINH: item.GIOI_TINH,
            MA_THE_BHYT: item.MA_THE_BHYT,
            MA_BENH_CHINH: item.MA_BENH_CHINH,
            NGAY_VAO: item.NGAY_VAO,
            NGAY_VAO_NOI_TRU: item.NGAY_VAO_NOI_TRU,
            NGAY_RA: item.NGAY_RA,
            SO_NGAY_DTRI: item.SO_NGAY_DTRI,
            MA_LOAI_KCB: item.MA_LOAI_KCB,
            T_TONGCHI_BV: item.T_TONGCHI_BV,
            T_TONGCHI_BH: item.T_TONGCHI_BH,
            T_BHTT: item.T_BHTT,
            T_BNCCT: item.T_BNCCT,
            T_BNTT: item.T_BNTT,
            T_NGUONKHAC: item.T_NGUONKHAC,
            MA_CSKCB: item.MA_CSKCB,
            NAM_QT: item.NAM_QT,
            THANG_QT: item.THANG_QT,
            KET_QUA: r.type !== 'MATCH' ? r.details.join('; ') : 'Khớp'
          });
        }
      });
    };

    createSheet('Tổng hợp', results);
    createSheet('Sai lệch', results.filter(r => r.type === 'DISCREPANCY'));
    createSheet('Thiếu BHXH', results.filter(r => r.type === 'MISSING_BHXH'));
    createSheet('Thiếu HIS', results.filter(r => r.type === 'MISSING_HIS'));
    createSheet('Trùng khớp', results.filter(r => r.type === 'MATCH'));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Xuat_21_Cot_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    a.click();
  };

  const filteredResults = useMemo(() => {
    if (filterType === 'ALL') return results;
    return results.filter(r => r.type === filterType);
  }, [results, filterType]);

  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={user => {
          setCurrentUser(user);
          setForcedLogoutMessage(null);
        }}
        forcedLogoutMessage={forcedLogoutMessage}
      />
    );
  }

  return (
    <div 
      className={cn(
        "min-h-screen text-slate-900 font-sans selection:bg-lime-300 selection:text-lime-900 bg-cover bg-center bg-fixed relative",
        mainTab === 'TT12_BH01_BH02' || mainTab === 'XML_3176'
          ? "h-screen overflow-hidden flex flex-col"
          : "pb-12"
      )}
      style={{ 
        backgroundImage: "url('/hinh_nen.png')",
        backgroundColor: "rgba(57, 255, 20, 0.15)", // Neon green overlay
        backgroundBlendMode: "overlay"
      }}
    >
      {/* Sidebar liên kết nhanh - chỉ hiện trên trang HOME */}
      {mainTab === 'HOME' && <QuickLinksSidebar />}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-300 sticky top-0 z-50 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-3 py-1.5 min-h-11 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2">
          {/* Logo + Home button */}
          <button
            onClick={() => setMainTab('HOME')}
            className={cn(
              "flex items-center gap-1.5 group transition-all rounded-lg px-2.5 py-1 border shrink-0 cursor-pointer",
              mainTab === 'HOME'
                ? "bg-blue-50 border-blue-300 shadow-2xs"
                : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            )}
            title="Về Trang chủ"
          >
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center text-white transition-all shrink-0",
              mainTab === 'HOME' ? "bg-blue-700" : "bg-blue-600 group-hover:bg-blue-700"
            )}>
              <Home className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-[11.5px] font-extrabold tracking-tight text-slate-800 flex items-center gap-1 whitespace-nowrap">
              <span>TRANG CHỦ</span>
              {mainTab === 'HOME' && (
                <span className="bg-blue-100 text-[9px] px-1.5 py-px rounded text-blue-700 font-bold border border-blue-200">
                  ĐỐI CHIẾU & CHỨNG TỪ
                </span>
              )}
            </h1>
          </button>

          {mainTab !== 'HOME' && (
          <nav className="flex flex-wrap items-center justify-center gap-1.5 flex-1 min-w-0">
            <button
              onClick={() => handleSelectModuleTab('DOI_SOAT')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer",
                mainTab === 'DOI_SOAT'
                  ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>ĐỐI CHIẾU BH01</span>
            </button>
            <button
              onClick={() => handleSelectModuleTab('CHUNG_TU')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer",
                mainTab === 'CHUNG_TU'
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-blue-50 hover:border-blue-300"
              )}
            >
              <FileCode2 className="w-3.5 h-3.5 shrink-0" />
              <span>HỒ SƠ CHỨNG TỪ</span>
              <span className={cn("text-[9px] px-1 py-px rounded border", mainTab === 'CHUNG_TU' ? "bg-white/20 text-white border-white/30" : "bg-blue-50 text-blue-700 border-blue-200")}>TT25</span>
            </button>
            <button
              onClick={() => handleSelectModuleTab('KHAM_SUC_KHOE')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer",
                mainTab === 'KHAM_SUC_KHOE'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300"
              )}
            >
              <FileCode2 className="w-3.5 h-3.5 shrink-0" />
              <span>KHÁM SỨC KHỎE</span>
              <span className={cn("text-[9px] px-1 py-px rounded border", mainTab === 'KHAM_SUC_KHOE' ? "bg-white/20 text-white border-white/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>EMRHUB</span>
            </button>
            <button
              onClick={() => handleSelectModuleTab('XML_3176')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer",
                mainTab === 'XML_3176'
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-amber-50 hover:border-amber-300"
              )}
            >
              <FileCode2 className="w-3.5 h-3.5 shrink-0" />
              <span>ĐỌC & KÝ XML 3176</span>
              <span className={cn("text-[9px] px-1 py-px rounded border", mainTab === 'XML_3176' ? "bg-white/20 text-white border-white/30" : "bg-amber-50 text-amber-800 border-amber-200")}>15 BẢNG</span>
            </button>
            <button
              onClick={() => handleSelectModuleTab('TT12_BH01_BH02')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap cursor-pointer",
                mainTab === 'TT12_BH01_BH02'
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-purple-50 hover:border-purple-300"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>CHỨNG TỪ TT12</span>
              <span className={cn("text-[9px] px-1 py-px rounded border", mainTab === 'TT12_BH01_BH02' ? "bg-white/20 text-white border-white/30" : "bg-purple-50 text-purple-800 border-purple-200")}>BH01 • BH02</span>
            </button>
          </nav>
          )}

          <div className="flex items-center gap-1.5 text-[10px] font-semibold shrink-0">
            {/* Badge Thông tin tài khoản đang đăng nhập */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-300 text-slate-700">
              <div className={cn(
                "w-4 h-4 rounded flex items-center justify-center text-[9px] font-black text-white shrink-0",
                currentUser.role === 'ADMIN' ? "bg-indigo-600" : "bg-blue-600"
              )}>
                {(currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-slate-800 max-w-[130px] truncate" title={currentUser.fullName || currentUser.username}>
                {currentUser.fullName || currentUser.username}
              </span>
              <span className={cn(
                "text-[9px] px-1 py-px rounded font-extrabold border",
                currentUser.role === 'ADMIN'
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                {currentUser.role === 'ADMIN' ? 'ADMIN' : `@${currentUser.username}`}
              </span>
            </div>

            {/* Nút Quản lý Người dùng (Admin) / Đổi mật khẩu (User) */}
            <button
              onClick={() => setShowUserManagementModal(true)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border transition-all cursor-pointer",
                currentUser.role === 'ADMIN'
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-xs"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
              )}
              title={currentUser.role === 'ADMIN' ? "Mở Bảng Quản Trị Người Dùng (Duyệt, Tạo TK, Reset MK, Tạm ngưng, Xóa)" : "Cài đặt tài khoản & Đổi mật khẩu"}
            >
              {currentUser.role === 'ADMIN' ? (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Quản lý User</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đổi MK</span>
                </>
              )}
            </button>

            {/* Nút Đăng xuất */}
            <button
              onClick={handleLogout}
              className="px-2 py-1 rounded-lg font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {mainTab === 'HOME' ? (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex flex-col items-center justify-center z-40"
          style={{
            backgroundImage: "url('/hinh_nen.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay tối nhẹ để text dễ đọc */}
          <div className="absolute inset-0 bg-black/20" />
          {/* Nội dung trung tâm */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6 max-w-[1440px]">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-2xl">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">ĐỐI CHIẾU VÀ CHỨNG TỪ</h1>
                <p className="text-white/70 text-sm font-semibold tracking-widest">BHYT · TT25 · ENTERPRISE</p>
              </div>
            </div>
            <div className="flex flex-wrap items-stretch justify-center gap-3.5 mt-4">
              <button
                onClick={() => handleSelectModuleTab('DOI_SOAT')}
                className="flex items-center gap-2.5 bg-white/95 hover:bg-white text-slate-800 font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>ĐỐI CHIẾU BH01</span>
              </button>
              <button
                onClick={() => handleSelectModuleTab('CHUNG_TU')}
                className="flex items-center gap-2.5 bg-blue-600/95 hover:bg-blue-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <FileCode2 className="w-5 h-5 shrink-0" />
                <span>HỒ SƠ CHỨNG TỪ</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-bold">TT25</span>
              </button>
              <button
                onClick={() => handleSelectModuleTab('KHAM_SUC_KHOE')}
                className="flex items-center gap-2.5 bg-emerald-600/95 hover:bg-emerald-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <FileCode2 className="w-5 h-5 shrink-0" />
                <span>KHÁM SỨC KHỎE</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-bold">API</span>
              </button>
              <button
                onClick={() => handleSelectModuleTab('XML_3176')}
                className="flex items-center gap-2.5 bg-amber-600/95 hover:bg-amber-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <FileCode2 className="w-5 h-5 shrink-0" />
                <span>ĐỌC & KÝ XML 3176</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-bold">15 BẢNG</span>
              </button>
              <button
                onClick={() => handleSelectModuleTab('TT12_BH01_BH02')}
                className="flex items-center gap-2.5 bg-purple-600/95 hover:bg-purple-600 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-left"
              >
                <ShieldCheck className="w-5 h-5 shrink-0 text-purple-100" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-black tracking-tight">CHỨNG TỪ TT12 - BH01 - BH02</span>
                  <span className="text-[10px] font-bold text-purple-100/90 mt-0.5">Bảng 1–6 • Mẫu 01/BH • Ký PDF 02/BH</span>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-xs text-white/90">
              <span>Xin chào, <strong className="text-amber-300">{currentUser.fullName}</strong> ({currentUser.role === 'ADMIN' ? 'Quản trị viên' : `@${currentUser.username}`})</span>
              <span className="text-white/30">|</span>
              <button
                onClick={() => setShowUserManagementModal(true)}
                className="text-blue-300 hover:text-blue-200 font-bold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                {currentUser.role === 'ADMIN' ? 'Quản lý Người dùng' : 'Đổi mật khẩu'}
              </button>
              <span className="text-white/30">|</span>
              <button
                onClick={handleLogout}
                className="text-rose-300 hover:text-rose-200 font-bold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </div>
          </div>
        </motion.div>
      ) : mainTab === 'CHUNG_TU' ? (
        <HoSoChungTu onGoHome={() => setMainTab('HOME')} />
      ) : mainTab === 'KHAM_SUC_KHOE' ? (
        <KhamSucKhoe onGoHome={() => setMainTab('HOME')} />
      ) : mainTab === 'XML_3176' ? (
        <main className="max-w-[1600px] w-full mx-auto px-4 py-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          <Xml3176Module />
        </main>
      ) : mainTab === 'TT12_BH01_BH02' ? (
        <main className="max-w-[1600px] w-full mx-auto px-4 py-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChungTuTt12Module />
        </main>
      ) : (
        <main className="max-w-[1600px] mx-auto p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'upload' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500 bg-white"
                )}
              >
                <FileUp className="w-4 h-4" />
                Nhập File Dữ Liệu
              </button>
              <button
                onClick={() => setActiveTab('mapping')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'mapping' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500 bg-white"
                )}
              >
                <Settings className="w-4 h-4" />
                Cấu hình cột
              </button>
            </div>
            <button
              onClick={() => {
                if (bhxhData.length > 0 && hisData.length > 0) runComparison();
              }}
              disabled={bhxhData.length === 0 || hisData.length === 0}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm",
                (bhxhData.length > 0 && hisData.length > 0) 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" />
              Chạy đối soát
            </button>
          </div>
          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* BHXH Upload */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">File BHXH (Từ Cổng/Excel thô)</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 20 cột</p>
                        <a href="/templates/Template_01BH_Mau_Chuan_BHXH.xlsx" download className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 transition">Tải mẫu chuẩn 01BH</a>
                      </div>
                    </div>
                  </div>
                  {bhxhData.length > 0 && (
                    <button onClick={() => clearData('BHXH')} className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider">
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="relative group mb-6">
                  <input type="file" multiple accept=".xlsx,.xls,.xml" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'BHXH')} />
                  <div className="border-2 border-dashed border-slate-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all">
                    <FileUp className="w-10 h-10 text-slate-400 mb-3 group-hover:text-indigo-500 group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm">Thêm file Excel/XML BHXH (File Cổng)</p>
                  </div>
                </div>

                {bhxhConverted.length > 0 && (
                  <div className="mt-4 flex-1 flex flex-col min-h-[300px]">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                       <LayoutGrid className="w-3 h-3" /> Xem trước định dạng 20 cột (Tổng số: {bhxhConverted.length} hồ sơ)
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-auto max-h-[300px]">
                      <table className="w-full text-left text-[10px] border-collapse min-w-max">
                        <thead className="bg-slate-100 sticky top-0 shadow-sm z-10">
                          <tr>
                            <TableHeaders21 sortConfig={bhxhSort} onSort={(k) => handleSort(k, bhxhSort, setBhxhSort)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayBhxh.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-100">
                              <TableRow21 row={row} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* HIS Upload */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">File HIS (Bệnh viện)</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 20 cột</p>
                        <a href="/templates/Template_01BH_Mau_Chuan_BHXH.xlsx" download className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 transition">Tải mẫu chuẩn 01BH</a>
                      </div>
                    </div>
                  </div>
                  {hisData.length > 0 && (
                    <button onClick={() => clearData('HIS')} className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider">
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="relative group mb-6">
                  <input type="file" multiple accept=".xlsx,.xls,.xml" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'HIS')} />
                  <div className="border-2 border-dashed border-slate-200 group-hover:border-violet-300 group-hover:bg-violet-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all">
                    <FileUp className="w-10 h-10 text-slate-400 mb-3 group-hover:text-violet-500 group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm">Thêm file Excel hoặc XML HIS</p>
                  </div>
                </div>

                {hisConverted.length > 0 && (
                  <div className="mt-4 flex-1 flex flex-col min-h-[300px]">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                       <LayoutGrid className="w-3 h-3" /> Xem trước định dạng 20 cột (Tổng số: {hisConverted.length} hồ sơ)
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-auto max-h-[300px]">
                      <table className="w-full text-left text-[10px] border-collapse min-w-max">
                        <thead className="bg-slate-100 sticky top-0 shadow-sm z-10">
                          <tr>
                            <TableHeaders21 sortConfig={hisSort} onSort={(k) => handleSort(k, hisSort, setHisSort)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayHis.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-100">
                              <TableRow21 row={row} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'mapping' && (
            <motion.div 
              key="mapping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold">Cấu hình ánh xạ vào 21 Cột Chuẩn</h2>
                  </div>
                  <div className="text-xs text-slate-500 max-w-2xl">
                    Lưu ý: Các cột được cấu hình bên dưới sẽ tự động lấy từ file Excel gốc gán vào 21 cột. Nếu cột nào không có trong file gốc, hãy XÓA TRỐNG.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      applyMappingUpdate('BHXH');
                      applyMappingUpdate('HIS');
                      setActiveTab('upload');
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Lưu & Thoát
                  </button>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Đóng
                  </button>
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* BHXH Mapping */}
                <div>
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-6 flex justify-between items-center">
                    Cột từ File BHXH
                    <button onClick={() => applyMappingUpdate('BHXH')} className="text-[10px] bg-indigo-100 px-3 py-1 rounded text-indigo-700">Lưu & Áp dụng</button>
                  </h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                    {Object.keys(DEFAULT_MAPPING).map((key) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="w-40 text-[11px] font-bold text-slate-600 tracking-tight">{key}</label>
                        <input 
                          type="text" 
                          value={(bhxhMapping as any)[key]}
                          placeholder={`Cột trong file Excel (Để trống nếu ko có)`}
                          onChange={(e) => setBhxhMapping(prev => ({ ...prev, [key]: e.target.value }))}
                          onBlur={() => applyMappingUpdate('BHXH')}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* HIS Mapping */}
                <div>
                  <h3 className="text-sm font-bold text-violet-600 uppercase tracking-widest mb-6 flex justify-between items-center">
                    Cột từ File HIS
                    <button onClick={() => applyMappingUpdate('HIS')} className="text-[10px] bg-violet-100 px-3 py-1 rounded text-violet-700">Lưu & Áp dụng</button>
                  </h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                    {Object.keys(DEFAULT_MAPPING).map((key) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="w-40 text-[11px] font-bold text-slate-600 tracking-tight">{key}</label>
                        <input 
                          type="text" 
                          value={(hisMapping as any)[key]}
                          placeholder={`Cột trong file Excel (Để trống nếu ko có)`}
                          onChange={(e) => setHisMapping(prev => ({ ...prev, [key]: e.target.value }))}
                          onBlur={() => applyMappingUpdate('HIS')}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && summary && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Tổng BHXH', value: summary.totalBHXH, sub: 'dòng', icon: FileSpreadsheet, color: 'indigo' },
                  { label: 'Tổng HIS', value: summary.totalHIS, sub: 'dòng', icon: FileSpreadsheet, color: 'violet' },
                  { label: 'Trùng khớp', value: summary.totalMatch, sub: 'dòng', icon: CheckCircle2, color: 'emerald' },
                  { label: 'Sai lệch', value: summary.discrepancies, sub: 'lỗi', icon: ArrowRightLeft, color: 'blue' },
                  { label: 'Thiếu BHXH', value: summary.missingBHXH, sub: 'dòng', icon: XCircle, color: 'rose' },
                  { label: 'Thiếu HIS', value: summary.missingHIS, sub: 'dòng', icon: AlertCircle, color: 'amber' },
                ].map((stat, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all",
                      stat.color === 'emerald' && summary.totalMatch === (summary.totalBHXH + summary.totalHIS) / 2 && "bg-emerald-50 border-emerald-200"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1 text-slate-400">
                      <stat.icon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <div className="text-2xl font-black">{stat.value.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{stat.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {[
                    { label: 'Tất cả', type: 'ALL' },
                    { label: 'Trùng khớp', type: 'MATCH' },
                    { label: 'Thiếu BHXH', type: 'MISSING_BHXH' },
                    { label: 'Thiếu HIS', type: 'MISSING_HIS' },
                    { label: 'Sai lệch', type: 'DISCREPANCY' },
                  ].map((filter) => (
                    <button
                      key={filter.type}
                      onClick={() => setFilterType(filter.type)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                        filterType === filter.type 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
                >
                  <Download className="w-4 h-4" />
                  Xuất File 21 Cột
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-4 font-bold text-slate-600 uppercase tracking-widest text-[11px] sticky left-0 bg-slate-50 z-20 whitespace-nowrap">Trạng thái Lỗi</th>
                        <th className="px-3 py-4 font-bold text-slate-600 uppercase tracking-widest text-[11px] whitespace-nowrap">Chi tiết (Dòng 1: HIS | Dòng 2: BHXH)</th>
                        <TableHeaders21 />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.slice(0, 100).map((res, i) => {
                        const item = res.hisItem || res.bhxhItem;
                        return (
                          <React.Fragment key={i}>
                            <tr className="hover:bg-slate-50/50 transition-colors bg-white">
                              <td className="px-3 py-4 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9]">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                                  res.type === 'MATCH' && "bg-emerald-50 text-emerald-700",
                                  res.type === 'MISSING_BHXH' && "bg-rose-50 text-rose-700",
                                  res.type === 'MISSING_HIS' && "bg-amber-50 text-amber-700",
                                  res.type === 'DISCREPANCY' && "bg-blue-50 text-blue-700",
                                )}>
                                  {res.type === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                                  {res.type === 'MISSING_BHXH' && <XCircle className="w-3 h-3" />}
                                  {res.type === 'MISSING_HIS' && <AlertCircle className="w-3 h-3" />}
                                  {res.type === 'MATCH' && 'KHỚP'}
                                  {res.type === 'MISSING_BHXH' && 'THIẾU BHXH'}
                                  {res.type === 'MISSING_HIS' && 'THIẾU HIS'}
                                  {res.type === 'DISCREPANCY' && 'SAI LỆCH'}
                                  {res.type === 'WARNING' && 'CẢNH BÁO'}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-[11px] text-slate-500 italic max-w-sm leading-tight">
                                {res.details.join(', ')}
                              </td>
                              {item && <TableRow21 row={item} />}
                            </tr>
                            
                            {/* Nếu là sai lệch, in thêm dòng thứ 2 cho rõ */}
                            {res.type === 'DISCREPANCY' && res.hisItem && res.bhxhItem && (
                              <tr className="bg-red-50/30 hover:bg-red-50/50 transition-colors">
                                <td className="px-3 py-2 sticky left-0 bg-red-50/30 z-10 shadow-[1px_0_0_0_#f1f5f9] text-[10px] text-slate-400 italic text-right border-t border-dashed border-red-100">
                                  Dòng đối chiếu BHXH ↳
                                </td>
                                <td className="px-3 py-2 text-[10px] text-slate-400 italic border-t border-dashed border-red-100">
                                  Chỉ ra sự khác biệt
                                </td>
                                <TableRow21 row={res.bhxhItem} />
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredResults.length > 100 && (
                  <div className="p-6 bg-slate-50 text-center text-sm text-slate-500 font-medium">
                    Đang hiển thị 100 trên tổng số {filteredResults.length} dòng. Xuất Excel để xem toàn bộ.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      )}

      {/* Footer - Hàng chân trang nền lon bia Tiger Bạc xếp ngang, cố định sát mép dưới cùng */}
      <footer 
        className="fixed bottom-0 left-0 right-0 z-50 h-[38px] border-t border-slate-300 shadow-lg flex items-center justify-between px-4 text-[10.5px] select-none overflow-hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50
        }}
      >
        {/* Lớp nền hàng lon bia Tiger Crystal bạc xếp ngang liên tục */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/tiger_crystal.png')",
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
            backgroundPosition: 'left center',
            backgroundColor: '#ffffff',
            zIndex: 0
          }}
          title="Tiger Crystal Bạc"
        />

        {/* Lớp phủ mỏng nhẹ để lon bia nổi bật nhưng chữ luôn sắc nét */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[0.3px]" style={{ zIndex: 1 }} />

        {/* Giữ nguyên các nội dung chữ trên hàng */}
        <div className="relative flex items-center justify-between w-full" style={{ zIndex: 2 }}>
          <span className="font-semibold text-slate-800 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded shadow-xs border border-slate-300/80 tracking-tight">
            ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
          </span>
          <span className="font-extrabold text-blue-900 bg-white/95 backdrop-blur-md px-3 py-0.5 rounded shadow-xs border border-blue-300/80 tracking-wide">
            NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
          </span>
          <span className="font-semibold text-slate-700 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded shadow-xs border border-slate-300/80">
            v2.0 · egw.baohiemxahoi.gov.vn
          </span>
        </div>
      </footer>

      {/* Modal Quản trị người dùng (Admin) & Đổi mật khẩu (User) */}
      <UserManagementModal
        isOpen={showUserManagementModal}
        onClose={() => setShowUserManagementModal(false)}
        currentUser={currentUser}
        onCurrentUserUpdated={updated => setCurrentUser(updated)}
      />
    </div>
  );
}
