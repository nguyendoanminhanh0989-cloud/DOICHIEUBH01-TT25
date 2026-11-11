/**
 * MODULE ĐỌC, KIỂM TRA, CHỈNH SỬA & KÝ SỐ XML THEO QUYẾT ĐỊNH 3176/QĐ-BYT (VÀ 4750/130/QĐ-BYT)
 * Hỗ trợ đầy đủ Bảng lỗi và Bảng 1 -> Bảng 15 (XML1 -> XML15)
 * Giải mã & mã hóa lại Base64 UTF-8, bảo toàn cấu trúc CDATA, thứ tự thẻ và vị trí <CHUKYDONVI />
 * Không lưu trữ dữ liệu XML trên trình duyệt (F5 tự xóa sạch hoàn toàn)
 */

export type Xml3176TableId =
  | 'XML1' | 'XML2' | 'XML3' | 'XML4' | 'XML5'
  | 'XML6' | 'XML7' | 'XML8' | 'XML9' | 'XML10'
  | 'XML11' | 'XML12' | 'XML13' | 'XML14' | 'XML15';

export interface Xml3176TableMeta {
  id: Xml3176TableId;
  tabLabel: string;
  shortTitle: string;
  fullTitle: string;
  rootTag: string;
  listTag?: string;
  itemTag?: string;
  defaultCdataFields: string[];
  defaultFields: string[];
}

export const XML3176_TABLES: Xml3176TableMeta[] = [
  {
    id: 'XML1',
    tabLabel: 'Bảng 1',
    shortTitle: 'Tổng hợp KCB (XML1)',
    fullTitle: 'Bảng 1 (XML1): Chỉ tiêu tổng hợp khám bệnh, chữa bệnh',
    rootTag: 'TONG_HOP',
    defaultCdataFields: ['HO_TEN', 'DIA_CHI', 'LY_DO_VV', 'CHAN_DOAN_VAO', 'CHAN_DOAN_RV', 'PP_DIEU_TRI', 'GHI_CHU'],
    defaultFields: [
      'MA_LK', 'STT', 'MA_BN', 'HO_TEN', 'SO_CCCD', 'NGAY_SINH', 'GIOI_TINH', 'NHOM_MAU',
      'MA_QUOCTICH', 'MA_DANTOC', 'MA_NGHE_NGHIEP', 'DIA_CHI', 'MATINH_CU_TRU', 'MAHUYEN_CU_TRU',
      'MAXA_CU_TRU', 'DIEN_THOAI', 'MA_THE_BHYT', 'MA_DKBD', 'GT_THE_TU', 'GT_THE_DEN',
      'NGAY_MIEN_CCT', 'LY_DO_VV', 'LY_DO_VNT', 'MA_LY_DO_VNT', 'CHAN_DOAN_VAO', 'CHAN_DOAN_RV',
      'MA_BENH_CHINH', 'MA_BENH_KT', 'MA_BENH_YHCT', 'MA_PTTT_QT', 'MA_DOITUONG_KCB',
      'MA_NOI_DI', 'MA_NOI_DEN', 'MA_TAI_NAN', 'NGAY_VAO', 'NGAY_VAO_NOI_TRU', 'NGAY_RA',
      'GIAY_CHUYEN_TUYEN', 'SO_NGAY_DTRI', 'PP_DIEU_TRI', 'KET_QUA_DTRI', 'MA_LOAI_RV',
      'GHI_CHU', 'NGAY_TTOAN', 'T_THUOC', 'T_VTYT', 'T_TONGCHI_BV', 'T_TONGCHI_BH',
      'T_BNTT', 'T_BNCCT', 'T_BHTT', 'T_NGUONKHAC', 'T_BHTT_GDV', 'NAM_QT', 'THANG_QT',
      'MA_LOAI_KCB', 'MA_KHOA', 'MA_CSKCB', 'MA_KHUVUC', 'CAN_NANG', 'CAN_NANG_CON',
      'NAM_NAM_LIEN_TUC', 'NGAY_TAI_KHAM', 'MA_HSBA', 'MA_TTDV', 'DU_PHONG'
    ]
  },
  {
    id: 'XML2',
    tabLabel: 'Bảng 2',
    shortTitle: 'Chi tiết Thuốc (XML2)',
    fullTitle: 'Bảng 2 (XML2): Chỉ tiêu chi tiết thuốc thanh toán BHYT',
    rootTag: 'CHITIEU_CHITIET_THUOC',
    listTag: 'DSACH_CHI_TIET_THUOC',
    itemTag: 'CHI_TIET_THUOC',
    defaultCdataFields: ['TEN_THUOC', 'HAM_LUONG', 'LIEU_DUNG', 'CACH_DUNG'],
    defaultFields: [
      'MA_LK', 'STT', 'MA_THUOC', 'MA_PP_CHEBIEN', 'MA_CSKCB_THUOC', 'MA_NHOM', 'TEN_THUOC',
      'DON_VI_TINH', 'HAM_LUONG', 'DUONG_DUNG', 'DANG_BAO_CHE', 'LIEU_DUNG', 'CACH_DUNG',
      'SO_DANG_KY', 'TT_THAU', 'PHAM_VI', 'TYLE_TT_BH', 'SO_LUONG', 'DON_GIA',
      'THANH_TIEN_BV', 'THANH_TIEN_BH', 'T_NGUONKHAC_NSNN', 'T_NGUONKHAC_VTNN',
      'T_NGUONKHAC_VTTN', 'T_NGUONKHAC_CL', 'T_NGUONKHAC', 'MUC_HUONG', 'T_BNTT',
      'T_BNCCT', 'T_BHTT', 'MA_KHOA', 'MA_BAC_SI', 'MA_DICH_VU', 'NGAY_YL', 'NGAY_TH_YL',
      'MA_PTTT', 'NGUON_CTRA', 'VET_THUONG_TP', 'DU_PHONG'
    ]
  },
  {
    id: 'XML3',
    tabLabel: 'Bảng 3',
    shortTitle: 'Chi tiết DVKT & VTYT (XML3)',
    fullTitle: 'Bảng 3 (XML3): Chỉ tiêu chi tiết dịch vụ kỹ thuật và vật tư y tế',
    rootTag: 'CHITIEU_CHITIET_DVKT_VTYT',
    listTag: 'DSACH_CHI_TIET_DVKT',
    itemTag: 'CHI_TIET_DVKT',
    defaultCdataFields: ['TEN_VAT_TU', 'TEN_DICH_VU'],
    defaultFields: [
      'MA_LK', 'STT', 'MA_DICH_VU', 'MA_PTTT_QT', 'MA_VAT_TU', 'MA_NHOM', 'GOI_VTYT',
      'TEN_VAT_TU', 'TEN_DICH_VU', 'MA_XANG_DAU', 'DON_VI_TINH', 'PHAM_VI', 'SO_LUONG',
      'DON_GIA_BV', 'DON_GIA_BH', 'TT_THAU', 'TYLE_TT_DV', 'TYLE_TT_BH', 'THANH_TIEN_BV',
      'THANH_TIEN_BH', 'T_TRANTT', 'MUC_HUONG', 'T_NGUONKHAC_NSNN', 'T_NGUONKHAC_VTNN',
      'T_NGUONKHAC_VTTN', 'T_NGUONKHAC_CL', 'T_NGUONKHAC', 'T_BNTT', 'T_BNCCT', 'T_BHTT',
      'MA_KHOA', 'MA_GIUONG', 'MA_BAC_SI', 'NGUOI_THUC_HIEN', 'MA_BENH', 'MA_BENH_YHCT',
      'NGAY_YL', 'NGAY_TH_YL', 'NGAY_KQ', 'MA_PTTT', 'VET_THUONG_TP', 'PP_VO_CAM',
      'VI_TRI_TH_DVKT', 'MA_MAY', 'MA_HIEU_SP', 'TAI_SU_DUNG', 'DU_PHONG'
    ]
  },
  {
    id: 'XML4',
    tabLabel: 'Bảng 4',
    shortTitle: 'Dịch vụ Cận lâm sàng (XML4)',
    fullTitle: 'Bảng 4 (XML4): Chỉ tiêu chi tiết dịch vụ cận lâm sàng',
    rootTag: 'CHITIEU_CHITIET_DICHVUCANLAMSANG',
    listTag: 'DSACH_CHI_TIET_CLS',
    itemTag: 'CHI_TIET_CLS',
    defaultCdataFields: ['TEN_CHI_SO', 'GIA_TRI', 'MO_TA', 'KET_LUAN'],
    defaultFields: [
      'MA_LK', 'STT', 'MA_DICH_VU', 'MA_CHI_SO', 'TEN_CHI_SO', 'GIA_TRI', 'DON_VI_DO',
      'MO_TA', 'KET_LUAN', 'NGAY_KQ', 'MA_BS_DOC_KQ', 'DU_PHONG'
    ]
  },
  {
    id: 'XML5',
    tabLabel: 'Bảng 5',
    shortTitle: 'Diễn biến lâm sàng (XML5)',
    fullTitle: 'Bảng 5 (XML5): Chỉ tiêu chi tiết diễn biến lâm sàng',
    rootTag: 'CHITIEU_CHITIET_DIENBIENLAMSANG',
    listTag: 'DSACH_CHI_TIET_DIEN_BIEN_BENH',
    itemTag: 'CHI_TIET_DIEN_BIEN_BENH',
    defaultCdataFields: ['DIEN_BIEN_LS', 'GIAI_DOAN_BENH', 'HOI_CHAN', 'PHAU_THUAT'],
    defaultFields: [
      'MA_LK', 'STT', 'DIEN_BIEN_LS', 'GIAI_DOAN_BENH', 'HOI_CHAN', 'PHAU_THUAT',
      'THOI_DIEM_DBLS', 'NGUOI_THUC_HIEN', 'DU_PHONG'
    ]
  },
  {
    id: 'XML6',
    tabLabel: 'Bảng 6',
    shortTitle: 'Hồ sơ HIV/AIDS (XML6)',
    fullTitle: 'Bảng 6 (XML6): Chỉ tiêu hồ sơ bệnh án chăm sóc và điều trị HIV/AIDS',
    rootTag: 'CHITIEU_CHITIET_HO_SO_BENH_AN_CHAM_SOC_VA_DIEU_TRI_HIV_AIDS',
    defaultCdataFields: [],
    defaultFields: [
      'MA_LK', 'MA_THE_BHYT', 'SO_CCCD', 'NGAY_SINH', 'GIOI_TINH', 'DIA_CHI',
      'MATINH_CU_TRU', 'MAHUYEN_CU_TRU', 'MAXA_CU_TRU', 'NGAYKD_HIV', 'NOI_LAY_MAU_XN',
      'NOI_XN_KD', 'NOI_BDDT_ARV', 'BDDT_ARV', 'MA_PHAC_DO_DIEU_TRI_BD', 'MA_BAC_PHAC_DO_BD',
      'MA_LYDO_DTRI', 'LOAI_DTRI_LAO', 'SANG_LOC_LAO', 'PHACDO_DTRI_LAO', 'NGAYBD_DTRI_LAO',
      'NGAYKT_DTRI_LAO', 'KQ_DTRI_LAO', 'MA_LYDO_XNTL_VR', 'NGAY_XN_TLVR', 'KQ_XNTL_VR',
      'NGAY_KQ_XN_TLVR', 'MA_LOAI_BN', 'GIAI_DOAN_LAM_SANG', 'NHOM_DOI_TUONG',
      'MA_TINH_TRANG_DK', 'LAN_XN_PCR', 'NGAY_XN_PCR', 'NGAY_KQ_XN_PCR', 'MA_KQ_XN_PCR',
      'NGAY_NHAN_TT_MANG_THAI', 'NGAY_BAT_DAU_DT_CTX', 'MA_XU_TRI', 'NGAY_BAT_DAU_XU_TRI',
      'NGAY_KET_THUC_XU_TRI', 'MA_PHAC_DO_DIEU_TRI', 'MA_BAC_PHAC_DO', 'SO_NGAY_CAP_THUOC_ARV',
      'NGAY_CHUYEN_PHAC_DO', 'LY_DO_CHUYEN_PHAC_DO', 'MA_CSKCB', 'DU_PHONG'
    ]
  },
  {
    id: 'XML7',
    tabLabel: 'Bảng 7',
    shortTitle: 'Giấy ra viện (XML7)',
    fullTitle: 'Bảng 7 (XML7): Chỉ tiêu dữ liệu giấy ra viện',
    rootTag: 'CHI_TIEU_DU_LIEU_GIAY_RA_VIEN',
    defaultCdataFields: ['CHAN_DOAN_RV', 'PP_DIEUTRI', 'GHI_CHU', 'HO_TEN_CHA', 'HO_TEN_ME', 'NGUOI_DAI_DIEN'],
    defaultFields: [
      'MA_LK', 'SO_LUU_TRU', 'MA_YTE', 'MA_KHOA_RV', 'NGAY_VAO', 'NGAY_RA',
      'MA_DINH_CHI_THAI', 'NGUYENNHAN_DINHCHI', 'THOIGIAN_DINHCHI', 'TUOI_THAI',
      'CHAN_DOAN_RV', 'PP_DIEUTRI', 'SO_NGAY_DTRI', 'MA_LOAI_RV', 'GHI_CHU',
      'MA_TTDV', 'NGAY_CT', 'MA_THE_TAM', 'HO_TEN_CHA', 'HO_TEN_ME', 'MA_THE_ME',
      'SO_NGAY_NGHI', 'NGOAITRU_TUNGAY', 'NGOAITRU_DENNGAY', 'DU_PHONG'
    ]
  },
  {
    id: 'XML8',
    tabLabel: 'Bảng 8',
    shortTitle: 'Tóm tắt HSBA (XML8)',
    fullTitle: 'Bảng 8 (XML8): Chỉ tiêu dữ liệu tóm tắt hồ sơ bệnh án',
    rootTag: 'CHI_TIEU_DU_LIEU_TOM_TAT_HO_SO_BENH_AN',
    defaultCdataFields: ['CHAN_DOAN_VAO', 'CHAN_DOAN_RV', 'QT_BENHLY', 'TOMTAT_KQ', 'PP_DIEUTRI', 'GHI_CHU'],
    defaultFields: [
      'MA_LK', 'MA_LOAI_KCB', 'HO_TEN_CHA', 'HO_TEN_ME', 'NGUOI_GIAM_HO', 'DON_VI',
      'NGAY_VAO', 'NGAY_RA', 'CHAN_DOAN_VAO', 'CHAN_DOAN_RV', 'QT_BENHLY',
      'TOMTAT_KQ', 'PP_DIEUTRI', 'NGAY_SINHCON', 'NGAY_CHETCON', 'SO_CONCHET',
      'TT_RAVIEN', 'GHI_CHU', 'MA_TTDV', 'NGAY_CT', 'MA_THE_TAM', 'DU_PHONG'
    ]
  },
  {
    id: 'XML9',
    tabLabel: 'Bảng 9',
    shortTitle: 'Giấy chứng sinh (XML9)',
    fullTitle: 'Bảng 9 (XML9): Chỉ tiêu dữ liệu giấy chứng sinh',
    rootTag: 'CHI_TIEU_DU_LIEU_GIAY_CHUNG_SINH',
    listTag: 'DSACH_GIAY_CHUNG_SINH',
    itemTag: 'DU_LIEU_GIAY_CHUNG_SINH',
    defaultCdataFields: ['HOTEN_NND', 'NOI_DK_THUONGTRU_NND', 'HO_TEN_CHA', 'TEN_CON', 'TINH_TRANG_CON', 'NGUOI_DO_DE', 'NGUOI_GHI_PHIEU'],
    defaultFields: [
      'MA_LK', 'MA_BHXH_NND', 'MA_THE_NND', 'HOTEN_NND', 'NGAYSINH_NND', 'MA_DANTOC_NND',
      'SO_CCCD_NND', 'NGAYCAP_CCCD_NND', 'NOICAP_CCCD_NND', 'NOI_DK_THUONGTRU_NND',
      'MATINH_CU_TRU', 'MAHUYEN_CU_TRU', 'MAXA_CU_TRU', 'HO_TEN_CHA', 'MA_THE_TAM',
      'TEN_CON', 'GIOI_TINH_CON', 'SO_CON', 'LAN_SINH', 'SO_CON_SONG', 'CAN_NANG_CON',
      'NGAY_SINH_CON', 'NOI_SINH_CON', 'TINH_TRANG_CON', 'SINHCON_PHAUTHUAT',
      'SINHCON_DUOI32TUAN', 'GHI_CHU', 'NGUOI_DO_DE', 'NGUOI_GHI_PHIEU', 'NGAY_CT',
      'SO', 'QUYEN_SO', 'MA_TTDV', 'DU_PHONG'
    ]
  },
  {
    id: 'XML10',
    tabLabel: 'Bảng 10',
    shortTitle: 'Giấy nghỉ dưỡng thai (XML10)',
    fullTitle: 'Bảng 10 (XML10): Chỉ tiêu dữ liệu giấy chứng nhận nghỉ dưỡng thai',
    rootTag: 'CHI_TIEU_DU_LIEU_GIAY_NGHI_DUONG_THAI',
    defaultCdataFields: ['CHAN_DOAN_RV', 'PP_DIEUTRI'],
    defaultFields: [
      'MA_LK', 'SO_SERI', 'SO_CT', 'SO_NGAY', 'DON_VI', 'CHAN_DOAN_RV', 'TU_NGAY',
      'DEN_NGAY', 'MA_TTDV', 'TEN_BS', 'MA_BS', 'NGAY_CT', 'DU_PHONG'
    ]
  },
  {
    id: 'XML11',
    tabLabel: 'Bảng 11',
    shortTitle: 'Nghỉ việc hưởng BHXH (XML11)',
    fullTitle: 'Bảng 11 (XML11): Chỉ tiêu dữ liệu giấy chứng nhận nghỉ việc hưởng BHXH',
    rootTag: 'CHI_TIEU_DU_LIEU_GIAY_CHUNG_NHAN_NGHI_VIEC_HUONG_BAO_HIEM_XA_HOI',
    defaultCdataFields: ['DON_VI', 'CHAN_DOAN_RV', 'PP_DIEUTRI', 'HO_TEN_CHA', 'HO_TEN_ME'],
    defaultFields: [
      'MA_LK', 'SO_CT', 'SO_SERI', 'SO_KCB', 'DON_VI', 'MA_BHXH', 'MA_THE_BHYT',
      'CHAN_DOAN_RV', 'PP_DIEUTRI', 'MA_DINH_CHI_THAI', 'NGUYENNHAN_DINHCHI',
      'TUOI_THAI', 'SO_NGAY_NGHI', 'TU_NGAY', 'DEN_NGAY', 'HO_TEN_CHA', 'HO_TEN_ME',
      'MA_TTDV', 'MA_BS', 'NGAY_CT', 'MA_THE_TAM', 'MAU_SO', 'DU_PHONG'
    ]
  },
  {
    id: 'XML12',
    tabLabel: 'Bảng 12',
    shortTitle: 'Giám định Y khoa (XML12)',
    fullTitle: 'Bảng 12 (XML12): Chỉ tiêu dữ liệu biên bản giám định y khoa',
    rootTag: 'CHI_TIEU_DU_LIEU_GIAM_DINH_Y_KHOA',
    defaultCdataFields: ['NGUOI_CHU_TRI', 'HO_TEN', 'DIA_CHI', 'KET_LUAN'],
    defaultFields: [
      'NGUOI_CHU_TRI', 'CHUC_VU', 'NGAY_HOP', 'HO_TEN', 'NGAY_SINH', 'SO_CCCD',
      'NGAY_CAP_CCCD', 'NOI_CAP_CCCD', 'DIA_CHI', 'MATINH_CU_TRU', 'MAHUYEN_CU_TRU',
      'MAXA_CU_TRU', 'MA_BHXH', 'MA_THE_BHYT', 'NGHE_NGHIEP', 'DIEN_THOAI', 'MA_DOI_TUONG',
      'KHAM_GIAM_DINH', 'SO_BIEN_BAN', 'TYLE_TTCT_CU', 'DANG_HUONG_CHE_DO', 'NGAY_CHUNG_TU',
      'SO_GIAY_GIOI_THIEU', 'NGAY_DE_NGHI', 'MA_DONVI', 'GIOI_THIEU_CUA', 'KET_QUA_KHAM',
      'SO_VAN_BAN_CAN_CU', 'TYLE_TTCT_MOI', 'TONG_TYLE_TTCT', 'DANG_KHUYET_TAT',
      'MUC_DO_KHUYET_TAT', 'DE_NGHI', 'DUOC_XACDINH', 'DU_PHONG'
    ]
  },
  {
    id: 'XML13',
    tabLabel: 'Bảng 13',
    shortTitle: 'Giấy chuyển tuyến (XML13)',
    fullTitle: 'Bảng 13 (XML13): Chỉ tiêu dữ liệu giấy chuyển tuyến KCB BHYT',
    rootTag: 'CHI_TIEU_GIAY_CHUYEN_TUYEN',
    defaultCdataFields: ['HO_TEN', 'DIA_CHI', 'DAU_HIEU_LS', 'KQ_XN_CLS', 'CHAN_DOAN_RV', 'PP_DIEUTRI', 'TINH_TRANG_CT', 'HUONG_DIEU_TRI'],
    defaultFields: [
      'MA_LK', 'SO_HOSO', 'SO_CHUYENTUYEN', 'GIAY_CHUYEN_TUYEN', 'MA_CSKCB', 'MA_NOI_DI',
      'MA_NOI_DEN', 'HO_TEN', 'NGAY_SINH', 'GIOI_TINH', 'MA_QUOCTICH', 'MA_DANTOC',
      'MA_NGHE_NGHIEP', 'DIA_CHI', 'MATINH_CU_TRU', 'MAHUYEN_CU_TRU', 'MAXA_CU_TRU',
      'MA_THE_BHYT', 'GT_THE_TU', 'GT_THE_DEN', 'NGAY_VAO', 'NGAY_VAO_NOI_TRU', 'NGAY_RA',
      'DAU_HIEU_LS', 'KQ_XN_CLS', 'CHAN_DOAN_RV', 'PP_DIEUTRI', 'MA_BENH_CHINH',
      'MA_BENH_KT', 'MA_BENH_YHCT', 'TEN_DICH_VU', 'TEN_THUOC', 'PP_DIEU_TRI',
      'MA_LOAI_RV', 'MA_LYDO_CT', 'HUONG_DIEU_TRI', 'PHUONG_TIEN_VC', 'HOTEN_NGUOI_HT',
      'CHUCDANH_NGUOI_HT', 'MA_BAC_SI', 'MA_TTDV', 'DU_PHONG'
    ]
  },
  {
    id: 'XML14',
    tabLabel: 'Bảng 14',
    shortTitle: 'Phiếu hẹn khám lại (XML14)',
    fullTitle: 'Bảng 14 (XML14): Chỉ tiêu dữ liệu phiếu hẹn khám lại',
    rootTag: 'CHI_TIEU_PHIEU_HEN_KHAM_LAI',
    defaultCdataFields: ['HO_TEN', 'DIA_CHI', 'CHAN_DOAN_RV'],
    defaultFields: [
      'MA_LK', 'SO_GIAYHEN_KL', 'MA_CSKCB', 'HO_TEN', 'NGAY_SINH', 'GIOI_TINH',
      'DIA_CHI', 'MA_THE_BHYT', 'GT_THE_TU', 'GT_THE_DEN', 'NGAY_VAO', 'NGAY_VAO_NOI_TRU',
      'NGAY_RA', 'NGAY_HEN_KL', 'CHAN_DOAN_RV', 'MA_BENH_CHINH', 'MA_BENH_KT',
      'MA_BENH_YHCT', 'MA_DOITUONG_KCB', 'MA_BAC_SI', 'MA_TTDV', 'NGAY_CT', 'DU_PHONG'
    ]
  },
  {
    id: 'XML15',
    tabLabel: 'Bảng 15',
    shortTitle: 'Điều trị bệnh Lao (XML15)',
    fullTitle: 'Bảng 15 (XML15): Chỉ tiêu dữ liệu điều trị bệnh Lao',
    rootTag: 'CHITIEU_DIEU_TRI_BENH_LAO',
    listTag: 'DSACH_CHITIEU_DIEU_TRI_BENH_LAO',
    itemTag: 'CHITIEU_DIEU_TRI_BENH_LAO',
    defaultCdataFields: ['HO_TEN', 'CHAN_DOAN_RV'],
    defaultFields: [
      'MA_LK', 'STT', 'MA_BN', 'HO_TEN', 'SO_CCCD', 'PHANLOAI_LAO_VITRI',
      'PHANLOAI_LAO_TIENSU', 'PHANLOAI_LAO_HIV', 'PHANLOAI_LAO_VK', 'PHANLOAI_LAO_KT',
      'LOAI_DTRI_LAO', 'NGAYBD_DTRI_LAO', 'PHACDO_DTRI_LAO', 'NGAYKT_DTRI_LAO',
      'KQ_DTRI_LAO', 'MA_CSKCB', 'NGAYKD_HIV', 'BDDT_ARV', 'NGAY_BAT_DAU_DT_CTX',
      'DU_PHONG'
    ]
  }
];

export const FIELD_LABELS_3176: Record<string, string> = {
  MA_LK: 'Mã liên kết',
  STT: 'STT',
  MA_BN: 'Mã bệnh nhân',
  HO_TEN: 'Họ và tên',
  SO_CCCD: 'Số CCCD/ĐDCN',
  NGAY_SINH: 'Ngày sinh',
  GIOI_TINH: 'Giới tính (1:Nam, 2:Nữ)',
  NHOM_MAU: 'Nhóm máu',
  MA_QUOCTICH: 'Mã quốc tịch',
  MA_DANTOC: 'Mã dân tộc',
  MA_NGHE_NGHIEP: 'Mã nghề nghiệp',
  DIA_CHI: 'Địa chỉ',
  MATINH_CU_TRU: 'Mã tỉnh cư trú',
  MAHUYEN_CU_TRU: 'Mã huyện cư trú',
  MAXA_CU_TRU: 'Mã xã cư trú',
  DIEN_THOAI: 'Điện thoại',
  MA_THE_BHYT: 'Mã thẻ BHYT',
  MA_DKBD: 'Mã ĐKBĐ',
  GT_THE_TU: 'Giá trị thẻ từ',
  GT_THE_DEN: 'Giá trị thẻ đến',
  NGAY_MIEN_CCT: 'Ngày miễn cùng chi trả',
  LY_DO_VV: 'Lý do vào viện',
  LY_DO_VNT: 'Lý do vào nội trú',
  MA_LY_DO_VNT: 'Mã lý do VNT',
  CHAN_DOAN_VAO: 'Chẩn đoán vào viện',
  CHAN_DOAN_RV: 'Chẩn đoán ra viện',
  MA_BENH_CHINH: 'Mã bệnh chính (ICD-10)',
  MA_BENH_KT: 'Mã bệnh kèm theo',
  MA_BENH_YHCT: 'Mã bệnh YHCT',
  MA_PTTT_QT: 'Mã PTTT quốc tế',
  MA_DOITUONG_KCB: 'Mã đối tượng KCB',
  MA_NOI_DI: 'Mã nơi chuyển đi',
  MA_NOI_DEN: 'Mã nơi chuyển đến',
  MA_TAI_NAN: 'Mã tai nạn',
  NGAY_VAO: 'Ngày giờ vào viện',
  NGAY_VAO_NOI_TRU: 'Ngày giờ vào nội trú',
  NGAY_RA: 'Ngày giờ ra viện',
  GIAY_CHUYEN_TUYEN: 'Số giấy chuyển tuyến',
  SO_NGAY_DTRI: 'Số ngày điều trị',
  PP_DIEU_TRI: 'Phương pháp điều trị',
  PP_DIEUTRI: 'Phương pháp điều trị',
  KET_QUA_DTRI: 'Kết quả điều trị',
  MA_LOAI_RV: 'Mã loại ra viện',
  GHI_CHU: 'Ghi chú',
  NGAY_TTOAN: 'Ngày giờ thanh toán',
  T_THUOC: 'Tổng tiền thuốc',
  T_VTYT: 'Tổng tiền VTYT',
  T_TONGCHI_BV: 'Tổng chi phí BV',
  T_TONGCHI_BH: 'Tổng chi phí BH',
  T_BNTT: 'Bệnh nhân tự trả',
  T_BNCCT: 'BN cùng chi trả',
  T_BHTT: 'Quỹ BHYT thanh toán',
  T_NGUONKHAC: 'Nguồn khác',
  T_BHTT_GDV: 'BHTT giám định viên',
  NAM_QT: 'Năm quyết toán',
  THANG_QT: 'Tháng quyết toán',
  MA_LOAI_KCB: 'Mã loại KCB',
  MA_KHOA: 'Mã khoa',
  MA_CSKCB: 'Mã CSKCB',
  MA_KHUVUC: 'Mã khu vực',
  CAN_NANG: 'Cân nặng (kg)',
  CAN_NANG_CON: 'Cân nặng con (g)',
  NAM_NAM_LIEN_TUC: 'Ngày đủ 5 năm liên tục',
  NGAY_TAI_KHAM: 'Ngày tái khám',
  MA_HSBA: 'Mã hồ sơ bệnh án',
  MA_TTDV: 'Mã thủ trưởng đơn vị',
  DU_PHONG: 'Dự phòng',
  MA_THUOC: 'Mã thuốc',
  TEN_THUOC: 'Tên thuốc',
  DON_VI_TINH: 'Đơn vị tính',
  HAM_LUONG: 'Hàm lượng',
  DUONG_DUNG: 'Đường dùng',
  DANG_BAO_CHE: 'Dạng bào chế',
  LIEU_DUNG: 'Liều dùng',
  CACH_DUNG: 'Cách dùng',
  SO_DANG_KY: 'Số đăng ký',
  TT_THAU: 'Thông tin thầu',
  PHAM_VI: 'Phạm vi',
  TYLE_TT_BH: 'Tỷ lệ TT BHYT (%)',
  SO_LUONG: 'Số lượng',
  DON_GIA: 'Đơn giá',
  DON_GIA_BV: 'Đơn giá BV',
  DON_GIA_BH: 'Đơn giá BH',
  THANH_TIEN_BV: 'Thành tiền BV',
  THANH_TIEN_BH: 'Thành tiền BH',
  MUC_HUONG: 'Mức hưởng (%)',
  MA_BAC_SI: 'Mã bác sĩ (CCHN)',
  MA_DICH_VU: 'Mã dịch vụ',
  TEN_DICH_VU: 'Tên dịch vụ kỹ thuật',
  MA_VAT_TU: 'Mã vật tư',
  TEN_VAT_TU: 'Tên vật tư y tế',
  NGAY_YL: 'Ngày giờ y lệnh',
  NGAY_TH_YL: 'Ngày giờ thực hiện YL',
  NGAY_KQ: 'Ngày giờ kết quả',
  MA_CHI_SO: 'Mã chỉ số CLS',
  TEN_CHI_SO: 'Tên chỉ số CLS',
  GIA_TRI: 'Giá trị kết quả',
  DON_VI_DO: 'Đơn vị đo',
  MO_TA: 'Mô tả kết quả',
  KET_LUAN: 'Kết luận',
  MA_BS_DOC_KQ: 'Mã BS đọc kết quả',
  DIEN_BIEN_LS: 'Diễn biến lâm sàng',
  GIAI_DOAN_BENH: 'Giai đoạn bệnh',
  HOI_CHAN: 'Hội chẩn',
  PHAU_THUAT: 'Phẫu thuật',
  THOI_DIEM_DBLS: 'Thời điểm diễn biến',
  NGUOI_THUC_HIEN: 'Người thực hiện',
  SO_LUU_TRU: 'Số lưu trữ',
  MA_YTE: 'Mã y tế',
  MA_KHOA_RV: 'Mã khoa ra viện',
  NGAY_CT: 'Ngày chứng từ',
  HO_TEN_CHA: 'Họ tên cha',
  HO_TEN_ME: 'Họ tên mẹ',
  SO_NGAY_NGHI: 'Số ngày nghỉ',
  SO_CT: 'Số chứng từ',
  SO_SERI: 'Số seri',
  SO_KCB: 'Số KCB',
  DON_VI: 'Đơn vị công tác',
  MA_BHXH: 'Mã số BHXH',
  TU_NGAY: 'Từ ngày',
  DEN_NGAY: 'Đến ngày',
  MA_BS: 'Mã bác sĩ',
  TEN_BS: 'Tên bác sĩ',
  MAU_SO: 'Mẫu số',
};

export interface Xml3176Row {
  rowId: string;
  hosoIndex: number;       // Hồ sơ thứ mấy trong <DANHSACHHOSO> (0-based)
  fileHosoIndex: number;   // FILEHOSO thứ mấy trong <HOSO> (0-based)
  itemIndex: number;       // Dòng thứ mấy trong FILEHOSO (0-based)
  tableId: Xml3176TableId;
  maLk: string;
  hoTen: string;
  fields: Record<string, string>;
  fieldOrder: string[];
  cdataTags: string[];
}

export interface Xml3176FileHosoNode {
  hosoIndex: number;
  fileHosoIndex: number;
  loaiHoso: Xml3176TableId;
  originalBase64: string;
  decodedXml: string;
  xmlDeclaration: string;
  rootTag: string;
  listTag?: string;
  itemTag?: string;
  isModified: boolean;
}

export interface Xml3176SignatureInfo {
  isSigned: boolean;
  rawChuKyDonViXml: string;
  signatureValue?: string;
  signingTime?: string;
  subjectName?: string;
  certificateBase64?: string;
  serialNumber?: string;
  signedHosoKey?: string; // Danh sách hosoIndex đã được ký trong gói này (VD: "0,1,2")
}

export interface Xml3176HosoSignState {
  hosoIndex: number;
  isSigned: boolean;
  isModified: boolean;
  signingTime?: string;
  subjectName?: string;
  rawChuKyDonViXml?: string;
  signedXmlContent?: string; // Lưu XML riêng nếu ký lẻ từng HS
}

export interface Xml3176ValidationError {
  id: string;
  severity: 'error' | 'warning';
  tableId: Xml3176TableId;
  hosoIndex: number;
  rowId?: string;
  maLk: string;
  hoTen: string;
  field: string;
  message: string;
}

export interface Xml3176ParsedDoc {
  fileName: string;
  maCskcb: string;
  ngayLap: string;
  soLuongHoSo: number;
  hasUtf8Bom: boolean;
  signature: Xml3176SignatureInfo;
  hosoSignStates: Record<number, Xml3176HosoSignState>; // Trạng thái ký số & chỉnh sửa của từng HOSO (hiển thị ở Bảng 1)
  hosoFiles: Xml3176FileHosoNode[][]; // Theo từng <HOSO>
  tables: Record<Xml3176TableId, Xml3176Row[]>;
  tableColumns: Record<Xml3176TableId, string[]>;
  errors: Xml3176ValidationError[];
}

/**
 * Giải mã Base64 sang chuỗi UTF-8 an toàn
 */
export function decodeBase64Utf8(b64: string): string {
  const clean = (b64 || '').replace(/\s+/g, '');
  if (!clean) return '';
  if (clean.startsWith('<')) return b64.trim();
  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return decoded.replace(/^\uFEFF/, '');
  } catch (err) {
    console.warn('decodeBase64Utf8 fallback:', err);
    return b64;
  }
}

/**
 * Mã hóa chuỗi UTF-8 sang Base64 (tùy chọn ngắt dòng 76 ký tự chuẩn MIME/BHXH)
 */
export function encodeUtf8Base64(text: string, wrapLines = false): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  const b64 = btoa(binary);
  if (!wrapLines) return b64;
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function unescapeXmlText(val: string): string {
  return val
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeXmlText(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tách các thẻ con cấp 1 bên trong 1 khối XML bản ghi (ví dụ bên trong <TONG_HOP> hoặc <CHI_TIET_THUOC>)
 */
function parseRecordBlock(blockXml: string): {
  fields: Record<string, string>;
  fieldOrder: string[];
  cdataTags: string[];
} {
  const fieldOrder: string[] = [];
  const cdataTags: string[] = [];
  const outFields: Record<string, string> = {};

  const tagRegex = /<([A-Za-z0-9_]+)(?:\s+[^>]*)?\/>|<([A-Za-z0-9_]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\2>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(blockXml)) !== null) {
    if (match[1]) {
      const tag = match[1];
      if (!(tag in outFields)) fieldOrder.push(tag);
      outFields[tag] = '';
    } else if (match[2]) {
      const tag = match[2];
      const rawInner = match[3] ?? '';
      if (!(tag in outFields)) fieldOrder.push(tag);
      const cdataMatch = rawInner.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
      if (cdataMatch) {
        cdataTags.push(tag);
        outFields[tag] = cdataMatch[1];
      } else {
        outFields[tag] = unescapeXmlText(rawInner.trim());
      }
    }
  }

  return { fields: outFields, fieldOrder, cdataTags };
}

/**
 * Phân tích nội dung XML của 1 FILEHOSO (sau khi giải mã Base64)
 */
function parseInnerFileHosoXml(
  decodedXml: string,
  tableId: Xml3176TableId,
  hosoIndex: number,
  fileHosoIndex: number
): {
  xmlDeclaration: string;
  rootTag: string;
  listTag?: string;
  itemTag?: string;
  rows: Xml3176Row[];
} {
  const meta = XML3176_TABLES.find(t => t.id === tableId) || XML3176_TABLES[0];
  const declMatch = decodedXml.match(/^\s*(<\?xml[^>]*\?>)/);
  const xmlDeclaration = declMatch ? declMatch[1] : '<?xml version="1.0" encoding="utf-8" ?>';
  const body = decodedXml.replace(/^\s*<\?xml[^>]*\?>\s*/, '');

  const rootMatch = body.match(/^<([A-Za-z0-9_]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>\s*$/);
  const rootTag = rootMatch ? rootMatch[1] : meta.rootTag;
  const rootInner = rootMatch ? rootMatch[2] : body;

  const dsachMatch = rootInner.match(/^\s*<(DSACH_[A-Za-z0-9_]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>\s*$/);
  let listTag: string | undefined = meta.listTag;
  let itemTag: string | undefined = meta.itemTag;
  const rows: Xml3176Row[] = [];

  if (dsachMatch) {
    listTag = dsachMatch[1];
    const listInner = dsachMatch[2];
    const firstItemMatch = listInner.match(/<([A-Za-z0-9_]+)(?:\s+[^>]*)?>/);
    itemTag = firstItemMatch ? firstItemMatch[1] : meta.itemTag;
    if (itemTag) {
      const itemRegex = new RegExp(`<${itemTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${itemTag}>`, 'g');
      let m: RegExpExecArray | null;
      let itemIdx = 0;
      while ((m = itemRegex.exec(listInner)) !== null) {
        const parsed = parseRecordBlock(m[1]);
        rows.push({
          rowId: `${tableId}-H${hosoIndex}-F${fileHosoIndex}-R${itemIdx}`,
          hosoIndex,
          fileHosoIndex,
          itemIndex: itemIdx,
          tableId,
          maLk: parsed.fields.MA_LK || '',
          hoTen: parsed.fields.HO_TEN || parsed.fields.HOTEN_NND || '',
          fields: parsed.fields,
          fieldOrder: parsed.fieldOrder,
          cdataTags: parsed.cdataTags,
        });
        itemIdx++;
      }
    }
  } else {
    const parsed = parseRecordBlock(rootInner);
    if (parsed.fieldOrder.length > 0) {
      rows.push({
        rowId: `${tableId}-H${hosoIndex}-F${fileHosoIndex}-R0`,
        hosoIndex,
        fileHosoIndex,
        itemIndex: 0,
        tableId,
        maLk: parsed.fields.MA_LK || '',
        hoTen: parsed.fields.HO_TEN || parsed.fields.HOTEN_NND || '',
        fields: parsed.fields,
        fieldOrder: parsed.fieldOrder,
        cdataTags: parsed.cdataTags,
      });
    }
  }

  return { xmlDeclaration, rootTag, listTag, itemTag, rows };
}

/**
 * Dựng lại chuỗi XML con của 1 FILEHOSO từ danh sách dòng hiện tại (đã bao gồm mọi chỉnh sửa của người dùng)
 */
export function buildInnerFileHosoXml(
  node: Xml3176FileHosoNode,
  rows: Xml3176Row[]
): string {
  const meta = XML3176_TABLES.find(t => t.id === node.loaiHoso);
  const defaultCdata = new Set(meta?.defaultCdataFields || []);
  const decl = node.xmlDeclaration || '<?xml version="1.0" encoding="utf-8" ?>';
  const rootTag = node.rootTag || meta?.rootTag || node.loaiHoso;
  const listTag = node.listTag || meta?.listTag;
  const itemTag = node.itemTag || meta?.itemTag;

  const renderFieldLine = (tag: string, val: string, cdataSet: Set<string>, indent: string): string => {
    const safeVal = val ?? '';
    if (safeVal === '') {
      return `${indent}<${tag} />`;
    }
    if (cdataSet.has(tag) || defaultCdata.has(tag)) {
      return `${indent}<${tag}><![CDATA[${safeVal}]]></${tag}>`;
    }
    return `${indent}<${tag}>${escapeXmlText(safeVal)}</${tag}>`;
  };

  if (listTag && itemTag) {
    const itemsXml = rows
      .map(r => {
        const cdataSet = new Set(r.cdataTags);
        const allKeys = [...r.fieldOrder];
        for (const k of Object.keys(r.fields)) {
          if (!allKeys.includes(k)) allKeys.push(k);
        }
        const lines = allKeys.map(k => renderFieldLine(k, r.fields[k] ?? '', cdataSet, '      '));
        return `    <${itemTag}>\r\n${lines.join('\r\n')}\r\n    </${itemTag}>`;
      })
      .join('\r\n');
    return `${decl}\r\n<${rootTag}>\r\n  <${listTag}>\r\n${itemsXml}\r\n  </${listTag}>\r\n</${rootTag}>`;
  } else {
    const r = rows[0];
    if (!r) {
      return `${decl}\r\n<${rootTag} />`;
    }
    const cdataSet = new Set(r.cdataTags);
    const allKeys = [...r.fieldOrder];
    for (const k of Object.keys(r.fields)) {
      if (!allKeys.includes(k)) allKeys.push(k);
    }
    const lines = allKeys.map(k => renderFieldLine(k, r.fields[k] ?? '', cdataSet, '  '));
    return `${decl}\r\n<${rootTag}>\r\n${lines.join('\r\n')}\r\n</${rootTag}>`;
  }
}

/**
 * Kiểm tra logic & quy tắc chuẩn 3176/130 để hiển thị vào tab "Bảng lỗi"
 */
export function validateXml3176Doc(doc: Xml3176ParsedDoc): Xml3176ValidationError[] {
  const errors: Xml3176ValidationError[] = [];
  let errSeq = 1;

  const addError = (
    severity: 'error' | 'warning',
    tableId: Xml3176TableId,
    hosoIndex: number,
    maLk: string,
    hoTen: string,
    field: string,
    message: string,
    rowId?: string
  ) => {
    errors.push({
      id: `ERR-${errSeq++}`,
      severity,
      tableId,
      hosoIndex,
      rowId,
      maLk,
      hoTen,
      field,
      message,
    });
  };

  if (!doc.maCskcb || doc.maCskcb.trim().length < 5) {
    addError('error', 'XML1', 0, '', '', 'MACSKCB', 'Thiếu hoặc sai định dạng Mã CSKCB trong thẻ <THONGTINDONVI>');
  }

  const xml2ByHoso = new Map<number, Xml3176Row[]>();
  for (const r of doc.tables.XML2) {
    const arr = xml2ByHoso.get(r.hosoIndex) || [];
    arr.push(r);
    xml2ByHoso.set(r.hosoIndex, arr);
  }
  const xml3ByHoso = new Map<number, Xml3176Row[]>();
  for (const r of doc.tables.XML3) {
    const arr = xml3ByHoso.get(r.hosoIndex) || [];
    arr.push(r);
    xml3ByHoso.set(r.hosoIndex, arr);
  }

  for (const row of doc.tables.XML1) {
    const f = row.fields;
    const maLk = f.MA_LK || `(Hồ sơ #${row.hosoIndex + 1})`;
    const hoTen = f.HO_TEN || '';

    const requiredXml1 = ['MA_LK', 'HO_TEN', 'NGAY_SINH', 'GIOI_TINH', 'MA_BENH_CHINH', 'NGAY_VAO', 'NGAY_RA', 'MA_LOAI_KCB', 'MA_CSKCB'];
    for (const reqField of requiredXml1) {
      if (!f[reqField] || f[reqField].trim() === '') {
        addError('error', 'XML1', row.hosoIndex, maLk, hoTen, reqField, `Bảng 1 thiếu trường bắt buộc: ${reqField} (${FIELD_LABELS_3176[reqField] || reqField})`, row.rowId);
      }
    }

    if (f.NGAY_VAO && f.NGAY_RA && f.NGAY_RA < f.NGAY_VAO) {
      addError('error', 'XML1', row.hosoIndex, maLk, hoTen, 'NGAY_RA', `Ngày ra viện (${f.NGAY_RA}) nhỏ hơn Ngày vào viện (${f.NGAY_VAO})`, row.rowId);
    }

    const tThuocXml1 = Number(f.T_THUOC || 0);
    const rowsXml2 = xml2ByHoso.get(row.hosoIndex) || [];
    const sumThuocXml2 = rowsXml2.reduce((acc, r2) => acc + Number(r2.fields.THANH_TIEN_BV || 0), 0);
    if (Math.abs(tThuocXml1 - sumThuocXml2) > 1) {
      addError(
        'warning',
        'XML1',
        row.hosoIndex,
        maLk,
        hoTen,
        'T_THUOC',
        `Lệch tiền thuốc: T_THUOC ở Bảng 1 (${tThuocXml1.toLocaleString('vi-VN')}) ≠ Tổng THANH_TIEN_BV ở Bảng 2 (${sumThuocXml2.toLocaleString('vi-VN')})`,
        row.rowId
      );
    }

    const tTongChiBv = Number(f.T_TONGCHI_BV || 0);
    const rowsXml3 = xml3ByHoso.get(row.hosoIndex) || [];
    const sumDvktXml3 = rowsXml3.reduce((acc, r3) => acc + Number(r3.fields.THANH_TIEN_BV || 0), 0);
    if (Math.abs(tTongChiBv - (sumThuocXml2 + sumDvktXml3)) > 2) {
      addError(
        'warning',
        'XML1',
        row.hosoIndex,
        maLk,
        hoTen,
        'T_TONGCHI_BV',
        `Lệch tổng chi BV: T_TONGCHI_BV (${tTongChiBv.toLocaleString('vi-VN')}) ≠ Tổng Bảng 2 + Bảng 3 (${(sumThuocXml2 + sumDvktXml3).toLocaleString('vi-VN')})`,
        row.rowId
      );
    }

    const tBhtt = Number(f.T_BHTT || 0);
    const tBntt = Number(f.T_BNTT || 0);
    const tBncct = Number(f.T_BNCCT || 0);
    const tNguonKhac = Number(f.T_NGUONKHAC || 0);
    if (Math.abs(tTongChiBv - (tBhtt + tBntt + tBncct + tNguonKhac)) > 2) {
      addError(
        'warning',
        'XML1',
        row.hosoIndex,
        maLk,
        hoTen,
        'T_BHTT',
        `Tổng T_BHTT + T_BNTT + T_BNCCT + T_NGUONKHAC (${(tBhtt + tBntt + tBncct + tNguonKhac).toLocaleString('vi-VN')}) ≠ T_TONGCHI_BV (${tTongChiBv.toLocaleString('vi-VN')})`,
        row.rowId
      );
    }
  }

  for (const row of doc.tables.XML2) {
    const f = row.fields;
    if (!f.MA_THUOC) {
      addError('error', 'XML2', row.hosoIndex, row.maLk, row.hoTen, 'MA_THUOC', 'Bảng 2 thiếu Mã thuốc (MA_THUOC)', row.rowId);
    }
    if (!f.TEN_THUOC) {
      addError('error', 'XML2', row.hosoIndex, row.maLk, row.hoTen, 'TEN_THUOC', 'Bảng 2 thiếu Tên thuốc (TEN_THUOC)', row.rowId);
    }
    if (!f.MA_BAC_SI) {
      addError('warning', 'XML2', row.hosoIndex, row.maLk, row.hoTen, 'MA_BAC_SI', 'Bảng 2 thiếu Mã bác sĩ chỉ định (MA_BAC_SI)', row.rowId);
    }
  }

  for (const row of doc.tables.XML3) {
    const f = row.fields;
    if (!f.MA_DICH_VU && !f.MA_VAT_TU) {
      addError('error', 'XML3', row.hosoIndex, row.maLk, row.hoTen, 'MA_DICH_VU', 'Bảng 3 thiếu cả MA_DICH_VU và MA_VAT_TU', row.rowId);
    }
    if (!f.MA_BAC_SI) {
      addError('warning', 'XML3', row.hosoIndex, row.maLk, row.hoTen, 'MA_BAC_SI', 'Bảng 3 thiếu Mã bác sĩ chỉ định (MA_BAC_SI)', row.rowId);
    }
  }

  for (const row of doc.tables.XML7) {
    const f = row.fields;
    if (!f.CHAN_DOAN_RV) {
      addError('error', 'XML7', row.hosoIndex, row.maLk, row.hoTen, 'CHAN_DOAN_RV', 'Bảng 7 (Giấy ra viện) thiếu Chẩn đoán ra viện (CHAN_DOAN_RV)', row.rowId);
    }
    if (!f.MA_TTDV) {
      addError('warning', 'XML7', row.hosoIndex, row.maLk, row.hoTen, 'MA_TTDV', 'Bảng 7 (Giấy ra viện) thiếu Mã thủ trưởng đơn vị (MA_TTDV)', row.rowId);
    }
  }

  for (const row of doc.tables.XML11) {
    const f = row.fields;
    if (!f.TU_NGAY || !f.DEN_NGAY) {
      addError('error', 'XML11', row.hosoIndex, row.maLk, row.hoTen, 'TU_NGAY', 'Bảng 11 thiếu Từ ngày / Đến ngày nghỉ hưởng BHXH', row.rowId);
    }
    if (!f.MA_BS || !f.MA_TTDV) {
      addError('warning', 'XML11', row.hosoIndex, row.maLk, row.hoTen, 'MA_BS', 'Bảng 11 thiếu Mã bác sĩ (MA_BS) hoặc Mã thủ trưởng đơn vị (MA_TTDV)', row.rowId);
    }
  }

  return errors;
}

/**
 * Đọc và bóc tách toàn bộ file XML 3176 (<GIAMDINHHS> hoặc file XML1..XML15 đơn lẻ)
 */
export function parseXml3176(xmlContent: string, fileName = 'HOSO_3176.xml'): Xml3176ParsedDoc {
  const hasUtf8Bom = xmlContent.startsWith('\uFEFF');
  const cleanXml = xmlContent.replace(/^\uFEFF/, '');

  const maCskcbMatch = cleanXml.match(/<MACSKCB>([\s\S]*?)<\/MACSKCB>/i);
  const ngayLapMatch = cleanXml.match(/<NGAYLAP>([\s\S]*?)<\/NGAYLAP>/i);
  const soLuongMatch = cleanXml.match(/<SOLUONGHOSO>([\s\S]*?)<\/SOLUONGHOSO>/i);

  const chuKyMatch = cleanXml.match(/<CHUKYDONVI\s*\/>|<CHUKYDONVI>([\s\S]*?)<\/CHUKYDONVI>/i);
  const rawChuKyInner = chuKyMatch && chuKyMatch[1] ? chuKyMatch[1].trim() : '';
  const isSigned = rawChuKyInner.includes('<Signature') || rawChuKyInner.includes('SignatureValue');
  const sigValMatch = rawChuKyInner.match(/<SignatureValue[^>]*>([\s\S]*?)<\/SignatureValue>/i);
  const sigTimeMatch = rawChuKyInner.match(/<SigningTime[^>]*>([\s\S]*?)<\/SigningTime>/i);
  const subjMatch = rawChuKyInner.match(/<X509SubjectName[^>]*>([\s\S]*?)<\/X509SubjectName>/i);
  const certMatch = rawChuKyInner.match(/<X509Certificate[^>]*>([\s\S]*?)<\/X509Certificate>/i);

  const signature: Xml3176SignatureInfo = {
    isSigned,
    rawChuKyDonViXml: chuKyMatch ? chuKyMatch[0] : '<CHUKYDONVI />',
    signatureValue: sigValMatch ? sigValMatch[1].trim() : undefined,
    signingTime: sigTimeMatch ? sigTimeMatch[1].trim() : undefined,
    subjectName: subjMatch ? unescapeXmlText(subjMatch[1].trim()) : undefined,
    certificateBase64: certMatch ? certMatch[1].trim() : undefined,
  };

  const tables: Record<Xml3176TableId, Xml3176Row[]> = {
    XML1: [], XML2: [], XML3: [], XML4: [], XML5: [],
    XML6: [], XML7: [], XML8: [], XML9: [], XML10: [],
    XML11: [], XML12: [], XML13: [], XML14: [], XML15: [],
  };

  const tableColumns: Record<Xml3176TableId, string[]> = {
    XML1: [], XML2: [], XML3: [], XML4: [], XML5: [],
    XML6: [], XML7: [], XML8: [], XML9: [], XML10: [],
    XML11: [], XML12: [], XML13: [], XML14: [], XML15: [],
  };

  const hosoFiles: Xml3176FileHosoNode[][] = [];
  const hosoSignStates: Record<number, Xml3176HosoSignState> = {};

  const hosoRegex = /<HOSO(?:\s+[^>]*)?>([\s\S]*?)<\/HOSO>/gi;
  let hosoMatch: RegExpExecArray | null;
  let hosoIdx = 0;

  while ((hosoMatch = hosoRegex.exec(cleanXml)) !== null) {
    const hosoInner = hosoMatch[1];
    const fileNodesForHoso: Xml3176FileHosoNode[] = [];
    const fileRegex = /<FILEHOSO(?:\s+[^>]*)?>([\s\S]*?)<\/FILEHOSO>/gi;
    let fileMatch: RegExpExecArray | null;
    let fileIdx = 0;

    let hosoMaLk = '';
    let hosoHoTen = '';

    while ((fileMatch = fileRegex.exec(hosoInner)) !== null) {
      const fileInner = fileMatch[1];
      const loaiMatch = fileInner.match(/<LOAIHOSO>([\s\S]*?)<\/LOAIHOSO>/i);
      const noiDungMatch = fileInner.match(/<NOIDUNGFILE>([\s\S]*?)<\/NOIDUNGFILE>/i);

      const rawLoai = (loaiMatch ? loaiMatch[1].trim().toUpperCase() : 'XML1') as Xml3176TableId;
      const validLoai: Xml3176TableId = XML3176_TABLES.some(t => t.id === rawLoai) ? rawLoai : 'XML1';
      const originalBase64 = noiDungMatch ? noiDungMatch[1].trim() : '';
      const decodedXml = decodeBase64Utf8(originalBase64);

      const parsedInner = parseInnerFileHosoXml(decodedXml, validLoai, hosoIdx, fileIdx);

      if (validLoai === 'XML1' && parsedInner.rows[0]) {
        hosoMaLk = parsedInner.rows[0].fields.MA_LK || '';
        hosoHoTen = parsedInner.rows[0].fields.HO_TEN || '';
      }

      for (const r of parsedInner.rows) {
        if (!r.maLk && hosoMaLk) r.maLk = hosoMaLk;
        if (!r.hoTen && hosoHoTen) r.hoTen = hosoHoTen;
        tables[validLoai].push(r);

        const colList = tableColumns[validLoai];
        for (const col of r.fieldOrder) {
          if (!colList.includes(col)) colList.push(col);
        }
      }

      fileNodesForHoso.push({
        hosoIndex: hosoIdx,
        fileHosoIndex: fileIdx,
        loaiHoso: validLoai,
        originalBase64,
        decodedXml,
        xmlDeclaration: parsedInner.xmlDeclaration,
        rootTag: parsedInner.rootTag,
        listTag: parsedInner.listTag,
        itemTag: parsedInner.itemTag,
        isModified: false,
      });

      fileIdx++;
    }

    if (hosoMaLk || hosoHoTen) {
      for (const tId of Object.keys(tables) as Xml3176TableId[]) {
        for (const r of tables[tId]) {
          if (r.hosoIndex === hosoIdx) {
            if (!r.maLk) r.maLk = hosoMaLk;
            if (!r.hoTen) r.hoTen = hosoHoTen;
          }
        }
      }
    }

    hosoSignStates[hosoIdx] = {
      hosoIndex: hosoIdx,
      isSigned,
      isModified: false,
      signingTime: signature.signingTime,
      subjectName: signature.subjectName,
      rawChuKyDonViXml: isSigned ? signature.rawChuKyDonViXml : undefined,
    };

    hosoFiles.push(fileNodesForHoso);
    hosoIdx++;
  }

  for (const meta of XML3176_TABLES) {
    if (tableColumns[meta.id].length === 0) {
      tableColumns[meta.id] = [...meta.defaultFields];
    }
  }

  const allHosoKey = Array.from({ length: hosoFiles.length }, (_, i) => i).join(',');
  if (isSigned) {
    signature.signedHosoKey = allHosoKey;
  }

  const parsedDoc: Xml3176ParsedDoc = {
    fileName,
    maCskcb: maCskcbMatch ? maCskcbMatch[1].trim() : (tables.XML1[0]?.fields.MA_CSKCB || '49917'),
    ngayLap: ngayLapMatch ? ngayLapMatch[1].trim() : new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    soLuongHoSo: hosoFiles.length || (soLuongMatch ? Number(soLuongMatch[1].trim()) : 0),
    hasUtf8Bom,
    signature,
    hosoSignStates,
    hosoFiles,
    tables,
    tableColumns,
    errors: [],
  };

  parsedDoc.errors = validateXml3176Doc(parsedDoc);
  return parsedDoc;
}

/**
 * Xây dựng lại file XML 3176 chuẩn <GIAMDINHHS> (Có ký số hoặc Không ký số)
 * - LUÔN LUÔN lấy dữ liệu mới nhất đã được chỉnh sửa trong doc.tables (Bảng 1 -> Bảng 15) để dựng lại XML con & mã hóa Base64 UTF-8
 * - Hỗ trợ lọc theo danh sách hồ sơ được tích chọn ở Bảng 1 (selectedHosoIndices)
 * - Đặt thẻ <CHUKYDONVI /> hoặc <CHUKYDONVI><Signature>...</Signature></CHUKYDONVI> đúng vị trí cuối trước </GIAMDINHHS>
 */
export function buildXml3176(
  doc: Xml3176ParsedDoc,
  options?: {
    includeSignature?: boolean;
    customChuKyDonViXml?: string;
    selectedHosoIndices?: number[];
    encodeBase64?: boolean; // Mặc định true (Base64 chuẩn cổng), nếu false sẽ xuất XML giải mã rõ toàn bộ các thẻ bên trong <NOIDUNGFILE>
  }
): string {
  const includeSig = options?.includeSignature ?? false;
  const shouldEncodeBase64 = options?.encodeBase64 ?? true;
  const bom = doc.hasUtf8Bom ? '\uFEFF' : '';
  const selectedSet =
    options?.selectedHosoIndices && options.selectedHosoIndices.length > 0
      ? new Set(options.selectedHosoIndices)
      : null;

  const hosoBlocks: string[] = [];

  for (let hIdx = 0; hIdx < doc.hosoFiles.length; hIdx++) {
    if (selectedSet && !selectedSet.has(hIdx)) continue;

    const filesInHoso = doc.hosoFiles[hIdx];
    if (!filesInHoso || filesInHoso.length === 0) continue;

    const fileHosoXmlList: string[] = [];

    for (const fNode of filesInHoso) {
      const rowsForFile = doc.tables[fNode.loaiHoso].filter(
        r => r.hosoIndex === fNode.hosoIndex && r.fileHosoIndex === fNode.fileHosoIndex
      );

      if (rowsForFile.length === 0) {
        continue;
      }

      // LUÔN LUÔN dựng lại nội dung XML con từ dữ liệu hiện tại trên bảng (đảm bảo 100% nội dung xuất XML là nội dung đã được sửa)
      const rebuiltInnerXml = buildInnerFileHosoXml(fNode, rowsForFile);

      if (shouldEncodeBase64) {
        // Chuẩn file đã lên cổng BHXH: Base64 nằm trên MỘT DÒNG duy nhất, các thẻ không thụt lề
        const b64Content = encodeUtf8Base64(rebuiltInnerXml, false);
        fileHosoXmlList.push(
          `<FILEHOSO>\n` +
          `<LOAIHOSO>${fNode.loaiHoso}</LOAIHOSO>\n` +
          `<NOIDUNGFILE>${b64Content}</NOIDUNGFILE>\n` +
          `</FILEHOSO>`
        );
      } else {
        // Xuất XML KHÔNG MÃ HÓA: hiển thị trực tiếp đầy đủ các thẻ XML của Bảng 1..15 bên trong <NOIDUNGFILE>
        const innerWithoutDecl = rebuiltInnerXml
          .replace(/^\s*<\?xml[^>]*\?>\s*/, '')
          .split(/\r?\n/)
          .map(line => `                        ${line}`)
          .join('\n');
        fileHosoXmlList.push(
          `                <FILEHOSO>\n` +
          `                    <LOAIHOSO>${fNode.loaiHoso}</LOAIHOSO>\n` +
          `                    <NOIDUNGFILE>\n${innerWithoutDecl}\n                    </NOIDUNGFILE>\n` +
          `                </FILEHOSO>`
        );
      }
    }

    if (fileHosoXmlList.length > 0) {
      hosoBlocks.push(
        shouldEncodeBase64
          ? `<HOSO>\n${fileHosoXmlList.join('\n')}\n</HOSO>`
          : `            <HOSO>\n` +
            `${fileHosoXmlList.join('\n')}\n` +
            `            </HOSO>`
      );
    }
  }

  let chuKyLine = shouldEncodeBase64 ? '<CHUKYDONVI />' : '    <CHUKYDONVI />';
  const chuKyIndent = shouldEncodeBase64 ? '' : '    ';
  if (includeSig) {
    if (options?.customChuKyDonViXml) {
      chuKyLine = `${chuKyIndent}${options.customChuKyDonViXml.trim()}`;
    } else if (selectedSet && selectedSet.size === 1) {
      const onlyIdx = Array.from(selectedSet)[0];
      const st = doc.hosoSignStates[onlyIdx];
      if (st?.isSigned && st.rawChuKyDonViXml) {
        chuKyLine = `${chuKyIndent}${st.rawChuKyDonViXml.trim()}`;
      } else if (doc.signature.isSigned && doc.signature.rawChuKyDonViXml) {
        chuKyLine = `${chuKyIndent}${doc.signature.rawChuKyDonViXml.trim()}`;
      }
    } else if (doc.signature.isSigned && doc.signature.rawChuKyDonViXml) {
      chuKyLine = `${chuKyIndent}${doc.signature.rawChuKyDonViXml.trim()}`;
    }
  }

  if (shouldEncodeBase64) {
    // Định dạng giống file đã lên cổng BHXH: có xmlns:xsd/xsi, không thụt lề, Base64 một dòng
    return (
      `${bom}<?xml version="1.0" encoding="utf-8"?>\n` +
      `<GIAMDINHHS xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n` +
      `<THONGTINDONVI>\n` +
      `<MACSKCB>${escapeXmlText(doc.maCskcb)}</MACSKCB>\n` +
      `</THONGTINDONVI>\n` +
      `<THONGTINHOSO>\n` +
      `<NGAYLAP>${escapeXmlText(doc.ngayLap)}</NGAYLAP>\n` +
      `<SOLUONGHOSO>${hosoBlocks.length}</SOLUONGHOSO>\n` +
      `<DANHSACHHOSO>\n` +
      `${hosoBlocks.join('\n')}\n` +
      `</DANHSACHHOSO>\n` +
      `</THONGTINHOSO>\n` +
      `${chuKyLine}\n` +
      `</GIAMDINHHS>`
    );
  }

  const xmlOut =
    `${bom}<?xml version="1.0" encoding="utf-8"?>\n` +
    `<GIAMDINHHS>\n` +
    `    <THONGTINDONVI>\n` +
    `        <MACSKCB>${escapeXmlText(doc.maCskcb)}</MACSKCB>\n` +
    `    </THONGTINDONVI>\n` +
    `    <THONGTINHOSO>\n` +
    `        <NGAYLAP>${escapeXmlText(doc.ngayLap)}</NGAYLAP>\n` +
    `        <SOLUONGHOSO>${hosoBlocks.length}</SOLUONGHOSO>\n` +
    `        <DANHSACHHOSO>\n` +
    `${hosoBlocks.join('\n')}\n` +
    `        </DANHSACHHOSO>\n` +
    `    </THONGTINHOSO>\n` +
    `${chuKyLine}\n` +
    `</GIAMDINHHS>`;

  return xmlOut;
}
