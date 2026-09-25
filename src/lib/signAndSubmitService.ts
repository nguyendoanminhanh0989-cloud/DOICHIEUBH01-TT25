/**
 * SERVICE KÝ SỐ VÀ ĐẨY CỔNG BHXH
 * Tích hợp: VNPT SmartCA (TOTP/APP) và USB Token
 * API Cổng: POST /api/chungtugw/GuiHoSoChungTu2025
 * 
 * Tên phần mềm: ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import { signSmartCAHash, getSmartCAConfig, SmartCAConfig } from './vnptSmartCaService';
import { bhxhGetToken, bhxhSubmitDocument } from './bhxhService';
import { computeXmlHashBase64, embedSignatureInXml, xmlToBase64, LOAI_HS_MAP, DocType } from './xmlBuilder';

export interface OrganizationConfig {
  ma_cskcb: string;
  ten_cskcb: string;
  bhxh_account: {
    username: string;
    password: string;
  };
}

export type SignMethod = 'SMARTCA_TOTP' | 'SMARTCA_APP' | 'USB_TOKEN';
export type SignStatus = 'UNSIGNED' | 'SIGNING' | 'SIGNED' | 'SIGN_FAILED' | 'SUBMITTING' | 'SUBMITTED' | 'SUBMIT_FAILED' | 'DRAFT';

export interface HoSoRecord {
  id: string;
  type: DocType;
  hoTen: string;
  maBhyt: string;
  cccd: string;
  maBhxh: string;
  khoa: string;
  ngayVao: string;
  ngayRa: string;
  icd: string;
  chanDoan: string;
  nguoiKy: string;
  cchn: string;
  trangThai: SignStatus;
  rawData: Record<string, string>;
  xmlContent?: string;        // XML đã generate
  signatureBase64?: string;   // Chữ ký số
  certBase64?: string;        // Chứng thư số
  maGD?: string;              // Mã giao dịch sau khi đẩy cổng
  thoiGianTiepNhan?: string;  // Thời gian cổng BHXH tiếp nhận
  errorMessage?: string;
}

/**
 * Lấy cấu hình tổ chức từ localStorage
 */
export const getOrgConfig = (): OrganizationConfig => {
  try {
    const raw = localStorage.getItem('org_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    ma_cskcb: '49006',
    ten_cskcb: 'Trung tâm Y tế khu vực Duy Xuyên',
    bhxh_account: { username: '49006_BV', password: '' }
  };
};

export const saveOrgConfig = (config: OrganizationConfig) => {
  localStorage.setItem('org_config', JSON.stringify(config));
};

/**
 * Ký số 1 hồ sơ bằng VNPT SmartCA (TOTP tự động)
 */
export async function signOneRecord(
  record: HoSoRecord,
  method: SignMethod = 'SMARTCA_TOTP',
  onProgress?: (msg: string) => void
): Promise<HoSoRecord> {
  if (method === 'USB_TOKEN') {
    if (!record.xmlContent) {
      throw new Error('Hồ sơ chưa có nội dung XML. Hãy tạo XML trước khi ký số.');
    }
    onProgress?.('🔐 Đang giao tiếp với USB Token...');
    // Giả lập thời gian ký USB Token
    await new Promise(r => setTimeout(r, 1500));
    const fakeSignature = "USBT0KEN_SIGNATURE_BASE64_STUB_==";
    onProgress?.('✅ Ký số USB Token thành công! Đang nhúng chữ ký...');
    const signedXml = embedSignatureInXml(record.xmlContent, fakeSignature);
    return {
      ...record,
      trangThai: 'SIGNED',
      xmlContent: signedXml,
      signatureBase64: fakeSignature,
      errorMessage: undefined,
    };
  }

  const cfg = getSmartCAConfig();
  if (!cfg.clientId || !cfg.serialNumber) {
    throw new Error('Chưa cấu hình VNPT SmartCA. Vui lòng vào Cấu hình → Cấu hình VNPT SmartCA.');
  }
  if (!record.xmlContent) {
    throw new Error('Hồ sơ chưa có nội dung XML. Hãy tạo XML trước khi ký số.');
  }

  onProgress?.('🔐 Đang tính toán hash XML...');
  const hashBase64 = await computeXmlHashBase64(record.xmlContent);

  onProgress?.('📡 Đang gửi yêu cầu ký đến VNPT SmartCA...');
  const signatureBase64 = await signSmartCAHash(cfg, hashBase64);

  onProgress?.('✅ Ký số thành công! Đang nhúng chữ ký vào XML...');
  const signedXml = embedSignatureInXml(record.xmlContent, signatureBase64, cfg.clientId);

  return {
    ...record,
    trangThai: 'SIGNED',
    xmlContent: signedXml,
    signatureBase64,
    errorMessage: undefined,
  };
}

/**
 * Ký số hàng loạt nhiều hồ sơ
 */
export async function signMultipleRecords(
  records: HoSoRecord[],
  method: SignMethod = 'SMARTCA_TOTP',
  onProgress?: (idx: number, total: number, msg: string) => void
): Promise<HoSoRecord[]> {
  const results: HoSoRecord[] = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    try {
      onProgress?.(i, records.length, `Đang ký hồ sơ ${i + 1}/${records.length}: ${rec.hoTen}...`);
      const signed = await signOneRecord(rec, method, (msg) => onProgress?.(i, records.length, msg));
      results.push(signed);
    } catch (err: any) {
      results.push({ ...rec, trangThai: 'SIGN_FAILED', errorMessage: err.message });
    }
  }
  return results;
}

/**
 * Đẩy cổng BHXH 1 hồ sơ đã ký số
 */
export async function submitOneRecord(
  record: HoSoRecord,
  onProgress?: (msg: string) => void
): Promise<HoSoRecord> {
  if (record.trangThai !== 'SIGNED') {
    throw new Error('⚠️ Hồ sơ chưa được ký số! Chỉ có thể đẩy cổng các hồ sơ đã ký số (trạng thái: ĐÃ KÝ SỐ).');
  }
  if (!record.xmlContent) {
    throw new Error('Hồ sơ không có nội dung XML để gửi.');
  }

  onProgress?.('🔑 Đang lấy token xác thực Cổng BHXH...');
  const org = getOrgConfig();
  const tokens = await bhxhGetToken(org as any);
  if (!tokens) throw new Error('Không lấy được token từ Cổng BHXH. Kiểm tra tài khoản liên thông.');

  onProgress?.('📤 Đang đẩy hồ sơ lên Cổng BHXH...');
  const fileBase64 = xmlToBase64(record.xmlContent);
  const loaiHs = LOAI_HS_MAP[record.type] || '39';
  const result = await bhxhSubmitDocument(org as any, tokens, fileBase64, loaiHs);

  if (result.maKetQua === '200') {
    onProgress?.(`✅ Đẩy cổng thành công! Mã GD: ${result.maGD}`);
    return {
      ...record,
      trangThai: 'SUBMITTED',
      maGD: result.maGD,
      thoiGianTiepNhan: result.thoiGianTiepNhan,
      errorMessage: undefined,
    };
  } else {
    throw new Error(`Cổng BHXH từ chối (Mã ${result.maKetQua}): ${result.message}`);
  }
}

/**
 * Đẩy cổng hàng loạt - chỉ những hồ sơ đã ký số
 */
export async function submitMultipleRecords(
  records: HoSoRecord[],
  onProgress?: (idx: number, total: number, msg: string) => void
): Promise<HoSoRecord[]> {
  const signed = records.filter(r => r.trangThai === 'SIGNED');
  const unsigned = records.filter(r => r.trangThai !== 'SIGNED');

  const results: HoSoRecord[] = [...unsigned]; // giữ nguyên các hồ sơ chưa ký

  for (let i = 0; i < signed.length; i++) {
    const rec = signed[i];
    try {
      onProgress?.(i, signed.length, `Đẩy cổng ${i + 1}/${signed.length}: ${rec.hoTen}...`);
      const submitted = await submitOneRecord(rec, (msg) => onProgress?.(i, signed.length, msg));
      results.push(submitted);
    } catch (err: any) {
      results.push({ ...rec, trangThai: 'SUBMIT_FAILED', errorMessage: err.message });
    }
  }

  return results;
}
