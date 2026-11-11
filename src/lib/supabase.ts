/**
 * SUPABASE CLIENT & CLOUD SYNC SERVICE
 * Quản lý kết nối Supabase và đồng bộ dữ liệu Hồ sơ chứng từ TT25 lên đám mây
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { HoSoRecord } from './signAndSubmitService';

// Cấu hình mặc định dự án Supabase TT25
const DEFAULT_SUPABASE_URL = 'https://lfklyofxesbhmladfcbq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxma2x5b2Z4ZXNiaG1sYWRmY2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTg5MjgsImV4cCI6MjA5MjA3NDkyOH0.cJVlZIqF-30qcqP_BNkT3S7BpoXOGjQ2ZTK1Qj4bGUA';

// Đọc cấu hình từ biến môi trường Vite hoặc từ localStorage (cài đặt trực tiếp trên UI)
const getEnvConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
};

let supabaseInstance: SupabaseClient | null = null;
let supabaseInstanceUrl: string = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getEnvConfig();
  if (!url || !key) {
    return null;
  }

  // Reset instance nếu URL thay đổi (tránh dùng instance cũ với URL cũ)
  if (supabaseInstance && supabaseInstanceUrl !== url) {
    supabaseInstance = null;
    supabaseInstanceUrl = '';
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      supabaseInstanceUrl = url;
    } catch (err) {
      console.warn('Lỗi khởi tạo Supabase Client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', key.trim());
  supabaseInstance = null; // reset instance để tạo lại với URL/key mới
  supabaseInstanceUrl = '';
}

export function getSupabaseConfig(): { url: string; key: string } {
  return getEnvConfig();
}

export function isSupabaseConnected(): boolean {
  const { url, key } = getEnvConfig();
  return Boolean(url && key);
}

/**
 * Kiểm tra kết nối Supabase thực tế (ping bảng ho_so_chung_tu)
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Chưa cấu hình Supabase URL hoặc Anon Key' };
  }

  try {
    const { error } = await client.from('ho_so_chung_tu').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return { 
          success: false, 
          message: 'Kết nối Supabase thành công nhưng chưa tạo bảng "ho_so_chung_tu". Vui lòng chạy file SQL schema.' 
        };
      }
      return { success: false, message: `Lỗi kết nối: ${error.message}` };
    }
    return { success: true, message: 'Kết nối Supabase thành công!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Không thể kết nối tới Supabase' };
  }
}

/**
 * Kiểm tra kết nối Supabase tới bảng app_users (Quản lý người dùng)
 */
export async function testSupabaseUsersTableConnection(): Promise<{ success: boolean; message: string; tableReady?: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Chưa cấu hình Supabase URL hoặc Anon Key' };
  }

  try {
    const { error } = await client.from('app_users').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return { 
          success: false, 
          tableReady: false,
          message: 'Kết nối máy chủ Supabase thành công nhưng chưa tạo bảng "app_users". Hãy bấm nút "Sao chép SQL" bên dưới và dán vào SQL Editor trên Supabase để tạo bảng.' 
        };
      }
      const errStr = String(error.message || '');
      if (errStr.includes('Failed to fetch') || errStr.includes('NetworkError')) {
        return {
          success: false,
          message: 'Không thể kết nối đến máy chủ Supabase (Failed to fetch). Nguyên nhân: Dự án Supabase đang ở trạng thái TẠM DỪNG (PAUSED) do lâu ngày không có truy cập, hoặc tên miền URL không tồn tại. Vui lòng vào https://supabase.com/dashboard mở dự án và bấm "Restore project" (chờ 1-2 phút) hoặc nhập đúng URL/Key dự án mới.'
        };
      }
      return { success: false, message: `Lỗi kết nối Supabase: ${error.message}` };
    }
    return { success: true, tableReady: true, message: 'Kết nối cơ sở dữ liệu Supabase (bảng app_users) thành công 100%!' };
  } catch (err: any) {
    const rawMsg = String(err?.message || err || '');
    if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('fetch')) {
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ Supabase (Failed to fetch). Nguyên nhân: Dự án Supabase đang ở trạng thái TẠM DỪNG (PAUSED) do quá 7 ngày không có truy cập trên gói miễn phí, hoặc tên miền URL không tồn tại. Vui lòng vào https://supabase.com/dashboard mở dự án và bấm "Restore project" (chờ 1-2 phút) hoặc nhập đúng URL/Key dự án mới.',
      };
    }
    return { success: false, message: rawMsg || 'Không thể kết nối tới Supabase' };
  }
}

/**
 * Đồng bộ danh sách hồ sơ lên Supabase
 */
export async function syncRecordsToSupabase(records: HoSoRecord[], maCskcb: string): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, count: 0, error: 'Chưa cấu hình Supabase' };
  if (!records.length) return { success: true, count: 0 };

  try {
    const payload = records.map(r => ({
      id: r.id,
      ma_cskcb: maCskcb || '',
      type: r.type,
      ho_ten: r.hoTen,
      ma_bhyt: r.maBhyt || '',
      ma_bhxh: r.maBhxh || '',
      cccd: r.cccd || '',
      khoa: r.khoa || '',
      icd: r.icd || '',
      chan_doan: r.chanDoan || '',
      nguoi_ky: r.nguoiKy || '',
      cchn: r.cchn || '',
      trang_thai: r.trangThai || 'UNSIGNED',
      errors: r.errors || [],
      raw_data: r.rawData || {},
      xml_content: r.xmlContent || '',
      ma_gd: r.maGD || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('ho_so_chung_tu').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    return { success: true, count: records.length };
  } catch (err: any) {
    console.error('Lỗi sync records lên Supabase:', err);
    return { success: false, count: 0, error: err.message || 'Lỗi lưu dữ liệu' };
  }
}

/**
 * Tải danh sách hồ sơ từ Supabase
 */
export async function loadRecordsFromSupabase(maCskcb?: string): Promise<{ success: boolean; records: HoSoRecord[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, records: [], error: 'Chưa cấu hình Supabase' };

  try {
    let query = client
      .from('ho_so_chung_tu')
      .select('*')
      .neq('type', 'SYS_USER_ACCOUNT')
      .order('created_at', { ascending: false });
    if (maCskcb) {
      query = query.eq('ma_cskcb', maCskcb);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped: HoSoRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      hoTen: row.ho_ten,
      maBhyt: row.ma_bhyt,
      maBhxh: row.ma_bhxh,
      cccd: row.cccd,
      khoa: row.khoa,
      ngayVao: '',
      ngayRa: '',
      icd: row.icd,
      chanDoan: row.chan_doan,
      nguoiKy: row.nguoi_ky,
      cchn: row.cchn,
      displayFields: {
        khoaPrimary: row.khoa,
        khoaSecondary: '',
        chanDoanPrimary: row.icd,
        chanDoanSecondary: row.chan_doan,
        nguoiKyPrimary: row.nguoi_ky,
        nguoiKySecondary: row.cchn,
      },
      trangThai: row.trang_thai,
      errors: row.errors || [],
      rawData: row.raw_data || {},
      xmlContent: row.xml_content || undefined,
      maGD: row.ma_gd || undefined,
    }));

    return { success: true, records: mapped };
  } catch (err: any) {
    console.error('Lỗi tải records từ Supabase:', err);
    return { success: false, records: [], error: err.message || 'Lỗi tải dữ liệu' };
  }
}

/**
 * Xóa 1 hồ sơ trên Supabase
 */
export async function deleteRecordFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('ho_so_chung_tu').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
