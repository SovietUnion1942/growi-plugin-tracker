import type { ComponentType, ReactNode } from 'react';

import './styles.css';

type Props = {
  'data-gpt-title'?: string;
  children?: ReactNode;
};

// biome-ignore lint: only used as a structural type for the hooks we pull off it
type ReactRuntime = typeof import('react');

/*
 * Hooks must come from GROWI's own React instance (growiFacade.react), not the
 * copy of React bundled into this plugin. rehype-react calls this component as
 * part of GROWI's own render tree, but a hook call only works against whichever
 * React module instance is currently rendering — a statically-imported 'react'
 * from this plugin's bundle is a *different* module instance, so its dispatcher
 * stays null and hooks throw ("Cannot read properties of null (reading 'useRef')").
 * JSX itself (element creation) has no such restriction, so it's used normally below.
 */
export const createMilestone = (React: ReactRuntime): ComponentType<Props> => {
  const { useEffect, useRef, useState } = React;

  return function Milestone(props: Props) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const recalc = (): void => {
      const el = bodyRef.current;
      if (el == null) return;

      const boxes = el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      let done = 0;
      boxes.forEach((box) => {
        if (box.checked) done += 1;
      });
      setProgress({ done, total: boxes.length });
    };

    useEffect(() => {
      recalc();
      const el = bodyRef.current;
      if (el == null) return undefined;
      el.addEventListener('change', recalc);
      return () => el.removeEventListener('change', recalc);
    }, [props.children]);

    const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
      <figure className="gpt-milestone">
        <figcaption className="gpt-milestone-header">
          <span className="gpt-milestone-title">{props['data-gpt-title']}</span>
          <span className="gpt-milestone-count">
            {progress.done} / {progress.total} ({percent}%)
          </span>
        </figcaption>
        <div className="gpt-milestone-track">
          <div className="gpt-milestone-bar" style={{ width: `${percent}%` }} />
        </div>
        <div className="gpt-milestone-body" ref={bodyRef}>{props.children}</div>
      </figure>
    );
  };
};
