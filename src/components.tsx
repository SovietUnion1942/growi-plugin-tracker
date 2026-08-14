import { createElement, type ComponentType } from 'react';

import { Counter } from './Counter';
import { Milestone } from './Milestone';
import { ProgressBar } from './ProgressBar';

// biome-ignore lint: props coming from rehype-react are untyped by nature
type AnyProps = Record<string, any>;

const readWidget = (props: AnyProps): string | undefined => props['data-gpt-widget'];

/*
 * Wraps whatever component GROWI (or an earlier-loaded plugin) already has
 * registered for a tag, so only our directive's own elements are intercepted
 * and everything else keeps rendering exactly as before — the same pattern
 * growi-plugin-datatables uses to wrap the built-in 'table' component.
 */
export const wrapFigure = (Original?: ComponentType<AnyProps>) => {
  const Wrapped = (props: AnyProps) => {
    const widget = readWidget(props);
    if (widget === 'progress') return createElement(ProgressBar, props);
    if (widget === 'milestone') return createElement(Milestone, props);
    if (Original != null) return createElement(Original, props);
    return createElement('figure', props);
  };
  return Wrapped;
};

export const wrapData = (Original?: ComponentType<AnyProps>) => {
  const Wrapped = (props: AnyProps) => {
    const widget = readWidget(props);
    if (widget === 'counter') return createElement(Counter, props);
    if (Original != null) return createElement(Original, props);
    return createElement('data', props);
  };
  return Wrapped;
};
