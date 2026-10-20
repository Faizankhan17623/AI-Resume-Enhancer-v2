import { useRef } from "react";
import { useInView } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber.jsx";

// counts 0 -> value the first time it scrolls into view sir, then follows any later value change.
// Wraps AnimatedNumber so callers never deal with the in-view bookkeeping themselves.
function CountUp({ value, className, springOptions = { stiffness: 70, damping: 20 } }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return <span ref={ref} className={className}>
      <AnimatedNumber value={inView ? value : 0} springOptions={springOptions} />
    </span>;
}
export {
  CountUp
};
