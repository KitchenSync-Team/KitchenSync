export type CroppedAreaPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossorigin", "anonymous");
    image.src = src;
  });
}

export async function getCroppedAvatarBlob(
  imageSrc: string,
  crop: CroppedAreaPixels,
  options?: {
    outputWidth?: number;
    mimeType?: string;
    quality?: number;
  },
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");

  const size = options?.outputWidth ?? 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create drawing context.");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const mimeType = options?.mimeType ?? "image/webp";
  const quality = options?.quality ?? 0.9;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to produce avatar blob."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
