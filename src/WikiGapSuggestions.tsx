import type { ComponentType } from 'react';

import { createVoteButtons } from './Vote';
import { COUNTER_API_BASE_URL } from './config';
import './styles.css';

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');
// biome-ignore lint: props coming from rehype-react are untyped by nature
type AnyProps = Record<string, any>;

type Indication = {
  id: number;
  page_path: string;
  page_title: string;
  issue_summary: string;
  proposed_fix: string | null;
  growi_report_path: string | null;
  created_at: string;
};

const fetchOpenIndications = async (): Promise<Indication[]> => {
  const res = await fetch(`${COUNTER_API_BASE_URL}/crawler/indications?status=open`);
  if (!res.ok) throw new Error(`GET indications failed: ${res.status}`);
  return res.json();
};

// growi-socialcredit-API のWiki巡回機能(::vote と同じサーバー)が出した未解決の
// 指摘を一覧表示するウィジェット。 :::wiki-gap-suggestions ... ::: と書くだけで
// トップページ含めどのページにも置ける。
// See the comment in Milestone.tsx for why hooks must come from growiFacade.react.
export const createWikiGapSuggestions = (React: ReactRuntime): ComponentType<AnyProps> => {
  const { useEffect, useState } = React;
  const VoteButtons = createVoteButtons(React);

  return function WikiGapSuggestions() {
    const [indications, setIndications] = useState<Indication[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      let cancelled = false;
      fetchOpenIndications()
        .then((data) => {
          if (!cancelled) setIndications(data);
        })
        .catch((err) => {
          console.error('[growi-plugin-tracker] failed to load wiki-gap-suggestions', err);
          if (!cancelled) setFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, []);

    if (failed) {
      return <div className="gpt-wgs gpt-wgs-message">指摘一覧の取得に失敗しました</div>;
    }
    if (indications == null) {
      return <div className="gpt-wgs gpt-wgs-message">読み込み中…</div>;
    }
    if (indications.length === 0) {
      return <div className="gpt-wgs gpt-wgs-message">現在、未解決の指摘はありません</div>;
    }

    return (
      <div className="gpt-wgs">
        {indications.map((ind) => (
          <div className="gpt-wgs-item" key={ind.id}>
            <div className="gpt-wgs-header">
              {ind.growi_report_path != null
                ? <a href={ind.growi_report_path} className="gpt-wgs-title">{ind.page_title}</a>
                : <span className="gpt-wgs-title">{ind.page_title}</span>}
            </div>
            <p className="gpt-wgs-summary">{ind.issue_summary}</p>
            <div className="gpt-wgs-votes">
              <VoteButtons id={`indication-${ind.id}`} />
            </div>
          </div>
        ))}
      </div>
    );
  };
};
