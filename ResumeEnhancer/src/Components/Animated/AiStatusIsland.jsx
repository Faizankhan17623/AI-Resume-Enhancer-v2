import { useEffect, useRef, useState } from "react";
import { FaCheck } from "react-icons/fa";
import {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  SIZE_PRESETS,
  useDynamicIslandSize
} from "./DynamicIsland.jsx";

// the island itself sir — grows while `active` is true, flashes a "done" state when it flips
// back to false, then collapses to nothing. Lives under DynamicIslandProvider so it can drive
// the size presets.
function IslandController({ active, label, doneLabel }) {
  const { setSize } = useDynamicIslandSize();
  const [phase, setPhase] = useState("idle");
  const wasActive = useRef(false);
  useEffect(() => {
    let timer;
    if (active) {
      wasActive.current = true;
      setPhase("working");
      setSize(SIZE_PRESETS.COMPACT_LONG);
    } else if (wasActive.current) {
      wasActive.current = false;
      setPhase("done");
      setSize(SIZE_PRESETS.COMPACT);
      timer = setTimeout(() => {
        setPhase("idle");
        setSize(SIZE_PRESETS.EMPTY);
      }, 2200);
    }
    return () => clearTimeout(timer);
  }, [active, setSize]);
  return <DynamicIsland id="ai-status-island">
      {phase === "working" && <DynamicContainer
    key="working"
    className="flex h-full w-full items-center justify-center gap-2.5 px-4 text-xs font-semibold text-white"
  >
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-yellow-50 border-t-transparent" />
          <span className="truncate">{label}</span>
        </DynamicContainer>}
      {phase === "done" && <DynamicContainer
    key="done"
    className="flex h-full w-full items-center justify-center gap-2 px-4 text-xs font-semibold text-white"
  >
          <FaCheck className="shrink-0 text-caribgreen-100" />
          <span className="truncate">{doneLabel}</span>
        </DynamicContainer>}
    </DynamicIsland>;
}

// fixed to the top-centre of the screen sir; pointer-events-none so it never blocks a click
function AiStatusIsland({ active, label = "Working on it...", doneLabel = "Done" }) {
  return <div className="pointer-events-none fixed left-1/2 top-4 z-[65] h-[64px] w-[320px] -translate-x-1/2">
      <DynamicIslandProvider initialSize={SIZE_PRESETS.EMPTY}>
        <IslandController active={active} label={label} doneLabel={doneLabel} />
      </DynamicIslandProvider>
    </div>;
}
export {
  AiStatusIsland
};
