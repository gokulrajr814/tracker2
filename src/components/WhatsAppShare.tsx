/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Share2, Copy, Check, MessageSquare } from 'lucide-react';
import { CleaningWeek } from '../types';
import { formatFriendlyDateRange } from '../App';

interface WhatsAppShareProps {
  currentWeek: CleaningWeek;
}

export default function WhatsAppShare({ currentWeek }: WhatsAppShareProps) {
  const [copied, setCopied] = useState(false);

  const generateReportText = (): string => {
    const { id, startDate, endDate, roommates, tasks } = currentWeek;

    // Calculate dynamic statistics
    const stats: { [name: string]: { completed: number; pending: number } } = {};
    roommates.forEach((name) => {
      stats[name] = { completed: 0, pending: 0 };
    });

    // Populate task metrics
    tasks.forEach((task) => {
      if (task.completed && task.cleanedBy) {
        if (stats[task.cleanedBy]) {
          stats[task.cleanedBy].completed += 1;
        } else {
          stats[task.cleanedBy] = { completed: 1, pending: 0 };
        }
      }
    });

    const cleanedUsers = roommates.filter(name => (stats[name]?.completed || 0) > 0);
    const pendingUsers = roommates.filter(name => (stats[name]?.completed || 0) === 0);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Build the formatted shareable string using friendly dates
    const dateRangeFriendly = formatFriendlyDateRange(startDate, endDate) || `${startDate} to ${endDate}`;
    let text = `🧹 *WEEKLY HOUSE CLEANING REPORT* 🧹\n`;
    text += `*Week:* ${id} (${dateRangeFriendly})\n`;
    text += `*Overall Progress:* ${completedTasks}/${totalTasks} tasks done (${completionRate}%)\n\n`;

    text += `✅ *ROOMMATES WHO CLEANED:*\n`;
    if (cleanedUsers.length > 0) {
      cleanedUsers.forEach((name) => {
        text += `- *${name}*: Cleaned ${stats[name].completed} chore(s) 🎉\n`;
      });
    } else {
      text += `- None yet! Pull up your socks guys! 😅\n`;
    }

    text += `\n❌ *ROOMMATES WHO HAVE NOT CLEANED:* \n`;
    if (pendingUsers.length > 0) {
      pendingUsers.forEach((name) => {
        text += `- *${name}* (0 tasks completed) 🛌\n`;
      });
    } else {
      text += `- Perfect score! Everyone cleaned! 🌟\n`;
    }

    // List outstanding critical tasks (excluding optional ones that are pending)
    const priorityPending = tasks.filter(t => !t.completed && !t.optional);
    if (priorityPending.length > 0) {
      text += `\n📋 *STILL PENDING (CRITICAL CHORES):*\n`;
      priorityPending.slice(0, 5).forEach((t) => {
        text += `- [ ] _${t.category}_: ${t.name}\n`;
      });
      if (priorityPending.length > 5) {
        text += `- ... and ${priorityPending.length - 5} more chores.\n`;
      }
    }

    text += `\n🔗 *Update live list here:* ${window.location.origin}`;
    return text;
  };

  const handleCopy = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateReportText());
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div id="whatsapp-share-card" className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-xs">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            WhatsApp Accountability Reporter
          </span>
          <h4 className="text-slate-800 font-bold mt-2 text-base">Generate Weekly Summary</h4>
          <p className="text-xs text-slate-600 mt-1">
            Format a report tracking who has cleaned and who hasn't for WhatsApp group updates.
          </p>
        </div>
        <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-700">
          <Share2 className="w-5 h-5" />
        </div>
      </div>

      {/* Preview Container */}
      <div className="bg-white border border-emerald-100/60 rounded-lg p-3.5 mb-4 text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
        {generateReportText()}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-emerald-200 hover:border-emerald-300 text-slate-700 rounded-lg font-medium text-sm transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              Copy Report Text
            </>
          )}
        </button>

        <button
          onClick={handleWhatsAppShare}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-all shadow-xs hover:shadow-md cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Share to WhatsApp
        </button>
      </div>
    </div>
  );
}
