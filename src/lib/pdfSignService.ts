/**
 * SERVICE KÝ SỐ PDF (MẪU 02/BH) & IMPORT ẢNH CHỮ KÝ TAY TRONG SUỐT
 * Chuyển đổi nguyên bản 100% tính năng từ phần mềm Desktop "HIS XML TT12 BYT" (MainView.xaml.cs & VnptSmartCaPdfSignature.cs):
 * - Tách nền trắng/xám của ảnh chữ ký tay thành trong suốt (Luminance L = 0.299R + 0.587G + 0.114B)
 * - Ghép ảnh chữ ký tay nằm dưới + chữ ký số màu đỏ nằm đè lên trên ở độ phân giải cao 1200x400
 * - Xử lý chính xác tọa độ PDF kể cả trang xoay ngang (/Rotate 90 như MAU_02BH.pdf)
 * - Ký số PKCS#7 detached (adbe.pkcs7.detached) bằng cấu hình sẵn có trên Web App (VNPT SmartCA TOTP/App & USB Token)
 * - Ghi theo chuẩn Incremental Update của PDF: hỗ trợ ký chồng nhiều chữ ký liên tiếp (3 chữ ký trên Mẫu 02/BH) trên cùng 1 file _signed.pdf
 *
 * Tác giả: NGUYỄN ĐOÀN MINH ÁNH - IT Y TẾ ĐÀ NẴNG
 */

import {
  getSmartCAConfig,
  getSmartCaCertificate,
  signSmartCAHash,
  SmartCAConfig,
} from './vnptSmartCaService';
import { signHashWithUsbToken } from './localTokenSignerService';

export interface PdfRelativeBox {
  relX: number; // 0..1 từ mép trái trang hiển thị
  relY: number; // 0..1 từ mép trên trang hiển thị
  relW: number; // 0..1 tỷ lệ chiều rộng ô chữ ký so với chiều rộng trang hiển thị
  relH: number; // 0..1 tỷ lệ chiều cao ô chữ ký so với chiều cao trang hiển thị
}

export interface PdfPageInfo {
  pageNumber: number;
  totalPages: number;
  mediaBox: [number, number, number, number];
  rotation: number;
  visualWidth: number;
  visualHeight: number;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

let pdfJsLoadPromise: Promise<any> | null = null;

/**
 * Tải thư viện PDF.js để hiển thị trang PDF trực quan trên Canvas
 */
export async function ensurePdfJsLoaded(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib) return window.pdfjsLib;
  if (pdfJsLoadPromise) return pdfJsLoadPromise;

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('Không khởi tạo được thư viện hiển thị PDF.'));
      }
    };
    script.onerror = () => {
      pdfJsLoadPromise = null;
      reject(new Error('Không tải được thư viện hiển thị PDF (pdf.js).'));
    };
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

/**
 * Render 1 trang của file PDF lên thẻ <canvas> và trả về thông tin kích thước trang
 */
export async function renderPdfPageToCanvas(
  pdfBytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.6
): Promise<PdfPageInfo> {
  const pdfjsLib = await ensurePdfJsLoaded();
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const safePage = Math.max(1, Math.min(pageNumber, totalPages));
  const page = await pdfDoc.getPage(safePage);

  const viewport = page.getViewport({ scale });
  const unscaledViewport = page.getViewport({ scale: 1 });
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không khởi tạo được ngữ cảnh 2D của Canvas.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const viewBox = page.view || [0, 0, 595, 842];
  const rotation = page.rotate || 0;

  return {
    pageNumber: safePage,
    totalPages,
    mediaBox: [viewBox[0], viewBox[1], viewBox[2], viewBox[3]],
    rotation,
    visualWidth: unscaledViewport.width,
    visualHeight: unscaledViewport.height,
  };
}

/**
 * Trích xuất tên người ký (CN) và tên tổ chức (O) từ chuỗi Subject DN của chứng thư số
 * Giữ nguyên logic ExtractCertificateInfo trong MainView.xaml.cs (dòng 1603-1636)
 */
export function extractCertDisplayInfo(subjectDN: string): {
  signerName: string;
  orgName: string;
} {
  let signerName = '';
  let orgName = '';

  const parts = (subjectDN || '').split(',');
  for (const part of parts) {
    const p = part.trim();
    if (/^CN=/i.test(p) && !signerName) {
      signerName = p.substring(3).trim();
    } else if (/^O=/i.test(p) && !orgName) {
      orgName = p.substring(2).trim();
    }
  }

  if (!signerName) signerName = subjectDN || 'Đơn vị Khám chữa bệnh';
  if (!orgName) orgName = signerName;

  return { signerName, orgName };
}

/**
 * Tách nền trắng/xám của ảnh chữ ký tay thành trong suốt (RGBA)
 * Giữ nguyên 100% thuật toán MakeBackgroundTransparent trong MainView.xaml.cs (dòng 1479-1519)
 */
export async function makeSignatureBackgroundTransparent(
  imageSourceUrlOrBase64: string
): Promise<HTMLCanvasElement> {
  const img = await loadImageElement(imageSourceUrlOrBase64);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 400;
  canvas.height = img.naturalHeight || img.height || 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể xử lý ảnh chữ ký.');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    // Tính độ sáng (Luminance) của điểm ảnh
    const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    if (luminance > 180) {
      // Nền trắng / xám nhạt -> trong suốt hoàn toàn
      data[i + 3] = 0;
    } else if (luminance > 100) {
      // Vùng viền chuyển tiếp -> làm mờ dần (chống răng cưa)
      data[i + 3] = Math.round(((180 - luminance) * 255) / 80);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không đọc được dữ liệu ảnh chữ ký.'));
    img.src = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
  });
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width <= maxWidth || !current) {
        current = test;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Tạo ảnh con dấu chữ ký tổng hợp độ phân giải cao (1200x400):
 * - Nền trong suốt 100%
 * - Lớp 1 (Nằm dưới): Ảnh chữ ký tay đã tách nền trắng thành trong suốt
 * - Lớp 2 (Nằm đè lên trên): Chữ đỏ đậm (Ký bởi / Ngày ký / Tổ chức xác thực)
 * Giữ nguyên 100% logic của CreateCompositeSignatureImage trong MainView.xaml.cs (dòng 1521-1601)
 */
export async function createCompositeSignatureStamp(options: {
  signerName: string;
  orgName: string;
  signDate?: Date;
  signatureImageBase64?: string;
}): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  rgbBytes: Uint8Array;
  alphaBytes: Uint8Array;
}> {
  const width = 1200;
  const height = 400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không tạo được canvas con dấu chữ ký.');

  // Nền trong suốt hoàn toàn
  ctx.clearRect(0, 0, width, height);

  // 1. Vẽ ảnh chữ ký tay nằm ở dưới (nếu có)
  if (options.signatureImageBase64 && options.signatureImageBase64.trim()) {
    try {
      const transparentSigCanvas = await makeSignatureBackgroundTransparent(
        options.signatureImageBase64.trim()
      );
      const maxImgW = width * 0.95;
      const maxImgH = height * 0.95;
      const ratio = Math.min(
        maxImgW / transparentSigCanvas.width,
        maxImgH / transparentSigCanvas.height
      );
      const newW = Math.round(transparentSigCanvas.width * ratio);
      const newH = Math.round(transparentSigCanvas.height * ratio);
      const posX = Math.round((width - newW) / 2);
      const posY = Math.round((height - newH) / 2);
      ctx.drawImage(transparentSigCanvas, posX, posY, newW, newH);
    } catch (e) {
      console.warn('Bỏ qua ảnh chữ ký lỗi:', e);
    }
  }

  // 2. Vẽ chữ đỏ nằm đè lên trên ảnh chữ ký
  const d = options.signDate || new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  const rawText =
    `Ký bởi: ${options.signerName}\n` +
    `Ngày ký: ${dateStr}\n` +
    `Tổ chức xác thực: ${options.orgName}`;

  const margin = 24;
  const maxTextW = width - margin * 2;
  const maxTextH = height - margin * 2;

  let fontSize = 44;
  let wrappedLines: string[] = [];
  let lineHeight = fontSize * 1.28;

  while (fontSize > 20) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    wrappedLines = wrapTextLines(ctx, rawText, maxTextW);
    lineHeight = Math.round(fontSize * 1.28);
    if (wrappedLines.length * lineHeight <= maxTextH) {
      break;
    }
    fontSize -= 2;
  }

  const totalTextHeight = wrappedLines.length * lineHeight;
  let startY = Math.round((height - totalTextHeight) / 2 + fontSize * 0.85);

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgb(210, 0, 0)';
  for (const line of wrappedLines) {
    ctx.fillText(line, margin, startY);
    startY += lineHeight;
  }

  const imgData = ctx.getImageData(0, 0, width, height).data;
  const pixelCount = width * height;
  const rgbBytes = new Uint8Array(pixelCount * 3);
  const alphaBytes = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    rgbBytes[i * 3] = imgData[i * 4];
    rgbBytes[i * 3 + 1] = imgData[i * 4 + 1];
    rgbBytes[i * 3 + 2] = imgData[i * 4 + 2];
    alphaBytes[i] = imgData[i * 4 + 3];
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    rgbBytes,
    alphaBytes,
  };
}

/**
 * Nén dữ liệu nhị phân theo chuẩn Zlib (RFC 1950) cho bộ lọc /FlateDecode của PDF
 */
async function compressZlibFlate(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate');
      const writer = cs.writable.getWriter();
      writer.write(raw);
      writer.close();
      const resp = new Response(cs.readable);
      const buf = await resp.arrayBuffer();
      return new Uint8Array(buf);
    } catch {}
  }
  // Fallback: Uncompressed Zlib blocks (RFC 1950 + RFC 1951 stored blocks)
  const maxBlock = 65535;
  const numBlocks = Math.ceil(raw.length / maxBlock) || 1;
  const out = new Uint8Array(2 + raw.length + numBlocks * 5 + 4);
  let pos = 0;
  out[pos++] = 0x78;
  out[pos++] = 0x01;

  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlock;
    const end = Math.min(raw.length, start + maxBlock);
    const len = end - start;
    const isLast = i === numBlocks - 1 ? 1 : 0;
    out[pos++] = isLast;
    out[pos++] = len & 0xff;
    out[pos++] = (len >> 8) & 0xff;
    const nlen = ~len & 0xffff;
    out[pos++] = nlen & 0xff;
    out[pos++] = (nlen >> 8) & 0xff;
    out.set(raw.subarray(start, end), pos);
    pos += len;
  }

  // Adler-32 checksum
  let a = 1;
  let b = 0;
  for (let i = 0; i < raw.length; i++) {
    a = (a + raw[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = ((b << 16) | a) >>> 0;
  out[pos++] = (adler >>> 24) & 0xff;
  out[pos++] = (adler >>> 16) & 0xff;
  out[pos++] = (adler >>> 8) & 0xff;
  out[pos++] = adler & 0xff;
  return out.subarray(0, pos);
}

// ============================================================================
// BỘ MÃ HÓA ASN.1 DER CHUẨN PKCS#7 / CMS DETACHED (adbe.pkcs7.detached)
// ============================================================================

function encodeDerLength(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  const bytes: number[] = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derNode(tag: number, content: Uint8Array): Uint8Array {
  const lenBytes = encodeDerLength(content.length);
  const out = new Uint8Array(1 + lenBytes.length + content.length);
  out[0] = tag;
  out.set(lenBytes, 1);
  out.set(content, 1 + lenBytes.length);
  return out;
}

function concatUint8(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function derSequence(items: Uint8Array[]): Uint8Array {
  return derNode(0x30, concatUint8(items));
}

function derSet(items: Uint8Array[]): Uint8Array {
  return derNode(0x31, concatUint8(items));
}

function derOid(oidStr: string): Uint8Array {
  const parts = oidStr.split('.').map(Number);
  const bytes: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val === 0) {
      bytes.push(0);
      continue;
    }
    const sub: number[] = [];
    while (val > 0) {
      sub.unshift(val & 0x7f);
      val = Math.floor(val / 128);
    }
    for (let j = 0; j < sub.length - 1; j++) {
      sub[j] |= 0x80;
    }
    bytes.push(...sub);
  }
  return derNode(0x06, new Uint8Array(bytes));
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/-----[^\n]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
}

/**
 * Đọc cấu trúc TLV ASN.1 để trích xuất chính xác SerialNumber và Issuer TLV từ X.509 Certificate DER
 */
function readAsn1Tlv(buf: Uint8Array, offset: number): {
  tag: number;
  headerLen: number;
  contentLen: number;
  totalLen: number;
  rawSlice: Uint8Array;
  contentSlice: Uint8Array;
} {
  const tag = buf[offset];
  let lenByte = buf[offset + 1];
  let headerLen = 2;
  let contentLen = 0;
  if ((lenByte & 0x80) === 0) {
    contentLen = lenByte;
  } else {
    const numOctets = lenByte & 0x7f;
    headerLen = 2 + numOctets;
    for (let i = 0; i < numOctets; i++) {
      contentLen = (contentLen << 8) | buf[offset + 2 + i];
    }
  }
  const totalLen = headerLen + contentLen;
  return {
    tag,
    headerLen,
    contentLen,
    totalLen,
    rawSlice: buf.subarray(offset, offset + totalLen),
    contentSlice: buf.subarray(offset + headerLen, offset + totalLen),
  };
}

function extractIssuerAndSerialFromCertDer(certDer: Uint8Array): Uint8Array {
  const certSeq = readAsn1Tlv(certDer, 0);
  const tbsCert = readAsn1Tlv(certSeq.contentSlice, 0);
  const tbs = tbsCert.contentSlice;

  let pos = 0;
  const first = readAsn1Tlv(tbs, pos);
  // Nếu có [0] EXPLICIT Version (tag 0xA0), nhảy qua để tới serialNumber
  if (first.tag === 0xa0) {
    pos += first.totalLen;
  }
  const serialTlv = readAsn1Tlv(tbs, pos);
  pos += serialTlv.totalLen;

  const sigAlgTlv = readAsn1Tlv(tbs, pos);
  pos += sigAlgTlv.totalLen;

  const issuerTlv = readAsn1Tlv(tbs, pos);
  return derSequence([issuerTlv.rawSlice, serialTlv.rawSlice]);
}

/**
 * Tạo gói PKCS#7 / CMS SignedData (1.2.840.113549.1.7.2) cho chữ ký số PDF
 */
function buildPkcs7SignedDataDer(options: {
  certDer: Uint8Array;
  caCertDer?: Uint8Array;
  signedAttrsContentBytes: Uint8Array;
  signatureBytes: Uint8Array;
}): Uint8Array {
  const oidSignedData = derOid('1.2.840.113549.1.7.2');
  const oidData = derOid('1.2.840.113549.1.7.1');
  const oidSha256 = derOid('2.16.840.1.101.3.4.2.1');
  const oidRsaEncryption = derOid('1.2.840.113549.1.1.1');

  const nullDer = new Uint8Array([0x05, 0x00]);
  const sha256AlgId = derSequence([oidSha256, nullDer]);
  const rsaAlgId = derSequence([oidRsaEncryption, nullDer]);

  const version1 = new Uint8Array([0x02, 0x01, 0x01]);
  const digestAlgorithms = derSet([sha256AlgId]);
  const encapContentInfo = derSequence([oidData]);

  const certList = [options.certDer];
  if (options.caCertDer && options.caCertDer.length > 50) {
    certList.push(options.caCertDer);
  }
  const certificatesImplicit = derNode(0xa0, concatUint8(certList));

  const issuerAndSerial = extractIssuerAndSerialFromCertDer(options.certDer);
  const signedAttrsImplicit = derNode(0xa0, options.signedAttrsContentBytes);
  const signatureOctet = derNode(0x04, options.signatureBytes);

  const signerInfo = derSequence([
    version1,
    issuerAndSerial,
    sha256AlgId,
    signedAttrsImplicit,
    rsaAlgId,
    signatureOctet,
  ]);
  const signerInfos = derSet([signerInfo]);

  const signedData = derSequence([
    version1,
    digestAlgorithms,
    encapContentInfo,
    certificatesImplicit,
    signerInfos,
  ]);

  return derSequence([oidSignedData, derNode(0xa0, signedData)]);
}

function buildSignedAttrsContent(byteRangeSha256: Uint8Array): {
  signedAttrsContentBytes: Uint8Array;
  derSetForHashing: Uint8Array;
} {
  // Attribute 1: contentType (1.2.840.113549.1.9.3) = id-data (1.2.840.113549.1.7.1)
  const attrContentType = derSequence([
    derOid('1.2.840.113549.1.9.3'),
    derSet([derOid('1.2.840.113549.1.7.1')]),
  ]);

  // Attribute 2: messageDigest (1.2.840.113549.1.9.4) = OCTET STRING (32-byte SHA-256 of PDF ByteRange)
  const attrMessageDigest = derSequence([
    derOid('1.2.840.113549.1.9.4'),
    derSet([derNode(0x04, byteRangeSha256)]),
  ]);

  // Theo chuẩn DER SET OF (X.690 mục 11.6), các phần tử trong SET phải sắp xếp tăng dần theo byte đầu
  const items = [attrContentType, attrMessageDigest].sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });

  const signedAttrsContentBytes = concatUint8(items);
  const derSetForHashing = derNode(0x31, signedAttrsContentBytes);
  return { signedAttrsContentBytes, derSetForHashing };
}

// ============================================================================
// TRÌNH PHÂN TÍCH CẤU TRÚC PDF & GHI INCREMENTAL UPDATE (HỖ TRỢ KÝ NHIỀU LẦN)
// ============================================================================

interface ParsedPdfStructure {
  maxObjId: number;
  rootObjId: number;
  rootDictRaw: string;
  existingSigFieldRefs: string[];
  infoObjId?: number;
  idArrayRaw?: string;
  prevStartXref: number;
  pages: Array<{
    pageNumber: number;
    objId: number;
    dictRaw: string;
    mediaBox: [number, number, number, number];
    rotation: number;
  }>;
  existingSigCount: number;
}

function latin1Decode(bytes: Uint8Array): string {
  let out = '';
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return out;
}

function latin1Encode(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    out[i] = str.charCodeAt(i) & 0xff;
  }
  return out;
}

function parsePdfStructure(pdfBytes: Uint8Array): ParsedPdfStructure {
  const txt = latin1Decode(pdfBytes);

  // Tìm tất cả định nghĩa "N 0 obj" (lấy định nghĩa mới nhất ở cuối file nếu đã từng ký Incremental Update)
  const objMap = new Map<number, string>();
  let maxObjId = 1;
  const objRegex = /(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = objRegex.exec(txt)) !== null) {
    const id = parseInt(m[1], 10);
    if (id > maxObjId) maxObjId = id;
    objMap.set(id, m[2]);
  }

  // Tìm startxref cuối cùng
  const startXrefMatches = Array.from(txt.matchAll(/startxref\s+(\d+)/g));
  const prevStartXref =
    startXrefMatches.length > 0
      ? parseInt(startXrefMatches[startXrefMatches.length - 1][1], 10)
      : 0;

  // Tìm Root & Info từ trailer cuối cùng
  let rootObjId = 0;
  let infoObjId: number | undefined;
  let idArrayRaw: string | undefined;

  const trailerMatches = Array.from(txt.matchAll(/trailer\s*<<([\s\S]*?)>>/g));
  for (let i = trailerMatches.length - 1; i >= 0; i--) {
    const tr = trailerMatches[i][1];
    const rMatch = tr.match(/\/Root\s+(\d+)\s+0\s+R/);
    if (rMatch && !rootObjId) rootObjId = parseInt(rMatch[1], 10);
    const iMatch = tr.match(/\/Info\s+(\d+)\s+0\s+R/);
    if (iMatch && !infoObjId) infoObjId = parseInt(iMatch[1], 10);
    const idMatch = tr.match(/\/ID\s*(\[[^\]]+\])/);
    if (idMatch && !idArrayRaw) idArrayRaw = idMatch[1];
  }

  if (!rootObjId) {
    for (const [id, body] of objMap.entries()) {
      if (/\/Type\s*\/Catalog\b/.test(body)) {
        rootObjId = id;
        break;
      }
    }
  }

  // Tìm danh sách các đối tượng Page theo đúng thứ tự
  const pageObjIds: number[] = [];
  const rootBody = objMap.get(rootObjId) || '';
  const pagesRefMatch = rootBody.match(/\/Pages\s+(\d+)\s+0\s+R/);
  if (pagesRefMatch) {
    const pagesId = parseInt(pagesRefMatch[1], 10);
    const collectKids = (nodeId: number, visited: Set<number>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const body = objMap.get(nodeId) || '';
      if (/\/Type\s*\/Page\b(?!s)/.test(body)) {
        pageObjIds.push(nodeId);
        return;
      }
      const kidsMatch = body.match(/\/Kids\s*\[([^\]]+)\]/);
      if (kidsMatch) {
        const refs = Array.from(kidsMatch[1].matchAll(/(\d+)\s+0\s+R/g));
        for (const r of refs) {
          collectKids(parseInt(r[1], 10), visited);
        }
      }
    };
    collectKids(pagesId, new Set<number>());
  }

  if (pageObjIds.length === 0) {
    for (const [id, body] of objMap.entries()) {
      if (/\/Type\s*\/Page\b(?!s)/.test(body)) {
        pageObjIds.push(id);
      }
    }
  }

  const pages = pageObjIds.map((id, idx) => {
    const body = objMap.get(id) || '';
    const dictEnd = body.indexOf('stream');
    const dictRaw = (dictEnd >= 0 ? body.slice(0, dictEnd) : body).trim();

    let mediaBox: [number, number, number, number] = [0, 0, 595, 842];
    const mbMatch = dictRaw.match(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/);
    if (mbMatch) {
      mediaBox = [
        parseFloat(mbMatch[1]),
        parseFloat(mbMatch[2]),
        parseFloat(mbMatch[3]),
        parseFloat(mbMatch[4]),
      ];
    }

    let rotation = 0;
    const rotMatch = dictRaw.match(/\/Rotate\s+(\d+)/);
    if (rotMatch) {
      rotation = parseInt(rotMatch[1], 10) % 360;
    }

    return {
      pageNumber: idx + 1,
      objId: id,
      dictRaw,
      mediaBox,
      rotation,
    };
  });

  const existingSigMatches = txt.match(/\/Type\s*\/Sig\b/g);
  const existingSigCount = existingSigMatches ? existingSigMatches.length : 0;

  // Thu thập các Signature Widget Annotation đã có trong PDF (để giữ nguyên trong /AcroForm /Fields khi ký lần 2, lần 3)
  const existingSigFieldRefs: string[] = [];
  for (const [id, body] of objMap.entries()) {
    if (/\/FT\s*\/Sig\b/.test(body)) {
      existingSigFieldRefs.push(`${id} 0 R`);
    }
  }

  return {
    maxObjId,
    rootObjId,
    rootDictRaw: (objMap.get(rootObjId) || '').trim(),
    existingSigFieldRefs,
    infoObjId,
    idArrayRaw,
    prevStartXref,
    pages,
    existingSigCount,
  };
}

function stripOuterAngles(dictStr: string): string {
  const s = dictStr.trim();
  if (s.startsWith('<<') && s.endsWith('>>')) {
    return s.slice(2, -2).trim();
  }
  return s;
}

/**
 * Thực hiện ký số file PDF (Mẫu 02/BH hoặc bất kỳ tài liệu PDF nào):
 * - Kết hợp ảnh chữ ký tay trong suốt + chữ đỏ thông tin chứng thư số (1200x400)
 * - Tính toán tọa độ chuẩn xác kể cả trang xoay (/Rotate 90)
 * - Gọi ký Hash SHA-256 qua VNPT SmartCA (TOTP/App) hoặc USB Token
 * - Ghi Incremental Update vào PDF giúp ký nhiều chữ ký nối tiếp trên cùng 1 file _signed.pdf
 */
export async function signPdfDocument(options: {
  pdfBytes: Uint8Array;
  pageNumber: number;
  box: PdfRelativeBox;
  method: 'SMARTCA' | 'USB_TOKEN';
  signatureImageBase64?: string;
  onProgress?: (msg: string) => void;
}): Promise<{
  signedPdfBytes: Uint8Array;
  signerName: string;
  orgName: string;
  serialNumber: string;
}> {
  const { pdfBytes, pageNumber, box, method, signatureImageBase64, onProgress } = options;

  let rawCertBase64 = '';
  let caCertBase64 = '';
  let subjectDN = '';
  let serialNumber = '';
  let smartCaCfg: SmartCAConfig | null = null;

  if (method === 'SMARTCA') {
    smartCaCfg = getSmartCAConfig();
    if (!smartCaCfg.clientId || !smartCaCfg.clientSecret || !smartCaCfg.userId) {
      throw new Error(
        'Chưa cấu hình chữ ký số VNPT SmartCA!\n' +
          'Vui lòng bấm nút "⚙ Cấu hình Chữ ký số" để nhập thông tin kết nối VNPT SmartCA và bấm "Lấy chứng thư số".'
      );
    }
    onProgress?.('🔐 Đang lấy thông tin Chứng thư số từ VNPT SmartCA...');
    const certInfo = await getSmartCaCertificate(smartCaCfg);
    rawCertBase64 = certInfo.rawCertBase64;
    caCertBase64 = smartCaCfg.caCertBase64 || '';
    subjectDN = certInfo.subject;
    serialNumber = certInfo.serialNumber;
  } else {
    onProgress?.('🔐 Đang kiểm tra và đọc Chứng thư số từ thiết bị USB Token...');
    const { checkLocalTokenSigner, unlockAndFetchTokenCertificate } = await import(
      './localTokenSignerService'
    );
    const status = await checkLocalTokenSigner(true);
    if (!status.available) {
      throw new Error(
        'Chưa kết nối được công cụ ký số USB Token (Chay_Ky_So_USB_Token.bat trên cổng 18088).\n' +
          'Vui lòng bật file "Chay_Ky_So_USB_Token.bat" trên máy tính và cắm USB Token.'
      );
    }
    if (!status.hasToken || status.certificates.length === 0) {
      throw new Error('Không phát hiện thiết bị USB Token nào đang cắm trên máy tính.');
    }
    const unlocked = status.unlockedCert || (await unlockAndFetchTokenCertificate(undefined, undefined, onProgress));
    rawCertBase64 = unlocked.rawCertBase64 || '';
    subjectDN = unlocked.subject || '';
    serialNumber = unlocked.serial || '';
  }

  const { signerName, orgName } = extractCertDisplayInfo(subjectDN);
  const now = new Date();

  onProgress?.('🎨 Đang tạo con dấu chữ ký độ phân giải cao (tách nền trong suốt + thông tin CKS)...');
  const stamp = await createCompositeSignatureStamp({
    signerName,
    orgName,
    signDate: now,
    signatureImageBase64,
  });

  const compressedRgb = await compressZlibFlate(stamp.rgbBytes);
  const compressedAlpha = await compressZlibFlate(stamp.alphaBytes);

  // Phân tích cấu trúc PDF gốc để chuẩn bị ghi Incremental Update
  const pdfInfo = parsePdfStructure(pdfBytes);
  const targetPage =
    pdfInfo.pages.find(p => p.pageNumber === pageNumber) ||
    pdfInfo.pages[0];
  if (!targetPage) {
    throw new Error('Không tìm thấy trang PDF hợp lệ để chèn chữ ký.');
  }

  const pageW = targetPage.mediaBox[2] - targetPage.mediaBox[0];
  const pageH = targetPage.mediaBox[3] - targetPage.mediaBox[1];
  const rotation = targetPage.rotation;

  // Kích thước hiển thị trực quan của trang PDF (nếu Rotate 90 hoặc 270 thì chiều ngang/dọc hoán đổi)
  const visualW = rotation === 90 || rotation === 270 ? pageH : pageW;
  const visualH = rotation === 90 || rotation === 270 ? pageW : pageH;

  // Tọa độ trong không gian hiển thị (Visual Space: gốc (0,0) ở góc dưới bên trái)
  const vLlx = box.relX * visualW;
  const vUry = visualH - box.relY * visualH;
  const vLly = vUry - box.relH * visualH;
  const vUrx = vLlx + box.relW * visualW;
  const vBoxW = Math.max(20, vUrx - vLlx);
  const vBoxH = Math.max(12, vUry - vLly);

  // Chuyển sang tọa độ PDF gốc (Unrotated PDF User Space) giống hệt MainView.xaml.cs (dòng 1354-1379)
  let pdfX = vLlx;
  let pdfY = vLly;
  let pdfW = vBoxW;
  let pdfH = vBoxH;

  if (rotation === 90) {
    pdfX = pageW - vUry;
    pdfY = vLlx;
    pdfW = vUry - vLly;
    pdfH = vUrx - vLlx;
  } else if (rotation === 180) {
    pdfX = pageW - vUrx;
    pdfY = pageH - vUry;
    pdfW = vUrx - vLlx;
    pdfH = vUry - vLly;
  } else if (rotation === 270) {
    pdfX = vLly;
    pdfY = pageH - vUrx;
    pdfW = vUry - vLly;
    pdfH = vUrx - vLlx;
  }

  const fmtNum = (n: number) => Number(n.toFixed(2));
  const sigIndex = pdfInfo.existingSigCount + 1;
  const imName = `/ImSig${sigIndex}`;

  // Cấp phát ID cho các Object mới trong bản cập nhật Incremental Update
  const smaskObjId = pdfInfo.maxObjId + 1;     // Alpha SMask XObject
  const imgObjId = pdfInfo.maxObjId + 2;       // RGB Image XObject
  const contentObjId = pdfInfo.maxObjId + 3;   // Content stream vẽ con dấu lên trang
  const apFormObjId = pdfInfo.maxObjId + 4;    // Appearance Form XObject (/AP /N)
  const sigDictObjId = pdfInfo.maxObjId + 5;   // Signature Dictionary (/Type /Sig)
  const annotObjId = pdfInfo.maxObjId + 6;     // Signature Widget Annotation (/Subtype /Widget /FT /Sig)
  const newSize = pdfInfo.maxObjId + 7;

  // Chuỗi lệnh vẽ ảnh chữ ký lên trang PDF (tự động xoay khớp với /Rotate của trang)
  let drawCmd = '';
  if (rotation === 90) {
    // Đúng ma trận "0 1 -1 0 pageW 0 cm" của MAU_02BH.pdf
    drawCmd = `q 0 1 -1 0 ${fmtNum(pageW)} 0 cm ${fmtNum(vBoxW)} 0 0 ${fmtNum(vBoxH)} ${fmtNum(vLlx)} ${fmtNum(vLly)} cm ${imName} Do Q\n`;
  } else if (rotation === 180) {
    drawCmd = `q -1 0 0 -1 ${fmtNum(pageW)} ${fmtNum(pageH)} cm ${fmtNum(vBoxW)} 0 0 ${fmtNum(vBoxH)} ${fmtNum(vLlx)} ${fmtNum(vLly)} cm ${imName} Do Q\n`;
  } else if (rotation === 270) {
    drawCmd = `q 0 -1 1 0 0 ${fmtNum(pageH)} cm ${fmtNum(vBoxW)} 0 0 ${fmtNum(vBoxH)} ${fmtNum(vLlx)} ${fmtNum(vLly)} cm ${imName} Do Q\n`;
  } else {
    drawCmd = `q ${fmtNum(pdfW)} 0 0 ${fmtNum(pdfH)} ${fmtNum(pdfX)} ${fmtNum(pdfY)} cm ${imName} Do Q\n`;
  }
  const drawCmdBytes = latin1Encode(drawCmd);

  // Appearance Form XObject (/AP /N) cho trình đọc PDF (Adobe Acrobat / Foxit Reader)
  const apStreamStr =
    rotation === 90
      ? `q 0 1 -1 0 ${fmtNum(pdfW)} 0 cm ${fmtNum(vBoxW)} 0 0 ${fmtNum(vBoxH)} 0 0 cm ${imName} Do Q`
      : `q ${fmtNum(pdfW)} 0 0 ${fmtNum(pdfH)} 0 0 cm ${imName} Do Q`;
  const apStreamBytes = latin1Encode(apStreamStr);

  // Cập nhật Page Dictionary để nối thêm Content Stream mới, XObject mới và Annotation chữ ký
  let pageInner = stripOuterAngles(targetPage.dictRaw);

  // 1. Nối thêm contentObjId vào /Contents
  if (/\/Contents\s*\[([^\]]*)\]/.test(pageInner)) {
    pageInner = pageInner.replace(
      /\/Contents\s*\[([^\]]*)\]/,
      `/Contents [$1 ${contentObjId} 0 R]`
    );
  } else if (/\/Contents\s+(\d+\s+0\s+R)/.test(pageInner)) {
    pageInner = pageInner.replace(
      /\/Contents\s+(\d+\s+0\s+R)/,
      `/Contents [$1 ${contentObjId} 0 R]`
    );
  }

  // 2. Nối thêm imName vào /Resources -> /XObject
  if (/\/XObject\s*<<([^>]*)>>/.test(pageInner)) {
    pageInner = pageInner.replace(
      /\/XObject\s*<<([^>]*)>>/,
      `/XObject <<$1 ${imName} ${imgObjId} 0 R>>`
    );
  } else if (/\/Resources\s*<</.test(pageInner)) {
    pageInner = pageInner.replace(
      /\/Resources\s*<</,
      `/Resources <</XObject <<${imName} ${imgObjId} 0 R>> `
    );
  }

  // 3. Nối thêm annotObjId vào /Annots
  if (/\/Annots\s*\[([^\]]*)\]/.test(pageInner)) {
    pageInner = pageInner.replace(
      /\/Annots\s*\[([^\]]*)\]/,
      `/Annots [$1 ${annotObjId} 0 R]`
    );
  } else {
    pageInner += `/Annots [${annotObjId} 0 R]`;
  }

  const updatedPageObjBytes = latin1Encode(
    `${targetPage.objId} 0 obj\n<<${pageInner}>>\nendobj\n`
  );

  // Cập nhật Catalog (/Root) để khai báo /AcroForm << /Fields [...] /SigFlags 3 >> chuẩn Adobe Acrobat
  let rootInner = stripOuterAngles(pdfInfo.rootDictRaw || '<</Type/Catalog>>');
  const allSigFieldRefs = [...pdfInfo.existingSigFieldRefs, `${annotObjId} 0 R`].join(' ');
  const acroFormBlock = `/AcroForm <</Fields [${allSigFieldRefs}]/SigFlags 3>>`;
  if (/\/AcroForm\s*<<[\s\S]*?>>/.test(rootInner)) {
    rootInner = rootInner.replace(/\/AcroForm\s*<<[\s\S]*?>>/, acroFormBlock);
  } else {
    rootInner += acroFormBlock;
  }
  const updatedRootObjBytes = latin1Encode(
    `${pdfInfo.rootObjId} 0 obj\n<<${rootInner}>>\nendobj\n`
  );

  // Tạo các Object nhị phân
  const smaskHeader = latin1Encode(
    `${smaskObjId} 0 obj\n<</Type/XObject/Subtype/Image/Width ${stamp.width}/Height ${stamp.height}/ColorSpace/DeviceGray/BitsPerComponent 8/Filter/FlateDecode/Length ${compressedAlpha.length}>>\nstream\n`
  );
  const smaskFooter = latin1Encode(`\nendstream\nendobj\n`);
  const smaskObjBytes = concatUint8([smaskHeader, compressedAlpha, smaskFooter]);

  const imgHeader = latin1Encode(
    `${imgObjId} 0 obj\n<</Type/XObject/Subtype/Image/Width ${stamp.width}/Height ${stamp.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/SMask ${smaskObjId} 0 R/Filter/FlateDecode/Length ${compressedRgb.length}>>\nstream\n`
  );
  const imgFooter = latin1Encode(`\nendstream\nendobj\n`);
  const imgObjBytes = concatUint8([imgHeader, compressedRgb, imgFooter]);

  const contentObjBytes = concatUint8([
    latin1Encode(`${contentObjId} 0 obj\n<</Length ${drawCmdBytes.length}>>\nstream\n`),
    drawCmdBytes,
    latin1Encode(`\nendstream\nendobj\n`),
  ]);

  const apFormObjBytes = concatUint8([
    latin1Encode(
      `${apFormObjId} 0 obj\n<</Type/XObject/Subtype/Form/BBox [0 0 ${fmtNum(pdfW)} ${fmtNum(pdfH)}]/Resources <</XObject <<${imName} ${imgObjId} 0 R>>>>/Length ${apStreamBytes.length}>>\nstream\n`
    ),
    apStreamBytes,
    latin1Encode(`\nendstream\nendobj\n`),
  ]);

  const annotObjBytes = latin1Encode(
    `${annotObjId} 0 obj\n<</Type/Annot/Subtype/Widget/FT/Sig/Rect [${fmtNum(pdfX)} ${fmtNum(pdfY)} ${fmtNum(pdfX + pdfW)} ${fmtNum(pdfY + pdfH)}]/T (Signature_${sigIndex})/V ${sigDictObjId} 0 R/P ${targetPage.objId} 0 R/F 132/AP <</N ${apFormObjId} 0 R>>>>\nendobj\n`
  );

  // Định dạng ngày PDF D:YYYYMMDDHHmmSS+07'00'
  const pad = (n: number) => String(n).padStart(2, '0');
  const pdfDateStr = `D:${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}+07'00'`;

  // Vùng dự trữ /Contents <0000...> (16384 ký tự hex = 8192 bytes DER PKCS#7)
  const contentsHexLen = 16384;
  const byteRangePlaceholder = `[0 0000000000 0000000000 0000000000]`;
  const sigDictPrefix = `${sigDictObjId} 0 obj\n<</Type/Sig/Filter/Adobe.PPKLite/SubFilter/adbe.pkcs7.detached/Name (${signerName.replace(/[()\\]/g, '')})/Location (Viet Nam)/Reason (Ky so bao cao BHYT)/M (${pdfDateStr})/ByteRange ${byteRangePlaceholder}/Contents <`;
  const sigDictSuffix = `>>>\nendobj\n`;

  // Tính toán vị trí offset của từng object trong bản Incremental Update
  const pieces: Uint8Array[] = [];
  let cursor = pdfBytes.length;

  // Đảm bảo bắt đầu bằng xuống dòng nếu file gốc chưa có
  if (pdfBytes[pdfBytes.length - 1] !== 0x0a) {
    const nl = latin1Encode('\n');
    pieces.push(nl);
    cursor += nl.length;
  }

  const pageObjOffset = cursor;
  pieces.push(updatedPageObjBytes);
  cursor += updatedPageObjBytes.length;

  const rootObjOffset = cursor;
  pieces.push(updatedRootObjBytes);
  cursor += updatedRootObjBytes.length;

  const smaskOffset = cursor;
  pieces.push(smaskObjBytes);
  cursor += smaskObjBytes.length;

  const imgOffset = cursor;
  pieces.push(imgObjBytes);
  cursor += imgObjBytes.length;

  const contentOffset = cursor;
  pieces.push(contentObjBytes);
  cursor += contentObjBytes.length;

  const apFormOffset = cursor;
  pieces.push(apFormObjBytes);
  cursor += apFormObjBytes.length;

  const sigDictOffset = cursor;
  const sigPrefixBytes = latin1Encode(sigDictPrefix);
  const sigPlaceholderHexBytes = latin1Encode('0'.repeat(contentsHexLen));
  const sigSuffixBytes = latin1Encode(sigDictSuffix);

  const contentsStartOffset = sigDictOffset + sigPrefixBytes.length - 1; // Vị trí dấu '<'
  const contentsEndOffset = contentsStartOffset + 1 + contentsHexLen + 1; // Vị trí ngay sau dấu '>'
  cursor += sigPrefixBytes.length + sigPlaceholderHexBytes.length + sigSuffixBytes.length;

  const annotOffset = cursor;
  pieces.push(annotObjBytes);
  cursor += annotObjBytes.length;

  // Xây dựng bảng xref incremental
  const pad10 = (n: number) => String(n).padStart(10, '0');
  const xrefOffset = cursor;
  let xrefStr =
    `xref\n` +
    `${targetPage.objId} 1\n` +
    `${pad10(pageObjOffset)} 00000 n \n` +
    `${pdfInfo.rootObjId} 1\n` +
    `${pad10(rootObjOffset)} 00000 n \n` +
    `${smaskObjId} 6\n` +
    `${pad10(smaskOffset)} 00000 n \n` +
    `${pad10(imgOffset)} 00000 n \n` +
    `${pad10(contentOffset)} 00000 n \n` +
    `${pad10(apFormOffset)} 00000 n \n` +
    `${pad10(sigDictOffset)} 00000 n \n` +
    `${pad10(annotOffset)} 00000 n \n`;

  let trailerStr = `trailer\n<</Size ${newSize}/Root ${pdfInfo.rootObjId} 0 R`;
  if (pdfInfo.infoObjId) trailerStr += `/Info ${pdfInfo.infoObjId} 0 R`;
  if (pdfInfo.idArrayRaw) trailerStr += `/ID ${pdfInfo.idArrayRaw}`;
  if (pdfInfo.prevStartXref > 0) trailerStr += `/Prev ${pdfInfo.prevStartXref}`;
  trailerStr += `>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const xrefAndTrailerBytes = latin1Encode(xrefStr + trailerStr);
  const totalFileLength = cursor + xrefAndTrailerBytes.length;

  // Điền chính xác mảng /ByteRange [0 offset1 offset2 len2]
  const range1Len = contentsStartOffset;
  const range2Start = contentsEndOffset;
  const range2Len = totalFileLength - range2Start;
  const actualByteRangeStr = `[0 ${range1Len} ${range2Start} ${range2Len}]`.padEnd(
    byteRangePlaceholder.length,
    ' '
  );
  const finalSigPrefixBytes = latin1Encode(
    sigDictPrefix.replace(byteRangePlaceholder, actualByteRangeStr)
  );

  // Ghép toàn bộ file PDF với vùng /Contents <000...000>
  const fullPdf = concatUint8([
    pdfBytes,
    ...pieces.slice(0, pieces.length - 1), // Tới trước annotObjBytes
    finalSigPrefixBytes,
    sigPlaceholderHexBytes,
    sigSuffixBytes,
    annotObjBytes,
    xrefAndTrailerBytes,
  ]);

  // Tính SHA-256 trên 2 vùng ByteRange của PDF
  const byteRangeData = new Uint8Array(range1Len + range2Len);
  byteRangeData.set(fullPdf.subarray(0, range1Len), 0);
  byteRangeData.set(fullPdf.subarray(range2Start, range2Start + range2Len), range1Len);

  const byteRangeHashBuffer = await crypto.subtle.digest('SHA-256', byteRangeData);
  const byteRangeSha256 = new Uint8Array(byteRangeHashBuffer);

  // Tạo signedAttrs của PKCS#7 và tính SHA-256 của DER SET OF(signedAttrs) để gửi tới SmartCA / USB Token
  const { signedAttrsContentBytes, derSetForHashing } = buildSignedAttrsContent(byteRangeSha256);
  const attrHashBuffer = await crypto.subtle.digest('SHA-256', derSetForHashing);
  const attrHashBase64 = bytesToBase64(new Uint8Array(attrHashBuffer));

  let rsaSignatureBase64 = '';
  if (method === 'SMARTCA' && smartCaCfg) {
    onProgress?.(
      smartCaCfg.signMode === 'APP'
        ? '📱 Đang gửi yêu cầu ký PDF tới ứng dụng VNPT SmartCA trên điện thoại...'
        : '☁️ Đang ký số PDF tự động qua VNPT SmartCA (TOTP)...'
    );
    rsaSignatureBase64 = await signSmartCAHash(
      { ...smartCaCfg, serialNumber: serialNumber || smartCaCfg.serialNumber },
      attrHashBase64,
      onProgress
    );
  } else {
    const tokenRes = await signHashWithUsbToken(attrHashBase64, onProgress, undefined, serialNumber);
    rsaSignatureBase64 = tokenRes.signatureBase64;
    if (tokenRes.rawCertBase64) rawCertBase64 = tokenRes.rawCertBase64;
  }

  // Đóng gói PKCS#7 / CMS SignedData DER và chèn vào vùng <...> của /Contents
  const certDer = base64ToBytes(rawCertBase64);
  const caCertDer = caCertBase64 ? base64ToBytes(caCertBase64) : undefined;
  const sigBytes = base64ToBytes(rsaSignatureBase64);

  const pkcs7Der = buildPkcs7SignedDataDer({
    certDer,
    caCertDer,
    signedAttrsContentBytes,
    signatureBytes: sigBytes,
  });

  const pkcs7Hex = bytesToHex(pkcs7Der);
  if (pkcs7Hex.length > contentsHexLen) {
    throw new Error(`Kích thước chữ ký PKCS#7 (${pkcs7Hex.length} hex chars) vượt quá vùng dự trữ.`);
  }
  const paddedHexBytes = latin1Encode(pkcs7Hex.padEnd(contentsHexLen, '0'));
  fullPdf.set(paddedHexBytes, contentsStartOffset + 1);

  onProgress?.('✅ Đã ký số PDF và nhúng chữ ký thành công!');
  return {
    signedPdfBytes: fullPdf,
    signerName,
    orgName,
    serialNumber,
  };
}
