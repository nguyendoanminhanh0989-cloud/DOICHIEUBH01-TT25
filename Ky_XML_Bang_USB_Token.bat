@echo off
chcp 65001 >nul
title KÝ SỐ HÀNG LOẠT FILE XML BẰNG USB TOKEN - TT25 BHXH
color 0a

echo ===============================================================================
echo       KÝ SỐ HÀNG LOẠT FILE XML OFFLINE BẰNG THIẾT BỊ USB TOKEN (TT25 BHXH)
echo                 Tác giả: Nguyễn Đoàn Minh Ánh - IT Y Tế
echo ===============================================================================
echo.
echo [*] Vui lòng CẮM THIẾT BỊ USB TOKEN vào máy tính trước khi tiếp tục.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ky_xml_offline.ps1"
