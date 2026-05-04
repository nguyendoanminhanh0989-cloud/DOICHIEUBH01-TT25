@echo off
echo Dang xay dung du an...
call npm install
call npm run build

echo Dang day len Vercel (Production)...
call npx vercel --prod

echo Hoan thanh!
pause
