import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
const defaultChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = "p",
  trigger = true,
  onScrambleComplete,
  ...props
}) {
  const MotionComponent = motion[Component];
  const [scrambledText, setScrambledText] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const text = children;
  const displayText = scrambledText ?? children;
  // ref sir, per 2026-11-16 audit — the interval id used to live only inside this function's
  // own local closure, so the useEffect below had nothing to return a cleanup function for. If
  // the component unmounted mid-scramble (duration is under 1s by default, a real window on
  // e.g. the homepage Banner if the user navigates away right after it mounts), the interval
  // kept firing setState on an unmounted component until it ran out its own step count.
  const intervalRef = useRef(null);
  const scramble = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const steps = duration / speed;
    let step = 0;
    intervalRef.current = setInterval(() => {
      let scrambled = "";
      const progress = step / steps;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
          continue;
        }
        if (progress * text.length > i) {
          scrambled += text[i];
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }
      setScrambledText(scrambled);
      step++;
      if (step > steps) {
        clearInterval(intervalRef.current);
        setScrambledText(null);
        setIsAnimating(false);
        onScrambleComplete?.();
      }
    }, speed * 1e3);
  };
  useEffect(() => {
    if (!trigger) return;
    scramble();
    return () => clearInterval(intervalRef.current);
  }, [trigger]);
  return <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>;
}
export {
  TextScramble
};
