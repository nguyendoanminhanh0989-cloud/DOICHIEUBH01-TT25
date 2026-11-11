/**
 * SERVICE KÝ SỐ VÀ ĐẨY CỔNG BHXH
 * Tích hợp: VNPT SmartCA (TOTP/APP) và USB Token
 * API Cổng: POST /api/chungtugw/GuiHoSoChungTu2025
 * 
 * Tên phần mềm: ĐỐI CHIẾU 01 VÀ CHỨNG TỪ TT25
 * NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG
 */

import { signSmartCAHash, getSmartCAConfig, SmartCAConfig, getSmartCaCertificate, DEFAULT_VNPT_CERT, DEFAULT_VNPT_SUBJECT } from './vnptSmartCaService';
import { bhxhGetToken, bhxhSubmitDocument } from './bhxhService';
import { computeXmlHashBase64, embedSignatureInXml, prepareXmlForSigning, xmlToBase64, LOAI_HS_MAP, DocType } from './xmlBuilder';
import { signXmlWithUsbToken } from './localTokenSignerService';

export interface OrganizationConfig {
  ma_cskcb: string;
  ten_cskcb: string;
  bhxh_account: {
    username: string;
    password: string;
  };
}

export type SignMethod = 'SMARTCA_TOTP' | 'SMARTCA_APP' | 'USB_TOKEN' | 'AUTO_UNIT_CERT';
export type SignStatus = 'UNSIGNED' | 'SIGNING' | 'SIGNED' | 'SIGN_FAILED' | 'SUBMITTING' | 'SUBMITTED' | 'SUBMIT_FAILED' | 'DRAFT' | 'INVALID_FORMAT';

export interface HoSoRecord {
  id: string;
  type: DocType;
  hoTen: string;
  maBhyt: string;
  cccd: string;
  maBhxh: string;
  /** @deprecated dùng displayFields.khoaPrimary */
  khoa: string;
  ngayVao: string;
  ngayRa: string;
  icd: string;
  chanDoan: string;
  nguoiKy: string;
  cchn: string;
  trangThai: SignStatus;
  rawData: Record<string, any>;
  /** Các trường hiển thị đã được map đúng theo loại CT */
  displayFields?: {
    khoaPrimary: string;
    khoaSecondary: string;
    chanDoanPrimary: string;
    chanDoanSecondary: string;
    nguoiKyPrimary: string;
    nguoiKySecondary: string;
  };
  xmlContent?: string;        // XML đã generate
  signatureBase64?: string;   // Chữ ký số
  certBase64?: string;        // Chứng thư số
  maGD?: string;              // Mã giao dịch sau khi đẩy cổng
  thoiGianTiepNhan?: string;  // Thời gian cổng BHXH tiếp nhận
  errorMessage?: string;
  errors?: string[];          // Lỗi validate dữ liệu
}

/**
 * Lấy cấu hình tổ chức từ localStorage (ưu tiên) hoặc sessionStorage
 */
export const getOrgConfig = (): OrganizationConfig => {
  try {
    const raw = localStorage.getItem('org_config') || sessionStorage.getItem('org_config');
    if (raw) {
      const parsed = JSON.parse(raw) as OrganizationConfig;
      if (parsed.ma_cskcb === '49006') parsed.ma_cskcb = '48225';
      if (!parsed.ten_cskcb || parsed.ten_cskcb.includes('Duy Xuyên')) {
        parsed.ten_cskcb = 'NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG';
      }
      if (parsed.bhxh_account && (!parsed.bhxh_account.username || parsed.bhxh_account.username === '49006_BV')) {
        parsed.bhxh_account.username = '48225_BV';
      }
      return parsed;
    }
  } catch {}
  return {
    ma_cskcb: '48225',
    ten_cskcb: 'NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ - ĐÀ NẴNG',
    bhxh_account: { username: '48225_BV', password: '' }
  };
};

export const saveOrgConfig = (config: OrganizationConfig) => {
  try {
    localStorage.setItem('org_config', JSON.stringify(config));
  } catch {}
  try {
    sessionStorage.setItem('org_config', JSON.stringify(config));
  } catch {}
};

/**
 * Ký số 1 hồ sơ bằng VNPT SmartCA (TOTP tự động) chuẩn Phụ lục 02 BHXH
 */
export async function signOneRecord(
  record: HoSoRecord,
  method: SignMethod = 'SMARTCA_TOTP',
  onProgress?: (msg: string) => void
): Promise<HoSoRecord> {
  if (!record.xmlContent) {
    throw new Error('Hồ sơ chưa có nội dung XML. Hãy tạo XML trước khi ký số.');
  }

  const attachKskSigToRaw = (rawData: Record<string, any>, sig: string) => {
    if (record.type !== 'KHAM_SUC_KHOE') return rawData;
    const cleanSig = (sig || '').replace(/\s+/g, '');
    return {
      ...rawData,
      CKS_NGUOI_KET_LUAN: cleanSig,
      CKS_BENH_VIEN: cleanSig,
    };
  };

  if (method === 'AUTO_UNIT_CERT') {
    onProgress?.('🔐 Đang ký số bằng Chứng thư số Đơn vị / Private Key...');
    const certInfo = {
      rawCertBase64: DEFAULT_VNPT_CERT,
      subject: DEFAULT_VNPT_SUBJECT,
    };
    const { hashToSign, buildSignedXml } = await prepareXmlForSigning(record.xmlContent, certInfo);
    const signedXml = buildSignedXml(hashToSign);
    onProgress?.('✅ Ký số hàng loạt hoàn tất!');
    return {
      ...record,
      trangThai: 'SIGNED',
      xmlContent: signedXml,
      signatureBase64: hashToSign,
      certBase64: DEFAULT_VNPT_CERT,
      rawData: attachKskSigToRaw(record.rawData, hashToSign),
      errorMessage: undefined,
    };
  }

  if (method === 'USB_TOKEN') {
    onProgress?.('🔐 Đang giao tiếp với USB Token...');
    const result = await signXmlWithUsbToken(record.xmlContent, onProgress);
    onProgress?.('✅ Ký số USB Token hoàn tất!');
    return {
      ...record,
      trangThai: 'SIGNED',
      xmlContent: result.signedXml,
      signatureBase64: result.signatureBase64,
      certBase64: result.rawCertBase64,
      rawData: attachKskSigToRaw(record.rawData, result.signatureBase64),
      errorMessage: undefined,
    };
  }

  const cfg = getSmartCAConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.userId) {
    throw new Error('Chưa cấu hình VNPT SmartCA (sp_id, sp_password, user_id). Vui lòng mở "Cài đặt Chữ ký số VNPT SmartCA" để cấu hình và lấy Chứng thư số.');
  }

  onProgress?.('🔐 Đang lấy Chứng thư số từ VNPT SmartCA (sp769/v1/credentials/get_certificate)...');
  const certInfo = await getSmartCaCertificate(cfg);

  onProgress?.(
    record.type === 'KHAM_SUC_KHOE'
      ? '🔐 Đang chuẩn bị dữ liệu băm SHA-256 cho Hồ sơ Khám sức khỏe...'
      : '🔐 Đang chuẩn bị cấu trúc ký số chuẩn Phụ lục 02 BHXH...'
  );
  const { hashToSign, buildSignedXml } = await prepareXmlForSigning(record.xmlContent, certInfo);

  const effectiveCfg: SmartCAConfig = {
    ...cfg,
    serialNumber: certInfo.serialNumber || cfg.serialNumber,
    signMode: method === 'SMARTCA_APP' ? 'APP' : 'TOTP',
  };

  onProgress?.(
    method === 'SMARTCA_APP'
      ? '📱 Đang gửi yêu cầu ký sang ứng dụng VNPT SmartCA trên điện thoại...'
      : '📡 Đang ký số tự động qua VNPT SmartCA (Gói tích hợp v2)...'
  );
  const signatureBase64 = await signSmartCAHash(effectiveCfg, hashToSign, onProgress);

  onProgress?.('✅ Ký số thành công! Đang nhúng chữ ký số vào XML...');
  const signedXml = buildSignedXml(signatureBase64);

  return {
    ...record,
    trangThai: 'SIGNED',
    xmlContent: signedXml,
    signatureBase64,
    certBase64: certInfo.rawCertBase64,
    rawData: attachKskSigToRaw(record.rawData, signatureBase64),
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
      if (i > 0 && (method === 'SMARTCA_TOTP' || method === 'SMARTCA_APP')) {
        onProgress?.(i, records.length, `⏳ Đang nghỉ 1.5s giữa các hồ sơ (${i + 1}/${records.length}) để tránh khóa tài khoản SmartCA...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      onProgress?.(i, records.length, `Đang ký hồ sơ ${i + 1}/${records.length}: ${rec.hoTen}...`);
      const signed = await signOneRecord(rec, method, (msg) => onProgress?.(i, records.length, msg));
      results.push(signed);
    } catch (err: any) {
      results.push({ ...rec, trangThai: 'SIGN_FAILED', errorMessage: err.message });
      if (/ĐANG BỊ KHÓA|Sai Password thuê bao/i.test(err?.message || '')) {
        for (let j = i + 1; j < records.length; j++) {
          results.push({
            ...records[j],
            trangThai: 'SIGN_FAILED',
            errorMessage: '🛑 Tạm dừng tự động để bảo vệ tài khoản SmartCA không bị khóa thêm.',
          });
        }
        break;
      }
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

  if (record.type === 'KHAM_SUC_KHOE') {
    const savedCfg = localStorage.getItem('ksk_config');
    const kskCfg = savedCfg ? JSON.parse(savedCfg) : null;
    const fallbackSig = record.signatureBase64 || record.rawData?.CKS_BENH_VIEN || record.rawData?.CKS_NGUOI_KET_LUAN;
    if (!kskCfg?.senderId || !kskCfg?.password || (!kskCfg?.privateKey && !fallbackSig)) {
      throw new Error('Chưa cấu hình API EMRHUB (Mã GLN sender_id 13 số, Mật khẩu, Private Key). Vui lòng mở "Cấu hình API EMRHUB".');
    }
    onProgress?.('📤 Đang đẩy hồ sơ KSK đã ký lên Cổng EMRHUB...');
    const { pushKskXml } = await import('./emrhubService');
    const res = await pushKskXml(kskCfg, record.xmlContent, fallbackSig);
    if (res.ok) {
      const maGd = res.syncCode || res.msgId || `EMR_${Date.now()}`;
      onProgress?.(`✅ Đẩy cổng EMRHUB thành công! Mã đồng bộ: ${maGd}`);
      return {
        ...record,
        trangThai: 'SUBMITTED',
        maGD: maGd,
        errorMessage: undefined,
      };
    } else {
      throw new Error(`Cổng EMRHUB từ chối (${res.code ?? res.httpStatus}): ${res.message || 'Lỗi không xác định'}`);
    }
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
