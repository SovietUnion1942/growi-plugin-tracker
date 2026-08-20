import { trackerDirectives } from './src/directives';
import { wrapData, wrapFigure, type Widgets } from './src/components';
import { createCounter } from './src/Counter';
import { createMilestone } from './src/Milestone';
import { createVote } from './src/Vote';
import { createWikiGapSuggestions } from './src/WikiGapSuggestions';
import { ProgressBar } from './src/ProgressBar';

// biome-ignore lint: injected onto window by GROWI at runtime, no shipped types
declare const growiFacade: any;

const PLUGIN_ID = 'growi-plugin-tracker';

const activate = (): void => {
  if (growiFacade == null || growiFacade.markdownRenderer == null || growiFacade.react == null) {
    return;
  }

  // Hooks (useState/useEffect/useRef) must run against GROWI's own React
  // instance, not the copy bundled into this plugin — see the comment in
  // src/Milestone.tsx for why.
  const widgets: Widgets = {
    ProgressBar,
    Milestone: createMilestone(growiFacade.react),
    Counter: createCounter(growiFacade.react),
    Vote: createVote(growiFacade.react),
    WikiGapSuggestions: createWikiGapSuggestions(growiFacade.react),
  };

  const { optionsGenerators } = growiFacade.markdownRenderer;

  const extendOptions = (options: any) => {
    // RendererOptions.components is typed optional — some generators may omit it
    options.components ??= {};
    options.remarkPlugins.push(trackerDirectives);
    options.components.figure = wrapFigure(widgets, options.components.figure);
    options.components.data = wrapData(widgets, options.components.data);
    return options;
  };

  // For page view
  const originalCustomViewOptions = optionsGenerators.customGenerateViewOptions;
  optionsGenerators.customGenerateViewOptions = (...args: any[]) => {
    const viewOptions = originalCustomViewOptions
      ? originalCustomViewOptions(...args)
      : optionsGenerators.generateViewOptions(...args);
    return extendOptions(viewOptions);
  };

  // For editor preview
  const originalCustomPreviewOptions = optionsGenerators.customGeneratePreviewOptions;
  optionsGenerators.customGeneratePreviewOptions = (...args: any[]) => {
    const previewOptions = originalCustomPreviewOptions
      ? originalCustomPreviewOptions(...args)
      : optionsGenerators.generatePreviewOptions(...args);
    return extendOptions(previewOptions);
  };
};

const deactivate = (): void => {};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}
(window as any).pluginActivators[PLUGIN_ID] = { activate, deactivate };

export {};
