import { useState, useEffect } from 'react';
import type { TimeEntry, Project, InvoiceRecord, InvoiceStatus } from '../types';
import InvoiceEditor from './InvoiceEditor';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface InvoiceManagerProps {
  entries: TimeEntry[];
  projects: Project[];
}

export default function InvoiceManager({ entries, projects }: InvoiceManagerProps) {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  
  // Editor state for when editing an existing invoice
  const [editorProject, setEditorProject] = useState<string>('');
  const [editorMonth, setEditorMonth] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('timer_invoices');
    if (saved) {
      try {
        setInvoices(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse invoices', e);
      }
    }
  }, []);

  const saveInvoices = (newInvoices: InvoiceRecord[]) => {
    setInvoices(newInvoices);
    localStorage.setItem('timer_invoices', JSON.stringify(newInvoices));
  };

  const handleSaveInvoice = (record: InvoiceRecord) => {
    // Check if we already have this invoice number or ID?
    // Let's just update if we find the same invoice number, else add new
    const existingIndex = invoices.findIndex(i => i.invoiceNumber === record.invoiceNumber);
    if (existingIndex >= 0) {
      const updated = [...invoices];
      // Keep original date created, but update amount and status if needed
      updated[existingIndex] = { ...record, dateCreated: updated[existingIndex].dateCreated };
      saveInvoices(updated);
    } else {
      saveInvoices([record, ...invoices]);
    }
  };

  const updateStatus = (id: string, newStatus: InvoiceStatus) => {
    const updated = invoices.map(i => i.id === id ? { ...i, status: newStatus } : i);
    saveInvoices(updated);
  };

  const deleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice record?')) {
      saveInvoices(invoices.filter(i => i.id !== id));
    }
  };

  const openEditor = (projectId = '', month = '') => {
    setEditorProject(projectId);
    setEditorMonth(month);
    setView('editor');
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Unknown Project';
  };

  if (view === 'editor') {
    return (
      <InvoiceEditor 
        entries={entries} 
        projects={projects} 
        onBack={() => setView('list')}
        onSave={handleSaveInvoice}
        initialProjectId={editorProject}
        initialMonth={editorMonth}
      />
    );
  }

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and track your billing</p>
          </div>
          <button 
            onClick={() => openEditor()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No invoices yet</h3>
              <p className="text-slate-500 mb-6 max-w-md">You haven't generated any invoices. Create your first one to start tracking your payments.</p>
              <button 
                onClick={() => openEditor()}
                className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                Create your first invoice
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Month</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-4 text-slate-500">{new Date(inv.dateCreated).toLocaleDateString()}</td>
                    <td className="p-4 font-medium">{getProjectName(inv.projectId)}</td>
                    <td className="p-4">{inv.month}</td>
                    <td className="p-4 font-semibold text-slate-900">£{inv.totalAmount.toFixed(2)}</td>
                    <td className="p-4">
                      <select
                        value={inv.status}
                        onChange={(e) => updateStatus(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full outline-none border cursor-pointer
                          ${inv.status === 'Created' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                          ${inv.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          ${inv.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                        `}
                      >
                        <option value="Created">Created</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="p-4 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditor(inv.projectId, inv.month)}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Edit Invoice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
