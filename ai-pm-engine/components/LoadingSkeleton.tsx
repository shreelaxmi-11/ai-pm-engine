"use client";
const STEPS = ["Searching web for public sources…","Found sources. Running GPT-4o extraction…","Extracting structured fields with confidence scoring…","Applying confidence layer and PM insights…"];
export function LoadingSkeleton({ query, currentStep, statusMessage }: { query: string; currentStep: number; statusMessage: string }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"/>
          <span className="text-sm text-text-dim font-mono">Analyzing <span className="text-text font-semibold">{query}</span></span>
        </div>
        <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-5">
          <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width:`${Math.min(95,(currentStep/4)*100)}%` }}/>
        </div>
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < currentStep-1, active = i === currentStep-1;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${done?"border-confirmed bg-confirmed/10":active?"border-accent bg-accent/10":"border-border"}`}>
                  {done && <span className="text-confirmed text-xs">✓</span>}
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse block"/>}
                </div>
                <span className={`text-xs font-mono transition-colors ${done?"text-subtle line-through":active?"text-text":"text-border"}`}>{active?statusMessage:step}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4"><div className="skeleton w-14 h-14 rounded-xl"/><div className="space-y-2 flex-1"><div className="skeleton h-5 w-48"/><div className="skeleton h-3 w-32"/></div></div>
        <div className="border-t border-border pt-4 space-y-2"><div className="skeleton h-3 w-full"/><div className="skeleton h-3 w-3/4"/></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[1,2,3,4,5].map(n=><div key={n} className="skeleton h-24 rounded-2xl"/>)}</div>
    </div>
  );
}
