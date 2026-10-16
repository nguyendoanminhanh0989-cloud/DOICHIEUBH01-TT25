-- ==============================================================================
-- SCHEMA CHO HỆ THỐNG ĐỐI CHIẾU HỒ SƠ & CHỨNG TỪ BHXH (TT25 / TT12) TRÊN SUPABASE
-- ==============================================================================

-- 1. Bảng lưu trữ Hồ sơ chứng từ (CT03, CT04, CT05, CT06, CT07, KSK)
CREATE TABLE IF NOT EXISTS public.ho_so_chung_tu (
    id TEXT PRIMARY KEY,
    ma_cskcb TEXT NOT NULL,
    type TEXT NOT NULL,                         -- CT03, CT04, CT05, CT06, CT07, KHAM_SUC_KHOE
    ho_ten TEXT NOT NULL,
    ma_bhyt TEXT,
    ma_bhxh TEXT,
    cccd TEXT,
    khoa TEXT,
    icd TEXT,
    chan_doan TEXT,
    nguoi_ky TEXT,
    cchn TEXT,
    trang_thai TEXT DEFAULT 'UNSIGNED',          -- UNSIGNED, SIGNED, SUBMITTED, INVALID_FORMAT
    errors JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    xml_content TEXT,
    ma_gd TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_ho_so_cskcb ON public.ho_so_chung_tu (ma_cskcb);
CREATE INDEX IF NOT EXISTS idx_ho_so_type ON public.ho_so_chung_tu (type);
CREATE INDEX IF NOT EXISTS idx_ho_so_trang_thai ON public.ho_so_chung_tu (trang_thai);
CREATE INDEX IF NOT EXISTS idx_ho_so_cccd ON public.ho_so_chung_tu (cccd);

-- 2. Bảng lưu trữ cấu hình Cơ sở Khám chữa bệnh & Tài khoản BHXH
CREATE TABLE IF NOT EXISTS public.cskcb_config (
    ma_cskcb TEXT PRIMARY KEY,
    ten_cskcb TEXT NOT NULL,
    tuyen TEXT,
    hang TEXT,
    dia_chi TEXT,
    bhxh_username TEXT,
    bhxh_password TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bật RLS (Row Level Security) và phân quyền cơ bản
ALTER TABLE public.ho_so_chung_tu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cskcb_config ENABLE ROW LEVEL SECURITY;

-- Cho phép người dùng ứng dụng (anon role) đọc và ghi dữ liệu chứng từ
CREATE POLICY "Cho phép anon thao tác hồ sơ chứng từ" 
ON public.ho_so_chung_tu 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Cho phép anon thao tác cấu hình CSKCB" 
ON public.cskcb_config 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
