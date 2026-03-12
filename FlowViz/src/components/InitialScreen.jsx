const InitialScreen = () => {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center space-y-2">
        {/* Minimalist Logo/Brand */}
        <h1 className="text-3xl font-light tracking-widest  text-white">
          FLOW<span className="font-bold text-sky-500">VIZ</span>
        </h1>
        
        {/* Subtle Divider Line */}
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-blue-800 to-transparent shadow-[0_0_10px_#22d3ee]" />

        {/* Tagline */}
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
          Text to Architecture
        </p>
      </div>
    </div>
  );
};

export default InitialScreen;