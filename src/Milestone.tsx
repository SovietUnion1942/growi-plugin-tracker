import {
  useEffect, useRef, useState, type FC, type ReactNode,
} from 'react';

import './styles.css';

type Props = {
  'data-gpt-title'?: string;
  children?: ReactNode;
};

type ChecklistProgress = {
  done: number;
  total: number;
};

export const Milestone: FC<Props> = (props) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<ChecklistProgress>({ done: 0, total: 0 });

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

  // Recalculate once children (the task list) have mounted, and whenever a
  // checkbox is toggled — GROWI's task-list checkboxes stay interactive in
  // the rendered page, not just in edit mode.
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
