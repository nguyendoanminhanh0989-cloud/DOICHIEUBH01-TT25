const fs = require('fs');

let content = fs.readFileSync('src/components/KhamSucKhoe.tsx', 'utf8');

const oldGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Trên 18', 'Từ 6-18', 'Dưới 6'].map((label, idx) => (
                <label key={idx} className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all text-center">
                  <FileUp className="w-8 h-8 mb-3" />
                  <span className="font-semibold text-sm">Mẫu {label}</span>
                  <span className="text-xs mt-1 text-slate-400">Chọn file .xlsm</span>
                  <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, label)} />
                </label>
              ))}
            </div>`;

const newGrid = `
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nhập file Khám sức khỏe (.xlsm)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Trên 18', file: 'Import_KSK_Tren 18.xlsm' },
                { label: 'Từ 6-18', file: 'Import_KSK_6 den Duoi 18.xlsm' },
                { label: 'Dưới 6', file: 'Import_KSK_Duoi 6.xlsm' }
              ].map((tpl, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all text-center flex-1">
                    <FileUp className="w-8 h-8 mb-3" />
                    <span className="font-semibold text-sm">Mẫu {tpl.label}</span>
                    <span className="text-xs mt-1 text-slate-400">Chọn file .xlsm</span>
                    <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, tpl.label)} />
                  </label>
                  <a href={\`/templates/\${tpl.file}\`} download className="flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                    <Download className="w-4 h-4" /> Tải mẫu gốc {tpl.label}
                  </a>
                </div>
              ))}
            </div>`;

content = content.replace(`<h2 className="text-xl font-bold mb-4">Nhập file Khám sức khỏe (.xlsm)</h2>\n            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">\n              {['Trên 18', 'Từ 6-18', 'Dưới 6'].map((label, idx) => (\n                <label key={idx} className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 hover:border-emerald-400 hover:text-emerald-600 transition-all text-center">\n                  <FileUp className="w-8 h-8 mb-3" />\n                  <span className="font-semibold text-sm">Mẫu {label}</span>\n                  <span className="text-xs mt-1 text-slate-400">Chọn file .xlsm</span>\n                  <input type="file" className="hidden" accept=".xlsx,.xlsm" onChange={(e) => handleFileUpload(e, label)} />\n                </label>\n              ))}\n            </div>`, newGrid);

fs.writeFileSync('src/components/KhamSucKhoe.tsx', content, 'utf8');
