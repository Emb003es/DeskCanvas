import { useEffect, useState } from "react";

/** Loads an image URL into an HTMLImageElement for Konva. */
export default function useImageLoader(src: string) {
  const [img, setImg] = useState<HTMLImageElement>();
  useEffect(() => {
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.src = src;
    return () => {
      el.onload = null;
    };
  }, [src]);
  return img;
}
