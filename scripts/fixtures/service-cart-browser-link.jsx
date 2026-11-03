import { createElement } from 'react'

// Only Next's navigation boundary is adapted for this isolated component test.
// A same-document route change makes React remove ServiceCart, so its real
// effect cleanup and account-generation guard handle the pending response.
// Full document navigation would destroy the fetch probe and is not equivalent.
export default function FixtureLink({ href, children, onClick, ...props }) {
  return createElement('a', {
    ...props,
    href,
    onClick(event) {
      onClick?.(event)
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || props.download != null) return
      const target = new URL(href, window.location.href)
      if (target.origin !== window.location.origin) return
      event.preventDefault()
      window.history.pushState({}, '', target.pathname + target.search + target.hash)
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
  }, children)
}
