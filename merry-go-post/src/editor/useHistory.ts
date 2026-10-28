import { useCallback, useEffect, useRef, useState } from 'react';
import { useDb } from '../store/db';
import type { Post } from '../types';

/** Alterações mais próximas que isso viram um passo só (arrastar, digitar). */
const GROUP_MS = 600;
const LIMIT = 100;

type Snapshot = Pick<Post, 'slides' | 'pagination' | 'format' | 'title' | 'imageIds'>;
const snap = (p: Post): Snapshot => ({ slides: p.slides, pagination: p.pagination, format: p.format, title: p.title, imageIds: p.imageIds });

/** Desfazer/refazer do editor. Guarda referências (o estado do immer é imutável), então é barato. */
export function usePostHistory(post: Post) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const prev = useRef(post);
  const lastChange = useRef(0);
  const restoring = useRef(false);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (prev.current === post) return;
    if (restoring.current) {
      restoring.current = false;
    } else {
      const now = Date.now();
      if (now - lastChange.current > GROUP_MS) {
        past.current.push(snap(prev.current));
        if (past.current.length > LIMIT) past.current.shift();
        future.current = [];
        rerender((n) => n + 1);
      }
      lastChange.current = now;
    }
    prev.current = post;
  }, [post]);

  const apply = useCallback(
    (target: Snapshot) => {
      restoring.current = true;
      useDb.getState().updatePost(post.id, (p) => Object.assign(p, target));
      rerender((n) => n + 1);
    },
    [post.id],
  );

  const undo = useCallback(() => {
    const target = past.current.pop();
    if (!target) return;
    future.current.push(snap(prev.current));
    lastChange.current = 0;
    apply(target);
  }, [apply]);

  const redo = useCallback(() => {
    const target = future.current.pop();
    if (!target) return;
    past.current.push(snap(prev.current));
    lastChange.current = 0;
    apply(target);
  }, [apply]);

  return { undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
