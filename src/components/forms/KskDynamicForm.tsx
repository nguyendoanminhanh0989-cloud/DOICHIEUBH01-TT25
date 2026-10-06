import React, { useState, useMemo } from 'react';
import { Upload, Save, PenTool, Printer, X, FileUp, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { KskType, KSK_SCHEMAS, KskField } from '../../lib/kskSchemas';

interface KskDynamicFormProps {
  type: KskType;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

export default function KskDynamicForm({ type, onClose, onSave, initialData = {} }: KskDynamicFormProps) {
  const schema = KSK_SCHEMAS[type];
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<any>(initialData);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderField = (field: KskField) => {
    const val = formData[field.key] ?? '';
    const labelText = field.required ? `${field.label} *` : field.label;

    return (
      <div key={field.key} className={`col-span-12 md:col-span-${field.span || 12}`}>
        <label className="block text-sm font-bold text-slate-700 mb-1 h-5">
          {(!field.hideLabel || field.label.trim()) ? labelText : '\u00A0'}
        </label>
        
        {field.kind === 'text' && (
          <input
            type="text"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder={field.placeholder}
            value={val}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}
        
        {field.kind === 'textarea' && (
          <textarea
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder={field.placeholder}
            value={val}
            rows={3}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}
        
        {field.kind === 'date' && (
          <input
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={val}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}
        
        {field.kind === 'datetime' && (
          <input
            type="datetime-local"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={val}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )}
        
        {(field.kind === 'select' || field.kind === 'phanloai') && (
          <select
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={val}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          >
            <option value="">-- Chọn --</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {field.kind === 'yesno' && (
          <div className="flex items-center gap-4 mt-2">
            {field.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name={field.key} 
                  value={opt.value}
                  checked={val === opt.value}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className="w-4 h-4 text-emerald-600" 
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {field.kind === 'signature' && (
          <div 
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => handleInputChange(field.key, reader.result);
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="flex flex-col h-[38px] justify-center items-center border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer overflow-hidden relative group"
          >
            {val ? (
              <>
                <img src={val} alt="Chữ ký" className="h-full object-contain mix-blend-multiply" />
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                  <span className="text-xs text-white">Đổi ảnh</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 hover:text-emerald-600">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-medium">Tải Ảnh chữ ký</span>
              </div>
            )}
          </div>
        )}
        
        {field.hint && <p className="text-xs text-slate-500 mt-1">{field.hint}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col h-screen overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-slate-700">Loại phiếu khám</label>
          <div className="border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-2 bg-slate-50 text-slate-700 min-w-[300px] font-bold">
             {schema.title}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            <Save className="w-4 h-4" /> Lưu thông tin
          </button>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium ml-2"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center overflow-x-auto">
        {schema.tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(idx)}
            className={cn(
              "px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors",
              activeTab === idx 
                ? "border-emerald-600 text-emerald-600" 
                : "border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-[1200px] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
          {schema.tabs[activeTab].special === 'cls' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-600 mb-4">D. Kết quả khám Cận lâm sàng khác</h3>
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-700">103. Có khám cận lâm sàng khác không?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={formData.HAS_CLS !== '1'} onChange={() => handleInputChange('HAS_CLS', '0')} className="w-4 h-4 text-blue-600" />
                        <span>Không</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={formData.HAS_CLS === '1'} onChange={() => handleInputChange('HAS_CLS', '1')} className="w-4 h-4 text-blue-600" />
                        <span>Có</span>
                      </label>
                    </div>
                  </div>
                </div>
                {formData.HAS_CLS === '1' && (
                  <div className="w-[250px]">
                    {renderField({ key: 'CKDT_CLS', label: 'Họ tên và chữ ký của Bác sĩ', kind: 'signature', span: 12 })}
                  </div>
                )}
              </div>

              {formData.HAS_CLS === '1' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border border-slate-200 p-4 rounded-lg bg-slate-50">
                    <span className="font-semibold text-blue-600">Khám sức khỏe định kỳ</span>
                    <button 
                      onClick={() => {
                        const newCls = [...(formData.CLS || []), { TEN_DICH_VU: '', GIA_TRI: '', DON_VI_DO: '' }];
                        handleInputChange('CLS', newCls);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white bg-white font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" /> Thêm dịch vụ
                    </button>
                  </div>

                  {Array.isArray(formData.CLS) && formData.CLS.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-medium w-12 text-center">STT</th>
                            <th className="px-4 py-3 font-medium">Tên dịch vụ</th>
                            <th className="px-4 py-3 font-medium w-48">Kết quả (GIA_TRI)</th>
                            <th className="px-4 py-3 font-medium w-24">Đơn vị đo</th>
                            <th className="px-4 py-3 font-medium w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.CLS.map((item: any, idx: number) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="text" 
                                    placeholder="Nhập tên dịch vụ..."
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm font-medium text-blue-600 placeholder:font-normal placeholder:text-slate-400"
                                    value={item.TEN_DICH_VU || item.MA_DICH_VU || ''}
                                    onChange={e => {
                                      const newCls = [...formData.CLS];
                                      newCls[idx].TEN_DICH_VU = e.target.value;
                                      newCls[idx].MA_DICH_VU = e.target.value; // Store as MA_DICH_VU for XML mapping compatibility
                                      handleInputChange('CLS', newCls);
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="text" 
                                    placeholder="Nhập kết quả..."
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                    value={item.GIA_TRI || ''}
                                    onChange={e => {
                                      const newCls = [...formData.CLS];
                                      newCls[idx].GIA_TRI = e.target.value;
                                      handleInputChange('CLS', newCls);
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input 
                                    type="text" 
                                    placeholder="Đơn vị..."
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                    value={item.DON_VI_DO || ''}
                                    onChange={e => {
                                      const newCls = [...formData.CLS];
                                      newCls[idx].DON_VI_DO = e.target.value;
                                      handleInputChange('CLS', newCls);
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button 
                                    onClick={() => {
                                      const newCls = formData.CLS.filter((_: any, i: number) => i !== idx);
                                      handleInputChange('CLS', newCls);
                                    }}
                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {schema.tabs[activeTab].sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-4">
                  {section.title && (
                    <h3 className="text-emerald-700 font-bold bg-emerald-50/80 px-4 py-2.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                      {section.title}
                    </h3>
                  )}
                  <div className="grid grid-cols-12 gap-x-6 gap-y-5 px-1">
                    {section.fields.map(renderField)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
