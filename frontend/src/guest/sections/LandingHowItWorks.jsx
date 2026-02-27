import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, useInView } from "framer-motion";

const STEPS = [
  { titleKey: "howItWorks.searchByTime", descKey: "howItWorks.searchByTimeDesc" },
  { titleKey: "howItWorks.confirmInstantly", descKey: "howItWorks.confirmInstantlyDesc" },
  { titleKey: "howItWorks.enjoyYourDay", descKey: "howItWorks.enjoyYourDayDesc" },
];

const PulseRing = () => (
  <motion.span
    className="absolute inset-0 rounded-full border-2 border-brand-500"
    initial={{ scale: 1, opacity: 0.5 }}
    animate={{ scale: 2.2, opacity: 0 }}
    transition={{ duration: 0.9, ease: "easeOut" }}
  />
);

const LandingHowItWorks = React.memo(() => {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.25 });
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isInView) return;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), 400 + i * 800),
    );
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  const progress = activeStep >= 0 ? (activeStep / (STEPS.length - 1)) * 100 : 0;

  return (
    <section id="how-it-works" ref={sectionRef}>
      <motion.h2
        className="text-2xl font-semibold text-brand-700 dark:text-brand-400"
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        {t("howItWorks.title")}
      </motion.h2>

      {/* ── Desktop horizontal stepper ── */}
      <div className="mt-10 hidden md:block">
        <div className="relative">
          {/* Connecting track */}
          <div
            className="pointer-events-none absolute top-6 -translate-y-1/2"
            style={{ left: "16.67%", right: "16.67%" }}
          >
            <div className="h-1 rounded-full bg-gray-200 dark:bg-white/10">
              <motion.div
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              >
                {activeStep === STEPS.length - 1 && (
                  <motion.span
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    initial={{ left: "-33%" }}
                    animate={{ left: "133%" }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {STEPS.map((step, i) => {
              const reached = activeStep >= i;
              return (
                <div key={step.titleKey} className="flex w-1/3 flex-col items-center px-4">
                  <motion.div
                    className="relative z-10"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ delay: i * 0.15, type: "spring", stiffness: 260, damping: 20 }}
                  >
                    {reached && <PulseRing />}
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all duration-500 ${
                        reached
                          ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 dark:shadow-brand-500/15"
                          : "border-2 border-gray-300 bg-white text-gray-400 dark:border-white/15 dark:bg-dark-panel dark:text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                  </motion.div>

                  <motion.p
                    className="mt-3 text-xs font-semibold uppercase tracking-wider text-gradient dark:text-gradient-dark"
                    initial={{ opacity: 0 }}
                    animate={reached ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {t("howItWorks.step", { number: i + 1 })}
                  </motion.p>

                  <motion.div
                    className="mt-2 text-center"
                    initial={{ opacity: 0, y: 14 }}
                    animate={reached ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 14 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <h3 className="text-lg font-semibold text-ink dark:text-dark-ink">{t(step.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted dark:text-dark-muted">
                      {t(step.descKey)}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile vertical stepper ── */}
      <div className="mt-8 md:hidden">
        {STEPS.map((step, i) => {
          const reached = activeStep >= i;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step.titleKey} className="flex">
              <div className="mr-4 flex flex-col items-center">
                <motion.div
                  className="relative z-10"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 260, damping: 20 }}
                >
                  {reached && <PulseRing />}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                      reached
                        ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25"
                        : "border-2 border-gray-300 bg-white text-gray-400 dark:border-white/15 dark:bg-dark-panel"
                    }`}
                  >
                    {i + 1}
                  </div>
                </motion.div>
                {!isLast && (
                  <div className="relative my-1.5 w-0.5 flex-1 rounded-full bg-gray-200 dark:bg-white/10">
                    <motion.div
                      className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-brand-500 to-brand-600"
                      animate={activeStep > i ? { height: "100%" } : { height: "0%" }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                )}
              </div>

              <motion.div
                className={isLast ? "pt-1" : "pb-8 pt-1"}
                initial={{ opacity: 0, x: -10 }}
                animate={reached ? { opacity: 1, x: 0 } : { opacity: 0.15, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.15 + 0.1 }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gradient dark:text-gradient-dark">
                  {t("howItWorks.step", { number: i + 1 })}
                </p>
                <h3 className="mt-1 text-base font-semibold text-ink dark:text-dark-ink">{t(step.titleKey)}</h3>
                <p className="mt-1 text-sm text-muted dark:text-dark-muted">{t(step.descKey)}</p>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default LandingHowItWorks;
