import React from 'react';
import { Frown, Meh, Smile, Flame } from 'lucide-react';

export default function SentimentBadge({ label = 'neutral', score = 0, trend = 'steady' }) {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  let Icon = Meh;

  if (label === 'angry') {
    badgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-800/80';
    Icon = Flame;
  } else if (label === 'frustrated') {
    badgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
    Icon = Frown;
  } else if (label === 'positive') {
    badgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
    Icon = Smile;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeStyle}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{label}</span>
      <span className="opacity-75">({score})</span>
    </span>
  );
}
