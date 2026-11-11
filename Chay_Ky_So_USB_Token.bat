<# : chooser
@echo off
chcp 65001 >nul
title CONG CU KY SO USB TOKEN DA NANG (VIETTEL, VNPT, BKAV, FPT, CA2, EASYCA, NEWCA...) - BHXH TT25
powershell -NoProfile -ExecutionPolicy Bypass -Command "$argsList = '%*'; $selfPath = '%~f0'; $content = [System.IO.File]::ReadAllText($selfPath, [System.Text.Encoding]::UTF8); Invoke-Expression $content"
exit /b %ERRORLEVEL%
#>

Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Xml
Add-Type -AssemblyName System.Windows.Forms

# Tu dong tich hop vao Windows Startup va giao thuc bhxhtoken:// de Web goi tu dong khong can chay .bat thu cong
function Register-BhxhTokenAgent {
    try {
        $agentDir = Join-Path $env:LOCALAPPDATA "BhxhUsbTokenAgent"
        if (-not (Test-Path $agentDir)) {
            New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
        }
        $installedBat = Join-Path $agentDir "Chay_Ky_So_USB_Token.bat"
        if ($selfPath -and (Test-Path $selfPath) -and ($selfPath -ne $installedBat)) {
            Copy-Item -Path $selfPath -Destination $installedBat -Force -ErrorAction SilentlyContinue
        }
        $targetBat = if (Test-Path $installedBat) { $installedBat } else { $selfPath }

        # Tao VBS khoi dong ngam (khong hien cua so den khi Windows khoi dong hoac khi goi tu trinh duyet)
        $vbsPath = Join-Path $agentDir "Start_UsbToken_Silent.vbs"
        $vbsContent = "Set WshShell = CreateObject(""WScript.Shell"")`r`nWshShell.Run ""powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command """"`$selfPath = '$targetBat'; `$content = [System.IO.File]::ReadAllText('`$selfPath', [System.Text.Encoding]::UTF8); Invoke-Expression `$content"""""", 0, False"
        [System.IO.File]::WriteAllText($vbsPath, $vbsContent, [System.Text.Encoding]::ASCII)

        # Dang ky khoi dong cung Windows
        $runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
        Set-ItemProperty -Path $runKey -Name "BhxhUsbTokenAgent" -Value "wscript.exe `"$vbsPath`"" -ErrorAction SilentlyContinue

        # Dang ky giao thuc bhxhtoken:// de trinh duyet Web co the kich hoat tu dong
        $protoKey = "HKCU:\Software\Classes\bhxhtoken"
        if (-not (Test-Path $protoKey)) { New-Item -Path $protoKey -Force | Out-Null }
        Set-ItemProperty -Path $protoKey -Name "(Default)" -Value "URL:BHXH USB Token Signer Protocol" -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $protoKey -Name "URL Protocol" -Value "" -ErrorAction SilentlyContinue
        $cmdKey = Join-Path $protoKey "shell\open\command"
        if (-not (Test-Path $cmdKey)) { New-Item -Path $cmdKey -Force | Out-Null }
        Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value "wscript.exe `"$vbsPath`"" -ErrorAction SilentlyContinue
    } catch {}
}

Register-BhxhTokenAgent

$port = 18088
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " [OK] CONG CU KY SO USB TOKEN DA TICH HOP & DANG CHAY TAI: $prefix" -ForegroundColor Green
    Write-Host " - Tu dong nhan dien nhieu loai USB Token: Viettel-CA, VNPT-CA, BKAV-CA, FPT-CA," -ForegroundColor Yellow
    Write-Host "   CA2 (Nacencomm), EasyCA, NewCA, Vina-CA (SmartSign), Safe-CA, MISA-CA..." -ForegroundColor Yellow
    Write-Host " - Da tich hop tu dong chay ngam va giao thuc bhxhtoken:// tren may tinh nay." -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
} catch {
    Write-Host " [THONG BAO] Dich vu ky so USB Token da chay san tren cong $port." -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
}

# Ham trich xuat CN va MST tu Subject/Issuer
function Parse-DnField([string]$dn, [string]$key) {
    if (-not $dn) { return "" }
    $m = [regex]::Match($dn, "(?:^|,\s*)$key=([^,]+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return ""
}

function Extract-MstFromSubject([string]$subject) {
    if (-not $subject) { return "" }
    $m1 = [regex]::Match($subject, "MST\s*[:=]\s*([0-9\-]+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($m1.Success) { return $m1.Groups[1].Value.Trim() }
    $m2 = [regex]::Match($subject, "(?:UID|0\.9\.2342\.19200300\.100\.1\.1)=([^,]+)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($m2.Success) { return ($m2.Groups[1].Value -replace '^MST\s*[:=]\s*', '').Trim() }
    return ""
}

# Ham nhan dien hang USB Token va tim duong dan phan mem quan ly Token cua hang do
function Get-TokenBrandInfo([string]$issuer, [string]$subject, [string]$providerName) {
    $combined = "$issuer | $subject | $providerName"
    $brand = "USB Token PKI"
    $keywords = @()

    if ($combined -match "Viettel|SafeNet|eToken|Bit4id|Watchdata|vtca") {
        $brand = "Viettel-CA USB Token"
        $keywords = @("*Viettel*", "*eToken*", "*SafeNet*", "*Bit4id*")
    } elseif ($combined -match "VNPT|VDC|Longmai|mToken|vnptca") {
        $brand = "VNPT-CA USB Token"
        $keywords = @("*VNPT*", "*mToken*", "*Longmai*", "*PKI Token*")
    } elseif ($combined -match "Bkav|BkavCA") {
        $brand = "BKAV-CA USB Token"
        $keywords = @("*Bkav*")
    } elseif ($combined -match "FPT|Feitian|ePass|EnterSafe") {
        $brand = "FPT-CA USB Token"
        $keywords = @("*FPT*", "*ePass*", "*Feitian*", "*EnterSafe*")
    } elseif ($combined -match "CA2|Nacencomm|CAVN") {
        $brand = "CA2 (Nacencomm) USB Token"
        $keywords = @("*CA2*", "*Nacencomm*", "*CAVN*")
    } elseif ($combined -match "EasyCA|Softdreams") {
        $brand = "EasyCA USB Token"
        $keywords = @("*EasyCA*", "*Softdreams*")
    } elseif ($combined -match "NewCA|Newtel") {
        $brand = "NewCA USB Token"
        $keywords = @("*NewCA*", "*Newtel*")
    } elseif ($combined -match "SmartSign|Vina-CA|VinaCA|VINA") {
        $brand = "Vina-CA (SmartSign) USB Token"
        $keywords = @("*SmartSign*", "*Vina*")
    } elseif ($combined -match "Safe-CA|SafeCA") {
        $brand = "Safe-CA USB Token"
        $keywords = @("*Safe-CA*", "*SafeCA*")
    } elseif ($combined -match "MISA") {
        $brand = "MISA eSign USB Token"
        $keywords = @("*MISA*")
    } elseif ($combined -match "EFY") {
        $brand = "EFY-CA USB Token"
        $keywords = @("*EFY*")
    } elseif ($combined -match "TrustCA|I-CA|LCS|CMC|Hilink") {
        $brand = "TrustCA / I-CA USB Token"
        $keywords = @("*TrustCA*", "*I-CA*", "*LCS*", "*CMC*")
    }

    return @{
        Brand = $brand
        SearchPatterns = $keywords
    }
}

function Start-TokenVendorApplication([string]$brand, [string]$providerName) {
    try {
        $searchRoots = @(${env:ProgramFiles(x86)}, $env:ProgramFiles) | Where-Object { $_ -and (Test-Path $_) }
        $exeCandidates = @()
        foreach ($root in $searchRoots) {
            $dirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | Where-Object {
                $_.Name -match "VNPT|Viettel|Bkav|FPT|ePass|SafeNet|eToken|Bit4id|Longmai|mToken|NewCA|EasyCA|SmartSign|Vina|CA2|Nacencomm|Safe-CA|Token|PKI"
            }
            foreach ($d in $dirs) {
                $exes = Get-ChildItem -Path $d.FullName -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Where-Object {
                    $_.Name -notmatch "unins|update|setup|install|driver|vc_redist" -and
                    $_.Name -match "mgr|manager|token|config|pki|admin|tool|client|ca|cert|epass|etoken|safenet|vnpt|viettel|bkav|fpt"
                }
                if ($exes) { $exeCandidates += $exes }
            }
        }

        if ($exeCandidates.Count -gt 0) {
            # Uu tien exe khop voi ten hang Token
            $brandKey = ($brand -split ' ')[0] -replace '-CA',''
            $matched = $exeCandidates | Where-Object { $_.FullName -match $brandKey } | Select-Object -First 1
            $chosen = if ($matched) { $matched } else { $exeCandidates[0] }
            Start-Process -FilePath $chosen.FullName -ErrorAction SilentlyContinue
            return $chosen.Name
        }
    } catch {}
    return ""
}

function Get-CertProviderInfo($cert) {
    $providerName = ""
    $isHardware = $false
    try {
        $pk = $cert.PrivateKey
        if ($pk -and $pk.CspKeyContainerInfo) {
            $providerName = [string]$pk.CspKeyContainerInfo.ProviderName
            $isHardware = [bool]($pk.CspKeyContainerInfo.HardwareDevice -or $pk.CspKeyContainerInfo.Removable)
        }
    } catch {}

    if (-not $providerName) {
        try {
            $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
            if ($rsa -and $rsa.Key -and $rsa.Key.Provider) {
                $providerName = [string]$rsa.Key.Provider.Provider
                if ($providerName -match "Smart Card|Token|VNPT|Viettel|Bkav|FPT|SafeNet|eToken|ePass|Longmai|Bit4id|CA2|NewCA|EasyCA") {
                    $isHardware = $true
                }
            }
        } catch {}
    }

    if ($providerName -match "Smart Card|Token|VNPT|Viettel|Bkav|FPT|SafeNet|eToken|ePass|Longmai|Bit4id|CA2|NewCA|EasyCA|Watchdata") {
        $isHardware = $true
    }
    if ($cert.Issuer -match "VNPT|Viettel|Bkav|FPT|CA2|Nacencomm|EasyCA|NewCA|SmartSign|Vina|Safe-CA|MISA|EFY|TrustCA|I-CA|LCS|CMC") {
        $isHardware = $true
    }

    return @{
        ProviderName = if ($providerName) { $providerName } else { "Windows CryptoAPI / SmartCard CSP" }
        IsHardware = $isHardware
    }
}

# Quet danh sach cac thiet bi USB Token / SmartCard dang cam tren may
function Get-PluggedUsbTokenHardware {
    $hwList = @()
    try {
        $pnp = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object {
            $_.Status -eq "OK" -and (
                $_.PNPClass -match "SmartCard" -or
                $_.Name -match "Token|Smart Card|SmartCard|eToken|ePass|SafeNet|Longmai|mToken|Feitian|Bit4id|Watchdata|Viettel|VNPT|Bkav|FPT|CCID"
            )
        }
        foreach ($dev in $pnp) {
            if ($dev.Name -notmatch "Microsoft Virtual") {
                $hwList += [string]$dev.Name
            }
        }
    } catch {}
    return $hwList
}

function Get-AllUsbCertificates {
    $found = @()
    try {
        $storeCU = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
        $storeCU.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $certsCU = @($storeCU.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) })
        $storeCU.Close()
        if ($certsCU) { $found += $certsCU }
    } catch {}

    try {
        $storeLM = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
        $storeLM.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $certsLM = @($storeLM.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) })
        $storeLM.Close()
        if ($certsLM) { $found += $certsLM }
    } catch {}

    $unique = @()
    $seen = @{}
    foreach ($c in $found) {
        # Bo qua cac cert localhost / IIS Express / Dev
        if ($c.Subject -match "CN=localhost|IIS Express|DO_NOT_TRUST|Charles Proxy|Fiddler") { continue }
        $s = ($c.SerialNumber -replace '\s','').ToUpper()
        if ($s -and -not $seen.ContainsKey($s)) {
            $seen[$s] = $true
            $unique += $c
        }
    }
    return $unique
}

function Format-CertObject($c) {
    $prov = Get-CertProviderInfo $c
    $brandInfo = Get-TokenBrandInfo -issuer $c.Issuer -subject $c.Subject -providerName $prov.ProviderName
    $cn = Parse-DnField $c.Subject "CN"
    $issuerCn = Parse-DnField $c.Issuer "CN"
    $mst = Extract-MstFromSubject $c.Subject
    return @{
        subject = $c.Subject
        commonName = if ($cn) { $cn } else { $c.Subject }
        mst = $mst
        serial = $c.SerialNumber
        issuer = $c.Issuer
        issuerName = if ($issuerCn) { $issuerCn } else { $c.Issuer }
        tokenBrand = $brandInfo.Brand
        providerName = $prov.ProviderName
        isHardwareToken = $prov.IsHardware
        notAfter = $c.NotAfter.ToString("dd/MM/yyyy HH:mm")
        notBefore = $c.NotBefore.ToString("dd/MM/yyyy HH:mm")
        certificate = [Convert]::ToBase64String($c.RawData)
    }
}

function Get-UsbCertificate($interactive = $false, [string]$targetSerial = "") {
    $certs = Get-AllUsbCertificates
    if (-not $certs -or $certs.Count -eq 0) {
        return $null
    }

    if ($targetSerial) {
        $cleanTarget = ($targetSerial -replace '\s','').ToUpper()
        $found = $certs | Where-Object { ($_.SerialNumber -replace '\s','').ToUpper() -eq $cleanTarget } | Select-Object -First 1
        if ($found) { return $found }
    }

    if ($certs.Count -eq 1) {
        return $certs[0]
    }

    if ($interactive) {
        [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
        $collection = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2Collection
        foreach ($c in $certs) {
            $collection.Add($c) | Out-Null
        }
        try {
            $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
                $collection, "Chon Chung thu so USB Token", "Phat hien nhieu USB Token/CKS. Vui long chon USB Token can su dung:",
                [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
            )
            if ($selected.Count -gt 0) {
                return $selected[0]
            }
        } catch {
            Write-Host " [CANH BAO]: Khong mo duoc hop thoai chon CKS: $_" -ForegroundColor Yellow
        }
    }

    return ($certs | Sort-Object NotAfter -Descending | Select-Object -First 1)
}

# Ham ky Hash voi ma PIN truyen vao hoac mo hop thoai PIN goc cua USB Token
function Invoke-TokenSignHash($cert, [byte[]]$hash, [string]$pin = "") {
    $errs = @()

    # 1. Neu nguoi dung nhap ma PIN tren bang nhap MK: Truyen ma PIN truc tiep vao CSP / KSP cua USB Token
    if ($pin) {
        try {
            $oldCsp = $cert.PrivateKey
            if ($oldCsp -is [System.Security.Cryptography.RSACryptoServiceProvider]) {
                $info = $oldCsp.CspKeyContainerInfo
                $secPin = New-Object System.Security.SecureString
                foreach ($ch in $pin.ToCharArray()) { $secPin.AppendChar($ch) }
                $cp = New-Object System.Security.Cryptography.CspParameters($info.ProviderType, $info.ProviderName, $info.KeyContainerName)
                $cp.KeyNumber = $info.KeyNumber
                $cp.Flags = [System.Security.Cryptography.CspProviderFlags]::UseExistingKey
                if ($info.MachineKeyStore) {
                    $cp.Flags = $cp.Flags -bor [System.Security.Cryptography.CspProviderFlags]::UseMachineKeyStore
                }
                $cp.KeyPassword = $secPin
                $rsaWithPin = New-Object System.Security.Cryptography.RSACryptoServiceProvider($cp)
                return $rsaWithPin.SignHash($hash, [System.Security.Cryptography.CryptoConfig]::MapNameToOID("SHA256"))
            }
        } catch {
            $errMsg = $_.Exception.Message
            $errs += ("CSP-PIN: " + $errMsg)
            if ($errMsg -match "bad|wrong|incorrect|invalid|pin|password|blocked|locked|0x8010006b|0x80090016|0x80090010") {
                throw ("Ma PIN USB Token khong chinh xac hoac USB Token chua san sang: " + $errMsg)
            }
        }

        try {
            $rsaCng = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
            if ($rsaCng -and $rsaCng.Key) {
                # Thiet lap NCRYPT_PIN_PROPERTY cho CNG SmartCard Key Storage Provider
                $pinBytes = [System.Text.Encoding]::Unicode.GetBytes($pin + "`0")
                $prop = New-Object System.Security.Cryptography.CngProperty("SmartCardPin", $pinBytes, [System.Security.Cryptography.CngPropertyOptions]::None)
                $rsaCng.Key.SetProperty($prop)
                return $rsaCng.SignHash($hash, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
            }
        } catch {
            $errMsg = $_.Exception.Message
            $errs += ("CNG-PIN: " + $errMsg)
            if ($errMsg -match "bad|wrong|incorrect|invalid|pin|password|blocked|locked|cancelled|canceled|0x8010006b|0x8010006e") {
                throw ("Xac thuc ma PIN USB Token that bai: " + $errMsg)
            }
        }
    }

    # 2. Goi truc tiep CNG / CSP de phan mem USB Token goc tren may tinh tu bat hop thoai nhap ma PIN
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

    throw ("Khong the truy cap khoa bi mat tren USB Token (Vui long cam dung USB Token va nhap dung ma PIN). Chi tiet: " + ($errs -join " | "))
}

function Sign-BhxhXmlDocument([string]$xmlString, $cert, [string]$pin = "") {
    $isKsk = $xmlString.Contains("<KHAMSUCKHOE")
    if ($isKsk) {
        $cleanKsk = [regex]::Replace($xmlString, "(?s)\s*<CHUKYDONVI>.*?</CHUKYDONVI>", "")
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        $dataBytes = [System.Text.Encoding]::UTF8.GetBytes($cleanKsk)
        $hash = $sha256.ComputeHash($dataBytes)
        $sigBytes = Invoke-TokenSignHash -cert $cert -hash $hash -pin $pin
        $sigB64 = [Convert]::ToBase64String($sigBytes)
        $kskBlock = "  <CHUKYDONVI>`n    <CKS_NGUOI_KET_LUAN>$sigB64</CKS_NGUOI_KET_LUAN>`n    <CKS_BENH_VIEN>$sigB64</CKS_BENH_VIEN>`n  </CHUKYDONVI>`n</KHAMSUCKHOE>"
        return @{
            SignedXml = $cleanKsk.Replace("</KHAMSUCKHOE>", $kskBlock)
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

    $hoSoNode = $root.SelectSingleNode("//*[@Id]")
    $hoSoId = if ($hoSoNode) { $hoSoNode.GetAttribute("Id") } else { "Id-" + [Guid]::NewGuid().ToString() }
    $is01BH = (($root.LocalName -eq "HSTH01BH" -or $root.LocalName -eq "GIAMDINHHS") -and -not $hoSoNode)

    $signedXml = New-Object System.Security.Cryptography.Xml.SignedXml($xmlDoc)
    $signedXml.Signature.Id = "CHUKYDONVI-$hoSoId"

    $dummyKey = New-Object System.Security.Cryptography.RSACryptoServiceProvider(2048)
    $signedXml.SigningKey = $dummyKey

    $signedXml.SignedInfo.CanonicalizationMethod = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    $signedXml.SignedInfo.SignatureMethod = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"

    $keyInfo = New-Object System.Security.Cryptography.Xml.KeyInfo
    $kix = New-Object System.Security.Cryptography.Xml.KeyInfoX509Data
    $kix.AddSubjectName($cert.Subject)
    $kix.AddCertificate($cert)
    $keyInfo.AddClause($kix)
    $signedXml.KeyInfo = $keyInfo

    if ($is01BH) {
        $objDoc = New-Object System.Xml.XmlDocument
        $signingTime = (Get-Date).ToString("yyyyMMddHHmmss")
        $objXml = "<SignatureProperties Id=`"proid`" xmlns=`"`"><SignatureProperty><SigningTime xmlns=`"http://example.org/#signatureProperties`">$signingTime</SigningTime></SignatureProperty></SignatureProperties>"
        $objDoc.LoadXml($objXml)

        $dataObj = New-Object System.Security.Cryptography.Xml.DataObject
        $dataObj.Data = $objDoc.ChildNodes
        $signedXml.AddObject($dataObj)

        $ref = New-Object System.Security.Cryptography.Xml.Reference("")
        $env = New-Object System.Security.Cryptography.Xml.XmlDsigEnvelopedSignatureTransform
        $ref.AddTransform($env)
        $ref.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($ref)
    } else {
        $objDoc = New-Object System.Xml.XmlDocument
        $signingTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        $objXml = "<SignatureProperties xmlns=`"`"><SignatureProperty Target=`"#CHUKYDONVI-$hoSoId`" Id=`"SignatureProperty-CHUKYDONVI-$hoSoId`"><SigningTime>$signingTime</SigningTime></SignatureProperty></SignatureProperties>"
        $objDoc.LoadXml($objXml)

        $dataObj = New-Object System.Security.Cryptography.Xml.DataObject
        $dataObj.Id = "Object-CHUKYDONVI-$hoSoId"
        $dataObj.Data = $objDoc.ChildNodes
        $signedXml.AddObject($dataObj)

        $refObj = New-Object System.Security.Cryptography.Xml.Reference("#Object-CHUKYDONVI-$hoSoId")
        $refObj.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($refObj)

        $refHoSo = New-Object System.Security.Cryptography.Xml.Reference("#$hoSoId")
        $refHoSo.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($refHoSo)
    }

    $signedXml.ComputeSignature()
    $c14n = New-Object System.Security.Cryptography.Xml.XmlDsigC14NTransform
    $siDoc = New-Object System.Xml.XmlDocument
    $siDoc.PreserveWhitespace = $true
    $siDoc.LoadXml($signedXml.SignedInfo.GetXml().OuterXml)
    $c14n.LoadInput($siDoc)
    $siStream = $c14n.GetOutput([System.IO.Stream])
    $siMs = New-Object System.IO.MemoryStream
    $siStream.CopyTo($siMs)
    $siHash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($siMs.ToArray())
    $sigBytes = Invoke-TokenSignHash -cert $cert -hash $siHash -pin $pin
    $signedXml.Signature.SignatureValue = $sigBytes
    $xmlDigitalSignature = $signedXml.GetXml()

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

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        $response.Headers.Add("Access-Control-Allow-Private-Network", "true")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($request.Url.AbsolutePath -eq "/ping" -or $request.Url.AbsolutePath -eq "/certificates") {
            $certs = Get-AllUsbCertificates
            $hwDevices = Get-PluggedUsbTokenHardware
            $certList = @()
            foreach ($c in $certs) {
                $certList += (Format-CertObject $c)
            }
            $info = @{
                status = "ok"
                connected = $true
                hasToken = ($certList.Count -gt 0)
                count = $certList.Count
                hardwareDevices = $hwDevices
                certificates = $certList
            }
            $json = ConvertTo-Json $info -Depth 4
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Endpoint mo ung dung USB Token & xac thuc ma PIN de lay thong tin CKS truc tiep tu Token
        if ($request.Url.AbsolutePath -eq "/unlock-token" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $parsed = if ($body) { ConvertFrom-Json $body } else { @{} }
            $targetSerial = if ($parsed.serial) { [string]$parsed.serial } else { "" }
            $pin = if ($parsed.pin) { [string]$parsed.pin } else { "" }
            $openApp = [bool]$parsed.openApp

            $cert = Get-UsbCertificate -interactive ($targetSerial -eq "") -targetSerial $targetSerial
            if (-not $cert) {
                throw "Khong phat hien USB Token nao dang cam tren may tinh. Vui long cam USB Token (Viettel, VNPT, Bkav, FPT, EasyCA, NewCA...) vao cong USB va kiem tra driver."
            }

            $certInfo = Format-CertObject $cert
            $launchedApp = ""
            if ($openApp) {
                $launchedApp = Start-TokenVendorApplication -brand $certInfo.tokenBrand -providerName $certInfo.providerName
            }

            Write-Host " [TOKEN] Dang xac thuc ma PIN va doc CKS tu $($certInfo.tokenBrand) [$($cert.SerialNumber)]..." -ForegroundColor Cyan

            # Tao 1 challenge hash 32-byte de yeu cau USB Token xac thuc ma PIN va ky thu
            $challengeBytes = [System.Text.Encoding]::UTF8.GetBytes("BHXH_TOKEN_VERIFY_" + (Get-Date).ToString("yyyyMMddHHmmss"))
            $challengeHash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($challengeBytes)
            $testSig = Invoke-TokenSignHash -cert $cert -hash $challengeHash -pin $pin

            Write-Host " [OK] Da xac thuc ma PIN va lay thong tin CKS thanh cong: $($certInfo.commonName)" -ForegroundColor Green

            $respData = @{
                status = "success"
                verified = $true
                launchedApp = $launchedApp
                tokenInfo = $certInfo
            }
            $json = ConvertTo-Json $respData -Depth 4
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Proxy trung gian VNPT SmartCA cho Web App (doi IP ve Viet Nam)
        if ($request.Url.AbsolutePath -eq "/smartca-proxy" -and $request.HttpMethod -eq "POST") {
            $targetUrl = $request.QueryString["url"]
            if (-not $targetUrl) {
                $targetUrl = "https://gwsca.vnpt.vn/sca/sp769/v1/credentials/get_certificate"
            }

            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $postData = $reader.ReadToEnd()
            $reader.Close()

            try {
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls

                $httpReq = [System.Net.HttpWebRequest]::Create($targetUrl)
                $httpReq.Method = "POST"
                $httpReq.ContentType = "application/json; charset=utf-8"
                $httpReq.Accept = "application/json"
                $httpReq.Timeout = 15000
                $httpReq.KeepAlive = $false

                if ($postData) {
                    $postBytes = [System.Text.Encoding]::UTF8.GetBytes($postData)
                    $httpReq.ContentLength = $postBytes.Length
                    $postStream = $httpReq.GetRequestStream()
                    $postStream.Write($postBytes, 0, $postBytes.Length)
                    $postStream.Close()
                }

                $httpResp = $httpReq.GetResponse()
                $respStream = $httpResp.GetResponseStream()
                $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                $respText = $respReader.ReadToEnd()
                $respReader.Close()
                $httpResp.Close()

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($respText)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                Write-Host " [OK] SmartCA Proxy thanh cong: $targetUrl" -ForegroundColor Green
                continue
            } catch [System.Net.WebException] {
                $webEx = $_.Exception
                $errRespText = ""
                if ($webEx.Response) {
                    $errStream = $webEx.Response.GetResponseStream()
                    $errReader = New-Object System.IO.StreamReader($errStream, [System.Text.Encoding]::UTF8)
                    $errRespText = $errReader.ReadToEnd()
                    $errReader.Close()
                    $webEx.Response.Close()
                }
                $errJson = if ($errRespText) { $errRespText } else { (ConvertTo-Json @{ status_code = 502; message = $webEx.Message }) }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                Write-Host " [CANH BAO] SmartCA tra ve loi: $($webEx.Message)" -ForegroundColor Yellow
                continue
            } catch {
                $errJson = ConvertTo-Json @{ status_code = 502; message = $_.ToString() }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.StatusCode = 200
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }
        }

        if ($request.Url.AbsolutePath -eq "/sign-hash" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $parsed = ConvertFrom-Json $body
            $hashB64 = $parsed.hashBase64
            $pin = if ($parsed.pin) { [string]$parsed.pin } else { "" }

            if (-not $hashB64) {
                throw "Khong tim thay truong hashBase64 trong du lieu gui len."
            }

            $targetSerial = if ($parsed.serial) { $parsed.serial } elseif ($parsed.serialNumber) { $parsed.serialNumber } else { "" }
            $cert = Get-UsbCertificate -interactive $true -targetSerial $targetSerial
            if (-not $cert) {
                throw "Khong tim thay chung thu so USB Token phu hop tren may tinh. Vui long cam USB Token vao may va kiem tra driver."
            }

            $certInfo = Format-CertObject $cert
            Write-Host " Nhan yeu cau ky Hash (PDF/Data) bang [$($certInfo.tokenBrand)] cho: $($certInfo.commonName) [Serial: $($cert.SerialNumber)]" -ForegroundColor Green
            $hashBytes = [Convert]::FromBase64String($hashB64)
            $sigBytes = Invoke-TokenSignHash -cert $cert -hash $hashBytes -pin $pin
            $sigB64 = [Convert]::ToBase64String($sigBytes)

            $respData = @{
                status = "success"
                signature = $sigB64
                certificate = [Convert]::ToBase64String($cert.RawData)
                subject = $cert.Subject
                serialNumber = $cert.SerialNumber
                tokenInfo = $certInfo
            }
            $json = ConvertTo-Json $respData -Depth 4
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            Write-Host " [OK] Da ky Hash (PDF) thanh cong bang $($certInfo.tokenBrand)!" -ForegroundColor Green
            continue
        }

        if ($request.Url.AbsolutePath -eq "/sign" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $parsed = ConvertFrom-Json $body
            $xmlInput = $parsed.xml
            $pin = if ($parsed.pin) { [string]$parsed.pin } else { "" }

            if (-not $xmlInput) {
                throw "Khong tim thay truong xml trong du lieu gui len."
            }

            $targetSerial = if ($parsed.serial) { $parsed.serial } elseif ($parsed.serialNumber) { $parsed.serialNumber } else { "" }
            $cert = Get-UsbCertificate -interactive $true -targetSerial $targetSerial
            if (-not $cert) {
                throw "Khong tim thay chung thu so USB Token phu hop tren may tinh. Vui long cam USB Token vao may va kiem tra driver."
            }

            $certInfo = Format-CertObject $cert
            Write-Host " Nhan yeu cau ky bang [$($certInfo.tokenBrand)] cho: $($certInfo.commonName) [Serial: $($cert.SerialNumber)]" -ForegroundColor Green
            $signResult = Sign-BhxhXmlDocument -xmlString $xmlInput -cert $cert -pin $pin

            $respData = @{
                status = "success"
                signedXml = $signResult.SignedXml
                signature = $signResult.Signature
                certificate = $signResult.Certificate
                subject = $signResult.Subject
                serialNumber = $signResult.SerialNumber
                tokenInfo = $certInfo
            }
            $json = ConvertTo-Json $respData -Depth 4
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            Write-Host " [OK] Da ky so thanh cong bang $($certInfo.tokenBrand) va tra ve cho trinh duyet!" -ForegroundColor Green
            continue
        }

        $response.StatusCode = 404
        $response.Close()
    } catch {
        Write-Host " [LOI XU LY]: $_" -ForegroundColor Red
        if ($context -and $context.Response) {
            $errData = @{
                status = "error"
                message = $_.ToString()
            }
            $json = ConvertTo-Json $errData
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $context.Response.StatusCode = 500
            $context.Response.ContentType = "application/json; charset=utf-8"
            $context.Response.ContentLength64 = $buffer.Length
            $context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
            $context.Response.Close()
        }
    }
}
