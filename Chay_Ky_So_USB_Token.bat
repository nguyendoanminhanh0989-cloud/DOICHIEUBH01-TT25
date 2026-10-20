@echo off
chcp 65001 >nul
title CÔNG CỤ KÝ SỐ USB TOKEN CỤC BỘ - TT25 BHXH
color 0b

echo ===============================================================================
echo       PHẦN MỀM ĐỐI CHIẾU 01BH & CHỨNG TỪ TT25 - KÝ SỐ USB TOKEN CỤC BỘ
echo                 Tác giả: Nguyễn Đoàn Minh Ánh - IT Y Tế
echo ===============================================================================
echo.
echo [*] Đang kiểm tra PowerShell và khởi động dịch vụ ký số cổng 18088...
echo [*] Vui lòng CẮM USB TOKEN (Viettel, VNPT, BKAV, FPT...) vào máy tính trước.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0signer_agent.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LỖI] Không thể chạy dịch vụ ký số.
    echo Vui lòng bấm chuột phải vào file này và chọn "Run as administrator" nếu cần.
    pause
)
