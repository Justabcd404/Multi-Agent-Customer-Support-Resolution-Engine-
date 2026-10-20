import React, { useState } from 'react';
import { Send, ThumbsUp, ThumbsDown, Sparkles, ChevronDown, ChevronUp, Bot, User } from 'lucide-react';
import PipelineFlow from '../components/PipelineFlow';
import { submitTicketStream, submitFeedback } from '../api';

export default function CustomerChat() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      text: 'Hello! I am your AI Multi-Agent Support Assistant. How can I help you today with your order, billing, technical issue, or product questions?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [ticketId, setTicketId] = useState(`TKT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [showThoughts, setShowThoughts] = useState(true);
  const [lastState, setLastState] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userText = inputMessage;
    setInputMessage('');
    setIsProcessing(true);
    setCompletedSteps([]);
    setCurrentStep('guard');
    setAuditLog([]);
    setFeedbackSent(false);

    setMessages((prev) => [
      ...prev,
      { role: 'customer', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);

    try {
      const finalState = await submitTicketStream(userText, ticketId, (progress) => {
        if (progress.type === 'progress') {
          setCurrentStep(progress.step);
        } else if (progress.type === 'step_done') {
          setCompletedSteps((prev) => [...prev, progress.step]);
          if (progress.audit) {
            setAuditLog((prev) => [...prev, ...progress.audit]);
          }
        }
      });

      setIsProcessing(false);
      setCurrentStep(null);

      if (finalState) {
        setLastState(finalState);
        if (finalState.resolution?.summary) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'agent',
              text: finalState.resolution.summary,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              resolution: finalState.resolution
            }
          ]);
        }
      }
    } catch (err) {
      setIsProcessing(false);
      setCurrentStep(null);
    }
  };

  const handleRating = async (rating) => {
    if (!lastState || feedbackSent) return;
    await submitFeedback(ticketId, rating, '', inputMessage, lastState.resolution?.summary || '');
    setFeedbackSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">Customer Support Session</h2>
            <p className="text-xs text-slate-400 font-mono">Ticket ID: #{ticketId}</p>
          </div>
        </div>
        <button
          onClick={() => setShowThoughts(!showThoughts)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{showThoughts ? 'Hide Agent Thoughts' : 'Show Agent Thoughts'}</span>
          {showThoughts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Live Pipeline Step Visualization */}
      {showThoughts && (
        <PipelineFlow currentStep={currentStep} completedSteps={completedSteps} />
      )}

      {/* Chat Conversation Thread */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 md:p-6 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'customer';
          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-[82%] ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                </div>

                <div className={`rounded-2xl p-4 text-sm leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[10px] opacity-60 text-right mt-1.5 font-mono">{msg.time}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-none p-3 text-xs text-indigo-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Agents investigating across specialist registries...</span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Bar */}
      {lastState && !isProcessing && (
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-lg text-xs">
          <span className="text-slate-400">Was this AI resolution helpful?</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRating('up')}
              disabled={feedbackSent}
              className={`p-1.5 rounded hover:bg-slate-800 transition ${feedbackSent ? 'opacity-50' : 'text-emerald-400'}`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRating('down')}
              disabled={feedbackSent}
              className={`p-1.5 rounded hover:bg-slate-800 transition ${feedbackSent ? 'opacity-50' : 'text-rose-400'}`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            {feedbackSent && <span className="text-emerald-400 text-[11px]">Thank you for your feedback!</span>}
          </div>
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your support request (e.g. 'Checkout keeps failing and I was charged twice')..."
          disabled={isProcessing}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          disabled={isProcessing || !inputMessage.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
