/**
 * Convert an image File or Blob to a base64 string (without the data-URL prefix).
 */
async function toBase64(file: File | Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export interface VisionOcrResult {
  text: string
  /** true when the call succeeded and returned non-empty text */
  ok: boolean
  /** populated when the call failed or returned no text */
  error?: string
}

/**
 * Optional Google Vision OCR via a server-side `/api/vision-ocr` endpoint
 * (Vercel serverless / similar). Never calls Supabase.
 *
 * When the endpoint is absent or fails, returns `{ ok: false }` so the caller
 * can fall back to client-side Tesseract transparently.
 */
export async function runVisionOcr(file: File | Blob): Promise<VisionOcrResult> {
  try {
    const imageBase64 = await toBase64(file)
    const response = await fetch('/api/vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    })

    if (response.status === 404) {
      return { ok: false, text: '', error: 'Vision OCR endpoint not configured — using local OCR' }
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return {
        ok: false,
        text: '',
        error: `Vision OCR HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      }
    }

    const data = (await response.json()) as { text?: string; error?: string }
    if (data.error) {
      return { ok: false, text: '', error: data.error }
    }

    const text = data.text ?? ''
    return { ok: text.trim().length > 0, text }
  } catch (err) {
    return {
      ok: false,
      text: '',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
