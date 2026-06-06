
/**
 * Generate QRIS EMVCo string (static → dynamic)
 * Compatible dengan kebanyakan e-wallet (OVO, GoPay, DANA, dll)
 */

function crc16(str: string): string {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }

  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Convert static QRIS → dynamic dengan amount + transactionId
 */
export function generateQRIS(
  merchantName: string,
  city: string,
  amount: number,
  transactionId: string
): string {
  // ⚠️ Ini contoh template QRIS static (HARUS kamu ganti dari QRIS asli)
  let qris =
    '00020101021126670016ID.CO.QRIS.WWW01189360091500000000000215ID102100000000303UMI51440014ID.CO.QRIS.WWW0215ID102100000000303UMI5204541153033605405200005802ID5913MERCHANTNAME6007JAKARTA61051234562070703A016304XXXX';

  // 🔥 Replace merchant name & city
  qris = qris.replace('MERCHANTNAME', merchantName);
  qris = qris.replace('JAKARTA', city);

  // 🔥 Tambah amount (tag 54)
  const amountStr = amount.toString();
  const amountField =
    '54' + amountStr.length.toString().padStart(2, '0') + amountStr;

  // 🔥 Tambah transaction ID (tag 62 → 05)
  const billId =
    '05' + transactionId.length.toString().padStart(2, '0') + transactionId;

  const additionalData =
    '62' + (billId.length.toString().padStart(2, '0')) + billId;

  // 🔥 Remove CRC lama
  qris = qris.replace(/6304.*/, '');

  // 🔥 Inject amount + additional data
  qris = qris + amountField + additionalData + '6304';

  // 🔥 Hitung CRC
  const crc = crc16(qris);

  return qris + crc;
}