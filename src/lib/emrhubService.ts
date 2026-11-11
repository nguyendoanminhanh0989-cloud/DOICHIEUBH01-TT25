/**
 * SERVICE ĐẨY HỒ SƠ KHÁM SỨC KHỎE LÊN CỔNG EMRHUB (BỘ Y TẾ)
 * -------------------------------------------------------------------------
 * Theo "Tài liệu hướng dẫn liên thông API" chính thức của Bộ Y Tế & đặc tả kỹ thuật:
 *   1. POST {base}/api/auth/login                 -> JWT Bearer (3600s, cache RAM, refresh trước 60s)
 *   2. POST {base}/api/platform/data-sync/push    -> envelope { header, data, signature }
 *
 * Header chuẩn (theo ảnh Postman thực tế của BYT):
 *   version: "1.0.6"
 *   sender_id: <Mã GLN 13 số của CSKCB>
 *   receiver_id: "emrhub" (chuẩn Cổng EMRHUB tiếp nhận)
 *   txn_type: "sync_checkup"
 *   msg_type: "101"
 *   data_type: "xml/base64"
 *   send_datetime: Unix timestamp 13 số (Long)
 *   msg_id: <sender_id><YYMMDD><UUIDv4_HEX_32>
 *
 * Chữ ký kép:
 *   header_sha   = SHA256(json_compact(header)).HEX.upper()
 *   data_sha     = SHA256(data_base64.strip()).HEX.upper()
 *   compare_data = `${header_sha}.${data_sha}`
 *   signature    = BASE64(RSA_PKCS1_V15_SHA256(compare_data, private_key))
 */

export interface EmrhubConfig {
  apiUrl: string;
  senderId: string; // Mã GLN 13 số của CSKCB
  username: string; // <GLN>_api
  password?: string;
  privateKey: string; // PEM PKCS#8
  receiverId?: string; // Mặc định "emrhub" theo chuẩn Postman BYT
}

export const EMRHUB_DEFAULT_BASE_URL = 'https://api.emrhub.vn';
export const EMRHUB_DEFAULT_RECEIVER_ID = 'emrhub';
export const EMRHUB_PROTOCOL_VERSION = '1.0.6';
export const EMRHUB_SERVICE_TYPE = '100';

export interface EmrhubPushResult {
  ok: boolean;
  httpStatus: number;
  code?: string | number;
  message?: string;
  syncCode?: string;
  msgId: string;
}

interface CachedToken {
  key: string;
  token: string;
  expiresAt: number;
}
let tokenCache: CachedToken | null = null;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Lấy origin của cổng (chấp nhận người dùng dán cả đường dẫn đầy đủ) */
export function normalizeBaseUrl(apiUrl?: string): string {
  const raw = (apiUrl || '').trim();
  if (!raw) return EMRHUB_DEFAULT_BASE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return EMRHUB_DEFAULT_BASE_URL;
  }
}

/** Chuyển sang đường dẫn proxy nội bộ nếu gọi từ trình duyệt bị chặn CORS */
function resolveProxyBaseUrl(base: string): string {
  const lower = base.toLowerCase();
  if (lower.includes('api-sandbox.emrhub.vn')) return '/api/emrhub-sandbox';
  if (lower.includes('api.emrhub.vn')) return '/api/emrhub-prod';
  return base;
}

async function fetchWithCorsFallback(base: string, path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${base}${path}`, init);
  } catch (err) {
    const proxyBase = resolveProxyBaseUrl(base);
    if (proxyBase !== base) {
      return await fetch(`${proxyBase}${path}`, init);
    }
    throw err;
  }
}

/** Tài khoản API chuẩn: <MÃ_GLN>_api */
export function resolveUsername(cfg: EmrhubConfig): string {
  const u = (cfg.username || '').trim();
  return u || `${(cfg.senderId || '').trim()}_api`;
}

const bytesToHexUpper = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export const utf8ToBase64 = (s: string): string => bytesToBase64(new TextEncoder().encode(s));

async function sha256HexUpper(s: string): Promise<string> {
  return bytesToHexUpper(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

/** msg_id = <SENDER_ID><YYMMDD><UUID_HEX_32> */
export function buildMsgId(senderId: string, now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const uuidHex = crypto.randomUUID().replace(/-/g, '');
  return `${senderId}${yy}${mm}${dd}${uuidHex}`;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (/BEGIN RSA PRIVATE KEY/.test(pem)) {
    throw new Error('Private Key định dạng PKCS#1 (BEGIN RSA PRIVATE KEY) chưa được hỗ trợ. Hãy chuyển sang PKCS#8 (BEGIN PRIVATE KEY).');
  }
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  if (!b64) throw new Error('Chưa cấu hình Private Key để ký số.');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** Ký chuỗi compare_data = header_sha.data_sha */
export async function signEnvelope(header: Record<string, any>, dataBase64: string, privateKeyPem: string): Promise<string> {
  // JSON rút gọn: không khoảng trắng sau ':' và ',' (JSON.stringify mặc định đã đúng)
  const headerSha = await sha256HexUpper(JSON.stringify(header));
  const dataSha = await sha256HexUpper(dataBase64.trim());
  const compareData = `${headerSha}.${dataSha}`;
  const key = await importPrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(compareData));
  return bytesToBase64(new Uint8Array(sig));
}

export async function emrhubLogin(cfg: EmrhubConfig, force = false): Promise<string> {
  const base = normalizeBaseUrl(cfg.apiUrl);
  const username = resolveUsername(cfg);
  const key = `${base}|${username}`;
  if (!force && tokenCache && tokenCache.key === key && tokenCache.expiresAt - 60_000 > Date.now()) {
    return tokenCache.token;
  }

  const res = await fetchWithCorsFallback(base, '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ username, password: cfg.password || '' }),
  });
  const json: any = await res.json().catch(() => ({}));
  const token = json?.data?.token;
  if (!res.ok || !token) {
    tokenCache = null;
    const errMsg = json?.header?.res_msg || json?.header?.res_code || json?.message || 'Không nhận được token xác thực';
    throw new Error(`Đăng nhập EMRHUB thất bại (HTTP ${res.status}): ${errMsg}`);
  }
  const expiresIn = Number(json?.data?.expires_in) || 3600;
  tokenCache = { key, token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

export function clearEmrhubToken() {
  tokenCache = null;
}

/**
 * Đẩy 1 file XML KSK (đã sinh theo chuẩn TT25/2026 của BYT) lên Cổng EMRHUB.
 * - Retry tối đa 3 lần khi lỗi mạng / HTTP 504 (nghỉ 2 giây)
 * - HTTP 401: xóa cache token, đăng nhập lại và gửi lại
 */
export async function pushKskXml(
  cfg: EmrhubConfig,
  xmlContent: string,
  fallbackSignature?: string
): Promise<EmrhubPushResult> {
  const senderId = (cfg.senderId || '').trim();
  if (!/^\d{13}$/.test(senderId)) throw new Error('sender_id phải là mã GLN gồm 13 chữ số.');

  const base = normalizeBaseUrl(cfg.apiUrl);
  const dataBase64 = utf8ToBase64(xmlContent).trim();
  const receiverId = (cfg.receiverId || '').trim() || EMRHUB_DEFAULT_RECEIVER_ID;

  // Header chuẩn đúng thứ tự theo tài liệu Postman chính thức của BYT
  const header = {
    version: EMRHUB_PROTOCOL_VERSION,
    sender_id: senderId,
    receiver_id: receiverId,
    txn_type: 'sync_checkup',
    msg_type: '101',
    data_type: 'xml/base64',
    send_datetime: Date.now(),
    msg_id: buildMsgId(senderId),
  };

  let signature = '';
  if ((cfg.privateKey || '').trim()) {
    signature = await signEnvelope(header, dataBase64, cfg.privateKey);
  } else if (fallbackSignature) {
    signature = fallbackSignature.replace(/\s+/g, '');
  } else {
    throw new Error('Chưa có Private Key hoặc Chữ ký số (Token/SmartCA) để ký gói tin gửi EMRHUB.');
  }

  const body = JSON.stringify({ header, data: dataBase64, signature });

  let relogged = false;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const token = await emrhubLogin(cfg);
      const res = await fetchWithCorsFallback(base, '/api/platform/data-sync/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'service-type': EMRHUB_SERVICE_TYPE,
        },
        body,
      });

      if (res.status === 401 && !relogged) {
        relogged = true;
        clearEmrhubToken();
        attempt--; // không tính vào số lần thử lại
        continue;
      }
      if (res.status === 504 && attempt < 3) {
        await sleep(2000);
        continue;
      }

      const json: any = await res.json().catch(() => ({}));

      // Kiểm tra phản hồi theo cả 2 định dạng (chuẩn Cổng EMRHUB thực tế & fallback)
      // Khi thành công: json.data.data_state === "0" hoặc HTTP 200 không có res_code lỗi
      const isSuccess = res.ok && (
        json?.data?.data_state === '0' ||
        json?.code === 200 ||
        (!json?.header?.res_code && !json?.header?.res_msg) ||
        json?.header?.res_code === 'CM_SUCCESS'
      );

      const resCode = json?.header?.res_code || json?.code;
      const resMsg = json?.data?.message_notify || json?.data?.data_state_msg || json?.header?.res_msg || json?.message;
      const syncCode = json?.header?.ref_msg_id || json?.header?.msg_id || json?.data?.sync_code || header.msg_id;

      return {
        ok: isSuccess,
        httpStatus: res.status,
        code: resCode,
        message: resMsg,
        syncCode,
        msgId: header.msg_id,
      };
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(2000);
    }
  }
  throw new Error(`Không kết nối được Cổng EMRHUB: ${lastErr?.message || lastErr}`);
}
