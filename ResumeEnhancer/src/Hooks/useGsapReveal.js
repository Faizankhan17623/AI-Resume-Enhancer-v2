import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "../utils/gsap";

// Reveals every [data-reveal] descendant as it scrolls into view sir.
// Usage: const ref = useGsapReveal(); return <section ref={ref}>...<div data-reveal>...</div></section>
export default function useGsapReveal(options = {}) {
    const scope = useRef(null);
    const { y = 24, stagger = 0.12, duration = 0.6, start = "top 85%" } = options;

    useGSAP(
        () => {
            if (prefersReducedMotion()) return;

            const targets = gsap.utils.toArray("[data-reveal]", scope.current);
            if (!targets.length) return;

            gsap.set(targets, { opacity: 0, y });

            targets.forEach((el, i) => {
                gsap.to(el, {
                    opacity: 1,
                    y: 0,
                    duration,
                    delay: (i % 6) * (stagger / 2),
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: el,
                        start,
                        toggleActions: "play none none reverse",
                    },
                });
            });
        },
        { scope }
    );

    return scope;
}
