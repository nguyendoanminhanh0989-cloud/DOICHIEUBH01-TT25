@echo off
echo Khoi tao Git...
git init
git add .
git commit -m "Initial commit"
echo.
echo Dang day len GitHub...
echo Vui long truy cap https://github.com/new de tao mot Repository moi (chon Public hoac Private).
echo Sau do copy duong link URL cua Repository (Vi du: https://github.com/ten-tai-khoan/ten-repo.git)
echo.
set /p git_url="Nhap URL Repository Github cua ban: "
git branch -M main
git remote add origin %git_url%
git push -u origin main
echo.
echo Hoan thanh viec day source code len Github!
pause
