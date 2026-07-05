import sharp from "sharp";
import jsQR from "jsqr";

/**
 * Decode a QR image (PNG/JPG/WebP/etc.) into its text content.
 *
 * @param input Buffer or ArrayBuffer
 * @returns QR text (EMV QRIS string)
 */
export async function decodeStaticQR(
  input: Buffer | ArrayBuffer
): Promise<string> {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input as ArrayBufferLike);

  // Convert image into raw RGBA pixels
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const result = jsQR(
    new Uint8ClampedArray(data),
    info.width,
    info.height
  );

  if (!result) {
    throw new Error("QR code not found in image.");
  }

  if (!result.data) {
    throw new Error("QR code is empty.");
  }

  return result.data.trim();
}