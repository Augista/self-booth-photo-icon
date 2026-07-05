import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { decodeStaticQR } from '@/lib/qris/decodeQr';

async function readStaticQRIS() {
  const storedPath = path.join(process.cwd(), 'data', 'static-qris.txt');

  try {
    const storedQRIS = (await fs.readFile(storedPath, 'utf8')).trim();
    if (storedQRIS) {
      return storedQRIS;
    }
  } catch {
    // fall back to the bundled public payment QR image
  }

  const fallbackPath = path.join(process.cwd(), 'public', 'payment', 'qrisimage.jpeg');
  const fallbackBuffer = await fs.readFile(fallbackPath);

  return decodeStaticQR(fallbackBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount required' },
        { status: 400 }
      );
    }

    const staticQRIS = await readStaticQRIS();

    if (!staticQRIS) {
      return NextResponse.json(
        { error: 'Merchant QRIS not uploaded.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      qrisString: staticQRIS,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
