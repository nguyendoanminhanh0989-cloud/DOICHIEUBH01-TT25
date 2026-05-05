/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  LayoutGrid
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
  const [bhxhData, setBhxhData] = useState<any[]>([]);
  const [hisData, setHisData] = useState<any[]>([]);
  
  const [bhxhConverted, setBhxhConverted] = useState<TemplateRow[]>([]);
  const [hisConverted, setHisConverted] = useState<TemplateRow[]>([]);

  const [bhxhMapping, setBhxhMapping] = useState<ColumnMapping>({ ...DEFAULT_MAPPING });
  const [hisMapping, setHisMapping] = useState<ColumnMapping>({ ...DEFAULT_MAPPING });
  
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping' | 'results'>('upload');
  const [filterType, setFilterType] = useState<string>('ALL');

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

  return (
    <div 
      className="min-h-screen text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 bg-cover bg-center bg-fixed relative"
      style={{ 
        backgroundImage: "url('/hinh_nen.png')",
        backgroundColor: "rgba(248, 251, 255, 0.8)", // Fallback overlay
        backgroundBlendMode: "overlay"
      }}
    >
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => window.location.reload()}
            title="Tải lại trang chủ"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 uppercase">ĐỐI CHIẾU 01 BHXH VÀ HIS</h1>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'upload' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500"
              )}
            >
              <FileUp className="w-4 h-4" />
              Tải file & Mẫu
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'mapping' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500"
              )}
            >
              <Settings className="w-4 h-4" />
              Cấu hình cột
            </button>
            <button
              onClick={() => {
                if (bhxhData.length > 0 && hisData.length > 0) runComparison();
              }}
              disabled={bhxhData.length === 0 || hisData.length === 0}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg",
                (bhxhData.length > 0 && hisData.length > 0) 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              )}
            >
              <Play className="w-4 h-4" />
              Chạy đối soát
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-8">
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
                      <p className="text-sm text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 21 cột</p>
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
                       <LayoutGrid className="w-3 h-3" /> Xem trước định dạng 21 cột (Tổng số: {bhxhConverted.length} hồ sơ)
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
                      <p className="text-sm text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 21 cột</p>
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
                       <LayoutGrid className="w-3 h-3" /> Xem trước định dạng 21 cột (Tổng số: {hisConverted.length} hồ sơ)
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
    </div>
  );
}
