<#
================================================================================
CÔNG CỤ KÝ SỐ HÀNG LOẠT FILE XML OFFLINE BẰNG USB TOKEN
Tác giả: Nguyễn Đoàn Minh Ánh - IT Y Tế
================================================================================
#>

Add-Type -AssemblyName System.Security

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inputDir = Join-Path $scriptDir "CAN_KY"
$outputDir = Join-Path $scriptDir "DA_KY"

if (-not (Test-Path $inputDir)) {
    New-Item -ItemType Directory -Path $inputDir | Out-Null
}
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$files = Get-ChildItem -Path $inputDir -Filter "*.xml"

if ($files.Count -eq 0) {
    Write-Host "================================================================================" -ForegroundColor Yellow
    Write-Host " KHONG CO FILE XML NAO TRONG THU MUC 'CAN_KY'!" -ForegroundColor Yellow
    Write-Host " Huong dan:" -ForegroundColor Cyan
    Write-Host " 1. Copy cac file XML can ky vao thu muc: $inputDir"
    Write-Host " 2. Chay lai file bat nay de ky hang loat bang USB Token."
    Write-Host "================================================================================" -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat..."
    exit 0
}

# Tim chung thu USB Token
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
$certs = $store.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }

if (-not $certs -or $certs.Count -eq 0) {
    Write-Host "[LOI] Khong tim thay chung thu so USB Token nao tren may tinh!" -ForegroundColor Red
    Write-Host "Vui long cam USB Token va kiem tra driver." -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat..."
    exit 1
}

$cert = $certs[0]
if ($certs.Count -gt 1) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
    $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
        $certs, "Chon chung thu so USB Token", "Chon chung thu so de ky:", 
        [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
    )
    if ($selected.Count -gt 0) {
        $cert = $selected[0]
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " CHUNG THU SO: $($cert.Subject)" -ForegroundColor Green
Write-Host " SO LUONG FILE CAN KY: $($files.Count)" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($f in $files) {
    Write-Host " -> Dang ky: $($f.Name)..." -NoNewline
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
        Write-Host " [THANH CONG]" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host " [LOI]: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " HOAN TAT! Thanh cong: $successCount | That bai: $failCount" -ForegroundColor Green
Write-Host " File da ky duoc luu tai thu muc: $outputDir" -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan
Read-Host "Nhan Enter de dong..."
