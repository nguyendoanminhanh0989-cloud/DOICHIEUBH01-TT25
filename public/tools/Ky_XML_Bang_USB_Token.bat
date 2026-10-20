<# : chooser
@echo off
chcp 65001 >nul
title KÝ SỐ FILE XML BẰNG USB TOKEN - PHỤ LỤC 02 BHXH
powershell -NoProfile -ExecutionPolicy Bypass "Invoke-Expression ([System.IO.File]::ReadAllText('%~f0'))"
exit /b %ERRORLEVEL%
#>

Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Windows.Forms

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = [System.IO.Directory]::GetCurrentDirectory() }

$inputDir = Join-Path $scriptDir "CAN_KY"
$outputDir = Join-Path $scriptDir "DA_KY"

if (-not (Test-Path $inputDir)) {
    New-Item -ItemType Directory -Path $inputDir | Out-Null
}
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$files = Get-ChildItem -Path $inputDir -Filter "*.xml"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "       KÝ SỐ HÀNG LOẠT FILE XML BẰNG THIẾT BỊ USB TOKEN (TT25 BHXH)" -ForegroundColor Green
Write-Host "                 Tác giả: Nguyễn Đoàn Minh Ánh - IT Y Tế" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

if ($files.Count -eq 0) {
    Write-Host " [THÔNG BÁO] Chưa có file XML nào trong thư mục 'CAN_KY'!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " HƯỚNG DẪN THỰC HIỆN:" -ForegroundColor Cyan
    Write-Host " 1. Trên trang web, bấm 'Tải XML chưa ký về máy'." -ForegroundColor White
    Write-Host " 2. Chép (Copy) các file XML vừa tải vào thư mục 'CAN_KY'." -ForegroundColor White
    Write-Host " 3. Chạy lại file này để tự động ký số toàn bộ file bằng USB Token." -ForegroundColor White
    Write-Host ""
    Write-Host " Đang tự động mở thư mục 'CAN_KY' cho bạn..." -ForegroundColor Yellow
    explorer.exe $inputDir
    Write-Host "================================================================================" -ForegroundColor Cyan
    Read-Host "Nhấn Enter để thoát..."
    exit 0
}

# Lấy chứng thư số từ USB Token
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
$certs = $store.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }

if (-not $certs -or $certs.Count -eq 0) {
    $storeLM = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $storeLM.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    $certs = $storeLM.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }
}

if (-not $certs -or $certs.Count -eq 0) {
    Write-Host " [LỖI] Không tìm thấy chứng thư số USB Token nào trên máy tính!" -ForegroundColor Red
    Write-Host " Vui lòng cắm USB Token (Viettel, VNPT, BKAV, FPT...) và kiểm tra driver." -ForegroundColor Yellow
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

$cert = $certs[0]
if ($certs.Count -gt 1) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
    $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
        $certs, "Chọn chứng thư số USB Token", "Chọn chứng thư số của đơn vị/cá nhân để ký:", 
        [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
    )
    if ($selected.Count -gt 0) {
        $cert = $selected[0]
    }
}

Write-Host " [*] Chứng thư số: $($cert.Subject)" -ForegroundColor Yellow
Write-Host " [*] Số lượng file cần ký: $($files.Count)" -ForegroundColor Yellow
Write-Host " [*] Đang yêu cầu nhập mã PIN USB Token..." -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($f in $files) {
    Write-Host " -> Đang ký file: $($f.Name)... " -NoNewline
    try {
        [xml]$xmlDoc = New-Object System.Xml.XmlDocument
        $xmlDoc.PreserveWhitespace = $true
        $xmlDoc.Load($f.FullName)

        $signedXml = New-Object System.Security.Cryptography.Xml.SignedXml($xmlDoc)
        $signedXml.SigningKey = $cert.PrivateKey
        $signedXml.SignedInfo.CanonicalizationMethod = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        $signedXml.SignedInfo.SignatureMethod = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"

        $reference = New-Object System.Security.Cryptography.Xml.Reference("")
        $env = New-Object System.Security.Cryptography.Xml.XmlDsigEnvelopedSignatureTransform
        $reference.AddTransform($env)
        $reference.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($reference)

        $keyInfo = New-Object System.Security.Cryptography.Xml.KeyInfo
        $keyInfoX509 = New-Object System.Security.Cryptography.Xml.KeyInfoX509Data($cert)
        $keyInfo.AddClause($keyInfoX509)
        $signedXml.KeyInfo = $keyInfo

        $signedXml.ComputeSignature()
        $xmlDigitalSignature = $signedXml.GetXml()

        $rootNode = $xmlDoc.DocumentElement
        $chuKyNode = $xmlDoc.CreateElement("CHUKYDONVI", $rootNode.NamespaceURI)
        $importedSig = $xmlDoc.ImportNode($xmlDigitalSignature, $true)
        $chuKyNode.AppendChild($importedSig) | Out-Null

        $oldSig = $rootNode.SelectSingleNode("//*[local-name()='CHUKYDONVI']")
        if ($oldSig) { $rootNode.RemoveChild($oldSig) | Out-Null }
        $rootNode.AppendChild($chuKyNode) | Out-Null

        $outPath = Join-Path $outputDir $f.Name
        $xmlDoc.Save($outPath)
        Write-Host "[THÀNH CÔNG]" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "[THẤT BẠI: $_]" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " KÝ HOÀN TẤT! Thành công: $successCount | Thất bại: $failCount" -ForegroundColor Green
Write-Host " File đã ký được lưu tại: $outputDir" -ForegroundColor Yellow
Write-Host " Bạn hãy lên trang web và bấm nút 'Tải lên XML đã ký' để đẩy cổng BHXH." -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

explorer.exe $outputDir
Read-Host "Nhấn Enter để đóng..."
