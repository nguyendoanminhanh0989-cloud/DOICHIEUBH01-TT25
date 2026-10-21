<# : chooser
@echo off
chcp 65001 >nul
title KY SO FILE XML BANG USB TOKEN - PHU LUC 02 BHXH
powershell -NoProfile -ExecutionPolicy Bypass -Command "$content = [System.IO.File]::ReadAllText('%~f0', [System.Text.Encoding]::UTF8); Invoke-Expression $content"
exit /b %ERRORLEVEL%
#>

Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Xml

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
Write-Host "       KY SO HANG LOAT FILE XML BANG THIET BI USB TOKEN (TT25 BHXH)" -ForegroundColor Green
Write-Host "                 Tac gia: Nguyen Doan Minh Anh - IT Y Te" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

if ($files.Count -eq 0) {
    Write-Host " [THONG BAO] Chua co file XML nao trong thu muc 'CAN_KY'!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " HUONG DAN THUC HIEN:" -ForegroundColor Cyan
    Write-Host " 1. Tren trang web, bam 'Tai XML chua ky ve may'." -ForegroundColor White
    Write-Host " 2. Chep (Copy) cac file XML vua tai vao thu muc 'CAN_KY'." -ForegroundColor White
    Write-Host " 3. Chay lai file nay de tu dong ky so toan bo file bang USB Token." -ForegroundColor White
    Write-Host ""
    Write-Host " Dang tu dong mo thu muc 'CAN_KY' cho ban..." -ForegroundColor Yellow
    explorer.exe $inputDir
    Write-Host "================================================================================" -ForegroundColor Cyan
    Read-Host "Nhan Enter de thoat..."
    exit 0
}

# Lay chung thu so tu USB Token
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
$certs = $store.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }

if (-not $certs -or $certs.Count -eq 0) {
    $storeLM = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
    $storeLM.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    $certs = $storeLM.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }
}

if (-not $certs -or $certs.Count -eq 0) {
    Write-Host " [LOI] Khong tim thay chung thu so USB Token nao tren may tinh!" -ForegroundColor Red
    Write-Host " Vui long cam USB Token (Viettel, VNPT, BKAV, FPT...) va kiem tra driver." -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat..."
    exit 1
}

$cert = $certs[0]
if ($certs.Count -gt 1) {
    [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
    $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
        $certs, "Chon chung thu so USB Token", "Chon chung thu so cua don vi/ca nhan de ky:", 
        [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
    )
    if ($selected.Count -gt 0) {
        $cert = $selected[0]
    }
}

Write-Host " [*] Chung thu so: $($cert.Subject)" -ForegroundColor Yellow
Write-Host " [*] So luong file can ky: $($files.Count)" -ForegroundColor Yellow
Write-Host " [*] Dang yeu cau nhap ma PIN USB Token..." -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

function Invoke-TokenSignHash($cert, [byte[]]$hash) {
    $errs = @()
    try {
        $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
        if ($rsa) {
            return $rsa.SignHash($hash, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        }
    } catch { $errs += ("CNG: " + $_.Exception.Message) }
    try {
        $csp = $cert.PrivateKey
        if ($csp -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
            return $csp.SignHash($hash, [System.Security.Cryptography.CryptoConfig]::MapNameToOID("SHA256"))
        }
        if ($csp) {
            return $csp.SignHash($hash, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
        }
    } catch { $errs += ("CSP: " + $_.Exception.Message) }
    # Du phong cho token Viettel-CA (CSP cu): tu nhap PIN va truyen truc tiep cho CSP
    try {
        $old = $cert.PrivateKey
        if ($old -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
            $info = $old.CspKeyContainerInfo
            for ($try = 1; $try -le 3; $try++) {
                $sec = Read-Host (" Nhap ma PIN USB Token (lan " + $try + "/3)") -AsSecureString
                try {
                    $cp = New-Object System.Security.Cryptography.CspParameters($info.ProviderType, $info.ProviderName, $info.KeyContainerName)
                    $cp.KeyNumber = $info.KeyNumber
                    $cp.Flags = [System.Security.Cryptography.CspProviderFlags]::UseExistingKey
                    if ($info.MachineKeyStore) { $cp.Flags = $cp.Flags -bor [System.Security.Cryptography.CspProviderFlags]::UseMachineKeyStore }
                    $cp.KeyPassword = $sec
                    $rsaPin = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cp)
                    return $rsaPin.SignHash($hash, [System.Security.Cryptography.CryptoConfig]::MapNameToOID("SHA256"))
                } catch { $errs += ("PIN" + $try + ": " + $_.Exception.Message) }
            }
        }
    } catch { $errs += ("PINCSP: " + $_.Exception.Message) }    throw ("Khong ky duoc bang USB Token. Chi tiet: " + ($errs -join " | "))
}
function Sign-BhxhXmlDocument([string]$xmlString, $cert) {
    $isKsk = $xmlString.Contains("<KHAMSUCKHOE")
    if ($isKsk) {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($xmlString)
        $hash = $sha256.ComputeHash($dataBytes)
        $sigBytes = $null
        try {
            $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
            if ($rsa) { $sigBytes = $rsa.SignHash($hash, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1) }
        } catch {}
        if (-not $sigBytes) {
            $csp = [System.Security.Cryptography.RSACryptoServiceProvider]$cert.PrivateKey
            $sigBytes = $csp.SignHash($hash, [System.Security.Cryptography.CryptoConfig]::MapNameToOID("SHA256"))
        }
        $sigB64 = [Convert]::ToBase64String($sigBytes)
        $kskBlock = "<CHUKYDONVI><CKS_NGUOI_KET_LUAN>$sigB64</CKS_NGUOI_KET_LUAN><CKS_BENH_VIEN>$sigB64</CKS_BENH_VIEN></CHUKYDONVI>"
        return @{
            SignedXml = $xmlString.Replace("</KHAMSUCKHOE>", $kskBlock + "</KHAMSUCKHOE>")
            Signature = $sigB64
            Certificate = [Convert]::ToBase64String($cert.RawData)
            Subject = $cert.Subject
            SerialNumber = $cert.SerialNumber
        }
    }

    [xml]$xmlDoc = New-Object System.Xml.XmlDocument
    $xmlDoc.PreserveWhitespace = $true
    $xmlDoc.LoadXml($xmlString)

    $root = $xmlDoc.DocumentElement
    if ($xmlString -notmatch '[\s<]xs[di]:[A-Za-z]') {
        foreach ($nsName in @('xmlns:xsd','xmlns:xsi')) {
            if ($root.HasAttribute($nsName)) { $root.RemoveAttribute($nsName) }
        }
    }
    $is01BH = ($root.LocalName -eq "HSTH01BH")
    
    # Tim Id ho so (THONGTINHOSO hoac DS_CHITIET hoac the co attribute Id)
    $hoSoNode = $root.SelectSingleNode("//*[@Id]")
    $hoSoId = if ($hoSoNode) { $hoSoNode.GetAttribute("Id") } else { "Id-" + [Guid]::NewGuid().ToString() }

    $signedXml = New-Object System.Security.Cryptography.Xml.SignedXml($xmlDoc)
    
    # Lay Private Key tuong thich SHA-256 tu USB Token
    $dummyKey = New-Object System.Security.Cryptography.RSACryptoServiceProvider(2048)
    $signedXml.SigningKey = $dummyKey

    $signedXml.SignedInfo.CanonicalizationMethod = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    $signedXml.SignedInfo.SignatureMethod = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"

    # Reference duy nhat theo chuan mau cong BHXH: Enveloped signature tren toan bo file (URI="")
    $ref = New-Object System.Security.Cryptography.Xml.Reference("")
    $env = New-Object System.Security.Cryptography.Xml.XmlDsigEnvelopedSignatureTransform
    $ref.AddTransform($env)
    $ref.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
    $signedXml.AddReference($ref)

    # KeyInfo chua Certificate va SubjectName
    $keyInfo = New-Object System.Security.Cryptography.Xml.KeyInfo
    $kix = New-Object System.Security.Cryptography.Xml.KeyInfoX509Data
    $kix.AddCertificate($cert)
    $kix.AddSubjectName($cert.Subject)
    $keyInfo.AddClause($kix)
    $signedXml.KeyInfo = $keyInfo

    # Tao DataObject SigningTime chuan mau cong BHXH
    $objDoc = New-Object System.Xml.XmlDocument
    $signingTime = (Get-Date).ToString("yyyyMMddHHmmss")
    $objXml = "<SignatureProperties Id=`"proid`" xmlns=`"`"><SignatureProperty><SigningTime xmlns=`"http://example.org/#signatureProperties`">$signingTime</SigningTime></SignatureProperty></SignatureProperties>"
    $objDoc.LoadXml($objXml)

    $dataObj = New-Object System.Security.Cryptography.Xml.DataObject
    $dataObj.Data = $objDoc.ChildNodes
    $signedXml.AddObject($dataObj)

    # Tinh toan chu ky chuan XMLDSig W3C
    $signedXml.ComputeSignature()
    # Ky that bang USB Token: c14n SignedInfo -> SHA256 -> ky 1 lan duy nhat (chi hoi PIN 1 lan)
    $c14n = New-Object System.Security.Cryptography.Xml.XmlDsigC14NTransform
    $siDoc = New-Object System.Xml.XmlDocument
    $siDoc.PreserveWhitespace = $true
    $siDoc.LoadXml($signedXml.SignedInfo.GetXml().OuterXml)
    $c14n.LoadInput($siDoc)
    $siStream = $c14n.GetOutput([System.IO.Stream])
    $siMs = New-Object System.IO.MemoryStream
    $siStream.CopyTo($siMs)
    $siHash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($siMs.ToArray())
    $sigBytes = Invoke-TokenSignHash $cert $siHash
    $signedXml.Signature.SignatureValue = $sigBytes
    $xmlDigitalSignature = $signedXml.GetXml()

    # Nhung chu ky vao the CHUKYDONVI
    $chuKyNode = $xmlDoc.CreateElement("CHUKYDONVI", $root.NamespaceURI)
    $importedSig = $xmlDoc.ImportNode($xmlDigitalSignature, $true)
    $chuKyNode.AppendChild($importedSig) | Out-Null

    $oldSig = $root.SelectSingleNode("//*[local-name()='CHUKYDONVI']")
    if ($oldSig) {
        $root.ReplaceChild($chuKyNode, $oldSig) | Out-Null
    } else {
        $root.AppendChild($chuKyNode) | Out-Null
    }

    $sw = New-Object System.IO.StringWriter
    $xmlDoc.Save($sw)
    $signedXmlText = $sw.ToString()
    $signedXmlText = $signedXmlText -replace '^\s*<\?xml[^>]*\?>', '<?xml version="1.0" encoding="utf-8"?>'
    return @{
        SignedXml = $signedXmlText
        Signature = [Convert]::ToBase64String($signedXml.SignatureValue)
        Certificate = [Convert]::ToBase64String($cert.RawData)
        Subject = $cert.Subject
        SerialNumber = $cert.SerialNumber
    }
}

$successCount = 0
$failCount = 0

foreach ($f in $files) {
    Write-Host " -> Dang ky file: $($f.Name)... " -NoNewline
    try {
        $xmlContent = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        $res = Sign-BhxhXmlDocument -xmlString $xmlContent -cert $cert
        
        $outPath = Join-Path $outputDir $f.Name
        [System.IO.File]::WriteAllText($outPath, $res.SignedXml, (New-Object System.Text.UTF8Encoding($false)))

        Write-Host "[THANH CONG]" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "[THAT BAI: $_]" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " KY HOAN TAT! Thanh cong: $successCount | That bai: $failCount" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
explorer.exe $outputDir
Read-Host "Nhan Enter de dong..."
