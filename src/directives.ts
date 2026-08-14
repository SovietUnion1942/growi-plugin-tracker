import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

type DirectiveNode = {
  type: 'containerDirective' | 'leafDirective' | 'textDirective';
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  data?: Record<string, unknown> | null;
};

/*
 * hast-util-sanitize (already wired into GROWI's rehype pipeline) only keeps
 * tag names from a fixed allowlist that third-party plugins cannot extend.
 * 'figure' and 'data' are both on that allowlist, and any 'data-*' attribute
 * is allowed on every element there. So instead of inventing new tag names
 * (which sanitize would strip before our components ever see them), directive
 * nodes are mapped onto those two allowed tags and carry their payload as
 * data-gpt-* attributes.
 */
const WIDGET_TAGS: Record<string, string> = {
  progress: 'figure',
  milestone: 'figure',
  counter: 'data',
};

export const trackerDirectives: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    const directive = node as unknown as DirectiveNode;

    if (
      directive.type !== 'containerDirective'
      && directive.type !== 'leafDirective'
      && directive.type !== 'textDirective'
    ) {
      return;
    }

    const hName = WIDGET_TAGS[directive.name];
    if (hName == null) {
      return;
    }

    const hProperties: Record<string, string> = { 'data-gpt-widget': directive.name };
    for (const [key, value] of Object.entries(directive.attributes ?? {})) {
      if (value == null) continue;
      hProperties[`data-gpt-${key}`] = value;
    }

    directive.data = { ...directive.data, hName, hProperties };
  });
};
