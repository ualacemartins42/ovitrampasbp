const MAX_BYTES = 5 * 1024 * 1024
const TARGET_BYTES = 1024 * 1024

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao compactar a imagem.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

async function encodeAtWidth(image: HTMLImageElement, maxWidth: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / Math.max(image.width, 1))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas não disponível neste aparelho.')
  context.drawImage(image, 0, 0, width, height)
  return canvasToBlob(canvas, quality)
}

/** Compacta foto para JPEG, visando ~1MB e no máximo 5MB. */
export async function compressImageFile(file: File | Blob): Promise<Blob> {
  if (file.size <= TARGET_BYTES && (file.type === 'image/jpeg' || file.type === 'image/jpg')) {
    return file
  }

  const image = await loadImage(file)
  let maxWidth = 1600
  let quality = 0.72
  let blob = await encodeAtWidth(image, maxWidth, quality)

  while (blob.size > TARGET_BYTES && (maxWidth > 800 || quality > 0.45)) {
    if (blob.size > TARGET_BYTES * 1.5 && maxWidth > 800) {
      maxWidth = Math.round(maxWidth * 0.8)
    } else {
      quality = Math.max(0.4, quality - 0.08)
    }
    blob = await encodeAtWidth(image, maxWidth, quality)
  }

  if (blob.size > MAX_BYTES) {
    throw new Error('A foto continua acima de 5MB após a compactação. Tente outra imagem.')
  }

  return blob
}
