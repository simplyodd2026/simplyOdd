/**
 * Props for an <img> showing a photo the API stored, so the browser fetches the smallest copy that
 * stays sharp. Uploads are kept as `name.webp` with `name.w480.webp` and `name.w960.webp` beside it
 * (backend/app/services/media.py), so the copies are found from the full URL. Anything else (GIFs,
 * SVGs, bundled art, outside links) gets a plain src.
 *
 * `sizes` is how wide the image is drawn, e.g. '(min-width: 1024px) 25vw, 50vw'.
 */
const WIDTHS = [480, 960]
const STORED = /^https:\/\/firebasestorage\.googleapis\.com\/|\/media\//
const WEBP = /\.webp(?=\?|$)/

export function responsive(url: string | null | undefined, sizes: string) {
  if (!url || !STORED.test(url) || !WEBP.test(url)) return { src: url ?? undefined }
  const copies = WIDTHS.map((w) => `${url.replace(WEBP, `.w${w}.webp`)} ${w}w`)
  // srcSet and sizes come before src so the browser never starts on the full-size file.
  return { sizes, srcSet: [...copies, `${url} 2000w`].join(', '), src: url }
}
