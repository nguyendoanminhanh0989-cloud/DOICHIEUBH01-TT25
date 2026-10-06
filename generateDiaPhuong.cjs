const fs = require('fs');
const XLSX = require('xlsx');

const wb = XLSX.readFile('TAILIEU/kham suc khoe/MA_DIA_PHUONG.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

const provinces = {};
const communesByProvince = {};

data.forEach(row => {
  if (!row.ma_tinh || !row.ma_xa) return;
  let ma_tinh = String(row.ma_tinh).padStart(2, '0');
  let ten_tinh = row.ten_tinh;
  let ma_xa = String(row.ma_xa).padStart(5, '0');
  let ten_xa = row.ten_xa;

  if (!provinces[ma_tinh]) {
    provinces[ma_tinh] = ten_tinh;
    communesByProvince[ma_tinh] = [];
  }
  communesByProvince[ma_tinh].push({ value: ma_xa, label: ten_xa });
});

const tsCode = `export const PROVINCES: Record<string, string> = ${JSON.stringify(provinces, null, 2)};

export const COMMUNES_BY_PROVINCE: Record<string, {value: string, label: string}[]> = ${JSON.stringify(communesByProvince, null, 2)};
`;

fs.writeFileSync('src/lib/diaPhuong.ts', tsCode);
