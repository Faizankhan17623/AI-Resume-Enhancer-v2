import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { cn } from "../../utils/cn.js";

// tiny stand-ins for the two radix helpers the original used sir (not installed here)
function useControllableState({ prop, defaultProp, onChange }) {
  const [inner, setInner] = useState(defaultProp);
  const controlled = prop !== void 0;
  const value = controlled ? prop : inner;
  const setValue = useCallback((next) => {
    if (!controlled) setInner(next);
    onChange?.(next);
  }, [controlled, onChange]);
  return [value, setValue];
}
function Slot({ children, ...props }) {
  return isValidElement(children) ? cloneElement(children, { ...props, ...children.props }) : null;
}

const TerminalAnimationContext = createContext(void 0);
function useTerminalAnimationContext() {
  const ctx = useContext(TerminalAnimationContext);
  if (!ctx) {
    throw new Error(
      "TerminalAnimation components must be used within TerminalAnimationRoot"
    );
  }
  return ctx;
}
function TerminalAnimationRoot({
  tabs,
  defaultActiveTab = 0,
  activeTab: activeTabProp,
  onActiveTabChange,
  backgroundImage,
  alwaysDark = false,
  hideCursorOnComplete = true,
  className,
  children,
  ...props
}) {
  const [activeTab, setActiveTab] = useControllableState({
    prop: activeTabProp,
    defaultProp: defaultActiveTab,
    onChange: onActiveTabChange
  });
  const [visibleLines, setVisibleLines] = useState(0);
  const [commandTyped, setCommandTyped] = useState("");
  const [isTypingCommand, setIsTypingCommand] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const timeoutRef = useRef([]);
  const clearTimeouts = useCallback(() => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  }, []);
  const animateTab = useCallback(
    (tabIndex) => {
      clearTimeouts();
      setVisibleLines(0);
      setCommandTyped("");
      setIsTypingCommand(true);
      setShowCursor(true);
      const tab = tabs[tabIndex];
      if (!tab) {
        return;
      }
      const command = tab.command;
      let charIndex = 0;
      const typeCommand = () => {
        if (charIndex <= command.length) {
          setCommandTyped(command.slice(0, charIndex));
          charIndex++;
          const t2 = setTimeout(typeCommand, 25 + Math.random() * 35);
          timeoutRef.current.push(t2);
        } else {
          const t2 = setTimeout(() => {
            setIsTypingCommand(false);
            showLines(0);
          }, 250);
          timeoutRef.current.push(t2);
        }
      };
      const showLines = (lineIndex) => {
        if (lineIndex <= tab.lines.length) {
          setVisibleLines(lineIndex);
          if (lineIndex < tab.lines.length) {
            const delay = tab.lines[lineIndex].delay ?? 100;
            const t2 = setTimeout(() => showLines(lineIndex + 1), delay);
            timeoutRef.current.push(t2);
          } else if (hideCursorOnComplete) {
            const t2 = setTimeout(() => setShowCursor(false), 600);
            timeoutRef.current.push(t2);
          }
        }
      };
      const t = setTimeout(typeCommand, 300);
      timeoutRef.current.push(t);
    },
    [clearTimeouts, hideCursorOnComplete, tabs]
  );
  useEffect(() => {
    animateTab(activeTab);
    return clearTimeouts;
  }, [activeTab, animateTab, clearTimeouts]);
  const currentTab = tabs[activeTab] ?? tabs[0];
  const safeActiveTab = Math.min(activeTab, tabs.length - 1);
  const value = {
    activeTab: safeActiveTab,
    setActiveTab,
    commandTyped,
    isTypingCommand,
    showCursor,
    visibleLines,
    currentTab,
    tabs
  };
  return <TerminalAnimationContext.Provider value={value}>
      <div
    className={cn(alwaysDark && "dark", className)}
    data-slot="terminal-animation-root"
    {...props}
  >
        {backgroundImage && <div
    aria-hidden
    className="absolute inset-0 bg-cover bg-center"
    data-slot="terminal-animation-background"
    style={{ backgroundImage: `url(${backgroundImage})` }}
  />}
        {children}
      </div>
    </TerminalAnimationContext.Provider>;
}
const backgroundGradientClasses = "absolute inset-0 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/30 to-indigo-950";
function TerminalAnimationBackgroundGradient({
  className,
  ...props
}) {
  return <div
    aria-hidden
    className={cn(backgroundGradientClasses, className)}
    data-slot="terminal-animation-background-gradient"
    {...props}
  />;
}
const containerClasses = "relative w-full max-w-[62rem] px-3 pt-10 pb-0 md:px-0 md:pt-28";
function TerminalAnimationContainer({
  className,
  ...props
}) {
  return <div
    className={cn(containerClasses, className)}
    data-slot="terminal-animation-container"
    {...props}
  />;
}
const windowClasses = "relative flex flex-col overflow-hidden rounded-t-xl";
function TerminalAnimationWindow({
  className,
  backgroundColor,
  minHeight = "28rem",
  animateOnVisible = true,
  style,
  ...props
}) {
  const windowRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    if (!(animateOnVisible && windowRef.current)) {
      return;
    }
    const el = windowRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animateOnVisible]);
  return <div
    className={cn(
      windowClasses,
      !backgroundColor && "bg-card",
      animateOnVisible && "transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]",
      animateOnVisible && !hasAnimated && "translate-y-64",
      animateOnVisible && hasAnimated && "translate-y-0",
      className
    )}
    data-slot="terminal-animation-window"
    ref={windowRef}
    style={backgroundColor ? { backgroundColor, minHeight, ...style } : { minHeight, ...style }}
    {...props}
  />;
}
const contentClasses = "flex-1 px-6 py-6 sm:px-10 sm:py-8";
function TerminalAnimationContent({
  className,
  ...props
}) {
  return <div
    className={cn(contentClasses, className)}
    data-slot="terminal-animation-content"
    {...props}
  />;
}
function TerminalAnimationBlinkingCursor({
  className,
  ...props
}) {
  return <span
    aria-hidden
    className={cn(
      "animate-caret-blink bg-muted-foreground ml-0.5 inline-block h-[18px] w-[7px] translate-y-[3px] duration-1000",
      className
    )}
    data-slot="terminal-animation-blinking-cursor"
    {...props}
  />;
}
function TerminalAnimationCommandBar({
  className,
  cursor,
  ...props
}) {
  const { commandTyped, isTypingCommand, showCursor } = useTerminalAnimationContext();
  const defaultCursor = <span aria-hidden="true">▌</span>;
  return <div
    className={className}
    data-slot="terminal-animation-command"
    {...props}
  >
      {commandTyped}
      {isTypingCommand && showCursor && (cursor ?? defaultCursor)}
    </div>;
}
function TerminalAnimationOutputLine({
  line,
  visible,
  className,
  ...props
}) {
  if (!visible) {
    return null;
  }
  return <div
    className={className}
    data-slot="terminal-animation-output-line"
    {...props}
  >
      <span data-line-color={line.color}>{line.text || "\xA0"}</span>
    </div>;
}
function TerminalAnimationOutput({
  className,
  renderLine,
  ...props
}) {
  const { isTypingCommand, visibleLines, currentTab, activeTab } = useTerminalAnimationContext();
  if (isTypingCommand) {
    return null;
  }
  return <div
    aria-atomic="false"
    aria-live="polite"
    className={className}
    data-slot="terminal-animation-output"
    role="log"
    {...props}
  >
      {currentTab.lines.map((line, i) => {
    const visible = i < visibleLines;
    const key = `${activeTab}-${i}`;
    if (renderLine) {
      const content = renderLine(line, i, visible);
      if (!(visible || content)) {
        return null;
      }
      return <div key={key}>{content}</div>;
    }
    return <TerminalAnimationOutputLine
      key={key}
      line={line}
      visible={visible}
    />;
  })}
    </div>;
}
function TerminalAnimationTrailingPrompt({
  className,
  children,
  ...props
}) {
  const { isTypingCommand, showCursor, visibleLines, currentTab } = useTerminalAnimationContext();
  const show = !isTypingCommand && showCursor && visibleLines >= currentTab.lines.length;
  if (!show) {
    return null;
  }
  return <div
    className={className}
    data-slot="terminal-animation-trailing-prompt"
    {...props}
  >
      {children}
    </div>;
}
function TerminalAnimationTabList({
  className,
  ...props
}) {
  return <div
    aria-label="Terminal commands"
    className={className}
    data-slot="terminal-animation-tab-list"
    role="tablist"
    {...props}
  />;
}
function TerminalAnimationTabTrigger({
  index,
  asChild = false,
  className,
  children,
  ...props
}) {
  const { activeTab, setActiveTab } = useTerminalAnimationContext();
  const isActive = activeTab === index;
  const triggerProps = {
    role: "tab",
    "aria-selected": isActive,
    "data-state": isActive ? "active" : "inactive",
    onClick: () => setActiveTab(index),
    children
  };
  if (asChild) {
    return <Slot {...triggerProps} {...props} className={className} />;
  }
  return <button
    data-slot="terminal-animation-tab-trigger"
    type="button"
    {...triggerProps}
    className={className}
    {...props}
  />;
}
function useTerminalAnimation() {
  return useTerminalAnimationContext();
}
export {
  TerminalAnimationBackgroundGradient,
  TerminalAnimationBlinkingCursor,
  TerminalAnimationCommandBar,
  TerminalAnimationContainer,
  TerminalAnimationContent,
  TerminalAnimationOutput,
  TerminalAnimationOutputLine,
  TerminalAnimationRoot,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
  TerminalAnimationTrailingPrompt,
  TerminalAnimationWindow,
  useTerminalAnimation
};
