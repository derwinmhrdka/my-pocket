/** Client-side compress before upload: max width ~1200px, JPEG quality 0.8 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas tidak tersedia')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to compress image'))),
      'image/jpeg',
      quality,
    )
  })
  return blob
}

export function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  )
}

export function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export function isAllowedUpload(file: File) {
  return isImageFile(file) || isPdfFile(file)
}

export function isPdfPath(path: string | null | undefined) {
  return Boolean(path?.toLowerCase().endsWith('.pdf'))
}

export async function fileForUpload(
  file: File,
  filename: string,
): Promise<File> {
  if (isPdfFile(file)) {
    const name = file.name.toLowerCase().endsWith('.pdf')
      ? file.name
      : filename.replace(/\.[^.]+$/, '') + '.pdf'
    return new File([file], name, { type: 'application/pdf' })
  }
  const blob = await compressImage(file)
  return new File([blob], filename, { type: 'image/jpeg' })
}
