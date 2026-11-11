/**
 * BỘ XUẤT BIỂU MẪU WORD (.DOC) & IN ẤN (A4) GIẤY KHÁM SỨC KHỎE
 * THEO ĐÚNG PHỤ LỤC SỐ XXIV (Thông tư /2026/TT-BYT của Bộ trưởng Bộ Y tế)
 * -------------------------------------------------------------------------
 * Hỗ trợ:
 *   - Mẫu số 01 (ChildUnder): Trẻ em dưới 06 tuổi
 *   - Mẫu số 02 (Minor): Người từ đủ 06 tuổi đến dưới 18 tuổi
 *   - Mẫu số 03 (Adult): Người từ đủ 18 tuổi trở lên
 * Liên kết chặt chẽ 100% với dữ liệu nhập trực tiếp trên phần mềm hoặc Import từ Excel (.xlsm).
 */

import type { HoSoRecord } from './signAndSubmitService';
import {
  KskType,
  OPT_DOI_TUONG,
  OPT_NGUON_CHI_TRA,
  OPT_NGHE_NGHIEP,
  OPT_PHAN_LOAI,
  ADULT_TSBT,
  calcAgeYears,
} from './kskSchemas';
import { PROVINCES, COMMUNES_BY_PROVINCE } from './diaPhuong';
import { finalizeKskRecord, normText, parseDateValue } from './kskRecord';

/** Bảng 54 dân tộc Việt Nam để hiển thị tên dân tộc trên mẫu giấy và ánh xạ ngược sang mã 2 số */
export const DAN_TOC_MAP: Record<string, string> = {
  '01': 'Kinh',
  '02': 'Tày',
  '03': 'Thái',
  '04': 'Hoa',
  '05': 'Khơ-me',
  '06': 'Mường',
  '07': 'Nùng',
  '08': 'HMông',
  '09': 'Dao',
  '10': 'Gia-rai',
  '11': 'Ngái',
  '12': 'Ê-đê',
  '13': 'Ba-na',
  '14': 'Xơ-đăng',
  '15': 'Sán Chay',
  '16': 'Cơ-ho',
  '17': 'Chăm',
  '18': 'Sán Dìu',
  '19': 'Hrê',
  '20': 'Mnông',
  '21': 'Ra-glai',
  '22': 'Xtiêng',
  '23': 'Bru-Vân Kiều',
  '24': 'Thổ',
  '25': 'Giáy',
  '26': 'Cơ-tu',
  '27': 'Gié-Triêng',
  '28': 'Mạ',
  '29': 'Khơ-mú',
  '30': 'Co',
  '31': 'Tà-ôi',
  '32': 'Chơ-ro',
  '33': 'Kháng',
  '34': 'Xinh-mun',
  '35': 'Hà Nhì',
  '36': 'Chu-ru',
  '37': 'Lào',
  '38': 'La Chí',
  '39': 'La Ha',
  '40': 'Phù Lá',
  '41': 'La Hủ',
  '42': 'Lự',
  '43': 'Lô Lô',
  '44': 'Chứt',
  '45': 'Mảng',
  '46': 'Pà Thẻn',
  '47': 'Cơ Lao',
  '48': 'Cống',
  '49': 'Bố Y',
  '50': 'Si La',
  '51': 'Pu Péo',
  '52': 'Brâu',
  '53': 'Ơ Đu',
  '54': 'Rơ-măm',
};

export function getDanTocLabel(codeOrName: any): string {
  const s = String(codeOrName ?? '').trim();
  if (!s) return '';
  const pad2 = /^\d$/.test(s) ? `0${s}` : s;
  if (DAN_TOC_MAP[pad2]) return DAN_TOC_MAP[pad2];
  return s;
}

export function resolveDanTocCode(input: string): string {
  const s = String(input ?? '').trim();
  if (!s) return '';
  if (/^\d{1,2}$/.test(s)) return s.padStart(2, '0');
  const ns = normText(s);
  for (const [code, name] of Object.entries(DAN_TOC_MAP)) {
    if (normText(name) === ns) return code;
  }
  return s;
}

export function getOptionText(options: { value: string; label: string }[], val: any): string {
  const s = String(val ?? '').trim();
  if (!s) return '';
  const found = options.find(o => String(o.value) === s);
  if (!found) return s;
  return found.label.replace(/^\d+\s*-\s*/, '');
}

export function getPhanLoaiText(val: any): string {
  const s = String(val ?? '').trim();
  if (!s) return '';
  const found = OPT_PHAN_LOAI.find(o => o.value === s);
  if (found) return found.label;
  return s;
}

export function getProvinceName(maTinh: any): string {
  const s = String(maTinh ?? '').trim();
  if (!s) return '';
  const pad2 = /^\d$/.test(s) ? `0${s}` : s;
  return PROVINCES[pad2] || PROVINCES[s] || s;
}

export function getCommuneName(maTinh: any, maXa: any): string {
  const xa = String(maXa ?? '').trim();
  if (!xa) return '';
  const padXa = /^\d+$/.test(xa) ? xa.padStart(5, '0') : xa;
  const tinh = String(maTinh ?? '').trim();
  const padTinh = /^\d$/.test(tinh) ? `0${tinh}` : tinh;
  if (padTinh && COMMUNES_BY_PROVINCE[padTinh]) {
    const found = COMMUNES_BY_PROVINCE[padTinh].find(c => c.value === padXa || c.value === xa);
    if (found) return found.label;
  }
  for (const list of Object.values(COMMUNES_BY_PROVINCE)) {
    const found = list.find(c => c.value === padXa || c.value === xa);
    if (found) return found.label;
  }
  return xa;
}

export function formatVnDate(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  const mVn = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mVn) return `${mVn[1]}/${mVn[2]}/${mVn[3]}`;
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) return `${mIso[3]}/${mIso[2]}/${mIso[1]}`;
  const mXml = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (mXml) return `${mXml[3]}/${mXml[2]}/${mXml[1]}`;
  const d = parseDateValue(val);
  if (d && !isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return s;
}

export function splitDateParts(val: any): { dd: string; mm: string; yyyy: string } {
  const vn = formatVnDate(val);
  const m = vn.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { dd: m[1], mm: m[2], yyyy: m[3] };
  return { dd: '....', mm: '....', yyyy: '........' };
}

/**
 * Đồng bộ 2 chiều giữa mảng CLS (XML11 / Sheet DM_CanLamSang) và các ô điền trên mặt giấy Mẫu 02 & Mẫu 03
 */
export interface PaperClsFields {
  CLS_HUYET_HOC: string;
  CLS_DUONG_MAU: string;
  CLS_URE: string;
  CLS_CREATININ: string;
  CLS_GOT: string;
  CLS_GPT: string;
  CLS_NUOC_TIEU: string;
  CLS_NUOC_TIEU_KHAC: string;
  CLS_XQUANG: string;
  CLS_KHAC_CHI_TIET: string;
  CLS_DINH_KY_KET_QUA: string;
}

export const PAPER_CLS_CATALOG: Array<{
  field: keyof PaperClsFields;
  maDichVu: string;
  maChiSo: string;
  tenChiSo: string;
  donVi: string;
  keywords: string[];
}> = [
  {
    field: 'CLS_HUYET_HOC',
    maDichVu: '22.0001',
    maChiSo: 'WBC',
    tenChiSo: 'Tổng phân tích tế bào máu ngoại vi',
    donVi: 'G/L',
    keywords: ['huyet hoc', 'te bao mau', 'cong thuc mau', 'wbc', 'rbc', 'hgb', 'plt', 'bach cau', 'hong cau'],
  },
  {
    field: 'CLS_DUONG_MAU',
    maDichVu: '23.0075',
    maChiSo: 'GLU',
    tenChiSo: 'Đường máu (Glucose)',
    donVi: 'mmol/L',
    keywords: ['duong mau', 'glucose', 'duong huyet', 'glu'],
  },
  {
    field: 'CLS_URE',
    maDichVu: '23.0164',
    maChiSo: 'URE',
    tenChiSo: 'Urê máu',
    donVi: 'mmol/L',
    keywords: ['ure', 'urea', 'bun'],
  },
  {
    field: 'CLS_CREATININ',
    maDichVu: '23.0056',
    maChiSo: 'CRE',
    tenChiSo: 'Creatinin máu',
    donVi: 'µmol/L',
    keywords: ['creatinin', 'creatinine', 'cre'],
  },
  {
    field: 'CLS_GOT',
    maDichVu: '23.0023',
    maChiSo: 'AST',
    tenChiSo: 'ASAT (GOT)',
    donVi: 'U/L',
    keywords: ['asat', 'got', 'ast'],
  },
  {
    field: 'CLS_GPT',
    maDichVu: '23.0024',
    maChiSo: 'ALT',
    tenChiSo: 'ALAT (GPT)',
    donVi: 'U/L',
    keywords: ['alat', 'gpt', 'alt'],
  },
  {
    field: 'CLS_NUOC_TIEU',
    maDichVu: '23.0145',
    maChiSo: 'URN',
    tenChiSo: 'Tổng phân tích nước tiểu',
    donVi: '',
    keywords: ['nuoc tieu', 'tptnt', 'urn'],
  },
  {
    field: 'CLS_XQUANG',
    maDichVu: '18.0001',
    maChiSo: 'XQTP',
    tenChiSo: 'Chẩn đoán hình ảnh (XQ tim phổi thẳng)',
    donVi: '',
    keywords: ['xq', 'x-quang', 'x quang', 'tim phoi', 'chan doan hinh anh', 'sieu am'],
  },
];

export function extractPaperClsFromData(data: Record<string, any>): PaperClsFields {
  const res: PaperClsFields = {
    CLS_HUYET_HOC: data.CLS_HUYET_HOC || '',
    CLS_DUONG_MAU: data.CLS_DUONG_MAU || '',
    CLS_URE: data.CLS_URE || '',
    CLS_CREATININ: data.CLS_CREATININ || '',
    CLS_GOT: data.CLS_GOT || '',
    CLS_GPT: data.CLS_GPT || '',
    CLS_NUOC_TIEU: data.CLS_NUOC_TIEU || '',
    CLS_NUOC_TIEU_KHAC: data.CLS_NUOC_TIEU_KHAC || '',
    CLS_XQUANG: data.CLS_XQUANG || '',
    CLS_KHAC_CHI_TIET: data.CLS_KHAC_CHI_TIET || '',
    CLS_DINH_KY_KET_QUA: data.CLS_DINH_KY_KET_QUA || '',
  };

  const clsList: any[] = Array.isArray(data.CLS) ? data.CLS : [];
  if (clsList.length === 0) return res;

  const unmatchedSummaries: string[] = [];
  const allSummaries: string[] = [];

  for (const item of clsList) {
    const label = String(item.TEN_CHI_SO || item.MA_CHI_SO || item.MA_DICH_VU || '').trim();
    const val = String(item.GIA_TRI || item.MO_TA || item.KET_LUAN || '').trim();
    const unit = String(item.DON_VI_DO || '').trim();
    const kl = String(item.KET_LUAN || '').trim();
    if (!label && !val) continue;

    const displayVal = [val, unit].filter(Boolean).join(' ') + (kl && kl !== val ? ` (${kl})` : '');
    const fullLine = label ? `${label}: ${displayVal}` : displayVal;
    allSummaries.push(fullLine);

    const nLabel = normText(`${label} ${item.MA_CHI_SO || ''} ${item.MA_DICH_VU || ''}`);
    let matched = false;
    for (const cat of PAPER_CLS_CATALOG) {
      if (cat.keywords.some(kw => nLabel.includes(kw))) {
        if (!res[cat.field]) {
          res[cat.field] = displayVal || val || kl;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      unmatchedSummaries.push(fullLine);
    }
  }

  if (!res.CLS_KHAC_CHI_TIET && unmatchedSummaries.length > 0) {
    res.CLS_KHAC_CHI_TIET = unmatchedSummaries.join('; ');
  } else if (!res.CLS_KHAC_CHI_TIET && allSummaries.length > 0) {
    res.CLS_KHAC_CHI_TIET = allSummaries.join('; ');
  }

  if (!res.CLS_DINH_KY_KET_QUA && allSummaries.length > 0) {
    res.CLS_DINH_KY_KET_QUA = allSummaries.join('; ');
  }

  return res;
}

/**
 * Khi người dùng nhập trực tiếp vào ô CLS trên mặt giấy Mẫu 02 / Mẫu 03,
 * tự động đồng bộ vào mảng `CLS` của `formData` để XML11 luôn có đầy đủ dữ liệu.
 */
export function upsertPaperClsIntoFormData(
  prevData: Record<string, any>,
  field: keyof PaperClsFields,
  value: string
): Record<string, any> {
  const nextData: Record<string, any> = { ...prevData, [field]: value };
  const clsList: any[] = Array.isArray(prevData.CLS) ? [...prevData.CLS] : [];

  const cat = PAPER_CLS_CATALOG.find(c => c.field === field);
  if (cat) {
    const idx = clsList.findIndex(item => {
      const nLabel = normText(`${item.TEN_CHI_SO || ''} ${item.MA_CHI_SO || ''} ${item.MA_DICH_VU || ''}`);
      return item.MA_CHI_SO === cat.maChiSo || cat.keywords.some(kw => nLabel.includes(kw));
    });
    const cleanVal = String(value).trim();
    if (cleanVal) {
      const numericPart = cleanVal.replace(/\s*\(.*\)$/, '').trim();
      const entry = {
        MA_DICH_VU: idx >= 0 && clsList[idx].MA_DICH_VU ? clsList[idx].MA_DICH_VU : cat.maDichVu,
        MA_CHI_SO: idx >= 0 && clsList[idx].MA_CHI_SO ? clsList[idx].MA_CHI_SO : cat.maChiSo,
        TEN_CHI_SO: idx >= 0 && clsList[idx].TEN_CHI_SO ? clsList[idx].TEN_CHI_SO : cat.tenChiSo,
        GIA_TRI: numericPart,
        DON_VI_DO: idx >= 0 && clsList[idx].DON_VI_DO ? clsList[idx].DON_VI_DO : cat.donVi,
        MO_TA: cleanVal,
        KET_LUAN: idx >= 0 && clsList[idx].KET_LUAN ? clsList[idx].KET_LUAN : 'Bình thường',
      };
      if (idx >= 0) clsList[idx] = { ...clsList[idx], ...entry };
      else clsList.push(entry);
      nextData.CLS = clsList;
      nextData.HAS_CLS = '1';
    }
  } else if (field === 'CLS_DINH_KY_KET_QUA' || field === 'CLS_KHAC_CHI_TIET') {
    const cleanVal = String(value).trim();
    if (cleanVal && clsList.length === 0) {
      clsList.push({
        MA_DICH_VU: '23.0000',
        MA_CHI_SO: 'CLS_KQ',
        TEN_CHI_SO: 'Kết quả cận lâm sàng',
        GIA_TRI: cleanVal,
        DON_VI_DO: '',
        MO_TA: cleanVal,
        KET_LUAN: 'Bình thường',
      });
      nextData.CLS = clsList;
      nextData.HAS_CLS = '1';
    }
  }

  return nextData;
}

/* ============================================================================
 * DỰNG HTML BIỂU MẪU PHỤ LỤC XXIV CHUẨN IN A4 & XUẤT WORD (.DOC)
 * ========================================================================== */

const esc = (v: any): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const cb = (checked: boolean, label?: string): string => {
  const box = checked ? '&#9745;' : '&#9744;'; // ☑ hoặc □
  return `<span style="font-family:'Segoe UI Symbol','Times New Roman',serif;font-size:13pt;line-height:1;">${box}</span>${
    label ? ` <span>${label}</span>` : ''
  }`;
};

const dotVal = (v: any, minDots = 16): string => {
  const s = String(v ?? '').trim();
  if (s) return `<span style="font-weight:bold;border-bottom:1px dotted #333;padding:0 4px;">${esc(s)}</span>`;
  return `<span style="color:#555;">${'.'.repeat(minDots)}</span>`;
};

const sigImg = (val: any, isConclusion: boolean = false): string => {
  const s = String(val ?? '').trim();
  if (!s) return isConclusion ? '<div style="height:65px;"></div>' : '<div style="height:36px;"></div>';
  if (s.startsWith('data:image/')) {
    const maxH = isConclusion ? '120px' : '58px';
    const maxW = isConclusion ? '260px' : '150px';
    return `<div style="text-align:center;margin:2px 0;"><img src="${s}" style="max-height:${maxH};max-width:${maxW};object-fit:contain;" /></div>`;
  }
  return `<div style="text-align:center;font-style:italic;font-size:10pt;color:#047857;">[Đã ký số điện tử]</div>`;
};

/**
 * MẪU SỐ 01: GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO TRẺ EM DƯỚI 06 TUỔI
 */
function renderMau01Html(rawData: Record<string, any>): string {
  const { data } = finalizeKskRecord(rawData, 'ChildUnder');
  const d = { ...rawData, ...data };
  const ngayKhamParts = splitDateParts(d.NGAY_VAO);
  const tinhName = getProvinceName(d.MATINH_CU_TRU);
  const xaName = getCommuneName(d.MATINH_CU_TRU, d.MAXA_CU_TRU);
  const danToc = getDanTocLabel(d.MA_DAN_TOC);
  const doiTuong = getOptionText(OPT_DOI_TUONG, d.DOI_TUONG);
  const nguonChiTra = getOptionText(OPT_NGUON_CHI_TRA, d.NGUON_CHI_TRA);
  const mqh = String(d.MOI_QUAN_HE_VOI_TRE ?? '').trim();

  return `
  <div class="ksk-page">
    <div style="text-align:center;font-weight:bold;font-size:12pt;margin-bottom:2px;">Mẫu số 01</div>
    <div style="text-align:center;font-style:italic;font-size:11pt;margin-bottom:8px;">
      Giấy khám sức khỏe và khám sức khoẻ định kỳ dùng cho trẻ em dưới 06 tuổi
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:42%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div><b>${esc(d.TEN_CSKCB || d.MA_CSKCB || '.................................')}</b></div>
          <div>-------</div>
          <div style="margin-top:4px;">Số: ${dotVal(d.MA_LK ? d.MA_LK.slice(-6) : '', 6)}/GKSK-${dotVal(d.MA_CSKCB, 8)}</div>
        </td>
        <td style="width:58%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
          <div>---------------</div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;font-weight:bold;font-size:13pt;margin:10px 0 8px 0;">
      GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO<br/>TRẺ EM DƯỚI 06 TUỔI
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6px;">
      <tr>
        <td style="width:110px;vertical-align:top;border:none;padding-right:10px;">
          <div style="width:100px;height:130px;border:1px solid #000;text-align:center;padding-top:45px;font-size:10pt;font-style:italic;">
            Ảnh<br/>(4 x 6 cm)
          </div>
        </td>
        <td style="vertical-align:top;border:none;">
          <div style="font-weight:bold;text-transform:uppercase;margin-bottom:4px;">THÔNG TIN HÀNH CHÍNH</div>
          <div class="p-line">1. Họ và tên (In hoa): <b>${dotVal((d.HO_TEN || '').toUpperCase(), 28)}</b> &nbsp;&nbsp; 2. Số CCCD/Hộ chiếu/Mã định danh: ${dotVal(d.SO_CCCD, 18)}</div>
          <div class="p-line">3. Ngày sinh: ${dotVal(formatVnDate(d.NGAY_SINH), 20)} &nbsp;&nbsp;&nbsp;&nbsp; 4. Giới: ${cb(d.GIOI_TINH === '1', 'Nam')} &nbsp;&nbsp; ${cb(d.GIOI_TINH === '2', 'Nữ')}</div>
          <div class="p-line">5. Sinh non: &nbsp;&nbsp; ${cb(d.SINH_NON === '0', 'Không')} &nbsp;&nbsp; ${cb(d.SINH_NON === '1', 'Có')} &nbsp;&nbsp;&nbsp;&nbsp; 6. Tuần thai khi sinh: ${dotVal(d.TUAN_THAI, 8)} tuần</div>
          <div class="p-line">7. Dân tộc: ${dotVal(danToc, 20)} &nbsp;&nbsp;&nbsp;&nbsp; 8. Đối tượng: ${dotVal(doiTuong, 22)}</div>
          <div class="p-line">9. Nguồn chi trả: ${dotVal(nguonChiTra, 22)} &nbsp;&nbsp;&nbsp;&nbsp; 10. Nhóm máu: ${dotVal(d.NHOM_MAU, 12)} (nếu có)</div>
        </td>
      </tr>
    </table>

    <div class="p-line">11. Nơi ở hiện tại: Tỉnh/ thành: ${dotVal(tinhName, 18)} phường/ xã: ${dotVal(xaName, 18)} số nhà/ thôn/ xóm: ${dotVal(d.DIA_CHI, 20)}</div>
    <div class="p-line">12. Họ tên người đi cùng trẻ/ Người giám hộ: ${dotVal(d.HO_TEN_NGUOI_DI_CUNG || d.NGUOI_GIAM_HO, 40)}</div>
    <div class="p-line">
      13. Mối quan hệ với trẻ: &nbsp;
      ${cb(mqh === '1', 'Cha')} &nbsp;&nbsp;
      ${cb(mqh === '2', 'Mẹ')} &nbsp;&nbsp;
      ${cb(mqh === '3', 'Ông/bà')} &nbsp;&nbsp;
      ${cb(mqh === '4', 'Anh/chị')} &nbsp;&nbsp;
      ${cb(mqh === '5', 'Họ hàng')} &nbsp;&nbsp;
      ${cb(mqh === '9', 'Khác')}
    </div>
    <div class="p-line">14. Số điện thoại liên hệ: ${dotVal(d.DIEN_THOAI_NGUOI_DI_CUNG || d.DIEN_THOAI, 16)} &nbsp;&nbsp; 15. Mã định danh/CCCD người đi cùng trẻ: ${dotVal(d.SO_CCCD_NGUOI_DI_CUNG, 18)}</div>
    <div class="p-line">16. Ngày khám: ${dotVal(formatVnDate(d.NGAY_VAO), 22)} &nbsp;&nbsp; 17. Cơ sở khám: ${dotVal(d.MA_CSKCB, 25)}</div>
    <div class="p-line"><b>18. Tiền sử:</b></div>
    <div class="p-line">- Bản thân: &nbsp; ${cb(d.TSBT_MAC_BENH === '0', 'Không')} &nbsp;&nbsp; ${cb(d.TSBT_MAC_BENH === '1', 'Có')} (ghi rõ tên bệnh nếu có): ${dotVal(d.TSBT_MA_BENH, 32)}</div>
    <div class="p-line">- Gia đình: &nbsp; ${cb(d.TSGD_MAC_BENH === '0', 'Không')} &nbsp;&nbsp; ${cb(d.TSGD_MAC_BENH === '1', 'Có')} (ghi rõ tên bệnh nếu có): ${dotVal(d.TSGD_MA_BENH, 32)}</div>
    <div class="p-line">- Tiền sử tiếp xúc với người bệnh lao: &nbsp; ${cb(d.TS_TIEP_XUC_LAO === '0', 'Không')} &nbsp;&nbsp; ${cb(d.TS_TIEP_XUC_LAO === '1', 'Có')}</div>

    <div class="p-line" style="font-style:italic;margin-top:4px;">
      Tôi xin cam đoan những điều khai trên đây hoàn toàn đúng với sự thật theo sự hiểu biết của tôi.
    </div>
    <table style="width:100%;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:45%;border:none;"></td>
        <td style="width:55%;border:none;text-align:center;">
          <div style="font-style:italic;">......... ngày ${ngayKhamParts.dd} tháng ${ngayKhamParts.mm} năm ${ngayKhamParts.yyyy}</div>
          <div style="font-weight:bold;">Người đề nghị khám sức khỏe</div>
          <div style="font-style:italic;font-size:10.5pt;">(Hoặc cha/mẹ hoặc thân nhân của người bệnh) (Ký và ghi rõ họ, tên)</div>
          <div style="height:40px;"></div>
          <div><b>${esc(d.HO_TEN_NGUOI_DI_CUNG || '')}</b></div>
        </td>
      </tr>
    </table>

    <div class="sec-title">ĐÁNH GIÁ DẤU HIỆU SINH TỒN</div>
    <div class="p-line">Nhiệt độ: ${dotVal(d.NHIET_DO, 8)} độ C &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIET_DO === '1', 'Bình thường')} &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIET_DO === '2', 'Sốt')} &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIET_DO === '3', 'Hạ thân nhiệt')}</div>
    <div class="p-line">Mạch: ${dotVal(d.MACH, 8)} lần/phút &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_MACH === '1', 'Bình thường')} &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_MACH === '2' || d.DGDHST_MACH === '0', 'Nhanh')}</div>
    <div class="p-line">Nhịp thở: ${dotVal(d.NHIP_THO, 8)} lần/phút &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIP_THO === '1', 'Bình thường')} &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIP_THO === '2', 'Thở nhanh')} &nbsp;&nbsp;&nbsp; ${cb(d.DGDHST_NHIP_THO === '3', 'Thở chậm')}</div>

    <div class="sec-title">ĐÁNH GIÁ DINH DƯỠNG</div>
    <div class="p-line">Chiều dài (cm): ${dotVal(d.CHIEU_DAI, 14)} &nbsp;&nbsp;&nbsp;&nbsp; Chiều dài/Tuổi: ${dotVal(d.CHIEU_DAI_TUOI_SD, 10)} SD</div>
    <div class="p-line">Cân nặng (kg): ${dotVal(d.CAN_NANG, 14)} &nbsp;&nbsp;&nbsp;&nbsp; Cân nặng/Tuổi: ${dotVal(d.CAN_NANG_TUOI_SD, 10)} SD</div>
    <div class="p-line">Vòng đầu (cm): ${dotVal(d.VONG_DAU, 10)} &nbsp;&nbsp;&nbsp; ${cb(d.DG_VONG_DAU === '1', 'Bình thường')} &nbsp;&nbsp;&nbsp; ${cb(d.DG_VONG_DAU === '2', 'Đầu to')} &nbsp;&nbsp;&nbsp; ${cb(d.DG_VONG_DAU === '3', 'Đầu nhỏ')}</div>
    <div class="p-line">Chu vi vòng cánh tay (mm): ${dotVal(d.CHU_VI_VONG_CANH_TAY, 16)}</div>
    <div class="p-line">
      Tình trạng dinh dưỡng: &nbsp;
      ${cb(d.DGDD_BINH_THUONG === '1', 'Bình thường')} &nbsp;&nbsp;
      ${cb(d.PHU_DINH_DUONG === '1', 'Phù dinh dưỡng')} &nbsp;&nbsp;
      ${cb(d.DGDD_THIEU_MAU === '1', 'Dấu hiệu thiếu máu')}
    </div>
    <div class="p-line" style="padding-left:145px;">
      ${cb(d.DGDD_COI_XUONG === '1', 'Dấu hiệu còi xương')} &nbsp;&nbsp;
      ${cb(d.SUY_DINH_DUONG === '1', 'Suy dinh dưỡng')} &nbsp;&nbsp;
      ${cb(d.THUA_CAN_BEO_PHI === '1', 'Thừa cân/béo phì')}
    </div>

    <div class="sec-title">ĐÁNH GIÁ PHÁT TRIỂN TINH THẦN - VẬN ĐỘNG</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:72%;" rowspan="2">Hành vi và năng lực trẻ theo độ tuổi</th>
          <th style="width:28%;" colspan="2">Kết quả</th>
        </tr>
        <tr>
          <th style="width:14%;">Có</th>
          <th style="width:14%;">Không</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>- Phát triển tinh thần bình thường của trẻ theo độ tuổi</td>
          <td style="text-align:center;">${cb(d.PT_TTBT_THEO_DO_TUOI === '1')}</td>
          <td style="text-align:center;">${cb(d.PT_TTBT_THEO_DO_TUOI === '0')}</td>
        </tr>
        <tr>
          <td>- Phát triển vận động bình thường của trẻ theo độ tuổi</td>
          <td style="text-align:center;">${cb(d.PT_VDBT_THEO_DO_TUOI === '1')}</td>
          <td style="text-align:center;">${cb(d.PT_VDBT_THEO_DO_TUOI === '0')}</td>
        </tr>
        <tr>
          <td>- Trẻ có nguy cơ tự kỷ (với trẻ từ 16-30 tháng tuổi)</td>
          <td style="text-align:center;">${cb(d.NGUY_CO_TU_KY === '1')}</td>
          <td style="text-align:center;">${cb(d.NGUY_CO_TU_KY === '0')}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">ĐÁNH GIÁ TIÊM CHỦNG</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:72%;">Kiểm tra sổ tiêm chủng</th>
          <th style="width:14%;">Có</th>
          <th style="width:14%;">Không</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>- Lao (sơ sinh)</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_BCG_SS === '1')}</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_BCG_SS === '0')}</td>
        </tr>
        <tr>
          <td>- Viêm gan B mũi 1 (sơ sinh)</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_VGB_SS_MUI1 === '1')}</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_VGB_SS_MUI1 === '0')}</td>
        </tr>
        <tr>
          <td>- Tiêm chủng đầy đủ các loại vắc xin theo độ tuổi</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_DAY_DU_THEO_DO_TUOI === '1')}</td>
          <td style="text-align:center;">${cb(d.TIEM_CHUNG_DAY_DU_THEO_DO_TUOI === '0')}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">KHÁM LÂM SÀNG</div>
    <div style="font-style:italic;margin-bottom:4px;">
      Quan sát: Nét mặt/tư thế/tỷ lệ, sự đối xứng với các bộ phận cơ thể/sự chuyển động của trẻ. Tìm dấu hiệu bệnh cấp hoặc mạn tính.
    </div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:76%;">Nội dung khám</th>
          <th style="width:24%;">Họ tên và chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>1. Toàn trạng</b></div>
            <div>- Màu sắc da: &nbsp; ${cb(d.MAU_SAC_DA === '1', 'Hồng hào')} &nbsp; ${cb(d.MAU_SAC_DA === '2', 'Nhợt')} &nbsp; ${cb(d.MAU_SAC_DA === '3', 'Tím')} &nbsp; ${cb(d.MAU_SAC_DA === '4', 'Vàng')} &nbsp; ${cb(d.MAU_SAC_DA === '5', 'Sạm da')}</div>
            <div>- Lòng bàn tay: &nbsp; ${cb(d.LONG_BAN_TAY === '1', 'Bình thường (không nhợt)')} &nbsp;&nbsp; ${cb(d.LONG_BAN_TAY === '2' || d.LONG_BAN_TAY === '0', 'Không bình thường (nhợt)')}</div>
            <div style="margin-top:4px;"><b>2. Đầu - cổ</b></div>
            <div><b>2.1. Khám đầu - cổ</b></div>
            <div>- Thóp (trẻ nhỏ còn thóp): &nbsp; ${cb(d.THOP === '1', 'Bình thường')} &nbsp; ${cb(d.THOP === '2', 'Rộng')} &nbsp; ${cb(d.THOP === '3', 'Hẹp')} &nbsp; ${cb(d.THOP === '4', 'Thóp phồng')}</div>
            <div>- Kích thước và hình dạng đầu: &nbsp; ${cb(d.HINH_DANG_DAU === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HINH_DANG_DAU === '0', 'Không bình thường')}</div>
            <div>- Vận động cổ: &nbsp; ${cb(d.VAN_DONG_CO === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.VAN_DONG_CO === '2' || d.VAN_DONG_CO === '0', 'Giới hạn')}</div>
            <div>- Khối bất thường: &nbsp; ${cb(d.KHOI_BAT_THUONG_DAU_CO === '0', 'Không')} &nbsp;&nbsp; ${cb(d.KHOI_BAT_THUONG_DAU_CO === '1', 'Có')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_DA_DAU_CO)}</td>
        </tr>
        <tr>
          <td>
            <div><b>2.2. Khám mắt</b></div>
            <div>- Vị trí 2 mắt: &nbsp; ${cb(d.VI_TRI_HAI_MAT === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.VI_TRI_HAI_MAT === '2' || d.VI_TRI_HAI_MAT === '0', '2 mắt xa nhau')}</div>
            <div>- Mí mắt và kết mạc: &nbsp; ${cb(d.MI_MAT_KET_MAC === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.MI_MAT_KET_MAC === '2', 'Sưng/ đỏ')} &nbsp;&nbsp; ${cb(d.MI_MAT_KET_MAC === '3', 'Chảy ghèn/mủ')}</div>
            <div>- Đồng tử (kích thước, phản xạ): &nbsp; ${cb(d.DONG_TU === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.DONG_TU === '0', 'Không bình thường')}</div>
            <div>- Lác mắt: &nbsp; ${cb(d.LAC_MAT === '0', 'Không')} &nbsp;&nbsp; ${cb(d.LAC_MAT === '1', 'Có')}</div>
            <div style="margin-top:4px;"><b>2.3. Khám tai</b></div>
            <div>- Tai và màng nhĩ: &nbsp; ${cb(d.TAI_MANG_NHI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.TAI_MANG_NHI === '0', 'Không bình thường')}</div>
            <div>- Đáp ứng với âm thanh: &nbsp; ${cb(d.DAP_UNG_AM_THANH === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.DAP_UNG_AM_THANH === '0', 'Không bình thường')}</div>
            <div>- Có khối sưng sau tai: &nbsp; ${cb(d.KHOI_SUNG_SAU_TAI === '0', 'Không')} &nbsp;&nbsp; ${cb(d.KHOI_SUNG_SAU_TAI === '1', 'Có')}</div>
            <div>- Dấu hiệu chảy mủ, nước tai: &nbsp; ${cb(d.CHAY_MU_NUOC_TAI === '0', 'Không')} &nbsp;&nbsp; ${cb(d.CHAY_MU_NUOC_TAI === '1', 'Có')}</div>
            <div style="margin-top:4px;"><b>2.4. Khám mũi - họng</b></div>
            <div>- Hình dạng mũi: &nbsp; ${cb(d.HINH_DANG_MUI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HINH_DANG_MUI === '2', 'Mũi to, dày')} &nbsp;&nbsp; ${cb(d.HINH_DANG_MUI === '3', 'Bất sản xương mũi')}</div>
            <div>- Chảy nước mũi: &nbsp; ${cb(d.CHAY_NUOC_MUI === '0', 'Không')} &nbsp;&nbsp; ${cb(d.CHAY_NUOC_MUI === '1', 'Có')}</div>
            <div>- Nghẹt mũi: &nbsp; ${cb(d.NGHET_MUI === '0', 'Không')} &nbsp;&nbsp; ${cb(d.NGHET_MUI === '1', 'Có')}</div>
            <div>- Họng: &nbsp; ${cb(d.HONG === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HONG === '0', 'Không bình thường')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_MAT_TAI_MUI_HONG)}</td>
        </tr>
        <tr>
          <td>
            <div><b>2.5. Khám miệng, răng (với trẻ đã có răng)</b></div>
            <div>- Hình dạng miệng: &nbsp; ${cb(d.HINH_DANG_MIENG === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HINH_DANG_MIENG === '2' || d.HINH_DANG_MIENG === '0', 'Sứt môi, chẻ vòm')}</div>
            <div>- Răng sữa sơ sinh: &nbsp; ${cb(d.RANG_SUA_SO_SINH === '0', 'Không')} &nbsp;&nbsp; ${cb(d.RANG_SUA_SO_SINH === '1', 'Có')}</div>
            <div>- Hình dạng lưỡi: &nbsp; ${cb(d.HINH_DANG_LUOI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HINH_DANG_LUOI === '2' || d.HINH_DANG_LUOI === '0', 'Lưỡi to bè')}</div>
            <div>- Dính thắng lưỡi: &nbsp; ${cb(d.DINH_THANG_LUOI === '0', 'Không')} &nbsp;&nbsp; ${cb(d.DINH_THANG_LUOI === '1', 'Có')}</div>
            <div>- Nấm miệng: &nbsp; ${cb(d.NAM_MIENG === '0', 'Không')} &nbsp;&nbsp; ${cb(d.NAM_MIENG === '1', 'Có')}</div>
            <div>- Cằm nhỏ, tụt về sau: &nbsp; ${cb(d.CAM_NHO_TUT_VE_SAU === '0', 'Không')} &nbsp;&nbsp; ${cb(d.CAM_NHO_TUT_VE_SAU === '1', 'Có')}</div>
            <div>- Vết sâu, mảng bám, lỗ trên răng: &nbsp; ${cb(d.SAU_MANG_BAM_LO === '0', 'Không')} &nbsp;&nbsp; ${cb(d.SAU_MANG_BAM_LO === '1', 'Có')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_MIENG_RANG)}</td>
        </tr>
        <tr>
          <td>
            <div><b>3. Hô hấp</b></div>
            <div>- Nhịp thở không đều: &nbsp; ${cb(d.NHIP_THO_KHONG_DEU === '0', 'Không')} &nbsp;&nbsp; ${cb(d.NHIP_THO_KHONG_DEU === '1', 'Có cơn ngưng thở trên 5 giây')}</div>
            <div>- Thở rút lõm lồng ngực: &nbsp; ${cb(d.THO_RUT_LOM_LONG_NGUC === '0', 'Không')} &nbsp;&nbsp; ${cb(d.THO_RUT_LOM_LONG_NGUC === '1', 'Có')}</div>
            <div>- Tiếng thở bất thường: &nbsp; ${cb(d.TIENG_THO_BAT_THUONG === '0', 'Không')} &nbsp;&nbsp; ${cb(d.TIENG_THO_BAT_THUONG === '1', 'Có')}</div>
            <div>- Dấu hiệu suy hô hấp: &nbsp; ${cb(d.SUY_HO_HAP === '0', 'Không')} &nbsp;&nbsp; ${cb(d.SUY_HO_HAP === '1', 'Có')}</div>
            <div>- Nghe phổi: &nbsp; ${cb(d.NGHE_PHOI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.NGHE_PHOI === '0', 'Không bình thường')}</div>
            <div style="margin-top:4px;"><b>4. Tim mạch</b></div>
            <div>- Vị trí mỏm tim: &nbsp; ${cb(d.VI_TRI_MOM_TIM === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.VI_TRI_MOM_TIM === '0', 'Không bình thường')}</div>
            <div>- Mạch ngoại vi (mạch quay-bẹn): &nbsp; ${cb(d.MACH_NGOAI_VI === '1', 'Bắt rõ')} &nbsp;&nbsp; ${cb(d.MACH_NGOAI_VI === '2', 'Mạch nhẹ')} &nbsp;&nbsp; ${cb(d.MACH_NGOAI_VI === '3' || d.MACH_NGOAI_VI === '0', 'Không bắt được')}</div>
            <div>- Nghe tim (loạn nhịp, tiếng thổi): &nbsp; ${cb(d.TIENG_TIM === '0', 'Không')} &nbsp;&nbsp; ${cb(d.TIENG_TIM === '1', 'Có')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_HO_HAP_TIM_MACH)}</td>
        </tr>
        <tr>
          <td>
            <div><b>5. Bụng và cơ quan sinh dục</b></div>
            <div>- Hình dáng bụng, rốn: &nbsp; ${cb(d.HINH_DANG_BUNG_RON === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.HINH_DANG_BUNG_RON === '0', 'Không bình thường')}</div>
            <div>- Gan, lách to: &nbsp; ${cb(d.GAN_LACH_TO === '0', 'Không')} &nbsp;&nbsp; ${cb(d.GAN_LACH_TO === '1', 'Có')}</div>
            <div>- Khối bất thường: &nbsp; ${cb(d.KHOI_BAT_THUONG === '0', 'Không')} &nbsp;&nbsp; ${cb(d.KHOI_BAT_THUONG === '1', 'Có')}</div>
            <div>- Lỗ hậu môn: &nbsp; ${cb(d.LO_HAU_MON === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.LO_HAU_MON === '0', 'Không bình thường')}</div>
            <div>- Cơ quan sinh dục ngoài: &nbsp; ${cb(d.CO_QUAN_SINH_DUC_NGOAI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.CO_QUAN_SINH_DUC_NGOAI === '0', 'Không bình thường')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_BUNG_SINH_DUC)}</td>
        </tr>
        <tr>
          <td>
            <div><b>6. Cơ xương và thần kinh</b></div>
            <div>- Vận động không đối xứng: &nbsp; ${cb(d.VAN_DONG_KHONG_DOI_XUNG === '0', 'Không')} &nbsp;&nbsp; ${cb(d.VAN_DONG_KHONG_DOI_XUNG === '1', 'Có')}</div>
            <div>- Phản xạ bú: &nbsp; ${cb(d.PHAN_XA_BU === '0', 'Không')} &nbsp;&nbsp; ${cb(d.PHAN_XA_BU === '1', 'Có')}</div>
            <div>- Phản xạ nắm: &nbsp; ${cb(d.PHAN_XA_NAM === '0', 'Không')} &nbsp;&nbsp; ${cb(d.PHAN_XA_NAM === '1', 'Có')}</div>
            <div>- Phản xạ Moro: &nbsp; ${cb(d.PHAN_XA_MORO === '0', 'Không')} &nbsp;&nbsp; ${cb(d.PHAN_XA_MORO === '1', 'Có')}</div>
            <div>- Trương lực cơ: &nbsp; ${cb(d.TRUONG_LUC_CO === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.TRUONG_LUC_CO === '2', 'Tăng')} &nbsp;&nbsp; ${cb(d.TRUONG_LUC_CO === '3', 'Giảm')}</div>
            <div>- Khớp háng: &nbsp; ${cb(d.KHOP_HANG === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.KHOP_HANG === '2' || d.KHOP_HANG === '0', 'Trật khớp háng')}</div>
            <div>- Phản xạ cơ: &nbsp; ${cb(d.PHAN_XA_CO === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.PHAN_XA_CO === '0', 'Không bình thường')}</div>
            <div>- Kiểm tra lưng, cột sống: &nbsp; ${cb(d.KIEM_TRA_LUNG_COT_SONG === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.KIEM_TRA_LUNG_COT_SONG === '0', 'Không bình thường')}</div>
            <div>- Khám tứ chi và khớp: &nbsp; ${cb(d.TU_CHI_KHOP === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.TU_CHI_KHOP === '0', 'Không bình thường')}</div>
            <div>- Quan sát dáng đi: &nbsp; ${cb(d.QUAN_SAT_DANG_DI === '1', 'Bình thường')} &nbsp;&nbsp; ${cb(d.QUAN_SAT_DANG_DI === '0', 'Không bình thường')}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_THAN_KINH_CO_XUONG_KHOP)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">KẾT LUẬN VÀ TƯ VẤN</div>
    <div class="p-line"><b>Kết luận về sức khỏe:</b></div>
    <div class="p-line">${cb(d.BINH_THUONG === '1', 'Bình thường.')}</div>
    <div class="p-line">${cb(d.NGUY_CO_MAC_LAO === '1', 'Có nguy cơ mắc lao (tiền sử tiếp xúc).')}</div>
    <div class="p-line">${cb(d.VAN_DE_SUC_KHOE === '1', 'Có vấn đề về sức khỏe.')}</div>
    <div class="p-line">Ghi rõ: ${dotVal([d.GHI_RO_VAN_DE_SUC_KHOE, d.KET_LUAN_BENH].filter(Boolean).join(' - '), 55)}</div>
    <div class="p-line">
      Tư vấn và hẹn khám lần sau (${cb(d.HEN_KHAM_LAN_SAU === '1', 'Có hẹn khám')}) hoặc chuyển cơ sở khám bệnh, chữa bệnh để khám chuyên khoa, điều trị bệnh (${cb(d.CHUYEN_CSKCB === '1', 'Chuyển CSKCB')}).
    </div>

    <table style="width:100%;border:none;margin-top:12px;">
      <tr>
        <td style="width:50%;border:none;"></td>
        <td style="width:50%;border:none;text-align:center;">
          <div style="font-style:italic;">${esc(d.DIA_DANH_KET_LUAN || '.........')} ngày ${esc(d.NGAY_KET_LUAN_DD || ngayKhamParts.dd)} tháng ${esc(d.NGAY_KET_LUAN_MM || ngayKhamParts.mm)} năm ${esc(d.NGAY_KET_LUAN_YYYY || ngayKhamParts.yyyy)}</div>
          <div style="font-weight:bold;">NGƯỜI KẾT LUẬN</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</div>
          <div style="min-height:55px;padding:4px 0;">${sigImg(d.CKDT_KET_LUAN, true)}</div>
          ${d.NGUOI_KET_LUAN ? `<div style="font-weight:bold;">${esc(d.NGUOI_KET_LUAN)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * MẪU SỐ 02: GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO NGƯỜI TỪ ĐỦ 06 TUỔI ĐẾN DƯỚI 18 TUỔI
 */
function renderMau02Html(rawData: Record<string, any>): string {
  const { data } = finalizeKskRecord(rawData, 'Minor');
  const d = { ...rawData, ...data };
  const paperCls = extractPaperClsFromData(d);
  const ngayKhamParts = splitDateParts(d.NGAY_VAO);
  const capParts = splitDateParts(d.NGAYCAP_CCCD);
  const tinhName = getProvinceName(d.MATINH_CU_TRU);
  const xaName = getCommuneName(d.MATINH_CU_TRU, d.MAXA_CU_TRU);
  const danToc = getDanTocLabel(d.MA_DAN_TOC);
  const doiTuong = getOptionText(OPT_DOI_TUONG, d.DOI_TUONG);
  const nguonChiTra = getOptionText(OPT_NGUON_CHI_TRA, d.NGUON_CHI_TRA);
  const age = calcAgeYears(d.NGAY_SINH, parseDateValue(d.NGAY_VAO) || new Date());
  const mqh = String(d.MOI_QUAN_HE_VOI_TRE ?? '').trim();

  const vaccines: Array<[string, string, string]> = [
    ['1', 'BCG', d.TIEM_CHUNG_BCG || ''],
    ['2', 'Bạch hầu, ho gà, uốn ván', d.TIEM_CHUNG_BH_HG_UV || ''],
    ['3', 'Sởi', d.TIEM_CHUNG_SOI || ''],
    ['4', 'Bại liệt', d.TIEM_CHUNG_BAI_LIET || ''],
    ['5', 'Viêm não Nhật Bản B', d.TIEM_CHUNG_VNNB_B || ''],
    ['6', 'Viêm gan B', d.TIEM_CHUNG_VGB || ''],
    ['7', `Các loại khác${d.TIEM_CHUNG_VAC_XIN_KHAC ? ` (${esc(d.TIEM_CHUNG_VAC_XIN_KHAC)})` : ''}`, d.TIEM_CHUNG_CAC_LOAI_KHAC || ''],
  ];

  return `
  <div class="ksk-page">
    <div style="text-align:center;font-weight:bold;font-size:12pt;margin-bottom:2px;">Mẫu số 02</div>
    <div style="text-align:center;font-style:italic;font-size:11pt;margin-bottom:8px;">
      Giấy khám sức khỏe và khám sức khoẻ định kỳ dùng cho người từ đủ 06 tuổi đến dưới 18 tuổi
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:42%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div><b>${esc(d.TEN_CSKCB || d.MA_CSKCB || '.................................')}</b></div>
          <div>-------</div>
          <div style="margin-top:4px;">Số: ${dotVal(d.MA_LK ? d.MA_LK.slice(-6) : '', 6)}/GKSK-${dotVal(d.MA_CSKCB, 8)}</div>
        </td>
        <td style="width:58%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
          <div>---------------</div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;font-weight:bold;font-size:13pt;margin:10px 0 8px 0;">
      GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHOẺ ĐỊNH KỲ DÙNG CHO<br/>NGƯỜI TỪ ĐỦ 06 TUỔI ĐẾN DƯỚI 18 TUỔI
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6px;">
      <tr>
        <td style="width:110px;vertical-align:top;border:none;padding-right:10px;">
          <div style="width:100px;height:130px;border:1px solid #000;text-align:center;padding-top:45px;font-size:10pt;font-style:italic;">
            Ảnh<br/>(4 x 6 cm)
          </div>
        </td>
        <td style="vertical-align:top;border:none;">
          <div class="p-line">1. Họ và tên (viết chữ in hoa): <b>${dotVal((d.HO_TEN || '').toUpperCase(), 35)}</b></div>
          <div class="p-line">2. Giới tính: ${cb(d.GIOI_TINH === '1', 'Nam')} &nbsp;&nbsp; ${cb(d.GIOI_TINH === '2', 'Nữ')} &nbsp;&nbsp;&nbsp; 3. Ngày tháng năm sinh: ${dotVal(formatVnDate(d.NGAY_SINH), 16)}; Tuổi: ${dotVal(age !== null ? String(age) : '', 6)}</div>
          <div class="p-line">4. Số CCCD/Hộ chiếu/Mã định danh: ${dotVal(d.SO_CCCD, 28)}</div>
          <div class="p-line">5. Cấp ngày ${capParts.dd}/${capParts.mm}/${capParts.yyyy} &nbsp;&nbsp; Nơi cấp: ${dotVal(d.NOICAP_CCCD, 25)}</div>
          <div class="p-line">6. Dân tộc: ${dotVal(danToc, 18)} &nbsp;&nbsp;&nbsp; 7. Đối tượng: ${dotVal(doiTuong, 22)}</div>
          <div class="p-line">8. Nguồn chi trả: ${dotVal(nguonChiTra, 20)} &nbsp;&nbsp;&nbsp; 9. Nhóm máu: ${dotVal(d.NHOM_MAU, 12)} (nếu có)</div>
        </td>
      </tr>
    </table>

    <div class="p-line">10. Nơi ở hiện tại: Tỉnh/ thành: ${dotVal(tinhName, 18)} phường/ xã: ${dotVal(xaName, 18)} số nhà/ thôn/ xóm: ${dotVal(d.DIA_CHI, 20)}</div>
    <div class="p-line">11. Họ tên người đi cùng trẻ/ Người giám hộ (đối với trẻ ≤16 tuổi): ${dotVal(d.NGUOI_GIAM_HO || d.HO_TEN_NGUOI_DI_CUNG, 35)}</div>
    <div class="p-line">
      12. Mối quan hệ với trẻ: &nbsp;
      ${cb(mqh === '1', 'Cha')} &nbsp;&nbsp;
      ${cb(mqh === '2', 'Mẹ')} &nbsp;&nbsp;
      ${cb(mqh === '3', 'Ông/bà')} &nbsp;&nbsp;
      ${cb(mqh === '4', 'Anh/chị')} &nbsp;&nbsp;
      ${cb(mqh === '5', 'Họ hàng')} &nbsp;&nbsp;
      ${cb(mqh === '9', 'Khác')}
    </div>
    <div class="p-line">13. Lý do khám sức khỏe: ${dotVal(d.LY_DO_VV, 50)}</div>

    <div class="sec-title">TIỀN SỬ BỆNH TẬT</div>
    <div class="p-line"><b>1. Tiền sử gia đình</b></div>
    <div class="p-line">Có ai trong gia đình mắc các bệnh bẩm sinh hoặc bệnh truyền nhiễm không:</div>
    <div class="p-line">a) ${cb(d.TSGD_MAC_BENH === '0', 'Không')} &nbsp;&nbsp;&nbsp; b) ${cb(d.TSGD_MAC_BENH === '1', 'Có')}; Nếu “có”, đề nghị ghi cụ thể tên bệnh: ${dotVal(d.TSGD_MA_BENH, 35)}</div>

    <div class="p-line" style="margin-top:4px;"><b>2. Tiền sử bản thân:</b></div>
    <div class="p-line"><b>a) Sản khoa:</b></div>
    <div class="p-line">${cb(d.SAN_KHOA === '1', 'Bình thường.')}</div>
    <div class="p-line">
      ${cb(d.SAN_KHOA === '0', 'Không bình thường:')} Đẻ thiếu tháng; Đẻ thừa cân; Đẻ có can thiệp; Đẻ ngạt; Mẹ bị bệnh trong thời kỳ mang thai (Nếu có cần ghi rõ tên bệnh):
      ${dotVal([d.SAN_KHOA_KHONG_BT, d.MA_BENH_SAN_KHOA_KHONG_BT].filter(Boolean).join(' - '), 35)}
    </div>

    <div class="p-line" style="margin-top:4px;"><b>b) Tiêm chủng:</b></div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:8%;" rowspan="2">STT</th>
          <th style="width:50%;" rowspan="2">Loại vắc xin</th>
          <th style="width:42%;" colspan="3">Tình trạng tiêm/uống vắc xin</th>
        </tr>
        <tr>
          <th style="width:14%;">Có</th>
          <th style="width:14%;">Không</th>
          <th style="width:14%;">Không nhớ rõ</th>
        </tr>
      </thead>
      <tbody>
        ${vaccines
          .map(
            ([stt, name, val]) => `
          <tr>
            <td style="text-align:center;">${stt}</td>
            <td>${name}</td>
            <td style="text-align:center;">${cb(val === '1')}</td>
            <td style="text-align:center;">${cb(val === '0')}</td>
            <td style="text-align:center;">${cb(val === '99')}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="p-line" style="margin-top:4px;"><b>c) Tiền sử bệnh/tật: (Các bệnh bẩm sinh và mãn tính)</b></div>
    <div class="p-line">${cb(d.TSBT_MAC_BENH === '0', 'Không')} &nbsp;&nbsp;&nbsp;&nbsp; ${cb(d.TSBT_MAC_BENH === '1', 'Có')} &nbsp;&nbsp; Nếu “có”: ghi cụ thể tên bệnh: ${dotVal(d.TSBT_MA_BENH, 35)}</div>

    <div class="p-line" style="margin-top:4px;"><b>d) Hiện tại có đang điều trị bệnh gì không?</b></div>
    <div class="p-line">${cb(d.TSBT_DANG_DIEU_TRI_BENH === '0', 'Không')} &nbsp;&nbsp;&nbsp;&nbsp; ${cb(d.TSBT_DANG_DIEU_TRI_BENH === '1', 'Có')} &nbsp;&nbsp; Nếu có, ghi rõ tên bệnh và liệt kê các thuốc đang dùng: ${dotVal(d.BENH_DANG_DIEU_TRI, 30)}</div>

    <div class="p-line" style="font-style:italic;margin-top:4px;">
      Tôi xin cam đoan những điều khai trên đây hoàn toàn đúng với sự thật theo sự hiểu biết của tôi.
    </div>
    <table style="width:100%;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:45%;border:none;"></td>
        <td style="width:55%;border:none;text-align:center;">
          <div style="font-style:italic;">......... ngày ${ngayKhamParts.dd} tháng ${ngayKhamParts.mm} năm ${ngayKhamParts.yyyy}</div>
          <div style="font-weight:bold;">Người đề nghị khám sức khỏe</div>
          <div style="font-style:italic;font-size:10.5pt;">(Hoặc cha/mẹ hoặc thân nhân của người bệnh) (Ký và ghi rõ họ, tên)</div>
          <div style="height:40px;"></div>
          <div><b>${esc(d.NGUOI_GIAM_HO || d.HO_TEN || '')}</b></div>
        </td>
      </tr>
    </table>

    <div class="sec-title">I. KHÁM THỂ LỰC</div>
    <div class="p-line">- Chiều cao: ${dotVal(d.CHIEU_CAO, 12)} cm; &nbsp;&nbsp; - Cân nặng: ${dotVal(d.CAN_NANG, 12)} Kg; &nbsp;&nbsp; - Chỉ số BMI: ${dotVal(d.CHI_SO_BMI || d.BMI, 10)}</div>
    <div class="p-line">- Mạch: ${dotVal(d.MACH, 12)} lần/phút; &nbsp;&nbsp; - Huyết áp: ${dotVal(d.HUYET_AP, 14)} mmHg</div>

    <div class="sec-title">II. KHÁM LÂM SÀNG</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:74%;">Nội dung khám</th>
          <th style="width:26%;">Họ tên và chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>1. Nhi khoa</b></div>
            <div>a) Tuần hoàn: ${dotVal(d.NHI_KHOA_TUAN_HOAN, 38)}</div>
            <div>b) Hô hấp: ${dotVal(d.NHI_KHOA_HO_HAP, 40)}</div>
            <div>c) Tiêu hóa: ${dotVal(d.NHI_KHOA_TIEU_HOA, 40)}</div>
            <div>d) Thận-Tiết niệu, Sinh dục: ${dotVal(d.NHI_KHOA_THAN_TN_SD, 30)}</div>
            <div>đ) Thần kinh: ${dotVal(d.NHI_KHOA_THAN_KINH, 38)}</div>
            <div>e) Tâm thần: ${dotVal(d.NHI_KHOA_TAM_THAN, 38)}</div>
            <div>g) Khám lâm sàng khác: ${dotVal(d.NHI_KHOA_LAM_SANG_KHAC, 32)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_NHI_KHOA_TUAN_HOAN || d.CKDT_NHI_KHOA_HO_HAP)}</td>
        </tr>
        <tr>
          <td>
            <div><b>2. Mắt:</b></div>
            <div>- Kết quả khám thị lực: &nbsp; Không kính: Mắt phải ${dotVal(d.KHONG_KINH_MAT_PHAI, 8)} Mắt trái ${dotVal(d.KHONG_KINH_MAT_TRAI, 8)}</div>
            <div style="padding-left:140px;">Có kính: &nbsp;&nbsp;&nbsp;&nbsp; Mắt phải ${dotVal(d.CO_KINH_MAT_PHAI, 8)} Mắt trái ${dotVal(d.CO_KINH_MAT_TRAI, 8)}</div>
            <div>- Các bệnh về mắt (nếu có): ${dotVal(d.BENH_KHAC_MAT, 36)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_MAT)}</td>
        </tr>
        <tr>
          <td>
            <div><b>3. Tai - Mũi - Họng</b></div>
            <div>- Kết quả khám thính lực:</div>
            <div style="padding-left:14px;">Tai trái: Nói thường ${dotVal(d.TAI_TRAI_NOI_THUONG, 8)} m; &nbsp; Nói thầm ${dotVal(d.TAI_TRAI_NOI_THAM, 8)} m</div>
            <div style="padding-left:14px;">Tai phải: Nói thường ${dotVal(d.TAI_PHAI_NOI_THUONG, 8)} m; &nbsp; Nói thầm ${dotVal(d.TAI_PHAI_NOI_THAM, 8)} m</div>
            <div>- Các bệnh về tai mũi họng (nếu có): ${dotVal(d.BENH_KHAC_TAI_MUI_HONG || d.BENH_TAI_MUI_HONG, 30)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_TAI_MUI_HONG)}</td>
        </tr>
        <tr>
          <td>
            <div><b>4. Răng - Hàm - Mặt</b></div>
            <div>- Kết quả khám: &nbsp; Hàm trên: ${dotVal(d.HAM_TREN, 36)}</div>
            <div style="padding-left:108px;">Hàm dưới: ${dotVal(d.HAM_DUOI, 36)}</div>
            <div>- Các bệnh về răng hàm mặt (nếu có): ${dotVal(d.BENH_KHAC_RANG_HAM_MAT || d.BENH_RANG_HAM_MAT, 30)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_RANG_HAM_MAT)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">III. KHÁM CẬN LÂM SÀNG</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:74%;">Nội dung khám</th>
          <th style="width:26%;">Họ tên, chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div>Cận lâm sàng thực hiện theo chỉ định của bác sỹ:</div>
            <div>Kết quả: ${dotVal(paperCls.CLS_DINH_KY_KET_QUA, 55)}</div>
            ${
              Array.isArray(d.CLS) && d.CLS.length > 0
                ? `<div style="margin-top:4px;"><b>Danh sách DVKT Cận lâm sàng đã thực hiện:</b></div>` +
                  d.CLS.map(
                    (c: any, idx: number) =>
                      `<div style="padding-left:10px;">${idx + 1}. <b>${esc(c.TEN_CHI_SO || c.MA_CHI_SO || c.MA_DICH_VU || 'DVKT')}</b>${
                        c.MA_DICH_VU ? ` (${esc(c.MA_DICH_VU)})` : ''
                      }: <b>${esc(c.GIA_TRI || c.MO_TA || '')}</b> ${esc(c.DON_VI_DO || '')} ${
                        c.KET_LUAN ? `- <i>${esc(c.KET_LUAN)}</i>` : ''
                      }</div>`
                  ).join('')
                : ''
            }
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_CLS)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">IV. KẾT LUẬN CHUNG:</div>
    <div class="p-line">Tình trạng sức khỏe; mắc các bệnh, tật (nếu có): ${dotVal([d.CAC_VAN_DE_SUC_KHOE, d.KET_LUAN_BENH, d.CAC_BENH_TAT_NEU_CO].filter(Boolean).join('; '), 42)}</div>
    <div class="p-line">Phân loại sức khỏe (theo quy định của Bộ Y tế): <b>${dotVal(getPhanLoaiText(d.PHAN_LOAI_SK), 35)}</b></div>

    <table style="width:100%;border:none;margin-top:12px;">
      <tr>
        <td style="width:50%;border:none;"></td>
        <td style="width:50%;border:none;text-align:center;">
          <div style="font-style:italic;">${esc(d.DIA_DANH_KET_LUAN || '.........')} ngày ${esc(d.NGAY_KET_LUAN_DD || ngayKhamParts.dd)} tháng ${esc(d.NGAY_KET_LUAN_MM || ngayKhamParts.mm)} năm ${esc(d.NGAY_KET_LUAN_YYYY || ngayKhamParts.yyyy)}</div>
          <div style="font-weight:bold;">NGƯỜI KẾT LUẬN</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</div>
          <div style="min-height:55px;padding:4px 0;">${sigImg(d.CKDT_KET_LUAN, true)}</div>
          ${d.NGUOI_KET_LUAN ? `<div style="font-weight:bold;">${esc(d.NGUOI_KET_LUAN)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
  `;
}

/**
 * MẪU SỐ 03: GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHỎE ĐỊNH KỲ DÙNG CHO NGƯỜI TỪ ĐỦ 18 TUỔI TRỞ LÊN
 */
function renderMau03Html(rawData: Record<string, any>): string {
  const { data } = finalizeKskRecord(rawData, 'Adult');
  const d = { ...rawData, ...data };
  const paperCls = extractPaperClsFromData(d);
  const ngayKhamParts = splitDateParts(d.NGAY_VAO);
  const capParts = splitDateParts(d.NGAYCAP_CCCD);
  const tinhName = getProvinceName(d.MATINH_CU_TRU);
  const xaName = getCommuneName(d.MATINH_CU_TRU, d.MAXA_CU_TRU);
  const danToc = getDanTocLabel(d.MA_DAN_TOC);
  const doiTuong = getOptionText(OPT_DOI_TUONG, d.DOI_TUONG);
  const nguonChiTra = getOptionText(OPT_NGUON_CHI_TRA, d.NGUON_CHI_TRA);
  const ngheNghiep = getOptionText(OPT_NGHE_NGHIEP, d.MA_NGHE_NGHIEP);
  const age = calcAgeYears(d.NGAY_SINH, parseDateValue(d.NGAY_VAO) || new Date());

  // Bảng đôi Tiền sử bản thân (mục 1-11 bên trái, mục 12-22 bên phải giống hệt Mẫu số 03 trong Word)
  const tsbtRowsHtml: string[] = [];
  for (let i = 0; i < 11; i++) {
    const [leftKey, leftLabel] = ADULT_TSBT[i];
    const [rightKey, rightLabel] = ADULT_TSBT[i + 11];
    const leftVal = String(d[leftKey] ?? '0');
    const rightVal = String(d[rightKey] ?? '0');
    const rightText =
      i + 11 === 21
        ? `${esc(rightLabel)} (ghi rõ): ${dotVal(d.TSBT_MA_BENH_KHAC, 14)}`
        : esc(rightLabel);

    tsbtRowsHtml.push(`
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${esc(leftLabel)}</td>
        <td style="text-align:center;">${cb(leftVal === '1')}</td>
        <td style="text-align:center;">${cb(leftVal === '0')}</td>
        <td style="text-align:center;">${i + 12}</td>
        <td>${rightText}</td>
        <td style="text-align:center;">${cb(rightVal === '1')}</td>
        <td style="text-align:center;">${cb(rightVal === '0')}</td>
      </tr>
    `);
  }

  return `
  <div class="ksk-page">
    <div style="text-align:center;font-weight:bold;font-size:12pt;margin-bottom:2px;">Mẫu số 03</div>
    <div style="text-align:center;font-style:italic;font-size:11pt;margin-bottom:8px;">
      Giấy khám sức khỏe và khám sức khỏe định kỳ dùng cho người từ đủ 18 tuổi trở lên
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:42%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div><b>${esc(d.TEN_CSKCB || d.MA_CSKCB || '.................................')}</b></div>
          <div>-------</div>
          <div style="margin-top:4px;">Số: ${dotVal(d.MA_LK ? d.MA_LK.slice(-6) : '', 6)}/GKSK-${dotVal(d.MA_CSKCB, 8)}</div>
        </td>
        <td style="width:58%;vertical-align:top;text-align:center;border:none;font-size:11pt;">
          <div style="font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
          <div>---------------</div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;font-weight:bold;font-size:13pt;margin:10px 0 8px 0;">
      GIẤY KHÁM SỨC KHỎE VÀ KHÁM SỨC KHỎE ĐỊNH KỲ DÙNG CHO NGƯỜI TỪ ĐỦ 18 TUỔI TRỞ LÊN
    </div>

    <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:6px;">
      <tr>
        <td style="width:110px;vertical-align:top;border:none;padding-right:10px;">
          <div style="width:100px;height:130px;border:1px solid #000;text-align:center;padding-top:45px;font-size:10pt;font-style:italic;">
            Ảnh<br/>(4 x 6 cm)
          </div>
        </td>
        <td style="vertical-align:top;border:none;">
          <div class="p-line">1. Họ và tên (viết chữ in hoa): <b>${dotVal((d.HO_TEN || '').toUpperCase(), 35)}</b></div>
          <div class="p-line">2. Giới tính: ${cb(d.GIOI_TINH === '1', 'Nam')} &nbsp;&nbsp; ${cb(d.GIOI_TINH === '2', 'Nữ')}</div>
          <div class="p-line">3. Ngày tháng năm sinh: ${dotVal(formatVnDate(d.NGAY_SINH), 18)} (Tuổi: ${dotVal(age !== null ? String(age) : '', 6)})</div>
          <div class="p-line">4. Số CCCD/Hộ chiếu/Mã định danh: ${dotVal(d.SO_CCCD, 28)}</div>
          <div class="p-line">5. Cấp ngày ${capParts.dd}/${capParts.mm}/${capParts.yyyy} &nbsp;&nbsp; Nơi cấp: ${dotVal(d.NOICAP_CCCD, 25)}</div>
          <div class="p-line">6. Dân tộc: ${dotVal(danToc, 18)} &nbsp;&nbsp;&nbsp; 7. Đối tượng: ${dotVal(doiTuong, 22)}</div>
          <div class="p-line">8. Nguồn chi trả: ${dotVal(nguonChiTra, 20)} &nbsp;&nbsp;&nbsp; 9. Nhóm máu: ${dotVal(d.NHOM_MAU, 10)} (nếu có)</div>
        </td>
      </tr>
    </table>

    <div class="p-line">10. Nơi ở hiện tại: Tỉnh/ thành: ${dotVal(tinhName, 18)} phường/ xã: ${dotVal(xaName, 18)} số nhà/ thôn/ xóm: ${dotVal(d.DIA_CHI, 20)};</div>
    <div class="p-line">11. Nghề nghiệp: ${dotVal(ngheNghiep, 55)}</div>
    <div class="p-line">12. Nơi làm việc, học tập: ${dotVal(d.NOI_LAM_VIEC_HOC_TAP, 48)}</div>
    <div class="p-line">13. Lý do khám sức khỏe: ${dotVal(d.LY_DO_VV, 50)}</div>

    <div class="sec-title">TIỀN SỬ BỆNH CỦA ĐỐI TƯỢNG KHÁM SỨC KHỎE</div>
    <div class="p-line"><b>1. Tiền sử gia đình:</b></div>
    <div class="p-line">Có ai trong gia đình ông (bà) mắc một trong các bệnh: truyền nhiễm, tim mạch, đái tháo đường, lao, hen phế quản, ung thư, động kinh, rối loạn tâm thần, bệnh khác:</div>
    <div class="p-line">a) ${cb(d.TSGD_MAC_BENH === '0', 'Không')} &nbsp;&nbsp;&nbsp; b) ${cb(d.TSGD_MAC_BENH === '1', 'Có')}; Nếu “có”, đề nghị ghi cụ thể tên bệnh: ${dotVal(d.TSGD_MA_BENH, 35)}</div>

    <div class="p-line" style="margin-top:4px;"><b>2. Tiền sử bản thân:</b> Ông (bà) đã/đang mắc bệnh, tình trạng bệnh nào sau đây không:</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:5%;">TT</th>
          <th style="width:33%;">Tên bệnh, tật</th>
          <th style="width:6%;">Có</th>
          <th style="width:6%;">Không</th>
          <th style="width:5%;">STT</th>
          <th style="width:33%;">Tên bệnh, tật</th>
          <th style="width:6%;">Có</th>
          <th style="width:6%;">Không</th>
        </tr>
      </thead>
      <tbody>
        ${tsbtRowsHtml.join('')}
      </tbody>
    </table>

    <div class="p-line" style="margin-top:4px;"><b>3. Câu hỏi khác (nếu có):</b></div>
    <div class="p-line">a) Ông (bà) có đang điều trị bệnh gì không?</div>
    <div class="p-line">
      ${cb(d.TSBT_DANG_DIEU_TRI_BENH === '0', 'Không')} &nbsp;&nbsp;&nbsp;
      ${cb(d.TSBT_DANG_DIEU_TRI_BENH === '1', 'Có')} (Nếu có, xin hãy liệt kê tên bệnh, các thuốc đang dùng và liều lượng):
      ${dotVal([d.TSBT_MA_BENH, d.TSBT_TEN_THUOC_LIEU_LUONG].filter(Boolean).join(' - '), 35)}
    </div>
    <div class="p-line">b) Tiền sử thai sản (Đối với phụ nữ):</div>
    <div class="p-line">
      ${cb(d.TSBT_THAI_SAN === '0', 'Không')} &nbsp;&nbsp;&nbsp;
      ${cb(d.TSBT_THAI_SAN === '1', 'Có')} (Nếu có, xin hãy liệt kê tên bệnh, các thuốc đang dùng và liều lượng):
      ${dotVal([d.TSBT_MA_BENH_THAI_SAN, d.TSBT_TEN_THUOC_THAI_SAN].filter(Boolean).join(' - '), 35)}
    </div>

    <div class="p-line" style="font-style:italic;margin-top:4px;">
      Tôi xin cam đoan những điều khai trên đây hoàn toàn đúng với sự thật theo sự hiểu biết của tôi.
    </div>
    <table style="width:100%;border:none;margin-bottom:8px;">
      <tr>
        <td style="width:45%;border:none;"></td>
        <td style="width:55%;border:none;text-align:center;">
          <div style="font-style:italic;">......... ngày ${ngayKhamParts.dd} tháng ${ngayKhamParts.mm} năm ${ngayKhamParts.yyyy}</div>
          <div style="font-weight:bold;">Người đề nghị khám sức khỏe</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký và ghi rõ họ, tên)</div>
          <div style="height:40px;"></div>
          <div><b>${esc(d.HO_TEN || '')}</b></div>
        </td>
      </tr>
    </table>

    <div class="sec-title">I. KHÁM THỂ LỰC</div>
    <div class="p-line">- Chiều cao: ${dotVal(d.CHIEU_CAO, 10)} cm; &nbsp; - Cân nặng: ${dotVal(d.CAN_NANG, 10)} kg; &nbsp; - Chỉ số BMI: ${dotVal(d.CHI_SO_BMI || d.BMI, 10)}</div>
    <div class="p-line">- Mạch: ${dotVal(d.MACH, 10)} lần/phút; &nbsp; - Huyết áp: ${dotVal(d.HUYET_AP, 14)} mmHg</div>
    <div class="p-line">- Phân loại thể lực: ${dotVal(getPhanLoaiText(d.KHAM_THE_LUC_PL), 25)}</div>

    <div class="sec-title">II. KHÁM LÂM SÀNG</div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:74%;">Nội dung khám</th>
          <th style="width:26%;">Họ tên và chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>1. Nội khoa</b></div>
            <div>a) Tuần hoàn: ${dotVal(d.NOI_KHOA_TUAN_HOAN, 30)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_TUAN_HOAN_PL), 12)}</div>
            <div>b) Hô hấp: ${dotVal(d.NOI_KHOA_HO_HAP, 32)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_HO_HAP_PL), 12)}</div>
            <div>c) Tiêu hóa: ${dotVal(d.NOI_KHOA_TIEU_HOA, 31)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_TIEU_HOA_PL), 12)}</div>
            <div>d) Thận-Tiết niệu-Sinh dục: ${dotVal(d.NOI_KHOA_THAN_TN_SD, 20)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_THAN_TN_SD_PL), 12)}</div>
            <div>đ) Nội tiết: ${dotVal(d.NOI_KHOA_NOI_TIET, 32)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_NOI_TIET_PL), 12)}</div>
            <div>e) Cơ - xương - khớp: ${dotVal(d.NOI_KHOA_CO_XUONG_KHOP, 24)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_CO_XUONG_KHOP_PL), 12)}</div>
            <div>g) Thần kinh: ${dotVal(d.NOI_KHOA_THAN_KINH, 30)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_THAN_KINH_PL), 12)}</div>
            <div>h) Tâm thần: ${dotVal(d.NOI_KHOA_TAM_THAN, 30)} &nbsp; Phân loại: ${dotVal(getPhanLoaiText(d.NOI_KHOA_TAM_THAN_PL), 12)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_NOI_KHOA_TUAN_HOAN || d.CKDT_NOI_KHOA_HO_HAP)}</td>
        </tr>
        <tr>
          <td>
            <div><b>2. Ngoại khoa:</b> ${dotVal(d.KET_QUA_KHAM_NGOAI_KHOA, 38)}</div>
            <div>Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_NGOAI_KHOA_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_NGOAI_KHOA)}</td>
        </tr>
        <tr>
          <td>
            <div><b>3. Da liễu:</b> ${dotVal(d.KET_QUA_KHAM_DA_LIEU, 40)}</div>
            <div>Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_DA_LIEU_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_DA_LIEU)}</td>
        </tr>
        <tr>
          <td>
            <div><b>4. Sản phụ khoa:</b> ${dotVal(d.KET_QUA_KHAM_SAN_PHU_KHOA, 36)}</div>
            <div>Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_SAN_PHU_KHOA_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_SAN_PHU_KHOA)}</td>
        </tr>
        <tr>
          <td>
            <div><b>5. Mắt:</b></div>
            <div>- Kết quả khám thị lực: Không kính: Mắt phải ${dotVal(d.KHONG_KINH_MAT_PHAI, 8)} Mắt trái ${dotVal(d.KHONG_KINH_MAT_TRAI, 8)}</div>
            <div style="padding-left:140px;">Có kính: &nbsp;&nbsp;&nbsp;&nbsp; Mắt phải ${dotVal(d.CO_KINH_MAT_PHAI, 8)} Mắt trái ${dotVal(d.CO_KINH_MAT_TRAI, 8)}</div>
            <div>- Các bệnh về mắt (nếu có): ${dotVal(d.BENH_KHAC_MAT, 34)}</div>
            <div>- Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_MAT_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_MAT)}</td>
        </tr>
        <tr>
          <td>
            <div><b>6. Tai - Mũi - Họng</b></div>
            <div>- Kết quả khám thính lực:</div>
            <div style="padding-left:14px;">Tai trái: Nói thường ${dotVal(d.TAI_TRAI_NOI_THUONG, 8)} m; &nbsp; Nói thầm ${dotVal(d.TAI_TRAI_NOI_THAM, 8)} m</div>
            <div style="padding-left:14px;">Tai phải: Nói thường ${dotVal(d.TAI_PHAI_NOI_THUONG, 8)} m; &nbsp; Nói thầm ${dotVal(d.TAI_PHAI_NOI_THAM, 8)} m</div>
            <div>- Các bệnh về tai mũi họng (nếu có): ${dotVal(d.BENH_TAI_MUI_HONG || d.BENH_KHAC_TAI_MUI_HONG, 28)}</div>
            <div>- Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_TAI_MUI_HONG_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_TAI_MUI_HONG)}</td>
        </tr>
        <tr>
          <td>
            <div><b>7. Răng - Hàm - Mặt</b></div>
            <div>- Kết quả khám: &nbsp; Hàm trên: ${dotVal(d.HAM_TREN, 36)}</div>
            <div style="padding-left:108px;">Hàm dưới: ${dotVal(d.HAM_DUOI, 36)}</div>
            <div>- Các bệnh về răng hàm mặt (nếu có): ${dotVal(d.BENH_RANG_HAM_MAT || d.BENH_KHAC_RANG_HAM_MAT, 28)}</div>
            <div>- Phân loại: ${dotVal(getPhanLoaiText(d.KHAM_RANG_HAM_MAT_PL), 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_KHAM_RANG_HAM_MAT)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">III. KHÁM CẬN LÂM SÀNG</div>
    <div class="p-line"><b>1. Khám phân loại sức khỏe để đi học, đi làm thực hiện khám cận lâm sàng sau:</b></div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:74%;">Nội dung khám</th>
          <th style="width:26%;">Họ tên, chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>a) Xét nghiệm máu:</b></div>
            <div>- Huyết học: tổng phân tích tế bào máu ngoại vi: ${dotVal(paperCls.CLS_HUYET_HOC, 24)}</div>
            <div>- Sinh hóa máu: Đường máu: ${dotVal(paperCls.CLS_DUONG_MAU, 22)}</div>
            <div style="padding-left:95px;">Urê: ${dotVal(paperCls.CLS_URE, 14)} &nbsp;&nbsp; Creatinin: ${dotVal(paperCls.CLS_CREATININ, 14)}</div>
            <div style="padding-left:95px;">ASAT(GOT): ${dotVal(paperCls.CLS_GOT, 12)} &nbsp;&nbsp; ALAT (GPT): ${dotVal(paperCls.CLS_GPT, 12)}</div>
            <div><b>b) Xét nghiệm nước tiểu:</b></div>
            <div>- Tổng phân tích nước tiểu (bằng máy tự động): ${dotVal(paperCls.CLS_NUOC_TIEU, 22)}</div>
            <div>- Khác (nếu có): ${dotVal(paperCls.CLS_NUOC_TIEU_KHAC, 36)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_CLS_XET_NGHIEM || d.CKDT_CLS)}</td>
        </tr>
        <tr>
          <td>
            <div><b>c) Chẩn đoán hình ảnh (XQ tim phổi thẳng):</b> ${dotVal(paperCls.CLS_XQUANG, 28)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_CLS_XQUANG || d.CKDT_CLS_CDHA)}</td>
        </tr>
        <tr>
          <td>
            <div><b>d) Kết quả khám Cận lâm sàng khác:</b></div>
            <div>
              ${cb(d.HAS_CLS === '0' || (!d.HAS_CLS && (!Array.isArray(d.CLS) || d.CLS.length === 0)), 'Không')} &nbsp;&nbsp;&nbsp;
              ${cb(d.HAS_CLS === '1' || (Array.isArray(d.CLS) && d.CLS.length > 0), 'Có')}
              (Nếu có, hãy liệt kê kết quả chi tiết): ${dotVal(paperCls.CLS_KHAC_CHI_TIET, 28)}
            </div>
            ${
              Array.isArray(d.CLS) && d.CLS.length > 0
                ? `<div style="margin-top:4px;"><b>Chi tiết các DVKT Cận lâm sàng:</b></div>` +
                  d.CLS.map(
                    (c: any, idx: number) =>
                      `<div style="padding-left:10px;">${idx + 1}. <b>${esc(c.TEN_CHI_SO || c.MA_CHI_SO || c.MA_DICH_VU || 'DVKT')}</b>${
                        c.MA_DICH_VU ? ` [Mã DV: ${esc(c.MA_DICH_VU)}]` : ''
                      }: <b>${esc(c.GIA_TRI || c.MO_TA || '')}</b> ${esc(c.DON_VI_DO || '')} ${
                        c.KET_LUAN ? `(${esc(c.KET_LUAN)})` : ''
                      }</div>`
                  ).join('')
                : ''
            }
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_CLS_KHAC)}</td>
        </tr>
      </tbody>
    </table>

    <div class="p-line" style="margin-top:6px;"><b>2. Khám sức khỏe định kỳ (cận lâm sàng thực hiện theo chỉ định của bác sỹ)</b></div>
    <table class="ksk-table">
      <thead>
        <tr>
          <th style="width:74%;">Nội dung khám</th>
          <th style="width:26%;">Họ tên, chữ ký của Bác sỹ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div>Cận lâm sàng thực hiện theo chỉ định của bác sỹ</div>
            <div>Kết quả: ${dotVal(paperCls.CLS_DINH_KY_KET_QUA, 52)}</div>
          </td>
          <td style="vertical-align:middle;text-align:center;">${sigImg(d.CKDT_CLS_DINH_KY)}</td>
        </tr>
      </tbody>
    </table>

    <div class="sec-title">IV. KẾT LUẬN</div>
    <div class="p-line">Tình trạng sức khỏe; mắc các bệnh, tật (nếu có): ${dotVal([d.CAC_VAN_DE_SUC_KHOE, d.KET_LUAN_BENH, d.CAC_BENH_TAT_NEU_CO].filter(Boolean).join('; '), 42)}</div>
    <div class="p-line">Phân loại sức khỏe (theo quy định của Bộ Y tế): <b>${dotVal(getPhanLoaiText(d.PHAN_LOAI_SK), 35)}</b></div>

    <table style="width:100%;border:none;margin-top:12px;">
      <tr>
        <td style="width:50%;border:none;"></td>
        <td style="width:50%;border:none;text-align:center;">
          <div style="font-style:italic;">${esc(d.DIA_DANH_KET_LUAN || '.........')} ngày ${esc(d.NGAY_KET_LUAN_DD || ngayKhamParts.dd)} tháng ${esc(d.NGAY_KET_LUAN_MM || ngayKhamParts.mm)} năm ${esc(d.NGAY_KET_LUAN_YYYY || ngayKhamParts.yyyy)}</div>
          <div style="font-weight:bold;">NGƯỜI KẾT LUẬN</div>
          <div style="font-style:italic;font-size:10.5pt;">(Ký, ghi rõ họ tên và đóng dấu)</div>
          <div style="min-height:55px;padding:4px 0;">${sigImg(d.CKDT_KET_LUAN, true)}</div>
          ${d.NGUOI_KET_LUAN ? `<div style="font-weight:bold;">${esc(d.NGUOI_KET_LUAN)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
  `;
}

export function renderSingleKskPaperHtml(rawData: Record<string, any>, type: KskType): string {
  if (type === 'ChildUnder') return renderMau01Html(rawData);
  if (type === 'Minor') return renderMau02Html(rawData);
  return renderMau03Html(rawData);
}

export function buildFullKskDocumentHtml(
  items: Array<{ rawData: Record<string, any>; type: KskType }>,
  title = 'Giấy Khám Sức Khỏe - Phụ lục XXIV'
): string {
  const pagesHtml = items
    .map((item, idx) => {
      const pageContent = renderSingleKskPaperHtml(item.rawData, item.type);
      const pageBreak =
        idx < items.length - 1
          ? '<br clear="all" style="page-break-before:always;mso-break-type:section-break" />'
          : '';
      return pageContent + pageBreak;
    })
    .join('\n');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 1.5cm 1.5cm 1.5cm 2.0cm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .ksk-page {
      max-width: 19cm;
      margin: 0 auto;
    }
    .p-line {
      margin: 3px 0;
    }
    .sec-title {
      font-weight: bold;
      text-transform: uppercase;
      margin: 10px 0 4px 0;
      font-size: 12pt;
    }
    table.ksk-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0 8px 0;
      font-size: 11.5pt;
    }
    table.ksk-table th, table.ksk-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      vertical-align: top;
    }
    table.ksk-table th {
      text-align: center;
      font-weight: bold;
      background: #fafafa;
    }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

/** Xuất 1 hoặc nhiều bản ghi ra file Word (.doc) theo đúng mẫu Phụ lục XXIV */
export function exportKskToWord(
  items: Array<{ rawData: Record<string, any>; type: KskType }>,
  customFileName?: string
): void {
  if (!items || items.length === 0) return;
  const html = buildFullKskDocumentHtml(items);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const first = items[0];
  const mauLabel = first.type === 'ChildUnder' ? 'Mau01_Duoi6T' : first.type === 'Minor' ? 'Mau02_6Den18T' : 'Mau03_Tren18T';
  const defaultName =
    items.length === 1
      ? `GKSK_${mauLabel}_${String(first.rawData?.HO_TEN || 'HOSO').replace(/\s+/g, '_')}.doc`
      : `GKSK_PhuLucXXIV_${items.length}_HoSo_${Date.now()}.doc`;
  a.href = url;
  a.download = customFileName || defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Mở cửa sổ in chuẩn A4 cho 1 hoặc nhiều bản ghi theo đúng mẫu Phụ lục XXIV */
export function printKskPaper(items: Array<{ rawData: Record<string, any>; type: KskType }>): void {
  if (!items || items.length === 0) return;
  const html = buildFullKskDocumentHtml(items);
  const printWin = window.open('', '_blank', 'width=950,height=850');
  if (!printWin) {
    alert('Trình duyệt đã chặn cửa sổ bật lên (Popup). Vui lòng cho phép Popup để in phiếu.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 350);
}

