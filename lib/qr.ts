// QR code generation for storefront links (server-side, no external API).
import QRCode from "qrcode";

export async function generateQrDataUrl(url: string, size = 640): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: { dark: "#071A33", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}
