import type { FC, ReactNode } from 'react';

import './styles.css';

type Props = {
  'data-gpt-value'?: string;
  'data-gpt-max'?: string;
  'data-gpt-color'?: string;
  children?: ReactNode;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const ProgressBar: FC<Props> = (props) => {
  const max = Number(props['data-gpt-max'] ?? 100) || 100;
  const value = clamp(Number(props['data-gpt-value'] ?? 0) || 0, 0, max);
  const percent = Math.round((value / max) * 100);
  const color = props['data-gpt-color'];

  return (
    <figure
      className="gpt-progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <figcaption className="gpt-progress-header">
        <span className="gpt-progress-label">{props.children}</span>
        <span className="gpt-progress-percent">{percent}%</span>
      </figcaption>
      <div className="gpt-progress-track">
        <div className="gpt-progress-bar" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </figure>
  );
};
