import React, { useState } from 'react';
import { Upload, Save, PenTool, Printer, X, FileUp } from 'lucide-react';
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
    const label = field.required ? `${field.label} *` : field.label;

    return (
      <div key={field.key} className={`col-span-12 md:col-span-${field.span || 12}`}>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <FileUp className="w-12 h-12 text-slate-300" />
              <p className="text-lg">Tính năng nhập Cận lâm sàng đang được cập nhật</p>
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
