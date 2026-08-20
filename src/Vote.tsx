import type { ComponentType, ReactNode } from 'react';

import { COUNTER_API_BASE_URL } from './config';
import { getCurrentUsername } from './currentUser';
import './styles.css';

type Choice = 'agree' | 'disagree';

type ButtonsProps = {
  id?: string;
  agreeLabel?: string;
  disagreeLabel?: string;
};

type Props = {
  'data-gpt-id'?: string;
  'data-gpt-agree-label'?: string;
  'data-gpt-disagree-label'?: string;
  children?: ReactNode;
};

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');

type VoteResponse = { id: string; agree: number; disagree: number; choice: Choice | null };

const fetchVoteStatus = async (id: string, username: string | null): Promise<VoteResponse> => {
  const query = username != null ? `?username=${encodeURIComponent(username)}` : '';
  const res = await fetch(`${COUNTER_API_BASE_URL}/votes/${encodeURIComponent(id)}${query}`);
  if (!res.ok) throw new Error(`GET votes failed: ${res.status}`);
  return res.json();
};

const postVote = async (id: string, username: string, choice: Choice): Promise<VoteResponse> => {
  const res = await fetch(`${COUNTER_API_BASE_URL}/votes/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, choice }),
  });
  if (!res.ok) throw new Error(`POST vote failed: ${res.status}`);
  return res.json();
};

// 賛成/反対ボタンの本体。::vote ディレクティブと :::wiki-gap-suggestions
// 一覧の両方から使うので、data-gpt-*属性ではなく普通のpropsを取る形にしてある。
// See the comment in Milestone.tsx for why hooks must come from growiFacade.react.
export const createVoteButtons = (React: ReactRuntime): ComponentType<ButtonsProps> => {
  const { useEffect, useRef, useState } = React;

  return function VoteButtons({ id, agreeLabel = '賛成', disagreeLabel = '反対' }: ButtonsProps) {
    const [agree, setAgree] = useState(0);
    const [disagree, setDisagree] = useState(0);
    const [choice, setChoice] = useState<Choice | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    // Guards against an older in-flight response clobbering a newer one.
    const seqRef = useRef(0);

    useEffect(() => {
      if (id == null) return undefined;
      let cancelled = false;

      getCurrentUsername()
        .then((name) => {
          if (cancelled) return undefined;
          setUsername(name);
          return fetchVoteStatus(id, name);
        })
        .then((res) => {
          if (cancelled || res == null) return;
          setAgree(res.agree);
          setDisagree(res.disagree);
          setChoice(res.choice);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to load vote status', id, err));

      return () => {
        cancelled = true;
      };
    }, [id]);

    const vote = (next: Choice): void => {
      if (id == null || username == null || choice === next) return;

      // Optimistic update: move the count from the old bucket (if any) to the new one.
      setChoice(next);
      if (choice === 'agree') setAgree((c) => c - 1);
      if (choice === 'disagree') setDisagree((c) => c - 1);
      if (next === 'agree') setAgree((c) => c + 1);
      if (next === 'disagree') setDisagree((c) => c + 1);

      const seq = ++seqRef.current;
      postVote(id, username, next)
        .then((res) => {
          if (seqRef.current !== seq) return;
          setAgree(res.agree);
          setDisagree(res.disagree);
          setChoice(res.choice);
        })
        .catch((err) => console.error('[growi-plugin-tracker] failed to save vote', id, err));
    };

    const disabled = id == null || username == null;

    return (
      <>
        <button
          type="button"
          className={`gpt-vote-btn gpt-vote-agree${choice === 'agree' ? ' gpt-vote-active' : ''}`}
          onClick={() => vote('agree')}
          disabled={disabled}
          aria-pressed={choice === 'agree'}
        >
          {agreeLabel} <span className="gpt-counter-value">{agree}</span>
        </button>
        <button
          type="button"
          className={`gpt-vote-btn gpt-vote-disagree${choice === 'disagree' ? ' gpt-vote-active' : ''}`}
          onClick={() => vote('disagree')}
          disabled={disabled}
          aria-pressed={choice === 'disagree'}
        >
          {disagreeLabel} <span className="gpt-counter-value">{disagree}</span>
        </button>
      </>
    );
  };
};

export const createVote = (React: ReactRuntime): ComponentType<Props> => {
  const VoteButtons = createVoteButtons(React);

  return function Vote(props: Props) {
    return (
      <div className="gpt-vote">
        {props.children != null && <span className="gpt-vote-label">{props.children}</span>}
        <VoteButtons
          id={props['data-gpt-id']}
          agreeLabel={props['data-gpt-agree-label']}
          disagreeLabel={props['data-gpt-disagree-label']}
        />
      </div>
    );
  };
};
