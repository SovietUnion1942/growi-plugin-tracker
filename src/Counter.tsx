import { useEffect, useState, type FC, type ReactNode } from 'react';

import './styles.css';

type Props = {
  'data-gpt-id'?: string;
  'data-gpt-value'?: string;
  'data-gpt-step'?: string;
  children?: ReactNode;
};

const storageKey = (id: string): string => `growi-plugin-tracker:counter:${id}`;

export const Counter: FC<Props> = (props) => {
  const id = props['data-gpt-id'];
  const initial = Number(props['data-gpt-value'] ?? 0) || 0;
  const step = Number(props['data-gpt-step'] ?? 1) || 1;

  // Without an id, the count only lives for the current render (no way to
  // key it in localStorage); with an id, it survives reloads per-browser.
  const [count, setCount] = useState<number>(() => {
    if (id == null || typeof window === 'undefined') return initial;
    const stored = window.localStorage.getItem(storageKey(id));
    return stored != null ? Number(stored) : initial;
  });

  useEffect(() => {
    if (id == null) return;
    window.localStorage.setItem(storageKey(id), String(count));
  }, [id, count]);

  return (
    <span className="gpt-counter">
      {props.children != null && <span className="gpt-counter-label">{props.children}</span>}
      <button
        type="button"
        className="gpt-counter-btn"
        onClick={() => setCount((c) => c - step)}
        aria-label="decrement"
      >
        −
      </button>
      <span className="gpt-counter-value">{count}</span>
      <button
        type="button"
        className="gpt-counter-btn"
        onClick={() => setCount((c) => c + step)}
        aria-label="increment"
      >
        ＋
      </button>
    </span>
  );
};
