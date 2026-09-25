import React, { useState } from 'react';
import { 
  X, 
  FileCode2, 
  CheckCircle2, 
  FileSpreadsheet, 
  Save, 
  Send,
  User,
  Activity,
  Stethoscope,
  PenTool,
  Clock,
  Baby,
  CalendarDays,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TaoHoSoModalProps {
  onClose: () => void;
}

type DocType = 'CT03' | 'CT04' | 'CT05' | 'CT06' | 'CT07';

export default function TaoHoSoModal({ onClose }: TaoHoSoModalProps) {
  const [activeTab, setActiveTab] = useState<DocType>('CT03');

  const tabs = [
    { id: 'CT03', name: 'CT03 - Giấy ra viện' },
    { id: 'CT04', name: 'CT04 - Tóm tắt HSBA' },
    { id: 'CT05', name: 'CT05 - Giấy chứng sinh' },
    { id: 'CT06', name: 'CT06 - Nghỉ dưỡng thai' },
    { id: 'CT07', name: 'CT07 - Nghỉ việc hưởng BHXH' },
  ];

  const renderSectionHeader = (icon: React.ReactNode, title: string, badge?: string) => (
    <div className="flex items-center justify-between mb-4 mt-2">
      <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {badge && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase">{badge}</span>}
    </div>
  );

  const renderInput = (label: string, placeholder?: string, required = false, type = 'text', span = 1, extra?: string) => (
    <div className={`col-span-${span}`}>
      <div className="flex justify-between items-end mb-1">
        <label className="block text-xs font-bold text-slate-600">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {extra && <span className="text-[10px] text-slate-400">{extra}</span>}
      </div>
      {type === 'select' ? (
        <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
          <option>{placeholder}</option>
          {/* Options will be added later */}
        </select>
      ) : (
        <div className="relative">
          <input 
            type={type} 
            placeholder={placeholder} 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
          {(label.includes('Ngày') || label.includes('Thời gian')) && type !== 'date' && (
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
        </div>
      )}
    </div>
  );

  const renderCT03 = () => (
    <div className="space-y-6">
      <div className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl">
        {renderSectionHeader(<User className="w-4 h-4" />, "1. ĐỊNH DANH & THÔNG TIN BỆNH NHÂN (CT03)", "CHUẨN THEO MẪU TEMPLATE CT03")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Mã số BHXH', '', true)}
          {renderInput('Mã thẻ BHYT (15 ký tự)', 'DN2484920647034')}
          {renderInput('Họ và tên', 'NGUYỄN VĂN A', true)}
          {renderInput('Ngày sinh', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          
          {renderInput('Giới tính', '1 - Nam', true, 'select')}
          {renderInput('Số CCCD (12 số)', '049054001928', true)}
          {renderInput('Ngày cấp CCCD', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Nơi cấp CCCD', 'Cục CSQLHC...')}
          
          {renderInput('Loại giấy tờ', '1 - CCCD', false, 'select')}
          {renderInput('Số lưu trữ (nếu có)', 'LT-2026/01')}
          {renderInput('Mã y tế', 'YT-00123')}
          {renderInput('Dân tộc', '01 - Kinh', false, 'select')}
          
          {renderInput('Nghề nghiệp', 'Công nhân...')}
          {renderInput('Địa chỉ', 'Thôn/Tổ, Xã/Phường...', false, 'text', 2)}
          
          {renderInput('Họ tên cha (trẻ em)', 'Họ tên cha...')}
          {renderInput('Họ tên mẹ (trẻ em)', 'Họ tên mẹ...')}
          {renderInput('Trẻ em không thẻ (TEKT)', '0 - Không', false, 'select')}
          {renderInput('Đơn vị làm việc', 'Công ty / Đơn vị...', false, 'text', 2)}
        </div>
      </div>

      <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-xl">
        {renderSectionHeader(<Activity className="w-4 h-4 text-emerald-600" />, "2. ĐIỀU TRỊ & RA VIỆN (CT03)", "CHUẨN THEO MẪU TEMPLATE CT03")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Mã khoa', 'K0318, K01...', true)}
          {renderInput('Ngày vào', 'dd/mm/yyyy HH:mm', true, 'text', 1, 'dd/mm/yyyy HH:mm')}
          {renderInput('Ngày ra', 'dd/mm/yyyy HH:mm', true, 'text', 1, 'dd/mm/yyyy HH:mm')}
          {renderInput('Đình chỉ thai nghén', 'Không', false, 'select')}
          
          {renderInput('Tuổi thai (tuần)', 'Số tuần thai...')}
          {renderInput('Ngoại trú từ ngày', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Ngoại trú đến ngày', 'dd/mm/yyyy', false, 'text', 2, 'dd/mm/yyyy')}
        </div>
      </div>

      <div className="p-5 border border-purple-100 bg-purple-50/30 rounded-xl">
        {renderSectionHeader(<Stethoscope className="w-4 h-4 text-purple-600" />, "3. CHẨN ĐOÁN & PHƯƠNG PHÁP ĐIỀU TRỊ (CT03)")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Mã bệnh ICD-10', 'J18.9, G45.9...', true)}
          {renderInput('Chẩn đoán bệnh', 'Mô tả chẩn đoán xác định...', true, 'text', 3)}
          {renderInput('Phương pháp điều trị', 'Nội khoa, phẫu thuật...', false, 'text', 2)}
          {renderInput('Ghi chú', 'Uống thuốc theo toa...', false, 'text', 2)}
        </div>
      </div>

      <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl">
        {renderSectionHeader(<PenTool className="w-4 h-4 text-blue-600" />, "4. TRƯỞNG KHOA & KÝ DUYỆT (CT03)", "CHUẨN THEO MẪU TEMPLATE CT03")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Tên trưởng khoa', 'BS. Trịnh Minh Dũng')}
          {renderInput('Mã CCHN trưởng khoa', '004273/QNA-CCHN')}
          {renderInput('Thủ trưởng đơn vị', 'Trần Đỗ Nhân', true)}
          {renderInput('Ngày cấp chứng từ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
        </div>
      </div>
    </div>
  );

  const renderCT04 = () => (
    <div className="space-y-6">
      <div className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl">
        {renderSectionHeader(<User className="w-4 h-4" />, "1. ĐỊNH DANH & BỆNH NHÂN (CT04)", "MẪU TEMPLATE CT04")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Mã CT', 'CT04')}
          {renderInput('Số Seri', 'BA-0012', true)}
          {renderInput('Mã số BHXH', '4920647034', true)}
          {renderInput('Mã thẻ BHYT (15 ký tự)', 'DN2484920647034')}
          
          {renderInput('Họ và tên', 'NGUYỄN VĂN A', true)}
          {renderInput('Ngày sinh', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Giới tính', '1 - Nam', true, 'select')}
          {renderInput('Dân tộc', '01 - Kinh', false, 'select')}
          
          {renderInput('Tên đơn vị công tác', 'Công ty TNHH ABC')}
          {renderInput('Người đại diện', 'Họ tên người đại diện')}
          {renderInput('Ngày chứng từ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          
          {renderInput('Họ tên cha (trẻ < 6 tuổi)', 'Họ tên cha', false, 'text', 2)}
          {renderInput('Họ tên mẹ (trẻ < 6 tuổi)', 'Họ tên mẹ', false, 'text', 2)}
        </div>
      </div>

      <div className="p-5 border border-purple-100 bg-purple-50/30 rounded-xl">
        {renderSectionHeader(<Activity className="w-4 h-4 text-purple-600" />, "2. THỜI GIAN & QUÁ TRÌNH ĐIỀU TRỊ (CT04)")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Ngày vào viện', 'dd/mm/yyyy HH:mm', true, 'text', 1, 'dd/mm/yyyy HH:mm')}
          {renderInput('Ngày ra viện', 'dd/mm/yyyy HH:mm', true, 'text', 1, 'dd/mm/yyyy HH:mm')}
          {renderInput('Chẩn đoán khi vào viện', 'Viêm phế quản cấp...')}
          {renderInput('Chẩn đoán khi ra viện', 'Viêm phế quản cấp...', true)}
          
          {renderInput('Quá trình bệnh lý & Diễn biến', 'Tóm tắt quá trình...', false, 'text', 1)}
          {renderInput('Tóm tắt kết quả cận lâm sàng', 'Kết quả xét nghiệm...', false, 'text', 2)}
          {renderInput('Phương pháp điều trị', 'Kháng sinh, hạ sốt...')}
        </div>
      </div>

      <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl">
        {renderSectionHeader(<Baby className="w-4 h-4 text-blue-600" />, "3. THÔNG TIN SINH / CON & TÌNH TRẠNG RA VIỆN (CT04)")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Ngày sinh con', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Ngày chết con', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Số con chết', '0')}
          {renderInput('Tình trạng ra viện', 'Khỏi / Đỡ / Giảm...')}
          {renderInput('TEKT (Trẻ em không thẻ)', '0 - Không', false, 'select')}
        </div>
      </div>
    </div>
  );

  const renderCT05 = () => (
    <div className="space-y-6">
      <div className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl">
        {renderSectionHeader(<User className="w-4 h-4" />, "1. THÔNG TIN NGƯỜI MẸ / NGƯỜI NUÔI DƯỠNG (CT05)", "MẪU TEMPLATE CT05")}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {renderInput('Mã CT', 'CT05')}
          {renderInput('Số Seri', 'CS-0001', true)}
          {renderInput('Mã BHXH mẹ', '4920647034', true)}
          {renderInput('Mã thẻ BHYT mẹ', 'DN2484920647034')}
          {renderInput('Họ tên mẹ / Người nuôi', 'NGUYỄN THỊ B', true)}
          
          {renderInput('Ngày sinh mẹ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Dân tộc mẹ', '01 - Kinh', false, 'select')}
          {renderInput('Số CMND/CCCD', '049054001928')}
          {renderInput('Ngày cấp CMND/CCCD', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Nơi cấp CMND/CCCD', 'Cục CSQLHC...')}
          
          {renderInput('Nơi ĐK thường trú người mẹ', 'Xã/Phường, Huyện/Quận...', false, 'text', 5)}
        </div>
        
        <div className="mt-4 p-4 bg-white/50 rounded-lg border border-indigo-100">
          <div className="text-xs font-bold text-indigo-800 mb-2">Thông tin người cha (Liên thông Đề án 06) <span className="font-normal italic text-slate-500">(Nếu có tên cha, bắt buộc đủ ngày sinh, dân tộc, CCCD. Nếu chưa xác định cha, để trống)</span></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {renderInput('Họ tên cha', 'NGUYỄN VĂN A')}
            {renderInput('Ngày sinh cha', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
            {renderInput('Dân tộc cha', '01 - Kinh', false, 'select')}
            {renderInput('Loại giấy tờ', '1 - CCCD', false, 'select')}
            {renderInput('Số CCCD cha', '049088001234')}
            {renderInput('Ngày cấp CCCD cha', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          </div>
        </div>
      </div>

      <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-xl">
        {renderSectionHeader(<Baby className="w-4 h-4 text-emerald-600" />, "2. THÔNG TIN CON (CT05)")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Tên con (dự kiến)', 'Bé trai / Bé gái / Họ tên...', true)}
          {renderInput('Giới tính con', '1 - Nam', false, 'select')}
          {renderInput('Số con trong lần sinh', '1')}
          {renderInput('Cân nặng con (gram)', '3200')}
          
          {renderInput('Ngày sinh con', 'dd/mm/yyyy HH:mm', true, 'text', 1, 'dd/mm/yyyy HH:mm')}
          {renderInput('Tình trạng con', 'Khỏe mạnh, khóc to...')}
          {renderInput('Sinh con phẫu thuật', '0 - Sinh thường', false, 'select')}
          {renderInput('Sinh con dưới 32 tuần', '0 - Đủ tháng / ≥ 32 tuần', false, 'select')}
        </div>
      </div>

      <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl">
        {renderSectionHeader(<PenTool className="w-4 h-4 text-blue-600" />, "3. CÁN BỘ Y TẾ & KÝ DUYỆT (CT05)")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Người đỡ đẻ', 'Họ tên người đỡ đẻ')}
          {renderInput('Người ghi phiếu', 'Họ tên người ghi phiếu')}
          {renderInput('Thủ trưởng đơn vị', 'Giám đốc BV / Trưởng trạm', true)}
          {renderInput('Ngày cấp chứng từ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Ghi chú', 'Ghi chú thêm...', false, 'text', 4)}
        </div>
      </div>
    </div>
  );

  const renderCT06 = () => (
    <div className="space-y-6">
      <div className="p-5 border border-fuchsia-100 bg-fuchsia-50/30 rounded-xl">
        {renderSectionHeader(<User className="w-4 h-4 text-fuchsia-600" />, "1. ĐỊNH DANH & BỆNH NHÂN (CT06)", "MẪU TEMPLATE CT06")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Mã CT', 'CT06')}
          {renderInput('Số Seri', 'DT-0012', true)}
          {renderInput('Mã số BHXH', '4920647034', true)}
          {renderInput('Mã thẻ BHYT (15 ký tự)', 'DN2484920647034')}
          
          {renderInput('Họ và tên', 'NGUYỄN THỊ D', true)}
          {renderInput('Ngày sinh', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Tên đơn vị công tác', 'Công ty CP...')}
          {renderInput('Số KCB', '12345/KCB')}
          {renderInput('Người đại diện', 'Đại diện người bệnh')}
        </div>
      </div>

      <div className="p-5 border border-fuchsia-200 bg-fuchsia-50/50 rounded-xl">
        {renderSectionHeader(<CalendarDays className="w-4 h-4 text-fuchsia-700" />, "2. THỜI GIAN NGHỈ DƯỠNG THAI & CHẨN ĐOÁN (CT06)")}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Nghỉ từ ngày', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Nghỉ đến ngày', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Chẩn đoán tình trạng thai', 'Dọa sảy thai, nhau tiền đạo...', true)}
        </div>
      </div>

      <div className="p-5 border border-fuchsia-100 bg-fuchsia-50/30 rounded-xl">
        {renderSectionHeader(<PenTool className="w-4 h-4 text-fuchsia-600" />, "3. BÁC SĨ ĐIỀU TRỊ & KÝ DUYỆT (CT06)")}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Mã Bác sĩ', 'BS01')}
          {renderInput('Tên Bác sĩ điều trị', 'BS. Nguyễn Thị E')}
          {renderInput('Ngày cấp chứng từ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
        </div>
      </div>
    </div>
  );

  const renderCT07 = () => (
    <div className="space-y-6">
      <div className="p-5 border border-amber-100 bg-amber-50/30 rounded-xl">
        {renderSectionHeader(<Activity className="w-4 h-4 text-amber-600" />, "1. THẺ & ĐỊNH DANH KHÁM CHỮA BỆNH (CT07)", "CHUẨN THEO MẪU TEMPLATE CT07")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Số Seri', '9933', true)}
          {renderInput('Số KCB', '70735/KCB')}
          {renderInput('Ngày KCB', 'dd/mm/yyyy', false, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Mã số BHXH', '4920709770', true)}
          {renderInput('Mã thẻ BHYT (15 ký tự)', 'DN2484920709770')}
        </div>
      </div>

      <div className="p-5 border border-orange-100 bg-orange-50/30 rounded-xl">
        {renderSectionHeader(<User className="w-4 h-4 text-orange-600" />, "2. THÔNG TIN NGƯỜI LAO ĐỘNG (CT07)", "CHUẨN THEO MẪU TEMPLATE CT07")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Họ và tên', 'NGUYỄN THỊ XUÂN', true)}
          {renderInput('Ngày sinh', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Giới tính', '2 - Nữ', true, 'select')}
          {renderInput('Đơn vị làm việc', 'Công ty TNHH...')}
          {renderInput('Địa chỉ / Nơi cư trú', 'Thôn/Xã/Huyện...')}
          
          {renderInput('Số CCCD (12 số)', '049181005953', true)}
          {renderInput('Ngày cấp CCCD', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
          {renderInput('Nơi cấp CCCD', 'Cục Cảnh sát QLHC...', true)}
          {renderInput('Loại giấy tờ', '1 - CCCD', true, 'select')}
        </div>

        <div className="mt-4 p-4 bg-white/50 rounded-lg border border-orange-100">
          <div className="text-xs font-bold text-orange-800 mb-2">Thông tin Cha / Mẹ chăm sóc trẻ <span className="font-normal italic text-slate-500">(Con ốm cha/mẹ nghỉ hưởng BHXH: bắt buộc Họ tên kèm ngày tháng năm sinh của Cha HOẶC Mẹ)</span></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Họ tên cha (< 7 tuổi)', 'VD: NGUYỄN VĂN A (01/01/1990)...')}
            {renderInput('Họ tên mẹ (< 7 tuổi)', 'VD: NGUYỄN THỊ PHÚC (26/02/1995)...')}
            {renderInput('Trẻ em không thẻ (TEKT)', '0 - Không', false, 'select')}
          </div>
        </div>
      </div>

      <div className="p-5 border border-emerald-100 bg-emerald-50/30 rounded-xl">
        {renderSectionHeader(<Stethoscope className="w-4 h-4 text-emerald-600" />, "3. KHÁM CHỮA BỆNH & NGHỈ HƯỞNG BHXH (CT07)", "CHUẨN THEO MẪU TEMPLATE CT07")}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Mã bệnh ICD-10', 'M13.90, M54.5', true, 'text', 1)}
          {renderInput('Chẩn đoán và phương pháp điều trị', 'Mô tả chẩn đoán lâm sàng...', true, 'text', 2)}
          
          <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm">
            {renderInput('Nghỉ từ ngày', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
            {renderInput('Nghỉ đến ngày', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
            <div className="col-span-1">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold text-slate-600">Số ngày nghỉ</label>
                <span className="text-[10px] text-amber-500 font-bold">tham khảo</span>
              </div>
              <div className="w-full px-3 py-2 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-700 font-bold outline-none">
                -- ngày
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Được tính: Đến ngày - Từ ngày + 1</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl">
        {renderSectionHeader(<PenTool className="w-4 h-4 text-blue-600" />, "4. NGƯỜI HÀNH NGHỀ & KÝ DUYỆT (CT07)", "CHUẨN THEO MẪU TEMPLATE CT07")}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {renderInput('Tên người hành nghề', 'Phan Văn Phụng', true)}
          {renderInput('Mã CCHN', '000581/QNA-CCHN', true)}
          {renderInput('Thủ trưởng đơn vị', 'Trần Đỗ Nhân', true)}
          {renderInput('Ngày cấp chứng từ', 'dd/mm/yyyy', true, 'text', 1, 'dd/mm/yyyy')}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">Tạo Hồ Sơ Chứng Từ Liên Thông BHXH / TT25</h2>
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Mẫu: {tabs.find(t => t.id === activeTab)?.name}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Đơn vị KCB: <strong className="text-blue-600">49006</strong> - Trung tâm Y tế khu vực Duy Xuyên
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600 mr-2">Chọn loại chứng từ:</span>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DocType)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {activeTab === tab.id && <CheckCircle2 className="w-4 h-4 inline-block mr-1 -mt-0.5" />}
                {tab.name}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition">
            <FileCode2 className="w-4 h-4 text-blue-500" />
            Nhúng XML
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'CT03' && renderCT03()}
          {activeTab === 'CT04' && renderCT04()}
          {activeTab === 'CT05' && renderCT05()}
          {activeTab === 'CT06' && renderCT06()}
          {activeTab === 'CT07' && renderCT07()}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Kiểm tra Rule TT25
            </button>
            <button className="px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 flex items-center gap-2">
              <FileCode2 className="w-4 h-4" /> Tạo & Xem XML
            </button>
            <button className="px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Xuất Excel mẫu ({activeTab})
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-2">
              <Save className="w-4 h-4" /> Lưu nháp
            </button>
            <button className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200">
              <Send className="w-4 h-4 -rotate-45 -mt-1" /> Ký & Gửi Cổng BHXH
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
