/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, UserPlus, Check, X, RotateCcw, Download, Upload } from 'lucide-react';

interface RoommatesSettingsProps {
  roommates: string[];
  onSave: (names: string[]) => Promise<void>;
}

export default function RoommatesSettings({ roommates, onSave }: RoommatesSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedNames, setEditedNames] = useState<string[]>([...roommates]);
  const [isSaving, setIsSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Synchronize internal state when prop changes
  const handleOpen = () => {
    setEditedNames([...roommates]);
    setIsOpen(true);
  };

  const handleNameChange = (index: number, val: string) => {
    const updated = [...editedNames];
    updated[index] = val;
    setEditedNames(updated);
  };

  const handleSave = async () => {
    const filtered = editedNames.map(n => n.trim()).filter(Boolean);
    if (filtered.length === 0) {
      alert("You need at least 1 roommate to track tasks!");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(filtered);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const addRoommateField = () => {
    if (editedNames.length >= 10) return;
    setEditedNames([...editedNames, '']);
  };

  const removeRoommateField = (index: number) => {
    if (editedNames.length <= 1) return;
    const updated = editedNames.filter((_, i) => i !== index);
    setEditedNames(updated);
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/db/export');
      if (!res.ok) throw new Error("Could not export data");
      const dbData = await res.json();
      const stringified = JSON.stringify(dbData, null, 2);
      const blob = new Blob([stringified], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roommates-cleaning-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export backup");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.settings || !parsed.settings.roommates) {
        throw new Error("Invalid format. Missing 'settings' block.");
      }
      const res = await fetch('/api/db/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (!res.ok) {
        throw new Error("Server rejected import payload");
      }
      alert("Data backup restored successfully! Loading fresh records...");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Invalid backup file JSON");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <button
        id="btn-settings-toggle"
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer text-sm"
      >
        <Users className="w-4 h-4 text-emerald-600" />
        Configure Roommates ({roommates.length})
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Roommates Configuration</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                Add, edit, or remove the roommates tracking their chores weekly. The standard task sheets for future weeks will pull roommate snapshot names from this list.
              </p>

              <div className="space-y-3">
                {editedNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-400 w-6">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      placeholder={`Roommate #${index + 1} Name`}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-emerald-500"
                    />
                    <button
                      onClick={() => removeRoommateField(index)}
                      disabled={editedNames.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 p-2 cursor-pointer"
                      title="Remove user"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {editedNames.length < 10 && (
                <button
                  type="button"
                  onClick={addRoommateField}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg text-xs text-emerald-600 font-medium hover:bg-emerald-50/40 transition-colors cursor-pointer mt-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Roommate Slot
                </button>
              )}

              {/* Database Backup Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Database Admin Backup & Recovery
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors"
                    title="Download complete JSON backup file"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Export Backup
                  </button>

                  <label className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors relative">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    {importing ? "Importing..." : "Restore Backup"}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                </div>
                {importError && (
                  <p className="text-[10px] text-red-500 font-medium leading-tight">
                    Error restoring backup: {importError}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {isSaving ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Roommates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
