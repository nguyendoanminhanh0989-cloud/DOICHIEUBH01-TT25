import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, ShieldCheck, FileCode2, AlertTriangle, CheckCircle2,
  Search, Edit3, Plus, Trash2, Eye, Settings, RefreshCw, FileSpreadsheet,
  KeyRound, Usb, Smartphone, Check, X, Filter, Layers, CheckSquare, Square
} from 'lucide-react';
import {
  XML3176_TABLES,
  FIELD_LABELS_3176,
  Xml3176TableId,
  Xml3176ParsedDoc,
  Xml3176Row,
  parseXml3176,
  buildXml3176,
  buildInnerFileHosoXml,
  validateXml3176Doc,
} from '../lib/xml3176Service';
import {
  getSmartCAConfig,
  getSmartCaCertificate,
  signSmartCAHash,
  testSmartCaConnection,
  SmartCAConfig,
} from '../lib/vnptSmartCaService';
import {
  checkLocalTokenSigner,
  signXmlWithUsbToken,
  unlockAndFetchTokenCertificate,
  LocalSignerStatus,
} from '../lib/localTokenSignerService';
import { prepareXmlForSigning } from '../lib/xmlBuilder';
import ConfigModal from './ConfigModal';

type ActiveTab = 'ERRORS' | Xml3176TableId;

export default function Xml3176Module() {
  // Dữ liệu XML hoàn toàn chỉ lưu trên RAM (useState), tuyệt đối không lưu localStorage/sessionStorage (F5 mất hoàn toàn)
  const [doc, setDoc] = useState<Xml3176ParsedDoc | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('XML1');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHosoFilter, setSelectedHosoFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Danh sách các hosoIndex được tích chọn ở Bảng 1 để Ký số / Xuất XML
  const [selectedHosoIndices, setSelectedHosoIndices] = useState<Set<number>>(new Set());

  // Chỉnh sửa chi tiết 1 dòng
  const [editingRow, setEditingRow] = useState<Xml3176Row | null>(null);
  const [editingFieldsDraft, setEditingFieldsDraft] = useState<Record<string, string>>({});
  const [newFieldTagName, setNewFieldTagName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Xem XML gốc / XML giải mã / Chữ ký số
  const [showXmlPreviewModal, setShowXmlPreviewModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'OUTER_UNSIGNED' | 'OUTER_SIGNED' | 'OUTER_UNENCODED' | 'INNER_DECODED' | 'SIGNATURE_ONLY'>('OUTER_UNENCODED');
  const [previewHosoIdx, setPreviewHosoIdx] = useState(0);

  // Modal Cấu hình chung & Modal Ký số XML 3176
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  // Phạm vi ký: 'SELECTED' (các hồ sơ đã tích chọn), 'ALL' (tất cả hồ sơ), hoặc số cụ thể (1 hồ sơ đơn lẻ)
  const [signTargetScope, setSignTargetScope] = useState<'SELECTED' | 'ALL' | number>('SELECTED');
  const [signPackageMode, setSignPackageMode] = useState<'COMBINED' | 'INDIVIDUAL'>('COMBINED');
  const [signMethod, setSignMethod] = useState<'SMARTCA_TOTP' | 'SMARTCA_APP' | 'USB_TOKEN'>(() => {
    const cfg = getSmartCAConfig();
    if (cfg.clientId && cfg.clientSecret && cfg.userId) {
      return cfg.signMode === 'APP' ? 'SMARTCA_APP' : 'SMARTCA_TOTP';
    }
    return 'USB_TOKEN';
  });
  const [smartCaCfg, setSmartCaCfg] = useState<SmartCAConfig>(() => getSmartCAConfig());
  const [localSigner, setLocalSigner] = useState<LocalSignerStatus | null>(null);
  const [selectedTokenSerial, setSelectedTokenSerial] = useState<string>('');
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isUnlockingToken, setIsUnlockingToken] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signStatusMsg, setSignStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [autoDownloadAfterSign, setAutoDownloadAfterSign] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      const parsed = parseXml3176(text, file.name);
      setDoc(parsed);
      // Mặc định tích chọn tất cả hồ sơ khi vừa đọc file
      const allIndices = new Set<number>();
      for (let i = 0; i < parsed.hosoFiles.length; i++) {
        allIndices.add(i);
      }
      setSelectedHosoIndices(allIndices);
      setActiveTab('XML1');
      setSelectedHosoFilter('ALL');
      setCurrentPage(1);
    } catch (err: any) {
      alert('Lỗi đọc file XML 3176: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearLoadedXml = () => {
    if (!doc) return;
    if (!window.confirm('Bạn có chắc muốn đóng và xóa toàn bộ dữ liệu XML đang mở khỏi bộ nhớ tạm?')) return;
    setDoc(null);
    setSelectedHosoIndices(new Set());
    setSearchTerm('');
    setSelectedHosoFilter('ALL');
    setCurrentPage(1);
  };

  // Danh sách Hồ sơ (lấy từ XML1) để lọc nhanh theo bệnh nhân
  const hosoOptions = useMemo(() => {
    if (!doc) return [];
    return doc.tables.XML1.map(r => ({
      hosoIndex: r.hosoIndex,
      maLk: r.fields.MA_LK || `HS_${r.hosoIndex + 1}`,
      hoTen: r.fields.HO_TEN || '',
      maThe: r.fields.MA_THE_BHYT || '',
    }));
  }, [doc]);

  // Danh sách các hosoIndex được chọn theo thứ tự tăng dần
  const sortedSelectedIndices = useMemo(() => {
    return Array.from(selectedHosoIndices).sort((a, b) => a - b);
  }, [selectedHosoIndices]);

  // Thống kê số lượng hồ sơ đã ký / chưa ký
  const signStats = useMemo(() => {
    if (!doc) return { signedCount: 0, unsignedCount: 0, modifiedCount: 0 };
    let signedCount = 0;
    let unsignedCount = 0;
    let modifiedCount = 0;
    for (let i = 0; i < doc.hosoFiles.length; i++) {
      const st = doc.hosoSignStates[i];
      if (st?.isSigned && !st.isModified) {
        signedCount++;
      } else {
        unsignedCount++;
        if (st?.isModified) modifiedCount++;
      }
    }
    return { signedCount, unsignedCount, modifiedCount };
  }, [doc]);

  // Tổng hợp chi phí từ Bảng 1 (tính trên các hồ sơ đang tích chọn hoặc toàn bộ nếu chưa tích)
  const costSummary = useMemo(() => {
    if (!doc) return { tongChiBv: 0, bhtt: 0, bntt: 0, thuoc: 0, vtyt: 0, count: 0 };
    const rowsToSum =
      selectedHosoIndices.size > 0
        ? doc.tables.XML1.filter(r => selectedHosoIndices.has(r.hosoIndex))
        : doc.tables.XML1;
    return rowsToSum.reduce(
      (acc, r) => {
        acc.tongChiBv += Number(r.fields.T_TONGCHI_BV || 0);
        acc.bhtt += Number(r.fields.T_BHTT || 0);
        acc.bntt += Number(r.fields.T_BNTT || 0) + Number(r.fields.T_BNCCT || 0);
        acc.thuoc += Number(r.fields.T_THUOC || 0);
        acc.vtyt += Number(r.fields.T_VTYT || 0);
        acc.count += 1;
        return acc;
      },
      { tongChiBv: 0, bhtt: 0, bntt: 0, thuoc: 0, vtyt: 0, count: 0 }
    );
  }, [doc, selectedHosoIndices]);

  // Dữ liệu của Bảng đang chọn sau khi lọc
  const currentTableRows = useMemo(() => {
    if (!doc || activeTab === 'ERRORS') return [];
    const rawRows = doc.tables[activeTab] || [];
    const q = searchTerm.trim().toLowerCase();
    return rawRows.filter(row => {
      if (selectedHosoFilter !== 'ALL' && String(row.hosoIndex) !== selectedHosoFilter) {
        return false;
      }
      if (!q) return true;
      if (row.maLk.toLowerCase().includes(q) || row.hoTen.toLowerCase().includes(q)) return true;
      return Object.values(row.fields).some(v => (v || '').toLowerCase().includes(q));
    });
  }, [doc, activeTab, searchTerm, selectedHosoFilter]);

  const filteredErrors = useMemo(() => {
    if (!doc) return [];
    const q = searchTerm.trim().toLowerCase();
    return doc.errors.filter(err => {
      if (selectedHosoFilter !== 'ALL' && String(err.hosoIndex) !== selectedHosoFilter) {
        return false;
      }
      if (!q) return true;
      return (
        err.maLk.toLowerCase().includes(q) ||
        err.hoTen.toLowerCase().includes(q) ||
        err.field.toLowerCase().includes(q) ||
        err.message.toLowerCase().includes(q)
      );
    });
  }, [doc, searchTerm, selectedHosoFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil((activeTab === 'ERRORS' ? filteredErrors.length : currentTableRows.length) / pageSize)
  );

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentTableRows.slice(start, start + pageSize);
  }, [currentTableRows, currentPage]);

  // Thao tác tích chọn hồ sơ ở Bảng 1
  const toggleSelectHoso = (hosoIndex: number) => {
    setSelectedHosoIndices(prev => {
      const next = new Set(prev);
      if (next.has(hosoIndex)) next.delete(hosoIndex);
      else next.add(hosoIndex);
      return next;
    });
  };

  const toggleSelectAllFilteredXml1 = () => {
    if (!doc) return;
    const targetIndices =
      activeTab === 'XML1'
        ? currentTableRows.map(r => r.hosoIndex)
        : doc.tables.XML1.map(r => r.hosoIndex);
    const allSelected = targetIndices.length > 0 && targetIndices.every(idx => selectedHosoIndices.has(idx));
    setSelectedHosoIndices(prev => {
      const next = new Set(prev);
      if (allSelected) {
        for (const idx of targetIndices) next.delete(idx);
      } else {
        for (const idx of targetIndices) next.add(idx);
      }
      return next;
    });
  };

  // Cập nhật trực tiếp 1 ô trên bảng (và tự động đánh dấu hồ sơ đó đã sửa -> cần ký lại nếu trước đó đã ký)
  const handleInlineFieldChange = (row: Xml3176Row, fieldKey: string, newValue: string) => {
    if (!doc) return;
    const nextTables = { ...doc.tables };
    const nextRows = nextTables[row.tableId].map(r => {
      if (r.rowId !== row.rowId) return r;
      const updatedFields = { ...r.fields, [fieldKey]: newValue };
      return {
        ...r,
        maLk: fieldKey === 'MA_LK' ? newValue : r.maLk,
        hoTen: fieldKey === 'HO_TEN' ? newValue : r.hoTen,
        fields: updatedFields,
      };
    });
    nextTables[row.tableId] = nextRows;

    // Nếu sửa HO_TEN hoặc MA_LK ở XML1, đồng bộ hiển thị cho các bảng con cùng hosoIndex
    if (row.tableId === 'XML1' && (fieldKey === 'HO_TEN' || fieldKey === 'MA_LK')) {
      for (const tId of Object.keys(nextTables) as Xml3176TableId[]) {
        if (tId === 'XML1') continue;
        nextTables[tId] = nextTables[tId].map(r => {
          if (r.hosoIndex !== row.hosoIndex) return r;
          return {
            ...r,
            maLk: fieldKey === 'MA_LK' ? newValue : r.maLk,
            hoTen: fieldKey === 'HO_TEN' ? newValue : r.hoTen,
            fields: fieldKey === 'MA_LK' && 'MA_LK' in r.fields ? { ...r.fields, MA_LK: newValue } : r.fields,
          };
        });
      }
    }

    const nextHosoFiles = doc.hosoFiles.map((files, hIdx) => {
      if (hIdx !== row.hosoIndex) return files;
      return files.map(f =>
        f.fileHosoIndex === row.fileHosoIndex && f.loaiHoso === row.tableId
          ? { ...f, isModified: true }
          : f
      );
    });

    const nextHosoSignStates = {
      ...doc.hosoSignStates,
      [row.hosoIndex]: {
        ...(doc.hosoSignStates[row.hosoIndex] || { hosoIndex: row.hosoIndex }),
        isSigned: false,
        isModified: true,
      },
    };

    const nextDoc: Xml3176ParsedDoc = {
      ...doc,
      tables: nextTables,
      hosoFiles: nextHosoFiles,
      hosoSignStates: nextHosoSignStates,
      signature: {
        ...doc.signature,
        isSigned: false,
      },
    };
    nextDoc.errors = validateXml3176Doc(nextDoc);
    setDoc(nextDoc);
  };

  // Mở modal chỉnh sửa toàn bộ trường của 1 dòng
  const openEditRowModal = (row: Xml3176Row) => {
    setEditingRow(row);
    setEditingFieldsDraft({ ...row.fields });
    setNewFieldTagName('');
    setNewFieldValue('');
  };

  const saveEditRowModal = () => {
    if (!doc || !editingRow) return;
    const allKeys = [...editingRow.fieldOrder];
    for (const k of Object.keys(editingFieldsDraft)) {
      if (!allKeys.includes(k)) allKeys.push(k);
    }

    const nextTables = { ...doc.tables };
    nextTables[editingRow.tableId] = nextTables[editingRow.tableId].map(r => {
      if (r.rowId !== editingRow.rowId) return r;
      return {
        ...r,
        maLk: editingFieldsDraft.MA_LK ?? r.maLk,
        hoTen: editingFieldsDraft.HO_TEN ?? r.hoTen,
        fields: { ...editingFieldsDraft },
        fieldOrder: allKeys,
      };
    });

    if (editingRow.tableId === 'XML1') {
      const newMaLk = editingFieldsDraft.MA_LK;
      const newHoTen = editingFieldsDraft.HO_TEN;
      for (const tId of Object.keys(nextTables) as Xml3176TableId[]) {
        if (tId === 'XML1') continue;
        nextTables[tId] = nextTables[tId].map(r => {
          if (r.hosoIndex !== editingRow.hosoIndex) return r;
          return {
            ...r,
            maLk: newMaLk !== undefined ? newMaLk : r.maLk,
            hoTen: newHoTen !== undefined ? newHoTen : r.hoTen,
            fields: newMaLk !== undefined && 'MA_LK' in r.fields ? { ...r.fields, MA_LK: newMaLk } : r.fields,
          };
        });
      }
    }

    const nextColumns = { ...doc.tableColumns };
    const colArr = [...nextColumns[editingRow.tableId]];
    for (const k of allKeys) {
      if (!colArr.includes(k)) colArr.push(k);
    }
    nextColumns[editingRow.tableId] = colArr;

    const nextHosoFiles = doc.hosoFiles.map((files, hIdx) => {
      if (hIdx !== editingRow.hosoIndex) return files;
      return files.map(f =>
        f.fileHosoIndex === editingRow.fileHosoIndex && f.loaiHoso === editingRow.tableId
          ? { ...f, isModified: true }
          : f
      );
    });

    const nextHosoSignStates = {
      ...doc.hosoSignStates,
      [editingRow.hosoIndex]: {
        ...(doc.hosoSignStates[editingRow.hosoIndex] || { hosoIndex: editingRow.hosoIndex }),
        isSigned: false,
        isModified: true,
      },
    };

    const nextDoc: Xml3176ParsedDoc = {
      ...doc,
      tables: nextTables,
      tableColumns: nextColumns,
      hosoFiles: nextHosoFiles,
      hosoSignStates: nextHosoSignStates,
      signature: {
        ...doc.signature,
        isSigned: false,
      },
    };
    nextDoc.errors = validateXml3176Doc(nextDoc);
    setDoc(nextDoc);
    setEditingRow(null);
  };

  // Thêm 1 dòng mới vào bảng hiện tại
  const handleAddRowToActiveTable = () => {
    if (!doc || activeTab === 'ERRORS') return;
    const meta = XML3176_TABLES.find(t => t.id === activeTab)!;
    const targetHosoIdx = selectedHosoFilter !== 'ALL' ? Number(selectedHosoFilter) : 0;
    const hosoXml1 = doc.tables.XML1.find(r => r.hosoIndex === targetHosoIdx);
    const defaultMaLk = hosoXml1?.fields.MA_LK || `LK_${Date.now()}`;
    const defaultHoTen = hosoXml1?.fields.HO_TEN || '';

    const cols = doc.tableColumns[activeTab].length > 0 ? doc.tableColumns[activeTab] : meta.defaultFields;
    const newFields: Record<string, string> = {};
    for (const c of cols) newFields[c] = '';
    if ('MA_LK' in newFields) newFields.MA_LK = defaultMaLk;
    if ('STT' in newFields) {
      const existingCount = doc.tables[activeTab].filter(r => r.hosoIndex === targetHosoIdx).length;
      newFields.STT = String(existingCount + 1);
    }
    if ('MA_CSKCB' in newFields) newFields.MA_CSKCB = doc.maCskcb;

    const nextHosoFiles = [...doc.hosoFiles];
    if (!nextHosoFiles[targetHosoIdx]) {
      nextHosoFiles[targetHosoIdx] = [];
    }
    let fileNode = nextHosoFiles[targetHosoIdx].find(f => f.loaiHoso === activeTab);
    const fileHosoIdx = fileNode ? fileNode.fileHosoIndex : nextHosoFiles[targetHosoIdx].length;

    if (!fileNode) {
      fileNode = {
        hosoIndex: targetHosoIdx,
        fileHosoIndex: fileHosoIdx,
        loaiHoso: activeTab,
        originalBase64: '',
        decodedXml: '',
        xmlDeclaration: '<?xml version="1.0" encoding="utf-8" ?>',
        rootTag: meta.rootTag,
        listTag: meta.listTag,
        itemTag: meta.itemTag,
        isModified: true,
      };
      nextHosoFiles[targetHosoIdx] = [...nextHosoFiles[targetHosoIdx], fileNode];
    } else {
      nextHosoFiles[targetHosoIdx] = nextHosoFiles[targetHosoIdx].map(f =>
        f.fileHosoIndex === fileHosoIdx ? { ...f, isModified: true } : f
      );
    }

    const newItemIdx = doc.tables[activeTab].filter(
      r => r.hosoIndex === targetHosoIdx && r.fileHosoIndex === fileHosoIdx
    ).length;

    const newRow: Xml3176Row = {
      rowId: `${activeTab}-H${targetHosoIdx}-F${fileHosoIdx}-R${Date.now()}`,
      hosoIndex: targetHosoIdx,
      fileHosoIndex: fileHosoIdx,
      itemIndex: newItemIdx,
      tableId: activeTab,
      maLk: defaultMaLk,
      hoTen: defaultHoTen,
      fields: newFields,
      fieldOrder: [...cols],
      cdataTags: [...meta.defaultCdataFields],
    };

    const nextTables = {
      ...doc.tables,
      [activeTab]: [newRow, ...doc.tables[activeTab]],
    };

    const nextHosoSignStates = {
      ...doc.hosoSignStates,
      [targetHosoIdx]: {
        ...(doc.hosoSignStates[targetHosoIdx] || { hosoIndex: targetHosoIdx }),
        isSigned: false,
        isModified: true,
      },
    };

    const nextDoc: Xml3176ParsedDoc = {
      ...doc,
      tables: nextTables,
      hosoFiles: nextHosoFiles,
      hosoSignStates: nextHosoSignStates,
      soLuongHoSo: nextHosoFiles.length,
      signature: {
        ...doc.signature,
        isSigned: false,
      },
    };
    nextDoc.errors = validateXml3176Doc(nextDoc);
    setDoc(nextDoc);
    openEditRowModal(newRow);
  };

  // Xóa 1 dòng khỏi bảng
  const handleDeleteRow = (row: Xml3176Row) => {
    if (!doc) return;
    if (!window.confirm(`Bạn có chắc muốn xóa dòng này khỏi ${row.tableId} (Mã LK: ${row.maLk})?`)) return;

    const nextTables = {
      ...doc.tables,
      [row.tableId]: doc.tables[row.tableId].filter(r => r.rowId !== row.rowId),
    };

    const nextHosoFiles = doc.hosoFiles.map((files, hIdx) => {
      if (hIdx !== row.hosoIndex) return files;
      return files.map(f =>
        f.fileHosoIndex === row.fileHosoIndex && f.loaiHoso === row.tableId
          ? { ...f, isModified: true }
          : f
      );
    });

    const nextHosoSignStates = {
      ...doc.hosoSignStates,
      [row.hosoIndex]: {
        ...(doc.hosoSignStates[row.hosoIndex] || { hosoIndex: row.hosoIndex }),
        isSigned: false,
        isModified: true,
      },
    };

    const nextDoc: Xml3176ParsedDoc = {
      ...doc,
      tables: nextTables,
      hosoFiles: nextHosoFiles,
      hosoSignStates: nextHosoSignStates,
      signature: {
        ...doc.signature,
        isSigned: false,
      },
    };
    nextDoc.errors = validateXml3176Doc(nextDoc);
    setDoc(nextDoc);
  };

  // Tải file XML
  const triggerDownloadXml = (xmlString: string, suffix: string) => {
    const baseName = (doc?.fileName || 'HOSO_3176').replace(/\.xml$/i, '');
    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${suffix}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Lấy danh sách hosoIndex sẽ xuất / ký
  const getTargetHosoIndices = (scope: 'SELECTED' | 'ALL' | number): number[] => {
    if (!doc) return [];
    if (typeof scope === 'number') return [scope];
    if (scope === 'ALL') {
      return Array.from({ length: doc.hosoFiles.length }, (_, i) => i);
    }
    if (sortedSelectedIndices.length > 0) return sortedSelectedIndices;
    return Array.from({ length: doc.hosoFiles.length }, (_, i) => i);
  };

  // Xuất XML Không ký số (cho các hồ sơ đã tích chọn ở Bảng 1, với nội dung đã sửa mới nhất)
  const handleExportUnsignedXml = (singleHosoIdx?: number) => {
    if (!doc) return;
    if (typeof singleHosoIdx === 'number') {
      const rowXml1 = doc.tables.XML1.find(r => r.hosoIndex === singleHosoIdx);
      const maLk = rowXml1?.fields.MA_LK || `HS${singleHosoIdx + 1}`;
      const unsignedSingle = buildXml3176(doc, {
        includeSignature: false,
        selectedHosoIndices: [singleHosoIdx],
      });
      triggerDownloadXml(unsignedSingle, `${maLk}_KhongKySo`);
      return;
    }

    if (selectedHosoIndices.size === 0) {
      alert('Vui lòng tích chọn ít nhất 1 hồ sơ ở Bảng 1 để xuất XML!');
      return;
    }

    const unsignedXml = buildXml3176(doc, {
      includeSignature: false,
      selectedHosoIndices: sortedSelectedIndices,
    });
    const suffix =
      sortedSelectedIndices.length === doc.hosoFiles.length
        ? 'All_KhongKySo'
        : `${sortedSelectedIndices.length}HS_KhongKySo`;
    triggerDownloadXml(unsignedXml, suffix);
  };

  // Xuất XML KHÔNG MÃ HÓA Base64 (hiển thị đầy đủ rõ ràng toàn bộ các thẻ XML1..XML15 và thông tin trong XML)
  const handleExportUnencodedXml = (singleHosoIdx?: number) => {
    if (!doc) return;
    if (typeof singleHosoIdx === 'number') {
      const st = doc.hosoSignStates[singleHosoIdx];
      const rowXml1 = doc.tables.XML1.find(r => r.hosoIndex === singleHosoIdx);
      const maLk = rowXml1?.fields.MA_LK || `HS${singleHosoIdx + 1}`;
      const unencodedSingle = buildXml3176(doc, {
        includeSignature: Boolean(st?.isSigned && !st?.isModified),
        customChuKyDonViXml: st?.rawChuKyDonViXml,
        selectedHosoIndices: [singleHosoIdx],
        encodeBase64: false,
      });
      triggerDownloadXml(unencodedSingle, `${maLk}_KhongMaHoa_ChiTiet`);
      return;
    }

    if (selectedHosoIndices.size === 0) {
      alert('Vui lòng tích chọn ít nhất 1 hồ sơ ở Bảng 1 để xuất XML không mã hóa!');
      return;
    }

    const unencodedXml = buildXml3176(doc, {
      includeSignature: doc.signature.isSigned,
      customChuKyDonViXml: doc.signature.rawChuKyDonViXml,
      selectedHosoIndices: sortedSelectedIndices,
      encodeBase64: false,
    });
    const suffix =
      sortedSelectedIndices.length === doc.hosoFiles.length
        ? 'All_KhongMaHoa_ChiTiet'
        : `${sortedSelectedIndices.length}HS_KhongMaHoa_ChiTiet`;
    triggerDownloadXml(unencodedXml, suffix);
  };

  // Xuất XML Có ký số (cho các hồ sơ đã tích chọn ở Bảng 1, với nội dung đã sửa mới nhất)
  const handleExportSignedXml = (singleHosoIdx?: number) => {
    if (!doc) return;
    if (typeof singleHosoIdx === 'number') {
      const st = doc.hosoSignStates[singleHosoIdx];
      const rowXml1 = doc.tables.XML1.find(r => r.hosoIndex === singleHosoIdx);
      const maLk = rowXml1?.fields.MA_LK || `HS${singleHosoIdx + 1}`;
      if (st?.isSigned && !st.isModified && (st.signedXmlContent || st.rawChuKyDonViXml)) {
        const signedSingle =
          st.signedXmlContent ||
          buildXml3176(doc, {
            includeSignature: true,
            customChuKyDonViXml: st.rawChuKyDonViXml,
            selectedHosoIndices: [singleHosoIdx],
          });
        triggerDownloadXml(signedSingle, `${maLk}_DaKySo`);
        return;
      }
      // Nếu hồ sơ này chưa ký hoặc vừa sửa nội dung -> mở hộp thoại ký riêng hồ sơ này rồi tự tải về
      setAutoDownloadAfterSign(true);
      openSignModal(singleHosoIdx);
      return;
    }

    if (selectedHosoIndices.size === 0) {
      alert('Vui lòng tích chọn ít nhất 1 hồ sơ ở Bảng 1 để xuất XML có ký số!');
      return;
    }

    const selectedKey = sortedSelectedIndices.join(',');
    const allSelectedAreSigned = sortedSelectedIndices.every(
      idx => doc.hosoSignStates[idx]?.isSigned && !doc.hosoSignStates[idx]?.isModified
    );

    // Nếu chỉ tích chọn 1 hồ sơ và hồ sơ đó đã ký riêng
    if (sortedSelectedIndices.length === 1) {
      const onlyIdx = sortedSelectedIndices[0];
      const st = doc.hosoSignStates[onlyIdx];
      if (st?.isSigned && !st.isModified && (st.signedXmlContent || st.rawChuKyDonViXml)) {
        const rowXml1 = doc.tables.XML1.find(r => r.hosoIndex === onlyIdx);
        const maLk = rowXml1?.fields.MA_LK || `HS${onlyIdx + 1}`;
        const xmlOut =
          st.signedXmlContent ||
          buildXml3176(doc, {
            includeSignature: true,
            customChuKyDonViXml: st.rawChuKyDonViXml,
            selectedHosoIndices: [onlyIdx],
          });
        triggerDownloadXml(xmlOut, `${maLk}_DaKySo`);
        return;
      }
    }

    // Nếu gói đang chọn trùng khớp với gói đã ký số và không có hồ sơ nào bị sửa sau khi ký
    if (doc.signature.isSigned && doc.signature.signedHosoKey === selectedKey && allSelectedAreSigned) {
      const signedXml = buildXml3176(doc, {
        includeSignature: true,
        customChuKyDonViXml: doc.signature.rawChuKyDonViXml,
        selectedHosoIndices: sortedSelectedIndices,
      });
      const suffix =
        sortedSelectedIndices.length === doc.hosoFiles.length
          ? 'All_DaKySo'
          : `${sortedSelectedIndices.length}HS_DaKySo`;
      triggerDownloadXml(signedXml, suffix);
      return;
    }

    // Nếu có hồ sơ chưa ký hoặc vừa chỉnh sửa nội dung -> Mở hộp thoại ký số trên đúng nội dung đã sửa và tự tải về
    setAutoDownloadAfterSign(true);
    openSignModal('SELECTED');
  };

  // Xuất tất cả các bảng ra file Excel (.xlsx) theo các hồ sơ đã chọn
  const handleExportExcel = () => {
    if (!doc) return;
    const wb = XLSX.utils.book_new();
    const filterSet = selectedHosoIndices.size > 0 ? selectedHosoIndices : null;

    if (doc.errors.length > 0) {
      const errData = doc.errors
        .filter(e => !filterSet || filterSet.has(e.hosoIndex))
        .map((e, i) => ({
          STT: i + 1,
          MUC_DO: e.severity === 'error' ? 'Lỗi bắt buộc' : 'Cảnh báo',
          BANG: e.tableId,
          MA_LK: e.maLk,
          HO_TEN: e.hoTen,
          TRUONG_LOI: e.field,
          MO_TA_LOI: e.message,
        }));
      if (errData.length > 0) {
        const wsErr = XLSX.utils.json_to_sheet(errData);
        XLSX.utils.book_append_sheet(wb, wsErr, 'Bang_Loi');
      }
    }

    for (const meta of XML3176_TABLES) {
      const rows = (doc.tables[meta.id] || []).filter(r => !filterSet || filterSet.has(r.hosoIndex));
      if (rows.length === 0) continue;
      const sheetRows = rows.map(r => {
        const obj: Record<string, string> = {};
        if (meta.id === 'XML1') {
          const st = doc.hosoSignStates[r.hosoIndex];
          obj['TRANG_THAI_KY_SO'] = st?.isSigned && !st.isModified ? 'Đã ký số' : 'Chưa ký số';
        }
        for (const k of doc.tableColumns[meta.id]) {
          obj[k] = r.fields[k] ?? '';
        }
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(wb, ws, meta.id);
    }

    const baseName = (doc.fileName || 'HOSO_3176').replace(/\.xml$/i, '');
    XLSX.writeFile(wb, `${baseName}_3176_15Bang.xlsx`);
  };

  // Mở modal ký số
  const openSignModal = async (scope: 'SELECTED' | 'ALL' | number = 'SELECTED') => {
    setSignTargetScope(scope);
    if (typeof scope === 'number') {
      setSignPackageMode('INDIVIDUAL');
    } else {
      setSignPackageMode('COMBINED');
    }
    const latestCfg = getSmartCAConfig();
    setSmartCaCfg(latestCfg);
    setSignStatusMsg(null);
    setShowSignModal(true);

    setIsCheckingToken(true);
    try {
      const st = await checkLocalTokenSigner(true);
      setLocalSigner(st);
      if (st.certificates.length > 0 && !selectedTokenSerial) {
        setSelectedTokenSerial(st.unlockedCert?.serial || st.certificates[0].serial);
      }
    } catch {
      setLocalSigner(null);
    } finally {
      setIsCheckingToken(false);
    }
  };

  // Mở ứng dụng USB Token & nhập mật khẩu để lấy thông tin CKS từ USB Token
  const handleUnlockUsbToken3176 = async () => {
    setIsUnlockingToken(true);
    setSignStatusMsg(null);
    try {
      const cert = await unlockAndFetchTokenCertificate(
        selectedTokenSerial || undefined,
        undefined,
        msg => setSignStatusMsg({ ok: true, text: msg })
      );
      setSelectedTokenSerial(cert.serial);
      const updated = await checkLocalTokenSigner(false);
      setLocalSigner(updated);
      setSignStatusMsg({
        ok: true,
        text: `Đã xác thực mật khẩu & lấy thông tin CKS từ ${cert.tokenBrand}: ${cert.commonName} (Serial: ${cert.serial})`,
      });
    } catch (e: any) {
      setSignStatusMsg({
        ok: false,
        text: e?.message || 'Không thể mở khóa và lấy thông tin CKS từ USB Token.',
      });
    } finally {
      setIsUnlockingToken(false);
    }
  };

  // Hàm ký 1 chuỗi XML <GIAMDINHHS> bằng phương thức đã chọn
  const signSingleGiamDinhXml = async (unsignedXml: string, label: string): Promise<string> => {
    if (signMethod === 'USB_TOKEN') {
      const tokenRes = await signXmlWithUsbToken(
        unsignedXml,
        msg => {
          setSignStatusMsg({ ok: true, text: msg });
        },
        undefined,
        selectedTokenSerial || undefined
      );
      const updated = await checkLocalTokenSigner(false);
      setLocalSigner(updated);
      return tokenRes.signedXml;
    } else {
      const cfg = getSmartCAConfig();
      if (!cfg.clientId || !cfg.clientSecret || !cfg.userId) {
        throw new Error('Chưa có thông tin tài khoản VNPT SmartCA. Vui lòng bấm "Cấu hình CKS / SmartCA" để nhập!');
      }
      setSignStatusMsg({ ok: true, text: `[${label}] 🔐 Đang kiểm tra / lấy Chứng thư số VNPT SmartCA...` });
      const certInfo = await getSmartCaCertificate(cfg);
      const updatedCfg = getSmartCAConfig();
      setSmartCaCfg(updatedCfg);

      const effectiveCfg: SmartCAConfig = {
        ...updatedCfg,
        serialNumber: certInfo.serialNumber || updatedCfg.serialNumber,
        signMode: signMethod === 'SMARTCA_APP' ? 'APP' : 'TOTP',
      };

      const { hashToSign, buildSignedXml } = await prepareXmlForSigning(unsignedXml, certInfo);

      const signatureBase64 = await signSmartCAHash(effectiveCfg, hashToSign, msg => {
        setSignStatusMsg({ ok: true, text: `[${label}] ${msg}` });
      });

      return buildSignedXml(signatureBase64);
    }
  };

  // Thực hiện ký số XML 3176 (cho từng hồ sơ, các hồ sơ đã chọn, hoặc tất cả)
  const executeSignXml3176 = async () => {
    if (!doc) return;
    const indicesToSign = getTargetHosoIndices(signTargetScope);
    if (indicesToSign.length === 0) {
      setSignStatusMsg({ ok: false, text: 'Chưa có hồ sơ nào được chọn để ký số!' });
      return;
    }

    setIsSigning(true);
    setSignStatusMsg(null);

    try {
      if (signPackageMode === 'INDIVIDUAL' || indicesToSign.length === 1) {
        // Ký riêng từng hồ sơ trong danh sách chọn
        const nextHosoSignStates = { ...doc.hosoSignStates };
        let lastChuKyBlock = '';
        let lastSignedXml = '';
        let lastSigInfo = doc.signature;

        for (let i = 0; i < indicesToSign.length; i++) {
          const hIdx = indicesToSign[i];
          const rowXml1 = doc.tables.XML1.find(r => r.hosoIndex === hIdx);
          const maLk = rowXml1?.fields.MA_LK || `HS_${hIdx + 1}`;

          if (i > 0 && signMethod !== 'USB_TOKEN') {
            setSignStatusMsg({
              ok: true,
              text: `⏳ Đang nghỉ 1.5s giữa các hồ sơ (${i + 1}/${indicesToSign.length}) để đồng bộ CKS & tránh khóa SmartCA...`,
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          setSignStatusMsg({
            ok: true,
            text: `Đang ký hồ sơ ${i + 1}/${indicesToSign.length} (Mã LK: ${maLk})...`,
          });

          const unsignedSingle = buildXml3176(doc, {
            includeSignature: false,
            selectedHosoIndices: [hIdx],
          });

          const signedXmlFull = await signSingleGiamDinhXml(unsignedSingle, maLk);
          const chuKyMatch = signedXmlFull.match(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/i);
          if (!chuKyMatch) {
            throw new Error(`Không tìm thấy khối <CHUKYDONVI> sau khi ký hồ sơ ${maLk}.`);
          }

          const rawChuKyBlock = chuKyMatch[0];
          const sigValMatch = rawChuKyBlock.match(/<SignatureValue[^>]*>([\s\S]*?)<\/SignatureValue>/i);
          const sigTimeMatch = rawChuKyBlock.match(/<SigningTime[^>]*>([\s\S]*?)<\/SigningTime>/i);
          const subjMatch = rawChuKyBlock.match(/<X509SubjectName[^>]*>([\s\S]*?)<\/X509SubjectName>/i);
          const certMatch = rawChuKyBlock.match(/<X509Certificate[^>]*>([\s\S]*?)<\/X509Certificate>/i);

          const signingTime = sigTimeMatch ? sigTimeMatch[1].trim() : new Date().toISOString();
          const subjectName = subjMatch ? subjMatch[1].trim() : undefined;

          nextHosoSignStates[hIdx] = {
            hosoIndex: hIdx,
            isSigned: true,
            isModified: false,
            signingTime,
            subjectName,
            rawChuKyDonViXml: rawChuKyBlock,
            signedXmlContent: signedXmlFull,
          };

          lastChuKyBlock = rawChuKyBlock;
          lastSignedXml = signedXmlFull;
          lastSigInfo = {
            isSigned: true,
            rawChuKyDonViXml: rawChuKyBlock,
            signatureValue: sigValMatch ? sigValMatch[1].trim() : undefined,
            signingTime,
            subjectName,
            certificateBase64: certMatch ? certMatch[1].trim() : undefined,
            signedHosoKey: String(hIdx),
          };

          if (autoDownloadAfterSign) {
            triggerDownloadXml(signedXmlFull, `${maLk}_DaKySo`);
          }
        }

        const updatedDoc: Xml3176ParsedDoc = {
          ...doc,
          hosoSignStates: nextHosoSignStates,
          signature: indicesToSign.length === 1 ? lastSigInfo : doc.signature,
        };
        setDoc(updatedDoc);
        setAutoDownloadAfterSign(false);
        setSignStatusMsg({
          ok: true,
          text: `Đã ký số thành công ${indicesToSign.length} hồ sơ! Trạng thái ở Bảng 1 đã cập nhật thành "Đã ký số".`,
        });
        void lastChuKyBlock;
        void lastSignedXml;
      } else {
        // Ký gộp 1 gói <GIAMDINHHS> cho tất cả các hồ sơ đã chọn (với nội dung mới nhất đã sửa)
        const unsignedCombined = buildXml3176(doc, {
          includeSignature: false,
          selectedHosoIndices: indicesToSign,
        });

        const signedXmlFull = await signSingleGiamDinhXml(
          unsignedCombined,
          `${indicesToSign.length} hồ sơ`
        );

        const chuKyMatch = signedXmlFull.match(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/i);
        if (!chuKyMatch) {
          throw new Error('Không tìm thấy khối <CHUKYDONVI> sau khi ký số.');
        }

        const rawChuKyBlock = chuKyMatch[0];
        const sigValMatch = rawChuKyBlock.match(/<SignatureValue[^>]*>([\s\S]*?)<\/SignatureValue>/i);
        const sigTimeMatch = rawChuKyBlock.match(/<SigningTime[^>]*>([\s\S]*?)<\/SigningTime>/i);
        const subjMatch = rawChuKyBlock.match(/<X509SubjectName[^>]*>([\s\S]*?)<\/X509SubjectName>/i);
        const certMatch = rawChuKyBlock.match(/<X509Certificate[^>]*>([\s\S]*?)<\/X509Certificate>/i);

        const signingTime = sigTimeMatch ? sigTimeMatch[1].trim() : new Date().toISOString();
        const subjectName = subjMatch ? subjMatch[1].trim() : undefined;

        const nextHosoSignStates = { ...doc.hosoSignStates };
        for (const hIdx of indicesToSign) {
          nextHosoSignStates[hIdx] = {
            hosoIndex: hIdx,
            isSigned: true,
            isModified: false,
            signingTime,
            subjectName,
            rawChuKyDonViXml: rawChuKyBlock,
          };
        }

        const updatedDoc: Xml3176ParsedDoc = {
          ...doc,
          hosoSignStates: nextHosoSignStates,
          signature: {
            isSigned: true,
            rawChuKyDonViXml: rawChuKyBlock,
            signatureValue: sigValMatch ? sigValMatch[1].trim() : undefined,
            signingTime,
            subjectName,
            certificateBase64: certMatch ? certMatch[1].trim() : undefined,
            signedHosoKey: indicesToSign.join(','),
          },
        };

        setDoc(updatedDoc);
        setSignStatusMsg({
          ok: true,
          text: `Đã ký số thành công ${indicesToSign.length} hồ sơ vào đúng thẻ <CHUKYDONVI>!`,
        });

        if (autoDownloadAfterSign) {
          const suffix =
            indicesToSign.length === doc.hosoFiles.length
              ? 'All_DaKySo'
              : `${indicesToSign.length}HS_DaKySo`;
          triggerDownloadXml(signedXmlFull, suffix);
          setAutoDownloadAfterSign(false);
        }
      }
    } catch (err: any) {
      setSignStatusMsg({
        ok: false,
        text: err?.message || 'Lỗi trong quá trình ký số XML 3176.',
      });
    } finally {
      setIsSigning(false);
    }
  };

  const activeTableMeta = useMemo(
    () => XML3176_TABLES.find(t => t.id === activeTab),
    [activeTab]
  );

  const activeColumns = useMemo(() => {
    if (!doc || activeTab === 'ERRORS') return [];
    return doc.tableColumns[activeTab] || [];
  }, [doc, activeTab]);

  return (
    <div className="space-y-4">
      {/* THANH CÔNG CỤ & THÔNG TIN TỔNG QUAN HỒ SƠ 3176 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  ĐỌC, CHỈNH SỬA & KÝ SỐ XML 3176 / 130 (BẢNG 1 → BẢNG 15)
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Không lưu dữ liệu (F5 tự xóa sạch)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tích chọn từng hồ sơ hoặc tất cả ở Bảng 1 • Sửa trực tiếp nội dung XML • Ký số SmartCA / USB Token • Xuất XML theo đúng nội dung đã sửa
              </p>
            </div>
          </div>

          {/* CÁC NÚT TÁC VỤ CHÍNH */}
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {isLoading ? 'Đang đọc XML...' : 'Mở file XML 3176'}
            </button>

            {doc && (
              <button
                onClick={handleClearLoadedXml}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                title="Xóa toàn bộ dữ liệu XML đang mở khỏi bộ nhớ RAM"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa dữ liệu đang mở
              </button>
            )}

            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer"
              title="Cấu hình chung VNPT SmartCA & USB Token từ hệ thống"
            >
              <Settings className="w-3.5 h-3.5" />
              Cấu hình CKS / SmartCA
            </button>

            <button
              onClick={() => {
                setAutoDownloadAfterSign(false);
                openSignModal('SELECTED');
              }}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Ký số ({selectedHosoIndices.size} HS đã chọn)
            </button>

            <button
              onClick={() => {
                setAutoDownloadAfterSign(false);
                openSignModal('ALL');
              }}
              disabled={!doc}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 disabled:opacity-50 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Ký tất cả ({doc ? doc.hosoFiles.length : 0} HS)
            </button>

            <button
              onClick={() => handleExportUnsignedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 disabled:opacity-50 text-[11px] font-bold transition-colors cursor-pointer"
              title="Xuất file XML chuẩn không có chữ ký số (<CHUKYDONVI />) cho các hồ sơ đã tích chọn với nội dung đã sửa"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất XML Không ký ({selectedHosoIndices.size} HS)
            </button>

            <button
              onClick={() => handleExportSignedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
              title="Xuất file XML chuẩn đã nhúng chữ ký số trong thẻ <CHUKYDONVI> cho các hồ sơ đã tích chọn với nội dung đã sửa"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất XML Có ký số ({selectedHosoIndices.size} HS)
            </button>

            <button
              onClick={() => handleExportUnencodedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
              title="Xuất file XML KHÔNG MÃ HÓA Base64 — Hiển thị đầy đủ rõ ràng toàn bộ các thẻ XML1..XML15 và dữ liệu bên trong"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Xuất XML Không mã hóa ({selectedHosoIndices.size} HS)
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!doc}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất Excel
            </button>

            <button
              onClick={() => {
                setPreviewMode('OUTER_UNENCODED');
                setShowXmlPreviewModal(true);
              }}
              disabled={!doc}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Xem XML
            </button>
          </div>
        </div>

        {/* NẾU CHƯA TẢI FILE XML: HIỂN THỊ KHUNG CHỌN FILE (KHÔNG LƯU SẴN FILE MẪU) */}
        {!doc ? (
          <div className="py-14 px-4 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="max-w-xl mx-auto border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-8 transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Bấm vào đây để chọn file XML theo chuẩn 3176 / 130 (.xml)
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Hệ thống sẽ tự động giải mã Base64 và tách riêng từng bảng (Bảng lỗi, Bảng 1 → Bảng 15) để bạn kiểm tra, chỉnh sửa nội dung, tích chọn ký số từng hồ sơ hoặc tất cả và xuất XML chuẩn.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Bảo mật tuyệt đối: Không lưu dữ liệu trên web — Nhấn F5 hoặc tắt trang tự động mất hoàn toàn
              </div>
            </div>
          </div>
        ) : (
          /* THÔNG TIN THẺ <THONGTINDONVI>, <THONGTINHOSO> & TRẠNG THÁI CHỌN / KÝ SỐ */
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-3">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                File đang mở / Mã CSKCB
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={doc.maCskcb}
                  onChange={e =>
                    setDoc({
                      ...doc,
                      maCskcb: e.target.value,
                      signature: { ...doc.signature, isSigned: false },
                    })
                  }
                  className="w-24 px-2 py-1 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Chỉnh sửa thẻ <MACSKCB>"
                />
                <span className="text-xs font-semibold text-slate-700 truncate" title={doc.fileName}>
                  {doc.fileName}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Ngày lập (&lt;NGAYLAP&gt;) & Đã chọn
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={doc.ngayLap}
                  onChange={e =>
                    setDoc({
                      ...doc,
                      ngayLap: e.target.value,
                      signature: { ...doc.signature, isSigned: false },
                    })
                  }
                  className="w-24 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Chỉnh sửa thẻ <NGAYLAP> (YYYYMMDD)"
                />
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                  Chọn {selectedHosoIndices.size}/{doc.hosoFiles.length} HS
                </span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Tổng chi BV ({costSummary.count} HS đang chọn)
              </label>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {costSummary.tongChiBv.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-500">
                Thuốc: {costSummary.thuoc.toLocaleString('vi-VN')} • VTYT: {costSummary.vtyt.toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Quỹ BHYT TT ({costSummary.count} HS đang chọn)
              </label>
              <div className="text-sm font-extrabold text-emerald-700 mt-1">
                {costSummary.bhtt.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-500">
                Cùng chi trả / Tự trả: {costSummary.bntt.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl p-2.5 border flex items-center justify-between gap-2 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-indigo-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Trạng thái Ký số:
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã ký: {signStats.signedCount} HS
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Chưa ký: {signStats.unsignedCount} HS
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-1">
                  {signStats.modifiedCount > 0
                    ? `Có ${signStats.modifiedCount} hồ sơ đã sửa nội dung XML — Khi xuất XML sẽ lấy đúng nội dung đã sửa!`
                    : doc.signature.subjectName
                    ? `Chứng thư số: ${doc.signature.subjectName}`
                    : 'Tích chọn hồ sơ ở Bảng 1 để Ký số từng HS hoặc Tất cả và Xuất XML.'}
                </p>
              </div>
              {doc.signature.isSigned && (
                <button
                  onClick={() => {
                    setPreviewMode('SIGNATURE_ONLY');
                    setShowXmlPreviewModal(true);
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer"
                >
                  Xem CKS
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* THANH TAB: BẢNG LỖI | BẢNG 1 -> BẢNG 15 */}
      {doc && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 border-b border-slate-300 px-2 pt-2 flex items-end gap-1 overflow-x-auto no-scrollbar">
            {/* Tab Bảng lỗi */}
            <button
              onClick={() => {
                setActiveTab('ERRORS');
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ERRORS'
                  ? 'bg-white text-red-700 border-slate-300 -mb-px pb-2.5 shadow-sm'
                  : 'bg-slate-200/70 text-slate-700 border-transparent hover:bg-slate-200'
              }`}
            >
              <span>Bảng lỗi</span>
              {doc.errors.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-extrabold">
                  {doc.errors.length}
                </span>
              )}
            </button>

            {/* Các tab Bảng 1 -> Bảng 15 */}
            {XML3176_TABLES.map(t => {
              const count = doc.tables[t.id].length;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTab(t.id);
                    setCurrentPage(1);
                  }}
                  title={t.fullTitle}
                  className={`px-3 py-2 text-xs font-bold rounded-t-lg border-t border-x transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-blue-700 border-slate-300 -mb-px pb-2.5 shadow-sm'
                      : count > 0
                      ? 'bg-slate-50 text-slate-800 border-slate-200/80 hover:bg-white'
                      : 'bg-slate-200/50 text-slate-400 border-transparent hover:bg-slate-200/80 hover:text-slate-600'
                  }`}
                >
                  <span>{t.tabLabel}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* THANH LỌC THEO BỆNH NHÂN (HOSO), TÍCH CHỌN NHANH, TÌM KIẾM & THÊM DÒNG */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {activeTab === 'ERRORS'
                  ? `Danh sách kiểm tra logic & cảnh báo (${filteredErrors.length} mục)`
                  : `${activeTableMeta?.fullTitle} (${currentTableRows.length} dòng)`}
              </span>

              {activeTab === 'XML1' && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() => {
                      const all = new Set<number>();
                      for (let i = 0; i < doc.hosoFiles.length; i++) all.add(i);
                      setSelectedHosoIndices(all);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer"
                  >
                    Chọn tất cả ({doc.hosoFiles.length})
                  </button>
                  <button
                    onClick={() => setSelectedHosoIndices(new Set())}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bộ lọc theo từng HOSO bệnh nhân */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedHosoFilter}
                  onChange={e => {
                    setSelectedHosoFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none max-w-[240px]"
                >
                  <option value="ALL">Tất cả hồ sơ ({hosoOptions.length} bệnh nhân)</option>
                  {hosoOptions.map(h => (
                    <option key={h.hosoIndex} value={String(h.hosoIndex)}>
                      #{h.hosoIndex + 1} - {h.maLk} - {h.hoTen}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm MA_LK, Họ tên, Mã thuốc, DVKT..."
                  className="pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeTab !== 'ERRORS' && (
                <button
                  onClick={handleAddRowToActiveTable}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm dòng {activeTableMeta?.tabLabel}
                </button>
              )}
            </div>
          </div>

          {/* NỘI DUNG BẢNG LỖI HOẶC BẢNG 1..15 */}
          {activeTab === 'ERRORS' ? (
            <div className="overflow-x-auto max-h-[65vh]">
              {filteredErrors.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    Không phát hiện lỗi cấu trúc hoặc sai lệch chi phí trong các bảng XML!
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Tất cả các trường bắt buộc và tổng chi phí Bảng 1 ↔ Bảng 2, Bảng 3 đều khớp.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-12">STT</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-28">Mức độ</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-24">Bảng</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-28">Mã LK</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-44">Họ và tên</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left w-36">Trường XML</th>
                      <th className="border-b border-r border-slate-200 px-3 py-2 text-left">Nội dung kiểm tra / Cảnh báo</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-center w-28">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredErrors.map((err, idx) => (
                      <tr key={err.id} className="hover:bg-slate-50">
                        <td className="border-r border-slate-200 px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                        <td className="border-r border-slate-200 px-3 py-2">
                          {err.severity === 'error' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              Lỗi bắt buộc
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Cảnh báo
                            </span>
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-2 font-bold text-blue-700">{err.tableId}</td>
                        <td className="border-r border-slate-200 px-3 py-2 font-mono font-semibold">{err.maLk}</td>
                        <td className="border-r border-slate-200 px-3 py-2 font-semibold text-slate-800">{err.hoTen}</td>
                        <td className="border-r border-slate-200 px-3 py-2 font-mono text-indigo-700 font-semibold">{err.field}</td>
                        <td className="border-r border-slate-200 px-3 py-2 text-slate-700">{err.message}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              setActiveTab(err.tableId);
                              setSelectedHosoFilter(String(err.hosoIndex));
                              const targetRow = doc.tables[err.tableId].find(r => r.rowId === err.rowId);
                              if (targetRow) openEditRowModal(targetRow);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] cursor-pointer"
                          >
                            Đi tới & Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* BẢNG DỮ LIỆU CHI TIẾT CHO BẢNG 1 -> BẢNG 15 */
            <div className="overflow-x-auto max-h-[65vh]">
              {currentTableRows.length === 0 ? (
                <div className="p-12 text-center">
                  <FileCode2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Không có dữ liệu trong {activeTableMeta?.fullTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    File XML hiện tại không phát sinh hồ sơ ở bảng này hoặc đang bị giới hạn bởi bộ lọc. Bạn có thể bấm <b>"Thêm dòng {activeTableMeta?.tabLabel}"</b> nếu muốn bổ sung.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-xs">
                    <tr>
                      {/* Cột Tích chọn ở Bảng 1 */}
                      {activeTab === 'XML1' && (
                        <th className="border-b border-r border-slate-300 px-2.5 py-2 text-center w-10 sticky left-0 bg-slate-100 z-20">
                          <input
                            type="checkbox"
                            checked={
                              currentTableRows.length > 0 &&
                              currentTableRows.every(r => selectedHosoIndices.has(r.hosoIndex))
                            }
                            onChange={toggleSelectAllFilteredXml1}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            title="Tích chọn / Bỏ chọn tất cả hồ sơ đang hiển thị để Ký số & Xuất XML"
                          />
                        </th>
                      )}

                      {/* Cột Trạng thái ký số ở Bảng 1 */}
                      {activeTab === 'XML1' && (
                        <th className="border-b border-r border-slate-300 px-2.5 py-2 text-center min-w-[145px] bg-slate-100">
                          <div className="font-bold text-slate-900">TRẠNG THÁI KÝ SỐ</div>
                          <div className="text-[10px] font-normal text-slate-500">Đã ký / Chưa ký</div>
                        </th>
                      )}

                      <th
                        className={`border-b border-r border-slate-300 px-2.5 py-2 text-center min-w-[155px] bg-slate-100 ${
                          activeTab !== 'XML1' ? 'sticky left-0 z-20' : ''
                        }`}
                      >
                        Thao tác
                      </th>

                      <th className="border-b border-r border-slate-300 px-2.5 py-2 text-center w-14 bg-slate-100">
                        Hồ sơ
                      </th>

                      {activeTab !== 'XML1' && (
                        <th className="border-b border-r border-slate-300 px-3 py-2 text-left min-w-[160px] bg-blue-50/60">
                          <div className="font-bold text-blue-900">HỌ TÊN BN (XML1)</div>
                          <div className="text-[10px] font-normal text-blue-600">Liên kết theo MA_LK</div>
                        </th>
                      )}

                      {activeColumns.map(col => (
                        <th
                          key={col}
                          className="border-b border-r border-slate-300 px-2.5 py-2 text-left min-w-[135px] whitespace-nowrap"
                        >
                          <div className="font-mono font-bold text-slate-900">{col}</div>
                          <div
                            className="text-[10px] font-normal text-slate-500 truncate max-w-[180px]"
                            title={FIELD_LABELS_3176[col] || col}
                          >
                            {FIELD_LABELS_3176[col] || col}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pagedRows.map(row => {
                      const isRowSelected = selectedHosoIndices.has(row.hosoIndex);
                      const signState = doc.hosoSignStates[row.hosoIndex];
                      const isSigned = signState?.isSigned && !signState?.isModified;
                      const isModified = signState?.isModified;

                      return (
                        <tr
                          key={row.rowId}
                          className={`hover:bg-blue-50/40 group ${
                            activeTab === 'XML1' && isRowSelected ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          {/* Ô Checkbox chọn Hồ sơ ở Bảng 1 */}
                          {activeTab === 'XML1' && (
                            <td className="border-r border-slate-200 px-2.5 py-1.5 text-center sticky left-0 bg-white group-hover:bg-blue-50/90 z-10">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => toggleSelectHoso(row.hosoIndex)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>
                          )}

                          {/* Ô Trạng thái ký số ở Bảng 1 */}
                          {activeTab === 'XML1' && (
                            <td className="border-r border-slate-200 px-2.5 py-1.5 text-center whitespace-nowrap">
                              {isSigned ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  title={
                                    signState?.subjectName
                                      ? `Đã ký bởi: ${signState.subjectName} (${signState.signingTime || ''})`
                                      : 'Hồ sơ đã có chữ ký số hợp lệ'
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Đã ký số
                                </span>
                              ) : isModified ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300"
                                  title="Nội dung hồ sơ đã được chỉnh sửa, cần ký số lại nếu xuất XML có ký số"
                                >
                                  <Edit3 className="w-3 h-3 text-blue-600" />
                                  Đã sửa (Chưa ký)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Chưa ký số
                                </span>
                              )}
                            </td>
                          )}

                          {/* Ô Thao tác: Ký lẻ HS, Sửa chi tiết, Xuất lẻ HS, Xóa */}
                          <td
                            className={`border-r border-slate-200 px-2 py-1.5 text-center bg-white group-hover:bg-blue-50/90 ${
                              activeTab !== 'XML1' ? 'sticky left-0 z-10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {activeTab === 'XML1' && (
                                <button
                                  onClick={() => {
                                    setAutoDownloadAfterSign(false);
                                    openSignModal(row.hosoIndex);
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Ký số riêng cho hồ sơ này"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Ký
                                </button>
                              )}
                              <button
                                onClick={() => openEditRowModal(row)}
                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Mở cửa sổ sửa toàn bộ các trường của dòng này"
                              >
                                <Edit3 className="w-3 h-3" />
                                Sửa
                              </button>
                              {activeTab === 'XML1' && (
                                <>
                                  <button
                                    onClick={() =>
                                      isSigned
                                        ? handleExportSignedXml(row.hosoIndex)
                                        : handleExportUnsignedXml(row.hosoIndex)
                                    }
                                    className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                                    title={
                                      isSigned
                                        ? 'Tải file XML chuẩn (Base64) Đã ký số của riêng hồ sơ này (theo nội dung đã sửa)'
                                        : 'Tải file XML chuẩn (Base64) Không ký số của riêng hồ sơ này (theo nội dung đã sửa)'
                                    }
                                  >
                                    <Download className="w-3 h-3" />
                                    XML
                                  </button>
                                  <button
                                    onClick={() => handleExportUnencodedXml(row.hosoIndex)}
                                    className="px-1.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                                    title="Tải file XML Không mã hóa (hiển thị đầy đủ rõ ràng các thông tin trong XML) của riêng hồ sơ này"
                                  >
                                    <FileCode2 className="w-3 h-3" />
                                    Rõ
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteRow(row)}
                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="border-r border-slate-200 px-2 py-1.5 text-center font-mono text-[11px] text-slate-500">
                            #{row.hosoIndex + 1}
                          </td>

                          {activeTab !== 'XML1' && (
                            <td className="border-r border-slate-200 px-2.5 py-1.5 font-semibold text-blue-900 bg-blue-50/20 whitespace-nowrap">
                              {row.hoTen || '—'}
                            </td>
                          )}

                          {activeColumns.map(col => {
                            const val = row.fields[col] ?? '';
                            return (
                              <td key={col} className="border-r border-slate-200 p-0">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={e => handleInlineFieldChange(row, col, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 font-medium text-slate-800"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* PHÂN TRANG */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Đang hiển thị trang <b>{currentPage}</b> / <b>{totalPages}</b> (Tổng số:{' '}
              <b>{activeTab === 'ERRORS' ? filteredErrors.length : currentTableRows.length}</b> dòng • Đã tích chọn:{' '}
              <b className="text-blue-700">{selectedHosoIndices.size}</b> hồ sơ)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Trang trước
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA CHI TIẾT DÒNG */}
      {editingRow && doc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Chỉnh sửa chi tiết {editingRow.tableId} — Hồ sơ #{editingRow.hosoIndex + 1} ({editingRow.hoTen || editingRow.maLk})
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  Mọi thay đổi sẽ tự động cập nhật lại nội dung XML con và mã hóa chuẩn Base64 UTF-8 vào thẻ &lt;NOIDUNGFILE&gt; khi xuất XML
                </p>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(editingFieldsDraft).map(tag => {
                  const isCdata = editingRow.cdataTags.includes(tag);
                  return (
                    <div key={tag} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-700">&lt;{tag}&gt;</span>
                        {isCdata && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                            CDATA
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mb-1.5 truncate" title={FIELD_LABELS_3176[tag] || tag}>
                        {FIELD_LABELS_3176[tag] || 'Chỉ tiêu XML 3176'}
                      </div>
                      <input
                        type="text"
                        value={editingFieldsDraft[tag] ?? ''}
                        onChange={e =>
                          setEditingFieldsDraft(prev => ({
                            ...prev,
                            [tag]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-blue-800 mb-1">
                    Thêm thẻ XML mới (nếu cần)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: DU_PHONG"
                    value={newFieldTagName}
                    onChange={e => setNewFieldTagName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    className="px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg font-mono w-44"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase text-blue-800 mb-1">
                    Giá trị
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập giá trị thẻ..."
                    value={newFieldValue}
                    onChange={e => setNewFieldValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newFieldTagName) return;
                    setEditingFieldsDraft(prev => ({
                      ...prev,
                      [newFieldTagName]: newFieldValue,
                    }));
                    setNewFieldTagName('');
                    setNewFieldValue('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  + Thêm trường
                </button>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={saveEditRowModal}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Lưu thay đổi vào XML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KÝ SỐ XML 3176 (CHO TỪNG HỒ SƠ, CÁC HỒ SƠ ĐÃ TÍCH CHỌN, HOẶC TẤT CẢ) */}
      {showSignModal && doc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <h3 className="text-base font-bold">
                    Ký Số Hồ Sơ XML 3176 (Chuẩn &lt;GIAMDINHHS&gt; — &lt;CHUKYDONVI&gt;)
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Ký trên nội dung XML mới nhất đã được chỉnh sửa • Dùng chung cấu hình SmartCA / USB Token
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Chọn phạm vi hồ sơ ký */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-500">
                  1. Phạm vi hồ sơ cần ký số
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSignTargetScope('SELECTED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      signTargetScope === 'SELECTED'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Các hồ sơ đã tích chọn ({selectedHosoIndices.size} HS)
                  </button>
                  <button
                    onClick={() => setSignTargetScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      signTargetScope === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Tất cả hồ sơ ({doc.hosoFiles.length} HS)
                  </button>
                  {typeof signTargetScope === 'number' && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white">
                      Ký riêng Hồ sơ #{signTargetScope + 1} (
                      {doc.tables.XML1.find(r => r.hosoIndex === signTargetScope)?.fields.MA_LK || ''})
                    </span>
                  )}
                </div>

                {typeof signTargetScope !== 'number' && getTargetHosoIndices(signTargetScope).length > 1 && (
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-600">Kiểu đóng gói chữ ký:</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="pkgMode"
                        checked={signPackageMode === 'COMBINED'}
                        onChange={() => setSignPackageMode('COMBINED')}
                        className="accent-emerald-600"
                      />
                      Ký gộp chung 1 file XML ({getTargetHosoIndices(signTargetScope).length} HS chung 1 thẻ &lt;CHUKYDONVI&gt;)
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="pkgMode"
                        checked={signPackageMode === 'INDIVIDUAL'}
                        onChange={() => setSignPackageMode('INDIVIDUAL')}
                        className="accent-emerald-600"
                      />
                      Ký tách riêng từng hồ sơ
                    </label>
                  </div>
                )}
              </div>

              {/* Chọn phương thức ký số */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                  2. Chọn phương thức ký số
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setSignMethod('SMARTCA_TOTP')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      signMethod === 'SMARTCA_TOTP'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      VNPT SmartCA (TOTP v2)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ký tự động bằng Password + Khóa Secret/OTP
                    </p>
                  </button>

                  <button
                    onClick={() => setSignMethod('SMARTCA_APP')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      signMethod === 'SMARTCA_APP'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      VNPT SmartCA (App v1)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Xác nhận ký trên ứng dụng VNPT SmartCA điện thoại
                    </p>
                  </button>

                  <button
                    onClick={() => setSignMethod('USB_TOKEN')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      signMethod === 'USB_TOKEN'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Usb className="w-4 h-4 text-indigo-600" />
                      USB Token (Tích hợp Chay_Ky_So_USB_Token)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nhận diện mọi dòng Token (Viettel, VNPT, Bkav, FPT...) → Mở phần mềm Token → Nhập MK lấy CKS & Ký
                    </p>
                  </button>
                </div>
              </div>

              {/* Thông tin cấu hình hiện tại */}
              {signMethod === 'USB_TOKEN' ? (
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          localSigner?.unlocked
                            ? 'bg-emerald-500 animate-pulse'
                            : localSigner?.hasToken
                            ? 'bg-blue-600 animate-pulse'
                            : 'bg-amber-500'
                        }`}
                      />
                      {localSigner?.unlocked
                        ? `Đã mở khóa & lấy CKS từ ${localSigner.unlockedCert?.tokenBrand || 'USB Token'}`
                        : localSigner?.hasToken
                        ? `Đã nhận diện thiết bị: ${localSigner.detectedBrands.join(', ')}`
                        : localSigner?.available
                        ? 'Công cụ Chay_Ky_So_USB_Token đang chạy — Vui lòng cắm USB Token vào máy'
                        : 'Tích hợp Chay_Ky_So_USB_Token (Tự động nhận diện Viettel, VNPT, Bkav, FPT, EasyCA, NewCA...)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSignModal(signTargetScope)}
                        disabled={isCheckingToken}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCheckingToken ? 'animate-spin' : ''}`} />
                        Quét USB Token
                      </button>
                      {!localSigner?.available && (
                        <a
                          href="/Chay_Ky_So_USB_Token.bat"
                          download="Chay_Ky_So_USB_Token.bat"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                          title="Chạy 1 lần duy nhất để tự động tích hợp vào Windows và nhận diện mọi loại USB Token"
                        >
                          <Download className="w-3 h-3" />
                          Kích hoạt Chay_Ky_So_USB_Token.bat
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Chọn USB Token nếu cắm nhiều Token */}
                  {localSigner && localSigner.certificates.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chọn thiết bị USB Token cần sử dụng ({localSigner.certificates.length} Token đang cắm):
                      </label>
                      <select
                        value={selectedTokenSerial}
                        onChange={e => setSelectedTokenSerial(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {localSigner.certificates.map(c => (
                          <option key={c.serial} value={c.serial}>
                            [{c.tokenBrand}] {c.verifiedWithPin ? `${c.commonName} - Serial: ${c.serial}` : `Thiết bị Serial: ${c.serial} (${c.providerName})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Hiển thị thông tin CKS của USB Token sau khi đã mở ứng dụng & nhập mật khẩu */}
                  {localSigner?.unlocked && localSigner.unlockedCert ? (
                    <div className="text-xs text-slate-700 bg-emerald-50/90 border border-emerald-300 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Thông tin Chứng thư số (Lấy trực tiếp từ {localSigner.unlockedCert.tokenBrand}):
                        </span>
                        <button
                          type="button"
                          onClick={handleUnlockUsbToken3176}
                          disabled={isUnlockingToken}
                          className="px-2 py-0.5 rounded bg-white border border-emerald-300 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          Đổi Token / Nhập lại MK
                        </button>
                      </div>
                      <div>
                        • <b>Đơn vị / Chủ CKS:</b>{' '}
                        <span className="font-bold text-slate-900">{localSigner.unlockedCert.commonName}</span>
                        {localSigner.unlockedCert.mst && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                            MST: {localSigner.unlockedCert.mst}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 break-all">
                        • <b>Subject:</b> {localSigner.unlockedCert.subject}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                        <span>
                          • <b>Serial Token:</b>{' '}
                          <span className="font-mono font-bold text-indigo-700">{localSigner.unlockedCert.serial}</span>
                        </span>
                        {localSigner.unlockedCert.issuerName && (
                          <span>
                            • <b>Nhà cung cấp:</b>{' '}
                            <span className="font-semibold text-slate-800">{localSigner.unlockedCert.issuerName}</span>
                          </span>
                        )}
                        {localSigner.unlockedCert.notAfter && (
                          <span>
                            • <b>Hạn CKS:</b>{' '}
                            <span className="font-semibold text-emerald-700">{localSigner.unlockedCert.notAfter}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs bg-white border border-blue-200 rounded-lg p-3 space-y-2.5">
                      <div className="text-slate-700 leading-relaxed">
                        🔌 <b>Cơ chế hoạt động:</b> Khi cắm USB Token vào máy tính, hệ thống tự động nhận diện loại Token (<b>Viettel-CA, VNPT-CA, BKAV-CA, FPT-CA, CA2, EasyCA, NewCA, SmartSign...</b>), mở ứng dụng ký số của Token đó và hiện bảng nhập mật khẩu (PIN) để lấy thông tin Chứng thư số (CKS) từ đúng USB Token đang cắm.
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUnlockUsbToken3176}
                          disabled={isUnlockingToken}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {isUnlockingToken
                            ? 'Đang mở ứng dụng Token & xác thực MK...'
                            : 'Mở ứng dụng Token & Nhập mật khẩu lấy CKS'}
                        </button>
                        <span className="text-[11px] text-slate-500">
                          (Hoặc bấm thẳng <b>"Thực hiện Ký số"</b> bên dưới, hệ thống sẽ tự hiện bảng nhập mật khẩu Token)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Cấu hình VNPT SmartCA hiện tại (Dùng chung toàn phần mềm):
                    </span>
                    <button
                      onClick={() => {
                        setShowSignModal(false);
                        setShowConfigModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Mở Cấu hình SmartCA
                    </button>
                  </div>
                  {smartCaCfg.clientId && smartCaCfg.userId ? (
                    <div className="text-xs text-slate-700 space-y-1">
                      <div>
                        • <b>User ID:</b> <span className="font-mono">{smartCaCfg.userId}</span> •{' '}
                        <b>Serial:</b> <span className="font-mono">{smartCaCfg.serialNumber || 'Tự động lấy'}</span>
                      </div>
                      <div>
                        • <b>Chứng thư số:</b>{' '}
                        {smartCaCfg.certSubject ? (
                          <span className="text-emerald-700 font-semibold">{smartCaCfg.certSubject}</span>
                        ) : (
                          <span className="text-amber-700">Sẽ tự động tải khi bấm Ký số</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                      Bạn chưa nhập Client ID / User ID VNPT SmartCA. Vui lòng bấm <b>"Mở Cấu hình SmartCA"</b> để thiết lập!
                    </div>
                  )}

                  {/* Chỉ khi ký SmartCA mới hiển thị công cụ đổi IP về Việt Nam */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {localSigner?.proxyRunning ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã bật công cụ đổi IP về Việt Nam (Cổng 18088) cho SmartCA
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        🌐 Nếu ký SmartCA trên web bị chặn IP quốc tế, hãy chạy công cụ đổi IP về Việt Nam:
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <a
                        href="/tools/Chay_Ky_So_USB_Token.bat"
                        download="Chay_Ky_So_USB_Token.bat"
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0"
                      >
                        Tải công cụ đổi IP (.bat)
                      </a>
                      <button
                        type="button"
                        onClick={() => openSignModal(signTargetScope)}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
                      >
                        Kiểm tra lại
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {signStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    signStatusMsg.ok
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-700'
                  }`}
                >
                  {signStatusMsg.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{signStatusMsg.text}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={executeSignXml3176}
                  disabled={isSigning}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSigning
                    ? 'Đang thực hiện ký số...'
                    : `Thực hiện Ký số (${getTargetHosoIndices(signTargetScope).length} HS)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC CẤU TRÚC XML / CHỮ KÝ SỐ */}
      {showXmlPreviewModal && doc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">
                  Kiểm tra Cấu trúc XML 3176 (Theo nội dung đã sửa & các hồ sơ đã chọn)
                </h3>
              </div>
              <button
                onClick={() => setShowXmlPreviewModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setPreviewMode('OUTER_UNENCODED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewMode === 'OUTER_UNENCODED' ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  XML Không mã hóa (Hiện đầy đủ thông tin)
                </button>
                <button
                  onClick={() => setPreviewMode('OUTER_UNSIGNED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewMode === 'OUTER_UNSIGNED' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  XML Chuẩn Base64 (Không ký)
                </button>
                <button
                  onClick={() => setPreviewMode('OUTER_SIGNED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewMode === 'OUTER_SIGNED' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  XML Chuẩn Base64 (Có ký số)
                </button>
                <button
                  onClick={() => setPreviewMode('INNER_DECODED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewMode === 'INNER_DECODED' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  Xem riêng từng Hồ sơ (XML1..15)
                </button>
                <button
                  onClick={() => setPreviewMode('SIGNATURE_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewMode === 'SIGNATURE_ONLY' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                  }`}
                >
                  Thẻ &lt;CHUKYDONVI&gt;
                </button>
              </div>

              <div className="flex items-center gap-2">
                {previewMode === 'INNER_DECODED' && (
                  <select
                    value={previewHosoIdx}
                    onChange={e => setPreviewHosoIdx(Number(e.target.value))}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                  >
                    {hosoOptions.map(h => (
                      <option key={h.hosoIndex} value={h.hosoIndex}>
                        Hồ sơ #{h.hosoIndex + 1} - {h.maLk} - {h.hoTen}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => handleExportUnencodedXml()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải XML Không mã hóa (.xml)
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-auto flex-1 leading-relaxed">
              <pre className="whitespace-pre-wrap break-all">
                {previewMode === 'OUTER_UNENCODED' &&
                  buildXml3176(doc, {
                    includeSignature: doc.signature.isSigned,
                    customChuKyDonViXml: doc.signature.rawChuKyDonViXml,
                    selectedHosoIndices: sortedSelectedIndices,
                    encodeBase64: false,
                  })}
                {previewMode === 'OUTER_UNSIGNED' &&
                  (() => {
                    const txt = buildXml3176(doc, {
                      includeSignature: false,
                      selectedHosoIndices: sortedSelectedIndices,
                    });
                    return txt.length > 15000
                      ? txt.slice(0, 12000) +
                          '\n\n... [Đã rút gọn hiển thị Base64 ở giữa để xem nhanh phần cuối file] ...\n\n' +
                          txt.slice(-2500)
                      : txt;
                  })()}
                {previewMode === 'OUTER_SIGNED' &&
                  (() => {
                    const txt = buildXml3176(doc, {
                      includeSignature: true,
                      selectedHosoIndices: sortedSelectedIndices,
                    });
                    return txt.length > 15000
                      ? txt.slice(0, 8000) +
                          '\n\n... [Đã rút gọn hiển thị Base64 ở giữa để xem nhanh phần chữ ký <CHUKYDONVI> cuối file] ...\n\n' +
                          txt.slice(-5000)
                      : txt;
                  })()}
                {previewMode === 'SIGNATURE_ONLY' &&
                  (doc.signature.isSigned
                    ? doc.signature.rawChuKyDonViXml
                    : '<CHUKYDONVI />\n<!-- Hồ sơ hiện tại chưa ký số (hoặc vừa được chỉnh sửa nội dung). Hãy bấm "Ký số" để tạo chữ ký số chuẩn XMLDSig vào vị trí này -->')}
                {previewMode === 'INNER_DECODED' &&
                  (doc.hosoFiles[previewHosoIdx] || [])
                    .map(fNode => {
                      const rows = doc.tables[fNode.loaiHoso].filter(
                        r => r.hosoIndex === fNode.hosoIndex && r.fileHosoIndex === fNode.fileHosoIndex
                      );
                      return `<!-- ==================== ${fNode.loaiHoso} (Hồ sơ #${previewHosoIdx + 1}) ==================== -->\n${buildInnerFileHosoXml(fNode, rows)}`;
                    })
                    .join('\n\n')}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH CHUNG (VNPT SMARTCA / USB TOKEN / ĐƠN VỊ) */}
      {showConfigModal && (
        <ConfigModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSmartCaCfg(getSmartCAConfig());
          }}
        />
      )}
    </div>
  );
}
