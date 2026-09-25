const xlsx = require('xlsx');
const columns = [
  'STT', 'HO_TEN', 'NGAY_SINH', 'GIOI_TINH', 'MA_THE_BHYT', 'MA_BENH_CHINH',
  'NGAY_VAO', 'NGAY_VAO_NOI_TRU', 'NGAY_RA', 'SO_NGAY_DTRI', 'MA_LOAI_KCB',
  'T_TONGCHI_BV', 'T_TONGCHI_BH', 'T_BHTT', 'T_BNCCT', 'T_BNTT', 'T_NGUONKHAC',
  'MA_CSKCB', 'NAM_QT', 'THANG_QT'
];
const ws = xlsx.utils.aoa_to_sheet([columns]);
xlsx.utils.sheet_add_aoa(ws, [[
  '1', 'NGUYỄN VĂN A', '199001010000', '1', 'DN4010101010101', 'J20.9', 
  '202608011502', '', '202608011524', '0', '01', 
  '194900', '194900', '194900', '0', '0', '0', '48225', '2026', '8'
]], { origin: -1 });
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const outPath = 'public/templates/Template_01BH_Mau_Chuan_BHXH.xlsx';
xlsx.writeFile(wb, outPath);
console.log('Template created at:', outPath);
