import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Motion for the landing page.
 *
 * The page is set as a printed record, so the motion is about things being
 * written and stamped, not about things floating. Nothing loops, nothing
 * follows the pointer, nothing glows.
 *
 * Everything animates *from* a hidden state rather than *to* one, so the
 * page is readable if this never runs - a failed import or a thrown error
 * leaves the content on screen instead of blank.
 *
 * It all sits inside a `(prefers-reduced-motion: no-preference)` block, so
 * anyone who has asked their system for less motion gets the finished page
 * with no animation at all.
 */
export default function useLandingMotion(scopeRef) {
  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return undefined

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ease = 'power3.out'

      // Headline: words lift out of their own line box, overlapped so each
      // line reads as one movement rather than three separate ones.
      gsap.from(scope.querySelectorAll('.display .word'), {
        yPercent: 110,
        duration: 0.95,
        ease,
        stagger: 0.04,
        delay: 0.05,
      })

      gsap.from(scope.querySelectorAll('.standfirst, .masthead-actions'), {
        opacity: 0,
        y: 12,
        duration: 0.7,
        ease,
        stagger: 0.07,
        delay: 0.4,
      })

      // Example rows land one after another as the list comes into view.
      gsap.from(scope.querySelectorAll('.entry'), {
        opacity: 0,
        y: 14,
        duration: 0.55,
        ease,
        stagger: 0.07,
        scrollTrigger: {
          trigger: scope.querySelector('.register'),
          start: 'top 85%',
          once: true,
        },
      })

      const list = scope.querySelector('.example-list')
      if (list) {
        gsap.from(list, {
          y: 28,
          duration: 0.75,
          ease,
          scrollTrigger: {
            trigger: scope.querySelector('.register'),
            start: 'top 88%',
            once: true,
          },
        })
      }

      // Below the fold, reveals are tied to scroll position rather than a
      // timer, so nothing has already played by the time it is reached.
      scope.querySelectorAll('.clause').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 16,
          duration: 0.6,
          ease,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
      })

      gsap.from(scope.querySelectorAll('.section-heading'), {
        opacity: 0,
        y: 14,
        duration: 0.6,
        ease,
        stagger: 0.1,
        scrollTrigger: {
          trigger: scope.querySelector('.register'),
          start: 'top 90%',
          once: true,
        },
      })

      gsap.from(scope.querySelectorAll('.colophon h2'), {
        opacity: 0,
        y: 16,
        duration: 0.7,
        ease,
        scrollTrigger: {
          trigger: scope.querySelector('.colophon'),
          start: 'top 88%',
          once: true,
        },
      })
    })

    return () => mm.revert()
  }, [scopeRef])
}
