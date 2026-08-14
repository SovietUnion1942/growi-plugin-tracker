import { trackerDirectives } from './src/directives';
import { wrapData, wrapFigure } from './src/components';

// biome-ignore lint: injected onto window by GROWI at runtime, no shipped types
declare const growiFacade: any;

const PLUGIN_ID = 'growi-plugin-tracker';

const extendOptions = (options: any) => {
  // RendererOptions.components is typed optional — some generators may omit it
  options.components ??= {};
  options.remarkPlugins.push(trackerDirectives);
  options.components.figure = wrapFigure(options.components.figure);
  options.components.data = wrapData(options.components.data);
  return options;
};

const activate = (): void => {
  if (growiFacade == null || growiFacade.markdownRenderer == null) {
    return;
  }

  const { optionsGenerators } = growiFacade.markdownRenderer;

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
