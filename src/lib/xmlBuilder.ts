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
export function buildXml(type: DocType, data: Record<string, string>, maCskcb: string): string {
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
 * Chuẩn bị hồ sơ XML để ký số theo đúng chuẩn Phụ lục 02 - BHXH Việt Nam
 * 1. Tính DigestValue của <THONGTINHOSO Id="...">
 * 2. Tạo <Object> chứa thời gian ký (SigningTime) và tính DigestValue
 * 3. Tạo <SignedInfo> chứa cả 2 Reference
 * 4. Trả về hash của <SignedInfo> để VNPT SmartCA ký
 * 5. Cung cấp hàm buildSignedXml để nhúng chữ ký hoàn chỉnh
 */
export async function prepareXmlForSigning(
  xmlString: string,
  certInfo: CertSigningInfo
): Promise<{
  hashToSign: string;
  buildSignedXml: (signatureBase64: string) => string;
}> {
  // Đối với hồ sơ Khám sức khỏe
  if (xmlString.includes('<KHAMSUCKHOE')) {
    const hashToSign = await computeXmlHashBase64(xmlString);
    return {
      hashToSign,
      buildSignedXml: (sig: string) => embedSignatureInXml(xmlString, sig, certInfo.rawCertBase64)
    };
  }

  // Chuẩn Phụ lục 02 - TT25 BHXH Việt Nam
  const hoSoIdMatch = xmlString.match(/<THONGTINHOSO\s+Id="([^"]+)"/i);
  const hoSoId = hoSoIdMatch ? hoSoIdMatch[1] : `Id-${genId()}`;

  // Trích xuất nội dung <THONGTINHOSO>...</THONGTINHOSO> để tính DigestValue
  const thongTinHoSoMatch = xmlString.match(/<THONGTINHOSO[\s\S]*?<\/THONGTINHOSO>/i);
  const thongTinHoSoXml = thongTinHoSoMatch ? thongTinHoSoMatch[0] : xmlString;
  const hosoDigest = await computeXmlHashBase64(thongTinHoSoXml);

  const signingTime = new Date().toISOString().slice(0, 19);
  const objectXml = `<Object Id="Object-CHUKYDONVI-${hoSoId}"><SignatureProperties xmlns=""><SignatureProperty Target="#CHUKYDONVI-${hoSoId}" Id="SignatureProperty-CHUKYDONVI-${hoSoId}"><SigningTime>${signingTime}</SigningTime></SignatureProperty></SignatureProperties></Object>`;
  const objectDigest = await computeXmlHashBase64(objectXml);

  // Cấu trúc SignedInfo chuẩn W3C XMLDSig cho BHXH
  const signedInfoInner = `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><Reference URI="#Object-CHUKYDONVI-${hoSoId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${objectDigest}</DigestValue></Reference><Reference URI="#${hoSoId}"><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>${hosoDigest}</DigestValue></Reference>`;
  const signedInfoXml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoInner}</SignedInfo>`;

  // Hash của SignedInfo gửi tới SmartCA ký
  const hashToSign = await computeXmlHashBase64(signedInfoXml);

  const cleanCert = (certInfo.rawCertBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const subjectName = certInfo.subject || 'CN=CSKCB';

  const buildSignedXml = (signatureBase64: string) => {
    const cleanSig = signatureBase64.replace(/\s+/g, '');
    const sigBlock = `
  <CHUKYDONVI>
    <Signature Id="CHUKYDONVI-${hoSoId}" xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        ${signedInfoInner}
      </SignedInfo>
      <SignatureValue>${cleanSig}</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509SubjectName>${esc(subjectName)}</X509SubjectName>
          <X509Certificate>${cleanCert}</X509Certificate>
        </X509Data>
      </KeyInfo>
      ${objectXml}
    </Signature>
  </CHUKYDONVI>`;

    if (xmlString.includes('<CHUKYDONVI/>')) {
      return xmlString.replace('<CHUKYDONVI/>', sigBlock.trim());
    }
    if (xmlString.includes('<CHUKYDONVI>')) {
      return xmlString.replace(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/, sigBlock.trim());
    }
    if (xmlString.includes('</HSCHUNGTU>')) {
      return xmlString.replace('</HSCHUNGTU>', sigBlock + '\n</HSCHUNGTU>');
    }
    if (xmlString.includes('</DU_LIEU_KHAM_SUC_KHOE>')) {
      return xmlString.replace('</DU_LIEU_KHAM_SUC_KHOE>', sigBlock + '\n</DU_LIEU_KHAM_SUC_KHOE>');
    }
    return xmlString + sigBlock;
  };

  return { hashToSign, buildSignedXml };
}

/**
 * Nhúng chữ ký số vào XML wrapper - đúng chuẩn XMLDSig Phụ lục 02 BHXH
 */
export function embedSignatureInXml(
  xmlString: string,
  signatureBase64: string,
  certBase64?: string,
  digestBase64?: string,
  subjectDN?: string
): string {
  if (xmlString.includes('<KHAMSUCKHOE')) {
    const kskSigBlock = `
  <CHUKYDONVI>
    <CKS_NGUOI_KET_LUAN>${signatureBase64}</CKS_NGUOI_KET_LUAN>
    <CKS_BENH_VIEN>${signatureBase64}</CKS_BENH_VIEN>
  </CHUKYDONVI>`;
    return xmlString.replace('</KHAMSUCKHOE>', kskSigBlock + '\n</KHAMSUCKHOE>');
  }

  const hoSoIdMatch = xmlString.match(/<THONGTINHOSO\s+Id="([^"]+)"/i);
  const hoSoId = hoSoIdMatch ? hoSoIdMatch[1] : `Id-${genId()}`;
  const cleanCert = (certBase64 || '').replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const subject = subjectDN || 'CN=CSKCB';
  const signingTime = new Date().toISOString().slice(0, 19);

  // Định dạng chữ ký chuẩn XMLDSig Phụ lục 02
  const sigBlock = `
  <CHUKYDONVI>
    <Signature Id="CHUKYDONVI-${hoSoId}" xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <Reference URI="#Object-CHUKYDONVI-${hoSoId}">
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <DigestValue>${digestBase64 || '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='}</DigestValue>
        </Reference>
        <Reference URI="#${hoSoId}">
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <DigestValue>${digestBase64 || '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='}</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>${signatureBase64.replace(/\s+/g, '')}</SignatureValue>
      ${cleanCert ? `
      <KeyInfo>
        <X509Data>
          <X509SubjectName>${esc(subject)}</X509SubjectName>
          <X509Certificate>${cleanCert}</X509Certificate>
        </X509Data>
      </KeyInfo>` : ''}
      <Object Id="Object-CHUKYDONVI-${hoSoId}">
        <SignatureProperties xmlns="">
          <SignatureProperty Target="#CHUKYDONVI-${hoSoId}" Id="SignatureProperty-CHUKYDONVI-${hoSoId}">
            <SigningTime>${signingTime}</SigningTime>
          </SignatureProperty>
        </SignatureProperties>
      </Object>
    </Signature>
  </CHUKYDONVI>`;

  if (xmlString.includes('<CHUKYDONVI/>')) {
    return xmlString.replace('<CHUKYDONVI/>', sigBlock.trim());
  }
  if (xmlString.includes('<CHUKYDONVI>')) {
    return xmlString.replace(/<CHUKYDONVI>[\s\S]*?<\/CHUKYDONVI>/, sigBlock.trim());
  }
  if (xmlString.includes('</HSCHUNGTU>')) {
    return xmlString.replace('</HSCHUNGTU>', sigBlock + '\n</HSCHUNGTU>');
  }
  if (xmlString.includes('</DU_LIEU_KHAM_SUC_KHOE>')) {
    return xmlString.replace('</DU_LIEU_KHAM_SUC_KHOE>', sigBlock + '\n</DU_LIEU_KHAM_SUC_KHOE>');
  }
  return xmlString + sigBlock;
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
