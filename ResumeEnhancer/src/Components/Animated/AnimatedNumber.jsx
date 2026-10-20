import { cn } from "../../utils/cn.js";
import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { prefersReducedMotion } from "../../utils/gsap.js";

// springs from `from` up to `value` sir — pass from={0} to get a count-up on first paint, leave it
// off to only animate later changes. `as` must be an HTML tag name ("span", "p", ...).
function AnimatedNumber({
  value,
  from,
  className,
  springOptions,
  locale,
  as = "span"
}) {
  const MotionComponent = motion[as];
  const reduce = prefersReducedMotion();
  const spring = useSpring(reduce ? value : (from ?? value), springOptions);
  const display = useTransform(
    spring,
    (current) => Math.round(current).toLocaleString(locale)
  );
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduce]);
  return <MotionComponent className={cn("tabular-nums", className)}>
      {display}
    </MotionComponent>;
}
export {
  AnimatedNumber
};
