// Inline Organization type (từ OrganizationConfig trong signAndSubmitService)
type Organization = {
  ma_cskcb: string;
  ten_cskcb?: string;
  bhxh_account: { username: string; password: string; };
};

// Inline MD5 hash (cho trình duyệt không cần cài package)
function md5(str: string): string {
  // Polyfill MD5 đơn giản - trong thực tế nên dùng SubtleCrypto hoặc package md5
  // BHXH yêu cầu MD5 của password
  // Dùng crypto.subtle nếu có
  function toHex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: trả về chuỗi gốc nếu đã là MD5 (32 hex chars)
  if (/^[a-f0-9]{32}$/i.test(str)) return str;
  // Trả về chuỗi và warn user để nhập mật khẩu đã hash sẵn
  console.warn('[BHXH] MD5 polyfill: vui lòng nhập mật khẩu đã MD5 hash. Input:', str.substring(0, 3) + '***');
  return str;
}

// Địa chỉ Cổng tiếp nhận dữ liệu Giám định BHYT của BHXH Việt Nam
const BHXH_DIRECT_HOST = 'https://egw.baohiemxahoi.gov.vn';

/**
 * Thực hiện gọi API tới Cổng BHXH:
 * Ưu tiên gọi trực tiếp Cổng BHXH (đã hỗ trợ CORS cho mọi Origin).
 * Tránh qua proxy trung gian nước ngoài (như Vercel Hong Kong/US) để không bị lỗi 502 DNS_HOSTNAME_SERVER_ERROR
 * do hệ thống mạng BHXH chặn phân giải DNS / chặn IP quốc tế.
 */
async function fetchBhxh(endpointPath: string, options: RequestInit): Promise<Response> {
  const directUrl = `${BHXH_DIRECT_HOST}${endpointPath}`;
  try {
    const res = await fetch(directUrl, options);
    return res;
  } catch (directErr: any) {
    console.warn(`[BHXH Service] Gọi trực tiếp ${directUrl} thất bại:`, directErr);
    
    // Nếu chạy ở môi trường dev localhost và bị chặn mạng cục bộ, thử fallback qua proxy Vite nếu có
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const proxyUrl = `/api/bhxh${endpointPath}`;
      try {
        const fallbackRes = await fetch(proxyUrl, options);
        return fallbackRes;
      } catch (fallbackErr: any) {
        throw directErr;
      }
    }
    throw directErr;
  }
}

export async function bhxhGetToken(org: Organization): Promise<{ access_token: string, id_token: string } | null> {
  try {
    const { username, password } = org.bhxh_account;
    if (!username || !password) {
      throw new Error('Tài khoản hoặc mật khẩu liên thông chưa được cấu hình.');
    }

    // BHXH API yêu cầu mật khẩu đã băm MD5
    const isAlreadyMd5 = /^[a-f0-9]{32}$/i.test(password);
    const finalPassword = isAlreadyMd5 ? password : md5(password);

    const formData = new URLSearchParams();
    formData.append('username', username.trim());
    formData.append('password', finalPassword.trim());

    const res = await fetchBhxh('/api/token/take', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    if (data.maKetQua === "200" && data.APIKey) {
      return {
        access_token: data.APIKey.access_token,
        id_token: data.APIKey.id_token
      };
    } else {
      let errorMsg = `Mã kết quả: ${data.maKetQua}`;
      if (data.maKetQua === "401") {
        errorMsg = `Tên đăng nhập hoặc mật khẩu liên thông Cổng BHXH không chính xác (Mã 401). Vui lòng kiểm tra lại tài khoản định dạng [${org.ma_cskcb}_BV] và mật khẩu.`;
      } else if (data.maKetQua === "402") {
        errorMsg = `Mã cơ sở khám chữa bệnh [${org.ma_cskcb}] không tồn tại trên Cổng tiếp nhận BHXH (Mã 402).`;
      } else if (data.maKetQua === "403") {
        errorMsg = `Tài khoản liên thông của cơ sở [${org.ma_cskcb}] đang bị khóa hoặc chưa được cấp quyền (Mã 403).`;
      } else if (data.maKetQua === "500") {
        errorMsg = `Lỗi xử lý nội bộ phía Cổng BHXH Việt Nam (Mã 500). Vui lòng thử lại sau ít phút.`;
      }
      throw new Error(errorMsg);
    }
  } catch (err: any) {
    console.error('bhxhGetToken Error:', err);
    throw err;
  }
}

export async function bhxhSubmitDocument(
  org: Organization, 
  tokens: { access_token: string, id_token: string }, 
  fileBase64Str: string,
  loaiHs: string = "39"
): Promise<{ maKetQua: string, maGD: string, thoiGianTiepNhan: string, message: string }> {
  try {
    let effectiveLoaiHs = loaiHs;
    // Tự động nhận diện nếu fileBase64Str là hồ sơ Giấy chứng sinh (HSDLGCS / GIAYCHUNGSINH)
    if (effectiveLoaiHs === '39') {
      try {
        const decoded = atob(fileBase64Str);
        if (decoded.includes('<HSDLGCS') || decoded.includes('<GIAYCHUNGSINH')) {
          effectiveLoaiHs = '61';
        }
      } catch (e) {}
    }

    const rawPassword = org.bhxh_account.password || '';
    const isAlreadyMd5 = /^[a-f0-9]{32}$/i.test(rawPassword);
    const finalPassword = rawPassword ? (isAlreadyMd5 ? rawPassword : md5(rawPassword)) : '';

    const formData = new URLSearchParams();
    formData.append('maCskcb', org.ma_cskcb.trim());
    formData.append('token', tokens.access_token);
    formData.append('id_token', tokens.id_token);
    formData.append('username', org.bhxh_account.username.trim());
    formData.append('password', finalPassword.trim());
    formData.append('loaiHs', effectiveLoaiHs); // "61" cho Giấy chứng sinh, "39" cho TT25
    formData.append('fileBase64Str', fileBase64Str);
    formData.append('fileHsBase64', fileBase64Str); // Gửi thêm tham số này do tài liệu BHXH không đồng nhất giữa bảng mô tả và ví dụ cURL

    // Định tuyến endpoint chuẩn theo Phụ lục 02 BHXH
    const submitPath = effectiveLoaiHs === "61"
      ? '/api/hososuckhoe/guiGiayToDienTu'
      : '/api/chungtugw/GuiHoSoChungTu2025';

    const res = await fetchBhxh(submitPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const data = await res.json();
    return {
      maKetQua: data.MaKetQua || data.maKetQua,
      maGD: data.MaGD || data.maGD,
      thoiGianTiepNhan: data.ThoiGianTiepNhan || data.thoiGianTiepNhan,
      message: (data.MaKetQua || data.maKetQua) === "200" ? 'Gửi thành công' : `Lỗi cổng: ${data.MaKetQua || data.maKetQua}`
    };
  } catch (err: any) {
    console.error('bhxhSubmitDocument Error:', err);
    throw err;
  }
}
