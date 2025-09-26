import { Icon } from '@iconify/react';
import type { Heading } from '$utils/html';
import { useEffect, useRef, useState } from 'react';

type ProcessedHeading = Heading & { children: ProcessedHeading[] };

interface Props {
  headings: Heading[];
  initialOpen?: boolean;
}

const processHeadings = (headings: Heading[]): ProcessedHeading[] => {
  const processed: ProcessedHeading[] = [];

  for (const heading of headings) {
    let currentLevel = processed;

    for (let i = 1; i < heading.depth; i++) {
      if (currentLevel.length === 0)
        currentLevel.push({ depth: i, slug: '', text: '', children: [] });
      currentLevel = currentLevel[currentLevel.length - 1].children;
    }

    currentLevel.push({ ...heading, children: [] });
  }

  return processed;
};

const TableOfContents = ({ headings, initialOpen = false }: Props) => {
  const [currentHeading, setCurrentHeading] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const processedHeadings = processHeadings(headings);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 20);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      requestAnimationFrame(() => {
        const finalHeight = contentRef.current!.scrollHeight;
        contentRef.current!.style.maxHeight = isOpen ? `${finalHeight}px` : '0px';
        if (isOpen) {
          // Predict overflow before transition
          let maxH = window.innerHeight;
          if (contentRef.current) {
            const computedMaxHeight = getComputedStyle(contentRef.current).maxHeight;
            const containerMaxHeight = parseInt(computedMaxHeight || '0', 10);
            if (containerMaxHeight) {
              maxH = containerMaxHeight;
            }
          }
          setIsScrollable(finalHeight > maxH);
        } else {
          setIsTransitioning(true); // Start transition on close
        }
      });
    }
  }, [isOpen, headings]);

  useEffect(() => {
    const wrappingElement =
      document.querySelector('.article-content') || document.querySelector('.prose');
    if (!wrappingElement) return;

    const allHeaderTags = wrappingElement.querySelectorAll('h1, h2, h3');
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.intersectionRatio > 0);

        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, current) => {
            return prev.intersectionRatio > current.intersectionRatio ? prev : current;
          });

          setCurrentHeading(mostVisible.target.id);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    for (const tag of allHeaderTags) {
      tag.classList.add('scroll-mt-24');
      observer.observe(tag);
    }

    return () => observer.disconnect();
  }, []);

  // Store refs for each heading by slug
  const headingRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (!currentHeading || !headingRefs.current[currentHeading] || !contentRef.current) return;

    const tocContent = contentRef.current;
    const currentHeadingElement = headingRefs.current[currentHeading];

    // Get all heading elements
    const allHeadings = Object.values(headingRefs.current).filter(
      (el): el is HTMLAnchorElement => el !== null
    );
    const firstHeading = allHeadings[0];
    const lastHeading = allHeadings[allHeadings.length - 1];

    // If we're at the first or last heading, scroll the ToC all the way with animation
    if (currentHeadingElement === firstHeading) {
      tocContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentHeadingElement === lastHeading) {
      tocContent.scrollTo({ top: tocContent.scrollHeight, behavior: 'smooth' });
    } else {
      // For middle headings, just ensure they're visible
      currentHeadingElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentHeading]);

  const renderHeading = (heading: ProcessedHeading) => (
    <li className="py-1" key={heading.slug}>
      <a
        ref={(el) => {
          if (el && heading.slug) headingRefs.current[heading.slug] = el;
        }}
        href={`#${heading.slug}`}
        className={`text-ctp-text hover:text-ctp-blue hover:dark:text-ctp-blue ${
          currentHeading === heading.slug ? 'font-medium !text-ctp-blue dark:!text-ctp-blue' : ''
        }`}
      >
        {heading.text.replace('#', '')}
      </a>
      {heading.children.length > 0 && (
        <ul className="mx-4">{heading.children.map(renderHeading)}</ul>
      )}
    </li>
  );

  return (
    <nav
      ref={navRef}
      className={`overflow-hidden rounded-md border-2 border-ctp-blue bg-ctp-mantle motion-safe:transition-opacity motion-safe:duration-200 dark:border-ctp-blue ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } flex max-h-screen flex-col 2xl:max-h-[80vh]`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-none bg-ctp-blue p-3 text-ctp-base hover:no-underline hover:opacity-100 dark:bg-ctp-blue"
      >
        <Icon
          icon="mdi:table-of-contents"
          fontSize={25}
          className="!text-ctp-base"
          aria-hidden={true}
        />
        <h2 className="font-semibold">Table of Contents</h2>
        <Icon
          icon="mdi:chevron-down"
          fontSize={20}
          className={`ml-auto !text-ctp-base motion-safe:transition-transform motion-safe:duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden={true}
        />
      </button>

      <div
        ref={contentRef}
        className={`flex-1 motion-safe:transition-[max-height] motion-safe:duration-200 motion-safe:ease-out [&::-webkit-scrollbar-thumb]:bg-ctp-blue dark:[&::-webkit-scrollbar-thumb]:bg-ctp-lavender [&::-webkit-scrollbar-track]:bg-ctp-mantle dark:[&::-webkit-scrollbar-track]:bg-ctp-base [&::-webkit-scrollbar]:w-2 ${
          isScrollable ? 'overflow-y-auto' : 'overflow-y-hidden'
        }`}
        onTransitionEnd={(e) => {
          if (e.target === contentRef.current) {
            if (isOpen) {
              // After open transition, re-check for edge cases
              if (contentRef.current) {
                const needsScroll =
                  contentRef.current.scrollHeight > contentRef.current.clientHeight;
                setIsScrollable(needsScroll);
              }
            } else if (isTransitioning && !isOpen) {
              setIsScrollable(false); // Hide scrollbar after collapse animation
              setIsTransitioning(false);
            }
          }
        }}
      >
        <div className="h-full pr-2">
          <ul className="py-1">{processedHeadings.map(renderHeading)}</ul>
        </div>
      </div>
    </nav>
  );
};

export default TableOfContents;
