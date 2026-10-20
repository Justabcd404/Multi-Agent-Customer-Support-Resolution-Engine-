import React, { useEffect, useState } from 'react';
import { fetchTickets } from '../api';
import SentimentBadge from '../components/SentimentBadge';
import { Eye, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function TicketsDashboard({ onSelectTrace }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const runs = await fetchTickets();
      setTickets(runs);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">All Support Tickets</h2>
          <p className="text-xs text-slate-400">Live ticket management & sentiment observability console</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading ticket sessions...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-sm">
          No ticket runs recorded yet. Submit a message in the Customer Chat tab to test!
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="p-4">Ticket ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Primary Intent</th>
                <th className="p-4">Sentiment</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tickets.map((t, idx) => {
                const isEscalated = t.escalation?.escalate;
                const intent = t.classification?.primary_intent || 'general';
                const severity = t.severity?.level || 'low';
                const priority = t.severity?.priority || 3;

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-medium text-indigo-400">#{t.ticket_id}</td>
                    <td className="p-4 text-slate-200">{t.customer_id || 'cust_001'}</td>
                    <td className="p-4 font-mono text-xs uppercase text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {intent}
                      </span>
                    </td>
                    <td className="p-4">
                      <SentimentBadge
                        label={t.sentiment?.label}
                        score={t.sentiment?.score}
                        trend={t.sentiment?.trend}
                      />
                    </td>
                    <td className="p-4 font-mono text-xs">
                      <span className={`px-2 py-1 rounded font-semibold ${
                        severity === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        severity === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {severity.toUpperCase()} (P{priority})
                      </span>
                    </td>
                    <td className="p-4">
                      {isEscalated ? (
                        <span className="inline-flex items-center text-amber-400 text-xs space-x-1">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Escalated (HITL)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-400 text-xs space-x-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>Resolved</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onSelectTrace(t.ticket_id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Trace</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
