import React, { useEffect, useState } from 'react';
import { fetchObservabilityRuns } from '../api';
import { Activity, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ObservabilityDashboard({ onSelectTrace }) {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await fetchObservabilityRuns();
      setRuns(data);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Observability & Pipeline Session Browser</h2>
        <p className="text-xs text-slate-400">Deep inspection of LangGraph state execution turns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runs.map((r, idx) => {
          const isEscalated = r.escalation?.escalate;
          const auditCount = r.audit_trail?.length || 0;
          return (
            <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">#{r.ticket_id}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  isEscalated ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {isEscalated ? 'ESCALATED' : 'AUTONOMOUS'}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="text-slate-300 line-clamp-2">"{r.message}"</p>
                <p className="text-slate-500 font-mono text-[11px]">Category: {r.classification?.primary_intent || 'general'}</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 font-mono">{auditCount} audit events</span>
                <button
                  onClick={() => onSelectTrace(r.ticket_id)}
                  className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition text-xs"
                >
                  <span>Inspect Trace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
