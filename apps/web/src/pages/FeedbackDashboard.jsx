import React, { useEffect, useState } from 'react';
import { fetchFeedback } from '../api';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

export default function FeedbackDashboard() {
  const [feedbackList, setFeedbackList] = useState([]);

  useEffect(() => {
    async function load() {
      const list = await fetchFeedback();
      setFeedbackList(list);
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Customer Feedback Analytics</h2>
        <p className="text-xs text-slate-400">Quality score & user ratings on AI resolutions</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        {feedbackList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No feedback recorded yet. Test thumbs-up/down ratings in the Customer Chat tab!
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${fb.rating === 'up' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                  {fb.rating === 'up' ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-300 font-medium">
                    <span>Ticket #{fb.ticket_id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-400">Question: "{fb.question}"</p>
                  <p className="text-slate-300 italic">AI Answer: "{fb.answer}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
