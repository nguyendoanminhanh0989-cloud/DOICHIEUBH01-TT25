<# : chooser
@echo off
chcp 65001 >nul
title CÔNG CỤ KÝ SỐ USB TOKEN CỤC BỘ (LOCAL AGENT) - BHXH TT25
powershell -NoProfile -ExecutionPolicy Bypass "Invoke-Expression ([System.IO.File]::ReadAllText('%~f0'))"
exit /b %ERRORLEVEL%
#>

Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Web

$port = 18088
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host " [OK] CONG CU KY SO USB TOKEN DANG CHAY TAI: $prefix" -ForegroundColor Green
    Write-Host " Ban co the de cua so nay chay an va thuc hien ky so tren trinh duyet web." -ForegroundColor Yellow
    Write-Host " Khi bam 'Ky so' tren web, hop thoai ma PIN cua USB Token se tu dong xuat hien." -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
} catch {
    Write-Host " [LOI] Khong the mo cong $port. Co the ung dung da chay truoc do: $_" -ForegroundColor Red
    Read-Host "Nhan Enter de thoat..."
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
        return $certs[0]
    }

    [System.Reflection.Assembly]::LoadWithPartialName("System.Security") | Out-Null
    $selected = [System.Security.Cryptography.X509Certificates.X509Certificate2UI]::SelectFromCollection(
        $certs, "Chon chung thu so USB Token", "Chon chung thu so cua don vi / ca nhan de ky:", 
        [System.Security.Cryptography.X509Certificates.X509SelectionFlag]::SingleSelection
    )
    if ($selected.Count -gt 0) {
        return $selected[0]
    }
    return $certs[0]
}

function Sign-XmlContent([string]$xmlString, $cert) {
    [xml]$xmlDoc = New-Object System.Xml.XmlDocument
    $xmlDoc.PreserveWhitespace = $true
    $xmlDoc.LoadXml($xmlString)

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

    Write-Host " Dang yeu cau ky so bang USB Token..." -ForegroundColor Cyan
    $signedXml.ComputeSignature()
    $xmlDigitalSignature = $signedXml.GetXml()

    $rootNode = $xmlDoc.DocumentElement
    $chuKyNode = $xmlDoc.CreateElement("CHUKYDONVI", $rootNode.NamespaceURI)
    $importedSig = $xmlDoc.ImportNode($xmlDigitalSignature, $true)
    $chuKyNode.AppendChild($importedSig) | Out-Null

    $oldSig = $rootNode.SelectSingleNode("//*[local-name()='CHUKYDONVI']")
    if ($oldSig) { $rootNode.RemoveChild($oldSig) | Out-Null }
    $rootNode.AppendChild($chuKyNode) | Out-Null

    $sw = New-Object System.IO.StringWriter
    $xmlDoc.Save($sw)
    $signedXmlText = $sw.ToString()

    $sigBase64 = [Convert]::ToBase64String($signedXml.SignatureValue)
    $certBase64 = [Convert]::ToBase64String($cert.RawData)

    return @{
        SignedXml = $signedXmlText
        Signature = $sigBase64
        Certificate = $certBase64
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

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ($request.Url.AbsolutePath -eq "/ping") {
            $cert = Get-UsbCertificate
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

        if ($request.Url.AbsolutePath -eq "/sign" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $parsed = ConvertFrom-Json $body
            $xmlInput = $parsed.xml

            if (-not $xmlInput) {
                throw "Khong tim thay truong xml trong du lieu gui len."
            }

            $cert = Get-UsbCertificate
            if (-not $cert) {
                throw "Khong tim thay chung thu so USB Token nao tren may tinh. Vui long cam USB Token vao may va kiem tra driver."
            }

            Write-Host " Nhan yeu cau ky cho: $($cert.Subject)" -ForegroundColor Green
            $signResult = Sign-XmlContent -xmlString $xmlInput -cert $cert

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
