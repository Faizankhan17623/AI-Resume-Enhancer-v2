import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "../../utils/cn.js";
function TextShimmerComponent({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2
}) {
  const MotionComponent = motion[Component];
  const dynamicSpread = useMemo(() => {
    return children.length * spread;
  }, [children, spread]);
  return <MotionComponent
    className={cn(
      "relative inline-block bg-[length:250%_100%,auto] bg-clip-text",
      "text-transparent [--base-color:#6FBFA8] [--base-gradient-color:#F3EFE6]",
      "[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
      className
    )}
    initial={{ backgroundPosition: "100% center" }}
    animate={{ backgroundPosition: "0% center" }}
    transition={{
      repeat: Infinity,
      duration,
      ease: "linear"
    }}
    style={{
      "--spread": `${dynamicSpread}px`,
      backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`
    }}
  >
      {children}
    </MotionComponent>;
}
const TextShimmer = React.memo(TextShimmerComponent);
export {
  TextShimmer
};
