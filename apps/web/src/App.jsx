import React, { useState } from 'react';
import AdminNav from './components/AdminNav';
import CustomerChat from './pages/CustomerChat';
import TicketsDashboard from './pages/TicketsDashboard';
import EscalationsDashboard from './pages/EscalationsDashboard';
import CollaborationDashboard from './pages/CollaborationDashboard';
import ObservabilityDashboard from './pages/ObservabilityDashboard';
import TraceViewer from './pages/TraceViewer';
import FeedbackDashboard from './pages/FeedbackDashboard';
import PlatformConsole from './pages/PlatformConsole';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedTraceId, setSelectedTraceId] = useState(null);

  const handleSelectTrace = (ticketId) => {
    setSelectedTraceId(ticketId);
    setActiveTab('trace');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <AdminNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-12">
        {activeTab === 'chat' && <CustomerChat />}
        {activeTab === 'tickets' && <TicketsDashboard onSelectTrace={handleSelectTrace} />}
        {activeTab === 'escalations' && <EscalationsDashboard />}
        {activeTab === 'collaboration' && <CollaborationDashboard />}
        {activeTab === 'observability' && <ObservabilityDashboard onSelectTrace={handleSelectTrace} />}
        {activeTab === 'trace' && <TraceViewer ticketId={selectedTraceId} />}
        {activeTab === 'feedback' && <FeedbackDashboard />}
        {activeTab === 'platform' && <PlatformConsole />}
      </main>

      <footer className="bg-slate-900/60 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        Multi-Agent Customer Support Engine · React (JS) + Express + MongoDB + Python LangGraph
      </footer>
    </div>
  );
}
