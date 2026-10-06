/**
 * SCHEMA 3 MẪU KHÁM SỨC KHỎE (KSK)
 * -------------------------------------------------------------------------
 * Là "nguồn sự thật" duy nhất cho:
 *   - Form nhập thủ công (KskFormShell render trực tiếp từ schema)
 *   - Chuẩn hóa dữ liệu (kskRecord.ts: ánh xạ tên -> mã theo options)
 * Key của mỗi trường TRÙNG với dòng khóa (row 2) của file Excel Import_KSK_*.xlsm
 * và với tên thẻ XML trong "sample xml (final).xml" => nhập thủ công, import
 * Excel và xuất XML dùng chung một bộ key, không cần ánh xạ trung gian.
 */

export type KskType = 'ChildUnder' | 'Minor' | 'Adult';

export type KskFieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'datetime'
  | 'select'
  | 'yesno'
  | 'phanloai'
  | 'signature';

export interface KskOption {
  value: string;
  label: string;
}

export interface KskField {
  key: string;
  label: string;
  kind: KskFieldKind;
  options?: KskOption[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  hideLabel?: boolean;
  /** Số cột chiếm trong lưới 12 cột */
  span?: 2 | 3 | 4 | 6 | 7 | 8 | 9 | 12;
}

export interface KskSection {
  title?: string;
  fields: KskField[];
}

export interface KskTab {
  id: string;
  label: string;
  sections: KskSection[];
  /** Tab đặc biệt: bảng nhập chỉ số cận lâm sàng */
  special?: 'cls';
}

export interface KskSchema {
  type: KskType;
  /** Tên sheet trong file Excel */
  sheetName: string;
  title: string;
  tabs: KskTab[];
}

/* ------------------------------ Danh mục ------------------------------ */

export const OPT_YESNO: KskOption[] = [
  { value: '0', label: 'Không' },
  { value: '1', label: 'Có' },
];

export const OPT_GIOI_TINH: KskOption[] = [
  { value: '1', label: 'Nam' },
  { value: '2', label: 'Nữ' },
  { value: '3', label: 'Khác' },
];

export const OPT_PHAN_LOAI: KskOption[] = [
  { value: '1', label: 'Loại I - Rất khỏe' },
  { value: '2', label: 'Loại II - Khỏe' },
  { value: '3', label: 'Loại III - Trung bình' },
  { value: '4', label: 'Loại IV - Yếu' },
  { value: '5', label: 'Loại V - Rất yếu' },
];

export const OPT_TIEM_CHUNG: KskOption[] = [
  { value: '0', label: 'Không được tiêm' },
  { value: '1', label: 'Được tiêm' },
  { value: '99', label: 'Không nhớ rõ' },
];

export const OPT_MOI_QUAN_HE: KskOption[] = [
  { value: '1', label: 'Cha' },
  { value: '2', label: 'Mẹ' },
  { value: '3', label: 'Ông/Bà' },
  { value: '4', label: 'Anh/Chị' },
  { value: '5', label: 'Họ hàng' },
  { value: '9', label: 'Khác' },
];

export const OPT_SAN_KHOA_KHONG_BT: KskOption[] = [
  { value: '1', label: 'Đẻ thiếu tháng' },
  { value: '2', label: 'Đẻ thừa cân' },
  { value: '3', label: 'Đẻ có can thiệp' },
  { value: '4', label: 'Đẻ ngạt' },
  { value: '5', label: 'Mẹ bị bệnh trong thời kỳ mang thai' },
];

export const OPT_DOI_TUONG: KskOption[] = [
  { value: '1', label: 'Người cao tuổi' },
  { value: '2', label: 'Người khuyết tật' },
  { value: '3', label: 'Người thuộc hộ nghèo, cận nghèo' },
  { value: '4', label: 'Người có công' },
  { value: '5', label: 'Người mắc bệnh mạn tính' },
  { value: '6', label: 'Người sống tại vùng đồng bào dân tộc thiểu số và miền núi' },
  { value: '7', label: 'Người sống tại vùng có điều kiện kinh tế - xã hội khó khăn, đặc biệt khó khăn' },
  { value: '8', label: 'Người sống tại xã đảo' },
  { value: '9', label: 'Người sống tại đặc khu' },
  { value: '10', label: 'Trẻ em trong cơ sở giáo dục mầm non' },
  { value: '11', label: 'Học sinh trong các cơ sở giáo dục phổ thông' },
  { value: '12', label: 'Sinh viên' },
  { value: '13', label: 'Người lao động' },
  { value: '14', label: 'Người lao động không chính thức' },
  { value: '15', label: 'Người chưa có Bảo hiểm y tế' },
  { value: '16', label: 'Các đối tượng khác' },
];

export const OPT_NGUON_CHI_TRA: KskOption[] = [
  { value: '1', label: 'Ngân sách trung ương' },
  { value: '2', label: 'Ngân sách địa phương' },
  { value: '3', label: 'Quỹ bảo hiểm y tế' },
  { value: '4', label: 'Người sử dụng lao động' },
  { value: '5', label: 'Xã hội hóa' },
  { value: '9', label: 'Chưa xác định' },
];

export const OPT_NGHE_NGHIEP: KskOption[] = [
  { value: '0', label: '0 - Lực lượng vũ trang' },
  { value: '01', label: '01 - Lực lượng quân đội' },
  { value: '02', label: '02 - Lực lượng công an' },
  { value: '03', label: '03 - Cơ yếu và lực lượng vũ trang khác' },
  { value: '1', label: '1 - Lãnh đạo, quản lý trong các ngành, các cấp và các đơn vị' },
  { value: '10', label: '10 - Lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp trung ương và địa phương (chuyên trách)' },
  { value: '11', label: '11 - Lãnh đạo, quản lý của Quốc hội, Văn phòng Quốc hội và Văn phòng Chủ tịch nước (chuyên trách)' },
  { value: '12', label: '12 - Lãnh đạo, quản lý của Chính phủ, Văn phòng Chính phủ, các bộ, ngành và tương đương thuộc Chính phủ (chuyên trách)' },
  { value: '13', label: '13 - Lãnh đạo, quản lý của Tòa án nhân dân và Viện Kiểm sát nhân dân (chuyên trách)' },
  { value: '14', label: '14 - Lãnh đạo, quản lý của Hội đồng nhân dân và Ủy ban nhân dân địa phương (kể cả các cơ quan chuyên môn ở địa phương, trừ tư pháp và đoàn thể) (chuyên trách)' },
  { value: '15', label: '15 - Lãnh đạo, quản lý khối đoàn thể; Mặt trận Tổ quốc, Liên đoàn Lao động, Hội Phụ nữ, Hội Nông dân, Đoàn Thanh niên Cộng sản Hồ Chí Minh, Hội Cựu chiến binh (chuyên trách)' },
  { value: '16', label: '16 - Nhà quản lý của Tổ chức nghiệp chủ, nhân đạo và vì quyền lợi đặc thù khác (chuyên trách)' },
  { value: '17', label: '17 - Nhà quản lý của các cơ quan tập đoàn, tổng công ty và tương đương (chuyên trách)' },
  { value: '2', label: '2 - Nhà chuyên môn bậc cao' },
  { value: '21', label: '21 - Nhà chuyên môn trong lĩnh vực khoa học và kỹ thuật' },
  { value: '22', label: '22 - Nhà chuyên môn về sức khỏe' },
  { value: '23', label: '23 - Nhà chuyên môn về giảng dạy' },
  { value: '24', label: '24 - Nhà chuyên môn về kinh doanh và quản lý' },
  { value: '25', label: '25 - Nhà chuyên môn trong lĩnh vực công nghệ thông tin và truyền thông' },
  { value: '26', label: '26 - Nhà chuyên môn về luật pháp, văn hóa, xã hội' },
  { value: '3', label: '3 - Nhà chuyên môn bậc trung' },
  { value: '31', label: '31 - Kỹ thuật viên khoa học và kỹ thuật' },
  { value: '32', label: '32 - Kỹ thuật viên sức khỏe' },
  { value: '33', label: '33 - Nhân viên về kinh doanh và quản lý' },
  { value: '34', label: '34 - Nhân viên luật pháp, văn hóa, xã hội' },
  { value: '35', label: '35 - Kỹ thuật viên thông tin và truyền thông' },
  { value: '36', label: '36 - Giáo viên bậc trung' },
  { value: '4', label: '4 - Nhân viên văn phòng' },
  { value: '41', label: '41 - Nhân viên tổng hợp và nhân viên làm các công việc bàn giấy' },
  { value: '42', label: '42 - Nhân viên dịch vụ khách hàng' },
  { value: '43', label: '43 - Nhân viên ghi chép số liệu và vật liệu' },
  { value: '44', label: '44 - Nhân viên hỗ trợ văn phòng khác' },
  { value: '5', label: '5 - Nhân viên dịch vụ và bán hàng' },
  { value: '51', label: '51 - Nhân viên dịch vụ cá nhân' },
  { value: '52', label: '52 - Nhân viên bán hàng' },
  { value: '53', label: '53 - Nhân viên chăm sóc cá nhân' },
  { value: '54', label: '54 - Nhân viên dịch vụ bảo vệ' },
  { value: '6', label: '6 - Lao động có kỹ năng trong nông nghiệp, lâm nghiệp và thủy sản' },
  { value: '61', label: '61 - Lao động có kỹ năng trong nông nghiệp có sản phẩm chủ yếu để bán' },
  { value: '62', label: '62 - Lao động có kỹ năng trong lâm nghiệp, thủy sản và sản phẩm có sản phẩm chủ yếu để bán' },
  { value: '63', label: '63 - Lao động tự cung tự cấp trong nông nghiệp, lâm nghiệp và thủy sản' },
  { value: '7', label: '7 - Lao động thủ công và các nghề có liên quan khác' },
  { value: '71', label: '71 - Lao động xây dựng và lao động có liên quan đến nghề xây dựng (trừ thợ điện)' },
  { value: '72', label: '72 - Thợ luyện kim, cơ khí và thợ có liên quan' },
  { value: '73', label: '73 - Thợ thủ công và thợ liên quan đến in' },
  { value: '74', label: '74 - Thợ điện và thợ điện tử' },
  { value: '75', label: '75 - Thợ chế biến thực phẩm, gia công gỗ, may mặc, đồ thủ công và thợ có liên quan khác' },
  { value: '8', label: '8 - Thợ lắp ráp và vận hành máy móc, thiết bị' },
  { value: '81', label: '81 - Thợ vận hành máy móc và thiết bị' },
  { value: '82', label: '82 - Thợ lắp ráp' },
  { value: '83', label: '83 - Lái xe và thợ vận hành thiết bị chuyên dụng' },
  { value: '9', label: '9 - Lao động giản đơn' },
  { value: '91', label: '91 - Người quét dọn và giúp việc' },
  { value: '92', label: '92 - Lao động giản đơn trong nông nghiệp, lâm nghiệp, lâm nghiệp và thủy sản' },
  { value: '93', label: '93 - Lao động giản đơn trong khai khoáng, xây dựng, công nghiệp chế biến, chế tạo và giao thông vận tải' },
  { value: '94', label: '94 - Người phụ giúp chuẩn bị thực phẩm' },
  { value: '95', label: '95 - Lao động trên đường phố và lao động có liên quan đến bán hàng' },
  { value: '96', label: '96 - Người thu dọn vật thải và lao động giản đơn khác' },
];

export const OPT_NHOM_MAU: KskOption[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
];

export const OPT_MA_LOAI_KCB: KskOption[] = [
  { value: '01', label: '01 - Khám bệnh' },
  { value: '02', label: '02 - Điều trị ngoại trú' },
  { value: '03', label: '03 - Điều trị nội trú' },
  { value: '04', label: '04 - Điều trị ban ngày' },
  { value: '05', label: '05 - Điều trị ngoại trú các bệnh cần chữa trị dài ngày có khám bệnh và lĩnh thuốc' },
  { value: '06', label: '06 - Lưu người bệnh tại phòng khám đa khoa, phòng khám đa khoa khu vực, nhà hộ sinh, trạm y tế xã, phường' },
  { value: '07', label: '07 - Nhận thuốc theo hẹn' },
  { value: '08', label: '08 - Điều trị ngoại trú các bệnh cần chữa trị dài ngày có khám bệnh, có thực hiện các dịch vụ kỹ thuật' },
  { value: '09', label: '09 - Điều trị nội trú dưới 04 giờ' },
  { value: '10', label: '10 - Các trường hợp khác' },
  { value: '11', label: '11 - Khám bệnh, chữa bệnh lưu động' },
  { value: '12', label: '12 - Khám bệnh, chữa bệnh tại nhà' },
  { value: '13', label: '13 - Khám bệnh, chữa bệnh y học gia đình' },
  { value: '14', label: '14 - Khám bệnh, chữa bệnh từ xa' },
  { value: '15', label: '15 - Khám sức khoẻ định kỳ' },
  { value: '16', label: '16 - Khám sàng lọc' },
  { value: '99', label: '99 - Kiểm tra sức khỏe học sinh' },
];

/* ------------------------------ Helpers ------------------------------ */

type Extra = Partial<Omit<KskField, 'key' | 'label' | 'kind'>>;

const t = (key: string, label: string, extra: Extra = {}): KskField => ({ key, label, kind: 'text', ...extra });
const ta = (key: string, label: string, extra: Extra = {}): KskField => ({ key, label, kind: 'textarea', span: 12, ...extra });
const d = (key: string, label: string, extra: Extra = {}): KskField => ({ key, label, kind: 'date', span: 4, ...extra });
const dt = (key: string, label: string, extra: Extra = {}): KskField => ({ key, label, kind: 'datetime', span: 4, ...extra });
const yn = (key: string, label: string, extra: Extra = {}): KskField => ({ key, label, kind: 'yesno', options: OPT_YESNO, span: 4, ...extra });
const sel = (key: string, label: string, options: KskOption[], extra: Extra = {}): KskField => ({
  key, label, kind: 'select', options, span: 4, ...extra,
});
const pl = (key: string, label = 'Phân loại', extra: Extra = {}): KskField => ({
  key, label, kind: 'phanloai', options: OPT_PHAN_LOAI, span: 4, ...extra,
});
const tc = (key: string, label: string): KskField => sel(key, label, OPT_TIEM_CHUNG);

/** Kết quả khám + phân loại + chữ ký */
const kq = (key: string, label: string, plKey?: string, sigKey?: string, isFirstSigInGroup = false): KskField[] => {
  const hasPl = !!plKey;
  const hasSig = !!sigKey;

  let textSpan: any = 12;
  let plSpan: any = 0;
  let sigSpan: any = 0;

  if (hasPl && hasSig) { textSpan = 6; plSpan = 3; sigSpan = 3; }
  else if (hasPl && !hasSig) { textSpan = 8; plSpan = 4; sigSpan = 0; }
  else if (!hasPl && hasSig) { textSpan = 9; plSpan = 0; sigSpan = 3; }

  const fields: KskField[] = [
    t(key, label, { span: textSpan, placeholder: 'Nhập kết quả khám' })
  ];

  if (hasPl) fields.push(pl(plKey!, 'Phân loại', { span: plSpan }));
  
  if (hasSig) {
    fields.push({ 
      key: sigKey!, 
      label: isFirstSigInGroup ? 'Họ tên và chữ ký Bác sĩ' : 'Chữ ký Bác sĩ', 
      kind: 'signature', 
      span: sigSpan 
    });
  }

  return fields;
};

/* ------------------------- Khối trường dùng chung ------------------------- */

const lanKham = (): KskSection => ({
  title: 'Thông tin chung về lần khám',
  fields: [
    t('MA_CSKCB', 'Mã cơ sở KCB (5 ký tự)', { required: true, span: 4 }),
    t('MA_GTIN_CSKCB', 'Mã cơ sở KCB theo chuẩn GLN (13 ký tự)', { required: true, span: 4 }),
    dt('NGAY_VAO', 'Ngày khám sức khỏe', { required: true }),
    sel('MA_LOAI_KCB', 'Loại hình khám bệnh, chữa bệnh', OPT_MA_LOAI_KCB, { span: 4 }),
    sel('DOI_TUONG', 'Đối tượng khám', OPT_DOI_TUONG),
    sel('NGUON_CHI_TRA', 'Nguồn chi trả', OPT_NGUON_CHI_TRA),
    t('MA_LK', 'Mã liên kết (tự sinh nếu để trống)', { span: 6 }),
    t('LY_DO_VV', 'Lý do khám sức khỏe', { span: 6, placeholder: 'VD: Khám sức khỏe định kỳ' }),
  ],
});

const diaChi = (): KskField[] => [
  t('MATINH_CU_TRU', 'Mã tỉnh/thành phố nơi ở hiện tại', { span: 4, placeholder: 'VD: 01' }),
  t('MAXA_CU_TRU', 'Mã xã/phường nơi ở hiện tại', { span: 4, placeholder: 'VD: 00004' }),
  sel('NHOM_MAU', 'Nhóm máu', OPT_NHOM_MAU),
  t('DIA_CHI', 'Địa chỉ hiện tại (số nhà, thôn, xóm...)', { span: 12 }),
];

const theLuc = (): KskSection => ({
  fields: [
    t('CHIEU_CAO', 'Chiều cao (cm)', { span: 4, placeholder: 'VD: 160' }),
    t('CAN_NANG', 'Cân nặng (kg)', { span: 4, placeholder: 'VD: 60' }),
    t('CHI_SO_BMI', 'Chỉ số BMI', { span: 4, hint: 'Tự tính khi nhập chiều cao & cân nặng' }),
    t('MACH', 'Mạch (lần/phút)', { span: 4, placeholder: 'VD: 80' }),
    t('HUYET_AP', 'Huyết áp (mmHg)', { span: 4, placeholder: 'VD: 120/80' }),
    pl('KHAM_THE_LUC_PL', 'Phân loại thể lực'),
  ],
});

const OPT_THI_LUC = Array.from({ length: 11 }, (_, i) => ({ value: `${i}/10`, label: `${i}/10` }));

const matTmhRhm = (withPl: boolean): KskSection[] => [
  {
    title: 'Khám mắt',
    fields: [
      sel('KHONG_KINH_MAT_PHAI', 'Thị lực không kính - Phải', OPT_THI_LUC, { span: 3 }),
      sel('KHONG_KINH_MAT_TRAI', 'Thị lực không kính - Trái', OPT_THI_LUC, { span: 3 }),
      sel('CO_KINH_MAT_PHAI', 'Thị lực có kính - Phải', OPT_THI_LUC, { span: 3 }),
      sel('CO_KINH_MAT_TRAI', 'Thị lực có kính - Trái', OPT_THI_LUC, { span: 3 }),
      ...(withPl
        ? kq('BENH_KHAC_MAT', 'Các bệnh về mắt (nếu có)', 'KHAM_MAT_PL', 'CKDT_KHAM_MAT', true)
        : kq('BENH_KHAC_MAT', 'Các bệnh về mắt (nếu có)', undefined, 'CKDT_KHAM_MAT', true)),
    ],
  },
  {
    title: 'Khám tai - mũi - họng',
    fields: [
      t('TAI_TRAI_NOI_THUONG', 'Tai trái - nói thường (m)', { span: 3, placeholder: '5' }),
      t('TAI_TRAI_NOI_THAM', 'Tai trái - nói thầm (m)', { span: 3, placeholder: '0.5' }),
      t('TAI_PHAI_NOI_THUONG', 'Tai phải - nói thường (m)', { span: 3, placeholder: '5' }),
      t('TAI_PHAI_NOI_THAM', 'Tai phải - nói thầm (m)', { span: 3, placeholder: '0.5' }),
      ...(withPl
        ? kq('BENH_KHAC_TAI_MUI_HONG', 'Các bệnh về tai mũi họng (nếu có)', 'KHAM_TAI_MUI_HONG_PL', 'CKDT_KHAM_TAI_MUI_HONG', true)
        : kq('BENH_KHAC_TAI_MUI_HONG', 'Các bệnh về tai mũi họng (nếu có)', undefined, 'CKDT_KHAM_TAI_MUI_HONG', true)),
    ],
  },
  {
    title: 'Khám răng - hàm - mặt',
    fields: [
      t('HAM_TREN', 'Hàm trên', { span: 6 }),
      t('HAM_DUOI', 'Hàm dưới', { span: 6 }),
      ...(withPl
        ? kq('BENH_KHAC_RANG_HAM_MAT', 'Các bệnh về răng - hàm - mặt (nếu có)', 'KHAM_RANG_HAM_MAT_PL', 'CKDT_KHAM_RANG_HAM_MAT', true)
        : kq('BENH_KHAC_RANG_HAM_MAT', 'Các bệnh về răng - hàm - mặt (nếu có)', undefined, 'CKDT_KHAM_RANG_HAM_MAT', true)),
    ],
  },
];

/* ======================= MẪU TRÊN 18 TUỔI (Adult) ======================= */

const ADULT_TSBT: Array<[string, string]> = [
  ['TSBT_BENH_TRONG_5_NAM_QUA', 'Có bệnh hay bị thương trong 5 năm qua'],
  ['TSBT_BENH_THAN_KINH', 'Có bệnh thần kinh hay bị thương ở đầu'],
  ['TSBT_BENH_MAT', 'Bệnh mắt hoặc giảm thị lực (trừ đeo kính thuốc)'],
  ['TSBT_BENH_TAI', 'Bệnh ở tai, giảm sức nghe hoặc thăng bằng'],
  ['TSBT_BENH_TIM', 'Bệnh ở tim, nhồi máu cơ tim, bệnh tim mạch khác'],
  ['TSBT_PHAU_THUAT_TIM', 'Phẫu thuật can thiệp tim - mạch'],
  ['TSBT_TANG_HUYET_AP', 'Tăng huyết áp'],
  ['TSBT_KHO_THO', 'Khó thở'],
  ['TSBT_BENH_PHOI', 'Bệnh phổi, hen, khí phế thũng, viêm phế quản mạn'],
  ['TSBT_BENH_THAN', 'Bệnh thận, lọc máu'],
  ['TSBT_NGHIEN_RUOU', 'Nghiện rượu, bia'],
  ['TSBT_DAI_THAO_DUONG', 'Đái tháo đường hoặc kiểm soát tăng đường huyết'],
  ['TSBT_BENH_TAM_THAN', 'Bệnh tâm thần'],
  ['TSBT_MAT_Y_THUC', 'Mất ý thức, rối loạn ý thức'],
  ['TSBT_NGAT', 'Ngất, chóng mặt'],
  ['TSBT_BENH_TIEU_HOA', 'Bệnh tiêu hóa'],
  ['TSBT_ROI_LOAN_GIAC_NGU', 'Rối loạn giấc ngủ, ngừng thở khi ngủ, ngáy to'],
  ['TSBT_TAI_BIEN', 'Tai biến mạch máu não hoặc liệt'],
  ['TSBT_BENH_COT_SONG', 'Bệnh hoặc tổn thương cột sống'],
  ['TSBT_RUOU_THUONG_XUYEN', 'Sử dụng rượu thường xuyên, liên tục'],
  ['TSBT_MA_TUY', 'Sử dụng ma túy và chất gây nghiện'],
  ['TSBT_BENH_KHAC', 'Bệnh khác'],
];

const ADULT: KskSchema = {
  type: 'Adult',
  sheetName: 'Trên 18',
  title: '(3). Khám Sức Khỏe Từ 18 tuổi trở lên',
  tabs: [
    {
      id: 'hanhchinh',
      label: 'Thông tin Hành chính',
      sections: [
        {
          title: 'Thông tin Hành chính',
          fields: [
            t('HO_TEN', 'Họ và tên', { required: true, span: 6, placeholder: 'NHẬP HỌ TÊN (IN HOA)' }),
            sel('GIOI_TINH', 'Giới tính', OPT_GIOI_TINH, { required: true, span: 3 }),
            d('NGAY_SINH', 'Ngày sinh', { required: true, span: 3 }),
            t('SO_CCCD', 'Số CMND/CCCD/Mã định danh', { required: true, span: 4 }),
            d('NGAYCAP_CCCD', 'Ngày cấp CCCD'),
            t('NOICAP_CCCD', 'Nơi cấp CCCD', { span: 4 }),
            t('MA_DAN_TOC', 'Mã dân tộc', { span: 4, placeholder: 'VD: 01 (Kinh)' }),
            sel('MA_NGHE_NGHIEP', 'Nghề nghiệp', OPT_NGHE_NGHIEP, { span: 4 }),
            t('DIEN_THOAI', 'Điện thoại', { span: 4 }),
            t('NOI_LAM_VIEC_HOC_TAP', 'Nơi làm việc, học tập', { span: 12 }),
            ...diaChi(),
          ],
        },
      ],
    },
    { id: 'lankham', label: 'Thông tin lần khám', sections: [lanKham()] },
    {
      id: 'tiensu',
      label: 'Tiền sử bệnh tật',
      sections: [
        {
          title: '1. Tiền sử gia đình',
          fields: [
            yn('TSGD_MAC_BENH', 'Gia đình có người mắc bệnh truyền nhiễm, tim mạch, ĐTĐ, lao, hen, ung thư, động kinh, rối loạn tâm thần?', { span: 6 }),
            t('TSGD_MA_BENH', 'Tên/mã bệnh (ICD-10, cách nhau dấu ;)', { span: 6, placeholder: 'VD: J45;J30' }),
          ],
        },
        {
          title: '2. Tiền sử bản thân',
          fields: [
            ...ADULT_TSBT.map(([k, l]) => yn(k, l, { span: 4 })),
            t('TSBT_MA_BENH_KHAC', 'Ghi rõ tên bệnh khác', { span: 12 }),
            yn('TSBT_DANG_DIEU_TRI_BENH', 'Hiện tại có đang điều trị bệnh gì không?', { span: 6 }),
            t('TSBT_MA_BENH', 'Tên/mã bệnh tiền sử bản thân (ICD-10)', { span: 6 }),
            t('TSBT_TEN_THUOC_LIEU_LUONG', 'Thuốc đang sử dụng và liều lượng', { span: 12 }),
          ],
        },
        {
          title: '3. Tiền sử thai sản (nếu có)',
          fields: [
            yn('TSBT_THAI_SAN', 'Có bệnh thai sản?', { span: 4 }),
            t('TSBT_MA_BENH_THAI_SAN', 'Tên bệnh thai sản (ICD-10)', { span: 4 }),
            t('TSBT_TEN_THUOC_THAI_SAN', 'Thuốc đang dùng điều trị bệnh thai sản', { span: 4 }),
          ],
        },
      ],
    },
    { id: 'theluc', label: 'Khám thể lực', sections: [theLuc()] },
    {
      id: 'lamsang',
      label: 'Khám lâm sàng',
      sections: [
        {
          title: '1. Nội khoa',
          fields: [
            ...kq('NOI_KHOA_TUAN_HOAN', 'a. Tuần hoàn', 'NOI_KHOA_TUAN_HOAN_PL', 'CKDT_NOI_KHOA_TUAN_HOAN', true),
            ...kq('NOI_KHOA_HO_HAP', 'b. Hô hấp', 'NOI_KHOA_HO_HAP_PL', 'CKDT_NOI_KHOA_HO_HAP'),
            ...kq('NOI_KHOA_TIEU_HOA', 'c. Tiêu hóa', 'NOI_KHOA_TIEU_HOA_PL', 'CKDT_NOI_KHOA_TIEU_HOA'),
            ...kq('NOI_KHOA_THAN_TN_SD', 'd. Thận - Tiết niệu - Sinh dục', 'NOI_KHOA_THAN_TN_SD_PL', 'CKDT_NOI_KHOA_THAN_TN_SD'),
            ...kq('NOI_KHOA_NOI_TIET', 'đ. Nội tiết', 'NOI_KHOA_NOI_TIET_PL', 'CKDT_NOI_KHOA_NOI_TIET'),
            ...kq('NOI_KHOA_CO_XUONG_KHOP', 'e. Cơ - Xương - Khớp', 'NOI_KHOA_CO_XUONG_KHOP_PL', 'CKDT_NOI_KHOA_CO_XUONG_KHOP'),
            ...kq('NOI_KHOA_THAN_KINH', 'g. Thần kinh', 'NOI_KHOA_THAN_KINH_PL', 'CKDT_NOI_KHOA_THAN_KINH'),
            ...kq('NOI_KHOA_TAM_THAN', 'h. Tâm thần', 'NOI_KHOA_TAM_THAN_PL', 'CKDT_NOI_KHOA_TAM_THAN'),
          ],
        },
        { title: '2. Ngoại khoa', fields: kq('KET_QUA_KHAM_NGOAI_KHOA', 'Kết quả khám ngoại khoa', 'KHAM_NGOAI_KHOA_PL', 'CKDT_KHAM_NGOAI_KHOA', true) },
        { title: '3. Da liễu', fields: kq('KET_QUA_KHAM_DA_LIEU', 'Kết quả khám da liễu', 'KHAM_DA_LIEU_PL', 'CKDT_KHAM_DA_LIEU', true) },
        { title: '4. Sản phụ khoa', fields: kq('KET_QUA_KHAM_SAN_PHU_KHOA', 'Kết quả khám sản phụ khoa', 'KHAM_SAN_PHU_KHOA_PL', 'CKDT_KHAM_SAN_PHU_KHOA', true) },
        ...matTmhRhm(true),
      ],
    },
    { id: 'cls', label: 'Cận lâm sàng', sections: [], special: 'cls' },
    {
      id: 'ketluan',
      label: 'Kết luận',
      sections: [
        {
          title: 'Kết luận',
          fields: [
            t('KET_LUAN_BENH', 'Kết luận bệnh (ICD-10)', { span: 6 }),
            t('CAC_BENH_TAT_NEU_CO', 'Tình trạng sức khỏe; mắc các bệnh, tật (nếu có)', { span: 6 }),
            pl('PHAN_LOAI_SK', 'Phân loại sức khỏe', { required: true, span: 6 }),
          ],
        },
      ],
    },
  ],
};

/* ====================== MẪU 6 - DƯỚI 18 TUỔI (Minor) ====================== */

const MINOR: KskSchema = {
  type: 'Minor',
  sheetName: '6>Duoi 18',
  title: '(2). Khám Sức Khỏe Từ 6 đến dưới 18 tuổi',
  tabs: [
    {
      id: 'hanhchinh',
      label: 'Thông tin Hành chính',
      sections: [
        {
          title: 'Thông tin Hành chính',
          fields: [
            t('HO_TEN', 'Họ và tên', { required: true, span: 6, placeholder: 'NHẬP HỌ TÊN (IN HOA)' }),
            sel('GIOI_TINH', 'Giới tính', OPT_GIOI_TINH, { required: true, span: 3 }),
            d('NGAY_SINH', 'Ngày sinh', { required: true, span: 3 }),
            t('SO_CCCD', 'Số CMND/CCCD/Mã định danh', { span: 4 }),
            d('NGAYCAP_CCCD', 'Ngày cấp CCCD'),
            t('NOICAP_CCCD', 'Nơi cấp CCCD', { span: 4 }),
            t('MA_DAN_TOC', 'Mã dân tộc', { span: 4, placeholder: 'VD: 01 (Kinh)' }),
            t('DIEN_THOAI', 'Điện thoại của người khám', { span: 4 }),
            ...diaChi(),
          ],
        },
        {
          title: 'Bố, mẹ hoặc người giám hộ',
          fields: [
            t('NGUOI_GIAM_HO', 'Họ và tên bố, mẹ hoặc người giám hộ', { span: 4 }),
            t('SO_CCCD_NGH', 'Mã định danh (CCCD) của người giám hộ', { span: 4 }),
            t('DIEN_THOAI_NGH', 'Điện thoại người giám hộ', { span: 4 }),
          ],
        },
      ],
    },
    { id: 'lankham', label: 'Thông tin lần khám', sections: [lanKham()] },
    {
      id: 'tiensu',
      label: 'Tiền sử bệnh tật',
      sections: [
        {
          title: '1. Tiền sử gia đình',
          fields: [
            yn('TSGD_MAC_BENH', 'Trong gia đình có người mắc bệnh bẩm sinh hoặc bệnh truyền nhiễm?', { span: 6 }),
            t('TSGD_MA_BENH', 'Tên/mã bệnh (ICD-10)', { span: 6 }),
          ],
        },
        {
          title: '2. Tiền sử bản thân',
          fields: [
            yn('SAN_KHOA', 'Sản khoa bình thường?', { span: 4 }),
            sel('SAN_KHOA_KHONG_BT', 'Sản khoa không bình thường', OPT_SAN_KHOA_KHONG_BT),
            t('MA_BENH_SAN_KHOA_KHONG_BT', 'Bệnh gây sản khoa không bình thường (ICD-10)', { span: 4 }),
            yn('TSBT_MAC_BENH', 'Đang mắc bệnh bẩm sinh và mãn tính?', { span: 6 }),
            t('TSBT_MA_BENH', 'Tên/mã bệnh tiền sử bản thân (ICD-10)', { span: 6 }),
            yn('TSBT_DANG_DIEU_TRI_BENH', 'Hiện tại có đang điều trị bệnh gì không?', { span: 6 }),
            t('BENH_DANG_DIEU_TRI', 'Tên bệnh và các thuốc đang dùng', { span: 6 }),
          ],
        },
        {
          title: '3. Tiêm chủng',
          fields: [
            tc('TIEM_CHUNG_BCG', 'BCG'),
            tc('TIEM_CHUNG_BH_HG_UV', 'Bạch hầu, ho gà, uốn ván'),
            tc('TIEM_CHUNG_SOI', 'Sởi'),
            tc('TIEM_CHUNG_BAI_LIET', 'Bại liệt'),
            tc('TIEM_CHUNG_VNNB_B', 'Viêm não Nhật Bản B'),
            tc('TIEM_CHUNG_VGB', 'Viêm gan B'),
            tc('TIEM_CHUNG_CAC_LOAI_KHAC', 'Các loại vắc xin khác'),
            t('TIEM_CHUNG_VAC_XIN_KHAC', 'Tên vắc xin khác', { span: 8 }),
          ],
        },
      ],
    },
    { id: 'theluc', label: 'Khám thể lực', sections: [theLuc()] },
    {
      id: 'lamsang',
      label: 'Khám lâm sàng',
      sections: [
        {
          title: '1. Nhi khoa',
          fields: [
            ...kq('NHI_KHOA_TUAN_HOAN', 'Tuần hoàn', undefined, 'CKDT_NHI_KHOA_TUAN_HOAN', true),
            ...kq('NHI_KHOA_HO_HAP', 'Hô hấp', undefined, 'CKDT_NHI_KHOA_HO_HAP'),
            ...kq('NHI_KHOA_TIEU_HOA', 'Tiêu hóa', undefined, 'CKDT_NHI_KHOA_TIEU_HOA'),
            ...kq('NHI_KHOA_THAN_TN_SD', 'Thận - Tiết niệu - Sinh dục', undefined, 'CKDT_NHI_KHOA_THAN_TN_SD'),
            ...kq('NHI_KHOA_THAN_KINH', 'Thần kinh', undefined, 'CKDT_NHI_KHOA_THAN_KINH'),
            ...kq('NHI_KHOA_TAM_THAN', 'Tâm thần', undefined, 'CKDT_NHI_KHOA_TAM_THAN'),
            ...kq('NHI_KHOA_LAM_SANG_KHAC', 'Khám lâm sàng khác', undefined, 'CKDT_NHI_KHOA_LAM_SANG_KHAC'),
          ],
        },
        ...matTmhRhm(false),
      ],
    },
    { id: 'cls', label: 'Cận lâm sàng', sections: [], special: 'cls' },
    {
      id: 'ketluan',
      label: 'Kết luận',
      sections: [
        {
          title: 'Kết luận',
          fields: [
            t('KET_LUAN_BENH', 'Kết luận bệnh (ICD-10)', { span: 6 }),
            t('CAC_VAN_DE_SUC_KHOE', 'Tình trạng sức khỏe; mắc các bệnh, tật (nếu có)', { span: 6 }),
            pl('PHAN_LOAI_SK', 'Phân loại sức khỏe', { required: true, span: 6 }),
          ],
        },
      ],
    },
  ],
};

/* ======================= MẪU DƯỚI 6 TUỔI (ChildUnder) ======================= */

const CHILD: KskSchema = {
  type: 'ChildUnder',
  sheetName: 'Duoi 6',
  title: '(1). Khám Sức Khỏe Trẻ dưới 6 tuổi',
  tabs: [
    {
      id: 'hanhchinh',
      label: 'Thông tin Hành chính',
      sections: [
        {
          title: 'Thông tin Hành chính',
          fields: [
            t('HO_TEN', 'Họ và tên', { required: true, span: 6, placeholder: 'NHẬP HỌ TÊN (IN HOA)' }),
            sel('GIOI_TINH', 'Giới tính', OPT_GIOI_TINH, { required: true, span: 3 }),
            d('NGAY_SINH', 'Ngày sinh', { required: true, span: 3 }),
            t('SO_CCCD', 'Số định danh cá nhân', { span: 4 }),
            t('MA_DAN_TOC', 'Mã dân tộc', { span: 4, placeholder: 'VD: 01 (Kinh)' }),
            t('TUAN_THAI', 'Tuần thai khi sinh (tuần)', { span: 2, placeholder: '38' }),
            yn('SINH_NON', 'Sinh non', { span: 2 }),
            ...diaChi(),
          ],
        },
        {
          title: 'Người đi cùng trẻ',
          fields: [
            t('HO_TEN_NGUOI_DI_CUNG', 'Họ tên người đi cùng trẻ', { span: 6 }),
            t('SO_CCCD_NGUOI_DI_CUNG', 'Mã định danh người đi cùng (CCCD)', { span: 6 }),
            sel('MOI_QUAN_HE_VOI_TRE', 'Mối quan hệ với trẻ', OPT_MOI_QUAN_HE),
            t('DIEN_THOAI_NGUOI_DI_CUNG', 'Điện thoại người đi cùng trẻ', { span: 4 }),
          ],
        },
        {
          title: 'Tiền sử',
          fields: [
            yn('TSBT_MAC_BENH', 'Bản thân có bệnh tiền sử không?', { span: 6 }),
            t('TSBT_MA_BENH', 'Tên/mã bệnh tiền sử bản thân (ICD-10)', { span: 6 }),
            yn('TSGD_MAC_BENH', 'Gia đình có bệnh tiền sử không?', { span: 6 }),
            t('TSGD_MA_BENH', 'Tên/mã bệnh tiền sử gia đình (ICD-10)', { span: 6 }),
            yn('TS_TIEP_XUC_LAO', 'Tiền sử tiếp xúc với người bệnh lao', { span: 6 }),
          ],
        },
      ],
    },
    { id: 'lankham', label: 'Thông tin lần khám', sections: [lanKham()] },
    {
      id: 'sinhton',
      label: 'Dấu hiệu sinh tồn',
      sections: [
        {
          title: 'Đánh giá dấu hiệu sinh tồn',
          fields: [
            t('NHIET_DO', 'Nhiệt độ (°C)', { span: 4, placeholder: '36.8' }),
            t('DGDHST_NHIET_DO', 'Đánh giá qua nhiệt độ', { span: 8 }),
            t('MACH', 'Mạch (lần/phút)', { span: 4 }),
            t('DGDHST_MACH', 'Đánh giá qua mạch', { span: 8 }),
            t('NHIP_THO', 'Nhịp thở (lần/phút)', { span: 4 }),
            t('DGDHST_NHIP_THO', 'Đánh giá qua nhịp thở', { span: 8 }),
          ],
        },
      ],
    },
    {
      id: 'dinhduong',
      label: 'Dinh dưỡng',
      sections: [
        {
          title: 'Đánh giá dinh dưỡng',
          fields: [
            t('CHIEU_DAI', 'Chiều dài (cm)', { span: 3 }),
            t('CHIEU_DAI_TUOI_SD', 'Chiều dài / Tuổi (SD)', { span: 3 }),
            t('CAN_NANG', 'Cân nặng (kg)', { span: 3 }),
            t('CAN_NANG_TUOI_SD', 'Cân nặng / Tuổi (SD)', { span: 3 }),
            t('VONG_DAU', 'Vòng đầu (cm)', { span: 4 }),
            t('DG_VONG_DAU', 'Đánh giá vòng đầu', { span: 4 }),
            t('CHU_VI_VONG_CANH_TAY', 'Chu vi vòng cánh tay (mm)', { span: 4 }),
            yn('DGDD_BINH_THUONG', 'Bình thường'),
            yn('PHU_DINH_DUONG', 'Phù dinh dưỡng'),
            yn('DGDD_THIEU_MAU', 'Dấu hiệu thiếu máu'),
            yn('DGDD_COI_XUONG', 'Dấu hiệu còi xương'),
            yn('SUY_DINH_DUONG', 'Suy dinh dưỡng'),
            yn('THUA_CAN_BEO_PHI', 'Thừa cân / béo phì'),
          ],
        },
      ],
    },
    {
      id: 'tinhthan',
      label: 'Tinh thần - vận động',
      sections: [
        {
          title: 'Đánh giá phát triển tinh thần - vận động',
          fields: [
            yn('PT_TTBT_THEO_DO_TUOI', 'Phát triển tinh thần bình thường theo độ tuổi', { span: 6 }),
            yn('PT_VDBT_THEO_DO_TUOI', 'Phát triển vận động bình thường theo độ tuổi', { span: 6 }),
            yn('NGUY_CO_TU_KY', 'Trẻ có nguy cơ tự kỷ (trẻ 16-30 tháng tuổi)', { span: 6 }),
          ],
        },
      ],
    },
    {
      id: 'tiemchung',
      label: 'Tiêm chủng',
      sections: [
        {
          title: 'Đánh giá tiêm chủng',
          fields: [
            yn('TIEM_CHUNG_BCG_SS', 'Lao (sơ sinh)', { span: 4 }),
            yn('TIEM_CHUNG_VGB_SS_MUI1', 'Viêm gan B mũi 1 (sơ sinh)', { span: 4 }),
            yn('TIEM_CHUNG_DAY_DU_THEO_DO_TUOI', 'Tiêm chủng đầy đủ theo độ tuổi', { span: 4 }),
          ],
        },
      ],
    },
    {
      id: 'lamsang',
      label: 'Khám lâm sàng',
      sections: [
        {
          title: 'Da - đầu - cổ',
          fields: [
            t('MAU_SAC_DA', 'Màu sắc da', { span: 4 }),
            t('LONG_BAN_TAY', 'Lòng bàn tay', { span: 4 }),
            t('THOP', 'Thóp (trẻ nhỏ còn thóp)', { span: 4 }),
            t('HINH_DANG_DAU', 'Kích thước và hình dạng đầu', { span: 4 }),
            t('VAN_DONG_CO', 'Vận động cổ', { span: 4 }),
            t('KHOI_BAT_THUONG_DAU_CO', 'Khối bất thường (đầu, cổ)', { span: 4 }),
            { key: 'CKDT_DA_DAU_CO', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
        {
          title: 'Mắt - tai - mũi - họng',
          fields: [
            t('VI_TRI_HAI_MAT', 'Vị trí 2 mắt', { span: 4 }),
            t('MI_MAT_KET_MAC', 'Mí mắt và kết mạc', { span: 4 }),
            t('LAC_MAT', 'Lác mắt', { span: 4 }),
            t('DONG_TU', 'Đồng tử (kích thước, phản xạ)', { span: 4 }),
            t('TAI_MANG_NHI', 'Tai và màng nhĩ', { span: 4 }),
            t('DAP_UNG_AM_THANH', 'Đáp ứng với âm thanh', { span: 4 }),
            t('KHOI_SUNG_SAU_TAI', 'Có khối sưng sau tai', { span: 4 }),
            t('CHAY_MU_NUOC_TAI', 'Dấu hiệu chảy mủ, nước tai', { span: 4 }),
            t('HINH_DANG_MUI', 'Hình dạng mũi', { span: 4 }),
            t('CHAY_NUOC_MUI', 'Chảy nước mũi', { span: 4 }),
            t('NGHET_MUI', 'Nghẹt mũi', { span: 4 }),
            t('HONG', 'Họng', { span: 4 }),
            { key: 'CKDT_MAT_TAI_MUI_HONG', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
        {
          title: 'Miệng - răng',
          fields: [
            t('HINH_DANG_MIENG', 'Hình dạng miệng', { span: 4 }),
            t('RANG_SUA_SO_SINH', 'Răng sữa sơ sinh', { span: 4 }),
            t('HINH_DANG_LUOI', 'Hình dạng lưỡi', { span: 4 }),
            t('DINH_THANG_LUOI', 'Dính thắng lưỡi', { span: 4 }),
            t('NAM_MIENG', 'Nấm miệng', { span: 4 }),
            t('CAM_NHO_TUT_VE_SAU', 'Cằm nhỏ, tụt về sau', { span: 4 }),
            t('SAU_MANG_BAM_LO', 'Vết sâu, mảng bám, lỗ trên răng', { span: 4 }),
            { key: 'CKDT_MIENG_RANG', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
        {
          title: 'Hô hấp - tim mạch',
          fields: [
            t('NHIP_THO_KHONG_DEU', 'Nhịp thở không đều', { span: 4 }),
            t('THO_RUT_LOM_LONG_NGUC', 'Thở rút lõm lồng ngực', { span: 4 }),
            t('TIENG_THO_BAT_THUONG', 'Tiếng thở bất thường', { span: 4 }),
            t('SUY_HO_HAP', 'Dấu hiệu suy hô hấp', { span: 4 }),
            t('NGHE_PHOI', 'Nghe phổi', { span: 4 }),
            t('VI_TRI_MOM_TIM', 'Vị trí mỏm tim', { span: 4 }),
            t('MACH_NGOAI_VI', 'Mạch ngoại vi (mạch quay - bẹn)', { span: 4 }),
            t('TIENG_TIM', 'Nghe tim (loạn nhịp, tiếng thổi)', { span: 4 }),
            { key: 'CKDT_HO_HAP_TIM_MACH', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
        {
          title: 'Bụng - sinh dục',
          fields: [
            t('HINH_DANG_BUNG_RON', 'Hình dáng bụng, rốn', { span: 4 }),
            t('GAN_LACH_TO', 'Gan, lách to', { span: 4 }),
            t('KHOI_BAT_THUONG', 'Khối bất thường (bụng)', { span: 4 }),
            t('LO_HAU_MON', 'Lỗ hậu môn', { span: 4 }),
            t('CO_QUAN_SINH_DUC_NGOAI', 'Cơ quan sinh dục ngoài', { span: 4 }),
            { key: 'CKDT_BUNG_SINH_DUC', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
        {
          title: 'Thần kinh - cơ xương khớp',
          fields: [
            t('VAN_DONG_KHONG_DOI_XUNG', 'Vận động không đối xứng', { span: 4 }),
            t('PHAN_XA_BU', 'Phản xạ bú', { span: 4 }),
            t('PHAN_XA_NAM', 'Phản xạ nắm', { span: 4 }),
            t('PHAN_XA_MORO', 'Phản xạ Moro', { span: 4 }),
            t('TRUONG_LUC_CO', 'Trương lực cơ', { span: 4 }),
            t('KHOP_HANG', 'Khớp háng', { span: 4 }),
            t('PHAN_XA_CO', 'Phản xạ cơ', { span: 4 }),
            t('KIEM_TRA_LUNG_COT_SONG', 'Kiểm tra lưng, cột sống', { span: 4 }),
            t('TU_CHI_KHOP', 'Khám tứ chi và khớp', { span: 4 }),
            t('QUAN_SAT_DANG_DI', 'Quan sát dáng đi', { span: 4 }),
            { key: 'CKDT_THAN_KINH_CO_XUONG_KHOP', label: 'Họ tên và chữ ký Bác sĩ', kind: 'signature', span: 4, hideLabel: true },
          ],
        },
      ],
    },
    {
      id: 'ketluan',
      label: 'Kết luận và tư vấn',
      sections: [
        {
          title: 'Kết luận và tư vấn',
          fields: [
            yn('BINH_THUONG', 'Bình thường', { span: 4 }),
            yn('NGUY_CO_MAC_LAO', 'Có nguy cơ mắc lao (tiền sử tiếp xúc)', { span: 4 }),
            yn('VAN_DE_SUC_KHOE', 'Có vấn đề về sức khỏe', { span: 4 }),
            t('KET_LUAN_BENH', 'Kết luận bệnh (ICD-10)', { span: 6 }),
            t('GHI_RO_VAN_DE_SUC_KHOE', 'Ghi rõ vấn đề sức khỏe', { span: 6 }),
            t('HEN_KHAM_LAN_SAU', 'Hẹn khám lần sau', { span: 6 }),
            yn('CHUYEN_CSKCB', 'Chuyển cơ sở khám bệnh, chữa bệnh', { span: 6 }),
          ],
        },
      ],
    },
  ],
};

export const KSK_SCHEMAS: Record<KskType, KskSchema> = {
  ChildUnder: CHILD,
  Minor: MINOR,
  Adult: ADULT,
};

/** Toàn bộ trường (phẳng) của 1 mẫu */
export function getAllFields(type: KskType): KskField[] {
  return KSK_SCHEMAS[type].tabs.flatMap(tab => tab.sections.flatMap(s => s.fields));
}

/** Xác định loại mẫu từ tên sheet Excel */
export function detectKskTypeFromSheet(sheetName: string): KskType {
  const n = sheetName.trim().toLowerCase();
  if (/^6\s*>/.test(n) || n.includes('6>') || n.includes('6 đến') || n.includes('6 den')) return 'Minor';
  if (n.includes('duoi 6') || n.includes('dưới 6')) return 'ChildUnder';
  return 'Adult';
}

/** Tuổi (năm) tại thời điểm `at` từ chuỗi yyyymmdd[HHMM] */
export function calcAgeYears(ngaySinh: string, at: Date = new Date()): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(ngaySinh || '');
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
  let age = at.getFullYear() - y;
  if (at.getMonth() + 1 < mo || (at.getMonth() + 1 === mo && at.getDate() < da)) age--;
  return age;
}
