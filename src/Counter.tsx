import type { ComponentType, ReactNode } from 'react';

import './styles.css';

type Props = {
  'data-gpt-id'?: string;
  'data-gpt-value'?: string;
  'data-gpt-step'?: string;
  children?: ReactNode;
};

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');

const storageKey = (id: string): string => `growi-plugin-tracker:counter:${id}`;

// See the comment in Milestone.tsx for why hooks must come from growiFacade.react.
export const createCounter = (React: ReactRuntime): ComponentType<Props> => {
  const { useEffect, useState } = React;

  return function Counter(props: Props) {
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
};
