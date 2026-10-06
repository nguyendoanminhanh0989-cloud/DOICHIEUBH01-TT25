const fs = require('fs');

let content = fs.readFileSync('src/components/KhamSucKhoe.tsx', 'utf8');

// We need to inject a fixDate8 function for yyyymmdd and apply it to NGAY_SINH and NGAYCAP_CCCD
const newValidateFunc = `function validateAndFixRecord(obj: any) {
  const errors: string[] = [];

  // Thiếu Họ Tên
  if (!obj.HO_TEN) {
    errors.push("Thiếu Họ tên");
  }

  // Giới tính
  let gt = String(obj.GIOI_TINH || '').trim().toLowerCase();
  if (gt === 'nam') gt = '1';
  else if (gt === 'nữ' || gt === 'nu') gt = '2';
  else if (gt === '1' || gt === '2' || gt === '3') gt = gt;
  else if (gt) gt = '3';
  
  if (!gt) errors.push("Thiếu Giới tính");
  else obj.GIOI_TINH = gt;

  const parseExcelDate = (val: any) => {
    let dateObj: Date | null = null;
    if (typeof val === 'number') {
       const utc_days  = Math.floor(val - 25569);
       const utc_value = utc_days * 86400;                                        
       const date_info = new Date(utc_value * 1000);
       const fractional_day = val - Math.floor(val) + 0.0000001;
       let total_seconds = Math.floor(86400 * fractional_day);
       const seconds = total_seconds % 60;
       total_seconds -= seconds;
       const hours = Math.floor(total_seconds / (60 * 60));
       const minutes = Math.floor(total_seconds / 60) % 60;
       dateObj = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    } else {
       const str = String(val).trim();
       let m = str.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})(?:\\s+(\\d{2}):(\\d{2}))?/);
       if (m) {
         dateObj = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]||0), Number(m[5]||0));
       } else {
         m = str.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:\\s+(\\d{2}):(\\d{2}))?/);
         if (m) {
           dateObj = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]||0), Number(m[5]||0));
         }
       }
    }
    return dateObj;
  };

  // Ngày vào, ngày ra: yyyymmddhhmm
  const fixDate12 = (val: any, fieldName: string) => {
    if (!val) return;
    const str = String(val).trim();
    if (/^\\d{12}$/.test(str)) {
      obj[fieldName] = str;
      return;
    }
    const dateObj = parseExcelDate(val);
    if (dateObj && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      obj[fieldName] = \`\${yyyy}\${mm}\${dd}\${hh}\${min}\`;
    } else {
      errors.push(\`Định dạng \${fieldName} không hợp lệ (Cần yyyymmddhhmm)\`);
    }
  };

  // Ngày sinh, Ngày cấp: yyyymmdd
  const fixDate8 = (val: any, fieldName: string) => {
    if (!val) return;
    const str = String(val).trim();
    if (/^\\d{8}$/.test(str)) {
      obj[fieldName] = str;
      return;
    }
    const dateObj = parseExcelDate(val);
    if (dateObj && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      obj[fieldName] = \`\${yyyy}\${mm}\${dd}\`;
    } else {
      errors.push(\`Định dạng \${fieldName} không hợp lệ (Cần yyyymmdd)\`);
    }
  };

  if (obj.NGAY_VAO) fixDate12(obj.NGAY_VAO, 'NGAY_VAO');
  if (obj.NGAY_RA) fixDate12(obj.NGAY_RA, 'NGAY_RA');
  
  if (obj.NGAY_SINH) fixDate8(obj.NGAY_SINH, 'NGAY_SINH');
  if (obj.NGAYCAP_CCCD) fixDate8(obj.NGAYCAP_CCCD, 'NGAYCAP_CCCD');

  // Thẻ nhận diện
  const the = String(obj.MA_THE_BHYT || obj.MA_THE || '').trim();
  if (the && the.length !== 15 && the.length !== 17) {
    errors.push("Mã thẻ nhận diện phải 15 hoặc 17 ký tự");
  }

  return errors;
}`;

content = content.replace(/function validateAndFixRecord\([\s\S]*?return errors;\n\}/, newValidateFunc);

fs.writeFileSync('src/components/KhamSucKhoe.tsx', content, 'utf8');
