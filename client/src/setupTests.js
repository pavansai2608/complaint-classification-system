import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement window.matchMedia, and anything that asks the
// browser about media queries - GSAP's matchMedia, ScrollTrigger, a hook
// that checks prefers-reduced-motion - throws on import without it.
// Report "no match" so components take their non-animated path in tests.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom has no ResizeObserver either. The chart library uses it to measure
// its container, so give it one that never reports a size.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

afterEach(() => {
  cleanup()
})
