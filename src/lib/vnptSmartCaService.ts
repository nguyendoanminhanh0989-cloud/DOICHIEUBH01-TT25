

/**
 * MODULE TÍCH HỢP CHỮ KÝ SỐ TỪ XA VNPT SMARTCA
 * Chuẩn kết nối: VNPT SmartCA v2 (Direct Authentication / SP769)
 * Hỗ trợ chế độ ký: TOTP (Tự động sinh OTP) và APP (Xác nhận qua App)
 */
export interface SmartCAConfig {
  signMode: 'TOTP' | 'APP';
  baseUrl: string;       // Mặc định: https://gwsca.vnpt.vn
  clientId: string;      // SP ID được VNPT cấp
  clientSecret: string;  // SP Password / Client Secret
  userId: string;        // Mã định danh người dùng (CCCD hoặc Mã NV)
  password?: string;     // Mật khẩu tài khoản SmartCA
  serialNumber: string;  // Serial Number của chứng thư số
  totpSecret?: string;   // Khóa bí mật TOTP (Base64/Base32) để tự động sinh OTP
}

export interface CertificateInfo {
  subject: string;
  serialNumber: string;
  issuer: string;
  validFrom?: string;
  validTo?: string;
  rawCertBase64?: string;
}

export interface SmartCATestResult {
  status: 'success' | 'error';
  message: string;
  details?: string;
  certificate?: CertificateInfo;
}

const STORAGE_KEY = 'vnpt_smartca_config';

/**
 * Lấy cấu hình đã lưu trong LocalStorage
 */
export const getSmartCAConfig = (): SmartCAConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc cấu hình SmartCA:', e);
  }
  return {
    signMode: 'TOTP',
    baseUrl: 'https://gwsca.vnpt.vn',
    clientId: '',
    clientSecret: '',
    userId: '',
    password: '',
    serialNumber: '',
    totpSecret: ''
  };
};

/**
 * Lưu cấu hình vào LocalStorage
 */
export const saveSmartCAConfig = (config: SmartCAConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

/**
 * Hàm giải mã và trích xuất thông tin Subject từ chứng thư số X.509
 */
export const extractCertificateSubject = (certObj: any, defaultUserId: string = ''): string => {
  if (!certObj) return '';
  // 1. Kiểm tra các khóa chuỗi Subject trực tiếp
  const direct = certObj.subject_dn || certObj.subject || certObj.cert_subject || 
                 certObj.subjectDN || certObj.common_name || certObj.subject_name || 
                 certObj.cn || certObj.owner_name || certObj.fullName || certObj.user_name;
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  // 2. Phân tích chuỗi nhị phân Base64 X.509 Certificate
  const rawCert = certObj.certificate || certObj.cert_data || certObj.cert || (typeof certObj === 'string' ? certObj : '');
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
      if (cnMatch) {
        return `CN=${cnMatch[1].trim()}${oMatch ? `, O=${oMatch[1].trim()}` : ''}`;
      }
    } catch (e) {
      console.warn('Không thể parse Base64 certificate:', e);
    }
  }
  return defaultUserId ? `Người dùng SmartCA (ID: ${defaultUserId})` : 'Không xác định';
};

/**
 * Kiểm tra kết nối và xác thực chứng thư số với máy chủ VNPT SmartCA
 */
export const testSmartCaConnection = async (config: SmartCAConfig): Promise<SmartCATestResult> => {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const userId = config.userId?.trim();
  const password = config.password?.trim();
  const serialNumber = config.serialNumber?.trim();
  let proxyBase = config.baseUrl?.replace(/\/+$/, '').trim() || 'https://gwsca.vnpt.vn';
  
  // 1. Kiểm tra dữ liệu đầu vào
  if (!clientId || !clientSecret || !userId || !serialNumber) {
    return {
      status: 'error',
      message: 'THIẾU THÔNG TIN CẤU HÌNH',
      details: 'Vui lòng nhập đầy đủ Client ID (SP ID), Client Secret, User ID và Serial Number.'
    };
  }

  // 2. Điều hướng qua Proxy trên trình duyệt (tránh lỗi CORS)
  if (proxyBase.includes('gwsca.vnpt.vn')) {
    proxyBase = '/api/vnpt';
  }

  // Endpoint Direct Auth của chuẩn SmartCA v2 SP769
  const certEndpoints = [
    `${proxyBase}/sca/sp769/v1/credentials/get_certificate`,
    `${proxyBase}/v1/credentials/get_certificate`
  ];

  let certResult: any = null;
  let lastError = '';

  for (const url of certEndpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const txId = `TX${Date.now()}${Math.floor(Math.random() * 1e3)}`;
      
      const payload = {
        user_id: userId,
        transaction_id: txId,
        sp_id: clientId,
        sp_password: clientSecret,
        client_id: clientId,
        client_secret: clientSecret,
        'sp id': clientId,
        'sp password': clientSecret,
        'user id': userId
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await res.json().catch(() => null);
      clearTimeout(timeoutId);

      if (!data) {
        lastError = `[${url}]: Máy chủ không phản hồi JSON.`;
        continue;
      }

      // Kiểm tra mã trạng thái từ máy chủ VNPT
      if (data.status !== undefined && data.status !== 0 && data.status !== '0' && data.status !== 200) {
        const serverMsg = data.message || data.error_description || data.desc || JSON.stringify(data);
        throw new Error(`Máy chủ VNPT phản hồi lỗi (status ${data.status}): ${serverMsg}`);
      }

      if (data.code !== undefined && data.code !== 0 && data.code !== '0' && data.code !== 200) {
        const serverMsg = data.message || data.error_description || data.desc || JSON.stringify(data);
        throw new Error(`Máy chủ VNPT phản hồi lỗi (code ${data.code}): ${serverMsg}`);
      }

      if (data.error) {
        const serverMsg = data.error_description || data.error;
        throw new Error(`Lỗi xác thực VNPT: ${serverMsg}`);
      }

      // Trích xuất danh sách chứng thư
      let certList: any[] = [];
      if (Array.isArray(data.user_certificates)) certList = data.user_certificates;
      else if (Array.isArray(data.data?.user_certificates)) certList = data.data.user_certificates;
      else if (Array.isArray(data.certificates)) certList = data.certificates;
      else if (Array.isArray(data.data?.certificates)) certList = data.data.certificates;
      else if (data.certificate) certList = [data];
      else if (data.data?.certificate) certList = [data.data];

      if (res.ok && certList.length > 0) {
        certResult = { url, data, certList };
        break;
      }

      if (res.ok && certList.length === 0) {
        throw new Error(`Tài khoản User ID (${userId}) không tồn tại chứng thư số nào trên hệ thống VNPT SmartCA.`);
      }

      const serverMsg = data.message || data.error_description || JSON.stringify(data);
      throw new Error(`Từ chối truy cập: ${serverMsg}`);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.message.includes('Từ chối truy cập') || error.message.includes('phản hồi lỗi') || error.message.includes('không tồn tại')) {
        throw error;
      }
      lastError = `[${url}]: ${error.message}`;
    }
  }

  if (!certResult || !certResult.certList || certResult.certList.length === 0) {
    return {
      status: 'error',
      message: 'LỖI KẾT NỐI MÁY CHỦ VNPT',
      details: lastError || 'Không thể lấy danh sách chứng thư từ máy chủ VNPT SmartCA.'
    };
  }

  const certList = certResult.certList;

  // 3. Đối chiếu Serial Number
  const matchedCert = certList.find((c: any) => {
    const s = c.serial_number || c.serial || c.serial_number_hex || '';
    return s.toLowerCase() === serialNumber.toLowerCase();
  });

  if (!matchedCert) {
    const availableSerials = certList
      .map((c: any) => c.serial_number || c.serial || c.serial_number_hex)
      .filter(Boolean)
      .join(', ');
    return {
      status: 'error',
      message: 'LỖI SAI SERIAL NUMBER',
      details: `Chứng thư tải về không khớp với Serial bạn nhập!\n- Serial bạn nhập: ${serialNumber}\n- Serial thực tế trên tài khoản: ${availableSerials || 'Không có'}\nVui lòng kiểm tra lại cấu hình.`
    };
  }

  const subject = extractCertificateSubject(matchedCert, userId);
  const serverSerial = matchedCert.serial_number || matchedCert.serial || matchedCert.serial_number_hex || serialNumber;
  const issuer = matchedCert.issuer_dn || matchedCert.issuer || matchedCert.issuerDN || 'VNPT-CA';
  const validFrom = matchedCert.valid_from || matchedCert.not_before || '';
  const validTo = matchedCert.valid_to || matchedCert.not_after || '';

  let details = `• Chủ thể (Subject): ${subject}\n• Số Serial: ${serverSerial}\n• Đơn vị cấp (Issuer): ${issuer}`;
  if (validFrom && validTo) {
    details += `\n• Thời hạn chứng thư: ${validFrom} đến ${validTo}`;
  }

  return {
    status: 'success',
    message: 'KẾT NỐI VÀ LẤY CHỨNG THƯ THÀNH CÔNG',
    details,
    certificate: {
      subject,
      serialNumber: serverSerial,
      issuer,
      validFrom,
      validTo,
      rawCertBase64: matchedCert.certificate || matchedCert.cert_data
    }
  };
};

/**
 * Thực hiện Ký Hash với VNPT SmartCA bằng TOTP
 */


export const signSmartCAHash = async (config: SmartCAConfig, hashBase64: string): Promise<string> => {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const userId = config.userId?.trim();
  const totpSecret = config.totpSecret?.trim();
  const serialNumber = config.serialNumber?.trim();
  let proxyBase = config.baseUrl?.replace(/\/+$/, '').trim() || 'https://gwsca.vnpt.vn';

  if (!clientId || !clientSecret || !userId || !totpSecret) {
    throw new Error('Thiếu thông tin cấu hình ký số TOTP (SP ID, Secret, User ID, TOTP Secret).');
  }

  if (proxyBase.includes('gwsca.vnpt.vn')) {
    proxyBase = '/api/vnpt';
  }

  const txId = `SIG${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Convert Base64 hash to Hex (Required by VNPT SP769)
  const binary = atob(hashBase64);
  let hashHex = '';
  for (let i = 0; i < binary.length; i++) {
    const h = binary.charCodeAt(i).toString(16);
    hashHex += h.length === 1 ? '0' + h : h;
  }

  const payload: any = {
    client_id: clientId,
    client_secret: clientSecret,
    user_id: userId,
    subscriber_id: userId,
    sp_id: clientId,
    sp_password: clientSecret,
    'sp id': clientId,
    'sp password': clientSecret,
    'subscriber id': userId,
    'user id': userId,
    serial_number: serialNumber,
    sign_files: [
      {
        file_type: 'xml',
        data_to_be_signed: hashHex,
        doc_id: `DOC_${Date.now()}`,
        sign_type: 'hash'
      }
    ]
  };

  // BVDX: Only add password when TOTP is available (silent signing mode)
  if (totpSecret) {
    payload.password = config.password || '';
  }

  // Get Access Token First (Required by VNPT Gateway for signing)
  let accessToken = '';
  const tokenPayload = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'password',
    username: userId,
    password: config.password || ''
  }).toString();

  const tokenEndpoints = [
    `${proxyBase}/oauth/token`,
    `${proxyBase}/sca/sp769/oauth/token`,
    `${proxyBase}/sca/v2/oauth/token`,
    `${proxyBase}/v1/oauth/token`
  ];

  for (const tUrl of tokenEndpoints) {
    try {
      const tRes = await fetch(tUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenPayload
      });
      const tData = await tRes.json().catch(() => null);
      if (tRes.ok && tData && tData.access_token) {
        accessToken = tData.access_token;
        break;
      }
    } catch (e) {
      // Ignore
    }
  }

  const silentSuffixes = [
    '/sca/sp769/v2/signatures/sign',
    '/sca/v2/signatures/sign',
    '/v2/signatures/sign'
  ];

  let lastErr = '';
  let finalSignature = '';
  let lastDataStr = '';
  let diagLog = '';

  const totpOffsets = [0, -30, 30, -60, 60, -120, 120];
  const totpAlgs = ['SHA-1', 'SHA-256'];
  let isAppFlowTriggered = false;

  for (const alg of totpAlgs) {
    if (finalSignature) break;
    
    for (const offset of totpOffsets) {
      if (finalSignature) break;
          let otpCode = '';
      try {
        const clean = config.totpSecret ? config.totpSecret.trim() : ((config as any).secret_totp ? (config as any).secret_totp.trim() : '');
        let key;
        if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
          key = new Uint8Array(clean.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        } else if (/^[A-Z2-7=\s]+$/i.test(clean)) {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          const b32 = clean.toUpperCase().replace(/\s|=/g, '');
          const bitsValid = b32.length * 5;
          key = new Uint8Array(Math.floor(bitsValid / 8));
          let bits = 0, value = 0, index = 0;
          for (let i = 0; i < b32.length; i++) {
            const idx = alphabet.indexOf(b32[i]);
            if (idx === -1) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
              if (index < key.length) {
                key[index++] = (value >>> (bits - 8)) & 255;
                bits -= 8;
                value &= (1 << bits) - 1;
              }
            }
          }
        } else {
          const b64 = atob(clean);
          key = new Uint8Array(b64.length);
          for (let i = 0; i < b64.length; i++) key[i] = b64.charCodeAt(i);
        }

        const epoch = Math.floor((Date.now() + offset * 1000) / 1000);
        const time = Math.floor(epoch / 30);
        const msg = new Uint8Array(8);
        let t = time;
        for (let i = 7; i >= 0; i--) {
          msg[i] = t % 256;
          t = Math.floor(t / 256);
        }

        const cryptoKey = await window.crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: alg }, false, ['sign']);
        const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msg);
        const hmacArr = new Uint8Array(signature);
        const hmacOffset = hmacArr[hmacArr.length - 1] & 0x0f;
        const code = ((hmacArr[hmacOffset] & 0x7f) << 24 | (hmacArr[hmacOffset + 1] & 0xff) << 16 | (hmacArr[hmacOffset + 2] & 0xff) << 8 | (hmacArr[hmacOffset + 3] & 0xff)) % 1000000;
        otpCode = code.toString().padStart(6, '0');
      } catch (e) {
        console.error('TOTP generation failed:', e);
        continue;
      }
      
      payload.otp = otpCode;
      payload['otp'] = otpCode;
      payload.sign_files[0].otp = otpCode;
      payload.transaction_id = `SIG${Date.now()}${Math.floor(Math.random() * 10000)}`;

      for (const suffix of silentSuffixes) {
        const url = `${proxyBase}${suffix}`;
        try {
          const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
          if (accessToken) reqHeaders['Authorization'] = `Bearer ${accessToken}`;

          const res = await fetch(url, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(payload)
          });
          
          const resText = await res.text();
          // DIAGNOSTIC: Log every single response
          const diagEntry = `[${alg}/${offset}s][${suffix}] HTTP ${res.status}: ${resText.substring(0, 200)}`;
          console.log('VNPT-DIAG:', diagEntry);
          diagLog += diagEntry + ' | ';
          
          lastDataStr = resText.substring(0, 500);
          
          let data;
          try { data = JSON.parse(resText); } catch(e) { 
             continue; 
          }
          
          if (res.ok) {
            const sig = data.signature || (data.data && data.data.signature) || data.signed_data;
            const tid = data.transaction_id || (data.data && data.data.transaction_id) || data.tran_id;
            const rawSad = data.sad || (data.data && data.data.sad) || data.SAD || (data.data && data.data.SAD);
            const sad = (typeof rawSad === 'string' && rawSad.length > 10) ? rawSad : null;
            
            const sigList = data.signatures || (data.data && data.data.signatures) || (data.data && data.data.sign_files);
            const firstSigObj = Array.isArray(sigList) ? sigList[0] : null;
            let finalSigValue = sig;

            if (!finalSigValue && firstSigObj) {
              finalSigValue = firstSigObj.signature || firstSigObj.signature_value || firstSigObj['signature value'] || firstSigObj.signed_data;
            }
            
            if (finalSigValue) {
              finalSignature = finalSigValue;
              break;
            }

            // V2 Two-Step Flow: VNPT accepted OTP, returned SAD token → call /confirm to get signature
            if (sad && tid) {
              console.log('VNPT-DIAG: SAD received! Calling confirm endpoint...');
              const confirmPayload: any = {
                client_id: clientId,
                client_secret: clientSecret,
                sp_id: clientId,
                sp_password: clientSecret,
                'sp id': clientId,
                'sp password': clientSecret,
                user_id: userId,
                'user id': userId,
                password: config.password || '',
                sad: sad,
                transaction_id: tid
              };
              const confirmPaths = [
                '/sca/sp769/v2/signatures/confirm',
                '/sca/v2/signatures/confirm',
                '/v2/signatures/confirm'
              ];
              for (const cPath of confirmPaths) {
                try {
                  const cRes = await fetch(`${proxyBase}${cPath}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(confirmPayload)
                  });
                  const cText = await cRes.text();
                  const cDiag = `[CONFIRM ${cPath}] HTTP ${cRes.status}: ${cText.substring(0, 300)}`;
                  console.log('VNPT-DIAG:', cDiag);
                  diagLog += cDiag + ' | ';
                  
                  let cData;
                  try { cData = JSON.parse(cText); } catch { continue; }
                  
                  // Extract signature from confirm response
                  const d = cData.data || cData;
                  const cSig = d.signature || cData.signature || d.signed_data || cData.signed_data;
                  const signatures = d.signatures || d.signature_list || d.sign_files || cData.signatures;
                  const firstSig = Array.isArray(signatures) ? signatures[0] : signatures;
                  const sigValue = cSig || firstSig?.['signature value'] || firstSig?.signature_value || firstSig?.signature || (typeof firstSig === 'string' ? firstSig : null);
                  
                  if (sigValue) {
                    finalSignature = sigValue;
                    break;
                  }
                } catch (ce: any) {
                  diagLog += `[CONFIRM ${cPath}]: ${ce.message} | `;
                }
              }
              if (finalSignature) break;
              // Don't mark as app flow error - this is a confirm failure, keep trying other offsets
              continue;
            }
          }
          
          // Only mark as app flow if NO sad was returned (true app-only flow)
          const errMsg = (data.message || data.error_description || data.desc || data.error || data.title || '').toString();
          if (errMsg.toUpperCase().includes('OTP') && !errMsg.includes('sig_wait_for_user_confirm')) {
            // OTP rejected completely (status 1003) - try next offset
            continue;
          }
          if (errMsg.includes('sig_wait_for_user_confirm') && !(data.data && data.data.sad)) {
            // App flow WITHOUT sad token - true app-only mode
            isAppFlowTriggered = true;
            break;
          }
        } catch (e: any) {
          diagLog += `[${suffix}]: ${e.message} | `;
        }
      }
      
    }
  }

  if (finalSignature) return finalSignature;
  
  // Show FULL diagnostic in error so user/developer can see exactly what happened
  if (isAppFlowTriggered) {
    throw new Error(`Ký số VNPT v2 thất bại: Mã TOTP bị từ chối ở tất cả các khung giờ (hệ thống đẩy về Ký qua App). Vui lòng mở ứng dụng VNPT SmartCA trên điện thoại để xác nhận ký, HOẶC kiểm tra lại Khóa TOTP bí mật! [DIAG: ${diagLog}]`);
  }

  throw new Error(`Ký số VNPT v2 thất bại: ${lastErr || 'Không có phản hồi hợp lệ'}. [DIAG: ${diagLog}]`);
};
