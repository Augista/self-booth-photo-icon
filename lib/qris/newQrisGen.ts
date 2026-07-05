/**
 * QRIS Static -> Dynamic Generator
 */

export interface TLV {
  tag: string;
  value: string;
}

const FALLBACK_STATIC_QRIS =
  "00020101021126670016ID.CO.QRIS.WWW01189360091500000000000215ID102100000000303UMI51440014ID.CO.QRIS.WWW0215ID102100000000303UMI5204541153033605405200005802ID5913MERCHANTNAME6007JAKARTA61051234562070703A016304";

export function crc16(str: string): string {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }

  crc &= 0xffff;

  return crc
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
}

function parseTLV(data: string): TLV[] {
  const items: TLV[] = [];

  let i = 0;

  while (i < data.length) {
    const tag = data.substring(i, i + 2);
    const len = Number(data.substring(i + 2, i + 4));

    const value = data.substring(i + 4, i + 4 + len);

    items.push({
      tag,
      value,
    });

    i += 4 + len;
  }

  return items;
}

function buildTLV(items: TLV[]) {
  return items
    .map((i) => {
      const lengthText = i.value.length
        .toString()
        .padStart(2, "0");

      return i.tag + lengthText + i.value;
    })
    .join("");
}

export function generateDynamicQRIS(
  staticQRIS: string,
  amount: number,
  transactionId: string
) {
  const basePayload = staticQRIS?.trim() || FALLBACK_STATIC_QRIS;

  const raw = basePayload.replace(/6304[A-Fa-f0-9]{4}$/, "");
  const tlv = parseTLV(raw);

  if (!tlv.length) {
    return generateDynamicQRIS(FALLBACK_STATIC_QRIS, amount, transactionId);
  }

  //------------------------------------
  // Point of Initiation Method
  //------------------------------------

  let poi = tlv.find((x) => x.tag === "01");

  if (poi) {
    poi.value = "12";
  } else {
    tlv.splice(1, 0, {
      tag: "01",
      value: "12",
    });
  }

  //------------------------------------
  // Amount
  //------------------------------------

  const amountString = amount.toFixed(0);

  const amountTag = tlv.find((x) => x.tag === "54");

  if (amountTag) {
    amountTag.value = amountString;
  } else {
    tlv.push({
      tag: "54",
      value: amountString,
    });
  }

  //------------------------------------
  // Additional Data (Bill Number)
  //------------------------------------

  const normalizedTransactionId = transactionId
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);

  const billNumber =
    "05" +
    normalizedTransactionId.length
      .toString()
      .padStart(2, "0") +
    normalizedTransactionId;

  const add = tlv.find((x) => x.tag === "62");

  if (add) {
    const nested = parseTLV(add.value);
    const billTag = nested.find((x) => x.tag === "05");

    if (billTag) {
      billTag.value = normalizedTransactionId;
    } else {
      nested.push({
        tag: "05",
        value: normalizedTransactionId,
      });
    }

    add.value = buildTLV(nested);
  } else {
    tlv.push({
      tag: "62",
      value: billNumber,
    });
  }

  //------------------------------------
  // remove old CRC if parser kept it
  //------------------------------------

  const filtered = tlv.filter((x) => x.tag !== "63");

  let body = buildTLV(filtered);

  body += "6304";

  return body + crc16(body);
}