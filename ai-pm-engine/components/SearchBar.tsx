"use client";
import { useState } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";

const EXAMPLES = ["ChatGPT Voice","Notion AI Summary","GitHub Copilot","Gemini Live","Perplexity Answers","Grammarly Rewrite","Google Lens","Samsung Transcript Assist"];

export function SearchBar({ onSearch, loading }: { onSearch:(q:string)=>void; loading:boolean }) {
  const [query, setQuery] = useState("");
  const submit = (q=query) => { if(q.trim().length>=2 && !loading) onSearch(q.trim()); };
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative group">
        <div className="absolute -inset-px bg-gradient-to-r from-accent/40 via-indigo-500/40 to-accent/40 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm pointer-events-none"/>
        <div className="relative flex items-center bg-panel border border-border rounded-2xl overflow-hidden">
          <span className="pl-5 text-subtle shrink-0">{loading?<Loader2 size={18} className="animate-spin text-accent"/>:<Search size={18}/>}</span>
          <input type="text" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
            placeholder="Search any AI feature… try 'ChatGPT Voice'" disabled={loading}
            className="flex-1 bg-transparent px-4 py-4 text-text placeholder-subtle outline-none text-sm font-body disabled:opacity-50"/>
          <button onClick={()=>submit()} disabled={loading||query.trim().length<2}
            className="mr-2 flex items-center gap-2 bg-accent hover:bg-accent-dim disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shrink-0">
            {loading?"Analyzing…":<><span>Analyze</span><ArrowRight size={14}/></>}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map(ex=>(
          <button key={ex} onClick={()=>{setQuery(ex);submit(ex);}} disabled={loading}
            className="text-xs font-mono text-text-dim bg-surface border border-border hover:border-accent/40 hover:text-text px-3 py-1.5 rounded-full transition-all disabled:opacity-50">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
