import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'

// Animations finish instantly, so exit transitions don't keep closed panels in the DOM.
MotionGlobalConfig.skipAnimations = true

// jsdom lacks these browser APIs.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  }) as MediaQueryList
}
Element.prototype.scrollTo = function scrollTo() {}

afterEach(() => cleanup())
