import { createElement, type ComponentType } from 'react';

// biome-ignore lint: props coming from rehype-react are untyped by nature
type AnyProps = Record<string, any>;

export type Widgets = {
  ProgressBar: ComponentType<AnyProps>;
  Milestone: ComponentType<AnyProps>;
  Counter: ComponentType<AnyProps>;
  Vote: ComponentType<AnyProps>;
  WikiGapSuggestions: ComponentType<AnyProps>;
};

const readWidget = (props: AnyProps): string | undefined => props['data-gpt-widget'];

/*
 * Wraps whatever component GROWI (or an earlier-loaded plugin) already has
 * registered for a tag, so only our directive's own elements are intercepted
 * and everything else keeps rendering exactly as before — the same pattern
 * growi-plugin-datatables uses to wrap the built-in 'table' component.
 */
export const wrapFigure = (widgets: Widgets, Original?: ComponentType<AnyProps>) => {
  const Wrapped = (props: AnyProps) => {
    const widget = readWidget(props);
    if (widget === 'progress') return createElement(widgets.ProgressBar, props);
    if (widget === 'milestone') return createElement(widgets.Milestone, props);
    if (widget === 'wiki-gap-suggestions') return createElement(widgets.WikiGapSuggestions, props);
    if (Original != null) return createElement(Original, props);
    return createElement('figure', props);
  };
  return Wrapped;
};

export const wrapData = (widgets: Widgets, Original?: ComponentType<AnyProps>) => {
  const Wrapped = (props: AnyProps) => {
    const widget = readWidget(props);
    if (widget === 'counter') return createElement(widgets.Counter, props);
    if (widget === 'vote') return createElement(widgets.Vote, props);
    if (Original != null) return createElement(Original, props);
    return createElement('data', props);
  };
  return Wrapped;
};
