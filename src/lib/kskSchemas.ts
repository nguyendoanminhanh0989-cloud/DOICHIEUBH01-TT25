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
  | 'phanloai';

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
  /** Số cột chiếm trong lưới 12 cột */
  span?: 2 | 3 | 4 | 6 | 8 | 12;
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
  { value: '1', label: 'Ngân sách Trung ương' },
  { value: '2', label: 'Ngân sách Địa phương' },
  { value: '3', label: 'Quỹ Bảo hiểm y tế' },
  { value: '4', label: 'Người sử dụng lao động' },
  { value: '5', label: 'Xã hội hóa' },
  { value: '9', label: 'Khác' },
];

export const OPT_NHOM_MAU: KskOption[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'AB', label: 'AB' },
  { value: 'O', label: 'O' },
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

/** Kết quả khám (8 cột) + phân loại (4 cột) */
const kq = (key: string, label: string, plKey: string): KskField[] => [
  t(key, label, { span: 8, placeholder: 'Nhập kết quả khám' }),
  pl(plKey),
];

/* ------------------------- Khối trường dùng chung ------------------------- */

const lanKham = (): KskSection => ({
  title: 'Thông tin chung về lần khám',
  fields: [
    t('MA_CSKCB', 'Mã cơ sở KCB (5 ký tự)', { required: true, span: 4 }),
    t('MA_GTIN_CSKCB', 'Mã cơ sở KCB theo chuẩn GLN (13 ký tự)', { required: true, span: 4 }),
    dt('NGAY_VAO', 'Ngày khám sức khỏe', { required: true }),
    t('MA_LOAI_KCB', 'Loại hình khám bệnh, chữa bệnh', { span: 4, placeholder: 'VD: 1', hint: 'Theo QĐ 1804/QĐ-BYT' }),
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

const matTmhRhm = (withPl: boolean): KskSection[] => [
  {
    title: 'Khám mắt',
    fields: [
      t('KHONG_KINH_MAT_PHAI', 'Thị lực không kính - Mắt phải', { span: 3, placeholder: '10/10' }),
      t('KHONG_KINH_MAT_TRAI', 'Thị lực không kính - Mắt trái', { span: 3, placeholder: '10/10' }),
      t('CO_KINH_MAT_PHAI', 'Thị lực có kính - Mắt phải', { span: 3, placeholder: '10/10' }),
      t('CO_KINH_MAT_TRAI', 'Thị lực có kính - Mắt trái', { span: 3, placeholder: '10/10' }),
      ...(withPl
        ? kq('BENH_KHAC_MAT', 'Các bệnh về mắt (nếu có)', 'KHAM_MAT_PL')
        : [t('BENH_KHAC_MAT', 'Các bệnh về mắt (nếu có)', { span: 12 })]),
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
        ? kq('BENH_KHAC_TAI_MUI_HONG', 'Các bệnh về tai mũi họng (nếu có)', 'KHAM_TAI_MUI_HONG_PL')
        : [t('BENH_KHAC_TAI_MUI_HONG', 'Các bệnh về tai mũi họng (nếu có)', { span: 12 })]),
    ],
  },
  {
    title: 'Khám răng - hàm - mặt',
    fields: [
      t('HAM_TREN', 'Hàm trên', { span: 6 }),
      t('HAM_DUOI', 'Hàm dưới', { span: 6 }),
      ...(withPl
        ? kq('BENH_KHAC_RANG_HAM_MAT', 'Các bệnh về răng - hàm - mặt (nếu có)', 'KHAM_RANG_HAM_MAT_PL')
        : [t('BENH_KHAC_RANG_HAM_MAT', 'Các bệnh về răng - hàm - mặt (nếu có)', { span: 12 })]),
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
            t('MA_NGHE_NGHIEP', 'Mã nghề nghiệp', { span: 4, placeholder: 'VD: 13' }),
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
            ...kq('NOI_KHOA_TUAN_HOAN', 'a. Tuần hoàn', 'NOI_KHOA_TUAN_HOAN_PL'),
            ...kq('NOI_KHOA_HO_HAP', 'b. Hô hấp', 'NOI_KHOA_HO_HAP_PL'),
            ...kq('NOI_KHOA_TIEU_HOA', 'c. Tiêu hóa', 'NOI_KHOA_TIEU_HOA_PL'),
            ...kq('NOI_KHOA_THAN_TN_SD', 'd. Thận - Tiết niệu - Sinh dục', 'NOI_KHOA_THAN_TN_SD_PL'),
            ...kq('NOI_KHOA_NOI_TIET', 'đ. Nội tiết', 'NOI_KHOA_NOI_TIET_PL'),
            ...kq('NOI_KHOA_CO_XUONG_KHOP', 'e. Cơ - Xương - Khớp', 'NOI_KHOA_CO_XUONG_KHOP_PL'),
            ...kq('NOI_KHOA_THAN_KINH', 'g. Thần kinh', 'NOI_KHOA_THAN_KINH_PL'),
            ...kq('NOI_KHOA_TAM_THAN', 'h. Tâm thần', 'NOI_KHOA_TAM_THAN_PL'),
          ],
        },
        { title: '2. Ngoại khoa', fields: kq('KET_QUA_KHAM_NGOAI_KHOA', 'Kết quả khám ngoại khoa', 'KHAM_NGOAI_KHOA_PL') },
        { title: '3. Da liễu', fields: kq('KET_QUA_KHAM_DA_LIEU', 'Kết quả khám da liễu', 'KHAM_DA_LIEU_PL') },
        { title: '4. Sản phụ khoa', fields: kq('KET_QUA_KHAM_SAN_PHU_KHOA', 'Kết quả khám sản phụ khoa', 'KHAM_SAN_PHU_KHOA_PL') },
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
            t('NHI_KHOA_TUAN_HOAN', 'Tuần hoàn', { span: 6 }),
            t('NHI_KHOA_HO_HAP', 'Hô hấp', { span: 6 }),
            t('NHI_KHOA_TIEU_HOA', 'Tiêu hóa', { span: 6 }),
            t('NHI_KHOA_THAN_TN_SD', 'Thận - Tiết niệu - Sinh dục', { span: 6 }),
            t('NHI_KHOA_THAN_KINH', 'Thần kinh', { span: 6 }),
            t('NHI_KHOA_TAM_THAN', 'Tâm thần', { span: 6 }),
            t('NHI_KHOA_LAM_SANG_KHAC', 'Khám lâm sàng khác', { span: 12 }),
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
