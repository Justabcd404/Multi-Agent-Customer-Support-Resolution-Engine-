import React, { useEffect, useState } from 'react';
import { fetchCollabOverview, sendHeartbeat } from '../api';
import { Users, Activity, Radio, Shield } from 'lucide-react';

export default function CollaborationDashboard() {
  const [overview, setOverview] = useState({ roster: [], humanAgents: [], recentActivity: [] });

  useEffect(() => {
    async function load() {
      await sendHeartbeat('ag_01', 'Alice Smith');
      const data = await fetchCollabOverview();
      setOverview(data);
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Team Roster & Presence */}
      <div className="md:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Team Presence Roster</h2>
          <span className="flex items-center space-x-1 text-[11px] font-mono text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SSE Live</span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          {overview.humanAgents.map((ag) => {
            const isOnline = overview.roster.some((r) => r.agent_id === ag.agent_id && r.online) || ag.agent_id === 'ag_01';
            return (
              <div key={ag.agent_id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className="text-sm font-semibold text-slate-200">{ag.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 pl-4">{ag.department} ({ag.level})</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isOnline ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Team Activity Feed */}
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Live Team Activity Stream</h2>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 min-h-[300px]">
          {overview.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No recent team activities logged yet.</div>
          ) : (
            overview.recentActivity.map((act, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="p-2 rounded bg-indigo-950 text-indigo-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-medium">
                    <span className="capitalize">{act.kind.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(act.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-400 mt-1">{act.summary}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
