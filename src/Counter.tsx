import type { ComponentType, ReactNode } from 'react';

import { COUNTER_API_BASE_URL } from './config';
import './styles.css';

type Props = {
  'data-gpt-id'?: string;
  'data-gpt-value'?: string;
  'data-gpt-step'?: string;
  children?: ReactNode;
};

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');

type CounterResponse = { id: string; value: number | null; updated_at: string | null };

const getCounter = async (id: string): Promise<CounterResponse> => {
  const res = await fetch(`${COUNTER_API_BASE_URL}/counters/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`GET /counters/${id} failed: ${res.status}`);
  return res.json();
};

const incrementCounter = async (id: string, delta: number, initial: number): Promise<CounterResponse> => {
  const res = await fetch(`${COUNTER_API_BASE_URL}/counters/${encodeURIComponent(id)}/increment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta, initial }),
  });
  if (!res.ok) throw new Error(`POST /counters/${id}/increment failed: ${res.status}`);
  return res.json();
};

// See the comment in Milestone.tsx for why hooks must come from growiFacade.react.
export const createCounter = (React: ReactRuntime): ComponentType<Props> => {
  const { useEffect, useRef, useState } = React;

  return function Counter(props: Props) {
    const id = props['data-gpt-id'];
    const initial = Number(props['data-gpt-value'] ?? 0) || 0;
    const step = Number(props['data-gpt-step'] ?? 1) || 1;

    const [count, setCount] = useState<number>(initial);
    // Guards against an older in-flight response clobbering the display if a
    // later click's response resolves first.
    const seqRef = useRef(0);

    // With an id, adopt the shared server value once on mount; without one,
    // stay purely local (no network call at all — a deliberate fallback for
    // casual counters nobody needs shared).
    useEffect(() => {
      if (id == null) return undefined;
      let cancelled = false;
      getCounter(id)
        .then((res) => {
          if (cancelled || res.value == null) return;
          setCount(res.value);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to load counter', id, err));
      return () => {
        cancelled = true;
      };
    }, [id]);

    const applyDelta = (delta: number): void => {
      if (id == null) {
        setCount((c) => Math.max(0, c + delta));
        return;
      }

      // Optimistic local update for instant feedback, then reconcile with
      // the server's authoritative (atomically-clamped) value.
      setCount((c) => Math.max(0, c + delta));
      const seq = ++seqRef.current;
      incrementCounter(id, delta, initial)
        .then((res) => {
          if (seqRef.current !== seq || res.value == null) return;
          setCount(res.value);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to save counter', id, err));
    };

    return (
      <span className="gpt-counter">
        {props.children != null && <span className="gpt-counter-label">{props.children}</span>}
        <button
          type="button"
          className="gpt-counter-btn"
          onClick={() => applyDelta(-step)}
          aria-label="decrement"
        >
          −
        </button>
        <span className="gpt-counter-value">{count}</span>
        <button
          type="button"
          className="gpt-counter-btn"
          onClick={() => applyDelta(step)}
          aria-label="increment"
        >
          ＋
        </button>
      </span>
    );
  };
};
