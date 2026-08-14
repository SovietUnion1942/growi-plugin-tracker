import type { ComponentType, ReactNode } from 'react';

import { COUNTER_API_BASE_URL } from './config';
import { getCurrentUsername } from './currentUser';
import './styles.css';

type Props = {
  'data-gpt-id'?: string;
  children?: ReactNode;
};

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');

type LikeResponse = { id: string; count: number; liked: boolean };

const fetchLikeStatus = async (id: string, username: string | null): Promise<LikeResponse> => {
  const query = username != null ? `?username=${encodeURIComponent(username)}` : '';
  const res = await fetch(`${COUNTER_API_BASE_URL}/counters/${encodeURIComponent(id)}/likes${query}`);
  if (!res.ok) throw new Error(`GET likes failed: ${res.status}`);
  return res.json();
};

const postLike = async (id: string, username: string, like: boolean): Promise<LikeResponse> => {
  const path = like ? 'like' : 'unlike';
  const res = await fetch(`${COUNTER_API_BASE_URL}/counters/${encodeURIComponent(id)}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
};

// See the comment in Milestone.tsx for why hooks must come from growiFacade.react.
export const createCounter = (React: ReactRuntime): ComponentType<Props> => {
  const { useEffect, useRef, useState } = React;

  return function Counter(props: Props) {
    const id = props['data-gpt-id'];

    const [count, setCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    // Guards against an older in-flight response clobbering a newer one.
    const seqRef = useRef(0);

    // With an id, load the shared like count + this user's own like state.
    // Without one, this is a purely local 0/1 toggle (no network, no user
    // lookup needed) — kept as a fallback for casual, non-shared counters.
    useEffect(() => {
      if (id == null) return undefined;
      let cancelled = false;

      getCurrentUsername()
        .then((name) => {
          if (cancelled) return undefined;
          setUsername(name);
          return fetchLikeStatus(id, name);
        })
        .then((res) => {
          if (cancelled || res == null) return;
          setCount(res.count);
          setLiked(res.liked);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to load like status', id, err));

      return () => {
        cancelled = true;
      };
    }, [id]);

    const toggle = (): void => {
      if (id == null) {
        // Local-only fallback: just flip between 0 and 1.
        setLiked((l) => {
          const next = !l;
          setCount(next ? 1 : 0);
          return next;
        });
        return;
      }

      // Not logged in, or the lookup hasn't resolved yet — nothing to attribute the like to.
      if (username == null) return;

      const nextLiked = !liked;
      // Optimistic update, then reconcile with the server's authoritative count.
      setLiked(nextLiked);
      setCount((c) => c + (nextLiked ? 1 : -1));

      const seq = ++seqRef.current;
      postLike(id, username, nextLiked)
        .then((res) => {
          if (seqRef.current !== seq) return;
          setCount(res.count);
          setLiked(res.liked);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to save like', id, err));
    };

    const disabled = id != null && username == null;

    return (
      <button
        type="button"
        className={`gpt-counter gpt-like${liked ? ' gpt-like-active' : ''}`}
        onClick={toggle}
        disabled={disabled}
        aria-pressed={liked}
      >
        {props.children != null && <span className="gpt-counter-label">{props.children}</span>}
        <span className="gpt-counter-value">{count}</span>
      </button>
    );
  };
};
