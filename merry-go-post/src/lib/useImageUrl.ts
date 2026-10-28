import { useEffect, useState } from 'react';
import { isDirectImage } from './demoImages';
import { getImageUrl, peekImageUrl } from './images';

export function useImageUrl(id: string | null | undefined) {
  const direct = id && isDirectImage(id) ? id : null;
  const [url, setUrl] = useState<string | null>(() => (id ? direct ?? peekImageUrl(id) : null));
  useEffect(() => {
    if (!id || direct) {
      setUrl(direct);
      return;
    }
    let alive = true;
    setUrl(peekImageUrl(id));
    getImageUrl(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id, direct]);
  return url;
}
