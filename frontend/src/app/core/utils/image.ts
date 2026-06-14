const MAX_SOURCE_DIMENSION = 1200;
const OUTPUT_SIZE = 256;
const JPEG_QUALITY = 0.85;

export interface ImageSource {
  src: string;
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  size: number;
}

/** Lee un fichero de imagen y lo limita a 1200px de lado mayor, devolviendo su tamaño natural. */
export function readImageFile(file: File): Promise<ImageSource> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se ha podido leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se ha podido procesar la imagen.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(img.width, img.height));
        if (scale === 1) {
          resolve({ src: reader.result as string, width: img.width, height: img.height });
          return;
        }

        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se ha podido procesar la imagen.'));

        ctx.drawImage(img, 0, 0, width, height);
        resolve({ src: canvas.toDataURL('image/jpeg', 0.92), width, height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Recorta una región cuadrada de la imagen y la devuelve como data URL JPEG de 256x256. */
export function cropImageToDataUrl(src: string, crop: CropRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('No se ha podido procesar la imagen.'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se ha podido procesar la imagen.'));

      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.src = src;
  });
}
