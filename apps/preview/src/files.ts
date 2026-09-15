export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;base64,/, 'data:image/png;base64,'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function runtimeFile(file: File, size?: { width: number; height: number }) {
  if (!size) return readFile(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}

export async function imageSize(src: string) {
  const response = await fetch(`${src}?asset-studio-size=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không đọc được ảnh hiện tại: ${src}`);
  const bitmap = await createImageBitmap(await response.blob());
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export function isPng(file: File) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}
