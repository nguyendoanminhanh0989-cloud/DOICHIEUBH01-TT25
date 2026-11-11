<#
================================================================================
CÔNG CỤ KÝ SỐ USB TOKEN CỤC BỘ (LOCAL AGENT) - ĐỐI CHIẾU 01BH & CHỨNG TỪ TT25
Tác giả: Nguyễn Đoàn Minh Ánh - IT Y Tế Đà Nẵng
Cổng lắng nghe: http://127.0.0.1:18088/
Hỗ trợ: Mọi USB Token (Viettel, VNPT, BKAV, FPT, EasyCA, SmartSign, NewTel, v.v.)
Tuân thủ: Phụ lục 02 Thông tư 25/2025/TT-BYT & Quyết định BHXH Việt Nam
================================================================================
#>

Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Xml

$port = 18088
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " [OK] CONG CU KY SO USB TOKEN DANG CHAY TAI: $prefix" -ForegroundColor Green
    Write-Host " Ban co the de cua so nay chay an va thuc hien ky so tren trinh duyet web." -ForegroundColor Yellow
    Write-Host " Khi co yeu cau ky, hop thoai nhap ma PIN cua USB Token se tu dong xuat hien." -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
} catch {
    Write-Host " [LOI] Khong the mo cong $port. Co the ung dung da chay truoc do: $_" -ForegroundColor Red
    exit 1
}

function Get-UsbCertificate {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
    $certs = $store.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }
    
    if (-not $certs -or $certs.Count -eq 0) {
        $storeLM = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
        $storeLM.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $certs = $storeLM.Certificates | Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) }
    }

    if (-not $certs -or $certs.Count -eq 0) {
        return $null
    }

    if ($certs.Count -eq 1) {
        $script:cachedCert = $certs[0]
        return $certs[0]
    }

    # Khi chi ping kiem tra (non-interactive), uu tien lay CKS con han xa nhat
    if (-not $interactive) {
        return ($certs | Sort-Object NotAfter -Descending | Select-Object -First 1)
    }

    # Khi ky thuc te, cho nguoi dung chon CKS neu co nhieu hon 1
    [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
    $collection = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2Collection
    foreach ($c in $certs) {
        $collection.Add($c) | Out-Null
    }

    try {
        $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
            $collection, "Chon chung thu so USB Token", "Chon chung thu so cua don vi / ca nhan de ky:", 
            [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
        )
        if ($selected.Count -gt 0) {
            $script:cachedCert = $selected[0]
            return $selected[0]
        }
    } catch {
        Write-Host " [CANH BAO]: Khong mo duoc hop thoai chon CKS: $_" -ForegroundColor Yellow
    }

    $script:cachedCert = $certs | Sort-Object NotAfter -Descending | Select-Object -First 1
    return $script:cachedCert
}

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
    # Tim Id ho so (THONGTINHOSO hoac DS_CHITIET hoac the co attribute Id)
    $hoSoNode = $root.SelectSingleNode("//*[@Id]")
    $hoSoId = if ($hoSoNode) { $hoSoNode.GetAttribute("Id") } else { "Id-" + [Guid]::NewGuid().ToString() }
    $is01BH = (-not $hoSoNode)

    $signedXml = New-Object System.Security.Cryptography.Xml.SignedXml($xmlDoc)
    $signedXml.Signature.Id = "CHUKYDONVI-$hoSoId"
    
    # Lay Private Key tuong thich SHA-256 tu USB Token
    $dummyKey = New-Object System.Security.Cryptography.RSACryptoServiceProvider(2048)
    $signedXml.SigningKey = $dummyKey

    $signedXml.SignedInfo.CanonicalizationMethod = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    $signedXml.SignedInfo.SignatureMethod = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"

    # KeyInfo chua Certificate va SubjectName
    $keyInfo = New-Object System.Security.Cryptography.Xml.KeyInfo
    $kix = New-Object System.Security.Cryptography.Xml.KeyInfoX509Data
    $kix.AddSubjectName($cert.Subject)
    $kix.AddCertificate($cert)
    $keyInfo.AddClause($kix)
    $signedXml.KeyInfo = $keyInfo

    if ($is01BH) {
        # Enveloped signature tren toan bo file (URI="") + Object SigningTime chuan BHXH
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

        $ref = New-Object System.Security.Cryptography.Xml.Reference("")
        $env = New-Object System.Security.Cryptography.Xml.XmlDsigEnvelopedSignatureTransform
        $ref.AddTransform($env)
        $ref.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($ref)
    } else {
        # Ho so chung tu (CT03, CT04, CT05, CT06, CT07... theo Phu luc 02 BHXH)
        $objDoc = New-Object System.Xml.XmlDocument
        $signingTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        $objXml = "<SignatureProperties xmlns=`"`"><SignatureProperty Target=`"#CHUKYDONVI-$hoSoId`" Id=`"SignatureProperty-CHUKYDONVI-$hoSoId`"><SigningTime>$signingTime</SigningTime></SignatureProperty></SignatureProperties>"
        $objDoc.LoadXml($objXml)

        $dataObj = New-Object System.Security.Cryptography.Xml.DataObject
        $dataObj.Id = "Object-CHUKYDONVI-$hoSoId"
        $dataObj.Data = $objDoc.ChildNodes
        $signedXml.AddObject($dataObj)

        # Reference 1: Object SigningTime
        $refObj = New-Object System.Security.Cryptography.Xml.Reference("#Object-CHUKYDONVI-$hoSoId")
        $refObj.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($refObj)

        # Reference 2: THONGTINHOSO Id
        $refHoSo = New-Object System.Security.Cryptography.Xml.Reference("#$hoSoId")
        $refHoSo.DigestMethod = "http://www.w3.org/2001/04/xmlenc#sha256"
        $signedXml.AddReference($refHoSo)
    }

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

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Cho phep CORS de Web App tren Vercel hoac Localhost deu goi duoc
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        $response.Headers.Add("Access-Control-Allow-Private-Network", "true")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($request.Url.AbsolutePath -eq "/ping") {
            $cert = Get-UsbCertificate -interactive $false
            $info = @{
                status = "ok"
                subject = if ($cert) { $cert.Subject } else { "Chua cam USB Token hoac chua cai Driver" }
                serial = if ($cert) { $cert.SerialNumber } else { "" }
            }
            $json = ConvertTo-Json $info
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Proxy trung gian VNPT SmartCA cho Web App (giup web tren Vercel vuot qua chan IP nuoc ngoai va chan CORS)
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

        if ($request.Url.AbsolutePath -eq "/sign" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $parsed = ConvertFrom-Json $body
            $xmlInput = $parsed.xml

            if (-not $xmlInput) {
                throw "Khong tim thay truong xml trong du lieu gui len."
            }

            $cert = Get-UsbCertificate -interactive $true
            if (-not $cert) {
                throw "Khong tim thay chung thu so USB Token nao tren may tinh. Vui long cam USB Token vao may va kiem tra driver."
            }

            Write-Host " Nhan yeu cau ky cho: $($cert.Subject)" -ForegroundColor Green
            $signResult = Sign-BhxhXmlDocument -xmlString $xmlInput -cert $cert

            $respData = @{
                status = "success"
                signedXml = $signResult.SignedXml
                signature = $signResult.Signature
                certificate = $signResult.Certificate
                subject = $signResult.Subject
                serialNumber = $signResult.SerialNumber
            }
            $json = ConvertTo-Json $respData
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            Write-Host " [OK] Da ky so thanh cong va tra ve cho trinh duyet!" -ForegroundColor Green
            continue
        }

        # 404
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
