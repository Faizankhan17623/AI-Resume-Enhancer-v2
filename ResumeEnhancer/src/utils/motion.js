// Shared Motion (motion/react) variants sir — reused across pages so easing/timing stays consistent.

export const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

// Wrap a list container with this, then give each child `variants={fadeUp}` sir.
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0) => ({
    hidden: {},
    show: {
        transition: { staggerChildren, delayChildren },
    },
});

export const pageTransition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

export const modalBackdrop = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPanel = {
    hidden: { opacity: 0, scale: 0.95, y: 8 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: "easeIn" } },
};

// Pass to <motion.div whileHover={buttonHover} whileTap={buttonTap} /> sir.
export const buttonHover = { scale: 1.03 };
export const buttonTap = { scale: 0.97 };
