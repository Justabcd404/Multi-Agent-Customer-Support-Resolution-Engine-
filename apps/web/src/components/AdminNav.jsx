import React from 'react';
import { MessageSquare, Ticket, AlertTriangle, Users, Activity, Eye, ThumbsUp, Sliders } from 'lucide-react';

export default function AdminNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'chat', label: 'Customer Chat', icon: MessageSquare },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { id: 'collaboration', label: 'Team Collab', icon: Users },
    { id: 'observability', label: 'Observability', icon: Activity },
    { id: 'trace', label: 'Trace Viewer', icon: Eye },
    { id: 'feedback', label: 'Feedback', icon: ThumbsUp },
    { id: 'platform', label: 'Platform Config', icon: Sliders }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/30">
            MA
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm md:text-base leading-tight">
              Multi-Agent Engine
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">React · Express · Mongo · Python LangGraph</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-slate-300 font-mono">FastAPI :5000</span>
        </div>
      </div>
    </header>
  );
}
