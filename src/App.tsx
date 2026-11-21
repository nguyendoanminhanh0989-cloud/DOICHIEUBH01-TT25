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
  KeyRound,
  X,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import {
  mapExcelToRow,
  ensureSequentialStt,
  generateKey,
  smartMapHeaders,
  parseGiamDinhXml,
  normalizeNameForKey,
  extractBirthYear,
} from './lib/data-utils';
import {
  buildStandardBh01Dataset,
  exportStandardBh01Workbook,
} from './lib/bh01StandardExport';
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

const normalizeSearchText = (str?: string | null): string =>
  String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

const matchesTemplateRowSearch = (row: TemplateRow, query: string): boolean => {
  if (!query.trim()) return true;
  const q = normalizeSearchText(query);
  const candidates = [
    row.HO_TEN,
    row.MA_THE_BHYT,
    row.MA_LK,
    row.MA_BENH_CHINH,
    row.NGAY_SINH,
    row.NGAY_VAO,
    row.NGAY_RA,
    row.STT,
    row.MA_CSKCB,
  ];
  return candidates.some(v => normalizeSearchText(v).includes(q));
};

const parseEditedNumber = (raw: string): number | null => {
  const s = raw.trim();
  if (!s) return null;
  let clean = s.replace(/\s+/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    const lastComma = clean.lastIndexOf(',');
    if (clean.split(',').length > 2 || clean.length - lastComma === 4) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  } else if (clean.includes('.')) {
    if (clean.split('.').length > 2 || clean.length - clean.lastIndexOf('.') === 4) {
      clean = clean.replace(/\./g, '');
    }
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};

const NumericEditableCell = ({
  value,
  onChange,
  className = '',
}: {
  value: number | null;
  onChange: (val: number | null) => void;
  className?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <input
      type="text"
      value={
        isFocused
          ? draft
          : value !== null && value !== undefined
            ? value.toLocaleString('vi-VN')
            : ''
      }
      placeholder="-"
      onFocus={() => {
        setIsFocused(true);
        setDraft(value !== null && value !== undefined ? String(value) : '');
      }}
      onChange={e => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '') {
          onChange(null);
        } else {
          const parsed = parseEditedNumber(raw);
          if (parsed !== null) {
            onChange(parsed);
          }
        }
      }}
      onBlur={() => setIsFocused(false)}
      className={cn(
        'w-full min-w-[82px] text-right bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 tabular-nums',
        className
      )}
    />
  );
};

export interface LoadedSheetInfo {
  name: string;
  count: number;
  enabled: boolean;
}

export interface LoadedFileInfo {
  name: string;
  count: number;
  sheets?: LoadedSheetInfo[];
}

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

const TableRow21 = ({
  row,
  onEdit,
}: {
  row: TemplateRow;
  onEdit?: (field: keyof TemplateRow, value: string | number | null) => void;
}) => {
  if (!onEdit) {
    return (
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
  }

  const strInputClass =
    'w-full bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 text-[10.5px]';

  return (
    <>
      <td className="px-1 py-0.5 whitespace-nowrap font-mono">
        <input type="text" value={row.STT ?? ''} onChange={e => onEdit('STT', e.target.value)} className={cn(strInputClass, 'min-w-[44px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap font-mono text-slate-600">
        <input type="text" value={row.MA_LK ?? ''} onChange={e => onEdit('MA_LK', e.target.value)} className={cn(strInputClass, 'min-w-[95px] font-mono text-slate-600')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.HO_TEN ?? ''} onChange={e => onEdit('HO_TEN', e.target.value)} className={cn(strInputClass, 'min-w-[155px] font-bold text-slate-900')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.NGAY_SINH ?? ''} onChange={e => onEdit('NGAY_SINH', e.target.value)} className={cn(strInputClass, 'min-w-[78px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.GIOI_TINH ?? ''} onChange={e => onEdit('GIOI_TINH', e.target.value)} className={cn(strInputClass, 'min-w-[44px] text-center')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.MA_THE_BHYT ?? ''} onChange={e => onEdit('MA_THE_BHYT', e.target.value)} className={cn(strInputClass, 'min-w-[130px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.MA_BENH_CHINH ?? ''} onChange={e => onEdit('MA_BENH_CHINH', e.target.value)} className={cn(strInputClass, 'min-w-[78px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.NGAY_VAO ?? ''} onChange={e => onEdit('NGAY_VAO', e.target.value)} className={cn(strInputClass, 'min-w-[105px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.NGAY_VAO_NOI_TRU ?? ''} onChange={e => onEdit('NGAY_VAO_NOI_TRU', e.target.value)} className={cn(strInputClass, 'min-w-[105px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.NGAY_RA ?? ''} onChange={e => onEdit('NGAY_RA', e.target.value)} className={cn(strInputClass, 'min-w-[105px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.SO_NGAY_DTRI ?? ''} onChange={e => onEdit('SO_NGAY_DTRI', e.target.value)} className={cn(strInputClass, 'min-w-[48px] text-center')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.MA_LOAI_KCB ?? ''} onChange={e => onEdit('MA_LOAI_KCB', e.target.value)} className={cn(strInputClass, 'min-w-[48px] text-center')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_TONGCHI_BV} onChange={v => onEdit('T_TONGCHI_BV', v)} className="text-[10.5px]" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_TONGCHI_BH} onChange={v => onEdit('T_TONGCHI_BH', v)} className="text-[10.5px] font-bold text-indigo-600" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_BHTT} onChange={v => onEdit('T_BHTT', v)} className="text-[10.5px] font-bold text-emerald-600" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_BNCCT} onChange={v => onEdit('T_BNCCT', v)} className="text-[10.5px]" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_BNTT} onChange={v => onEdit('T_BNTT', v)} className="text-[10.5px]" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <NumericEditableCell value={row.T_NGUONKHAC} onChange={v => onEdit('T_NGUONKHAC', v)} className="text-[10.5px]" />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.MA_CSKCB ?? ''} onChange={e => onEdit('MA_CSKCB', e.target.value)} className={cn(strInputClass, 'min-w-[78px] font-mono')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.NAM_QT ?? ''} onChange={e => onEdit('NAM_QT', e.target.value)} className={cn(strInputClass, 'min-w-[48px] text-center')} />
      </td>
      <td className="px-1 py-0.5 whitespace-nowrap">
        <input type="text" value={row.THANG_QT ?? ''} onChange={e => onEdit('THANG_QT', e.target.value)} className={cn(strInputClass, 'min-w-[48px] text-center')} />
      </td>
    </>
  );
};

const TablePaginationBar = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  accent = 'blue',
  compact = false,
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  accent?: 'blue' | 'violet' | 'indigo';
  compact?: boolean;
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const [jumpValue, setJumpValue] = useState(String(safePage));

  useEffect(() => {
    setJumpValue(String(safePage));
  }, [safePage]);

  if (totalItems <= 0) return null;

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  const commitJump = () => {
    const parsed = parseInt(jumpValue, 10);
    if (!isNaN(parsed)) {
      const target = Math.min(Math.max(1, parsed), totalPages);
      setJumpValue(String(target));
      if (target !== safePage) {
        onPageChange(target);
      }
    } else {
      setJumpValue(String(safePage));
    }
  };

  const pageNumbers: (number | '...')[] = [];
  if (totalPages <= 5) {
    for (let p = 1; p <= totalPages; p++) pageNumbers.push(p);
  } else {
    pageNumbers.push(1);
    const windowStart = Math.max(2, safePage - 1);
    const windowEnd = Math.min(totalPages - 1, safePage + 1);
    if (windowStart > 2) pageNumbers.push('...');
    for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);
    if (windowEnd < totalPages - 1) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  const activeBtnClass =
    accent === 'violet'
      ? 'bg-violet-600 text-white border-violet-600'
      : accent === 'indigo'
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-blue-600 text-white border-blue-600';

  const navBtnBase =
    'px-2 py-0.5 rounded-md border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition';

  return (
    <div
      className={cn(
        'px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]',
        compact ? 'mt-2' : ''
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-slate-600">
        <span>
          Hiển thị <strong className="text-slate-800">{startItem}–{endItem}</strong> /{' '}
          <strong className="text-slate-800">{totalItems}</strong> HS
        </span>
        <select
          value={pageSize}
          onChange={e => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="px-1.5 py-0.5 rounded-md border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
          aria-label="Số dòng mỗi trang"
        >
          {[50, 100, 200, 300, 500].map(size => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          className={navBtnBase}
          title="Trang đầu"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={navBtnBase}
          title="Trang trước"
        >
          ‹
        </button>

        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[24px] px-1.5 py-0.5 rounded-md border font-bold cursor-pointer transition',
                p === safePage
                  ? activeBtnClass
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className={navBtnBase}
          title="Trang sau"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          className={navBtnBase}
          title="Trang cuối"
        >
          »
        </button>

        <form
          onSubmit={e => {
            e.preventDefault();
            commitJump();
          }}
          className="inline-flex items-center gap-1 ml-1 text-slate-600"
        >
          <span>Trang</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={e => setJumpValue(e.target.value)}
            onBlur={commitJump}
            className="w-12 px-1.5 py-0.5 text-center rounded border border-slate-300 bg-white text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span>/ {totalPages}</span>
        </form>
      </div>
    </div>
  );
};

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
  const [showBh01StandardModal, setShowBh01StandardModal] = useState(false);
  const [includeMissingHisInBh01, setIncludeMissingHisInBh01] = useState(false);

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
    setBhxhSearch('');
    setHisSearch('');
    setResultsSearch('');
    setBhxhPage(1);
    setHisPage(1);
    setResultsPage(1);
    setHasPendingEdits(false);
    setEditedBhxhRows(new Set());
    setEditedHisRows(new Set());
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
  const [bhxhSearch, setBhxhSearch] = useState('');
  const [hisSearch, setHisSearch] = useState('');
  const [resultsSearch, setResultsSearch] = useState('');
  const [bhxhPage, setBhxhPage] = useState(1);
  const [bhxhPageSize, setBhxhPageSize] = useState(100);
  const [hisPage, setHisPage] = useState(1);
  const [hisPageSize, setHisPageSize] = useState(100);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPageSize, setResultsPageSize] = useState(100);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);
  const [editedBhxhRows, setEditedBhxhRows] = useState<Set<number>>(new Set());
  const [editedHisRows, setEditedHisRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setBhxhPage(1);
  }, [bhxhSearch, bhxhSort, bhxhConverted.length]);

  useEffect(() => {
    setHisPage(1);
  }, [hisSearch, hisSort, hisConverted.length]);

  useEffect(() => {
    setResultsPage(1);
  }, [filterType, resultsSearch, results]);

  const handleSort = (key: keyof TemplateRow, currentSort: SortConfig, setSort: (s: SortConfig) => void) => {
    if (currentSort?.key === key) {
      if (currentSort.dir === 'asc') setSort({ key, dir: 'desc' });
      else setSort(null);
    } else {
      setSort({ key, dir: 'asc' });
    }
  };

  const handleEditConvertedRow = (
    source: 'BHXH' | 'HIS',
    origIdx: number,
    field: keyof TemplateRow,
    value: string | number | null
  ) => {
    if (source === 'BHXH') {
      setBhxhConverted(prev =>
        prev.map((row, idx) => (idx === origIdx ? { ...row, [field]: value } : row))
      );
      setEditedBhxhRows(prev => {
        const next = new Set(prev);
        next.add(origIdx);
        return next;
      });
    } else {
      setHisConverted(prev =>
        prev.map((row, idx) => (idx === origIdx ? { ...row, [field]: value } : row))
      );
      setEditedHisRows(prev => {
        const next = new Set(prev);
        next.add(origIdx);
        return next;
      });
    }
    setHasPendingEdits(true);
  };

  const buildDisplayMeta = (
    data: TemplateRow[],
    query: string,
    sortConfig: SortConfig,
    page: number,
    pageSize: number
  ) => {
    const indexed = data.map((row, origIdx) => ({ row, origIdx }));
    const filtered = query.trim()
      ? indexed.filter(item => matchesTemplateRowSearch(item.row, query))
      : indexed;
    const sorted = !sortConfig
      ? filtered
      : [...filtered].sort((a, b) => {
          let aVal: any = a.row[sortConfig.key];
          let bVal: any = b.row[sortConfig.key];

          if (aVal === null || aVal === undefined) aVal = '';
          if (bVal === null || bVal === undefined) bVal = '';

          if (typeof aVal === 'string' && !isNaN(Number(aVal)) && aVal !== '') aVal = Number(aVal);
          if (typeof bVal === 'string' && !isNaN(Number(bVal)) && bVal !== '') bVal = Number(bVal);

          if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
          return 0;
        });

    const totalFiltered = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      totalFiltered,
      safePage,
      totalPages,
    };
  };

  const bhxhDisplayMeta = useMemo(
    () => buildDisplayMeta(bhxhConverted, bhxhSearch, bhxhSort, bhxhPage, bhxhPageSize),
    [bhxhConverted, bhxhSearch, bhxhSort, bhxhPage, bhxhPageSize]
  );
  const hisDisplayMeta = useMemo(
    () => buildDisplayMeta(hisConverted, hisSearch, hisSort, hisPage, hisPageSize),
    [hisConverted, hisSearch, hisSort, hisPage, hisPageSize]
  );

  const [bhxhFiles, setBhxhFiles] = useState<LoadedFileInfo[]>([]);
  const [hisFiles, setHisFiles] = useState<LoadedFileInfo[]>([]);
  const [appendBhxhOnUpload, setAppendBhxhOnUpload] = useState(false);
  const [appendHisOnUpload, setAppendHisOnUpload] = useState(false);

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
      bhxhFiles: LoadedFileInfo[];
      hisFiles: LoadedFileInfo[];
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
          if (Array.isArray(cached.bhxhConverted)) setBhxhConverted(ensureSequentialStt(cached.bhxhConverted));
          if (Array.isArray(cached.hisConverted)) setHisConverted(ensureSequentialStt(cached.hisConverted));
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

  const isValidRawDataRow = (row: Record<string, any>, mapping: Partial<ColumnMapping>): boolean => {
    const readField = (mappedCol: string | undefined, fallbacks: string[]): string => {
      if (mappedCol && row[mappedCol] !== undefined && row[mappedCol] !== null && String(row[mappedCol]).trim() !== '') {
        return String(row[mappedCol]).trim();
      }
      for (const fb of fallbacks) {
        if (row[fb] !== undefined && row[fb] !== null && String(row[fb]).trim() !== '') {
          return String(row[fb]).trim();
        }
      }
      return '';
    };

    const hoTen = readField(mapping.HO_TEN, ['HO_TEN', 'HOTEN', 'Họ tên', 'TEN_BENH_NHAN']);
    const maThe = readField(mapping.MA_THE_BHYT, ['MA_THE_BHYT', 'MA_THE', 'Mã thẻ']);
    const maLk = readField(mapping.MA_LK, ['MA_LK', 'MALK', 'Mã LK']);
    const ngayVao = readField(mapping.NGAY_VAO, ['NGAY_VAO', 'Ngày vào']);
    const ngayRa = readField(mapping.NGAY_RA, ['NGAY_RA', 'Ngày ra']);

    if (!hoTen && !maThe && !maLk && !ngayVao && !ngayRa) {
      return false;
    }
    if (!maThe && !maLk && /^(tổng\s*cộng|tổng|cộng|total)\b/i.test(hoTen)) {
      return false;
    }
    return true;
  };

  const isIgnoredAuditSheet = (sheetName: string, allSheetNames: string[]): boolean => {
    const cur = sheetName.trim().toLowerCase();
    const normAll = allSheetNames.map(s => s.trim().toLowerCase());
    if (normAll.includes('mau_01bh') && cur === 'canh_bao_dieu_chinh') {
      return true;
    }
    if (
      normAll.includes('tổng hợp') &&
      (cur === 'sai lệch' || cur === 'thiếu bhxh' || cur === 'thiếu his' || cur === 'trùng khớp')
    ) {
      return true;
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BHXH' | 'HIS') => {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    inputEl.value = '';
    if (files.length === 0) return;

    const shouldAppend = type === 'BHXH' ? appendBhxhOnUpload : appendHisOnUpload;
    const newFilesInfo: LoadedFileInfo[] = [];
    let combinedData: any[] = [];

    let currentBhxhMapping = shouldAppend ? { ...bhxhMapping } : { ...DEFAULT_MAPPING };
    let currentHisMapping = shouldAppend ? { ...hisMapping } : { ...DEFAULT_MAPPING };

    setIsProcessing(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await new Promise<{ rows: any[]; sheets: LoadedSheetInfo[] }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const result = evt.target?.result;
            const fileRows: any[] = [];
            const fileSheets: LoadedSheetInfo[] = [];

            if (file.name.toLowerCase().endsWith('.xml')) {
              const xmlRows = parseGiamDinhXml(result as string);
              if (xmlRows.length > 0) {
                const headers = Object.keys(xmlRows[0] as object);
                const smartMapping = smartMapHeaders(headers);
                if (type === 'BHXH') {
                  currentBhxhMapping = { ...currentBhxhMapping, ...smartMapping };
                } else {
                  currentHisMapping = { ...currentHisMapping, ...smartMapping };
                }
                xmlRows.forEach(r => {
                  fileRows.push({ ...r, __sourceFile: file.name, __sheetName: 'XML1' });
                });
                fileSheets.push({ name: 'XML1', count: xmlRows.length, enabled: true });
              }
            } else {
              const wb = XLSX.read(result, { type: 'binary' });
              for (const wsname of wb.SheetNames) {
                if (isIgnoredAuditSheet(wsname, wb.SheetNames)) continue;
                const ws = wb.Sheets[wsname];
                if (!ws) continue;
                // Mở rộng !ref nếu file Excel từ HIS bị giới hạn vùng <dimension ref="A1:T4999"/>
                const cellRefRegex = /^[A-Za-z]{1,3}\d+$/;
                let maxR = -1;
                let maxC = -1;
                let minR = Number.MAX_SAFE_INTEGER;
                let minC = Number.MAX_SAFE_INTEGER;
                if (ws['!ref']) {
                  try {
                    const cur = XLSX.utils.decode_range(ws['!ref']);
                    minR = cur.s.r;
                    minC = cur.s.c;
                    maxR = cur.e.r;
                    maxC = cur.e.c;
                  } catch {
                    // ignore
                  }
                }
                for (const k of Object.keys(ws)) {
                  if (k.startsWith('!') || !cellRefRegex.test(k)) continue;
                  const addr = XLSX.utils.decode_cell(k);
                  if (addr.r < minR) minR = addr.r;
                  if (addr.c < minC) minC = addr.c;
                  if (addr.r > maxR) maxR = addr.r;
                  if (addr.c > maxC) maxC = addr.c;
                }
                if (maxR >= 0 && maxC >= 0) {
                  ws['!ref'] = XLSX.utils.encode_range({
                    s: { r: Math.min(minR, 0), c: Math.min(minC, 0) },
                    e: { r: maxR, c: maxC },
                  });
                }
                const sheetRows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
                if (sheetRows.length === 0) continue;

                const headers = Object.keys(sheetRows[0] as object);
                const smartMapping = smartMapHeaders(headers);
                if (type === 'BHXH') {
                  currentBhxhMapping = { ...currentBhxhMapping, ...smartMapping };
                } else {
                  currentHisMapping = { ...currentHisMapping, ...smartMapping };
                }

                const validRows = sheetRows.filter(r => isValidRawDataRow(r, smartMapping));
                if (validRows.length === 0) continue;

                validRows.forEach(r => {
                  fileRows.push({ ...r, __sourceFile: file.name, __sheetName: wsname });
                });
                fileSheets.push({ name: wsname, count: validRows.length, enabled: true });
              }
            }

            resolve({ rows: fileRows, sheets: fileSheets });
          };

          if (file.name.toLowerCase().endsWith('.xml')) {
            reader.readAsText(file);
          } else {
            reader.readAsBinaryString(file);
          }
        });

        combinedData = [...combinedData, ...parsed.rows];
        newFilesInfo.push({ name: file.name, count: parsed.rows.length, sheets: parsed.sheets });
      }

      if (type === 'BHXH') {
        setBhxhMapping(currentBhxhMapping);
        const newRaw = shouldAppend ? [...bhxhData, ...combinedData] : combinedData;
        const nextFiles = shouldAppend ? [...bhxhFiles, ...newFilesInfo] : newFilesInfo;
        setBhxhData(newRaw);
        setBhxhFiles(nextFiles);
        setBhxhConverted(mapExcelToRow(newRaw, currentBhxhMapping, 'BHXH'));
        setEditedBhxhRows(new Set());
      } else {
        setHisMapping(currentHisMapping);
        const newRaw = shouldAppend ? [...hisData, ...combinedData] : combinedData;
        const nextFiles = shouldAppend ? [...hisFiles, ...newFilesInfo] : newFilesInfo;
        setHisData(newRaw);
        setHisFiles(nextFiles);
        setHisConverted(mapExcelToRow(newRaw, currentHisMapping, 'HIS'));
        setEditedHisRows(new Set());
      }
      if (results.length > 0) {
        setHasPendingEdits(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSheet = (type: 'BHXH' | 'HIS', fileIndex: number, sheetName: string) => {
    const sourceFiles = type === 'BHXH' ? bhxhFiles : hisFiles;
    const rawData = type === 'BHXH' ? bhxhData : hisData;
    const mapping = type === 'BHXH' ? bhxhMapping : hisMapping;

    const updatedFiles = sourceFiles.map((f, idx) => {
      if (idx !== fileIndex || !f.sheets) return f;
      const updatedSheets = f.sheets.map(s =>
        s.name === sheetName ? { ...s, enabled: !s.enabled } : s
      );
      const enabledCount = updatedSheets.reduce((sum, s) => sum + (s.enabled ? s.count : 0), 0);
      return { ...f, count: enabledCount, sheets: updatedSheets };
    });

    const enabledSheetKeys = new Set<string>();
    updatedFiles.forEach(f => {
      (f.sheets || []).forEach(s => {
        if (s.enabled) enabledSheetKeys.add(`${f.name}::${s.name}`);
      });
    });

    const filteredRaw = rawData.filter(row => {
      if (!row.__sheetName || !row.__sourceFile) return true;
      return enabledSheetKeys.has(`${row.__sourceFile}::${row.__sheetName}`);
    });

    if (type === 'BHXH') {
      setBhxhFiles(updatedFiles);
      setBhxhConverted(mapExcelToRow(filteredRaw, mapping, 'BHXH'));
      setEditedBhxhRows(new Set());
    } else {
      setHisFiles(updatedFiles);
      setHisConverted(mapExcelToRow(filteredRaw, mapping, 'HIS'));
      setEditedHisRows(new Set());
    }
    if (results.length > 0) {
      setHasPendingEdits(true);
    }
  };

  const handleRemoveFile = (type: 'BHXH' | 'HIS', fileIdx: number) => {
    const sourceFiles = type === 'BHXH' ? bhxhFiles : hisFiles;
    const targetFile = sourceFiles[fileIdx];
    if (!targetFile) return;

    const remainingFiles = sourceFiles.filter((_, idx) => idx !== fileIdx);
    if (remainingFiles.length === 0) {
      clearData(type);
      return;
    }

    const rawData = type === 'BHXH' ? bhxhData : hisData;
    const mapping = type === 'BHXH' ? bhxhMapping : hisMapping;

    const remainingRaw = rawData.filter(row => row.__sourceFile !== targetFile.name);
    const enabledSheetKeys = new Set<string>();
    remainingFiles.forEach(f => {
      (f.sheets || []).forEach(s => {
        if (s.enabled) enabledSheetKeys.add(`${f.name}::${s.name}`);
      });
    });

    const filteredRaw = remainingRaw.filter(row => {
      if (!row.__sheetName || !row.__sourceFile) return true;
      return enabledSheetKeys.has(`${row.__sourceFile}::${row.__sheetName}`);
    });

    if (type === 'BHXH') {
      setBhxhFiles(remainingFiles);
      setBhxhData(remainingRaw);
      setBhxhConverted(mapExcelToRow(filteredRaw, mapping, 'BHXH'));
      setEditedBhxhRows(new Set());
    } else {
      setHisFiles(remainingFiles);
      setHisData(remainingRaw);
      setHisConverted(mapExcelToRow(filteredRaw, mapping, 'HIS'));
      setEditedHisRows(new Set());
    }
    if (results.length > 0) {
      setHasPendingEdits(true);
    }
  };

  const applyMappingUpdate = (type: 'BHXH' | 'HIS') => {
    if (type === 'BHXH' && bhxhData.length > 0) {
      setBhxhConverted(mapExcelToRow(bhxhData, bhxhMapping, 'BHXH'));
      setEditedBhxhRows(new Set());
      setHasPendingEdits(true);
    }
    if (type === 'HIS' && hisData.length > 0) {
      setHisConverted(mapExcelToRow(hisData, hisMapping, 'HIS'));
      setEditedHisRows(new Set());
      setHasPendingEdits(true);
    }
  };

  const clearData = (type: 'BHXH' | 'HIS') => {
    if (type === 'BHXH') {
      setBhxhData([]);
      setBhxhConverted([]);
      setBhxhFiles([]);
      setBhxhSearch('');
      setBhxhPage(1);
      setEditedBhxhRows(new Set());
    } else {
      setHisData([]);
      setHisConverted([]);
      setHisFiles([]);
      setHisSearch('');
      setHisPage(1);
      setEditedHisRows(new Set());
    }
    setHasPendingEdits(false);
  };

  const runComparison = () => {
    setIsProcessing(true);
    setActiveTab('results');

    setTimeout(() => {
      // Ghép cặp hồ sơ thông minh theo 5 cấp độ để xử lý cả file có MA_LK và file không có MA_LK (hoặc chỉ 1 bên có MA_LK)
      // Cấp 1: Khớp theo MA_LK (nếu cả 2 bên đều có MA_LK)
      // Cấp 2: Khớp theo khóa gộp chuẩn: Họ tên + Năm sinh + Ngày ra (12 số) + Tổng chi BV
      // Cấp 3: Khớp theo khóa gộp theo ngày: Họ tên + Năm sinh + Ngày ra (8 số YYYYMMDD) + Tổng chi BV
      // Cấp 4: Khớp ca khám khi lệch Tổng chi: Họ tên + Năm sinh + Ngày vào (8 số) + Ngày ra (8 số)
      // Cấp 5: Khớp ca khám theo Mã thẻ BHYT + Ngày ra (8 số) khi lệch Họ tên / Năm sinh
      const pairedBhxhForHis = new Map<number, number>();
      const usedBhxhIndices = new Set<number>();

      const buildRowKeyByTier = (row: TemplateRow, tier: 1 | 2 | 3 | 4 | 5): string | null => {
        const maLk = (row.MA_LK || '').trim().toUpperCase();
        const hoTen = normalizeNameForKey(row.HO_TEN);
        const namSinh = extractBirthYear(row.NGAY_SINH);
        const ngayRaFull = (row.NGAY_RA || row.NGAY_VAO || '').replace(/\D/g, '');
        const ngayRaDay = ngayRaFull.substring(0, 8);
        const ngayVaoDay = (row.NGAY_VAO || '').replace(/\D/g, '').substring(0, 8);
        const tongChi =
          row.T_TONGCHI_BV !== null && row.T_TONGCHI_BV !== undefined
            ? Math.round(row.T_TONGCHI_BV)
            : 0;
        const maThe = (row.MA_THE_BHYT || '').trim().toUpperCase();

        switch (tier) {
          case 1:
            return maLk ? `T1:${maLk}` : null;
          case 2:
            return hoTen ? `T2:${hoTen}|${namSinh}|${ngayRaFull}|${tongChi}` : null;
          case 3:
            return hoTen ? `T3:${hoTen}|${namSinh}|${ngayRaDay}|${tongChi}` : null;
          case 4:
            return hoTen && (ngayRaDay || ngayVaoDay)
              ? `T4:${hoTen}|${namSinh}|${ngayVaoDay}|${ngayRaDay}`
              : null;
          case 5:
            return maThe && (ngayRaDay || ngayVaoDay)
              ? `T5:${maThe}|${ngayVaoDay}|${ngayRaDay}`
              : null;
        }
      };

      const runPass = (tier: 1 | 2 | 3 | 4 | 5) => {
        const bhxhBuckets = new Map<string, number[]>();
        bhxhConverted.forEach((bRow, bIdx) => {
          if (usedBhxhIndices.has(bIdx)) return;
          const k = buildRowKeyByTier(bRow, tier);
          if (!k) return;
          const arr = bhxhBuckets.get(k);
          if (arr) arr.push(bIdx);
          else bhxhBuckets.set(k, [bIdx]);
        });

        hisConverted.forEach((hRow, hIdx) => {
          if (pairedBhxhForHis.has(hIdx)) return;
          const k = buildRowKeyByTier(hRow, tier);
          if (!k) return;
          const bucket = bhxhBuckets.get(k);
          if (bucket && bucket.length > 0) {
            const matchedBIdx = bucket.shift()!;
            pairedBhxhForHis.set(hIdx, matchedBIdx);
            usedBhxhIndices.add(matchedBIdx);
          }
        });
      };

      runPass(1);
      runPass(2);
      runPass(3);
      runPass(4);
      runPass(5);

      const finalResults: ComparisonResult[] = [];

      const comparePair = (hisRow: TemplateRow, bhxhRow: TemplateRow): ComparisonResult => {
        const discrepancies: string[] = [];

        const compareNum = (a: number | null, b: number | null, label: string) => {
          if ((a !== null || b !== null) && Math.abs((a ?? 0) - (b ?? 0)) > 10) {
            discrepancies.push(
              `${label} lệch: HIS(${a !== null ? a.toLocaleString() : 'trống'}) vs BHXH(${b !== null ? b.toLocaleString() : 'trống'})`
            );
          }
        };

        const compareStr = (
          a: string | null | undefined,
          b: string | null | undefined,
          label: string,
          requireBoth = false
        ) => {
          const aTrim = (a ?? '').toString().trim();
          const bTrim = (b ?? '').toString().trim();
          if (aTrim !== '' && bTrim !== '') {
            if (aTrim.toUpperCase() !== bTrim.toUpperCase()) {
              discrepancies.push(`${label} lệch: HIS(${aTrim}) vs BHXH(${bTrim})`);
            }
          } else if (requireBoth && (aTrim !== '' || bTrim !== '')) {
            discrepancies.push(`${label} lệch: HIS(${aTrim || 'trống'}) vs BHXH(${bTrim || 'trống'})`);
          }
        };

        const compareDate = (
          a: string | null | undefined,
          b: string | null | undefined,
          label: string,
          requireBoth = false
        ) => {
          const aTrim = (a ?? '').toString().trim();
          const bTrim = (b ?? '').toString().trim();
          if (aTrim !== '' && bTrim !== '') {
            if (aTrim !== bTrim) {
              discrepancies.push(
                `${label} lệch thời gian: HIS(${formatDateForDisplay(aTrim)}) vs BHXH(${formatDateForDisplay(bTrim)})`
              );
            }
          } else if (requireBoth && (aTrim !== '' || bTrim !== '')) {
            discrepancies.push(
              `${label} lệch thời gian: HIS(${aTrim ? formatDateForDisplay(aTrim) : 'trống'}) vs BHXH(${bTrim ? formatDateForDisplay(bTrim) : 'trống'})`
            );
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
        compareStr(hisRow.HO_TEN, bhxhRow.HO_TEN, 'Họ tên', true);
        compareDob(hisRow.NGAY_SINH, bhxhRow.NGAY_SINH);
        compareGender(hisRow.GIOI_TINH, bhxhRow.GIOI_TINH);
        compareStr(hisRow.MA_THE_BHYT, bhxhRow.MA_THE_BHYT, 'Mã thẻ BHYT', true);

        // Đối chiếu Thời gian & Lâm sàng
        compareStr(hisRow.MA_BENH_CHINH, bhxhRow.MA_BENH_CHINH, 'Mã bệnh chính', true);
        compareDate(hisRow.NGAY_VAO, bhxhRow.NGAY_VAO, 'Ngày vào', true);
        compareDate(hisRow.NGAY_VAO_NOI_TRU, bhxhRow.NGAY_VAO_NOI_TRU, 'Ngày vào nội trú');
        compareDate(hisRow.NGAY_RA, bhxhRow.NGAY_RA, 'Ngày ra', true);
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
          return {
            match: false,
            type: 'DISCREPANCY',
            details: discrepancies,
            hisItem: hisRow,
            bhxhItem: bhxhRow,
          };
        }
        return {
          match: true,
          type: 'MATCH',
          details: ['Khớp dữ liệu'],
          hisItem: hisRow,
          bhxhItem: bhxhRow,
        };
      };

      hisConverted.forEach((hisRow, hIdx) => {
        const bIdx = pairedBhxhForHis.get(hIdx);
        if (bIdx === undefined) {
          finalResults.push({
            match: false,
            type: 'MISSING_BHXH',
            details: ['Không tìm thấy trong file BHXH'],
            hisItem: hisRow,
          });
        } else {
          finalResults.push(comparePair(hisRow, bhxhConverted[bIdx]));
        }
      });

      bhxhConverted.forEach((bhxhRow, bIdx) => {
        if (!usedBhxhIndices.has(bIdx)) {
          finalResults.push({
            match: false,
            type: 'MISSING_HIS',
            details: ['Không tìm thấy trong file HIS'],
            bhxhItem: bhxhRow,
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
      setHasPendingEdits(false);
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
    const byType = filterType === 'ALL' ? results : results.filter(r => r.type === filterType);
    if (!resultsSearch.trim()) return byType;
    const q = normalizeSearchText(resultsSearch);
    return byType.filter(res => {
      if (res.hisItem && matchesTemplateRowSearch(res.hisItem, resultsSearch)) return true;
      if (res.bhxhItem && matchesTemplateRowSearch(res.bhxhItem, resultsSearch)) return true;
      return normalizeSearchText(res.details.join(' ')).includes(q);
    });
  }, [results, filterType, resultsSearch]);

  const resultsDisplayMeta = useMemo(() => {
    const totalFiltered = filteredResults.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / resultsPageSize));
    const safePage = Math.min(Math.max(1, resultsPage), totalPages);
    const start = (safePage - 1) * resultsPageSize;
    return {
      items: filteredResults.slice(start, start + resultsPageSize),
      totalFiltered,
      safePage,
      totalPages,
      start,
    };
  }, [filteredResults, resultsPage, resultsPageSize]);

  const bh01StandardDataset = useMemo(() => {
    if (!showBh01StandardModal || results.length === 0) return null;
    return buildStandardBh01Dataset(results, includeMissingHisInBh01);
  }, [showBh01StandardModal, results, includeMissingHisInBh01]);

  const handlePushStandardBh01ToTt12 = async () => {
    if (!bh01StandardDataset || bh01StandardDataset.rows.length === 0) return;
    try {
      const existing = await getSessionCache<Record<string, Record<string, string>[]>>('tt12_rows_by_table_v1');
      const nextRows = bh01StandardDataset.rows.map(row => {
        const strRow: Record<string, string> = {};
        Object.entries(row).forEach(([k, v]) => {
          strRow[k] = String(v ?? '');
        });
        return strRow;
      });
      await setSessionCache('tt12_rows_by_table_v1', {
        ...(existing || {}),
        MAU_01BH: nextRows,
      });
      setSessionSync('tt12_selected_table_v1', 'MAU_01BH');
      setShowBh01StandardModal(false);
      setMainTab('TT12_BH01_BH02');
    } catch (err: any) {
      alert('Không thể chuyển dữ liệu sang Chứng từ TT12: ' + (err?.message || err));
    }
  };

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
          ? "h-screen pb-[38px] overflow-hidden flex flex-col"
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
                onClick={() => handleSelectModuleTab('TT12_BH01_BH02')}
                className="flex items-center gap-2.5 bg-purple-600/95 hover:bg-purple-600 text-white font-extrabold px-5 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-left"
              >
                <ShieldCheck className="w-5 h-5 shrink-0 text-purple-100" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-black tracking-tight">CHỨNG TỪ TT12 - BH01 - BH02</span>
                  <span className="text-[10px] font-bold text-purple-100/90 mt-0.5">Bảng 1–6 • Mẫu 01/BH • Ký PDF 02/BH</span>
                </div>
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
                onClick={() => handleSelectModuleTab('XML_3176')}
                className="flex items-center gap-2.5 bg-amber-600/95 hover:bg-amber-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <FileCode2 className="w-5 h-5 shrink-0" />
                <span>ĐỌC & KÝ XML 3176</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-bold">15 BẢNG</span>
              </button>
              <button
                onClick={() => handleSelectModuleTab('KHAM_SUC_KHOE')}
                className="flex items-center gap-2.5 bg-emerald-600/95 hover:bg-emerald-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 backdrop-blur-sm cursor-pointer text-sm"
              >
                <FileCode2 className="w-5 h-5 shrink-0" />
                <span>KHÁM SỨC KHỎE</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-bold">API</span>
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
        <main className="max-w-full w-full mx-auto px-0.5 py-1 flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChungTuTt12Module />
        </main>
      ) : (
        <main className="max-w-full px-4 py-4 mx-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'upload' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500 bg-white"
                )}
              >
                <FileUp className="w-4 h-4" />
                Nhập File Dữ Liệu
              </button>
              <button
                onClick={() => setActiveTab('mapping')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === 'mapping' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "hover:bg-slate-50 text-slate-500 bg-white"
                )}
              >
                <Settings className="w-4 h-4" />
                Cấu hình cột
              </button>
            </div>
            <button
              onClick={() => {
                if (bhxhConverted.length > 0 && hisConverted.length > 0) runComparison();
              }}
              disabled={bhxhConverted.length === 0 || hisConverted.length === 0}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer",
                bhxhConverted.length === 0 || hisConverted.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : hasPendingEdits && results.length > 0
                    ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200 animate-pulse"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              )}
            >
              <Play className="w-4 h-4" />
              {hasPendingEdits && results.length > 0 ? 'Chạy đối soát lại (có chỉnh sửa)' : 'Chạy đối soát'}
            </button>
          </div>
          {hasPendingEdits && activeTab === 'upload' && (
            <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Bạn đã chỉnh sửa dữ liệu trực tiếp trên bảng (<b>BHXH: {editedBhxhRows.size} dòng</b>, <b>HIS: {editedHisRows.size} dòng</b>). Bấm <b>&quot;{results.length > 0 ? 'Chạy đối soát lại (có chỉnh sửa)' : 'Chạy đối soát'}&quot;</b> ở góc trên phải để cập nhật kết quả và xuất File Chuẩn BH01 theo dữ liệu mới.
                </span>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-4"
            >
              {/* BHXH Upload */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">File BHXH (Từ Cổng/Excel thô)</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 20 cột</p>
                        <a href="/templates/Template_01BH_Mau_Chuan_BHXH.xlsx" download className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-100 transition">Tải mẫu chuẩn 01BH</a>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {bhxhConverted.length > 0 && (
                      <>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none" title="Khi bỏ tích, lần nạp file mới sẽ thay thế file cũ tránh cộng dồn">
                          <input
                            type="checkbox"
                            checked={appendBhxhOnUpload}
                            onChange={e => setAppendBhxhOnUpload(e.target.checked)}
                            className="accent-indigo-600"
                          />
                          Gộp thêm file
                        </label>
                        <button onClick={() => clearData('BHXH')} className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer">
                          Xóa tất cả
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={cn("relative group", bhxhConverted.length > 0 ? "mb-2" : "mb-6")}>
                  <input type="file" multiple accept=".xlsx,.xls,.xml" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'BHXH')} />
                  <div className={cn(
                    "border-2 border-dashed border-slate-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 rounded-2xl flex items-center justify-center text-center transition-all",
                    bhxhConverted.length > 0 ? "p-2.5 gap-2 flex-row" : "p-8 flex-col"
                  )}>
                    <FileUp className={cn("text-slate-400 group-hover:text-indigo-500 transition-transform", bhxhConverted.length > 0 ? "w-4 h-4" : "w-10 h-10 mb-3 group-hover:scale-110")} />
                    <p className={cn("font-semibold", bhxhConverted.length > 0 ? "text-xs text-slate-600" : "text-sm")}>
                      {bhxhConverted.length > 0 && !appendBhxhOnUpload
                        ? 'Chọn file Excel/XML BHXH mới (thay thế file cũ)'
                        : 'Thêm file Excel/XML BHXH (File Cổng)'}
                    </p>
                  </div>
                </div>

                {bhxhFiles.length > 0 && (
                  <div className="mb-2.5 space-y-1">
                    {bhxhFiles.map((f, fIdx) => (
                      <div key={`${f.name}-${fIdx}`} className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px]">
                        <span className="font-bold text-blue-900 truncate max-w-[200px]" title={f.name}>📄 {f.name}</span>
                        <span className="font-extrabold text-blue-700">({f.count} HS)</span>
                        {f.sheets && f.sheets.length > 1 ? (
                          <div className="flex flex-wrap items-center gap-1.5 ml-1">
                            {f.sheets.map(s => (
                              <label
                                key={s.name}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-semibold cursor-pointer select-none transition",
                                  s.enabled
                                    ? "bg-white border-blue-300 text-blue-900 shadow-2xs"
                                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                )}
                                title={`Bỏ tích nếu không muốn đối chiếu sheet "${s.name}"`}
                              >
                                <input
                                  type="checkbox"
                                  checked={s.enabled}
                                  onChange={() => handleToggleSheet('BHXH', fIdx, s.name)}
                                  className="accent-blue-600"
                                />
                                {s.name} ({s.count})
                              </label>
                            ))}
                          </div>
                        ) : f.sheets && f.sheets.length === 1 ? (
                          <span className="text-[10.5px] text-slate-500">• Sheet: {f.sheets[0].name} ({f.sheets[0].count} HS)</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile('BHXH', fIdx)}
                          className="ml-auto p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa riêng file này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {bhxhConverted.length > 0 && (
                  <div className="mt-1 flex-1 flex flex-col min-h-[360px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                          BHXH ({bhxhDisplayMeta.totalFiltered}/{bhxhConverted.length} HS)
                        </h3>
                        {editedBhxhRows.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Đã sửa {editedBhxhRows.size} dòng
                          </span>
                        )}
                        <span className="text-[10.5px] text-slate-400 italic">Click ô để sửa trực tiếp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={bhxhSearch}
                            onChange={e => setBhxhSearch(e.target.value)}
                            placeholder="Tìm họ tên, mã thẻ, MA_LK, mã bệnh..."
                            className="pl-7 pr-6 py-1 rounded-lg border border-slate-300 bg-white text-xs w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {bhxhSearch && (
                            <button
                              type="button"
                              onClick={() => setBhxhSearch('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Xóa tìm kiếm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {bhxhSearch && (
                          <button
                            type="button"
                            onClick={() => setHisSearch(bhxhSearch)}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold whitespace-nowrap cursor-pointer"
                            title="Áp dụng từ khóa này sang bảng HIS để so sánh và sửa 2 bên"
                          >
                            Tìm cả 2 bên
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-auto max-h-[500px]">
                      <table className="w-full text-left text-[10px] border-collapse min-w-max">
                        <thead className="bg-slate-100 sticky top-0 shadow-sm z-10">
                          <tr>
                            <TableHeaders21 sortConfig={bhxhSort} onSort={(k) => handleSort(k, bhxhSort, setBhxhSort)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {bhxhDisplayMeta.items.map(({ row, origIdx }) => (
                            <tr
                              key={origIdx}
                              className={cn(
                                "hover:bg-blue-50/40",
                                editedBhxhRows.has(origIdx) && "bg-amber-50/60"
                              )}
                            >
                              <TableRow21
                                row={row}
                                onEdit={(field, val) => handleEditConvertedRow('BHXH', origIdx, field, val)}
                              />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePaginationBar
                      currentPage={bhxhDisplayMeta.safePage}
                      totalItems={bhxhDisplayMeta.totalFiltered}
                      pageSize={bhxhPageSize}
                      onPageChange={setBhxhPage}
                      onPageSizeChange={setBhxhPageSize}
                      accent="blue"
                      compact
                    />
                  </div>
                )}
              </div>

              {/* HIS Upload */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">File HIS (Bệnh viện)</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">Sẽ tự trích xuất vào mẫu chuẩn 20 cột</p>
                        <a href="/templates/Template_01BH_Mau_Chuan_BHXH.xlsx" download className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-indigo-100 transition">Tải mẫu chuẩn 01BH</a>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hisConverted.length > 0 && (
                      <>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none" title="Khi bỏ tích, lần nạp file mới sẽ thay thế file cũ tránh cộng dồn">
                          <input
                            type="checkbox"
                            checked={appendHisOnUpload}
                            onChange={e => setAppendHisOnUpload(e.target.checked)}
                            className="accent-violet-600"
                          />
                          Gộp thêm file
                        </label>
                        <button onClick={() => clearData('HIS')} className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer">
                          Xóa tất cả
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={cn("relative group", hisConverted.length > 0 ? "mb-2" : "mb-6")}>
                  <input type="file" multiple accept=".xlsx,.xls,.xml" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, 'HIS')} />
                  <div className={cn(
                    "border-2 border-dashed border-slate-200 group-hover:border-violet-300 group-hover:bg-violet-50/50 rounded-2xl flex items-center justify-center text-center transition-all",
                    hisConverted.length > 0 ? "p-2.5 gap-2 flex-row" : "p-8 flex-col"
                  )}>
                    <FileUp className={cn("text-slate-400 group-hover:text-violet-500 transition-transform", hisConverted.length > 0 ? "w-4 h-4" : "w-10 h-10 mb-3 group-hover:scale-110")} />
                    <p className={cn("font-semibold", hisConverted.length > 0 ? "text-xs text-slate-600" : "text-sm")}>
                      {hisConverted.length > 0 && !appendHisOnUpload
                        ? 'Chọn file Excel hoặc XML HIS mới (thay thế file cũ)'
                        : 'Thêm file Excel hoặc XML HIS'}
                    </p>
                  </div>
                </div>

                {hisFiles.length > 0 && (
                  <div className="mb-2.5 space-y-1">
                    {hisFiles.map((f, fIdx) => (
                      <div key={`${f.name}-${fIdx}`} className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-50/70 border border-violet-200/80 text-[11px]">
                        <span className="font-bold text-violet-900 truncate max-w-[200px]" title={f.name}>📄 {f.name}</span>
                        <span className="font-extrabold text-violet-700">({f.count} HS)</span>
                        {f.sheets && f.sheets.length > 1 ? (
                          <div className="flex flex-wrap items-center gap-1.5 ml-1">
                            {f.sheets.map(s => (
                              <label
                                key={s.name}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-semibold cursor-pointer select-none transition",
                                  s.enabled
                                    ? "bg-white border-violet-300 text-violet-900 shadow-2xs"
                                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                )}
                                title={`Bỏ tích nếu không muốn đối chiếu sheet "${s.name}"`}
                              >
                                <input
                                  type="checkbox"
                                  checked={s.enabled}
                                  onChange={() => handleToggleSheet('HIS', fIdx, s.name)}
                                  className="accent-violet-600"
                                />
                                {s.name} ({s.count})
                              </label>
                            ))}
                          </div>
                        ) : f.sheets && f.sheets.length === 1 ? (
                          <span className="text-[10.5px] text-slate-500">• Sheet: {f.sheets[0].name} ({f.sheets[0].count} HS)</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile('HIS', fIdx)}
                          className="ml-auto p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa riêng file này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {hisConverted.length > 0 && (
                  <div className="mt-1 flex-1 flex flex-col min-h-[360px]">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-violet-600" />
                          HIS ({hisDisplayMeta.totalFiltered}/{hisConverted.length} HS)
                        </h3>
                        {editedHisRows.size > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Đã sửa {editedHisRows.size} dòng
                          </span>
                        )}
                        <span className="text-[10.5px] text-slate-400 italic">Click ô để sửa trực tiếp</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={hisSearch}
                            onChange={e => setHisSearch(e.target.value)}
                            placeholder="Tìm họ tên, mã thẻ, MA_LK, mã bệnh..."
                            className="pl-7 pr-6 py-1 rounded-lg border border-slate-300 bg-white text-xs w-56 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          {hisSearch && (
                            <button
                              type="button"
                              onClick={() => setHisSearch('')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Xóa tìm kiếm"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {hisSearch && (
                          <button
                            type="button"
                            onClick={() => setBhxhSearch(hisSearch)}
                            className="px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-[11px] font-bold whitespace-nowrap cursor-pointer"
                            title="Áp dụng từ khóa này sang bảng BHXH để so sánh và sửa 2 bên"
                          >
                            Tìm cả 2 bên
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-auto max-h-[500px]">
                      <table className="w-full text-left text-[10px] border-collapse min-w-max">
                        <thead className="bg-slate-100 sticky top-0 shadow-sm z-10">
                          <tr>
                            <TableHeaders21 sortConfig={hisSort} onSort={(k) => handleSort(k, hisSort, setHisSort)} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {hisDisplayMeta.items.map(({ row, origIdx }) => (
                            <tr
                              key={origIdx}
                              className={cn(
                                "hover:bg-violet-50/40",
                                editedHisRows.has(origIdx) && "bg-amber-50/60"
                              )}
                            >
                              <TableRow21
                                row={row}
                                onEdit={(field, val) => handleEditConvertedRow('HIS', origIdx, field, val)}
                              />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePaginationBar
                      currentPage={hisDisplayMeta.safePage}
                      totalItems={hisDisplayMeta.totalFiltered}
                      pageSize={hisPageSize}
                      onPageChange={setHisPage}
                      onPageSizeChange={setHisPageSize}
                      accent="violet"
                      compact
                    />
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
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                        "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer",
                        filterType === filter.type 
                          ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="relative ml-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={resultsSearch}
                      onChange={e => setResultsSearch(e.target.value)}
                      placeholder="Tìm tên, mã thẻ, lỗi..."
                      className="pl-7 pr-6 py-1.5 rounded-full border border-slate-300 bg-white text-xs w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {resultsSearch && (
                      <button
                        type="button"
                        onClick={() => setResultsSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowBh01StandardModal(true)}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 cursor-pointer"
                    title="Gộp đủ dữ liệu HIS, tự động sửa cột sai lệch theo BHXH, cảnh báo thiếu để xuất file chuẩn 20 cột đẩy cổng"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Xuất File Chuẩn BH01
                  </button>
                  <button 
                    onClick={exportExcel}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Xuất File 21 Cột
                  </button>
                </div>
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
                      {resultsDisplayMeta.items.map((res, i) => {
                        const item = res.hisItem || res.bhxhItem;
                        return (
                          <React.Fragment key={resultsDisplayMeta.start + i}>
                            <tr className="hover:bg-slate-50/50 transition-colors bg-white">
                              <td className="px-3 py-4 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9]">
                                <div className="flex items-center gap-1.5">
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
                                  {item && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const query = item.HO_TEN || item.MA_THE_BHYT || '';
                                        setBhxhSearch(query);
                                        setHisSearch(query);
                                        setActiveTab('upload');
                                      }}
                                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold whitespace-nowrap cursor-pointer"
                                      title="Chuyển về tab Nhập File Dữ Liệu và lọc đúng bệnh nhân này để chỉnh sửa"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      Sửa
                                    </button>
                                  )}
                                </div>
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
                <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                  <TablePaginationBar
                    currentPage={resultsDisplayMeta.safePage}
                    totalItems={resultsDisplayMeta.totalFiltered}
                    pageSize={resultsPageSize}
                    onPageChange={setResultsPage}
                    onPageSizeChange={setResultsPageSize}
                    accent="indigo"
                  />
                </div>
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

      {/* Modal Xuất File Chuẩn BH01 (Lấy BHXH làm gốc khi sai lệch, giữ đủ hồ sơ HIS & cảnh báo thiếu) */}
      {showBh01StandardModal && bh01StandardDataset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    XUẤT FILE CHUẨN BH01 (MẪU 01/BH - 20 CỘT ĐẨY CỔNG)
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Nguyên tắc: Giữ đủ số lượng hồ sơ bên HIS • Nếu lệch cột giữa HIS và BHXH → lấy bên BHXH làm gốc, bỏ giá trị sai bên HIS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBh01StandardModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Thống kê tổng quan */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500">Tổng hồ sơ xuất chuẩn</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {bh01StandardDataset.stats.totalOutputRows.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700">Khớp 2 bên</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">
                    {bh01StandardDataset.stats.matchCount.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] font-bold text-blue-700">Đã sửa theo BHXH</div>
                  <div className="text-xl font-black text-blue-800 mt-0.5">
                    {bh01StandardDataset.stats.adjustedCount.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-700">Thiếu BHXH (lấy HIS)</div>
                  <div className="text-xl font-black text-amber-800 mt-0.5">
                    {bh01StandardDataset.stats.missingBhxhCount.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-700">Thiếu cột / Thiếu HIS</div>
                  <div className="text-xl font-black text-rose-800 mt-0.5">
                    {bh01StandardDataset.stats.incompleteRowCount} / {bh01StandardDataset.stats.missingHisCount}
                  </div>
                </div>
              </div>

              {/* Cảnh báo rõ ràng để người dùng kiểm tra & bổ sung */}
              {(bh01StandardDataset.stats.missingBhxhCount > 0 ||
                bh01StandardDataset.stats.missingHisCount > 0 ||
                bh01StandardDataset.stats.incompleteRowCount > 0) && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                  <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    CẢNH BÁO KIỂM TRA &amp; BỔ SUNG DỮ LIỆU:
                  </div>
                  {bh01StandardDataset.stats.missingBhxhCount > 0 && (
                    <div>
                      • Có <b>{bh01StandardDataset.stats.missingBhxhCount}</b> hồ sơ có ở HIS nhưng <b>thiếu trên file BHXH</b> → Hệ thống vẫn giữ đầy đủ từ HIS để không thiếu số lượng đẩy cổng.
                    </div>
                  )}
                  {bh01StandardDataset.stats.missingHisCount > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        • Có <b>{bh01StandardDataset.stats.missingHisCount}</b> hồ sơ có trên file BHXH nhưng <b>thiếu bên HIS</b> (cần kiểm tra lại HIS để bổ sung nếu cần).
                      </span>
                      <label className="inline-flex items-center gap-1.5 font-bold text-indigo-800 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-300">
                        <input
                          type="checkbox"
                          checked={includeMissingHisInBh01}
                          onChange={e => setIncludeMissingHisInBh01(e.target.checked)}
                          className="accent-indigo-600"
                        />
                        Gộp thêm {bh01StandardDataset.stats.missingHisCount} hồ sơ này vào file chuẩn
                      </label>
                    </div>
                  )}
                  {bh01StandardDataset.stats.incompleteRowCount > 0 && (
                    <div className="text-rose-800 font-semibold">
                      • Có <b>{bh01StandardDataset.stats.incompleteRowCount}</b> hồ sơ đang <b>thiếu thông tin cột bắt buộc</b> (xem cột &quot;Cảnh báo thiếu cột&quot; bên dưới để bổ sung trước khi đẩy cổng).
                    </div>
                  )}
                </div>
              )}

              {/* Bảng chi tiết các hồ sơ đã sửa theo BHXH hoặc có cảnh báo */}
              {(() => {
                const attentionItems = [
                  ...bh01StandardDataset.logs.filter(
                    l => l.status !== 'MATCH' || l.missingRequiredFields.length > 0
                  ),
                  ...bh01StandardDataset.missingHisLogs.filter(
                    m => !bh01StandardDataset.logs.some(l => l === m)
                  ),
                ];

                if (attentionItems.length === 0) {
                  return (
                    <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-sm font-bold text-emerald-800">
                      ✅ Toàn bộ {bh01StandardDataset.stats.totalOutputRows} hồ sơ đều khớp hoàn toàn và đầy đủ thông tin bắt buộc!
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>
                        Danh sách hồ sơ đã điều chỉnh theo BHXH / có cảnh báo ({attentionItems.length} dòng)
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">
                        (Hiển thị tối đa 150 dòng đầu; toàn bộ nhật ký nằm ở Sheet 2 &quot;Canh_Bao_Dieu_Chinh&quot; khi tải Excel)
                      </span>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] text-slate-600">
                          <tr>
                            <th className="px-2.5 py-2 w-12">STT</th>
                            <th className="px-2.5 py-2">Họ và tên</th>
                            <th className="px-2.5 py-2">Mã thẻ BHYT</th>
                            <th className="px-2.5 py-2">Xử lý</th>
                            <th className="px-2.5 py-2">Chi tiết điều chỉnh theo BHXH / Lưu ý</th>
                            <th className="px-2.5 py-2">Cảnh báo thiếu cột</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {attentionItems.slice(0, 150).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-2.5 py-1.5 font-mono text-slate-500">{item.stt}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-slate-800">{item.hoTen || '—'}</td>
                              <td className="px-2.5 py-1.5 font-mono text-slate-700">{item.maTheBhyt || '—'}</td>
                              <td className="px-2.5 py-1.5 whitespace-nowrap">
                                {item.status === 'ADJUSTED_FROM_BHXH' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Sửa theo BHXH
                                  </span>
                                )}
                                {item.status === 'MISSING_BHXH_KEEP_HIS' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Thiếu BHXH (lấy HIS)
                                  </span>
                                )}
                                {item.status === 'MISSING_HIS_ONLY' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Thiếu bên HIS
                                  </span>
                                )}
                                {item.status === 'MATCH' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Khớp
                                  </span>
                                )}
                              </td>
                              <td className="px-2.5 py-1.5 text-[11px] text-slate-700">
                                {item.adjustedFields.length > 0 ? item.adjustedFields.join(' | ') : '—'}
                              </td>
                              <td className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">
                                {item.missingRequiredFields.length > 0
                                  ? `Thiếu: ${item.missingRequiredFields.join(', ')}`
                                  : 'Đủ'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowBh01StandardModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePushStandardBh01ToTt12}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  title="Nạp thẳng dữ liệu chuẩn 20 cột sang tab CHỨNG TỪ TT12 (Mẫu 01/BH) để ký số và xuất XML"
                >
                  <FileCode2 className="w-4 h-4" />
                  Đẩy thẳng sang Chứng từ TT12 (Mẫu 01/BH)
                </button>
                <button
                  type="button"
                  onClick={() => exportStandardBh01Workbook(bh01StandardDataset)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Tải Excel Chuẩn BH01 (20 cột)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
