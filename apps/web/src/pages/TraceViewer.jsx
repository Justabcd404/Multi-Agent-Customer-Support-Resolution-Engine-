import React, { useEffect, useState } from 'react';
import { fetchRunTrace } from '../api';
import { Cpu, ShieldCheck, FileText, CheckCircle2, Split } from 'lucide-react';

export default function TraceViewer({ ticketId }) {
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (ticketId) {
        const data = await fetchRunTrace(ticketId);
        setTrace(data);
      }
      setLoading(false);
    }
    load();
  }, [ticketId]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading execution trace...</div>;
  if (!trace || !trace.run_id) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-400">
        Please select a valid ticket from the Tickets or Observability dashboard to view its full trace!
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">Execution Trace — Ticket #{trace.ticket_id}</h2>
          <span className="font-mono text-xs px-3 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Run ID: {trace.run_id}
          </span>
        </div>
        <p className="text-xs text-slate-300">Customer Input: <span className="text-slate-100 font-medium">"{trace.message}"</span></p>
      </div>

      {/* Multi-Agent Fan-Out Diagram */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-200">
          <Split className="w-4 h-4 text-indigo-400" />
          <span>Specialist Agent Parallel Fan-Out Diagram (Promise.all / asyncio.gather)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trace.agent_reports?.map((rep, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase font-bold text-indigo-400">{rep.domain} Specialist</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                  {rep.duration_ms}ms
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <p className="font-semibold text-slate-200">Findings:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  {rep.findings?.map((f, fi) => <li key={fi}>{f}</li>)}
                </ul>
              </div>
              <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                Confidence: {(rep.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Step Audit Trail */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Audit Trail Timeline</h3>
        <div className="space-y-3">
          {trace.audit_trail?.map((aud, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="p-1.5 rounded bg-indigo-950 text-indigo-400 font-mono text-xs shrink-0 uppercase">
                {aud.step}
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold">{aud.actor} ({aud.kind})</span>
                  <span className="text-[10px] font-mono text-slate-500">{aud.timestamp}</span>
                </div>
                <p className="text-slate-400 mt-1">{aud.summary}</p>
                {aud.detail && <p className="text-[11px] text-slate-500 mt-0.5">{aud.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
