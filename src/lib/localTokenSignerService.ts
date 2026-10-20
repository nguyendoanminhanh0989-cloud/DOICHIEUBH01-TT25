/**
 * SERVICE GIAO TIẾP VỚI CÔNG CỤ KÝ SỐ USB TOKEN CỤC BỘ (LOCAL AGENT)
 * Cổng giao tiếp mặc định: http://127.0.0.1:18088
 * Hỗ trợ mọi USB Token tại Việt Nam (Viettel-CA, VNPT-CA, BKAV, FPT, EasyCA, v.v.)
 * 
 * Tác giả: NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ ĐÀ NẴNG
 */

export interface LocalSignerStatus {
  available: boolean;
  port?: number;
  certSubject?: string;
  serialNumber?: string;
  message?: string;
}

export interface LocalSignResult {
  signedXml: string;
  signatureBase64: string;
  rawCertBase64: string;
  subject: string;
  serialNumber?: string;
}

const LOCAL_PORTS = [18088, 8080, 10443, 8006];

/**
 * Kiểm tra xem công cụ ký số USB Token cục bộ có đang chạy trên máy tính không
 */
export async function checkLocalTokenSigner(): Promise<LocalSignerStatus> {
  for (const port of LOCAL_PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`http://127.0.0.1:${port}/ping`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          available: true,
          port,
          certSubject: data.subject || data.certSubject,
          serialNumber: data.serial || data.serialNumber,
          message: 'Đã kết nối với công cụ ký số USB Token trên máy tính.'
        };
      }
    } catch {
      // Tiếp tục thử cổng khác
    }
  }

  return {
    available: false,
    message: 'Chưa phát hiện công cụ ký số USB Token cục bộ đang chạy.'
  };
}

/**
 * Gửi XML tới công cụ ký số USB Token cục bộ để ký RSA-SHA256 chuẩn BHXH
 */
export async function signXmlWithUsbToken(xmlString: string, onProgress?: (msg: string) => void): Promise<LocalSignResult> {
  onProgress?.('🔍 Đang tìm công cụ ký số USB Token trên máy tính (localhost)...');
  
  let targetPort: number | null = null;
  for (const port of LOCAL_PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://127.0.0.1:${port}/ping`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        targetPort = port;
        break;
      }
    } catch {
      // bỏ qua
    }
  }

  if (!targetPort) {
    throw new Error(
      'CHƯA KẾT NỐI ĐƯỢC VỚI USB TOKEN TRÊN MÁY TÍNH!\n\n' +
      'Trình duyệt web không thể tự truy cập thiết bị phần cứng USB Token nếu chưa có công cụ kết nối.\n\n' +
      '👉 CÁCH 1 (Ký 1-click): Chạy file "Chay_Ky_So_USB_Token.bat" trong thư mục phần mềm trên máy tính rồi bấm Ký lại.\n\n' +
      '👉 CÁCH 2 (Ký ngoại tuyến): Bấm nút "Tải XML" để tải file về máy, dùng phần mềm ký số USB Token (Viettel, VNPT, BKAV...) để ký, sau đó bấm "Tải lên XML đã ký" để đẩy Cổng BHXH.'
    );
  }

  onProgress?.('🔐 Đã kết nối với USB Token! Đang yêu cầu nhập mã PIN trên máy tính...');

  try {
    const controller = new AbortController();
    // Chờ tối đa 60 giây để người dùng nhập mã PIN trên popup của USB Token
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`http://127.0.0.1:${targetPort}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xml: xmlString }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const result = await res.json();
    if (!res.ok || result.status !== 'success') {
      throw new Error(result.message || 'Lỗi khi thực hiện ký số bằng USB Token.');
    }

    onProgress?.('✅ Ký số USB Token thành công!');

    return {
      signedXml: result.signedXml || result.xml,
      signatureBase64: result.signature || result.signatureBase64 || '',
      rawCertBase64: result.certificate || result.rawCertBase64 || '',
      subject: result.subject || 'USB Token',
      serialNumber: result.serialNumber
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Quá thời gian chờ nhập mã PIN USB Token (Timeout 60s).');
    }
    throw err;
  }
}
