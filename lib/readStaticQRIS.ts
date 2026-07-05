import jsQR from "jsqr";

export async function readStaticQRIS(
  file: File
): Promise<string> {

  return new Promise((resolve, reject) => {

    const img = new Image();

    img.onload = () => {

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject("Canvas not supported");
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const code = jsQR(
        imageData.data,
        canvas.width,
        canvas.height
      );

      if (!code) {
        reject("QRIS not detected");
        return;
      }

      resolve(code.data);

    };

    img.onerror = reject;

    img.src = URL.createObjectURL(file);

  });

}