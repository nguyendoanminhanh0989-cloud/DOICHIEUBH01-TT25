import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, ShieldCheck, FileCode2, AlertTriangle, CheckCircle2,
  Search, Edit3, Plus, Trash2, Eye, Settings, RefreshCw, FileSpreadsheet,
  KeyRound, Usb, Smartphone, Check, X, Filter, Layers, CheckSquare, Square, Printer, Calculator
} from 'lucide-react';
import {
  XML3176_TABLES,
  FIELD_LABELS_3176,
  Xml3176TableId,
  Xml3176ParsedDoc,
  Xml3176Row,
  parseXml3176,
  mergeXml3176Docs,
  buildXml3176,
  buildInnerFileHosoXml,
  validateXml3176Doc,
  recalculateXml3176HosoCosts,
} from '../lib/xml3176Service';
import {
  getSmartCAConfig,
  getSmartCaCertificate,
  signSmartCAHash,
  testSmartCaConnection,
  SmartCAConfig,
  SmartCAProfile,
  getSmartCAProfiles,
  getActiveSmartCAProfileId,
  setActiveSmartCAProfile,
} from '../lib/vnptSmartCaService';
import {
  checkLocalTokenSigner,
  signXmlWithUsbToken,
  unlockAndFetchTokenCertificate,
  LocalSignerStatus,
} from '../lib/localTokenSignerService';
import { prepareXmlForSigning } from '../lib/xmlBuilder';
import { bhxhGetToken, bhxhSubmitGiamDinh3176, bhxhSubmitMau09BH } from '../lib/bhxhService';
import { getOrgConfig } from '../lib/signAndSubmitService';
import ConfigModal from './ConfigModal';
import Mau09BhModal from './Mau09BhModal';
import {
  Mau09BhRecord,
  createMau09DraftFromHoso,
  buildMau09BhXml,
  exportMau09BhToExcel,
  printMau09BhPdfWindow,
  formatDisplayDateTime12,
  compileMau09Adjustments,
  isXml1FieldAdjusted,
  isCostFieldAdjusted,
} from '../lib/mau09BhService';
import { getSessionCache, getSessionSync, removeSessionCache, setSessionCache, setSessionSync } from '../lib/sessionCache';

type ActiveTab = 'ERRORS' | 'MAU09BH' | Xml3176TableId;

/** Tính độ rộng cột tối ưu cho từng trường XML 3176 (Bảng 1-15) để giảm khoảng trống dư thừa và kéo ngang ít nhất */
function getCompactXml3176ColumnWidth(col: string): number {
  switch (col) {
    case 'STT':
    case 'GIOI_TINH':
    case 'NHOM_MAU':
    case 'MA_NHOM':
    case 'PHAM_VI':
    case 'MUC_HUONG':
    case 'NAM_QT':
    case 'THANG_QT':
    case 'SO_CON':
    case 'SO_CONCHET':
    case 'TUOI_THAI':
    case 'DU_PHONG':
      return 48;
    case 'KET_QUA_DTRI':
    case 'MA_LOAI_RV':
    case 'MA_LOAI_KCB':
    case 'SO_NGAY':
    case 'SO_NGAY_DTRI':
    case 'SO_NGAY_NGHI':
    case 'TYLE_TT_BH':
    case 'TYLE_TT_DV':
    case 'SO_LUONG':
    case 'CAN_NANG':
    case 'CAN_NANG_CON':
    case 'MA_QUOCTICH':
    case 'MA_DANTOC':
    case 'MA_DANTOC_NND':
    case 'MA_PTTT_QT':
    case 'MATINH_CU_TRU':
    case 'MAHUYEN_CU_TRU':
    case 'MAXA_CU_TRU':
    case 'DON_VI_TINH':
    case 'DON_VI_DO':
    case 'DUONG_DUNG':
      return 56;
    case 'MA_BN':
    case 'MA_CSKCB':
    case 'MA_DKBD':
    case 'MA_KHOA':
    case 'MA_KHOA_RV':
    case 'MA_BENH_CHINH':
    case 'MA_BENH_KT':
    case 'MA_BENH_YHCT':
    case 'MA_BS':
    case 'MA_TTDV':
    case 'MA_NOI_DI':
    case 'MA_NOI_DEN':
    case 'MA_DOI_TUONG':
    case 'MA_THUOC':
    case 'MA_DICH_VU':
    case 'MA_VAT_TU':
    case 'MA_CHI_SO':
    case 'MA_BS_DOC_KQ':
    case 'MA_NGHE_NGHIEP':
    case 'MA_PP_CHEBIEN':
    case 'MA_CSKCB_THUOC':
    case 'MA_XANG_DAU':
    case 'GIA_TRI':
    case 'GOI_VTYT':
    case 'SO_DANG_KY':
    case 'MA_YTE':
      return 74;
    case 'NGAY_SINH':
    case 'NGAYSINH_NND':
    case 'NGAY_VAO':
    case 'NGAY_VAO_NOI_TRU':
    case 'NGAY_RA':
    case 'NGAY_TTOAN':
    case 'NGAY_YL':
    case 'NGAY_KQ':
    case 'NGAY_CT':
    case 'NGAY_HOP':
    case 'NGAY_HEN_KL':
    case 'TU_NGAY':
    case 'DEN_NGAY':
    case 'GT_THE_TU':
    case 'GT_THE_DEN':
    case 'NGAYCAP_CCCD_NND':
    case 'NGAY_CAP_CCCD':
    case 'NGAY_SINHCON':
    case 'NGAY_CHETCON':
    case 'THOI_DIEM_DBLS':
    case 'NGAYBD_DTRI_LAO':
    case 'NGAYKT_DTRI_LAO':
    case 'NGAYKD_HIV':
    case 'BDDT_ARV':
      return 94;
    case 'MA_THE_BHYT':
    case 'MA_THE_NND':
    case 'MA_THE_TAM':
      return 118;
    case 'MA_LK':
    case 'SO_CCCD':
    case 'SO_CCCD_NND':
    case 'MA_BHXH':
    case 'MA_BHXH_NND':
      return 96;
    case 'SO_SERI':
    case 'SO_CT':
    case 'SO_KCB':
    case 'SO_LUU_TRU':
    case 'SO_HOSO':
    case 'SO_CHUYENTUYEN':
    case 'SO_GIAYHEN_KL':
    case 'DIEN_THOAI':
    case 'TT_THAU':
      return 86;
    case 'HO_TEN':
    case 'HOTEN_NND':
    case 'HO_TEN_CHA':
    case 'HO_TEN_ME':
    case 'NGUOI_GIAM_HO':
    case 'TEN_BS':
    case 'NGUOI_THUC_HIEN':
    case 'NGUOI_CHU_TRI':
      return 134;
    case 'DIA_CHI':
    case 'NOI_DK_THUONGTRU_NND':
    case 'TEN_THUOC':
    case 'TEN_DICH_VU':
    case 'TEN_VAT_TU':
    case 'TEN_CHI_SO':
    case 'CHAN_DOAN_RV':
    case 'CHAN_DOAN_VAO':
    case 'PP_DIEU_TRI':
    case 'PP_DIEUTRI':
    case 'DIEN_BIEN_LS':
    case 'TOMTAT_KQ':
    case 'QT_BENHLY':
    case 'MO_TA':
    case 'KET_LUAN':
    case 'DON_VI':
    case 'GHI_CHU':
    case 'HAM_LUONG':
    case 'LIEU_DUNG':
    case 'CACH_DUNG':
    case 'DANG_BAO_CHE':
      return 138;
    default: {
      if (col.startsWith('T_') || col.startsWith('DON_GIA') || col.startsWith('THANH_TIEN')) {
        return 82;
      }
      if (col.startsWith('NGAY_') || col.startsWith('NGAY')) {
        return 94;
      }
      if (col.startsWith('SO_') || col.startsWith('TYLE_') || col.startsWith('PHANLOAI_')) {
        return 62;
      }
      if (col.startsWith('TEN_') || col.startsWith('NOI_') || col.startsWith('CHAN_DOAN')) {
        return 134;
      }
      if (col.startsWith('MA_')) {
        return 76;
      }
      return 84;
    }
  }
}

function normalizeCachedXml3176Doc(raw: any): Xml3176ParsedDoc | null {
  if (raw?.tables?.XML1) return raw as Xml3176ParsedDoc;
  if (raw?.nextDoc?.tables?.XML1) return raw.nextDoc as Xml3176ParsedDoc;
  return null;
}

export default function Xml3176Module() {
  // Lưu cache dữ liệu XML 3176 trong phiên trình duyệt (giữ qua F5, tắt trình duyệt tự xóa)
  const [doc, setDoc] = useState<Xml3176ParsedDoc | null>(() =>
    normalizeCachedXml3176Doc(getSessionSync<any>('xml3176_doc_v1', null))
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    getSessionSync<ActiveTab>('xml3176_active_tab_v1', 'XML1')
  );
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedHosoFilter, setSelectedHosoFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Danh sách các hosoIndex được tích chọn ở Bảng 1 để Ký số / Xuất XML
  const [selectedHosoIndices, setSelectedHosoIndices] = useState<Set<number>>(() => {
    const saved = getSessionSync<number[]>('xml3176_selected_indices_v1', []);
    return new Set(Array.isArray(saved) ? saved : []);
  });

  React.useEffect(() => {
    let mounted = true;
    getSessionCache<any>('xml3176_doc_v1')
      .then(cachedDoc => {
        if (!mounted) return;
        const resolved = normalizeCachedXml3176Doc(cachedDoc);
        if (resolved) {
          setDoc(resolved);
          setSelectedHosoIndices(prev => {
            if (prev.size > 0) return prev;
            const all = new Set<number>();
            for (let i = 0; i < (resolved.hosoFiles?.length || 0); i++) all.add(i);
            return all;
          });
        }
      })
      .finally(() => {
        if (mounted) setCacheHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!cacheHydrated) return;
    if (doc) {
      setSessionCache('xml3176_doc_v1', doc).catch(() => {});
    } else {
      removeSessionCache('xml3176_doc_v1').catch(() => {});
    }
    setSessionSync('xml3176_active_tab_v1', activeTab);
    setSessionSync('xml3176_selected_indices_v1', Array.from(selectedHosoIndices));
  }, [cacheHydrated, doc, activeTab, selectedHosoIndices]);

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
  const [smartCaProfiles, setSmartCaProfiles] = useState<SmartCAProfile[]>(() => getSmartCAProfiles());
  const [activeSmartCaId, setActiveSmartCaId] = useState<string>(() => getActiveSmartCAProfileId());
  React.useEffect(() => {
    const syncProfiles = () => {
      setSmartCaProfiles(getSmartCAProfiles());
      setActiveSmartCaId(getActiveSmartCAProfileId());
      setSmartCaCfg(getSmartCAConfig());
    };
    window.addEventListener('smartca-profiles-changed', syncProfiles);
    return () => window.removeEventListener('smartca-profiles-changed', syncProfiles);
  }, []);
  const [localSigner, setLocalSigner] = useState<LocalSignerStatus | null>(null);
  const [selectedTokenSerial, setSelectedTokenSerial] = useState<string>('');
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isUnlockingToken, setIsUnlockingToken] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signStatusMsg, setSignStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [autoDownloadAfterSign, setAutoDownloadAfterSign] = useState(false);
  // Ký & gửi hồ sơ lên Cổng BHXH qua API guiHoSoXmlQD3176 (tài khoản lấy từ Cấu hình)
  const [sendToGateway, setSendToGateway] = useState(false);
  const [gatewayConfigTab, setGatewayConfigTab] = useState(false);
  const [gatewayResults, setGatewayResults] = useState<
    { label: string; ok: boolean; maGD?: string; time?: string; message: string }[]
  >([]);

  // ============================================================================
  // STATE QUẢN LÝ HỒ SƠ ĐIỀU CHỈNH / THU HỒI ĐNTT MẪU SỐ 09/BH (TT12/2026/TT-BTC)
  // ============================================================================
  const [mau09Records, setMau09Records] = useState<Mau09BhRecord[]>(() =>
    getSessionSync<Mau09BhRecord[]>('xml3176_mau09_records_v1', [])
  );
  const [selectedMau09Ids, setSelectedMau09Ids] = useState<Set<string>>(() => {
    const initial = getSessionSync<Mau09BhRecord[]>('xml3176_mau09_records_v1', []);
    return new Set(Array.isArray(initial) ? initial.map(r => r.id) : []);
  });
  const [mau09ModalDrafts, setMau09ModalDrafts] = useState<Mau09BhRecord[] | null>(null);
  const [isSigningMau09, setIsSigningMau09] = useState<boolean>(false);
  const [mau09StatusMsg, setMau09StatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewMau09XmlRec, setPreviewMau09XmlRec] = useState<Mau09BhRecord | null>(null);

  React.useEffect(() => {
    setSessionSync('xml3176_mau09_records_v1', mau09Records);
  }, [mau09Records]);

  // Mở cửa sổ Tạo / Điều chỉnh Mẫu 09/BH từ danh sách hồ sơ bệnh nhân đã chọn ở Bảng 1
  const openCreateMau09Modal = (targetIndices?: number[], defaultTrangThai = '1') => {
    if (!doc) return;
    const indices =
      targetIndices && targetIndices.length > 0
        ? targetIndices
        : Array.from(selectedHosoIndices).sort((a, b) => a - b);
    if (indices.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 hồ sơ ở Bảng 1 để lập Hồ sơ điều chỉnh / thu hồi Mẫu 09/BH!');
      return;
    }
    const org = getOrgConfig();
    const drafts: Mau09BhRecord[] = indices.map(hIdx => {
      const existing = mau09Records.find(r => r.hosoIndex === hIdx);
      if (existing) {
        const cloned: Mau09BhRecord = JSON.parse(JSON.stringify(existing));
        if (targetIndices === undefined && defaultTrangThai === '2') {
          cloned.ttXml1.TRANGTHAI = '2';
        }
        return cloned;
      }
      return createMau09DraftFromHoso(doc, hIdx, {
        maCskcb: doc.maCskcb || org.ma_cskcb || '48225',
        trangThai: defaultTrangThai,
      });
    });
    setMau09ModalDrafts(drafts);
  };

  // Lưu các hồ sơ Mẫu 09/BH từ cửa sổ Tạo Mẫu 09/BH và chuyển sang Bảng Hồ sơ 09/BH
  const handleSaveMau09ModalRecords = (
    savedDrafts: Mau09BhRecord[],
    syncTo3176Doc: boolean
  ) => {
    setMau09Records(prev => {
      const mapById = new Map<string, Mau09BhRecord>();
      prev.forEach(r => mapById.set(r.id, r));
      savedDrafts.forEach(d => {
        const existingByHoso = Array.from(mapById.values()).find(
          x => x.hosoIndex === d.hosoIndex && x.id !== d.id
        );
        if (existingByHoso) {
          mapById.delete(existingByHoso.id);
        }
        mapById.set(d.id, d);
      });
      return Array.from(mapById.values());
    });

    setSelectedMau09Ids(prev => {
      const next = new Set(prev);
      savedDrafts.forEach(d => next.add(d.id));
      return next;
    });

    // Nếu người dùng tích chọn Đồng bộ cập nhật thông tin đã sửa vào dữ liệu XML 3176 đang mở
    if (syncTo3176Doc && doc) {
      const nextTables = { ...doc.tables };
      const nextHosoSignStates = { ...doc.hosoSignStates };
      let anyChanged = false;
      const affectedHosoSet = new Set<number>();

      for (const rec of savedDrafts) {
        let recCostChanged = false;

        // 1. Đồng bộ các trường XML1 đã sửa
        const modifiedXml1 = rec.xml1FieldsDraft.filter(isXml1FieldAdjusted);
        if (modifiedXml1.length > 0) {
          anyChanged = true;
          nextTables.XML1 = nextTables.XML1.map(r => {
            if (r.hosoIndex !== rec.hosoIndex) return r;
            const nextFields = { ...r.fields };
            modifiedXml1.forEach(mf => {
              nextFields[mf.field] = mf.ttDieuChinh;
            });
            return {
              ...r,
              maLk: nextFields.MA_LK || r.maLk,
              hoTen: nextFields.HO_TEN || r.hoTen,
              fields: nextFields,
            };
          });
        }

        // 2. Đồng bộ các trường chi phí XML2..XML15 đã sửa hoặc thu hồi/hủy chi phí
        for (const cRow of rec.costRowsDraft) {
          const isWithdrawn = cRow.withdrawEntireRow || cRow.trangThai === '2';
          if (isWithdrawn) {
            anyChanged = true;
            recCostChanged = true;
            affectedHosoSet.add(rec.hosoIndex);
            // Khi thu hồi đề nghị thanh toán 1 dịch vụ / thuốc, loại bỏ dòng đó khỏi bảng XML2/XML3 đang mở (hoặc đưa tiền về 0) để tổng đơn khớp
            nextTables[cRow.tableId] = (nextTables[cRow.tableId] || []).filter(
              r => r.rowId !== cRow.sourceRowId
            );
            continue;
          }

          const modFields = cRow.fieldDrafts.filter(isCostFieldAdjusted);
          if (modFields.length > 0) {
            anyChanged = true;
            if (cRow.tableId === 'XML2' || cRow.tableId === 'XML3') {
              recCostChanged = true;
              affectedHosoSet.add(rec.hosoIndex);
            }
            nextTables[cRow.tableId] = (nextTables[cRow.tableId] || []).map(r => {
              if (r.rowId !== cRow.sourceRowId) return r;
              const nextFields = { ...r.fields };
              modFields.forEach(mf => {
                nextFields[mf.field] = mf.ttDieuChinh;
              });
              return {
                ...r,
                fields: nextFields,
              };
            });
          }
        }

        if (anyChanged || recCostChanged) {
          nextHosoSignStates[rec.hosoIndex] = {
            ...(nextHosoSignStates[rec.hosoIndex] || { hosoIndex: rec.hosoIndex }),
            isSigned: false,
            isModified: true,
          };
        }
      }

      if (anyChanged) {
        let nextDoc: Xml3176ParsedDoc = {
          ...doc,
          tables: nextTables,
          hosoSignStates: nextHosoSignStates,
          signature: { ...doc.signature, isSigned: false },
        };
        if (affectedHosoSet.size > 0) {
          nextDoc = recalculateXml3176HosoCosts(nextDoc, Array.from(affectedHosoSet)).nextDoc;
        } else {
          nextDoc.errors = validateXml3176Doc(nextDoc);
        }
        setDoc(nextDoc);
      }
    }

    setMau09ModalDrafts(null);
    setActiveTab('MAU09BH');
    setMau09StatusMsg({
      ok: true,
      text: `✅ Đã lưu ${savedDrafts.length} Hồ sơ điều chỉnh Mẫu 09/BH vào bảng! Bạn có thể kiểm tra, Ký số (VNPT SmartCA / USB Token), Xuất XML/Excel/PDF hoặc Gửi trực tiếp lên Cổng BHXH (Loại HS 73).`,
    });
  };

  const handleDownloadMau09XmlFile = (rec: Mau09BhRecord) => {
    const xml = rec.isSigned && rec.signedXml ? rec.signedXml : buildMau09BhXml(rec);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeLk = (rec.ttXml1.MA_LK || 'HOSO').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `MAU_09BH_${safeLk}${rec.isSigned ? '_signed' : ''}.xml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Ký số (VNPT SmartCA / USB Token) và tùy chọn Gửi trực tiếp Hồ sơ Mẫu 09/BH lên Cổng BHXH (Loại hồ sơ = 73)
  const handleSignAndSubmitMau09Records = async (
    submitToGateway: boolean,
    singleRecId?: string
  ) => {
    const targetList = singleRecId
      ? mau09Records.filter(r => r.id === singleRecId)
      : mau09Records.filter(r => selectedMau09Ids.has(r.id));

    if (targetList.length === 0) {
      setMau09StatusMsg({
        ok: false,
        text: 'Vui lòng tích chọn ít nhất 1 hồ sơ Mẫu 09/BH trong bảng để thực hiện!',
      });
      return;
    }

    setIsSigningMau09(true);
    setMau09StatusMsg(null);

    try {
      let gwTokens: { access_token: string; id_token: string } | null = null;
      const gwOrg = getOrgConfig();

      if (submitToGateway) {
        if (!gwOrg.ma_cskcb || !gwOrg.bhxh_account?.username || !gwOrg.bhxh_account?.password) {
          throw new Error(
            'Chưa cấu hình tài khoản liên thông Cổng BHXH (Mã CSKCB, Username, Password). Vui lòng bấm nút "Cấu hình CKS" -> tab "Tài khoản Cổng BHXH" để thiết lập!'
          );
        }
        setMau09StatusMsg({
          ok: true,
          text: `🌐 Đang đăng nhập Cổng tiếp nhận BHXH (${gwOrg.bhxh_account.username})...`,
        });
        gwTokens = await bhxhGetToken(gwOrg);
        if (!gwTokens) {
          throw new Error('Không lấy được phiên làm việc (Token) từ Cổng BHXH.');
        }
      }

      const updatedMap = new Map<string, Mau09BhRecord>();
      let signedCount = 0;
      let submittedCount = 0;

      for (let i = 0; i < targetList.length; i++) {
        const rec = targetList[i];
        const label = `${i + 1}/${targetList.length} (${rec.ttXml1.HO_TEN || rec.ttXml1.MA_LK})`;
        const unsignedXml = buildMau09BhXml(rec);

        let signedXml = '';
        let subjectStr = '';

        if (signMethod === 'USB_TOKEN') {
          setMau09StatusMsg({
            ok: true,
            text: `[${label}] 🔐 Đang ký số Mẫu 09/BH bằng USB Token...`,
          });
          const tokenRes = await signXmlWithUsbToken(
            unsignedXml,
            msg => setMau09StatusMsg({ ok: true, text: `[${label}] ${msg}` }),
            undefined,
            selectedTokenSerial || undefined
          );
          signedXml = tokenRes.signedXml;
          subjectStr = tokenRes.subject || 'USB Token';
        } else {
          const cfg = getSmartCAConfig();
          if (!cfg.clientId || !cfg.clientSecret || !cfg.userId) {
            throw new Error(
              'Chưa cấu hình tài khoản VNPT SmartCA. Vui lòng bấm "Cấu hình CKS" để nhập thông tin hoặc chuyển sang ký bằng USB Token!'
            );
          }
          setMau09StatusMsg({
            ok: true,
            text: `[${label}] 🔐 Đang lấy Chứng thư số VNPT SmartCA...`,
          });
          const certInfo = await getSmartCaCertificate(cfg);
          subjectStr = certInfo.subject;
          const effectiveCfg: SmartCAConfig = {
            ...getSmartCAConfig(),
            serialNumber: certInfo.serialNumber || cfg.serialNumber,
            signMode: signMethod === 'SMARTCA_APP' ? 'APP' : 'TOTP',
          };
          const { hashToSign, buildSignedXml } = await prepareXmlForSigning(unsignedXml, certInfo);
          const sigB64 = await signSmartCAHash(effectiveCfg, hashToSign, msg =>
            setMau09StatusMsg({ ok: true, text: `[${label}] ${msg}` })
          );
          signedXml = buildSignedXml(sigB64);
        }

        signedCount++;
        const nextRec: Mau09BhRecord = {
          ...rec,
          isSigned: true,
          signedXml,
          signerSubject: subjectStr,
          signingTime: new Date().toLocaleString('vi-VN'),
        };

        if (submitToGateway && gwTokens) {
          setMau09StatusMsg({
            ok: true,
            text: `[${label}] 🚀 Đang gửi Mẫu 09/BH (loaiHs=73) lên Cổng BHXH...`,
          });
          const gwRes = await bhxhSubmitMau09BH(
            gwOrg,
            gwTokens,
            signedXml,
            rec.ttXml1.KY_QT
          );
          const isOk = gwRes.maKetQua === '200';
          if (isOk) submittedCount++;
          nextRec.submitStatus = isOk ? 'SUBMITTED' : 'ERROR';
          nextRec.maGiaoDich = gwRes.maGD;
          nextRec.submitTime = gwRes.thoiGianTiepNhan;
          nextRec.submitMessage = gwRes.message;
        }

        updatedMap.set(nextRec.id, nextRec);
      }

      setMau09Records(prev => prev.map(r => updatedMap.get(r.id) || r));
      setMau09StatusMsg({
        ok: true,
        text: submitToGateway
          ? `🎉 Hoàn tất! Đã ký số ${signedCount} hồ sơ Mẫu 09/BH và gửi thành công ${submittedCount}/${targetList.length} hồ sơ lên Cổng BHXH (Loại HS 73).`
          : `🎉 Đã ký số thành công ${signedCount} hồ sơ Mẫu 09/BH vào thẻ <CHUKYDONVI> (ký thẳng vào <TT_HOSO Id="...">)!`,
      });
    } catch (err: any) {
      setMau09StatusMsg({
        ok: false,
        text: `❌ Lỗi: ${err?.message || err}`,
      });
    } finally {
      setIsSigningMau09(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsLoading(true);
    try {
      const docs: Xml3176ParsedDoc[] = [];
      const failed: string[] = [];
      for (const file of files) {
        try {
          const text = await file.text();
          docs.push(parseXml3176(text, file.name));
        } catch (err: any) {
          failed.push(`${file.name}: ${err?.message || err}`);
        }
      }
      if (docs.length === 0) throw new Error(failed.join('\n'));
      const parsed = mergeXml3176Docs(docs, docs.length > 1 ? `${docs.length} file XML (${docs[0].fileName}, ...)` : docs[0].fileName);
      if (failed.length > 0) alert(`Có ${failed.length} file đọc lỗi, đã bỏ qua:\n` + failed.join('\n'));
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

  const parseXmlMoney = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    const raw = String(val).trim();
    if (!raw) return 0;
    const direct = Number(raw);
    if (Number.isFinite(direct)) return direct;
    const normalized = Number(raw.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : 0;
  };

  const formatBhxhAmount = (val: number): string => {
    const rounded = Math.round(val * 100) / 100 || 0;
    return rounded.toLocaleString('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Tổng hợp chi phí từ Bảng 1 theo đúng các hồ sơ đang tích chọn (chuẩn Cổng BHXH)
  const costSummary = useMemo(() => {
    if (!doc) {
      return {
        tongChiBv: 0,
        tongChiBh: 0,
        bhtt: 0,
        bntt: 0,
        bnttRaw: 0,
        bncct: 0,
        thuoc: 0,
        vtyt: 0,
        count: 0,
      };
    }
    const rowsToSum = doc.tables.XML1.filter(r => selectedHosoIndices.has(r.hosoIndex));
    return rowsToSum.reduce(
      (acc, r) => {
        const rawTongChiBv = String(r.fields.T_TONGCHI_BV ?? '').trim();
        const bnttRaw = parseXmlMoney(r.fields.T_BNTT);
        const bncct = parseXmlMoney(r.fields.T_BNCCT);
        acc.tongChiBv += parseXmlMoney(rawTongChiBv ? rawTongChiBv : r.fields.T_TONGCHI_BH);
        acc.tongChiBh += parseXmlMoney(r.fields.T_TONGCHI_BH);
        acc.bhtt += parseXmlMoney(r.fields.T_BHTT);
        acc.bnttRaw += bnttRaw;
        acc.bncct += bncct;
        acc.bntt += bnttRaw + bncct;
        acc.thuoc += parseXmlMoney(r.fields.T_THUOC);
        acc.vtyt += parseXmlMoney(r.fields.T_VTYT);
        acc.count += 1;
        return acc;
      },
      {
        tongChiBv: 0,
        tongChiBh: 0,
        bhtt: 0,
        bntt: 0,
        bnttRaw: 0,
        bncct: 0,
        thuoc: 0,
        vtyt: 0,
        count: 0,
      }
    );
  }, [doc, selectedHosoIndices]);

  const activeColFilterEntries = useMemo(
    () =>
      Object.entries(columnFilters as Record<string, string>)
        .map(([k, v]) => [k, v.trim().toLowerCase()] as const)
        .filter(([, v]) => v.length > 0),
    [columnFilters]
  );

  // Dữ liệu của Bảng đang chọn sau khi lọc
  const currentTableRows = useMemo(() => {
    if (!doc || activeTab === 'ERRORS' || activeTab === 'MAU09BH') return [];
    const rawRows = doc.tables[activeTab] || [];
    const q = searchTerm.trim().toLowerCase();
    return rawRows.filter(row => {
      if (selectedHosoFilter !== 'ALL' && String(row.hosoIndex) !== selectedHosoFilter) {
        return false;
      }
      if (q) {
        const matchesGlobal =
          row.maLk.toLowerCase().includes(q) ||
          row.hoTen.toLowerCase().includes(q) ||
          Object.values(row.fields).some(v => (v || '').toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }
      for (const [colKey, colQuery] of activeColFilterEntries) {
        const cellVal =
          colKey === '__HO_TEN_BN__'
            ? (row.hoTen || '').toLowerCase()
            : String(row.fields[colKey] ?? '').toLowerCase();
        if (!cellVal.includes(colQuery)) return false;
      }
      return true;
    });
  }, [doc, activeTab, searchTerm, selectedHosoFilter, activeColFilterEntries]);

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
  }, [currentTableRows, currentPage, pageSize]);

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
    setSmartCaProfiles(getSmartCAProfiles());
    setActiveSmartCaId(getActiveSmartCAProfileId());
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
    setGatewayResults([]);

    try {
      // Chuẩn bị phiên làm việc Cổng BHXH (nếu chọn Ký & Gửi) — mỗi file XML là 1 hồ sơ KCB nên ký tách riêng từng hồ sơ
      let gwTokens: { access_token: string; id_token: string } | null = null;
      const gwOrg = getOrgConfig();
      const gwResults: { label: string; ok: boolean; maGD?: string; time?: string; message: string }[] = [];
      if (sendToGateway) {
        if (!gwOrg.ma_cskcb || !gwOrg.bhxh_account?.username || !gwOrg.bhxh_account?.password) {
          throw new Error(
            'Chưa cấu hình tài khoản Cổng BHXH (Mã CSKCB, tên đăng nhập, mật khẩu). Bấm "Cấu hình CKS / SmartCA" → tab Tài khoản Cổng BHXH để nhập.'
          );
        }
        setSignStatusMsg({ ok: true, text: '🔑 Đang đăng nhập Cổng BHXH lấy phiên làm việc...' });
        gwTokens = await bhxhGetToken(gwOrg as any);
        if (!gwTokens) throw new Error('Không lấy được token từ Cổng BHXH.');
      }

      if (signPackageMode === 'INDIVIDUAL' || indicesToSign.length === 1 || sendToGateway) {
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

          if (sendToGateway && gwTokens) {
            setSignStatusMsg({
              ok: true,
              text: `📤 Đang gửi hồ sơ ${i + 1}/${indicesToSign.length} (Mã LK: ${maLk}) lên Cổng BHXH...`,
            });
            try {
              const r = await bhxhSubmitGiamDinh3176(gwOrg as any, gwTokens, signedXmlFull);
              gwResults.push({
                label: maLk,
                ok: r.maKetQua === '200',
                maGD: r.maGD,
                time: r.thoiGianTiepNhan,
                message: r.message,
              });
            } catch (e: any) {
              const raw = e?.message || 'Lỗi không xác định';
              gwResults.push({
                label: maLk,
                ok: false,
                message: /Failed to fetch|NetworkError/i.test(raw)
                  ? 'Không kết nối được Cổng BHXH (mạng / CORS). Kiểm tra mạng hoặc bật công cụ Chay_Ky_So_USB_Token.bat.'
                  : raw,
              });
            }
            setGatewayResults([...gwResults]);
          }
        }

        const updatedDoc: Xml3176ParsedDoc = {
          ...doc,
          hosoSignStates: nextHosoSignStates,
          signature: indicesToSign.length === 1 ? lastSigInfo : doc.signature,
        };
        setDoc(updatedDoc);
        setAutoDownloadAfterSign(false);
        if (sendToGateway) {
          const okCount = gwResults.filter(r => r.ok).length;
          setSignStatusMsg({
            ok: okCount === gwResults.length,
            text: `Đã ký ${indicesToSign.length} hồ sơ • Gửi Cổng BHXH thành công ${okCount}/${gwResults.length} hồ sơ (xem chi tiết bên dưới).`,
          });
        } else {
          setSignStatusMsg({
            ok: true,
            text: `Đã ký số thành công ${indicesToSign.length} hồ sơ! Trạng thái ở Bảng 1 đã cập nhật thành "Đã ký số".`,
          });
        }
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
    if (activeTab === 'ERRORS' || activeTab === 'MAU09BH') return [];
    if (doc && doc.tableColumns[activeTab] && doc.tableColumns[activeTab].length > 0) {
      return doc.tableColumns[activeTab];
    }
    return activeTableMeta?.defaultFields || [];
  }, [doc, activeTab, activeTableMeta]);

  // Tùy chỉnh kéo rộng / thu hẹp độ rộng từng cột bằng chuột cho Bảng 1 -> Bảng 15
  const [customColWidths, setCustomColWidths] = useState<Record<string, number>>({});

  const getEffective3176ColWidth = (col: string, defaultWidth?: number): number => {
    const key = `${activeTab}:${col}`;
    return customColWidths[key] ?? (defaultWidth ?? getCompactXml3176ColumnWidth(col));
  };

  const startResize3176Col = (e: React.MouseEvent, col: string, defaultWidth?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `${activeTab}:${col}`;
    const startX = e.clientX;
    const startWidth = getEffective3176ColWidth(col, defaultWidth);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(28, Math.round(startWidth + delta));
      setCustomColWidths(prev => ({ ...prev, [key]: nextWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleExpand3176Col = (col: string, defaultWidth?: number) => {
    const key = `${activeTab}:${col}`;
    const defW = defaultWidth ?? getCompactXml3176ColumnWidth(col);
    setCustomColWidths(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = Math.max(defW + 90, 220);
      return next;
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
      {/* THANH CÔNG CỤ & THÔNG TIN TỔNG QUAN HỒ SƠ 3176 THU GỌN TỐI ĐA */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-xs px-3 py-2 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900">
              ĐỌC, SỬA &amp; KÝ SỐ XML 3176 / 130 (BẢNG 1–15)
            </h2>
            <span className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Không lưu dữ liệu (F5 tự xóa)
            </span>
          </div>

          {/* CÁC NÚT TÁC VỤ CHÍNH */}
          <div className="flex flex-wrap items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              {isLoading ? 'Đang đọc...' : 'Mở XML 3176'}
            </button>

            {doc && (
              <button
                onClick={handleClearLoadedXml}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                title="Xóa toàn bộ dữ liệu XML đang mở khỏi bộ nhớ RAM"
              >
                <Trash2 className="w-3 h-3" />
                Xóa
              </button>
            )}

            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer"
              title="Cấu hình chung VNPT SmartCA & USB Token từ hệ thống"
            >
              <Settings className="w-3 h-3" />
              Cấu hình CKS
            </button>

            <button
              onClick={() => openCreateMau09Modal(undefined, '1')}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-transparent bg-[#004a8f] hover:bg-blue-800 disabled:opacity-50 text-white text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer"
              title="Lập Bảng kê chi tiết điều chỉnh / thu hồi ĐNTT (Mẫu số 09/BH - TT12/2026/TT-BTC) cho các hồ sơ đã chọn"
            >
              <Edit3 className="w-3 h-3" />
              Tạo Hồ sơ 09/BH ({selectedHosoIndices.size} HS)
            </button>

            <button
              onClick={() => {
                setAutoDownloadAfterSign(false);
                setSendToGateway(false);
                openSignModal('SELECTED');
              }}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3" />
              Ký số ({selectedHosoIndices.size} HS)
            </button>

            <button
              onClick={() => {
                setAutoDownloadAfterSign(false);
                setSendToGateway(false);
                openSignModal('ALL');
              }}
              disabled={!doc}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 disabled:opacity-50 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3" />
              Ký tất cả ({doc ? doc.hosoFiles.length : 0})
            </button>

            <button
              onClick={() => {
                setAutoDownloadAfterSign(false);
                setSendToGateway(true);
                openSignModal('SELECTED');
              }}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
              title="Ký số rồi gửi từng hồ sơ đã chọn lên Cổng BHXH qua API 3176 bằng tài khoản Cổng đã cấu hình"
            >
              <Upload className="w-3 h-3" />
              Ký &amp; Gửi Cổng ({selectedHosoIndices.size})
            </button>

            <button
              onClick={() => handleExportUnsignedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 disabled:opacity-50 text-[11px] font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Xuất K.Ký ({selectedHosoIndices.size})
            </button>

            <button
              onClick={() => handleExportSignedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Xuất Đã Ký ({selectedHosoIndices.size})
            </button>

            <button
              onClick={() => handleExportUnencodedXml()}
              disabled={!doc || selectedHosoIndices.size === 0}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <FileCode2 className="w-3 h-3" />
              Xuất Rõ ({selectedHosoIndices.size})
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!doc}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3" />
              Excel
            </button>

            <button
              onClick={() => {
                setPreviewMode('OUTER_UNENCODED');
                setShowXmlPreviewModal(true);
              }}
              disabled={!doc}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              Xem XML
            </button>
          </div>
        </div>

        {/* NẾU CHƯA TẢI FILE XML: HIỂN THỊ KHUNG CHỌN FILE (KHÔNG LƯU SẴN FILE MẪU) */}
        {!doc ? (
          <div className="py-10 px-4 text-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="max-w-xl mx-auto border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Bấm vào đây để chọn file XML theo chuẩn 3176 / 130 (.xml)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống sẽ tự động giải mã Base64 và tách riêng từng bảng (Bảng lỗi, Bảng 1 → Bảng 15) để bạn kiểm tra, chỉnh sửa nội dung, tích chọn ký số từng hồ sơ hoặc tất cả và xuất XML chuẩn.
              </p>
            </div>
          </div>
        ) : (
          /* THÔNG TIN TỔNG HỢP TRÊN 1 DÒNG THU GỌN */
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500">CSKCB:</span>
                <input
                  type="text"
                  value={doc.maCskcb}
                  onChange={e => {
                    const nextSignStates = { ...doc.hosoSignStates };
                    Object.keys(nextSignStates).forEach(k => {
                      const idx = Number(k);
                      nextSignStates[idx] = {
                        ...nextSignStates[idx],
                        isSigned: false,
                        isModified: true,
                        signedXmlContent: undefined,
                      };
                    });
                    setDoc({
                      ...doc,
                      maCskcb: e.target.value,
                      hosoSignStates: nextSignStates,
                      signature: { ...doc.signature, isSigned: false },
                    });
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Chỉnh sửa thẻ <MACSKCB>"
                />
                <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[140px]" title={doc.fileName}>
                  {doc.fileName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                <span className="text-[10.5px] font-bold text-slate-500">Ngày lập:</span>
                <input
                  type="text"
                  value={doc.ngayLap}
                  onChange={e => {
                    const nextSignStates = { ...doc.hosoSignStates };
                    Object.keys(nextSignStates).forEach(k => {
                      const idx = Number(k);
                      nextSignStates[idx] = {
                        ...nextSignStates[idx],
                        isSigned: false,
                        isModified: true,
                        signedXmlContent: undefined,
                      };
                    });
                    setDoc({
                      ...doc,
                      ngayLap: e.target.value,
                      hosoSignStates: nextSignStates,
                      signature: { ...doc.signature, isSigned: false },
                    });
                  }}
                  className="w-20 px-1.5 py-0.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1">
                  <span className="text-[10.5px] font-bold text-slate-600">Tổng HS chọn:</span>
                  <span className="bg-white border border-slate-300 rounded px-2 py-0.5 font-extrabold tabular-nums text-[11.5px] text-blue-700 text-right min-w-[54px]">
                    {selectedHosoIndices.size}
                    <span className="text-[10px] font-semibold text-slate-400">/{doc.hosoFiles.length}</span>
                  </span>
                </div>
                <div
                  className="flex items-center gap-1"
                  title={`Tổng chi BV (T_TONGCHI_BV): ${formatBhxhAmount(costSummary.tongChiBv)} | Tổng chi BH (T_TONGCHI_BH): ${formatBhxhAmount(costSummary.tongChiBh)}`}
                >
                  <span className="text-[10.5px] font-bold text-slate-600">Tổng chi:</span>
                  <span className="bg-white border border-slate-300 rounded px-2 py-0.5 font-extrabold tabular-nums text-[11.5px] text-slate-900 text-right min-w-[82px]">
                    {formatBhxhAmount(costSummary.tongChiBv)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1"
                  title={`Tổng bệnh nhân thanh toán = T_BNTT (${formatBhxhAmount(costSummary.bnttRaw)}) + T_BNCCT (${formatBhxhAmount(costSummary.bncct)})`}
                >
                  <span className="text-[10.5px] font-bold text-slate-600">Tổng BNTT:</span>
                  <span className="bg-white border border-slate-300 rounded px-2 py-0.5 font-extrabold tabular-nums text-[11.5px] text-amber-700 text-right min-w-[78px]">
                    {formatBhxhAmount(costSummary.bntt)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1"
                  title={`Tổng BHYT thanh toán (T_BHTT): ${formatBhxhAmount(costSummary.bhtt)}`}
                >
                  <span className="text-[10.5px] font-bold text-slate-600">Tổng BHTT:</span>
                  <span className="bg-white border border-slate-300 rounded px-2 py-0.5 font-extrabold tabular-nums text-[11.5px] text-emerald-700 text-right min-w-[82px]">
                    {formatBhxhAmount(costSummary.bhtt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Đã ký: {signStats.signedCount} HS
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3 h-3" />
                Chưa ký: {signStats.unsignedCount} HS
              </span>
              {doc.signature.isSigned && (
                <button
                  onClick={() => {
                    setPreviewMode('SIGNATURE_ONLY');
                    setShowXmlPreviewModal(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-bold cursor-pointer"
                >
                  Xem CKS
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* THANH TAB: BẢNG LỖI | BẢNG 1 -> BẢNG 15 (CHỈ CUỘN NỘI DUNG BẢNG KHI LĂN CHUỘT) */}
      {doc && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="shrink-0 bg-slate-100 border-b border-slate-300 px-2 pt-2 flex items-end gap-1 overflow-x-auto no-scrollbar">
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

            {/* Tab Hồ sơ điều chỉnh Mẫu 09/BH */}
            <button
              onClick={() => {
                setActiveTab('MAU09BH');
                setCurrentPage(1);
              }}
              title="Bảng kê chi tiết điều chỉnh / thu hồi đề nghị thanh toán (Mẫu số 09/BH - TT12/2026/TT-BTC)"
              className={`px-3 py-2 text-xs font-extrabold rounded-t-lg border-t border-x transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'MAU09BH'
                  ? 'bg-white text-[#004a8f] border-slate-300 -mb-px pb-2.5 shadow-sm ring-1 ring-blue-200'
                  : mau09Records.length > 0
                  ? 'bg-amber-50 text-[#004a8f] border-amber-300 hover:bg-white'
                  : 'bg-slate-200/70 text-slate-700 border-transparent hover:bg-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#004a8f]" />
              <span>Hồ sơ 09/BH (Điều chỉnh)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'MAU09BH'
                    ? 'bg-[#004a8f] text-white'
                    : mau09Records.length > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {mau09Records.length}
              </span>
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
                    setColumnFilters({});
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
          <div className="shrink-0 p-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {activeTab === 'ERRORS'
                  ? `Danh sách kiểm tra logic & cảnh báo (${filteredErrors.length} mục)`
                  : activeTab === 'MAU09BH'
                  ? `Bảng kê chi tiết điều chỉnh / thu hồi ĐNTT — Mẫu số 09/BH (${mau09Records.length} hồ sơ)`
                  : `${activeTableMeta?.fullTitle} (${currentTableRows.length} dòng)`}
              </span>

              {activeTab === 'XML1' && (
                <div className="flex flex-wrap items-center gap-1.5 ml-2">
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

                  {selectedHosoIndices.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => openCreateMau09Modal(undefined, '1')}
                        className="px-3 py-1 rounded-lg bg-[#004a8f] hover:bg-blue-800 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer transition"
                        title="Mở bảng Tạo Mẫu 09/BH để điều chỉnh thông tin hành chính (XML1) hoặc điều chỉnh/hủy chi phí (XML2..15) cho các hồ sơ đã chọn"
                      >
                        <Edit3 className="w-3 h-3" />
                        Tạo Hồ sơ BH09 — Điều chỉnh ({selectedHosoIndices.size} HS)
                      </button>

                      <button
                        type="button"
                        onClick={() => openCreateMau09Modal(undefined, '2')}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer transition"
                        title="Mở bảng Tạo Mẫu 09/BH với trạng thái Thu hồi đề nghị thanh toán cho các hồ sơ đã chọn"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Thu hồi ĐNTT BH09 ({selectedHosoIndices.size} HS)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!doc) return;
                          const targetIndices = Array.from(selectedHosoIndices) as number[];
                          const { nextDoc } = recalculateXml3176HosoCosts(doc, targetIndices);
                          setDoc(nextDoc);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer transition"
                        title="Tính toán lại Thành tiền từng thuốc/DVKT (Bảng 2, Bảng 3) và đồng bộ Tổng tiền (T_THUOC, T_VTYT, T_TONGCHI_BV, T_TONGCHI_BH, T_BHTT, T_BNCCT, T_BNTT) lên Bảng 1 cho các hồ sơ đang chọn"
                      >
                        <Calculator className="w-3 h-3" />
                        Đồng bộ &amp; Tính lại Giá ({selectedHosoIndices.size} HS)
                      </button>
                    </>
                  )}
                </div>
              )}

              {(activeTab === 'XML2' || activeTab === 'XML3') && (
                <button
                  type="button"
                  onClick={() => {
                    if (!doc) return;
                    const targetIndices =
                      selectedHosoFilter !== 'ALL'
                        ? [Number(selectedHosoFilter)]
                        : selectedHosoIndices.size > 0
                        ? (Array.from(selectedHosoIndices) as number[])
                        : undefined;
                    const { nextDoc } = recalculateXml3176HosoCosts(doc, targetIndices);
                    setDoc(nextDoc);
                  }}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer transition"
                  title="Sau khi sửa Đơn giá / Số lượng / Tỷ lệ ở Bảng 2 hoặc Bảng 3, bấm nút này để tính lại Thành tiền dòng và đồng bộ Tổng chi phí lên Bảng 1 (XML1)"
                >
                  <Calculator className="w-3 h-3" />
                  Đồng bộ &amp; Tính lại Giá / Tổng tiền (XML2,3 ➔ XML1)
                </button>
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

              {activeTab !== 'ERRORS' && activeTab !== 'MAU09BH' && (
                <>
                  {Object.keys(customColWidths).some(k => k.startsWith(`${activeTab}:`)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomColWidths(prev => {
                          const next = { ...prev };
                          Object.keys(next).forEach(k => {
                            if (k.startsWith(`${activeTab}:`)) delete next[k];
                          });
                          return next;
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer"
                      title="Khôi phục độ rộng mặc định cho các cột của bảng hiện tại"
                    >
                      Đặt lại cỡ cột
                    </button>
                  )}
                  <button
                    onClick={handleAddRowToActiveTable}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm dòng {activeTableMeta?.tabLabel}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* NỘI DUNG BẢNG LỖI, BẢNG HỒ SƠ 09/BH HOẶC BẢNG 1..15 */}
          {activeTab === 'MAU09BH' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Thanh công cụ riêng cho Bảng Hồ sơ điều chỉnh Mẫu 09/BH */}
              <div className="shrink-0 px-3 py-2 bg-blue-50/70 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openCreateMau09Modal(undefined, '1')}
                    className="px-3 py-1.5 rounded-lg bg-[#004a8f] hover:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo / Sửa Hồ sơ 09/BH từ Bảng 1 ({selectedHosoIndices.size} HS chọn)
                  </button>

                  {mau09Records.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMau09Ids(new Set(mau09Records.map(r => r.id)))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer"
                      >
                        Chọn tất cả ({mau09Records.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => exportMau09BhToExcel(mau09Records)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Xuất Excel 09/BH (22 cột)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          printMau09BhPdfWindow(
                            mau09Records.filter(r => selectedMau09Ids.has(r.id)).length > 0
                              ? mau09Records.filter(r => selectedMau09Ids.has(r.id))
                              : mau09Records,
                            getOrgConfig().ten_cskcb
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In Mẫu 09/BH (PDF)
                      </button>
                    </>
                  )}
                </div>

                {/* Khối chọn phương thức Ký số & Gửi Cổng cho Mẫu 09/BH */}
                {mau09Records.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={signMethod}
                      onChange={e =>
                        setSignMethod(
                          e.target.value as 'SMARTCA_TOTP' | 'SMARTCA_APP' | 'USB_TOKEN'
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="SMARTCA_TOTP">☁ VNPT SmartCA (TOTP/OTP v2)</option>
                      <option value="SMARTCA_APP">📱 VNPT SmartCA (Duyệt App v1)</option>
                      <option value="USB_TOKEN">🔑 USB Token (Cổng 18088)</option>
                    </select>

                    {(signMethod === 'SMARTCA_TOTP' || signMethod === 'SMARTCA_APP') &&
                      smartCaProfiles.length > 0 && (
                        <select
                          value={activeSmartCaId}
                          onChange={e => {
                            const nextId = e.target.value;
                            setActiveSmartCAProfile(nextId);
                            setActiveSmartCaId(nextId);
                            setSmartCaCfg(getSmartCAConfig());
                          }}
                          title="Chọn CKS SmartCA đã đặt tên để ký Mẫu 09/BH"
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-300 text-xs font-bold text-indigo-900 max-w-[210px] outline-none cursor-pointer"
                        >
                          {smartCaProfiles.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.userId ? ` (${p.userId})` : ''}
                            </option>
                          ))}
                        </select>
                      )}

                    <button
                      type="button"
                      disabled={isSigningMau09 || selectedMau09Ids.size === 0}
                      onClick={() => handleSignAndSubmitMau09Records(false)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isSigningMau09
                        ? 'Đang ký...'
                        : `Ký số 09/BH (${selectedMau09Ids.size})`}
                    </button>

                    <button
                      type="button"
                      disabled={isSigningMau09 || selectedMau09Ids.size === 0}
                      onClick={() => handleSignAndSubmitMau09Records(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Ký số rồi gửi hồ sơ điều chỉnh Mẫu 09/BH (loaiHs=73) lên Cổng BHXH qua API /api/HSDCTT12/GuiHoSoDieuChinh09BH"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Ký &amp; Gửi Cổng 09/BH ({selectedMau09Ids.size})
                    </button>
                  </div>
                )}
              </div>

              {mau09StatusMsg && (
                <div
                  className={`px-4 py-2 text-xs font-bold border-b flex items-center justify-between gap-2 ${
                    mau09StatusMsg.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <span>{mau09StatusMsg.text}</span>
                  <button
                    type="button"
                    onClick={() => setMau09StatusMsg(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Danh sách các Hồ sơ Mẫu 09/BH đã tạo */}
              <div className="flex-1 min-h-0 overflow-auto">
                {mau09Records.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Edit3 className="w-12 h-12 text-blue-500 mx-auto" />
                    <div className="text-sm font-bold text-slate-800">
                      Chưa có Hồ sơ điều chỉnh / thu hồi Mẫu 09/BH nào được tạo
                    </div>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto">
                      Hãy tích chọn các hồ sơ cần điều chỉnh hoặc thu hồi ĐNTT ở <b>Bảng 1</b> rồi bấm nút{' '}
                      <b>"Tạo Hồ sơ 09/BH"</b> để mở bảng điều chỉnh thông tin hành chính (XML1) và chi phí (XML2..15).
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateMau09Modal(undefined, '1')}
                      className="px-4 py-2 rounded-xl bg-[#004a8f] hover:bg-blue-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Mở bảng Tạo Mẫu 09/BH cho {selectedHosoIndices.size} hồ sơ đang chọn
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-[#004a8f] text-white sticky top-0 z-10">
                      <tr>
                        <th className="border-r border-blue-800 px-2 py-2 text-center w-9">
                          <input
                            type="checkbox"
                            checked={
                              mau09Records.length > 0 &&
                              mau09Records.every(r => selectedMau09Ids.has(r.id))
                            }
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedMau09Ids(new Set(mau09Records.map(r => r.id)));
                              } else {
                                setSelectedMau09Ids(new Set());
                              }
                            }}
                            className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                          />
                        </th>
                        <th className="border-r border-blue-800 px-2 py-2 text-center w-10">STT</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-center w-36">Trạng thái Ký / Gửi</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-center w-48">Thao tác</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-28">XML1_ID</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-36">Mã liên kết (MA_LK)</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-24">Mã BN</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-44">Họ và tên</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-36">Mã thẻ BHYT</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-center w-28">Ngày vào</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-center w-28">Ngày ra</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-center w-20">Kỳ QT</th>
                        <th className="border-r border-blue-800 px-2.5 py-2 text-left w-40">Loại yêu cầu</th>
                        <th className="px-3 py-2 text-left">Tóm tắt nội dung điều chỉnh / thu hồi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mau09Records.map((rec, idx) => {
                        const isChecked = selectedMau09Ids.has(rec.id);
                        const compiled = compileMau09Adjustments(
                          rec.xml1FieldsDraft,
                          rec.costRowsDraft
                        );
                        const dsXml1 =
                          rec.dsXml1Dc.length > 0 ? rec.dsXml1Dc : compiled.dsXml1Dc;
                        const dscp = rec.dscpDc.length > 0 ? rec.dscpDc : compiled.dscpDc;

                        return (
                          <tr
                            key={rec.id}
                            className={`hover:bg-blue-50/50 ${
                              isChecked ? 'bg-blue-50/25' : 'bg-white'
                            }`}
                          >
                            <td className="border-r border-slate-200 px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setSelectedMau09Ids(prev => {
                                    const next = new Set(prev);
                                    if (next.has(rec.id)) next.delete(rec.id);
                                    else next.add(rec.id);
                                    return next;
                                  })
                                }
                                className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>
                            <td className="border-r border-slate-200 px-2 py-2 text-center font-mono text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="border-r border-slate-200 px-2 py-2 text-center space-y-1">
                              <div>
                                {rec.isSigned ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    title={`Ký bởi: ${rec.signerSubject || ''} lúc ${rec.signingTime || ''}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Đã ký số
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Chưa ký số
                                  </span>
                                )}
                              </div>
                              {rec.submitStatus === 'SUBMITTED' && (
                                <div
                                  className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 truncate"
                                  title={`Mã GD: ${rec.maGiaoDich || ''} - ${rec.submitMessage || ''}`}
                                >
                                  Đã gửi: {rec.maGiaoDich || 'OK'}
                                </div>
                              )}
                              {rec.submitStatus === 'ERROR' && (
                                <div
                                  className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 truncate"
                                  title={rec.submitMessage}
                                >
                                  Lỗi gửi Cổng
                                </div>
                              )}
                            </td>
                            <td className="border-r border-slate-200 px-2 py-2 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMau09ModalDrafts([JSON.parse(JSON.stringify(rec))])
                                  }
                                  className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10.5px] flex items-center gap-0.5 cursor-pointer"
                                  title="Mở lại cửa sổ Tạo Mẫu 09/BH để sửa chi tiết hồ sơ này"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Sửa 09/BH
                                </button>
                                <button
                                  type="button"
                                  disabled={isSigningMau09}
                                  onClick={() => handleSignAndSubmitMau09Records(false, rec.id)}
                                  className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10.5px] flex items-center gap-0.5 cursor-pointer"
                                  title="Ký số riêng hồ sơ Mẫu 09/BH này"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Ký
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMau09XmlFile(rec)}
                                  className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10.5px] flex items-center gap-0.5 cursor-pointer"
                                  title="Tải file XML Mẫu 09/BH (<HOSO_DIEUCHINH_GD>)"
                                >
                                  <Download className="w-3 h-3" />
                                  XML
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewMau09XmlRec(rec)}
                                  className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] cursor-pointer"
                                  title="Xem cấu trúc XML Mẫu 09/BH"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    printMau09BhPdfWindow([rec], getOrgConfig().ten_cskcb)
                                  }
                                  className="px-1.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[10.5px] cursor-pointer"
                                  title="In biểu mẫu 09/BH dưới dạng PDF"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!confirm(`Xóa hồ sơ Mẫu 09/BH của "${rec.ttXml1.HO_TEN}"?`))
                                      return;
                                    setMau09Records(prev => prev.filter(x => x.id !== rec.id));
                                  }}
                                  className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Xóa hồ sơ 09/BH này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 font-mono text-slate-700">
                              {rec.ttXml1.XML1_ID || '—'}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 font-mono font-semibold text-slate-900">
                              {rec.ttXml1.MA_LK}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 font-mono text-slate-700">
                              {rec.ttXml1.MA_BN}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 font-bold text-blue-950">
                              {rec.ttXml1.HO_TEN}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 font-mono text-slate-800">
                              {rec.ttXml1.MA_THE}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 text-center font-mono text-[11px]">
                              {formatDisplayDateTime12(rec.ttXml1.NGAY_VAO)}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 text-center font-mono text-[11px]">
                              {formatDisplayDateTime12(rec.ttXml1.NGAY_RA)}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2 text-center font-mono font-bold text-indigo-700">
                              {rec.ttXml1.KY_QT}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-2">
                              {rec.ttXml1.TRANGTHAI === '2' ? (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10.5px]">
                                  2 - Thu hồi / Hủy ĐNTT
                                </span>
                              ) : rec.ttXml1.TRANGTHAI === '4' ? (
                                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10.5px]">
                                  4 - Xin ý kiến thẩm quyền
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10.5px]">
                                  1 - Đề nghị điều chỉnh
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 space-y-1 text-[11px]">
                              {dsXml1.length === 0 && dscp.length === 0 ? (
                                <span className="text-slate-500 italic">
                                  {rec.ttXml1.TRANGTHAI === '2'
                                    ? 'Thu hồi toàn bộ hồ sơ khỏi đề nghị thanh toán'
                                    : 'Chưa có dòng điều chỉnh chi tiết (Bấm "Sửa 09/BH" để bổ sung)'}
                                </span>
                              ) : (
                                <>
                                  {dsXml1.map((x1, i) => (
                                    <div key={`x1_${i}`} className="text-slate-800">
                                      <span className="font-bold text-indigo-700">[XML1]</span>{' '}
                                      <code className="font-mono font-bold">{x1.TRUONG_TT_GOC}</code>:{' '}
                                      <span className="line-through text-slate-400">{x1.TT_GOC || '(trống)'}</span>{' '}
                                      ➔ <b className="text-emerald-700">{x1.TT_DIEUCHINH}</b>{' '}
                                      <span className="text-slate-500">({x1.LYDO_DIEUCHINH})</span>
                                    </div>
                                  ))}
                                  {dscp.map((cp, i) => (
                                    <div key={`cp_${i}`} className="text-slate-800">
                                      <span className="font-bold text-amber-700">
                                        [XML{cp.SOBANG_XML} #{cp.STT_XML}]
                                      </span>{' '}
                                      <code className="font-mono font-bold">{cp.TRUONG_TT_GOC}</code>:{' '}
                                      <span className="line-through text-slate-400">{cp.TT_GOC || '(trống)'}</span>{' '}
                                      ➔{' '}
                                      <b
                                        className={
                                          cp.TRANGTHAI === '2' ? 'text-rose-700' : 'text-emerald-700'
                                        }
                                      >
                                        {cp.TRANGTHAI === '2'
                                          ? 'THU HỒI / HỦY CHI PHÍ'
                                          : cp.TT_DIEUCHINH}
                                      </b>{' '}
                                      <span className="text-slate-500">({cp.LYDO_DIEUCHINH})</span>
                                    </div>
                                  ))}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeTab === 'ERRORS' ? (
            <div className="flex-1 min-h-0 overflow-auto">
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
            /* BẢNG DỮ LIỆU CHI TIẾT CHO BẢNG 1 -> BẢNG 15 (LUÔN HIỂN THỊ TIÊU ĐỀ CỘT) */
            <div className="flex-1 min-h-0 overflow-auto flex flex-col">
              <table
                className="w-full table-fixed text-[11px] border-collapse"
                style={{
                  minWidth: `${
                    (activeTab === 'XML1'
                      ? 28 +
                        getEffective3176ColWidth('__STATUS__', 94) +
                        getEffective3176ColWidth('__ACTION__', 132) +
                        getEffective3176ColWidth('__HS__', 40)
                      : getEffective3176ColWidth('__ACTION__', 62) +
                        getEffective3176ColWidth('__HS__', 40) +
                        getEffective3176ColWidth('__HOTEN_BN__', 132)) +
                    activeColumns.reduce((sum, col) => sum + getEffective3176ColWidth(col), 0)
                  }px`,
                }}
              >
                <colgroup>
                  {activeTab === 'XML1' && <col style={{ width: '28px' }} />}
                  {activeTab === 'XML1' && (
                    <col style={{ width: `${getEffective3176ColWidth('__STATUS__', 94)}px` }} />
                  )}
                  <col
                    style={{
                      width: `${getEffective3176ColWidth('__ACTION__', activeTab === 'XML1' ? 132 : 62)}px`,
                    }}
                  />
                  <col style={{ width: `${getEffective3176ColWidth('__HS__', 40)}px` }} />
                  {activeTab !== 'XML1' && (
                    <col style={{ width: `${getEffective3176ColWidth('__HOTEN_BN__', 132)}px` }} />
                  )}
                  {activeColumns.map(col => (
                    <col key={col} style={{ width: `${getEffective3176ColWidth(col)}px` }} />
                  ))}
                </colgroup>
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-xs">
                  <tr>
                    {/* Cột Tích chọn ở Bảng 1 */}
                    {activeTab === 'XML1' && (
                      <th className="border-b border-r border-slate-300 px-1 py-1 text-center sticky left-0 bg-slate-100 z-20">
                        <input
                          type="checkbox"
                          checked={
                            currentTableRows.length > 0 &&
                            currentTableRows.every(r => selectedHosoIndices.has(r.hosoIndex))
                          }
                          onChange={toggleSelectAllFilteredXml1}
                          className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                          title="Tích chọn / Bỏ chọn tất cả hồ sơ đang hiển thị để Ký số & Xuất XML"
                        />
                      </th>
                    )}

                    {/* Cột Trạng thái ký số ở Bảng 1 */}
                    {activeTab === 'XML1' && (
                      <th className="relative border-b border-r border-slate-300 px-1 py-1 text-center bg-slate-100 align-top select-none">
                        <div className="font-bold text-slate-900 text-[10px] leading-tight">TRẠNG THÁI</div>
                        <div className="text-[9.5px] font-normal text-slate-500 leading-tight">Đã ký / Chưa ký</div>
                        <div
                          onMouseDown={e => startResize3176Col(e, '__STATUS__', 94)}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            toggleExpand3176Col('__STATUS__', 94);
                          }}
                          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/70 active:bg-blue-600 z-30"
                        />
                      </th>
                    )}

                    <th
                      className={`relative border-b border-r border-slate-300 px-1 py-1 text-center bg-slate-100 align-top select-none ${
                        activeTab !== 'XML1' ? 'sticky left-0 z-20' : ''
                      }`}
                    >
                      <div className="text-[10.5px] font-bold">Thao tác</div>
                      {activeColFilterEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setColumnFilters({});
                            setCurrentPage(1);
                          }}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 text-[9.5px] font-bold transition cursor-pointer"
                          title="Xóa tất cả bộ lọc cột"
                        >
                          ✕ Bỏ lọc
                        </button>
                      )}
                      <div
                        onMouseDown={e =>
                          startResize3176Col(e, '__ACTION__', activeTab === 'XML1' ? 132 : 62)
                        }
                        onDoubleClick={e => {
                          e.stopPropagation();
                          toggleExpand3176Col('__ACTION__', activeTab === 'XML1' ? 132 : 62);
                        }}
                        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/70 active:bg-blue-600 z-30"
                      />
                    </th>

                    <th className="relative border-b border-r border-slate-300 px-1 py-1 text-center text-[10.5px] font-bold bg-slate-100 align-top select-none">
                      HS
                      <div
                        onMouseDown={e => startResize3176Col(e, '__HS__', 40)}
                        onDoubleClick={e => {
                          e.stopPropagation();
                          toggleExpand3176Col('__HS__', 40);
                        }}
                        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/70 active:bg-blue-600 z-30"
                      />
                    </th>

                    {activeTab !== 'XML1' && (
                      <th className="relative border-b border-r border-slate-300 px-1.5 py-1 text-left bg-blue-50/60 align-top select-none">
                        <div className="font-bold text-blue-900 text-[10.5px] leading-tight">HỌ TÊN BN (XML1)</div>
                        <div className="text-[9.5px] font-normal text-blue-600 leading-tight">Liên kết theo MA_LK</div>
                        <div className="relative mt-0.5">
                          <Search className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={columnFilters.__HO_TEN_BN__ || ''}
                            onChange={e => {
                              setColumnFilters(prev => ({
                                ...prev,
                                __HO_TEN_BN__: e.target.value,
                              }));
                              setCurrentPage(1);
                            }}
                            placeholder="Lọc họ tên..."
                            className="w-full pl-4.5 pr-4 py-0.5 rounded border border-blue-200 bg-white text-[10px] font-normal text-slate-700 focus:border-blue-500 outline-none"
                          />
                          {columnFilters.__HO_TEN_BN__ && (
                            <button
                              type="button"
                              onClick={() => {
                                setColumnFilters(prev => ({ ...prev, __HO_TEN_BN__: '' }));
                                setCurrentPage(1);
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <div
                          onMouseDown={e => startResize3176Col(e, '__HOTEN_BN__', 132)}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            toggleExpand3176Col('__HOTEN_BN__', 132);
                          }}
                          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/70 active:bg-blue-600 z-30"
                        />
                      </th>
                    )}

                    {activeColumns.map((col, idx) => {
                      const colFilterVal = columnFilters[col] || '';
                      const label = FIELD_LABELS_3176[col] || col;
                      return (
                        <th
                          key={col}
                          className="relative border-b border-r border-slate-300 px-1 py-1 text-left align-top select-none group/th overflow-hidden"
                          title={`${idx + 1}. ${col} — ${label} (Kéo mép phải cột để chỉnh rộng/hẹp, nhấp đúp mép phải để mở rộng nhanh)`}
                        >
                          <div className="flex items-center gap-0.5 min-w-0">
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1 rounded border border-blue-200 shrink-0 leading-tight">
                              {idx + 1}
                            </span>
                            <span className="font-mono font-bold text-[10px] text-slate-900 truncate leading-tight">
                              {col}
                            </span>
                          </div>
                          <div className="text-[9.5px] font-normal text-slate-500 leading-tight line-clamp-2 min-h-[22px] mt-0.5">
                            {label}
                          </div>
                          <div className="relative mt-0.5">
                            <Search className="w-2.5 h-2.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={colFilterVal}
                              onChange={e => {
                                const val = e.target.value;
                                setColumnFilters(prev => ({
                                  ...prev,
                                  [col]: val,
                                }));
                                setCurrentPage(1);
                              }}
                              placeholder="Lọc..."
                              className={`w-full pl-4.5 pr-4 py-0.5 rounded border text-[10px] font-normal outline-none transition ${
                                colFilterVal
                                  ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-semibold ring-1 ring-blue-400'
                                  : 'bg-white border-slate-300 text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-400'
                              }`}
                            />
                            {colFilterVal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setColumnFilters(prev => ({
                                    ...prev,
                                    [col]: '',
                                  }));
                                  setCurrentPage(1);
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Xóa lọc cột này"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {/* Thanh kéo thay đổi độ rộng cột */}
                          <div
                            onMouseDown={e => startResize3176Col(e, col)}
                            onDoubleClick={e => {
                              e.stopPropagation();
                              toggleExpand3176Col(col);
                            }}
                            title="Kéo qua trái/phải để tùy chỉnh độ rộng cột • Nhấp đúp để mở rộng/thu gọn nhanh"
                            className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/70 active:bg-blue-600 z-30 transition-colors"
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentTableRows.length === 0 ? (
                    <tr className="bg-slate-50/40">
                      {activeTab === 'XML1' && (
                        <>
                          <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-slate-300">—</td>
                          <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-slate-300">—</td>
                        </>
                      )}
                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-slate-300">—</td>
                      <td className="border-b border-r border-slate-200 px-2 py-2 text-center text-slate-300">—</td>
                      {activeTab !== 'XML1' && (
                        <td className="border-b border-r border-slate-200 px-2 py-2 text-slate-300">—</td>
                      )}
                      {activeColumns.map((col, idx) => (
                        <td
                          key={col}
                          className="border-b border-r border-slate-200 px-2.5 py-2 text-[11px] text-slate-400 italic whitespace-nowrap"
                        >
                          (Cột {idx + 1}: {col})
                        </td>
                      ))}
                    </tr>
                  ) : (
                    pagedRows.map(row => {
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
                            <td className="border-r border-slate-200 px-1 py-1 text-center sticky left-0 bg-white group-hover:bg-blue-50/90 z-10">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => toggleSelectHoso(row.hosoIndex)}
                                className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>
                          )}

                          {/* Ô Trạng thái ký số ở Bảng 1 */}
                          {activeTab === 'XML1' && (
                            <td className="border-r border-slate-200 px-1 py-1 text-center whitespace-nowrap">
                              {isSigned ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  title={
                                    signState?.subjectName
                                      ? `Đã ký bởi: ${signState.subjectName} (${signState.signingTime || ''})`
                                      : 'Hồ sơ đã có chữ ký số hợp lệ'
                                  }
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Đã ký
                                </span>
                              ) : isModified ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300"
                                  title="Nội dung hồ sơ đã được chỉnh sửa, cần ký số lại nếu xuất XML có ký số"
                                >
                                  <Edit3 className="w-2.5 h-2.5 text-blue-600" />
                                  Đã sửa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Chưa ký
                                </span>
                              )}
                            </td>
                          )}

                          {/* Ô Thao tác: Ký lẻ HS, Sửa chi tiết, Xuất lẻ HS, Xóa */}
                          <td
                            className={`border-r border-slate-200 px-1 py-1 text-center bg-white group-hover:bg-blue-50/90 ${
                              activeTab !== 'XML1' ? 'sticky left-0 z-10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-0.5">
                              {activeTab === 'XML1' && (
                                <>
                                  <button
                                    onClick={() => openCreateMau09Modal([row.hosoIndex], '1')}
                                    className="px-1.5 py-0.5 rounded bg-[#004a8f] hover:bg-blue-800 text-white font-extrabold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    title="Lập Hồ sơ điều chỉnh / thu hồi ĐNTT Mẫu số 09/BH cho bệnh nhân này"
                                  >
                                    09/BH
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAutoDownloadAfterSign(false);
                                      openSignModal(row.hosoIndex);
                                    }}
                                    className="px-1 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    title="Ký số riêng cho hồ sơ này"
                                  >
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    Ký
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openEditRowModal(row)}
                                className="px-1 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                title="Mở cửa sổ sửa toàn bộ các trường của dòng này"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
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
                                    className="px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    title={
                                      isSigned
                                        ? 'Tải file XML chuẩn (Base64) Đã ký số của riêng hồ sơ này (theo nội dung đã sửa)'
                                        : 'Tải file XML chuẩn (Base64) Không ký số của riêng hồ sơ này (theo nội dung đã sửa)'
                                    }
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    XML
                                  </button>
                                  <button
                                    onClick={() => handleExportUnencodedXml(row.hosoIndex)}
                                    className="px-1 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                                    title="Tải file XML Không mã hóa (hiển thị đầy đủ rõ ràng các thông tin trong XML) của riêng hồ sơ này"
                                  >
                                    Rõ
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteRow(row)}
                                className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="border-r border-slate-200 px-1 py-1 text-center font-mono text-[10.5px] text-slate-500">
                            #{row.hosoIndex + 1}
                          </td>

                          {activeTab !== 'XML1' && (
                            <td className="border-r border-slate-200 px-1.5 py-1 font-semibold text-[11px] text-blue-900 bg-blue-50/20 truncate" title={row.hoTen || ''}>
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
                                  title={val}
                                  onChange={e => handleInlineFieldChange(row, col, e.target.value)}
                                  className="w-full px-1.5 py-1 text-[11px] bg-transparent focus:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 font-medium text-slate-800"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {currentTableRows.length === 0 && (
                <div className="p-8 text-center">
                  <FileCode2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-sm font-bold text-slate-700">
                    Không có dữ liệu trong {activeTableMeta?.fullTitle} ({activeColumns.length} cột hiển thị phía trên)
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    File XML hiện tại không phát sinh hồ sơ ở bảng này hoặc đang bị giới hạn bởi bộ lọc. Bạn có thể bấm <b>"Thêm dòng {activeTableMeta?.tabLabel}"</b> nếu muốn bổ sung.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PHÂN TRANG (KÈM DANH SÁCH SỐ TRANG & Ô NHẬP NHẢY TỚI TRANG) */}
          <div className="shrink-0 px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              <span>
                Trang <b className="text-blue-700">{currentPage}</b> / <b>{totalPages}</b> (Tổng số:{' '}
                <b>{(activeTab === 'ERRORS' ? filteredErrors.length : currentTableRows.length).toLocaleString()}</b> dòng • Đã tích chọn:{' '}
                <b className="text-blue-700">{selectedHosoIndices.size}</b> hồ sơ)
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500">Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={50}>50 dòng/trang</option>
                  <option value={100}>100 dòng/trang</option>
                  <option value={200}>200 dòng/trang</option>
                  <option value={500}>500 dòng/trang</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {/* Ô nhập số trang trực tiếp */}
              <div className="flex items-center gap-1 mr-1 bg-white px-2 py-0.5 rounded border border-slate-300">
                <span className="text-[11px] font-semibold text-slate-600">Đến trang:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCurrentPage(Math.min(Math.max(1, val), totalPages));
                    }
                  }}
                  className="w-14 px-1.5 py-0.5 text-center font-extrabold text-blue-700 bg-blue-50/60 border border-blue-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-500 font-semibold">/ {totalPages}</span>
              </div>

              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                « Đầu
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                ‹ Trước
              </button>

              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 4) pages.push('...');
                  const start = Math.max(2, currentPage - 2);
                  const end = Math.min(totalPages - 1, currentPage + 2);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 3) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[28px] px-1.5 py-0.5 rounded border text-[11px] font-extrabold transition cursor-pointer ${
                        p === currentPage
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                Sau ›
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-[11px] cursor-pointer"
              >
                Cuối »
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
                  {smartCaProfiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
                      <label className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                        Chọn CKS SmartCA cần ký:
                      </label>
                      <select
                        value={activeSmartCaId}
                        onChange={e => {
                          const nextId = e.target.value;
                          setActiveSmartCAProfile(nextId);
                          setActiveSmartCaId(nextId);
                          setSmartCaCfg(getSmartCAConfig());
                          setSignStatusMsg(null);
                        }}
                        className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {smartCaProfiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.userId ? ` — ID: ${p.userId}` : ''}{p.serialNumber ? ` (Serial: ...${p.serialNumber.slice(-8)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Cấu hình VNPT SmartCA đang chọn:
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

              {/* Ký & Gửi hồ sơ lên Cổng BHXH qua API (guiHoSoXmlQD3176) */}
              <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-sky-900">
                  <input
                    type="checkbox"
                    checked={sendToGateway}
                    onChange={e => setSendToGateway(e.target.checked)}
                    className="accent-sky-600 w-4 h-4"
                  />
                  3. Ký xong tự động GỬI từng hồ sơ lên Cổng BHXH (API guiHoSoXmlQD3176 • loaiHoSo=130)
                </label>
                {sendToGateway && (() => {
                  const o = getOrgConfig();
                  const okCfg = !!(o.ma_cskcb && o.bhxh_account?.username && o.bhxh_account?.password);
                  return (
                    <div className="text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Tài khoản Cổng: <b className="font-mono">{o.bhxh_account?.username || '(chưa nhập)'}</b> • Mã CSKCB:{' '}
                        <b className="font-mono">{o.ma_cskcb || '—'}</b> • Mã tỉnh:{' '}
                        <b className="font-mono">{(o.ma_cskcb || '').substring(0, 2) || '—'}</b>{' '}
                        {okCfg ? '✅' : '⚠️ Chưa đủ thông tin'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSignModal(false);
                          setGatewayConfigTab(true);
                          setShowConfigModal(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer"
                      >
                        Cấu hình tài khoản Cổng
                      </button>
                    </div>
                  );
                })()}
                {sendToGateway && (
                  <p className="text-[11px] text-slate-500">
                    Mỗi file XML là một hồ sơ KCB nên hệ thống sẽ ký và gửi tách riêng từng hồ sơ đã chọn.
                  </p>
                )}
              </div>

              {gatewayResults.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-100 text-[11px] font-bold text-slate-700">
                    Kết quả gửi Cổng BHXH
                  </div>
                  <div className="max-h-40 overflow-auto divide-y divide-slate-100">
                    {gatewayResults.map((r, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-1.5 text-[11px] ${r.ok ? 'text-emerald-800 bg-emerald-50/50' : 'text-red-700 bg-red-50/50'}`}
                      >
                        <b>{r.ok ? '✅' : '❌'} {r.label}</b>
                        {r.maGD ? <> • Mã GD: <span className="font-mono">{r.maGD}</span></> : null}
                        {r.time ? <> • {r.time}</> : null}
                        {' — '}{r.message}
                      </div>
                    ))}
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
                    ? sendToGateway ? 'Đang ký & gửi Cổng BHXH...' : 'Đang thực hiện ký số...'
                    : sendToGateway
                    ? `Ký & Gửi Cổng BHXH (${getTargetHosoIndices(signTargetScope).length} HS)`
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

      {/* MODAL TẠO & CHỈNH SỬA HỒ SƠ MẪU SỐ 09/BH (4 PHẦN CHUẨN CỔNG BHXH) */}
      {mau09ModalDrafts && (
        <Mau09BhModal
          initialRecords={mau09ModalDrafts}
          tenCskcb={getOrgConfig().ten_cskcb}
          onClose={() => setMau09ModalDrafts(null)}
          onSaveRecords={handleSaveMau09ModalRecords}
        />
      )}

      {/* MODAL XEM TRƯỚC XML MẪU 09/BH (<HOSO_DIEUCHINH_GD>) */}
      {previewMau09XmlRec && (
        <div className="fixed inset-0 z-[270] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-blue-600" />
                <span>
                  XML Mẫu số 09/BH — {previewMau09XmlRec.ttXml1.HO_TEN} (MA_LK:{' '}
                  {previewMau09XmlRec.ttXml1.MA_LK}){' '}
                  {previewMau09XmlRec.isSigned ? '• [ĐÃ KÝ SỐ]' : '• [CHƯA KÝ SỐ]'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadMau09XmlFile(previewMau09XmlRec)}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải file XML
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMau09XmlRec(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs overflow-auto flex-1 leading-relaxed whitespace-pre-wrap break-all">
              {previewMau09XmlRec.isSigned && previewMau09XmlRec.signedXml
                ? previewMau09XmlRec.signedXml
                : buildMau09BhXml(previewMau09XmlRec)}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH CHUNG (VNPT SMARTCA / USB TOKEN / ĐƠN VỊ) */}
      {showConfigModal && (
        <ConfigModal
          isOpen={showConfigModal}
          initialTab={gatewayConfigTab ? 'bhyt' : undefined}
          onClose={() => {
            setShowConfigModal(false);
            setGatewayConfigTab(false);
            setSmartCaProfiles(getSmartCAProfiles());
            setActiveSmartCaId(getActiveSmartCAProfileId());
            setSmartCaCfg(getSmartCAConfig());
          }}
        />
      )}
    </div>
  );
}
