/**
 * SERVICE KÝ SỐ USB TOKEN ĐA NĂNG (TÍCH HỢP Chay_Ky_So_USB_Token) & PROXY ĐỔI IP SMARTCA
 * - Tự động nhận diện nhiều loại USB Token khác nhau khi cắm vào máy:
 *   Viettel-CA, VNPT-CA, BKAV-CA, FPT-CA, CA2 (Nacencomm), EasyCA, NewCA, Vina-CA (SmartSign), Safe-CA, MISA eSign...
 * - Kích hoạt mở ứng dụng quản lý USB Token của hãng tương ứng, hiển thị bảng nhập mật khẩu (Mã PIN)
 *   để xác thực với phần cứng USB Token và đọc thông tin Chứng thư số (CKS) trực tiếp từ USB Token.
 * - TUYỆT ĐỐI KHÔNG lấy thông tin CKS của VNPT SmartCA hiển thị sang phần USB Token.
 * - Hỗ trợ tự động đánh thức Chay_Ky_So_USB_Token qua giao thức bhxhtoken:// (chạy ngầm cùng Windows).
 *
 * Tác giả: NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ ĐÀ NẴNG
 */

import { prepareXmlForSigning } from './xmlBuilder';

export interface TokenCertificateItem {
  subject: string;
  commonName?: string;
  mst?: string;
  serial: string;
  issuer?: string;
  issuerName?: string;
  tokenBrand?: string;
  providerName?: string;
  isHardwareToken?: boolean;
  notBefore?: string;
  notAfter?: string;
  rawCertBase64?: string;
  verifiedWithPin?: boolean;
}

export interface LocalSignerStatus {
  available: boolean;           // true nếu Chay_Ky_So_USB_Token đang chạy trên cổng 18088
  proxyRunning: boolean;        // true nếu cổng 18088 đang mở (phục vụ cả đổi IP cho SmartCA)
  hasToken: boolean;            // true nếu phát hiện ít nhất 1 USB Token cắm vào máy
  unlocked: boolean;            // true nếu đã nhập mật khẩu (PIN) mở khóa lấy thông tin CKS của Token trong phiên này
  port: number;
  detectedBrands: string[];     // Danh sách các loại USB Token nhận diện được
  hardwareDevices: string[];    // Tên thiết bị phần cứng USB Token / SmartCard
  certSubject?: string;         // Chỉ có giá trị sau khi đã nhập mật khẩu (PIN) lấy CKS từ USB Token
  serialNumber?: string;        // Chỉ có giá trị sau khi đã nhập mật khẩu (PIN) lấy CKS từ USB Token
  unlockedCert?: TokenCertificateItem;
  certificates: TokenCertificateItem[];
  message: string;
}

export interface LocalSignResult {
  signedXml: string;
  signatureBase64: string;
  rawCertBase64: string;
  subject: string;
  serialNumber?: string;
  tokenBrand?: string;
}

const LOCAL_PORT = 18088;

// Bộ nhớ tạm trong phiên làm việc (RAM) — tự xóa sạch khi F5
let sessionTokenPin = '';
const unlockedTokensBySerial = new Map<string, TokenCertificateItem>();
let lastUnlockedSerial = '';
let autoLaunchAttemptedAt = 0;

export function setSessionTokenPin(pin: string): void {
  sessionTokenPin = pin;
}

export function getSessionTokenPin(): string {
  return sessionTokenPin;
}

export function getUnlockedTokenCertificate(serial?: string): TokenCertificateItem | undefined {
  if (serial) {
    const clean = serial.replace(/\s+/g, '').toUpperCase();
    return unlockedTokensBySerial.get(clean);
  }
  if (lastUnlockedSerial) {
    return unlockedTokensBySerial.get(lastUnlockedSerial);
  }
  const first = unlockedTokensBySerial.values().next();
  return first.done ? undefined : first.value;
}

/**
 * Tự động kích hoạt Chay_Ky_So_USB_Token qua giao thức bhxhtoken:// (nếu đã từng chạy 1 lần trên máy)
 */
export function tryAutoLaunchTokenAgent(): void {
  if (typeof document === 'undefined') return;
  const now = Date.now();
  if (now - autoLaunchAttemptedAt < 4000) return;
  autoLaunchAttemptedAt = now;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'bhxhtoken://start';
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {}
    }, 2000);
  } catch {}
}

/**
 * Phân tích tên hãng USB Token từ Issuer / Subject / ProviderName
 */
function detectBrandFromText(issuer = '', subject = '', provider = ''): string {
  const combined = `${issuer} | ${subject} | ${provider}`;
  if (/Viettel|SafeNet|eToken|Bit4id|Watchdata|vtca/i.test(combined)) return 'Viettel-CA USB Token';
  if (/VNPT|VDC|Longmai|mToken|vnptca/i.test(combined)) return 'VNPT-CA USB Token';
  if (/Bkav|BkavCA/i.test(combined)) return 'BKAV-CA USB Token';
  if (/FPT|Feitian|ePass|EnterSafe/i.test(combined)) return 'FPT-CA USB Token';
  if (/CA2|Nacencomm|CAVN/i.test(combined)) return 'CA2 (Nacencomm) USB Token';
  if (/EasyCA|Softdreams/i.test(combined)) return 'EasyCA USB Token';
  if (/NewCA|Newtel/i.test(combined)) return 'NewCA USB Token';
  if (/SmartSign|Vina-CA|VinaCA|VINA/i.test(combined)) return 'Vina-CA (SmartSign) USB Token';
  if (/Safe-CA|SafeCA/i.test(combined)) return 'Safe-CA USB Token';
  if (/MISA/i.test(combined)) return 'MISA eSign USB Token';
  if (/EFY/i.test(combined)) return 'EFY-CA USB Token';
  if (/TrustCA|I-CA|LCS|CMC/i.test(combined)) return 'TrustCA / I-CA USB Token';
  return 'USB Token PKI';
}

function parseCnFromDn(dn = ''): string {
  const m = dn.match(/(?:^|,\s*)CN=([^,]+)/i);
  return m ? m[1].trim() : dn;
}

function parseMstFromDn(dn = ''): string {
  const m1 = dn.match(/MST\s*[:=]\s*([0-9\-]+)/i);
  if (m1) return m1[1].trim();
  const m2 = dn.match(/(?:UID|0\.9\.2342\.19200300\.100\.1\.1)=([^,]+)/i);
  if (m2) return m2[1].replace(/^MST\s*[:=]\s*/i, '').trim();
  return '';
}

/**
 * Kiểm tra xem công cụ Proxy đổi IP về Việt Nam (cổng 18088) cho VNPT SmartCA có đang bật không
 */
export async function checkSmartCaIpProxy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900);
    const res = await fetch(`http://127.0.0.1:${LOCAL_PORT}/ping`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Quét cổng 18088 để nhận diện các loại USB Token đang cắm vào máy tính.
 * Nếu dịch vụ chưa chạy, tự động gọi giao thức bhxhtoken://start để đánh thức dịch vụ ngầm.
 * LƯU Ý: Chỉ trả về thông tin CKS (certSubject, serialNumber) sau khi người dùng đã nhập mật khẩu (PIN) mở khóa Token!
 */
export async function checkLocalTokenSigner(autoWake = true): Promise<LocalSignerStatus> {
  const fetchCerts = async (timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`http://127.0.0.1:${LOCAL_PORT}/certificates`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json().catch(() => ({}));
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return null;
  };

  let data = await fetchCerts(1000);

  // Nếu chưa phản hồi, thử tự động kích hoạt qua bhxhtoken://start và đợi 1.5s
  if (!data && autoWake) {
    tryAutoLaunchTokenAgent();
    await new Promise(r => setTimeout(r, 1400));
    data = await fetchCerts(1200);
  }

  if (data) {
    const rawList: any[] = Array.isArray(data.certificates) ? data.certificates : [];
    const hwList: string[] = Array.isArray(data.hardwareDevices)
      ? data.hardwareDevices.map((x: any) => String(x))
      : [];

    const certificates: TokenCertificateItem[] = rawList
      .filter(c => c && (c.subject || c.serial))
      .map(c => {
        const subject = String(c.subject || '').trim();
        const serial = String(c.serial || '').replace(/\s+/g, '').toUpperCase();
        const issuer = c.issuer ? String(c.issuer).trim() : '';
        const providerName = c.providerName ? String(c.providerName).trim() : 'Windows SmartCard / USB Token CSP';
        const tokenBrand = c.tokenBrand
          ? String(c.tokenBrand).trim()
          : detectBrandFromText(issuer, subject, providerName);
        const unlockedItem = unlockedTokensBySerial.get(serial);

        return {
          subject,
          commonName: c.commonName ? String(c.commonName).trim() : parseCnFromDn(subject),
          mst: c.mst ? String(c.mst).trim() : parseMstFromDn(subject),
          serial,
          issuer,
          issuerName: c.issuerName ? String(c.issuerName).trim() : parseCnFromDn(issuer),
          tokenBrand,
          providerName,
          isHardwareToken: Boolean(c.isHardwareToken ?? true),
          notBefore: c.notBefore ? String(c.notBefore) : undefined,
          notAfter: c.notAfter ? String(c.notAfter) : undefined,
          rawCertBase64: c.certificate ? String(c.certificate) : undefined,
          verifiedWithPin: Boolean(unlockedItem),
        };
      });

    const detectedBrands = Array.from(
      new Set(certificates.map(c => c.tokenBrand || 'USB Token PKI'))
    );

    if (certificates.length > 0) {
      const unlockedCert =
        certificates.find(c => c.verifiedWithPin && c.serial === lastUnlockedSerial) ||
        certificates.find(c => c.verifiedWithPin);

      return {
        available: true,
        proxyRunning: true,
        hasToken: true,
        unlocked: Boolean(unlockedCert),
        port: LOCAL_PORT,
        detectedBrands,
        hardwareDevices: hwList,
        // Chỉ hiển thị CKS sau khi người dùng đã nhập mật khẩu PIN xác thực USB Token
        certSubject: unlockedCert?.subject,
        serialNumber: unlockedCert?.serial,
        unlockedCert,
        certificates,
        message: unlockedCert
          ? `Đã mở khóa & lấy thông tin CKS từ ${unlockedCert.tokenBrand}: ${unlockedCert.commonName}`
          : `Đã nhận diện ${certificates.length} USB Token (${detectedBrands.join(', ')}). Hãy bấm "Mở ứng dụng Token & Nhập mật khẩu" để lấy thông tin CKS.`,
      };
    }

    return {
      available: true,
      proxyRunning: true,
      hasToken: false,
      unlocked: false,
      port: LOCAL_PORT,
      detectedBrands: [],
      hardwareDevices: hwList,
      certificates: [],
      message: 'Công cụ Chay_Ky_So_USB_Token đang chạy, nhưng chưa phát hiện USB Token nào cắm vào máy tính.',
    };
  }

  return {
    available: false,
    proxyRunning: false,
    hasToken: false,
    unlocked: false,
    port: LOCAL_PORT,
    detectedBrands: [],
    hardwareDevices: [],
    certificates: [],
    message: 'Chưa kết nối được dịch vụ Chay_Ky_So_USB_Token (Cổng 18088). Vui lòng cắm USB Token và bật Chay_Ky_So_USB_Token.bat.',
  };
}

/**
 * Hiển thị hộp thoại yêu cầu nhập mật khẩu (Mã PIN) của USB Token
 * để mở ứng dụng ký số của Token đó và đọc thông tin CKS
 */
export function promptTokenPinDialog(options?: {
  tokenBrand?: string;
  providerName?: string;
  serialHint?: string;
  title?: string;
}): Promise<{ pin: string; openNativeApp: boolean }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Không thể hiển thị hộp thoại nhập mật khẩu USB Token.'));
      return;
    }

    const brandLabel = options?.tokenBrand || 'USB Token (Viettel / VNPT / Bkav / FPT / CA2 / EasyCA...)';
    const providerLabel = options?.providerName || 'Windows SmartCard / PKCS#11 CryptoAPI';

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.68);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,sans-serif;';

    const card = document.createElement('div');
    card.style.cssText =
      'background:#ffffff;border-radius:16px;max-width:460px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #cbd5e1;overflow:hidden;';

    card.innerHTML = `
      <div style="background:linear-gradient(135deg,#1e40af,#1d4ed8);padding:14px 18px;color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">🔐</div>
          <div>
            <div style="font-weight:800;font-size:13.5px;letter-spacing:0.2px;">${options?.title || 'XÁC THỰC MẬT KHẨU (MÃ PIN) USB TOKEN'}</div>
            <div style="font-size:11px;color:#bfdbfe;">Nhập mật khẩu để mở khóa & lấy thông tin CKS từ USB Token</div>
          </div>
        </div>
        <button id="usb-pin-close" style="background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;">✕</button>
      </div>
      <div style="padding:18px;font-size:12.5px;color:#334155;">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:14px;line-height:1.5;">
          <div>🔌 <b>Loại USB Token nhận diện:</b> <span style="color:#1d4ed8;font-weight:800;">${brandLabel}</span></div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">• Driver / Middleware: <span style="font-family:monospace;">${providerLabel}</span></div>
          ${options?.serialHint ? `<div style="font-size:11px;color:#475569;margin-top:2px;">• Serial thiết bị: <span style="font-family:monospace;font-weight:700;">${options.serialHint}</span></div>` : ''}
        </div>
        <label style="display:block;font-weight:700;color:#0f172a;margin-bottom:6px;">
          Nhập Mật khẩu / Mã PIN của USB Token:
        </label>
        <input
          id="usb-pin-input"
          type="password"
          placeholder="Nhập mã PIN USB Token (Hoặc để trống nếu nhập trên cửa sổ gốc của Token)..."
          style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #94a3b8;border-radius:10px;font-size:13.5px;font-weight:700;outline:none;margin-bottom:8px;"
        />
        <div style="font-size:11px;color:#64748b;margin-bottom:10px;line-height:1.4;">
          💡 Hệ thống sẽ kích hoạt ứng dụng ký số của <b>${brandLabel}</b>, kiểm tra mã PIN trên phần cứng USB Token và tải thông tin Chứng thư số (CKS) của Token lên phần mềm.
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#334155;cursor:pointer;user-select:none;margin-bottom:6px;">
          <input id="usb-open-app" type="checkbox" checked style="accent-color:#1d4ed8;" />
          Đồng thời mở ứng dụng quản lý gốc của USB Token trên máy tính
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#475569;cursor:pointer;user-select:none;">
          <input id="usb-pin-remember" type="checkbox" checked style="accent-color:#1d4ed8;" />
          Nhớ mật khẩu PIN trong phiên làm việc hiện tại (Tự xóa khi F5)
        </label>
        <div id="usb-pin-err" style="display:none;color:#dc2626;font-size:11.5px;font-weight:700;margin-top:8px;"></div>
      </div>
      <div style="background:#f8fafc;padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;">
        <button id="usb-pin-cancel" style="padding:8px 14px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#475569;font-weight:700;font-size:12px;cursor:pointer;">Hủy bỏ</button>
        <button id="usb-pin-submit" style="padding:8px 18px;border-radius:9px;border:none;background:#1d4ed8;color:#fff;font-weight:700;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(29,78,216,0.3);">🔑 Xác nhận & Lấy CKS Token</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const inputEl = card.querySelector('#usb-pin-input') as HTMLInputElement;
    const openAppEl = card.querySelector('#usb-open-app') as HTMLInputElement;
    const rememberEl = card.querySelector('#usb-pin-remember') as HTMLInputElement;
    const submitBtn = card.querySelector('#usb-pin-submit') as HTMLButtonElement;
    const cancelBtn = card.querySelector('#usb-pin-cancel') as HTMLButtonElement;
    const closeBtn = card.querySelector('#usb-pin-close') as HTMLButtonElement;

    setTimeout(() => inputEl?.focus(), 60);

    const cleanup = () => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    const handleConfirm = () => {
      const val = (inputEl?.value || '').trim();
      if (rememberEl?.checked && val) {
        sessionTokenPin = val;
      }
      const openNativeApp = Boolean(openAppEl?.checked);
      cleanup();
      resolve({ pin: val, openNativeApp });
    };

    const handleCancel = () => {
      cleanup();
      reject(new Error('Người dùng đã hủy nhập mật khẩu USB Token.'));
    };

    submitBtn?.addEventListener('click', handleConfirm);
    cancelBtn?.addEventListener('click', handleCancel);
    closeBtn?.addEventListener('click', handleCancel);
    inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });
  });
}

/**
 * Mở ứng dụng ký số của USB Token, yêu cầu nhập mật khẩu (PIN),
 * xác thực trực tiếp trên phần cứng USB Token và trả về thông tin CKS của USB Token đó.
 */
export async function unlockAndFetchTokenCertificate(
  targetSerial?: string,
  providedPin?: string,
  onProgress?: (msg: string) => void
): Promise<TokenCertificateItem> {
  onProgress?.('🔍 Đang quét thiết bị USB Token cắm trên máy tính...');
  const status = await checkLocalTokenSigner(true);

  if (!status.available) {
    throw new Error(
      'Chưa kết nối được công cụ Chay_Ky_So_USB_Token (cổng 18088).\n' +
      'Vui lòng tải và chạy file "Chay_Ky_So_USB_Token.bat" 1 lần để tích hợp tự động nhận diện USB Token trên máy tính.'
    );
  }

  if (!status.hasToken || status.certificates.length === 0) {
    throw new Error(
      'Không phát hiện USB Token nào đang cắm vào máy tính!\n' +
      'Vui lòng cắm USB Token (Viettel-CA, VNPT-CA, Bkav-CA, FPT-CA, EasyCA, NewCA...) vào cổng USB và kiểm tra driver của Token.'
    );
  }

  const targetCert =
    (targetSerial
      ? status.certificates.find(
          c => c.serial.replace(/\s+/g, '').toUpperCase() === targetSerial.replace(/\s+/g, '').toUpperCase()
        )
      : undefined) || status.certificates[0];

  let pinToUse = (providedPin || '').trim();
  let openNativeApp = true;

  if (!pinToUse) {
    const dialogResult = await promptTokenPinDialog({
      tokenBrand: targetCert.tokenBrand,
      providerName: targetCert.providerName,
      serialHint: targetCert.serial,
      title: `NHẬP MẬT KHẨU — ${targetCert.tokenBrand?.toUpperCase() || 'USB TOKEN'}`,
    });
    pinToUse = dialogResult.pin;
    openNativeApp = dialogResult.openNativeApp;
  }

  onProgress?.(
    `🔐 Đang mở ứng dụng ${targetCert.tokenBrand || 'USB Token'} và xác thực mật khẩu để đọc thông tin CKS...`
  );

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);

  try {
    const res = await fetch(`http://127.0.0.1:${LOCAL_PORT}/unlock-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial: targetCert.serial,
        pin: pinToUse,
        openApp: openNativeApp,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === 'error') {
      // Nếu công cụ .bat bản cũ chưa có endpoint /unlock-token (HTTP 404), thực hiện ký thử XML nhỏ qua /sign để xác thực PIN & lấy CKS
      if (res.status === 404) {
        const testRes = await fetch(`http://127.0.0.1:${LOCAL_PORT}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xml: '<TEST_TOKEN><THONGTINHOSO Id="TEST"><NOIDUNG>VERIFY</NOIDUNG></THONGTINHOSO><CHUKYDONVI/></TEST_TOKEN>',
            serial: targetCert.serial,
            pin: pinToUse,
          }),
        });
        const testData = await testRes.json().catch(() => ({}));
        if (!testRes.ok || testData.status === 'error') {
          throw new Error(testData.message || 'Xác thực mật khẩu USB Token thất bại.');
        }
        const verifiedCert: TokenCertificateItem = {
          ...targetCert,
          subject: testData.subject || targetCert.subject,
          commonName: parseCnFromDn(testData.subject || targetCert.subject),
          mst: parseMstFromDn(testData.subject || targetCert.subject),
          serial: (testData.serialNumber || targetCert.serial).replace(/\s+/g, '').toUpperCase(),
          rawCertBase64: testData.certificate || targetCert.rawCertBase64,
          verifiedWithPin: true,
        };
        unlockedTokensBySerial.set(verifiedCert.serial, verifiedCert);
        lastUnlockedSerial = verifiedCert.serial;
        if (pinToUse) sessionTokenPin = pinToUse;
        return verifiedCert;
      }

      throw new Error(data.message || `Không thể xác thực mật khẩu USB Token (HTTP ${res.status})`);
    }

    const tInfo = data.tokenInfo || {};
    const cleanSerial = String(tInfo.serial || targetCert.serial)
      .replace(/\s+/g, '')
      .toUpperCase();
    const subject = String(tInfo.subject || targetCert.subject).trim();

    const verifiedCert: TokenCertificateItem = {
      subject,
      commonName: tInfo.commonName ? String(tInfo.commonName) : parseCnFromDn(subject),
      mst: tInfo.mst ? String(tInfo.mst) : parseMstFromDn(subject),
      serial: cleanSerial,
      issuer: tInfo.issuer ? String(tInfo.issuer) : targetCert.issuer,
      issuerName: tInfo.issuerName ? String(tInfo.issuerName) : targetCert.issuerName,
      tokenBrand: tInfo.tokenBrand ? String(tInfo.tokenBrand) : targetCert.tokenBrand,
      providerName: tInfo.providerName ? String(tInfo.providerName) : targetCert.providerName,
      isHardwareToken: true,
      notBefore: tInfo.notBefore ? String(tInfo.notBefore) : targetCert.notBefore,
      notAfter: tInfo.notAfter ? String(tInfo.notAfter) : targetCert.notAfter,
      rawCertBase64: tInfo.certificate ? String(tInfo.certificate) : targetCert.rawCertBase64,
      verifiedWithPin: true,
    };

    unlockedTokensBySerial.set(cleanSerial, verifiedCert);
    lastUnlockedSerial = cleanSerial;
    if (pinToUse) sessionTokenPin = pinToUse;

    onProgress?.(`✅ Đã xác thực mã PIN & lấy thông tin CKS từ ${verifiedCert.tokenBrand}: ${verifiedCert.commonName}`);
    return verifiedCert;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Hết thời gian chờ nhập mật khẩu USB Token (60 giây). Vui lòng thử lại.');
    }
    throw err;
  }
}

/**
 * Thực hiện ký số XML bằng USB Token qua công cụ Chay_Ky_So_USB_Token.
 * Nếu Token chưa được mở khóa lấy CKS trong phiên này, sẽ tự động hiện bảng nhập mật khẩu (PIN)
 * để mở ứng dụng của Token đó, lấy thông tin CKS từ Token rồi thực hiện ký số.
 */
export async function signXmlWithUsbToken(
  xmlString: string,
  onProgress?: (msg: string) => void,
  providedPin?: string,
  targetSerial?: string
): Promise<LocalSignResult> {
  onProgress?.('🔍 Đang kiểm tra kết nối thiết bị USB Token...');

  const status = await checkLocalTokenSigner(true);
  if (!status.available) {
    throw new Error(
      'Chưa kết nối được công cụ ký số USB Token (Chay_Ky_So_USB_Token.bat trên cổng 18088).\n' +
      'Vui lòng tải và chạy file "Chay_Ky_So_USB_Token.bat" 1 lần trên máy tính và cắm USB Token để ký.'
    );
  }

  if (!status.hasToken || status.certificates.length === 0) {
    throw new Error(
      'Chưa phát hiện USB Token nào được cắm vào máy tính.\n' +
      'Vui lòng cắm USB Token của bạn (Viettel-CA, VNPT-CA, Bkav-CA, FPT-CA, EasyCA, NewCA...) vào cổng USB rồi thử lại.'
    );
  }

  const chosenSerial = targetSerial || lastUnlockedSerial || status.certificates[0].serial;
  let pinToUse = (providedPin || sessionTokenPin || '').trim();

  // Nếu chưa mở khóa lấy CKS của Token trong phiên này -> Mở ứng dụng Token & hiện bảng nhập mật khẩu để lấy CKS trước!
  let activeCert = getUnlockedTokenCertificate(chosenSerial);
  if (!activeCert) {
    activeCert = await unlockAndFetchTokenCertificate(chosenSerial, pinToUse, onProgress);
    pinToUse = sessionTokenPin || pinToUse;
    onProgress?.(`🔐 Đang ký số XML bằng ${activeCert.tokenBrand} (${activeCert.commonName})...`);
  } else {
    onProgress?.(`🔐 Đang ký số XML bằng ${activeCert.tokenBrand} (${activeCert.commonName})...`);
  }

  const updateUnlockedCache = (
    serialVal: string,
    subjectVal: string,
    certVal: string,
    tokenInfoVal?: any
  ) => {
    if (!subjectVal) return;
    const cleanSer = String(serialVal || chosenSerial).replace(/\s+/g, '').toUpperCase();
    const existing = unlockedTokensBySerial.get(cleanSer);
    const updatedCert: TokenCertificateItem = {
      subject: subjectVal,
      commonName: existing?.commonName || parseCnFromDn(subjectVal),
      mst: existing?.mst || parseMstFromDn(subjectVal),
      serial: cleanSer,
      issuer: existing?.issuer,
      issuerName: existing?.issuerName,
      tokenBrand: tokenInfoVal?.tokenBrand || existing?.tokenBrand || detectBrandFromText('', subjectVal, ''),
      providerName: tokenInfoVal?.providerName || existing?.providerName,
      isHardwareToken: true,
      notBefore: tokenInfoVal?.notBefore || existing?.notBefore,
      notAfter: tokenInfoVal?.notAfter || existing?.notAfter,
      rawCertBase64: certVal || existing?.rawCertBase64,
      verifiedWithPin: true,
    };
    unlockedTokensBySerial.set(cleanSer, updatedCert);
    lastUnlockedSerial = cleanSer;
  };

  // Chuẩn hóa: dựng cấu trúc <CHUKYDONVI> bằng chính engine prepareXmlForSigning (dùng chung 100% với VNPT SmartCA)
  // rồi gửi hash SHA-256 sang /sign-hash của USB Token để ký RSA — đảm bảo SmartCA và USB Token ra XML giống hệt nhau.
  const certBase64 = activeCert.rawCertBase64 || status.certificates.find(c => c.serial === activeCert!.serial)?.rawCertBase64 || '';
  const certSubject = activeCert.subject || '';
  if (certBase64 && certSubject) {
    try {
      const { hashToSign, buildSignedXml } = await prepareXmlForSigning(xmlString, {
        rawCertBase64: certBase64,
        subject: certSubject,
        serialNumber: activeCert.serial || chosenSerial,
      });

      const hashCtrl = new AbortController();
      const hashTimer = setTimeout(() => hashCtrl.abort(), 60000);
      try {
        const hashRes = await fetch(`http://127.0.0.1:${LOCAL_PORT}/sign-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hashBase64: hashToSign,
            serial: activeCert.serial || chosenSerial,
            pin: pinToUse,
          }),
          signal: hashCtrl.signal,
        });
        clearTimeout(hashTimer);

        if (hashRes.status !== 404) {
          const hashData = await hashRes.json().catch(() => ({}));
          if (!hashRes.ok || hashData.status === 'error') {
            throw new Error(`Ký số USB Token thất bại: ${hashData.message || `HTTP ${hashRes.status}`}`);
          }
          const sigB64 = String(hashData.signature || hashData.signatureBase64 || '').replace(/\s+/g, '');
          if (!sigB64) {
            throw new Error('Công cụ USB Token không trả về chữ ký RSA.');
          }
          const finalCertB64 = String(hashData.certificate || hashData.rawCertBase64 || certBase64);
          const finalSubject = String(hashData.subject || certSubject).trim();
          const finalSerial = String(hashData.serialNumber || activeCert.serial || chosenSerial);
          updateUnlockedCache(finalSerial, finalSubject, finalCertB64, hashData.tokenInfo);

          const signedXml = buildSignedXml(sigB64);
          onProgress?.('✅ Ký số bằng USB Token thành công!');
          return {
            signedXml,
            signatureBase64: sigB64,
            rawCertBase64: finalCertB64,
            subject: finalSubject,
            serialNumber: finalSerial,
            tokenBrand: hashData.tokenInfo?.tokenBrand || activeCert.tokenBrand,
          };
        }
      } catch (err: any) {
        clearTimeout(hashTimer);
        if (err.name === 'AbortError') {
          throw new Error('Hết thời gian chờ ký số USB Token (quá 60 giây). Vui lòng thử lại và nhập mã PIN trên cửa sổ USB Token.');
        }
        throw err;
      }
    } catch (err: any) {
      // Nếu lỗi không phải 404 từ /sign-hash thì ném lỗi luôn; 404 mới fallback sang /sign
      throw err;
    }
  }

  // Fallback sang /sign nếu công cụ .bat quá cũ chưa có endpoint /sign-hash
  const signCtrl = new AbortController();
  const signTimer = setTimeout(() => signCtrl.abort(), 60000);

  try {
    const res = await fetch(`http://127.0.0.1:${LOCAL_PORT}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xml: xmlString,
        serial: chosenSerial,
        pin: pinToUse,
      }),
      signal: signCtrl.signal,
    });
    clearTimeout(signTimer);

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === 'error') {
      const errMsg = data.message || `Lỗi máy chủ ký số USB Token (HTTP ${res.status})`;
      throw new Error(`Ký số USB Token thất bại: ${errMsg}`);
    }

    if (!data.signedXml && !data.xml) {
      throw new Error('Công cụ ký số USB Token không trả về dữ liệu XML đã ký.');
    }

    const subject = String(data.subject || '').trim();
    updateUnlockedCache(String(data.serialNumber || chosenSerial), subject, String(data.certificate || ''), data.tokenInfo);

    onProgress?.('✅ Ký số bằng USB Token thành công!');

    return {
      signedXml: data.signedXml || data.xml,
      signatureBase64: data.signature || data.signatureBase64 || '',
      rawCertBase64: data.certificate || data.rawCertBase64 || '',
      subject: data.subject || '',
      serialNumber: data.serialNumber || chosenSerial,
      tokenBrand: data.tokenInfo?.tokenBrand,
    };
  } catch (err: any) {
    clearTimeout(signTimer);
    if (err.name === 'AbortError') {
      throw new Error('Hết thời gian chờ ký số USB Token (quá 60 giây). Vui lòng thử lại và nhập mã PIN trên cửa sổ USB Token.');
    }
    throw err;
  }
}

/**
 * Thực hiện ký Hash SHA-256 (dùng cho Ký số PDF Mẫu 02/BH hoặc dữ liệu nhị phân) bằng USB Token
 */
export async function signHashWithUsbToken(
  hashBase64: string,
  onProgress?: (msg: string) => void,
  providedPin?: string,
  targetSerial?: string
): Promise<{
  signatureBase64: string;
  rawCertBase64: string;
  subject: string;
  serialNumber?: string;
  tokenBrand?: string;
}> {
  onProgress?.('🔍 Đang kiểm tra kết nối thiết bị USB Token...');

  const status = await checkLocalTokenSigner(true);
  if (!status.available) {
    throw new Error(
      'Chưa kết nối được công cụ ký số USB Token (Chay_Ky_So_USB_Token.bat trên cổng 18088).\n' +
      'Vui lòng tải và chạy file "Chay_Ky_So_USB_Token.bat" 1 lần trên máy tính và cắm USB Token để ký.'
    );
  }

  if (!status.hasToken || status.certificates.length === 0) {
    throw new Error(
      'Chưa phát hiện USB Token nào được cắm vào máy tính.\n' +
      'Vui lòng cắm USB Token của bạn (Viettel-CA, VNPT-CA, Bkav-CA, FPT-CA, EasyCA, NewCA...) vào cổng USB rồi thử lại.'
    );
  }

  const chosenSerial = targetSerial || lastUnlockedSerial || status.certificates[0].serial;
  let pinToUse = (providedPin || sessionTokenPin || '').trim();

  const alreadyUnlocked = getUnlockedTokenCertificate(chosenSerial);
  if (!alreadyUnlocked) {
    const unlockedCert = await unlockAndFetchTokenCertificate(chosenSerial, pinToUse, onProgress);
    pinToUse = sessionTokenPin || pinToUse;
    onProgress?.(`🔐 Đang ký số PDF bằng ${unlockedCert.tokenBrand} (${unlockedCert.commonName})...`);
  } else {
    onProgress?.(`🔐 Đang ký số PDF bằng ${alreadyUnlocked.tokenBrand} (${alreadyUnlocked.commonName})...`);
  }

  const signCtrl = new AbortController();
  const signTimer = setTimeout(() => signCtrl.abort(), 60000);

  try {
    const res = await fetch(`http://127.0.0.1:${LOCAL_PORT}/sign-hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hashBase64,
        serial: chosenSerial,
        pin: pinToUse,
      }),
      signal: signCtrl.signal,
    });
    clearTimeout(signTimer);

    // Nếu bản .bat đang chạy chưa có /sign-hash (HTTP 404), fallback qua /sign với gói XML giả lập để lấy chữ ký RSA
    if (res.status === 404) {
      const fallbackRes = await signXmlWithUsbToken(
        `<PDF_HASH_WRAPPER><THONGTINHOSO Id="Id-PDF"><HASH>${hashBase64}</HASH></THONGTINHOSO><CHUKYDONVI/></PDF_HASH_WRAPPER>`,
        onProgress,
        pinToUse,
        chosenSerial
      );
      return {
        signatureBase64: fallbackRes.signatureBase64,
        rawCertBase64: fallbackRes.rawCertBase64,
        subject: fallbackRes.subject,
        serialNumber: fallbackRes.serialNumber,
        tokenBrand: fallbackRes.tokenBrand,
      };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === 'error') {
      throw new Error(`Ký số PDF bằng USB Token thất bại: ${data.message || `HTTP ${res.status}`}`);
    }

    onProgress?.('✅ Ký số PDF bằng USB Token thành công!');
    return {
      signatureBase64: data.signature || data.signatureBase64 || '',
      rawCertBase64: data.certificate || data.rawCertBase64 || alreadyUnlocked?.rawCertBase64 || '',
      subject: data.subject || alreadyUnlocked?.subject || '',
      serialNumber: data.serialNumber || chosenSerial,
      tokenBrand: data.tokenInfo?.tokenBrand || alreadyUnlocked?.tokenBrand,
    };
  } catch (err: any) {
    clearTimeout(signTimer);
    if (err.name === 'AbortError') {
      throw new Error('Hết thời gian chờ ký số USB Token (quá 60 giây). Vui lòng thử lại.');
    }
    throw err;
  }
}
