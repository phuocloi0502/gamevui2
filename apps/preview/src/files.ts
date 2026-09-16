export function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;base64,/, 'data:image/png;base64,'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function isPng(file: File) {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}
