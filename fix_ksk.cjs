const fs = require('fs');

let content = fs.readFileSync('src/components/KhamSucKhoe.tsx', 'utf8');

// 1. Add validateAndFixRecord function
const validateFunc = `
function validateAndFixRecord(obj: any) {
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

  // Ngày vào, ngày ra: yyyymmddhhmm
  const fixDate = (val: any, fieldName: string) => {
    if (!val) {
      // errors.push(\`Thiếu \${fieldName}\`); // Some fields might be optional, but usually NGAY_VAO is needed
      return;
    }
    const str = String(val).trim();
    if (/^\\d{12}$/.test(str)) {
      obj[fieldName] = str;
      return;
    }

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
       let m = str.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s+(\\d{2}):(\\d{2})/);
       if (m) {
         dateObj = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]), Number(m[5]));
       } else {
         m = str.match(/^(\\d{4})-(\\d{2})-(\\d{2})\\s+(\\d{2}):(\\d{2})/);
         if (m) {
           dateObj = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]));
         }
       }
    }

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

  if (obj.NGAY_VAO) fixDate(obj.NGAY_VAO, 'NGAY_VAO');
  if (obj.NGAY_RA) fixDate(obj.NGAY_RA, 'NGAY_RA');

  // Thẻ nhận diện
  const the = String(obj.MA_THE_BHYT || obj.MA_THE || '').trim();
  if (the && the.length !== 15 && the.length !== 17) {
    errors.push("Mã thẻ nhận diện phải 15 hoặc 17 ký tự");
  }

  return errors;
}
`;

content = content.replace(/export default function KhamSucKhoe[\s\S]*?\{/, (match) => validateFunc + "\n" + match);

// 2. Replace handleFileUpload to pass templateType
content = content.replace(/const handleFileUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{/, "const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, templateLabel: string) => {");

// 3. In handleFileUpload, update object building to include validation
content = content.replace(/keys\.forEach\(\(k: string, i: number\) => \{\s*if \(k\) obj\[k\] = row\[i\];\s*\}\);/, `keys.forEach((k: string, i: number) => {
              if (k) obj[k] = row[i];
            });
            const errors = validateAndFixRecord(obj);`);

content = content.replace(/trangThai: 'UNSIGNED',/g, `trangThai: 'UNSIGNED',
              kskErrors: errors,`);
content = content.replace(/displayFields: \{[^}]*\}/, `displayFields: {
                khoaPrimary: '', khoaSecondary: '', chanDoanPrimary: '', chanDoanSecondary: '', nguoiKyPrimary: '', nguoiKySecondary: ''
              }`);

// 4. Update the Upload UI
const oldUploadUI = `<label className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all">
              <FileUp className="w-10 h-10 mb-3" />
              <span className="font-semibold">Chọn file Excel Khám sức khỏe</span>
              <span className="text-xs mt-1 text-slate-400">Hỗ trợ các mẫu Trên 18, 6-18, Dưới 6</span>
              <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={handleFileUpload} />
            </label>`;

const newUploadUI = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Trên 18', 'Từ 6-18', 'Dưới 6'].map((label, idx) => (
                <label key={idx} className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all text-center">
                  <FileUp className="w-8 h-8 mb-3" />
                  <span className="font-semibold text-sm">Mẫu {label}</span>
                  <span className="text-xs mt-1 text-slate-400">Chọn file .xlsm</span>
                  <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, label)} />
                </label>
              ))}
            </div>`;
content = content.replace(oldUploadUI, newUploadUI);

// 5. Update Toolbar in Preview
const oldToolbar = `<div className="flex gap-2">
                <button
                  onClick={handleExportXML}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Xuất XML
                </button>
                <button
                  onClick={() => setKySoMode('sign')}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Ký số Token/SmartCA
                </button>
                <button
                  onClick={() => {
                    if (!config?.apiUrl || !config?.privateKey) {
                      alert('Vui lòng Cấu hình API EMRHUB (URL và Private Key) trước khi đẩy.');
                      setIsConfigOpen(true);
                      return;
                    }
                    alert('Chức năng đẩy trực tiếp lên EMRHUB đang hoàn thiện. Hiện tại bạn có thể xuất XML đã ký để xử lý.');
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Đẩy lên Cổng EMRHUB
                </button>
              </div>`;

const newToolbar = `<div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRecords([])}
                  className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-sm hover:bg-rose-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa danh sách
                </button>
                <button
                  onClick={handleExportXML}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Xuất XML
                </button>
                <button
                  onClick={() => setKySoMode('sign')}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Ký số Token/SmartCA
                </button>
                <button
                  onClick={() => {
                    if (!config?.apiUrl || !config?.privateKey) {
                      alert('Vui lòng Cấu hình API EMRHUB (URL và Private Key) trước khi đẩy.');
                      setIsConfigOpen(true);
                      return;
                    }
                    alert('Chức năng đẩy trực tiếp lên EMRHUB đang hoàn thiện. Hiện tại bạn có thể xuất XML đã ký để xử lý.');
                  }}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Đẩy lên EMRHUB
                </button>
              </div>`;
content = content.replace(oldToolbar, newToolbar);

// 6. Update Table columns
const oldTableHead = `<th className="p-3 border-b border-r font-semibold">Ngày sinh</th>
                    <th className="p-3 border-b font-semibold">Giới tính</th>`;
const newTableHead = `<th className="p-3 border-b border-r font-semibold">Ngày sinh</th>
                    <th className="p-3 border-b border-r font-semibold">Giới tính</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày vào</th>
                    <th className="p-3 border-b border-r font-semibold">Ngày ra</th>
                    <th className="p-3 border-b font-semibold w-48">Lỗi & Thông báo</th>`;
content = content.replace(oldTableHead, newTableHead);

const oldTableBody = `<td className="p-3 border-b border-r">{r.rawData.NGAY_SINH}</td>
                      <td className="p-3 border-b">{r.rawData.GIOI_TINH}</td>`;
const newTableBody = `<td className="p-3 border-b border-r">{r.rawData.NGAY_SINH}</td>
                      <td className="p-3 border-b border-r text-center">{r.rawData.GIOI_TINH === '1' ? 'Nam' : r.rawData.GIOI_TINH === '2' ? 'Nữ' : r.rawData.GIOI_TINH}</td>
                      <td className="p-3 border-b border-r font-mono text-xs">{r.rawData.NGAY_VAO}</td>
                      <td className="p-3 border-b border-r font-mono text-xs">{r.rawData.NGAY_RA}</td>
                      <td className="p-3 border-b text-xs">
                        {(r as any).kskErrors && (r as any).kskErrors.length > 0 ? (
                          <div className="flex flex-col gap-1 text-rose-600 font-medium">
                            {(r as any).kskErrors.map((err: string, eIdx: number) => (
                              <div key={eIdx} className="flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0"/> {err}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hợp lệ</span>
                        )}
                        {r.errorMessage && <div className="text-rose-600 font-bold mt-1">Lỗi: {r.errorMessage}</div>}
                        {r.trangThai === 'SUBMITTED' && <div className="text-emerald-600 font-bold mt-1">Đã đẩy EMRHUB</div>}
                      </td>`;
content = content.replace(oldTableBody, newTableBody);

const oldClass = 'className={cn("hover:bg-slate-50 cursor-pointer", selectedIds.has(r.id) && "bg-emerald-50/50")}';
const newClass = 'className={cn("hover:bg-slate-50 cursor-pointer", selectedIds.has(r.id) && "bg-emerald-50/50", (r as any).kskErrors?.length > 0 && "bg-rose-50/30")}';
content = content.replace(oldClass, newClass);

fs.writeFileSync('src/components/KhamSucKhoe.tsx', content, 'utf8');
