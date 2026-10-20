import React, { useEffect, useState } from 'react';
import { fetchEscalations, resolveEscalation, sendEscalationReply } from '../api';
import { ShieldAlert, CheckCircle, Send, MessageSquare, UserCheck } from 'lucide-react';

export default function EscalationsDashboard() {
  const [escalations, setEscalations] = useState([]);
  const [selectedEsc, setSelectedEsc] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    async function load() {
      const list = await fetchEscalations();
      setEscalations(list);
      if (list.length > 0) setSelectedEsc(list[0]);
    }
    load();
  }, []);

  const handleResolve = async (escId) => {
    await resolveEscalation(escId);
    setEscalations((prev) =>
      prev.map((e) => (e.escalation_id === escId ? { ...e, status: 'resolved' } : e))
    );
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selectedEsc || !replyText.trim()) return;

    await sendEscalationReply(selectedEsc.escalation_id, selectedEsc.ticket_id, replyText);
    setReplyText('');
    alert('Human Agent reply sent directly to customer thread!');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Escalation Queue List */}
      <div className="md:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Human Escalation Inbox</h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            HITL Active
          </span>
        </div>

        <div className="space-y-2">
          {escalations.length === 0 ? (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
              No open escalations currently requiring human agent intervention.
            </div>
          ) : (
            escalations.map((esc) => (
              <div
                key={esc.escalation_id}
                onClick={() => setSelectedEsc(esc)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedEsc?.escalation_id === esc.escalation_id
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">#{esc.ticket_id}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    esc.status === 'open' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {esc.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200 line-clamp-2">{esc.handoff_note || 'Escalated by policy gate'}</p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>Team: {esc.department}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Escalation Case Manager */}
      <div className="md:col-span-2 space-y-4">
        {selectedEsc ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Case #{selectedEsc.ticket_id}</h3>
                <p className="text-xs text-slate-400">Assigned Department: <span className="text-indigo-400 font-medium">{selectedEsc.department}</span></p>
              </div>
              {selectedEsc.status === 'open' && (
                <button
                  onClick={() => handleResolve(selectedEsc.escalation_id)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>

            {/* Handoff Reason */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Handoff Note</span>
              <p className="text-xs text-slate-200">{selectedEsc.handoff_note || 'Escalation triggered by safety rules or repeated customer frustration.'}</p>
            </div>

            {/* Live Reply to Customer */}
            <form onSubmit={handleReply} className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">Reply to Customer (Live HITL Handoff)</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response as a human support agent..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
              >
                <Send className="w-4 h-4" />
                <span>Send Human Response</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
            Select an escalation case from the left queue to manage.
          </div>
        )}
      </div>
    </div>
  );
}
