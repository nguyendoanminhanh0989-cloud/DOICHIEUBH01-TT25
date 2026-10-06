import { execSync } from 'child_process';

const args = process.argv.slice(2);
const message = args.length > 0 ? args.join(' ') : 'Update auto-deploy';

try {
  console.log('📦 1/3: Đang stage các file thay đổi...');
  execSync('git add .', { stdio: 'inherit' });

  console.log(`\n💬 2/3: Đang tạo commit với tin nhắn: "${message}"`);
  try {
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
  } catch (commitError) {
    console.log('⚠️ Lưu ý: Có thể không có thay đổi nào mới để commit, đang tiếp tục push...');
  }

  console.log('\n🚀 3/3: Đang đẩy code lên GitHub (nhánh cloud main)...');
  execSync('git push cloud main', { stdio: 'inherit' });

  console.log('\n======================================================');
  console.log('✅ HOÀN TẤT!');
  console.log('Mã nguồn đã được đẩy lên GitHub thành công.');
  console.log('Vercel sẽ tự động nhận code mới và build (Không cần đăng nhập Vercel).');
  console.log('======================================================\n');
} catch (error) {
  console.error('\n❌ Có lỗi xảy ra trong quá trình deploy:', error.message);
  process.exit(1);
}
