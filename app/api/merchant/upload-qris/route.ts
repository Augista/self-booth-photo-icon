import { NextRequest, NextResponse } from "next/server";
import { decodeStaticQR } from "@/lib/qris/decodeQr";

import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const qris = await decodeStaticQR(buffer);

    const savePath = path.join(process.cwd(), "data", "static-qris.txt");

    await fs.mkdir(path.dirname(savePath), { recursive: true });
    await fs.writeFile(savePath, qris, "utf8");

    return NextResponse.json({
      success: true,
      message: "Static QRIS saved.",
      qris,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
