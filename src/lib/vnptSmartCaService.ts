/**
 * MODULE TÍCH HỢP CHỮ KÝ SỐ TỪ XA VNPT SMARTCA
 * Chuẩn kết nối theo tài liệu chính thức:
 * "DỊCH VỤ VNPT SMARTCA - Hướng dẫn tích hợp theo văn bản 769/QĐ-BTTTT (Version 2.0)"
 *
 * Các API chuẩn:
 * 1. POST /sca/sp769/v1/credentials/get_certificate       (Lấy thông tin chứng thư số & serial_number)
 * 2. POST /sca/sp769/v1/signatures/sign                   (Yêu cầu ký số xác nhận qua App)
 * 3. POST /sca/sp769/v1/signatures/sign/{tranId}/status   (Tra cứu trạng thái giao dịch ký App)
 * 4. POST /sca/sp769/v2/signatures/sign                   (Yêu cầu ký số gói tích hợp OTP/TOTP -> nhận SAD)
 * 5. POST /sca/sp769/v2/signatures/confirm                (Xác nhận giao dịch bằng SAD -> nhận signature_value)
 *
 * Địa chỉ Gateway:
 * - Production: https://gwsca.vnpt.vn/sca/sp769
 * - UAT:        https://rmgateway.vnptit.vn/sca/sp769
 */

export interface SmartCAConfig {
  signMode: 'TOTP' | 'APP';
  storageMode?: 'persistent' | 'session_only'; // 'persistent': lưu vĩnh viễn trên máy; 'session_only': chỉ lưu tạm, F5 hoặc tắt web tự xóa sạch
  baseUrl: string;            // Url (Root Gateway): https://gwsca.vnpt.vn/ | UAT: https://rmgateway.vnptit.vn/
  urlEseal?: string;          // Url Eseal: https://gwsca.vnpt.vn/esca | UAT: https://rmgateway.vnptit.vn/esca
  urlQd769?: string;          // Url QD769: https://gwsca.vnpt.vn/sca/sp769 | UAT: https://rmgateway.vnptit.vn/sca/sp769
  clientId: string;           // sp_id: Tên tài khoản của SP do CA cung cấp
  clientSecret: string;       // sp_password: Mật khẩu do CA cung cấp cho SP
  userId: string;             // user_id: Số CCCD/CMND/Hộ chiếu/Mã số thuế của thuê bao CA
  password?: string;          // password: Mật khẩu đăng nhập của thuê bao (bắt buộc với gói tích hợp v2)
  serialNumber: string;       // serial_number: Số serial chứng thư số (Optional khi gọi get_certificate)
  totpSecret?: string;        // Khóa bí mật TOTP (Base32/Base64/Hex) hoặc mã OTP 6 số
  certificateBase64?: string; // cert_data: Chứng thư X.509 Base64
  caCertBase64?: string;      // chain_data.ca_cert
  certId?: string;            // cert_id
  subjectDN?: string;         // Subject DN trích xuất từ X.509
  signatureImageBase64?: string; // Ảnh chữ ký tay / con dấu (DataURL hoặc Base64 PNG) dùng khi ký số PDF Mẫu 02/BH
}

const SIGNATURE_IMAGE_STORAGE_KEY = 'bhxh_tt12_signature_image_v1';

export const getSavedSignatureImage = (): string => {
  try {
    return localStorage.getItem(SIGNATURE_IMAGE_STORAGE_KEY) || sessionStorage.getItem(SIGNATURE_IMAGE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const saveSignatureImage = (dataUrlOrBase64: string): void => {
  try {
    if (!dataUrlOrBase64) {
      localStorage.removeItem(SIGNATURE_IMAGE_STORAGE_KEY);
      sessionStorage.removeItem(SIGNATURE_IMAGE_STORAGE_KEY);
    } else {
      localStorage.setItem(SIGNATURE_IMAGE_STORAGE_KEY, dataUrlOrBase64);
      sessionStorage.setItem(SIGNATURE_IMAGE_STORAGE_KEY, dataUrlOrBase64);
    }
  } catch (e) {
    console.warn('Không thể lưu ảnh chữ ký:', e);
  }
};

export const VNPT_SMARTCA_DEFAULTS = {
  prod: {
    baseUrl: 'https://gwsca.vnpt.vn/',
    urlEseal: 'https://gwsca.vnpt.vn/esca',
    urlQd769: 'https://gwsca.vnpt.vn/sca/sp769',
  },
  uat: {
    baseUrl: 'https://rmgateway.vnptit.vn/',
    urlEseal: 'https://rmgateway.vnptit.vn/esca',
    urlQd769: 'https://rmgateway.vnptit.vn/sca/sp769',
  },
};

export const DEFAULT_VNPT_SUBJECT =
  'OID.0.9.2342.19200300.100.1.1=MST:4001299742, CN=PHÒNG KHÁM ĐA KHOA ĐỒNG TÂM SÀI GÒN - CÔNG TY CP Y TẾ ĐỒNG TÂM SÀI GÒN, L=Phường An Thắng, S=Đà Nẵng, C=VN';

export const DEFAULT_VNPT_CERT =
  'MIIFkjCCBHqgAwIBAgIQVAEBAesCGwgVL5XyT+V2UzANBgkqhkiG9w0BAQsFADBcMQswCQYDVQQGEwJWTjEzMDEGA1UECgwqVklFVE5BTSBQT1NUUyBBTkQgVEVMRUNPTU1VTklDQVRJT05TIEdST1VQMRgwFgYDVQQDDA9WTlBUIFNtYXJ0Q0EgUlMwHhcNMjYwNDIyMDkyMDUxWhcNMjYxMTE3MTcwMDAwWjCBxTELMAkGA1UEBhMCVk4xFDASBgNVBAgMC8SQw6AgTuG6tW5nMR0wGwYDVQQHDBRQaMaw4budbmcgQW4gVGjhuq9uZzFhMF8GA1UEAwxYUEjDkk5HIEtIw4FNIMSQQSBLSE9BIMSQ4buSTkcgVMOCTSBTw4BJIEfDkk4gLSBDw5RORyBUWSBDUCBZIFThur4gxJDhu5JORyBUw4JNIFPDgEkgR8OSTjEeMBwGCgmSJomT8ixkAQEMDk1TVDo0MDAxMjk5NzQyMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArkbQr6gtvku9Sya/MWh8gEFSctybmiz/slrOB/LqD2gST+vlp/asWAN5tFNgVgBWxCXGtvAPOfSygKKz6PYpaVmCp/JQXWdGjP3Q37LJ6K0FnFiEAlYXNU/N6cOq7P/+1s9zli2ZWrkwGuXR3Y6N9oMOH6w1KU6edDha+QBsVy70DuRH2yhAojofav7GIVqMn5n1eKyNllRbGjiDUj8MRlJc0zFiT/SPavQaKN+12ZS6aoKURGNgXqpgC+TUaXunNE2bSZdQW7s23qclAJJVdI7dTLr/BUfG+gddBmRLZCRicUnTFwUeLVeLQ9219NFpjJVOnzV1IWf6rbL+fw4/FQIDAQABo4IB5DCCAeAwDAYDVR0TAQH/BAIwADAfBgNVHSMEGDAWgBRf78TrOvYi93LS2hk8KSVZu6D9LzCBgAYIKwYBBQUHAQEEdDByMDoGCCsGAQUFBzAChi5odHRwOi8vcHViLnZucHQtY2Eudm4vY2VydHMvdm5wdGNhLXNtYXJ0Y2EuY2VyMDQGCCsGAQUFBzABhihodHRwOi8vb2NzcC1zbWFydGNhLnZucHQtY2Eudm4vcmVzcG9uZGVyMCkGA1UdEQQiMCCBHmRvbmd0YW1zYWlnb25tYWRpY2FsQGdtYWlsLmNvbTApBgNVHSUEIjAgBggrBgEFBQcDAgYIKwYBBQUHAwQGCisGAQQBgjcKAwwwgaYGA1UdHwSBnjCBmzCBmKA0oDKGMGh0dHA6Ly9jcmwtc21hcnRjYS52bnB0LWNhLnZuL3ZucHRjYS1zbWFydGNhLmNybKJgpF4wXDEYMBYGA1UEAwwPVk5QVCBTbWFydENBIFJTMTMwMQYDVQQKDCpWSUVUTkFNIFBPU1RTIEFORCBURUxFQ09NTVVOSUNBVElPTlMgR1JPVVAxCzAJBgNVBAYTAlZOMB0GA1UdDgQWBBSMwZADl3USY6J1EbpvRuTW7HbYGzAOBgNVHQ8BAf8EBAMCBPAwDQYJKoZIhvcNAQELBQADggEBAAY5n5NlXwPSxy8dxgmW8T1WHE9y43dLIHv+ceBCWOeGrVEdW2PfiuKQBe9+Xt9IODevlaw7iUx4b5FtHVFZXhgGrzmHocTFxeuFsMs28aE5MMI55rVNnOYGm0RcJEQYhZyspWyiW0bqOAczgVvzJQPxJcTsNIMPvPMCEJ3UvDEf5zsLA5K7ZTUZ0babib3ieg96sp7HRq2e1lFCtBFlb82F2Hmx0Pec6OvcrElU1Y6jQX4BT/pM91lTp9HlgoXoVEcYIJ+ebShPAOG4IpRDWOwBSBwWY3WE0uHlxKo77Fgkocsu9hUvgYNNNMPKSnl641S67IZtB1SbVfCY+yoFMuw=';

export interface CertificateInfo {
  certId?: string;
  subject: string;
  serialNumber: string;
  issuer: string;
  validFrom?: string;
  validTo?: string;
  rawCertBase64?: string;
  caCertBase64?: string;
}

export interface SmartCATestResult {
  status: 'success' | 'error';
  message: string;
  details?: string;
  certificate?: CertificateInfo;
  allCertificates?: CertificateInfo[];
}

const STORAGE_KEY = 'vnpt_smartca_config';

// Tự động xóa sạch cấu hình SmartCA khi tắt web hoặc F5 theo đúng yêu cầu bảo mật của người dùng (Chế độ session_only)
if (typeof window !== 'undefined') {
  try {
    // 1. Kiểm tra dọn dẹp ngay khi khởi động
    const local = localStorage.getItem(STORAGE_KEY);
    const session = sessionStorage.getItem(STORAGE_KEY);

    // Nếu có dữ liệu cũ ở localStorage mà không phải người dùng chủ động chọn 'persistent' -> xóa ngay lập tức
    if (local && !local.includes('"storageMode":"persistent"')) {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Kiểm tra nếu trang vừa được F5 / Reload:
    // Theo yêu cầu: Mỗi lần F5 hoặc tắt web thì mất cấu hình (không lưu lại trên web)
    const navEntries = performance.getEntriesByType?.('navigation');
    const isReload = navEntries && navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
    if (isReload) {
      if (session && !session.includes('"storageMode":"persistent"')) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      if (local && !local.includes('"storageMode":"persistent"')) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {}

  // 2. Dọn dẹp trước khi rời trang hoặc tắt web
  window.addEventListener('beforeunload', () => {
    try {
      const session = sessionStorage.getItem(STORAGE_KEY);
      const local = localStorage.getItem(STORAGE_KEY);
      const isPersistent =
        (local && local.includes('"storageMode":"persistent"')) ||
        (session && session.includes('"storageMode":"persistent"'));
      if (!isPersistent) {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  });
}

/**
 * Đọc cấu hình VNPT SmartCA:
 * Mặc định: 'session_only' (Chỉ lưu tạm thời, F5 hoặc tắt web sẽ tự động xóa sạch để bảo mật tuyệt đối).
 * Nếu người dùng chủ động chọn 'persistent' thì mới lưu lâu dài trên máy.
 */
export const getSmartCAConfig = (): SmartCAConfig => {
  try {
    const localRaw = localStorage.getItem(STORAGE_KEY);
    const sessionRaw = sessionStorage.getItem(STORAGE_KEY);

    let localObj: any = null;
    let sessionObj: any = null;
    try { if (localRaw) localObj = JSON.parse(localRaw); } catch {}
    try { if (sessionRaw) sessionObj = JSON.parse(sessionRaw); } catch {}

    // Nếu là chế độ lưu tạm trong phiên (session_only), không đọc localStorage
    if (sessionObj && sessionObj.storageMode === 'session_only') {
      const isUat = (sessionObj.baseUrl || '').includes('rmgateway.vnptit.vn');
      const defaults = isUat ? VNPT_SMARTCA_DEFAULTS.uat : VNPT_SMARTCA_DEFAULTS.prod;
      return {
        signMode: sessionObj.signMode || (sessionObj.totpSecret ? 'TOTP' : 'APP'),
        storageMode: 'session_only',
        baseUrl: sessionObj.baseUrl || defaults.baseUrl,
        urlEseal: sessionObj.urlEseal || defaults.urlEseal,
        urlQd769: sessionObj.urlQd769 || defaults.urlQd769,
        clientId: sessionObj.clientId || '',
        clientSecret: sessionObj.clientSecret || '',
        userId: sessionObj.userId || '',
        password: sessionObj.password || '',
        serialNumber: sessionObj.serialNumber || '',
        totpSecret: sessionObj.totpSecret || '',
        certificateBase64: sessionObj.certificateBase64 || undefined,
        caCertBase64: sessionObj.caCertBase64 || undefined,
        certId: sessionObj.certId || undefined,
        subjectDN: sessionObj.subjectDN || undefined,
      };
    }

    // Nếu người dùng đã từng chọn 'persistent' ở localStorage
    if (localObj && localObj.storageMode === 'persistent') {
      const merged = { ...(sessionObj || {}), ...localObj };
      const isUat = (merged.baseUrl || '').includes('rmgateway.vnptit.vn');
      const defaults = isUat ? VNPT_SMARTCA_DEFAULTS.uat : VNPT_SMARTCA_DEFAULTS.prod;
      return {
        signMode: merged.signMode || (merged.totpSecret ? 'TOTP' : 'APP'),
        storageMode: 'persistent',
        baseUrl: merged.baseUrl || defaults.baseUrl,
        urlEseal: merged.urlEseal || defaults.urlEseal,
        urlQd769: merged.urlQd769 || defaults.urlQd769,
        clientId: merged.clientId || '',
        clientSecret: merged.clientSecret || '',
        userId: merged.userId || '',
        password: merged.password || '',
        serialNumber: merged.serialNumber || '',
        totpSecret: merged.totpSecret || '',
        certificateBase64: merged.certificateBase64 || undefined,
        caCertBase64: merged.caCertBase64 || undefined,
        certId: merged.certId || undefined,
        subjectDN: merged.subjectDN || undefined,
      };
    }

    if (sessionObj) {
      const isUat = (sessionObj.baseUrl || '').includes('rmgateway.vnptit.vn');
      const defaults = isUat ? VNPT_SMARTCA_DEFAULTS.uat : VNPT_SMARTCA_DEFAULTS.prod;
      return {
        signMode: sessionObj.signMode || (sessionObj.totpSecret ? 'TOTP' : 'APP'),
        storageMode: sessionObj.storageMode || 'session_only',
        baseUrl: sessionObj.baseUrl || defaults.baseUrl,
        urlEseal: sessionObj.urlEseal || defaults.urlEseal,
        urlQd769: sessionObj.urlQd769 || defaults.urlQd769,
        clientId: sessionObj.clientId || '',
        clientSecret: sessionObj.clientSecret || '',
        userId: sessionObj.userId || '',
        password: sessionObj.password || '',
        serialNumber: sessionObj.serialNumber || '',
        totpSecret: sessionObj.totpSecret || '',
        certificateBase64: sessionObj.certificateBase64 || undefined,
        caCertBase64: sessionObj.caCertBase64 || undefined,
        certId: sessionObj.certId || undefined,
        subjectDN: sessionObj.subjectDN || undefined,
      };
    }
  } catch (e) {
    console.error('Lỗi đọc cấu hình SmartCA:', e);
  }
  return {
    signMode: 'TOTP',
    storageMode: 'session_only',
    baseUrl: VNPT_SMARTCA_DEFAULTS.prod.baseUrl,
    urlEseal: VNPT_SMARTCA_DEFAULTS.prod.urlEseal,
    urlQd769: VNPT_SMARTCA_DEFAULTS.prod.urlQd769,
    clientId: '',
    clientSecret: '',
    userId: '',
    password: '',
    serialNumber: '',
    totpSecret: '',
  };
};

/**
 * Lưu cấu hình VNPT SmartCA:
 * - Mặc định storageMode === 'session_only': Chỉ lưu vào sessionStorage, tự động xóa localStorage. Khi F5 hoặc tắt web sẽ tự động xóa sạch.
 * - Nếu storageMode === 'persistent': Lưu vĩnh viễn vào localStorage.
 */
export const saveSmartCAConfig = (config: SmartCAConfig): void => {
  try {
    const existing = getSmartCAConfig();
    const storageMode = config.storageMode || existing.storageMode || 'session_only';
    const toSave: SmartCAConfig = {
      ...existing,
      ...config,
      storageMode,
      certificateBase64: config.certificateBase64 || existing.certificateBase64 || undefined,
      caCertBase64: config.caCertBase64 || existing.caCertBase64 || undefined,
      subjectDN: config.subjectDN || existing.subjectDN || undefined,
      serialNumber: config.serialNumber || existing.serialNumber || '',
      clientId: config.clientId !== undefined && config.clientId !== '' ? config.clientId : existing.clientId,
      clientSecret: config.clientSecret !== undefined && config.clientSecret !== '' ? config.clientSecret : existing.clientSecret,
      userId: config.userId !== undefined && config.userId !== '' ? config.userId : existing.userId,
      password: config.password !== undefined && config.password !== '' ? config.password : existing.password,
      totpSecret: config.totpSecret !== undefined && config.totpSecret !== '' ? config.totpSecret : existing.totpSecret,
    };

    const json = JSON.stringify(toSave);
    if (storageMode === 'session_only') {
      try {
        sessionStorage.setItem(STORAGE_KEY, json);
      } catch {}
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch (err) {
        console.warn('Lỗi ghi localStorage vnpt_smartca_config:', err);
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, json);
      } catch {}
    }
  } catch (e) {
    console.error('Lỗi lưu SmartCA config:', e);
  }
};

/**
 * Chuẩn hóa URL VNPT qua proxy tránh lỗi CORS / header khi gọi từ trình duyệt
 */
export function resolveVnptUrl(rawUrl?: string, defaultFallback: string = ''): string {
  const cleaned = (rawUrl || defaultFallback).trim().replace(/\/+$/, '');
  if (cleaned.includes('gwsca.vnpt.vn')) {
    return cleaned.replace(/^https?:\/\/gwsca\.vnpt\.vn/i, '/api/vnpt');
  }
  if (cleaned.includes('rmgateway.vnptit.vn')) {
    return cleaned.replace(/^https?:\/\/rmgateway\.vnptit\.vn/i, '/api/vnpt-uat');
  }
  return cleaned;
}

/**
 * Lấy endpoint chuẩn cho QĐ 769 (mặc định https://gwsca.vnpt.vn/sca/sp769)
 */
export function resolveSmartCaQd769Base(config: SmartCAConfig): string {
  let url = (config.urlQd769 || '').trim();
  if (!url) {
    const base = (config.baseUrl || 'https://gwsca.vnpt.vn/').trim().replace(/\/+$/, '');
    url = base.endsWith('/sca/sp769') ? base : `${base}/sca/sp769`;
  }
  return resolveVnptUrl(url, 'https://gwsca.vnpt.vn/sca/sp769');
}

/**
 * Lấy endpoint chuẩn cho E-seal (mặc định https://gwsca.vnpt.vn/esca)
 */
export function resolveSmartCaEsealBase(config: SmartCAConfig): string {
  let url = (config.urlEseal || '').trim();
  if (!url) {
    const base = (config.baseUrl || 'https://gwsca.vnpt.vn/').trim().replace(/\/+$/, '');
    url = base.endsWith('/esca') ? base : `${base}/esca`;
  }
  return resolveVnptUrl(url, 'https://gwsca.vnpt.vn/esca');
}

/**
 * Chuẩn hóa URL proxy tránh lỗi CORS khi gọi từ trình duyệt (hàm tương thích ngược)
 */
function resolveSmartCaProxyBase(rawBaseUrl?: string): string {
  return resolveVnptUrl(rawBaseUrl, 'https://gwsca.vnpt.vn');
}

/**
 * Tạo danh sách endpoint ứng viên theo thứ tự ưu tiên:
 * 1. Agent cục bộ (127.0.0.1:18088): Khi chạy Chay_Ky_So_USB_Token.bat trên máy tính (IP Việt Nam, không dính CORS / chặn Cloud quốc tế)
 * 2. Gọi trực tiếp từ trình duyệt tới máy chủ VNPT
 * 3. Qua proxy server (/api/vnpt/...)
 */
export function buildSmartCaCandidates(config: SmartCAConfig, relativePath: string): string[] {
  const rel = relativePath.replace(/^\/+/, '');
  const rawQd769 = (config.urlQd769 || 'https://gwsca.vnpt.vn/sca/sp769').trim().replace(/\/+$/, '');
  const qd769Base = resolveSmartCaQd769Base(config);
  const proxyRoot = resolveVnptUrl(config.baseUrl, 'https://gwsca.vnpt.vn');

  const directUrl = `${rawQd769}/${rel}`;
  const localAgentUrl = `http://127.0.0.1:18088/smartca-proxy?url=${encodeURIComponent(directUrl)}`;

  const list = [
    localAgentUrl,
    directUrl,
    `${qd769Base}/${rel}`,
    `${proxyRoot}/sca/sp769/${rel}`,
    `${proxyRoot}/${rel}`,
  ];

  return Array.from(new Set(list));
}

/**
 * Đọc và trích xuất thông tin từ tệp chứng thư .cer / .crt / .pem hoặc chuỗi Base64
 */
export function parseCertificateInput(input: string | ArrayBuffer): {
  rawCertBase64: string;
  subject: string;
  serialNumber?: string;
} {
  let base64 = '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.includes('-----BEGIN CERTIFICATE-----')) {
      base64 = trimmed
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');
    } else {
      base64 = trimmed.replace(/\s+/g, '');
    }
  } else {
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }

  const subject = extractCertificateSubject({ cert_data: base64 });

  let serialNumber = '';
  try {
    const raw = atob(base64);
    if (raw.charCodeAt(0) === 0x30) {
      for (let i = 2; i < Math.min(48, raw.length - 10); i++) {
        if (raw.charCodeAt(i) === 0x02) {
          const len = raw.charCodeAt(i + 1);
          if (len >= 8 && len <= 24) {
            let hex = '';
            for (let j = 0; j < len; j++) {
              const b = raw.charCodeAt(i + 2 + j);
              hex += b.toString(16).padStart(2, '0');
            }
            if (hex) serialNumber = hex;
            break;
          }
        }
      }
    }
  } catch {}

  return {
    rawCertBase64: base64,
    subject,
    serialNumber: serialNumber || undefined,
  };
}

/**
 * Mã lỗi chuẩn theo Mục 3.2 tài liệu VNPT SmartCA v2.0 (trang 5)
 */
const SMARTCA_STATUS_MESSAGES: Record<string, string> = {
  '200': 'Thành công (SUCCESS)',
  '400': 'Yêu cầu không hợp lệ (BAD_REQUEST)',
  '401': 'Thông tin tài khoản SP (sp_id / sp_password) hoặc người dùng (user_id / password) không hợp lệ (SP_CREDENTIAL_INVALID)',
  '403': 'Trạng thái chứng thư số không hợp lệ hoặc đã hết hạn (CREDENTIAL_STATUS_INVALID)',
  '404': 'Không tìm thấy chứng thư số của thuê bao (CREDENTIAL_NO_RESULT)',
  '500': 'Lỗi nội bộ máy chủ VNPT SmartCA (SERVER_INTERNAL_ERROR)',
  '41001': 'Không kết nối được IDP xác thực (CREDENTIAL_CONNECT_IDP_FAILED)',
  '41002': 'Không tìm thấy chứng thư số khớp với số Serial đã nhập (CREDENTIAL_NO_ENTRY_MATCH_SERIAL)',
  '41003': 'Thông tin định danh thuê bao không khớp (CREDENTIAL_NOT_MATCH_IDENTITY)',
};

/**
 * Giải mã và trích xuất thông tin Subject từ chứng thư số X.509 Base64
 */
export const extractCertificateSubject = (certObj: any, defaultUserId: string = ''): string => {
  if (!certObj) return '';
  const direct =
    certObj.subject_dn ||
    certObj.subject ||
    certObj.cert_subject ||
    certObj.subjectDN ||
    certObj.common_name ||
    certObj.subject_name ||
    certObj.cn ||
    certObj.owner_name ||
    certObj.fullName ||
    certObj.user_name;
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const rawCert =
    certObj.cert_data ||
    certObj.certificate ||
    certObj.cert ||
    (typeof certObj === 'string' ? certObj : '');
  if (rawCert && typeof rawCert === 'string' && rawCert.length > 50) {
    try {
      const cleanB64 = rawCert.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
      const binaryString = atob(cleanB64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

      const cnMatch = decodedText.match(/CN=([^,\n\x00-\x1f\r]+)/i);
      const oMatch = decodedText.match(/O=([^,\n\x00-\x1f\r]+)/i);
      const mstMatch = decodedText.match(/MST:[0-9-]+/i);
      if (cnMatch) {
        return `${mstMatch ? `OID.0.9.2342.19200300.100.1.1=${mstMatch[0]}, ` : ''}CN=${cnMatch[1].trim()}${oMatch ? `, O=${oMatch[1].trim()}` : ''}, C=VN`;
      }
      // Tìm chuỗi UTF-8 tiếng Việt dài trong chứng thư ASN.1 (ví dụ tên Công ty / Phòng khám / Cá nhân)
      const utf8Strings = decodedText
        .split(/[\x00-\x1f]+/)
        .map(s => s.trim())
        .filter(s => s.length >= 6 && /[A-Za-zÀ-ỹ]/.test(s) && !s.includes('http://') && !s.includes('vnpt'));
      if (utf8Strings.length > 0) {
        const bestName = utf8Strings[utf8Strings.length - 1];
        return `${mstMatch ? `MST=${mstMatch[0]}, ` : ''}CN=${bestName}`;
      }
    } catch (e) {
      console.warn('Không thể parse Base64 certificate:', e);
    }
  }
  return defaultUserId ? `Thuê bao SmartCA (${defaultUserId})` : 'Chứng thư số VNPT SmartCA';
};

/**
 * Mục 4.1 Tài liệu VNPT SmartCA v2.0 (trang 6-8):
 * API: POST /sca/sp769/v1/credentials/get_certificate
 * Lấy thông tin chứng thư số (cert_data, serial_number, chain_data) của thuê bao.
 * Lưu ý: serial_number là Optional (""). Nếu để trống, VNPT trả về toàn bộ user_certificates của thuê bao.
 */
export const testSmartCaConnection = async (config: SmartCAConfig): Promise<SmartCATestResult> => {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const userId = config.userId?.trim();
  const requestedSerial = (config.serialNumber || '').trim();
  const qd769Base = resolveSmartCaQd769Base(config);
  const proxyRoot = resolveVnptUrl(config.baseUrl, 'https://gwsca.vnpt.vn');

  // Theo Mục 4.1 (trang 6): sp_id, sp_password, user_id là Required; serial_number là Optional!
  if (!clientId || !clientSecret || !userId) {
    return {
      status: 'error',
      message: 'THIẾU THÔNG TIN BẮT BUỘC (MỤC 4.1)',
      details:
        'Theo tài liệu VNPT SmartCA (Mục 4.1 - v1/credentials/get_certificate), vui lòng nhập:\n' +
        '• Client ID (sp_id)\n' +
        '• Client Secret (sp_password)\n' +
        '• User ID (Số CCCD / CMND / Mã số thuế của thuê bao)\n' +
        '(Trường Serial Number có thể để trống để hệ thống tự động lấy về từ VNPT SmartCA).',
    };
  }

  const certEndpoints = buildSmartCaCandidates(config, 'v1/credentials/get_certificate');

  // Hàm gọi API get_certificate với serialNumber tùy chọn
  const callGetCertApi = async (serialParam: string) => {
    let lastError = '';
    for (const url of certEndpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const txId = `SP_CA_${Date.now().toString().slice(-6)}`;
        // Đúng chuẩn JSON Mục 4.1 trang 6-7 của tài liệu VNPT SmartCA v2.0
        const payload: Record<string, any> = {
          sp_id: clientId,
          sp_password: clientSecret,
          client_id: clientId,
          client_secret: clientSecret,
          'sp id': clientId,
          'sp password': clientSecret,
          user_id: userId,
          'user id': userId,
          transaction_id: txId,
        };
        if (serialParam && serialParam.trim()) {
          payload.serial_number = serialParam.trim();
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);
        clearTimeout(timeoutId);

        if (!data) {
          lastError = `[${url}]: Máy chủ không phản hồi định dạng JSON (HTTP ${res.status}).`;
          continue;
        }

        const statusCode = data.status_code ?? data.status ?? data.code;
        if (
          statusCode !== undefined &&
          statusCode !== 200 &&
          statusCode !== '200' &&
          statusCode !== 0 &&
          statusCode !== '0'
        ) {
          const codeStr = String(statusCode);
          const knownDesc = SMARTCA_STATUS_MESSAGES[codeStr] || '';
          const serverMsg = data.message || data.error_description || data.desc || '';
          return {
            ok: false,
            statusCode: codeStr,
            error: `Mã lỗi ${codeStr}${knownDesc ? ` (${knownDesc})` : ''}: ${serverMsg}`,
          };
        }

        // Trích xuất user_certificates theo đúng mẫu Response Mục 4.1 (trang 7-8)
        let certList: any[] = [];
        if (Array.isArray(data.data?.user_certificates)) certList = data.data.user_certificates;
        else if (Array.isArray(data.user_certificates)) certList = data.user_certificates;
        else if (Array.isArray(data.data?.certificates)) certList = data.data.certificates;
        else if (Array.isArray(data.certificates)) certList = data.certificates;
        else if (data.data?.cert_data || data.data?.certificate) certList = [data.data];
        else if (data.cert_data || data.certificate) certList = [data];

        if (certList.length > 0) {
          return { ok: true, certList, data };
        }

        return {
          ok: false,
          statusCode: '404',
          error: `Tài khoản thuê bao (${userId}) không có chứng thư số nào đang hoạt động trên VNPT SmartCA.`,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = `[${url}]: ${err?.name === 'AbortError' ? 'Quá thời gian phản hồi (Timeout 10s)' : err.message}`;
      }
    }
    return { ok: false, statusCode: 'NETWORK', error: lastError || 'Không thể kết nối máy chủ VNPT SmartCA.' };
  };

  // Bước 1: Gọi get_certificate (nếu có serial thì truyền serial, nếu lỗi 41002 hoặc không khớp thì gọi lại với serial_number: "")
  let apiRes = await callGetCertApi(requestedSerial);
  if (!apiRes.ok && requestedSerial) {
    // Thử lấy toàn bộ danh sách chứng thư của user_id bằng serial_number = ""
    const fallbackRes = await callGetCertApi('');
    if (fallbackRes.ok) {
      apiRes = fallbackRes;
    }
  }

  if (!apiRes.ok || !apiRes.certList || apiRes.certList.length === 0) {
    let details = apiRes.error || '';
    if (
      details.includes('500') ||
      details.includes('Failed to fetch') ||
      details.includes('NETWORK') ||
      details.includes('HTML')
    ) {
      details +=
        '\n\n💡 NGUYÊN NHÂN & GIẢI PHÁP:\n' +
        '• Khi truy cập Web trên Vercel: Máy chủ đám mây Vercel đặt tại nước ngoài (Mỹ) nên tường lửa VNPT SmartCA tại Việt Nam chặn kết nối IP quốc tế.\n' +
        '• CÁCH XỬ LÝ 1: Nhấp đúp chạy file "Chay_Ky_So_USB_Token.bat" trên máy tính của bạn (cổng 18088). Agent này sẽ nhận lệnh và kết nối trực tiếp từ mạng máy tính của bạn tới VNPT SmartCA thành công 100%.\n' +
        '• CÁCH XỬ LÝ 2: Bạn có thể nhập Serial Number và tải tệp chứng thư (.cer) hoặc dán mã Base64 trực tiếp vào form để ký số ngay.';
    }
    return {
      status: 'error',
      message: 'KHÔNG LẤY ĐƯỢC CHỨNG THƯ SỐ SMARTCA TỰ ĐỘNG',
      details,
    };
  }

  const allCertificates: CertificateInfo[] = apiRes.certList.map((c: any) => {
    const rawCert = (c.cert_data || c.certificate || '').replace(/\s+/g, '');
    const caCert = (c.chain_data?.ca_cert || '').replace(/\s+/g, '');
    const serial = String(c.serial_number || c.serial || c.serial_number_hex || '').trim();
    const subject = extractCertificateSubject(c, userId);
    const issuer = c.issuer_dn || c.issuer || c.issuerDN || 'VNPT SmartCA';
    const validFrom = c.valid_from || c.not_before || '';
    const validTo = c.valid_to || c.not_after || '';
    return {
      certId: c.cert_id || '',
      subject,
      serialNumber: serial,
      issuer,
      validFrom,
      validTo,
      rawCertBase64: rawCert,
      caCertBase64: caCert,
    };
  });

  // Chọn chứng thư khớp với requestedSerial; nếu người dùng chưa nhập Serial hoặc nhập khác thì tự động chọn chứng thư đầu tiên
  let selectedCert = allCertificates[0];
  let autoSelectedNote = '';
  if (requestedSerial) {
    const exactMatch = allCertificates.find(
      c => c.serialNumber.toLowerCase() === requestedSerial.toLowerCase()
    );
    if (exactMatch) {
      selectedCert = exactMatch;
    } else {
      autoSelectedNote = `\n⚠️ Lưu ý: Serial bạn nhập (${requestedSerial}) không khớp, hệ thống đã tự động cập nhật sang Serial thực tế trên tài khoản: ${selectedCert.serialNumber}`;
    }
  } else {
    autoSelectedNote = `\n✅ Đã tự động điền Serial Number từ VNPT SmartCA: ${selectedCert.serialNumber}`;
  }

  let details =
    `• Chủ thể (Subject): ${selectedCert.subject}\n` +
    `• Số Serial (serial_number): ${selectedCert.serialNumber}\n` +
    `• Mã chứng thư (cert_id): ${selectedCert.certId || 'Đã xác thực'}\n` +
    `• Đơn vị cấp (Issuer): ${selectedCert.issuer}\n` +
    `• Độ dài cert_data (Base64): ${selectedCert.rawCertBase64?.length || 0} ký tự`;

  if (selectedCert.validFrom && selectedCert.validTo) {
    details += `\n• Thời hạn: ${selectedCert.validFrom} → ${selectedCert.validTo}`;
  }
  if (allCertificates.length > 1) {
    details += `\n• Tổng số chứng thư số tìm thấy trên tài khoản: ${allCertificates.length} chứng thư`;
  }
  if (autoSelectedNote) {
    details += autoSelectedNote;
  }

  return {
    status: 'success',
    message: 'LẤY CHỨNG THƯ SỐ VNPT SMARTCA THÀNH CÔNG',
    details,
    certificate: selectedCert,
    allCertificates,
  };
};

const sleepMs = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Bộ nhớ đệm CKS & bộ điều tiết nhịp độ ký (Pacing/Throttling) giúp tránh gọi API quá nhanh gây khóa CKS
let inMemoryCertCache: {
  key: string;
  rawCertBase64: string;
  subject: string;
  serialNumber: string;
} | null = null;
let lastCertFetchAt = 0;
let lastSignCompletedAt = 0;

const WINNING_TOTP_STORAGE_KEY = 'vnpt_smartca_winning_totp_v2';
let cachedWinningTotp: { secretTag: string; alg: 'SHA-1' | 'SHA-256'; variant: number } | null = null;

function getWinningTotp(secret: string): { alg: 'SHA-1' | 'SHA-256'; variant: number } | null {
  const tag = `${secret.length}:${secret.slice(0, 4)}:${secret.slice(-4)}`;
  if (cachedWinningTotp && cachedWinningTotp.secretTag === tag) {
    return { alg: cachedWinningTotp.alg, variant: cachedWinningTotp.variant };
  }
  try {
    const raw = localStorage.getItem(WINNING_TOTP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.secretTag === tag && typeof parsed.variant === 'number') {
        cachedWinningTotp = parsed;
        return { alg: parsed.alg || 'SHA-1', variant: parsed.variant };
      }
    }
  } catch {}
  return null;
}

function saveWinningTotp(secret: string, alg: 'SHA-1' | 'SHA-256', variant: number) {
  const tag = `${secret.length}:${secret.slice(0, 4)}:${secret.slice(-4)}`;
  cachedWinningTotp = { secretTag: tag, alg, variant };
  try {
    localStorage.setItem(WINNING_TOTP_STORAGE_KEY, JSON.stringify(cachedWinningTotp));
  } catch {}
}

/**
 * Lấy chứng thư số X.509 Base64 (tự động gọi v1/credentials/get_certificate nếu chưa có trong cache)
 */
export const getSmartCaCertificate = async (
  config: SmartCAConfig
): Promise<{ rawCertBase64: string; subject: string; serialNumber: string }> => {
  const cacheKey = `${config.clientId || ''}|${config.userId || ''}|${config.serialNumber || ''}`;

  if (config.certificateBase64 && config.certificateBase64.length > 100 && config.serialNumber) {
    const certObj = {
      rawCertBase64: config.certificateBase64.replace(/\s+/g, ''),
      subject: config.subjectDN || DEFAULT_VNPT_SUBJECT,
      serialNumber: config.serialNumber.trim(),
    };
    inMemoryCertCache = { key: cacheKey, ...certObj };
    return certObj;
  }

  if (inMemoryCertCache && inMemoryCertCache.rawCertBase64.length > 100 && inMemoryCertCache.key.startsWith(`${config.clientId || ''}|${config.userId || ''}|`)) {
    return {
      rawCertBase64: inMemoryCertCache.rawCertBase64,
      subject: inMemoryCertCache.subject,
      serialNumber: inMemoryCertCache.serialNumber,
    };
  }

  if (config.clientId && config.clientSecret && config.userId) {
    const res = await testSmartCaConnection(config);
    lastCertFetchAt = Date.now();
    if (res.status === 'success' && res.certificate?.rawCertBase64) {
      const rawCert = res.certificate.rawCertBase64.replace(/\s+/g, '');
      const subject = res.certificate.subject || DEFAULT_VNPT_SUBJECT;
      const serial = res.certificate.serialNumber || config.serialNumber;
      saveSmartCAConfig({
        ...config,
        serialNumber: serial,
        certificateBase64: rawCert,
        caCertBase64: res.certificate.caCertBase64,
        certId: res.certificate.certId,
        subjectDN: subject,
      });
      inMemoryCertCache = {
        key: `${config.clientId || ''}|${config.userId || ''}|${serial || ''}`,
        rawCertBase64: rawCert,
        subject,
        serialNumber: serial,
      };
      return {
        rawCertBase64: rawCert,
        subject,
        serialNumber: serial,
      };
    }
    throw new Error(
      `Không lấy được chứng thư số từ VNPT SmartCA: ${res.details || res.message}`
    );
  }

  throw new Error(
    'Chưa cấu hình chữ ký số VNPT SmartCA.\n' +
      'Vui lòng bấm nút "Cấu hình Ký số (SmartCA / Token)" để nhập Client ID (sp_id), Client Secret (sp_password), User ID và bấm "Lấy chứng thư số".'
  );
};

/**
 * Danh sách các cách diễn giải khóa TOTP (VNPT cấp khóa dạng Base64 của chuỗi ASCII HEX,
 * ví dụ "ODQ3MTY4RUU3..." -> "847168EE7B7E9F35...").
 * Ưu tiên số 1 (variant 0): Chuỗi ASCII bytes sau khi giải mã Base64 (chuẩn VNPT SmartCA tránh lỗi 500).
 */
function getTotpKeyCandidates(secretInput: string): Uint8Array[] {
  const clean = secretInput.trim();
  const out: Uint8Array[] = [];
  const push = (k: Uint8Array | null) => {
    if (!k || k.length === 0) return;
    if (!out.some(o => o.length === k.length && o.every((v, i) => v === k[i]))) out.push(k);
  };
  const hexToBytes = (h: string) =>
    /^[0-9a-fA-F]+$/.test(h) && h.length % 2 === 0 ? new Uint8Array(h.match(/.{1,2}/g)!.map(b => parseInt(b, 16))) : null;
  const strToBytes = (s: string) => new Uint8Array(Array.from(s).map(c => c.charCodeAt(0) & 255));

  // 1. Base64 -> chuỗi ASCII: ƯU TIÊN ĐẦU TIÊN là strToBytes(decoded) (đúng chuẩn VNPT SmartCA đang dùng)
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(clean) && clean.length >= 16) {
    try {
      const decoded = atob(clean.replace(/-/g, '+').replace(/_/g, '/'));
      push(strToBytes(decoded));
      if (/^[\x20-\x7e]+$/.test(decoded)) {
        push(hexToBytes(decoded.trim()));
      }
    } catch {}
  }
  // 2. Chuỗi HEX trực tiếp
  push(hexToBytes(clean));
  // 3. Base32
  if (/^[A-Z2-7=\s]+$/i.test(clean)) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const b32 = clean.toUpperCase().replace(/\s|=/g, '');
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const ch of b32) {
      const idx = alphabet.indexOf(ch);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
        value &= (1 << bits) - 1;
      }
    }
    push(new Uint8Array(bytes));
  }
  // 4. Chuỗi ASCII thô
  push(strToBytes(clean));
  return out;
}

/**
 * Sinh mã OTP 6 chữ số từ TOTP Secret (variant = chỉ số cách diễn giải khóa, hoặc mã OTP 6 số trực tiếp)
 */
async function generateTotpCode(
  secretInput: string,
  offsetSeconds = 0,
  hashAlg: 'SHA-1' | 'SHA-256' = 'SHA-1',
  variant = 0
): Promise<string> {
  const clean = secretInput.trim();
  // Nếu người dùng nhập trực tiếp mã OTP 6 chữ số từ điện thoại
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }

  const candidates = getTotpKeyCandidates(clean);
  const key = candidates[variant];
  if (!key) throw new Error('NO_KEY_VARIANT');

  const epoch = Math.floor((Date.now() + offsetSeconds * 1000) / 1000);
  const time = Math.floor(epoch / 30);
  const msg = new Uint8Array(8);
  let t = time;
  for (let i = 7; i >= 0; i--) {
    msg[i] = t % 256;
    t = Math.floor(t / 256);
  }

  const cryptoKey = await window.crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: hashAlg }, false, ['sign']);
  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msg);
  const hmacArr = new Uint8Array(signature);
  const hmacOffset = hmacArr[hmacArr.length - 1] & 0x0f;
  const code =
    (((hmacArr[hmacOffset] & 0x7f) << 24) |
      ((hmacArr[hmacOffset + 1] & 0xff) << 16) |
      ((hmacArr[hmacOffset + 2] & 0xff) << 8) |
      (hmacArr[hmacOffset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Chuyển Base64 hash (SHA-256) sang chuỗi Hex 64 ký tự (dùng cho data_to_be_signed khi sign_type="hash")
 */
function base64ToHex(hashBase64: string): string {
  const binary = atob(hashBase64.trim());
  let hashHex = '';
  for (let i = 0; i < binary.length; i++) {
    const h = binary.charCodeAt(i).toString(16);
    hashHex += h.length === 1 ? '0' + h : h;
  }
  return hashHex;
}

/**
 * Định dạng time_stamp chuẩn YYYYMMddHHmmSSZ theo Mục 4.2 tài liệu VNPT SmartCA (trang 8-9)
 */
function formatSmartCaTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Trích xuất signature_value từ phản hồi của VNPT SmartCA (hỗ trợ cả v1 status và v2 confirm)
 */
function extractSignatureFromResponse(data: any): string | null {
  if (!data) return null;
  const d = data.data || data;
  const directSig = d.signature_value || d.signature || data.signature_value || data.signature || d.signed_data;
  if (typeof directSig === 'string' && directSig.length > 20) return directSig;

  const sigList = d.signatures || d.signature_list || d.sign_files || data.signatures;
  if (Array.isArray(sigList) && sigList.length > 0) {
    const first = sigList[0];
    if (typeof first === 'string' && first.length > 20) return first;
    const val = first?.signature_value || first?.signature || first?.['signature value'] || first?.signed_data;
    if (typeof val === 'string' && val.length > 20) return val;
  }
  return null;
}

/**
 * Thực hiện Ký Hash với VNPT SmartCA theo đúng đặc tả v2.0 (769/QĐ-BTTTT):
 * - Chế độ 1 (Gói tích hợp v2 - TOTP/OTP, Mục 4.5 & 4.6, trang 13-16):
 *   Bước 1: POST /sca/sp769/v2/signatures/sign -> nhận { transaction_id, sad }
 *   Bước 2: POST /sca/sp769/v2/signatures/confirm -> nhận { signatures: [{ doc_id, signature_value }] }
 * - Chế độ 2 (Xác nhận qua App v1, Mục 4.2 & 4.3, trang 8-12):
 *   Bước 1: POST /sca/sp769/v1/signatures/sign -> nhận { transaction_id, tran_code }
 *   Bước 2: Poll POST /sca/sp769/v1/signatures/sign/{tranId}/status cho đến khi người dùng bấm "Ký số" trên App điện thoại -> nhận { signatures: [{ doc_id, signature_value }] }
 */
export const signSmartCAHash = async (
  config: SmartCAConfig,
  hashBase64: string,
  onProgress?: (msg: string) => void
): Promise<string> => {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const userId = config.userId?.trim();
  const totpSecret = config.totpSecret?.trim();
  let serialNumber = config.serialNumber?.trim();
  const qd769Base = resolveSmartCaQd769Base(config);
  const proxyRoot = resolveVnptUrl(config.baseUrl, 'https://gwsca.vnpt.vn');

  if (!clientId || !clientSecret || !userId) {
    throw new Error('Thiếu thông tin cấu hình VNPT SmartCA (sp_id, sp_password, user_id là bắt buộc).');
  }

  // Nếu chưa có serial_number, tự động lấy từ get_certificate
  if (!serialNumber) {
    const certInfo = await getSmartCaCertificate(config);
    serialNumber = certInfo.serialNumber;
  }

  const hashHex = base64ToHex(hashBase64);
  const docId = `DOC_${Date.now().toString().slice(-8)}`;

  // ============================================================================
  // LUỒNG 1: KÝ QUA ỨNG DỤNG ĐIỆN THOẠI (MỤC 4.2 & 4.3: v1/signatures/sign + status)
  // Áp dụng khi config.signMode === 'APP' hoặc không nhập TOTP Secret
  // ============================================================================
  if (config.signMode === 'APP' || !totpSecret) {
    const txId = `SP_CA_${Date.now()}`;
    const v1SignEndpoints = buildSmartCaCandidates(config, 'v1/signatures/sign');

    // Thử gửi với hashHex (chuẩn hex với hash) và fallback hashBase64 (mẫu trang 9-10)
    const dataCandidates = [hashHex, hashBase64];
    let tranCode = '';
    let serverTxId = '';
    let lastV1Err = '';

    onProgress?.(`📱 Đang gửi yêu cầu ký số tới ứng dụng VNPT SmartCA (Mã tài liệu: ${docId})...`);

    for (const dataToSign of dataCandidates) {
      if (tranCode || serverTxId) break;
      for (const signUrl of v1SignEndpoints) {
        try {
          const v1Payload = {
            sp_id: clientId,
            sp_password: clientSecret,
            user_id: userId,
            transaction_desc: `Ky so XML Y te (${docId})`,
            sign_files: [
              {
                data_to_be_signed: dataToSign,
                doc_id: docId,
                file_type: 'xml',
                sign_type: 'hash',
              },
            ],
            transaction_id: txId,
            serial_number: serialNumber,
            time_stamp: formatSmartCaTimestamp(),
          };

          const res = await fetch(signUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v1Payload),
          });
          const data = await res.json().catch(() => null);
          if (!data) continue;

          // Nếu trả về chữ ký trực tiếp
          const immediateSig = extractSignatureFromResponse(data);
          if (immediateSig) return immediateSig;

          const statusCode = data.status_code ?? data.status ?? data.code;
          if (statusCode === 200 || statusCode === '200' || data.message === 'sig_wait_for_user_confirm') {
            tranCode = data.data?.tran_code || data.tran_code || '';
            serverTxId = data.data?.transaction_id || data.transaction_id || txId;
            break;
          } else {
            const codeStr = String(statusCode || res.status);
            lastV1Err = `Mã ${codeStr}: ${data.message || JSON.stringify(data)}`;
          }
        } catch (e: any) {
          lastV1Err = e.message;
        }
      }
    }

    if (!tranCode && !serverTxId) {
      throw new Error(`Không khởi tạo được giao dịch ký App VNPT SmartCA: ${lastV1Err || 'Không có phản hồi'}`);
    }

    // Mục 4.3 (trang 11-12): Tra cứu trạng thái giao dịch v1/signatures/sign/{tranId}/status
    const pollIds = Array.from(new Set([tranCode, serverTxId, txId].filter(Boolean)));
    const maxAttempts = 36; // 36 * 2.5s = 90 giây chờ người dùng xác nhận trên điện thoại

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      onProgress?.(
        `📲 Đang chờ bạn bấm "Ký số" trên ứng dụng VNPT SmartCA điện thoại (Mã tài liệu: ${docId} — Lần kiểm tra ${attempt}/${maxAttempts})...`
      );
      await new Promise(r => setTimeout(r, 2500));

      for (const tid of pollIds) {
        const statusUrls = buildSmartCaCandidates(config, `v1/signatures/sign/${tid}/status`);
        for (const sUrl of statusUrls) {
          try {
            const sRes = await fetch(sUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '',
            });
            const sData = await sRes.json().catch(() => null);
            if (!sData) continue;

            const sigValue = extractSignatureFromResponse(sData);
            if (sigValue) {
              return sigValue;
            }

            const msg = String(sData.message || '').toLowerCase();
            if (msg.includes('reject') || msg.includes('cancel') || msg.includes('tu choi') || msg.includes('huy')) {
              throw new Error('Người dùng đã từ chối hoặc hủy yêu cầu ký trên ứng dụng VNPT SmartCA.');
            }
          } catch (pollErr: any) {
            if (pollErr.message?.includes('từ chối')) throw pollErr;
          }
        }
      }
    }

    throw new Error(
      `Quá thời gian chờ (90 giây) xác nhận trên ứng dụng VNPT SmartCA cho tài liệu ${docId}. Vui lòng mở ứng dụng VNPT SmartCA trên điện thoại và thử lại.`
    );
  }

  // ============================================================================
  // LUỒNG 2: KÝ TỰ ĐỘNG GÓI TÍCH HỢP V2 (MỤC 4.5 & 4.6: v2/signatures/sign + confirm)
  // ============================================================================
  if (!config.password) {
    throw new Error(
      'Theo Mục 4.5 tài liệu VNPT SmartCA (v2/signatures/sign), chế độ ký tự động bằng OTP/TOTP bắt buộc phải có Mật khẩu đăng nhập thuê bao (password). Vui lòng nhập Password trong Cấu hình VNPT SmartCA.'
    );
  }

  // 1. Nhịp nghỉ sau khi vừa lấy chứng thư số (get_certificate) để API SmartCA kịp đồng bộ CKS
  const sinceCertFetch = Date.now() - lastCertFetchAt;
  if (lastCertFetchAt > 0 && sinceCertFetch < 1200) {
    const waitCertMs = 1200 - sinceCertFetch;
    onProgress?.(`⏳ Đang đồng bộ Chứng thư số từ VNPT SmartCA (${(waitCertMs / 1000).toFixed(1)}s)...`);
    await sleepMs(waitCertMs);
  }

  // 2. Nhịp nghỉ tối thiểu 1.8 giây giữa 2 lần ký liên tiếp để tránh gửi quá nhanh bị VNPT SmartCA khóa tài khoản
  const sinceLastSign = Date.now() - lastSignCompletedAt;
  if (lastSignCompletedAt > 0 && sinceLastSign < 1800) {
    const waitSignMs = 1800 - sinceLastSign;
    onProgress?.(`⏳ Đang điều tiết tốc độ ký SmartCA (${(waitSignMs / 1000).toFixed(1)}s) để tránh bị khóa tài khoản...`);
    await sleepMs(waitSignMs);
  }

  const v2SignEndpoints = buildSmartCaCandidates(config, 'v2/signatures/sign');
  const v2ConfirmEndpoints = buildSmartCaCandidates(config, 'v2/signatures/confirm');

  // Nếu người dùng nhập mã OTP 6 số trực tiếp thì chỉ thử 1 lần; nếu dùng TOTP Secret thì ưu tiên đúng biến thể đã thành công
  const isDirectOtp = /^\d{6}$/.test(totpSecret);
  const keyVariantCount = isDirectOtp ? 1 : Math.max(1, getTotpKeyCandidates(totpSecret).length);
  const savedWinner = !isDirectOtp ? getWinningTotp(totpSecret) : null;

  // Xây dựng danh sách thử tối ưu: thử offset 0 với biến thể chuẩn trước, hạn chế tối đa request sai OTP (500)
  const tryPlan: Array<{ alg: 'SHA-1' | 'SHA-256'; variant: number; offset: number }> = [];
  if (isDirectOtp) {
    tryPlan.push({ alg: 'SHA-1', variant: 0, offset: 0 });
  } else if (savedWinner && savedWinner.variant < keyVariantCount) {
    // Đã biết chính xác biến thể khóa TOTP của thuê bao này -> gọi trúng đích ngay lần đầu tiên!
    tryPlan.push({ alg: savedWinner.alg, variant: savedWinner.variant, offset: 0 });
    tryPlan.push({ alg: savedWinner.alg, variant: savedWinner.variant, offset: -30 });
  } else {
    // Lần đầu tiên: ưu tiên variant 0 (strToBytes chuẩn VNPT) ở offset 0 trước, sau đó mới thử variant 1 ở offset 0
    tryPlan.push({ alg: 'SHA-1', variant: 0, offset: 0 });
    if (keyVariantCount > 1) {
      tryPlan.push({ alg: 'SHA-1', variant: 1, offset: 0 });
    }
    tryPlan.push({ alg: 'SHA-1', variant: 0, offset: -30 });
  }

  let diagLog = '';

  for (let planIdx = 0; planIdx < tryPlan.length; planIdx++) {
    const { alg, variant, offset } = tryPlan[planIdx];

    // Nếu phải thử phương án dự phòng thứ 2 trở đi, nghỉ 1.2s để không dồn dập vào máy chủ VNPT SmartCA
    if (planIdx > 0) {
      onProgress?.('⏳ Đang chờ 1.2s trước khi đồng bộ lại mã TOTP với máy chủ VNPT SmartCA...');
      await sleepMs(1200);
    }

    let otpCode = '';
    try {
      otpCode = await generateTotpCode(totpSecret, offset, alg, variant);
    } catch (e) {
      continue;
    }

    const txId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `SIG_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Đúng chuẩn Request mẫu Mục 4.5 (trang 14-15)
    const signPayload = {
      sp_id: clientId,
      sp_password: clientSecret,
      user_id: userId,
      password: config.password || '',
      otp: otpCode,
      transaction_id: txId,
      sign_files: [
        {
          data_to_be_signed: hashHex,
          doc_id: docId,
          file_type: 'xml',
          sign_type: 'hash',
        },
      ],
      serial_number: serialNumber,
    };

    for (const signUrl of v2SignEndpoints) {
      try {
        onProgress?.('🔐 Đang gửi yêu cầu ký số v2/signatures/sign tới VNPT SmartCA...');
        const res = await fetch(signUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signPayload),
        });
        const data = await res.json().catch(() => null);
        if (!data) continue;

        // Nếu trả về chữ ký trực tiếp
        const directSig = extractSignatureFromResponse(data);
        if (directSig) {
          if (!isDirectOtp) saveWinningTotp(totpSecret, alg, variant);
          lastSignCompletedAt = Date.now();
          return directSig;
        }

        const d = data.data || data;
        const sad = d.sad || data.sad;
        const returnedTxId = d.transaction_id || data.transaction_id || txId;

        // Mục 4.5 -> 4.6 (trang 14-16): Nhận được SAD -> Nghỉ ngắn 0.7s rồi gọi v2/signatures/confirm để lấy signature_value
        if (sad && typeof sad === 'string' && sad.length > 5) {
          if (!isDirectOtp) saveWinningTotp(totpSecret, alg, variant);
          onProgress?.('🔐 Đã nhận SAD từ VNPT SmartCA! Đang chờ 0.7s đồng bộ và xác nhận giao dịch (v2/signatures/confirm)...');
          await sleepMs(700);

          const confirmPayload = {
            sp_id: clientId,
            sp_password: clientSecret,
            user_id: userId,
            password: config.password || '',
            transaction_id: returnedTxId,
            sad: sad,
          };

          for (const confirmUrl of v2ConfirmEndpoints) {
            try {
              const cRes = await fetch(confirmUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(confirmPayload),
              });
              const cData = await cRes.json().catch(() => null);
              const confirmedSig = extractSignatureFromResponse(cData);
              if (confirmedSig) {
                lastSignCompletedAt = Date.now();
                return confirmedSig;
              }
              diagLog += `[CONFIRM ${cRes.status}]: ${JSON.stringify(cData).slice(0, 150)} | `;
            } catch (ce: any) {
              diagLog += `[CONFIRM ERR]: ${ce.message} | `;
            }
          }
        }

        const statusCode = data.status_code ?? data.status ?? data.code ?? res.status;
        const msg = data.message || data.error_description || JSON.stringify(data).slice(0, 120);
        diagLog += `[${alg}/v${variant}/${offset}s -> ${statusCode}: ${msg}] `;

        // DỪNG NGAY khi tài khoản bị khóa để không gửi thêm request làm kéo dài thời gian khóa
        if (/locked|khóa|khoa tai khoan|too many/i.test(String(msg))) {
          throw new Error(
            'TÀI KHOẢN VNPT SMARTCA ĐANG BỊ KHÓA TẠM THỜI do nhập sai Password/OTP nhiều lần.\n' +
              '👉 Vui lòng KHÔNG bấm ký lại. Hãy chờ khoảng 15–30 phút (hoặc liên hệ VNPT/đăng nhập app VNPT SmartCA để mở khóa), ' +
              'sau đó kiểm tra lại Password thuê bao và Khóa Secret (TOTP) trong Cấu hình rồi mới ký lại.\n' +
              `Phản hồi VNPT: ${msg}`
          );
        }
        // Sai password: dừng ngay (kể cả khi VNPT trả lỗi 401 chung), tránh mất thêm lượt thử
        if (/password|mật khẩu|mat khau/i.test(String(msg)) && !/otp/i.test(String(msg))) {
          throw new Error(`Sai Password thuê bao VNPT SmartCA. Vui lòng kiểm tra lại mật khẩu trong Cấu hình. Phản hồi VNPT: ${msg}`);
        }
        // Endpoint này ĐÃ phản hồi lỗi nghiệp vụ từ VNPT -> KHÔNG gửi lại cùng thông tin qua các endpoint khác
        break;
      } catch (e: any) {
        if (/ĐANG BỊ KHÓA|Sai Password thuê bao/.test(e?.message || '')) throw e;
        diagLog += `[ERR: ${e.message}] `;
      }
    }
  }

  throw new Error(
    `Ký số VNPT SmartCA v2 thất bại. Vui lòng kiểm tra lại Password thuê bao, mã Secret (TOTP) hoặc chuyển sang chế độ "VNPT SmartCA App" để xác nhận trên điện thoại.\nChi tiết: ${diagLog}`
  );
};
