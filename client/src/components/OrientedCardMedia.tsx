import { useEffect, useRef, useState } from 'react'
import { isPdfPath } from '../lib/imageUtils'

/** Fills a portrait (or any) frame; rotates landscape images 90° so docs read upright. */
export function OrientedCardMedia({
  src,
  overlay,
  preferPortrait = true,
}: {
  src: string
  overlay?: string
  /** When true, landscape images are rotated to fit a portrait-shaped frame. */
  preferPortrait?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [landscape, setLandscape] = useState(false)
  const pdf = isPdfPath(src)
  const rotate = preferPortrait && landscape && !pdf

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden>
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget
            setLandscape(w > h)
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
          style={
            rotate && size.w > 0
              ? {
                  width: size.h,
                  height: size.w,
                  objectFit: 'cover',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                }
              : {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'translate(-50%, -50%)',
                }
          }
        />
      ) : null}
      {overlay ? (
        <div className="pointer-events-none absolute inset-0" style={{ background: overlay }} />
      ) : null}
    </div>
  )
}
