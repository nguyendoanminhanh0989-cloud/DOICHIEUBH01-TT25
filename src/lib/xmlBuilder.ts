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

export type DocType = 'CT03' | 'CT04' | 'CT05' | 'CT06' | 'CT07' | 'GIAYDIEUTRINOITRU' | 'GIAYDIEUTRIVOSINH' | 'GIAYSUCKHOEME';

/** Mã loaiHs để đẩy API cổng BHXH */
export const LOAI_HS_MAP: Record<string, string> = {
  CT03: '39',
  CT04: '39',
  CT05: '61',   // Giấy chứng sinh
  CT06: '39',
  CT07: '39',
  GIAYDIEUTRINOITRU: '39',
  GIAYDIEUTRIVOSINH: '39',
  GIAYSUCKHOEME: '39',
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

/** Format ngày theo chuẩn BHXH: YYYYMMDD */
function fmtDate(d: string): string {
  if (!d) return '';
  // Thử parse dd/MM/yyyy
  const parts = d.split('/');
  if (parts.length === 3) return `${parts[2]}${parts[1].padStart(2,'0')}${parts[0].padStart(2,'0')}`;
  // Excel serial number
  if (/^\d+$/.test(d)) {
    const dt = new Date((parseInt(d) - 25569) * 86400 * 1000);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  // yyyy-MM-dd
  return d.replace(/-/g, '').substring(0, 8);
}

/** ===========================
 *  CT03 - GIẤY RA VIỆN (Mẫu số 02 - TT25)
 * =========================== */
export function buildCT03Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GRV>
  <MA_BHXH>${esc(data.MA_BHXH)}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE)}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN)}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH)}</GIOI_TINH>
  <MA_DANTOC>${esc(data.MA_DANTOC || '01')}</MA_DANTOC>
  <NGHE_NGHIEP>${esc(data.NGHE_NGHIEP)}</NGHE_NGHIEP>
  <DIA_CHI>${esc(data.DIA_CHI)}</DIA_CHI>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD)}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD)}</NGAYCAP_CCCD>
  <SO_LUU_TRU>${esc(data.SO_LUU_TRU)}</SO_LUU_TRU>
  <MA_YTE>${esc(data.MA_YTE)}</MA_YTE>
  <MA_KHOA>${esc(data.MA_KHOA)}</MA_KHOA>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA)}</NGAY_RA>
  <DINH_CHI_THAI_NGHEN>${esc(data.DINH_CHI_THAI_NGHEN || '0')}</DINH_CHI_THAI_NGHEN>
  <TUOI_THAI>${esc(data.TUOI_THAI)}</TUOI_THAI>
  <BENHICD10_ID>${esc(data.BENHICD10_ID)}</BENHICD10_ID>
  <CHAN_DOAN>${esc(data.CHAN_DOAN)}</CHAN_DOAN>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI)}</PP_DIEUTRI>
  <GHI_CHU>${esc(data.GHI_CHU)}</GHI_CHU>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA)}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME)}</HO_TEN_ME>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
  <NGOAITRU_TUNGAY>${fmtDate(data.NGOAITRU_TUNGAY)}</NGOAITRU_TUNGAY>
  <NGOAITRU_DENNGAY>${fmtDate(data.NGOAITRU_DENNGAY)}</NGOAITRU_DENNGAY>
  <THU_TRUONG_DVI>${esc(data.THU_TRUONG_DVI)}</THU_TRUONG_DVI>
  <MA_CCHN_TRUONGKHOA>${esc(data.MA_CCHN_TRUONGKHOA)}</MA_CCHN_TRUONGKHOA>
  <TEN_TRUONGKHOA>${esc(data.TEN_TRUONGKHOA)}</TEN_TRUONGKHOA>
  <NGAY_CHUNG_TU>${fmtDate(data.NGAY_CHUNG_TU)}</NGAY_CHUNG_TU>
</GRV>`;
}

/** ===========================
 *  CT04 - TÓM TẮT HSBA (Mẫu số 03 - TT25)
 * =========================== */
export function buildCT04Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<TOMTATBA>
  <SO_SERI>${esc(data.SO_SERI)}</SO_SERI>
  <MA_BHXH>${esc(data.MA_BHXH)}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE)}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN)}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH)}</GIOI_TINH>
  <MA_DANTOC>${esc(data.MA_DANTOC || '01')}</MA_DANTOC>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA)}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME)}</HO_TEN_ME>
  <TEN_DONVI>${esc(data.TEN_DONVI)}</TEN_DONVI>
  <NGUOI_DAI_DIEN>${esc(data.NGUOI_DAI_DIEN)}</NGUOI_DAI_DIEN>
  <NGAY_CT>${fmtDate(data.NGAY_CT)}</NGAY_CT>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA)}</NGAY_RA>
  <CHAN_DOAN_VAO>${esc(data.CHAN_DOAN_VAO)}</CHAN_DOAN_VAO>
  <CHAN_DOAN_RA>${esc(data.CHAN_DOAN_RA)}</CHAN_DOAN_RA>
  <QT_BENHLY>${esc(data.QT_BENHLY)}</QT_BENHLY>
  <TOMTAT_KQ>${esc(data.TOMTAT_KQ)}</TOMTAT_KQ>
  <PP_DIEUTRI>${esc(data.PP_DIEUTRI)}</PP_DIEUTRI>
  <NGAY_SINHCON>${fmtDate(data.NGAY_SINHCON)}</NGAY_SINHCON>
  <NGAY_CHETCON>${fmtDate(data.NGAY_CHETCON)}</NGAY_CHETCON>
  <SO_CONCHET>${esc(data.SO_CONCHET || '0')}</SO_CONCHET>
  <TT_RAVIEN>${esc(data.TT_RAVIEN)}</TT_RAVIEN>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
</TOMTATBA>`;
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
  <NGAY_SINH_CON>${fmtDate(data.NGAY_SINH_CON)}</NGAY_SINH_CON>
  <TINH_TRANG_CON>${esc(data.TINH_TRANG_CON)}</TINH_TRANG_CON>
  <SINHCON_PHAUTHUAT>${esc(data.SINHCON_PHAUTHUAT || '0')}</SINHCON_PHAUTHUAT>
  <SINHCON_DUOI32TUAN>${esc(data.SINHCON_DUOI32TUAN || '0')}</SINHCON_DUOI32TUAN>
  <NGUOI_DO_DE>${esc(data.NGUOI_DO_DE)}</NGUOI_DO_DE>
  <NGUOI_GHI_PHIEU>${esc(data.NGUOI_GHI_PHIEU)}</NGUOI_GHI_PHIEU>
  <THU_TRUONG_DVI>${esc(data.THU_TRUONG_DVI)}</THU_TRUONG_DVI>
  <NGAY_CT>${fmtDate(data.NGAY_CT)}</NGAY_CT>
</GIAYCHUNGSINH>`;
}

/** ===========================
 *  CT06 - GIẤY XÁC NHẬN NGHỈ DƯỠNG THAI (Mẫu số 11 - TT25)
 * =========================== */
export function buildCT06Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GIAYXACNHANNGHIDUONGTHAI>
  <SO_SERI>${esc(data.SO_SERI)}</SO_SERI>
  <MA_BHXH>${esc(data.MA_BHXH)}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE)}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN)}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH)}</NGAY_SINH>
  <NGAY_VAO>${fmtDate(data.NGAY_VAO)}</NGAY_VAO>
  <NGAY_RA>${fmtDate(data.NGAY_RA)}</NGAY_RA>
  <CHAN_DOAN>${esc(data.CHAN_DOAN)}</CHAN_DOAN>
  <NGUOI_DAI_DIEN>${esc(data.NGUOI_DAI_DIEN)}</NGUOI_DAI_DIEN>
  <MA_BS>${esc(data.MA_BS)}</MA_BS>
  <TEN_BS>${esc(data.TEN_BS)}</TEN_BS>
  <TEN_DVI>${esc(data.TEN_DVI)}</TEN_DVI>
  <SO_KCB>${esc(data.SO_KCB)}</SO_KCB>
  <NGAY_CT>${fmtDate(data.NGAY_CT)}</NGAY_CT>
  <MA_CT>${esc(data.MA_CT || 'CT06')}</MA_CT>
</GIAYXACNHANNGHIDUONGTHAI>`;
}

/** ===========================
 *  CT07 - GIẤY CHỨNG NHẬN NGHỈ VIỆC HƯỞNG BHXH (Mẫu số 07 - TT25)
 * =========================== */
export function buildCT07Content(data: Record<string, string>): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GIAYCHUNGNHANNGHIVIEC>
  <MAU_SO>${esc(data.MAU_SO || 'CT07')}</MAU_SO>
  <SO_SERI>${esc(data.SO_SERI)}</SO_SERI>
  <SO_KCB>${esc(data.SO_KCB)}</SO_KCB>
  <NGAY_KCB>${fmtDate(data.NGAY_KCB)}</NGAY_KCB>
  <MA_BHXH>${esc(data.MA_BHXH)}</MA_BHXH>
  <MA_THE>${esc(data.MA_THE)}</MA_THE>
  <HO_TEN>${esc(data.HO_TEN)}</HO_TEN>
  <NGAY_SINH>${fmtDate(data.NGAY_SINH)}</NGAY_SINH>
  <GIOI_TINH>${esc(data.GIOI_TINH)}</GIOI_TINH>
  <DON_VI>${esc(data.DON_VI)}</DON_VI>
  <CHANDOAN_DIEUTRI>${esc(data.CHANDOAN_DIEUTRI)}</CHANDOAN_DIEUTRI>
  <TU_NGAY>${fmtDate(data.TU_NGAY)}</TU_NGAY>
  <DEN_NGAY>${fmtDate(data.DEN_NGAY)}</DEN_NGAY>
  <HO_TEN_CHA>${esc(data.HO_TEN_CHA)}</HO_TEN_CHA>
  <HO_TEN_ME>${esc(data.HO_TEN_ME)}</HO_TEN_ME>
  <TEKT>${esc(data.TEKT || '0')}</TEKT>
  <LOAI_GIAYTO>${esc(data.LOAI_GIAYTO || '1')}</LOAI_GIAYTO>
  <SO_CCCD>${esc(data.SO_CCCD)}</SO_CCCD>
  <NGAYCAP_CCCD>${fmtDate(data.NGAYCAP_CCCD)}</NGAYCAP_CCCD>
  <BENH_ICD10_ID>${esc(data.BENH_ICD10_ID)}</BENH_ICD10_ID>
  <THU_TRUONG_DV>${esc(data.THU_TRUONG_DV)}</THU_TRUONG_DV>
  <MA_CCHN>${esc(data.MA_CCHN)}</MA_CCHN>
  <TEN_NGUOI_HANH_NGHE>${esc(data.TEN_NGUOI_HANH_NGHE)}</TEN_NGUOI_HANH_NGHE>
  <NGAY_CHUNG_TU>${fmtDate(data.NGAY_CHUNG_TU)}</NGAY_CHUNG_TU>
</GIAYCHUNGNHANNGHIVIEC>`;
}

/** Build nội dung XML của từng chứng từ (sẽ được nhúng vào wrapper) */
export function buildDocContent(type: DocType, data: Record<string, string>): string {
  switch (type) {
    case 'CT03': return buildCT03Content(data);
    case 'CT04': return buildCT04Content(data);
    case 'CT05': return buildCT05Content(data);
    case 'CT06': return buildCT06Content(data);
    case 'CT07': return buildCT07Content(data);
    default: return buildCT03Content(data);
  }
}

/**
 * Build XML wrapper <HSCHUNGTU> theo đúng chuẩn Phụ lục 02
 * Chứa nhiều hồ sơ (FILEHOSO) trong <DANHSACHHOSO>
 */
export function buildHSCHUNGTU(
  maCskcb: string,
  hosoList: Array<{ loaiHs: string; base64Content: string; }>
): string {
  const hoSoId = `Id-${genId()}`;
  const ngayLap = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const fileHosoBlocks = hosoList.map(hs => `
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
      <HOSO>${fileHosoBlocks}
      </HOSO>
    </DANHSACHHOSO>
  </THONGTINHOSO>
  <CHUKYDONVI/>
</HSCHUNGTU>`;
}

/**
 * Build XML đơn lẻ (cho 1 hồ sơ) - tương thích API cũ
 */
export function buildXml(type: DocType, data: Record<string, string>, maCskcb: string): string {
  const content = buildDocContent(type, data);
  const contentBase64 = xmlToBase64(content);
  return buildHSCHUNGTU(maCskcb, [{ loaiHs: type, base64Content: contentBase64 }]);
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

/**
 * Nhúng chữ ký số vào XML wrapper - đúng chuẩn XMLDSig
 */
export function embedSignatureInXml(xmlString: string, signatureBase64: string, certBase64?: string): string {
  const sigBlock = `
  <CHUKYDONVI>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <Reference URI="">
          <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        </Reference>
      </SignedInfo>
      <SignatureValue>${signatureBase64}</SignatureValue>
      ${certBase64 ? `<KeyInfo><X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data></KeyInfo>` : ''}
    </Signature>
  </CHUKYDONVI>`;

  // Thay thế <CHUKYDONVI/> rỗng hoặc thêm vào trước đóng </HSCHUNGTU>
  if (xmlString.includes('<CHUKYDONVI/>')) {
    return xmlString.replace('<CHUKYDONVI/>', sigBlock);
  }
  return xmlString.replace('</HSCHUNGTU>', sigBlock + '\n</HSCHUNGTU>');
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
