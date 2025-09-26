/**
 * Removes all <br> tags from an HTML string.
 * @param html The HTML string to sanitize.
 */
export function cleanUpContent(html: string): string {
  return html.replace(/<br\s*\/?>(\n)?/gi, '').replace(/&nbsp;/gi, '');
}
// Types for hast nodes are not imported to avoid module not found error. Use 'any' for compatibility.
import { toString } from 'hast-util-to-string';
import { rehype } from 'rehype';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeParse from 'rehype-parse';
import rehypeSlug from 'rehype-slug';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface Heading {
  depth: number;
  slug?: string;
  text: string;
}

/**
 * Extracts headings (depth, slug, text) from an HTML string.
 * @param html The HTML string to parse.
 */
export function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const headingAst = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeSlug)
    .runSync(unified().use(rehypeParse, { fragment: true }).parse(html));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(headingAst as any, 'element', (node: any) => {
    if (/^h[1-6]$/.test(node.tagName)) {
      headings.push({
        depth: Number(node.tagName[1]),
        slug: node.properties?.id as string | undefined,
        text: toString(node),
      });
    }
  });
  return headings;
}

/**
 * Processes HTML with rehype, adding slugs and autolinked headings.
 * @param html The HTML string to process.
 */
export function processHtmlWithHeadings(html: string): string {
  return rehype()
    .data('settings', { fragment: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: {
        tabIndex: -1,
        ariaHidden: true,
        href: undefined,
        role: 'presentation',
        style: 'pointer-events: none;',
      },
      content: {
        type: 'element',
        tagName: 'button',
        properties: {
          type: 'button',
          className: ['heading-anchor-copy'],
          title: 'Copy link to section',
          tabIndex: 0,
        },
        children: [{ type: 'text', value: '#' }],
      },
    })
    .processSync(html)
    .toString();
}
