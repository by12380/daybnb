import React from "react";
import Button from "../components/ui/Button.jsx";

const LandingCTA = React.memo(() => {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 px-6 py-12 text-white shadow-2xl shadow-brand-500/20">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Ready for your next day stay?</h2>
          <p className="mt-2 text-sm text-white/80">
            Book a space that fits your schedule — daytime only.
          </p>
        </div>
        <Button className="bg-accent-500 text-white hover:bg-orange-400">
          Start your search
        </Button>
      </div>
    </div>
  );
});

export default LandingCTA;
