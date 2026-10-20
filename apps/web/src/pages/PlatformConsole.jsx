import React, { useEffect, useState } from 'react';
import { fetchPlatformPolicies, updatePlatformPolicies } from '../api';
import { Sliders, BookOpen, HelpCircle, Shield, FileText, Check } from 'lucide-react';

export default function PlatformConsole() {
  const [activeTab, setActiveTab] = useState('policies');
  const [policies, setPolicies] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchPlatformPolicies();
      setPolicies(data);
    }
    load();
  }, []);

  const handleSavePolicies = async () => {
    if (!policies) return;
    await updatePlatformPolicies(policies);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Platform Admin Controls</h2>
          <p className="text-xs text-slate-400">Live hot-reload policy rules, specialist agents, FAQ, and KB articles</p>
        </div>
        {saved && (
          <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-800">
            <Check className="w-4 h-4" />
            <span>Hot-reloaded live on Python Agent service!</span>
          </span>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition ${
            activeTab === 'policies' ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          Guard & Escalation Policies
        </button>
        <button
          onClick={() => setActiveTab('specialists')}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition ${
            activeTab === 'specialists' ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          Specialist Agents
        </button>
      </div>

      {/* Policies Form */}
      {activeTab === 'policies' && policies && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-200">Hard Guard Signal Phrases</h3>
          <div className="space-y-3">
            {policies.guard?.signals?.map((sig, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-mono text-xs text-slate-200">"{sig.phrase}"</span>
                <input
                  type="checkbox"
                  checked={sig.enabled}
                  onChange={(e) => {
                    const updated = { ...policies };
                    updated.guard.signals[idx].enabled = e.target.checked;
                    setPolicies(updated);
                  }}
                  className="rounded border-slate-700 text-indigo-600 bg-slate-900"
                />
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold text-slate-200 pt-4 border-t border-slate-800">Escalation Gate Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(policies.escalation?.rules || {}).map((ruleKey) => (
              <div key={ruleKey} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="capitalize text-xs font-mono text-slate-300">{ruleKey.replace('_', ' ')}</span>
                <input
                  type="checkbox"
                  checked={policies.escalation.rules[ruleKey]}
                  onChange={(e) => {
                    const updated = { ...policies };
                    updated.escalation.rules[ruleKey] = e.target.checked;
                    setPolicies(updated);
                  }}
                  className="rounded border-slate-700 text-indigo-600 bg-slate-900"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePolicies}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20"
          >
            Save Live Config Changes
          </button>
        </div>
      )}

      {activeTab === 'specialists' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-xs text-slate-300 space-y-4">
          <p>Built-in Specialist Agents registered: <span className="font-mono text-indigo-400">Technical, Billing, Policy, Orders, Products</span>.</p>
          <p className="text-slate-400">Custom specialist agents can be added dynamically at runtime via JSON configuration without restarting services.</p>
        </div>
      )}
    </div>
  );
}
