import type { ImgHTMLAttributes } from 'react';
import { useImageUrl } from '../lib/useImageUrl';

/** <img> para imagens guardadas no IndexedDB. */
export function StoredImage({ id, ...rest }: { id?: string | null } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const url = useImageUrl(id);
  if (!url) return <div className={rest.className} />;
  return <img src={url} alt="" draggable={false} {...rest} />;
}
