/**
 * XML BUILDER THEO ĐÚNG CHUẨN PHỤ LỤC 02 - BHXH VIỆT NAM
 * Tài liệu: CV về triển khai cổng tiếp nhận PL2 (Thông tư 25/2025/TT-BHYT)
 * 
 * CẤU TRÚC XML ĐÃ ĐƯỢC KIỂM TRA KHỚP VỚI TÀI LIỆU:
 * <HSCHUNGTU>
 *   <THONGTINDONVI><MACSKCB/></THONGTINDONVI>
 *   <THONGTINHOSO Id="...">
 *     <NGAYLAP/><SOLUONGHOSO/>
 *     <DANHSACHHOSO>
 *       <HOSO>
 *         <FILEHOSO><LOAIHOSO/><NOIDUNGFILE>base64</NOIDUNGFILE></FILEHOSO>
 *       </HOSO>
 *     </DANHSACHHOSO>
 *   </THONGTINHOSO>
 *   <CHUKYDONVI>
 *     <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">...</Signature>
 *   </CHUKYDONVI>
 * </HSCHUNGTU>
 * 
 * Tên phần mềm: ĐỐI CHIẾU HỒ SƠ VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import { parseDateStr, parseShortDateStr } from './data-utils';
import { buildKskXml } from './kskXmlBuilder';

export type DocType = 'CT03' | 'CT04' | 'CT05' | 'CT06' | 'CT07' | 'GIAYDIEUTRINOITRU' | 'GIAYDIEUTRIVOSINH' | 'GIAYSUCKHOEME' | 'KHAM_SUC_KHOE';

/**
 * Mã loaiHs để đẩy API cổng BHXH (tham số loaiHs trong form POST)
 * Theo Phụ lục 02 BHXH: loaiHs=39 cho các chứng từ TT25, loaiHs=61 cho Giấy chứng sinh
 */
export const LOAI_HS_MAP: Record<string, string> = {
  CT03: '39',
  CT04: '39',
  CT05: '61',   // Giấy chứng sinh → endpoint guiGiayToDienTu, loaiHs=61
  CT06: '39',
  CT07: '39',
  GIAYDIEUTRINOITRU: '39',
  GIAYDIEUTRIVOSINH: '39',
  GIAYSUCKHOEME: '39',
};

/**
 * Tên LOAIHOSO trong XML wrapper <FILEHOSO>
 * Theo Phụ lục 02 BHXH: dùng tên loại (CT03, CT07, GIAYDIEUTRINOITRU...)
 * KHÔNG dùng số (39, 61...)
 */
export const LOAI_HOSO_XML_NAME: Record<string, string> = {
  CT03: 'CT03',
  CT04: 'CT04',
  CT05: 'CT05',           // Giấy chứng sinh
  CT06: 'CT06',
  CT07: 'CT07',
  GIAYDIEUTRINOITRU: 'GIAYDIEUTRINOITRU',
  GIAYDIEUTRIVOSINH: 'GIAYDIEUTRIVOSINH',
  GIAYSUCKHOEME: 'GIAYSUCKHOEME',
};

/** Escape XML special chars */
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Generate UUID-like ID for hồ sơ */
function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Format ngày theo chuẩn BHXH: YYYYMMDDHHmm hoặc YYYYMMDD */
function fmtDate(d: string, isTime = false): string {
  if (!d) return '';
  return isTime ? parseDateStr(d) : parseShortDateStr(d);
}

/** ===========================
 *  CT03 - GIẤY RA VIỆN (Mẫu số 02 - TT25)
 * =========================== */
export function buildCT03Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CT03 xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SO_LUU_TRU>${esc(data.SO_LUU_TRU || '')}</SO_LUU_TRU>
  <MA_YTE>${esc(data.MA_YTE || '')}</MA_YTE>
  <MA_KHOA>${esc(data.MA_KHOA || '')}</MA_KHOA>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH || '1')}</GIOI_TINH>
  <MA_DANTOC>${esc(data.MA_DANTOC || '01')}</MA_DANTOC>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP || '')}</NGHE_NGHIEP>
  <DIA_CHI>${esc(data.DIA_CHI || '')}</DIA_CHI>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, true)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, true)}</NGAY_RA>
  <DINH_CHI_THAI_NGHEN>${esc(data.DINH_CHI_THAI_NGHEN || '0')}</DINH_CHI_THAI_NGHEN>
  <TUOI_THAI>${esc(data.TUOI_THAI || '')}</TUOI_THAI>
  <CHAN_DOAN>${esc(data.CHAN_DOAN || '')}</CHAN_DOAN>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI || '')}</PP_DIEUTRI>
  <GHI_CHU>${esc(data.GHI_CHU || '')}</GHI_CHU>
  <THU_TRUONG_DVI>${esc(data.THU_TRUONG_DVI || '')}</THU_TRUONG_DVI>
  <MA_CCHN_TRUONGKHOA>${esc(data.MA_CCHN_TRUONGKHOA || '')}</MA_CCHN_TRUONGKHOA>
  <TEN_TRUONGKHOA>${esc(data.TEN_TRUONGKHOA || '')}</TEN_TRUONGKHOA>
  <NGAY_CHUNG_TU>${fmtDate(data.NGAY_CHUNG_TU || data.NGAY_CT, false)}</NGAY_CHUNG_TU>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA || '')}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME || '')}</HO_TEN_ME>
  <NGOAITRU_TUNGAY>${fmtDate(data.NGOAITRU_TUNGAY, false)}</NGOAITRU_TUNGAY>
  <NGOAITRU_DENNGAY>${fmtDate(data.NGOAITRU_DENNGAY, false)}</NGOAITRU_DENNGAY>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <BENHICD10_ID>${esc(data.BENHICD10_ID || data.BENH_ICD10_ID || '')}</BENHICD10_ID>
  <TENBENHNICD10>${esc(data.TENBENHNICD10 || data.BENH_ICD10_TEN || data.CHAN_DOAN || '')}</TENBENHNICD10>
</CT03>`;
}

/** ===========================
 *  CT04 - TÓM TẮT HSBA (Mẫu số 03 - TT25)
 * =========================== */
export function buildCT04Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CT04 xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH || '1')}</GIOI_TINH>
  <MA_DANTOC>${esc(data.MA_DANTOC || '01')}</MA_DANTOC>
  <DIA_CHI>${esc(data.DIA_CHI || '')}</DIA_CHI>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP || '')}</NGHE_NGHIEP>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA || '')}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME || '')}</HO_TEN_ME>
  <NGUOI_GIAM_HO>${esc(data.NGUOI_GIAM_HO || '')}</NGUOI_GIAM_HO>
  <TEN_DONVI>${esc(data.TEN_DONVI || '')}</TEN_DONVI>
  <NGUOI_DAI_DIEN>${esc(data.NGUOI_DAI_DIEN || '')}</NGUOI_DAI_DIEN>
  <NGAY_CT>${fmtDate(data.NGAY_CT || data.NGAY_CHUNG_TU, false)}</NGAY_CT>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, true)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, true)}</NGAY_RA>
  <CHAN_DOAN_VAO>${esc(data.CHAN_DOAN_VAO || '')}</CHAN_DOAN_VAO>
  <CHAN_DOAN_RA>${esc(data.CHAN_DOAN_RA || data.CHAN_DOAN || '')}</CHAN_DOAN_RA>
  <QT_BENHLY>${esc(data.QT_BENHLY || '')}</QT_BENHLY>
  <TOMTAT_KQ>${esc(data.TOMTAT_KQ || '')}</TOMTAT_KQ>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI || '')}</PP_DIEUTRI>
  <NGAY_SINHCON>${fmtDate(data.NGAY_SINHCON, false)}</NGAY_SINHCON>
  <NGAY_CHETCON>${fmtDate(data.NGAY_CHETCON, false)}</NGAY_CHETCON>
  <SO_CONCHET>${esc(data.SO_CONCHET || '0')}</SO_CONCHET>
  <TT_RAVIEN>${esc(data.TT_RAVIEN || '1')}</TT_RAVIEN>
  <GHI_CHU>${esc(data.GHI_CHU || '')}</GHI_CHU>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <LYDO_VVIEN>${esc(data.LYDO_VVIEN || '1')}</LYDO_VVIEN>
  <TIEN_SU_BENH>${esc(data.TIEN_SU_BENH || '')}</TIEN_SU_BENH>
  <DAU_HIEU_LAM_SANG>${esc(data.DAU_HIEU_LAM_SANG || '')}</DAU_HIEU_LAM_SANG>
  <NOI_KHOA>${esc(data.NOI_KHOA || '')}</NOI_KHOA>
  <IS_NOI_KHOA>${esc(data.IS_NOI_KHOA || '0')}</IS_NOI_KHOA>
  <PHAU_THUAT_THU_THUAT>${esc(data.PHAU_THUAT_THU_THUAT || '')}</PHAU_THUAT_THU_THUAT>
  <IS_PHAU_THUAT_THU_THUAT>${esc(data.IS_PHAU_THUAT_THU_THUAT || '0')}</IS_PHAU_THUAT_THU_THUAT>
  <HUONG_DIEU_TRI>${esc(data.HUONG_DIEU_TRI || '')}</HUONG_DIEU_TRI>
  <BENH_ICD10_ID>${esc(data.BENH_ICD10_ID || data.BENHICD10_ID || '')}</BENH_ICD10_ID>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.TENBENHNICD10 || '')}</BENH_ICD10_TEN>
  <IS_LAO_GIAI_DOAN_NANG>${esc(data.IS_LAO_GIAI_DOAN_NANG || '0')}</IS_LAO_GIAI_DOAN_NANG>
  <IS_XO_GAN_GIAI_DOAN_MAT_BU>${esc(data.IS_XO_GAN_GIAI_DOAN_MAT_BU || '0')}</IS_XO_GAN_GIAI_DOAN_MAT_BU>
</CT04>`;
}

/** ===========================
 *  CT05 - GIẤY CHỨNG SINH
 * =========================== */
export function buildCT05Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GIAYCHUNGSINH>
  <SO_SERI>${esc(data.SO_SERI)}</SO_SERI>
  <MA_BHXH_NND>${esc(data.MA_BHXH_NND)}</MA_BHXH_NND>
  <MA_THE_NND>${esc(data.MA_THE_NND)}</MA_THE_NND>
  <HOTEN_NND>${esc(data.HOTEN_NND)}</HOTEN_NND>
  <NGAYSINH_NND>${fmtDate(data.NGAYSINH_NND)}</NGAYSINH_NND>
  <MA_DANTOC_NND>${esc(data.MA_DANTOC_NND || '01')}</MA_DANTOC_NND>
  <SO_CMND_NND>${esc(data.SO_CMND_NND)}</SO_CMND_NND>
  <NGAYCAP_CMND_NND>${fmtDate(data.NGAYCAP_CMND_NND)}</NGAYCAP_CMND_NND>
  <NOICAP_CMND_NND>${esc(data.NOICAP_CMND_NND)}</NOICAP_CMND_NND>
  <NOI_DK_THUONGTRU_NND>${esc(data.NOI_DK_THUONGTRU_NND)}</NOI_DK_THUONGTRU_NND>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA)}</HO_TEN_CHA>
  <TEN_CON>${esc(data.TEN_CON)}</TEN_CON>
  <GIOI_TINH_CON>${esc(data.GIOI_TINH_CON)}</GIOI_TINH_CON>
  <SO_CON>${esc(data.SO_CON || '1')}</SO_CON>
  <CAN_NANG_CON>${esc(data.CAN_NANG_CON)}</CAN_NANG_CON>
  <NGAY_SINH_CON>${fmtDate(data.NGAY_SINH_CON, true)}</NGAY_SINH_CON>
  <TINH_TRANG_CON>${esc(data.TINH_TRANG_CON)}</TINH_TRANG_CON>
  <SINHCON_PHAUTHUAT>${esc(data.SINHCON_PHAUTHUAT || '0')}</SINHCON_PHAUTHUAT>
  <SINHCON_DUOI32TUAN>${esc(data.SINHCON_DUOI32TUAN || '0')}</SINHCON_DUOI32TUAN>
  <NGUOI_DO_DE>${esc(data.NGUOI_DO_DE)}</NGUOI_DO_DE>
  <NGUOI_GHI_PHIEU>${esc(data.NGUOI_GHI_PHIEU)}</NGUOI_GHI_PHIEU>
  <THU_TRUONG_DVI>${esc(data.THU_TRUONG_DVI)}</THU_TRUONG_DVI>
  <NGAY_CT>${fmtDate(data.NGAY_CT, true)}</NGAY_CT>
</GIAYCHUNGSINH>`;
}

/** ===========================
 *  CT06 - GIẤY XÁC NHẬN NGHỈ DƯỠNG THAI (Mẫu số 11 - TT25)
 * =========================== */
export function buildCT06Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CT06 xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, false)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, false)}</NGAY_RA>
  <CHAN_DOAN>${esc(data.CHAN_DOAN || '')}</CHAN_DOAN>
  <NGUOI_DAI_DIEN>${esc(data.NGUOI_DAI_DIEN || '')}</NGUOI_DAI_DIEN>
  <MA_BS>${esc(data.MA_BS || '')}</MA_BS>
  <TEN_BS>${esc(data.TEN_BS || '')}</TEN_BS>
  <TEN_DVI>${esc(data.TEN_DVI || '')}</TEN_DVI>
  <SO_KCB>${esc(data.SO_KCB || '')}</SO_KCB>
  <NGAY_CT>${fmtDate(data.NGAY_CT || data.NGAY_CHUNG_TU, false)}</NGAY_CT>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOI_CU_TRU_NND>${esc(data.NOI_CU_TRU_NND || '')}</NOI_CU_TRU_NND>
  <MATINH_CU_TRU>${esc(data.MATINH_CU_TRU || '')}</MATINH_CU_TRU>
  <MAXA_CU_TRU>${esc(data.MAXA_CU_TRU || '')}</MAXA_CU_TRU>
  <TUOI_THAI>${esc(data.TUOI_THAI || '0')}</TUOI_THAI>
  <BENH_ICD10_ID>${esc(data.BENH_ICD10_ID || data.BENHICD10_ID || '')}</BENH_ICD10_ID>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.TENBENHNICD10 || data.CHAN_DOAN || '')}</BENH_ICD10_TEN>
</CT06>`;
}

/** ===========================
 *  CT07 - GIẤY CHỨNG NHẬN NGHỈ VIỆC HƯỞNG BHXH (Mẫu số 07 - TT25)
 * =========================== */
export function buildCT07Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CT07 xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <MAU_SO>${esc(data.MAU_SO || 'CT07')}</MAU_SO>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
  <SO_KCB>${esc(data.SO_KCB || '')}</SO_KCB>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH || '1')}</GIOI_TINH>
  <DON_VI>${esc(data.DON_VI || '')}</DON_VI>
  <CHANDOAN_DIEUTRI>${esc(data.CHANDOAN_DIEUTRI || data.CHAN_DOAN || '')}</CHANDOAN_DIEUTRI>
  <TU_NGAY>${fmtDate(data.TU_NGAY, false)}</TU_NGAY>
  <DEN_NGAY>${fmtDate(data.DEN_NGAY, false)}</DEN_NGAY>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA || '')}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME || '')}</HO_TEN_ME>
  <THU_TRUONG_DV>${esc(data.THU_TRUONG_DV || data.THU_TRUONG_DVI || '')}</THU_TRUONG_DV>
  <MA_CCHN>${esc(data.MA_CCHN || '')}</MA_CCHN>
  <TEN_NGUOI_HANH_NGHE>${esc(data.TEN_NGUOI_HANH_NGHE || '')}</TEN_NGUOI_HANH_NGHE>
  <NGAY_CHUNG_TU>${fmtDate(data.NGAY_CHUNG_TU || data.NGAY_CT, false)}</NGAY_CHUNG_TU>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <NGAY_KCB>${fmtDate(data.NGAY_KCB || data.TU_NGAY, false)}</NGAY_KCB>
  <BENH_ICD10_ID>${esc(data.BENH_ICD10_ID || data.BENHICD10_ID || '')}</BENH_ICD10_ID>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.TENBENHNICD10 || data.CHANDOAN_DIEUTRI || '')}</BENH_ICD10_TEN>
</CT07>`;
}

/** ===========================
 *  GIAYDIEUTRINOITRU - GIẤY XÁC NHẬN ĐIỀU TRỊ NỘI TRÚ (Mẫu số 06 - TT25)
 * =========================== */
export function buildGiayDieuTriNoiTruContent(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CTGiayDieuTriNoiTru xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SO_LUU_TRU>${esc(data.SO_LUU_TRU || '')}</SO_LUU_TRU>
  <MA_YTE>${esc(data.MA_YTE || '')}</MA_YTE>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH || '1')}</GIOI_TINH>
  <MA_KHOA>${esc(data.MA_KHOA || '')}</MA_KHOA>
  <TEN_DAN_TOC>${esc(data.TEN_DAN_TOC || 'Kinh')}</TEN_DAN_TOC>
  <MA_DAN_TOC>${esc(data.MA_DAN_TOC || '01')}</MA_DAN_TOC>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP || '')}</NGHE_NGHIEP>
  <DIA_CHI>${esc(data.DIA_CHI || '')}</DIA_CHI>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, true)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, true)}</NGAY_RA>
  <CHAN_DOAN>${esc(data.CHAN_DOAN || '')}</CHAN_DOAN>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI || '')}</PP_DIEUTRI>
  <MO_TA>${esc(data.MO_TA || '')}</MO_TA>
  <GHI_CHU>${esc(data.GHI_CHU || '')}</GHI_CHU>
  <DAI_DIEN_DVI>${esc(data.DAI_DIEN_DVI || data.THU_TRUONG_DVI || '')}</DAI_DIEN_DVI>
  <MA_CCHN_BS>${esc(data.MA_CCHN_BS || data.MA_CCHN || '')}</MA_CCHN_BS>
  <TEN_BS>${esc(data.TEN_BS || data.TEN_NGUOI_HANH_NGHE || '')}</TEN_BS>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <BENH_ICD10_MA>${esc(data.BENH_ICD10_MA || data.BENH_ICD10_ID || '')}</BENH_ICD10_MA>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.CHAN_DOAN || '')}</BENH_ICD10_TEN>
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <NGAY_CT>${fmtDate(data.NGAY_CT || data.NGAY_CHUNG_TU, false)}</NGAY_CT>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
  <TUOI_THAI>${esc(data.TUOI_THAI || '')}</TUOI_THAI>
  <LOAI_PHUONG_PHAP>${esc(data.LOAI_PHUONG_PHAP || '')}</LOAI_PHUONG_PHAP>
  <LOAI_PP_DIEU_TRI_VOSINH>${esc(data.LOAI_PP_DIEU_TRI_VOSINH || '')}</LOAI_PP_DIEU_TRI_VOSINH>
  <NGAY_DINH_CHI_THAINGHEN>${fmtDate(data.NGAY_DINH_CHI_THAINGHEN, true)}</NGAY_DINH_CHI_THAINGHEN>
  <IS_NGHIDUONGTHAI>${esc(data.IS_NGHIDUONGTHAI || '0')}</IS_NGHIDUONGTHAI>
  <SO_NGAY_NGHIDUONGTHAI>${esc(data.SO_NGAY_NGHIDUONGTHAI || '0')}</SO_NGAY_NGHIDUONGTHAI>
</CTGiayDieuTriNoiTru>`;
}

/** ===========================
 *  GIAYDIEUTRIVOSINH - GIẤY XÁC NHẬN ĐIỀU TRỊ VÔ SINH (Mẫu số 09 - TT25)
 * =========================== */
export function buildGiayDieuTriVoSinhContent(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CTGiayDieuTriVoSinh xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SO_LUU_TRU>${esc(data.SO_LUU_TRU || '')}</SO_LUU_TRU>
  <MA_YTE>${esc(data.MA_YTE || '')}</MA_YTE>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <MA_KHOA>${esc(data.MA_KHOA || '')}</MA_KHOA>
  <MA_TINHCUTRU>${esc(data.MA_TINHCUTRU || '')}</MA_TINHCUTRU>
  <MA_XACUTRU>${esc(data.MA_XACUTRU || '')}</MA_XACUTRU>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP || '')}</NGHE_NGHIEP>
  <DIA_CHI>${esc(data.DIA_CHI || '')}</DIA_CHI>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, true)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, true)}</NGAY_RA>
  <CHAN_DOAN>${esc(data.CHAN_DOAN || '')}</CHAN_DOAN>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI || '')}</PP_DIEUTRI>
  <GHI_CHU>${esc(data.GHI_CHU || '')}</GHI_CHU>
  <DAI_DIEN_DVI>${esc(data.DAI_DIEN_DVI || data.THU_TRUONG_DVI || '')}</DAI_DIEN_DVI>
  <MA_CCHN_BS>${esc(data.MA_CCHN_BS || data.MA_CCHN || '')}</MA_CCHN_BS>
  <TEN_BS>${esc(data.TEN_BS || data.TEN_NGUOI_HANH_NGHE || '')}</TEN_BS>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <BENH_ICD10_MA>${esc(data.BENH_ICD10_MA || data.BENH_ICD10_ID || '')}</BENH_ICD10_MA>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.CHAN_DOAN || '')}</BENH_ICD10_TEN>
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <NGAY_CT>${fmtDate(data.NGAY_CT || data.NGAY_CHUNG_TU, false)}</NGAY_CT>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
  <LOAI_PHUONG_PHAP>${esc(data.LOAI_PHUONG_PHAP || '1')}</LOAI_PHUONG_PHAP>
</CTGiayDieuTriVoSinh>`;
}

/** ===========================
 *  GIAYSUCKHOEME - GIẤY XÁC NHẬN NGƯỜI MẸ KHÔNG ĐỦ SỨC KHỎE (Mẫu số 10 - TT25)
 * =========================== */
export function buildGiaySucKhoeMeContent(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<CTGiaySucKhoeMe xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SO_LUU_TRU>${esc(data.SO_LUU_TRU || '')}</SO_LUU_TRU>
  <MA_YTE>${esc(data.MA_YTE || '')}</MA_YTE>
  <MA_BHXH>${esc(data.MA_BHXH || '')}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE || '')}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN || '')}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH, false)}</NGAY_SINH>
  <MA_KHOA>${esc(data.MA_KHOA || '')}</MA_KHOA>
  <MA_TINHCUTRU>${esc(data.MA_TINHCUTRU || '')}</MA_TINHCUTRU>
  <MA_XACUTRU>${esc(data.MA_XACUTRU || '')}</MA_XACUTRU>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP || '')}</NGHE_NGHIEP>
  <DIA_CHI>${esc(data.DIA_CHI || '')}</DIA_CHI>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO, true)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA, true)}</NGAY_RA>
  <CHAN_DOAN>${esc(data.CHAN_DOAN || '')}</CHAN_DOAN>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI || '')}</PP_DIEUTRI>
  <KET_LUAN>${esc(data.KET_LUAN || '1')}</KET_LUAN>
  <TINHTRANGBENHHIENTAI>${esc(data.TINHTRANGBENHHIENTAI || '')}</TINHTRANGBENHHIENTAI>
  <DAI_DIEN_DVI>${esc(data.DAI_DIEN_DVI || data.THU_TRUONG_DVI || '')}</DAI_DIEN_DVI>
  <MA_CCHN_BS>${esc(data.MA_CCHN_BS || data.MA_CCHN || '')}</MA_CCHN_BS>
  <TEN_BS>${esc(data.TEN_BS || data.TEN_NGUOI_HANH_NGHE || '')}</TEN_BS>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD || '')}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD, false)}</NGAYCAP_CCCD>
  <NOICAP_CCCD>${esc(data.NOICAP_CCCD || '')}</NOICAP_CCCD>
  <BENH_ICD10_MA>${esc(data.BENH_ICD10_MA || data.BENH_ICD10_ID || '')}</BENH_ICD10_MA>
  <BENH_ICD10_TEN>${esc(data.BENH_ICD10_TEN || data.CHAN_DOAN || '')}</BENH_ICD10_TEN>
  <MA_CT>${esc(data.MA_CT || data.SO_SERI || '')}</MA_CT>
  <NGAY_CT>${fmtDate(data.NGAY_CT || data.NGAY_CHUNG_TU, false)}</NGAY_CT>
  <SO_SERI>${esc(data.SO_SERI || '')}</SO_SERI>
</CTGiaySucKhoeMe>`;
}

/** Build nội dung XML của từng chứng từ (sẽ được nhúng vào wrapper) */
export function buildDocContent(type: DocType, data: Record<string, string>): string {
  switch (type) {
    case 'CT03': return buildCT03Content(data);
    case 'CT04': return buildCT04Content(data);
    case 'CT05': return buildCT05Content(data);
    case 'CT06': return buildCT06Content(data);
    case 'CT07': return buildCT07Content(data);
    case 'GIAYDIEUTRINOITRU': return buildGiayDieuTriNoiTruContent(data);
    case 'GIAYDIEUTRIVOSINH': return buildGiayDieuTriVoSinhContent(data);
    case 'GIAYSUCKHOEME': return buildGiaySucKhoeMeContent(data);
    default: return buildCT07Content(data);
  }
}

/**
 * Build XML wrapper <HSCHUNGTU> theo đúng chuẩn Phụ lục 02
 * Theo tài liệu BHXH: tất cả FILEHOSO nằm trong 1 HOSO duy nhất
 * <LOAIHOSO> dùng tên loại: CT03, CT07, GIAYDIEUTRINOITRU... (KHÔNG dùng số 39)
 * <NOIDUNGFILE> là base64 của chứng từ con (<CT07>...</CT07>), KHÔNG phải toàn bộ wrapper
 */
export function buildHSCHUNGTU(
  maCskcb: string,
  hosoList: Array<{ loaiHs: string; base64Content: string; }>
): string {
  const hoSoId = `Id-${genId()}`;
  const ngayLap = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Theo Phụ lục 02 BHXH: tất cả FILEHOSO nằm trong 1 HOSO duy nhất
  const filehosoBlocks = hosoList.map(hs => `
        <FILEHOSO>
          <LOAIHOSO>${esc(hs.loaiHs)}</LOAIHOSO>
          <NOIDUNGFILE>${hs.base64Content}</NOIDUNGFILE>
        </FILEHOSO>`).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<HSCHUNGTU xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <THONGTINDONVI>
    <MACSKCB>${esc(maCskcb)}</MACSKCB>
  </THONGTINDONVI>
  <THONGTINHOSO Id="${hoSoId}">
    <NGAYLAP>${ngayLap}</NGAYLAP>
    <SOLUONGHOSO>${hosoList.length}</SOLUONGHOSO>
    <DANHSACHHOSO>
      <HOSO>${filehosoBlocks}
      </HOSO>
    </DANHSACHHOSO>
  </THONGTINHOSO>
  <CHUKYDONVI/>
</HSCHUNGTU>`;
}

/**
 * Build XML đơn lẻ (cho 1 hồ sơ)
 * - LOAIHOSO trong XML dùng tên loại: CT03, CT07... (theo Phụ lục 02 BHXH)
 * - NOIDUNGFILE là base64 của chứng từ con, không phải toàn bộ HSCHUNGTU
 */
export function buildXml(type: DocType, data: Record<string, any>, maCskcb: string): string {
  if (type === 'KHAM_SUC_KHOE') {
    return buildKskXml([data], data?.MA_GTIN_CSKCB || data?.MA_CSKCB || maCskcb || '00000');
  }
  const content = buildDocContent(type, data);
  const contentBase64 = xmlToBase64(content);
  // LOAIHOSO trong XML dùng tên loại (CT03/CT07/GIAYDIEUTRINOITRU...)
  const loaiHosoXmlName = LOAI_HOSO_XML_NAME[type] || type;
  return buildHSCHUNGTU(maCskcb, [{ loaiHs: loaiHosoXmlName, base64Content: contentBase64 }]);
}

/**
 * Tính SHA-256 hash của nội dung XML, trả về Base64
 */
export async function computeXmlHashBase64(xmlString: string): Promise<string> {
  const data = new TextEncoder().encode(xmlString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

export interface CertSigningInfo {
  rawCertBase64: string;
  subject: string;
  serialNumber?: string;
}

/**
 * Format thời gian ký chuẩn ISO địa phương: YYYY-MM-DDTHH:mm:ss
 */
function formatLocalSigningTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function escC14nText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#xD;');
}

function escC14nAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;');
}

function collectOwnNamespaces(el: Element, scope: Map<string, string>): void {
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name === 'xmlns') {
      scope.set('', attr.value);
    } else if (attr.name.startsWith('xmlns:')) {
      const prefix = attr.name.slice(6);
      if (prefix && prefix !== 'xml') {
        scope.set(prefix, attr.value);
      }
    }
  }
  // Đảm bảo luôn ghi nhận đúng namespace URI thực tế của element (kể cả khi tạo bằng createElementNS)
  if (!el.prefix) {
    scope.set('', el.namespaceURI || '');
  } else if (el.namespaceURI && el.prefix !== 'xml') {
    scope.set(el.prefix, el.namespaceURI);
  }
}

/**
 * Chuẩn hóa Canonical XML 1.0 (http://www.w3.org/TR/2001/REC-xml-c14n-20010315)
 * cho 1 Element DOM (bao gồm kế thừa namespace từ tổ tiên, sắp xếp thuộc tính,
 * mở rộng thẻ rỗng <Tag/> -> <Tag></Tag> và loại bỏ node bị omitPredicate bỏ qua).
 */
export function canonicalizeElementC14n(
  targetEl: Element,
  omitPredicate?: (el: Element) => boolean
): string {
  const ancestors: Element[] = [];
  let cur: Element | null = targetEl.parentElement;
  while (cur) {
    ancestors.unshift(cur);
    cur = cur.parentElement;
  }

  const initialScope = new Map<string, string>([['', '']]);
  for (const anc of ancestors) {
    collectOwnNamespaces(anc, initialScope);
  }

  const serialize = (
    el: Element,
    parentInScope: Map<string, string>,
    renderedNs: Map<string, string>
  ): string => {
    if (omitPredicate?.(el)) return '';

    const curScope = new Map(parentInScope);
    collectOwnNamespaces(el, curScope);

    const nextRendered = new Map(renderedNs);
    const nsAttrs: { key: string; str: string }[] = [];

    // Default namespace declaration
    const defUri = curScope.get('') ?? '';
    const renderedDef = nextRendered.get('') ?? '';
    if (defUri !== renderedDef) {
      nsAttrs.push({ key: '', str: `xmlns="${escC14nAttr(defUri)}"` });
      nextRendered.set('', defUri);
    }

    // Prefixed namespace declarations
    const prefixes = Array.from(curScope.keys())
      .filter(k => k !== '')
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    for (const p of prefixes) {
      const uri = curScope.get(p) ?? '';
      if (uri !== '' && nextRendered.get(p) !== uri) {
        nsAttrs.push({ key: p, str: `xmlns:${p}="${escC14nAttr(uri)}"` });
        nextRendered.set(p, uri);
      }
    }

    nsAttrs.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    // Regular attributes sorted by (namespaceURI, localName)
    const regAttrs: Attr[] = [];
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
      regAttrs.push(attr);
    }
    regAttrs.sort((a, b) => {
      const nsA = a.namespaceURI || '';
      const nsB = b.namespaceURI || '';
      if (nsA !== nsB) return nsA < nsB ? -1 : 1;
      const locA = a.localName || a.name;
      const locB = b.localName || b.name;
      return locA < locB ? -1 : locA > locB ? 1 : 0;
    });

    const parts = [
      ...nsAttrs.map(n => n.str),
      ...regAttrs.map(a => `${a.name}="${escC14nAttr(a.value)}"`),
    ];

    let out = `<${el.tagName}${parts.length ? ' ' + parts.join(' ') : ''}>`;
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === 1 /* ELEMENT_NODE */) {
        out += serialize(child as Element, curScope, nextRendered);
      } else if (child.nodeType === 3 /* TEXT_NODE */ || child.nodeType === 4 /* CDATA */) {
        out += escC14nText(child.nodeValue || '');
      }
    }
    out += `</${el.tagName}>`;
    return out;
  };

  return serialize(targetEl, initialScope, new Map([['', '']]));
}

/** Chèn hoặc thay thế khối <CHUKYDONVI>...</CHUKYDONVI> trong chuỗi XML gốc */
export function injectChuKyDonViXml(xmlString: string, chuKyBlock: string): string {
  if (/<CHUKYDONVI(?:\s*\/>|\s*>[\s\S]*?<\/CHUKYDONVI>)/i.test(xmlString)) {
    return xmlString.replace(/<CHUKYDONVI(?:\s*\/>|\s*>[\s\S]*?<\/CHUKYDONVI>)/i, chuKyBlock);
  }
  if (/<\/GIAMDINHHS>/i.test(xmlString)) {
    return xmlString.replace(/<\/GIAMDINHHS>/i, `    ${chuKyBlock}\n</GIAMDINHHS>`);
  }
  if (/<\/HSTH01BH>/i.test(xmlString)) {
    return xmlString.replace(/<\/HSTH01BH>/i, `${chuKyBlock}</HSTH01BH>`);
  }
  if (/<\/HSCHUNGTU>/i.test(xmlString)) {
    return xmlString.replace(/<\/HSCHUNGTU>/i, `${chuKyBlock}</HSCHUNGTU>`);
  }
  return xmlString.replace(/(<\/[a-zA-Z0-9_]+>\s*)$/, `${chuKyBlock}$1`);
}

/**
 * Chuẩn bị hồ sơ XML để ký số theo đúng chuẩn XMLDSig / BHXH Việt Nam
 * (Dùng chung cho cả VNPT SmartCA và USB Token trên mọi mẫu: 3176 GIAMDINHHS,
 * 01BH HSTH01BH, TT12 HSDANHMUC, Chứng từ TT25 HSCHUNGTU).
 */
export async function prepareXmlForSigning(
  xmlString: string,
  certInfo: CertSigningInfo
): Promise<{
  hashToSign: string;
  buildSignedXml: (signatureBase64: string) => string;
}> {
  // Đối với hồ sơ Khám sức khỏe (12 bảng chuẩn Bộ Y Tế)
  if (xmlString.includes('<KHAMSUCKHOE')) {
    const cleanKskXml = xmlString.replace(/\s*<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/g, '');
    const hashToSign = await computeXmlHashBase64(cleanKskXml);
    return {
      hashToSign,
      buildSignedXml: (sig: string) => embedSignatureInXml(cleanKskXml, sig, certInfo.rawCertBase64, undefined, certInfo.subject),
    };
  }

  const cleanCert = (certInfo.rawCertBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const subjectName = certInfo.subject || 'CN=CSKCB';
  const signingTime = formatLocalSigningTime();

  // Chuẩn hóa dòng (\n) để C14N trong DOMParser, .NET XmlDocument.Load và LoadXml khớp 100% tuyệt đối
  const normalizedXml = xmlString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const noBom = normalizedXml.replace(/^\uFEFF/, '');
  const cleanPlaceholderXml = /<CHUKYDONVI(?:\s*\/>|\s*>[\s\S]*?<\/CHUKYDONVI>)/i.test(noBom)
    ? noBom.replace(/<CHUKYDONVI(?:\s*\/>|\s*>[\s\S]*?<\/CHUKYDONVI>)/i, '<CHUKYDONVI></CHUKYDONVI>')
    : noBom.replace(/(<\/[a-zA-Z0-9_]+>\s*)$/, '<CHUKYDONVI></CHUKYDONVI>$1');

  let targetId = '';
  let sigId = '';
  let objId = '';
  let objectDigest = '';
  let dataDigest = '';
  let signedInfoElement = '';
  let objectElement = '';
  let keyInfoXml = cleanCert
    ? `<KeyInfo><X509Data><X509SubjectName>${esc(subjectName)}</X509SubjectName><X509Certificate>${cleanCert}</X509Certificate></X509Data></KeyInfo>`
    : '';
  let hashToSign = '';

  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
  const parsedDoc = parser ? parser.parseFromString(cleanPlaceholderXml, 'text/xml') : null;
  const parseErr = parsedDoc?.getElementsByTagName('parsererror')?.length;

  if (parsedDoc && parsedDoc.documentElement && !parseErr) {
    const rootEl = parsedDoc.documentElement;
    // Tìm phần tử dữ liệu có thuộc tính Id (THONGTINHOSO, DS_CHITIET, DANHSACH_...) ngoài CHUKYDONVI
    const allWithId = Array.from(rootEl.querySelectorAll('[Id]'));
    const targetNode = allWithId.find(el => {
      let p: Element | null = el;
      while (p) {
        if (p.localName === 'CHUKYDONVI') return false;
        p = p.parentElement;
      }
      return true;
    });
    targetId = targetNode?.getAttribute('Id') || '';

    // Với GIAMDINHHS (XML 3176) luôn ký Enveloped toàn tài liệu (URI="") trừ khi có node Id
    const sigSuffix = targetId || `Id-${genId()}`;
    sigId = `CHUKYDONVI-${sigSuffix}`;
    objId = `Object-${sigId}`;
    const sigPropId = `SignatureProperty-${sigId}`;

    // Tạo thẻ <Signature> và <Object> ngay trong DOM để C14N thừa hưởng đúng namespace từ tổ tiên
    let chuKyEl = Array.from(rootEl.children).find(c => c.localName === 'CHUKYDONVI') || null;
    if (!chuKyEl) {
      chuKyEl = parsedDoc.createElement('CHUKYDONVI');
      rootEl.appendChild(chuKyEl);
    }

    const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
    const sigEl = parsedDoc.createElementNS(XMLDSIG_NS, 'Signature');
    sigEl.setAttribute('Id', sigId);
    chuKyEl.appendChild(sigEl);

    const objEl = parsedDoc.createElementNS(XMLDSIG_NS, 'Object');
    objEl.setAttribute('Id', objId);
    const sigPropsEl = parsedDoc.createElementNS('', 'SignatureProperties');
    const sigPropEl = parsedDoc.createElementNS('', 'SignatureProperty');
    sigPropEl.setAttribute('Id', sigPropId);
    sigPropEl.setAttribute('Target', `#${sigId}`);
    const timeEl = parsedDoc.createElementNS('', 'SigningTime');
    timeEl.textContent = signingTime;
    sigPropEl.appendChild(timeEl);
    sigPropsEl.appendChild(sigPropEl);
    objEl.appendChild(sigPropsEl);
    sigEl.appendChild(objEl);

    const canonicalObject = canonicalizeElementC14n(objEl);
    objectDigest = await computeXmlHashBase64(canonicalObject);

    if (targetId && targetNode) {
      const canonicalTarget = canonicalizeElementC14n(targetNode);
      dataDigest = await computeXmlHashBase64(canonicalTarget);
    } else {
      // Enveloped signature: C14N toàn bộ document nhưng loại bỏ chính thẻ <Signature>
      const canonicalRoot = canonicalizeElementC14n(rootEl, el => el === sigEl);
      dataDigest = await computeXmlHashBase64(canonicalRoot);
    }

    const secondRefXml = targetId
      ? `<Reference URI="#${targetId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${dataDigest}</DigestValue></Reference>`
      : `<Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${dataDigest}</DigestValue></Reference>`;

    // Tạo <SignedInfo> trong DOM dưới <Signature> để C14N tính hash chính xác 100% với .NET SignedXml
    const siWrapperDoc = parser!.parseFromString(
      `<SignedInfo xmlns="${XMLDSIG_NS}"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${objId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${objectDigest}</DigestValue></Reference>${secondRefXml}</SignedInfo>`,
      'text/xml'
    );
    const siEl = parsedDoc.importNode(siWrapperDoc.documentElement, true) as Element;
    sigEl.insertBefore(siEl, objEl);

    const canonicalSignedInfo = canonicalizeElementC14n(siEl);
    hashToSign = await computeXmlHashBase64(canonicalSignedInfo);

    signedInfoElement = `<SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${objId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${objectDigest}</DigestValue></Reference>${secondRefXml}</SignedInfo>`;
    objectElement = `<Object Id="${objId}"><SignatureProperties xmlns=""><SignatureProperty Target="#${sigId}" Id="${sigPropId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
  } else {
    // Fallback an toàn nếu môi trường không có DOMParser
    const hoSoMatch = xmlString.match(/<(?:THONGTINHOSO|DS_CHITIET|DANHSACH_[A-Z0-9_]+)\s+[^>]*Id="([^"]+)"/i);
    targetId = hoSoMatch ? hoSoMatch[1] : '';
    const sigSuffix = targetId || `Id-${genId()}`;
    sigId = `CHUKYDONVI-${sigSuffix}`;
    objId = `Object-${sigId}`;
    const sigPropId = `SignatureProperty-${sigId}`;

    const hasXsdNs = xmlString.includes('xmlns:xsd="http://www.w3.org/2001/XMLSchema"');
    const nsInherit = hasXsdNs
      ? ' xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
      : '';
    const canonicalObject = `<Object xmlns="http://www.w3.org/2000/09/xmldsig#"${nsInherit} Id="${objId}"><SignatureProperties xmlns=""><SignatureProperty Id="${sigPropId}" Target="#${sigId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
    objectDigest = await computeXmlHashBase64(canonicalObject);

    const docForDigest = cleanPlaceholderXml.replace(/\r\n/g, '\n').replace(/^\s*<\?xml[^>]*\?>\s*/i, '').trim();
    dataDigest = await computeXmlHashBase64(docForDigest);

    const secondRefC14n = `<Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${dataDigest}</DigestValue></Reference>`;
    const canonicalSignedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"${nsInherit}><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod><Reference URI="#${objId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${objectDigest}</DigestValue></Reference>${secondRefC14n}</SignedInfo>`;
    hashToSign = await computeXmlHashBase64(canonicalSignedInfo);

    signedInfoElement = `<SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${objId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${objectDigest}</DigestValue></Reference><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${dataDigest}</DigestValue></Reference></SignedInfo>`;
    objectElement = `<Object Id="${objId}"><SignatureProperties xmlns=""><SignatureProperty Target="#${sigId}" Id="${sigPropId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
  }

  const buildSignedXml = (signatureBase64: string) => {
    const cleanSig = signatureBase64.replace(/\s+/g, '');
    const sigBlock = `<CHUKYDONVI><Signature Id="${sigId}" xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoElement}<SignatureValue>${cleanSig}</SignatureValue>${keyInfoXml}${objectElement}</Signature></CHUKYDONVI>`;
    return injectChuKyDonViXml(normalizedXml, sigBlock);
  };

  return { hashToSign, buildSignedXml };
}

/**
 * Nhúng chữ ký số vào XML wrapper - đúng chuẩn XMLDSig BHXH
 */
export function embedSignatureInXml(
  xmlString: string,
  signatureBase64: string,
  certBase64?: string,
  digestBase64?: string,
  subjectDN?: string
): string {
  if (xmlString.includes('<KHAMSUCKHOE')) {
    const cleanSig = signatureBase64.replace(/\s+/g, '');
    const kskSigBlock = `  <CHUKYDONVI>\n    <CKS_NGUOI_KET_LUAN>${cleanSig}</CKS_NGUOI_KET_LUAN>\n    <CKS_BENH_VIEN>${cleanSig}</CKS_BENH_VIEN>\n  </CHUKYDONVI>`;
    if (xmlString.includes('<CHUKYDONVI>')) {
      return xmlString.replace(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/, kskSigBlock.trim());
    }
    return xmlString.replace('</KHAMSUCKHOE>', kskSigBlock + '\n</KHAMSUCKHOE>');
  }

  const cleanCert = (certBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const subject = subjectDN || 'CN=CSKCB';
  const hoSoMatch = xmlString.match(/<(?:THONGTINHOSO|DS_CHITIET|DANHSACH_[A-Z0-9_]+)\s+[^>]*Id="([^"]+)"/i);
  const hoSoId = hoSoMatch ? hoSoMatch[1] : '';
  const isEnveloped = !hoSoId;

  const keyInfoXml = cleanCert
    ? `<KeyInfo><X509Data><X509SubjectName>${esc(subject)}</X509SubjectName><X509Certificate>${cleanCert}</X509Certificate></X509Data></KeyInfo>`
    : '';

  const signingTime = formatLocalSigningTime();
  const sigSuffix = hoSoId || `Id-${genId()}`;
  const sigId = `CHUKYDONVI-${sigSuffix}`;
  const objId = `Object-${sigId}`;
  const sigPropId = `SignatureProperty-${sigId}`;
  const digest = digestBase64 || '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

  const objectElement = `<Object Id="${objId}"><SignatureProperties xmlns=""><SignatureProperty Target="#${sigId}" Id="${sigPropId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
  const refTargetXml = isEnveloped
    ? `<Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${digest}</DigestValue></Reference>`
    : `<Reference URI="#${hoSoId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${digest}</DigestValue></Reference>`;

  const signedInfoElement = `<SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#${objId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${digest}</DigestValue></Reference>${refTargetXml}</SignedInfo>`;
  const sigBlock = `<CHUKYDONVI><Signature Id="${sigId}" xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoElement}<SignatureValue>${signatureBase64.replace(/\s+/g, '')}</SignatureValue>${keyInfoXml}${objectElement}</Signature></CHUKYDONVI>`;

  return injectChuKyDonViXml(xmlString, sigBlock);
}

/**
 * Chuyển XML string thành Base64 (UTF-8) để đẩy cổng BHXH
 */
export function xmlToBase64(xmlString: string): string {
  const utf8Bytes = new TextEncoder().encode(xmlString);
  let binary = '';
  utf8Bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
