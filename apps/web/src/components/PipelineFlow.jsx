import React from 'react';
import { Shield, Compass, Smile, Split, Cpu, AlertTriangle, UserCheck, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 'guard', name: '1. Guard', icon: Shield },
  { id: 'classify', name: '2. Classify', icon: Compass },
  { id: 'sentiment', name: '3. Sentiment', icon: Smile },
  { id: 'decompose', name: '4. Decompose', icon: Split },
  { id: 'investigate', name: '5. Fan-out', icon: Cpu },
  { id: 'severity', name: '6. Severity', icon: AlertTriangle },
  { id: 'escalation', name: '7. Escalation', icon: UserCheck },
  { id: 'synthesize', name: '8. Synthesize', icon: CheckCircle2 }
];

export default function PipelineFlow({ currentStep, completedSteps = [] }) {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 my-3 backdrop-blur shadow-lg">
      <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
        Live LangGraph 8-Step Execution Pipeline
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isCurrent = currentStep === step.id;
          const isDone = completedSteps.includes(step.id);

          let stepStyle = 'bg-slate-950/60 border-slate-800/80 text-slate-500';
          if (isCurrent) {
            stepStyle = 'bg-indigo-950/90 border-indigo-500 text-indigo-300 animate-pulse shadow-md shadow-indigo-500/20';
          } else if (isDone) {
            stepStyle = 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300';
          }

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${stepStyle}`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${isCurrent ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-medium leading-tight">{step.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
