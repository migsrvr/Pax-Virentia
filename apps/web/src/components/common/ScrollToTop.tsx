import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** React Router keeps the document's scroll offset across SPA navigations,
 *  so links near the bottom (e.g. the footer) open the next page already
 *  scrolled down. On a route change: reset to the top — or, when the target
 *  location carries a hash (#energy-use), scroll that section into view.
 *  On first mount the browser's native fragment scroll fails for
 *  React-rendered content, so the hash branch covers deep links too. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef<string | null>(null);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (!hash) {
        window.scrollTo(0, 0);
        return;
      }
    }
    if (hash) {
      // Wait for web fonts (layout shifts as Inter swaps in) before measuring,
      // then give styles one frame to settle so the offset isn't stale.
      const id = hash.slice(1);
      const scroll = () => document.getElementById(id)?.scrollIntoView();
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        requestAnimationFrame(scroll);
      });
    }
  }, [pathname, hash]);
  return null;
}
