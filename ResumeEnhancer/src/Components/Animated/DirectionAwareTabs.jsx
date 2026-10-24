import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import useMeasure from "react-use-measure";
import { cn } from "../../utils/cn.js";
function DirectionAwareTabs({
  tabs,
  className,
  rounded,
  roundedInner,
  onChange
}) {
  // unique per instance sir, so two tab bars on one page never share the sliding highlight
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ref, bounds] = useMeasure();
  const content = useMemo(() => {
    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;
    return activeTabContent || null;
  }, [activeTab, tabs]);
  const handleTabClick = (newTabId) => {
    if (newTabId !== activeTab && !isAnimating) {
      const newDirection = newTabId > activeTab ? 1 : -1;
      setDirection(newDirection);
      setActiveTab(newTabId);
      onChange ? onChange() : null;
    }
  };
  const variants = {
    initial: (direction2) => ({
      x: 300 * direction2,
      opacity: 0,
      filter: "blur(4px)"
    }),
    active: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)"
    },
    exit: (direction2) => ({
      x: -300 * direction2,
      opacity: 0,
      filter: "blur(4px)"
    })
  };
  return <div className="flex w-full flex-col items-start">
      <div
    className={cn(
      "flex flex-wrap cursor-pointer gap-1 rounded-full bg-richblack-800 p-1",
      className,
      rounded
    )}
  >
        {tabs.map((tab) => <button
    key={tab.id}
    onClick={() => handleTabClick(tab.id)}
    className={cn(
      "relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition focus-visible:ring-1 focus-visible:outline-none sm:text-sm cursor-pointer",
      activeTab === tab.id ? "text-richblack-900" : "text-richblack-300 hover:text-richblack-5",
      rounded ? roundedInner : void 0
    )}
    style={{ WebkitTapHighlightColor: "transparent" }}
  >
            {activeTab === tab.id && <motion.span
    layoutId={`tabs-bubble-${tabsId}`}
    className={cn(
      "absolute inset-0 z-0 bg-yellow-50",
      rounded ? roundedInner : "rounded-full"
    )}
    transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
  />}

            <span className="relative z-10">{tab.label}</span>
          </button>)}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
    className="relative mx-auto h-full w-full overflow-hidden"
    initial={false}
    animate={{ height: bounds.height }}
  >
          <div className="p-1" ref={ref}>
            <AnimatePresence
    custom={direction}
    mode="popLayout"
    onExitComplete={() => setIsAnimating(false)}
  >
              <motion.div
    key={activeTab}
    variants={variants}
    initial="initial"
    animate="active"
    exit="exit"
    custom={direction}
    onAnimationStart={() => setIsAnimating(true)}
    onAnimationComplete={() => setIsAnimating(false)}
  >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>;
}
export {
  DirectionAwareTabs
};
