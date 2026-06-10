import { useState, useEffect, useRef, useMemo } from 'react';
import type { TimeEntry, Project, InvoiceRecord } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface InvoiceEditorProps {
  entries: TimeEntry[];
  projects: Project[];
  onBack: () => void;
  onSave: (record: InvoiceRecord) => void;
  initialProjectId?: string;
  initialMonth?: string;
}

export default function InvoiceEditor({ entries, projects, onBack, onSave, initialProjectId, initialMonth }: InvoiceEditorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || new Date().toISOString().slice(0, 7));
  const [hourlyRate, setHourlyRate] = useState<string>('26.25');
  const [manualRows, setManualRows] = useState<Array<{ id: string, dateStr: string, timeRange: string, price: string }>>([]);

  // Business Details
  const [myName, setMyName] = useState<string>('');
  const [myCompanyNum, setMyCompanyNum] = useState<string>('');
  const [myAddress, setMyAddress] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('');

  // Client Details
  const [clientName, setClientName] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [clientContact, setClientContact] = useState<string>('');

  // Bank Details
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [sortCode, setSortCode] = useState<string>('');

  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026-0001');

  const previewRef = useRef<HTMLDivElement>(null);

  // Load global persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timer_invoice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.myName) setMyName(parsed.myName);
        if (parsed.myCompanyNum) setMyCompanyNum(parsed.myCompanyNum);
        if (parsed.myAddress) setMyAddress(parsed.myAddress);
        if (parsed.myRole) setMyRole(parsed.myRole);
        if (parsed.accountName) setAccountName(parsed.accountName);
        if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
        if (parsed.sortCode) setSortCode(parsed.sortCode);
        if (parsed.invoiceNumber) setInvoiceNumber(parsed.invoiceNumber);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load project-specific persistence
  useEffect(() => {
    if (!selectedProjectId) return;
    try {
      const saved = localStorage.getItem(`timer_invoice_project_${selectedProjectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setClientName(parsed.clientName || '');
        setClientAddress(parsed.clientAddress || '');
        setClientContact(parsed.clientContact || '');
        setHourlyRate(parsed.hourlyRate || '26.25');
      } else {
        setClientName('');
        setClientAddress('');
        setClientContact('');
        setHourlyRate('26.25');
      }

      const savedManual = localStorage.getItem(`timer_invoice_manual_${selectedProjectId}_${selectedMonth}`);
      if (savedManual) {
        setManualRows(JSON.parse(savedManual));
      } else {
        setManualRows([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedProjectId, selectedMonth]);

  // Save global persistence
  useEffect(() => {
    localStorage.setItem('timer_invoice_settings', JSON.stringify({
      myName, myCompanyNum, myAddress, myRole,
      accountName, accountNumber, sortCode,
      invoiceNumber
    }));
  }, [myName, myCompanyNum, myAddress, myRole, accountName, accountNumber, sortCode, invoiceNumber]);

  // Save project persistence
  useEffect(() => {
    if (!selectedProjectId) return;
    localStorage.setItem(`timer_invoice_project_${selectedProjectId}`, JSON.stringify({
      clientName, clientAddress, clientContact, hourlyRate
    }));
    localStorage.setItem(`timer_invoice_manual_${selectedProjectId}_${selectedMonth}`, JSON.stringify(manualRows));
  }, [selectedProjectId, selectedMonth, clientName, clientAddress, clientContact, hourlyRate, manualRows]);

  // Ensure first project is selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const groupedEntries = useMemo(() => {
    if (!selectedProjectId || !selectedMonth) return [];
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return [];

    const monthEntries = entries.filter(e => {
      if (e.projectName !== project.name) return false;
      const d = new Date(e.startTime);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const dailyMap = new Map<string, { dateObj: Date, minStart: number, maxEnd: number, duration: number }>();

    monthEntries.forEach(entry => {
      const d = new Date(entry.startTime);
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          dateObj: d,
          minStart: entry.startTime,
          maxEnd: entry.endTime,
          duration: 0
        });
      }
      
      const dayData = dailyMap.get(dateStr)!;
      dayData.duration += (entry.endTime - entry.startTime);
      if (entry.startTime < dayData.minStart) dayData.minStart = entry.startTime;
      if (entry.endTime > dayData.maxEnd) dayData.maxEnd = entry.endTime;
    });

    const rate = parseFloat(hourlyRate) || 0;

    return Array.from(dailyMap.entries()).map(([dateStr, data]) => {
      const hours = data.duration / (1000 * 60 * 60);
      const price = hours * rate;

      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);

      if (h === 0 && m === 0) return null;

      let timeStr = '';
      if (h > 0) timeStr += `${h}h `;
      if (m > 0 || h === 0) timeStr += `${m}m`;

      return {
        dateStr,
        dateObj: data.dateObj,
        timeRange: timeStr.trim(),
        price
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  }, [entries, selectedProjectId, selectedMonth, hourlyRate, projects]);

  const totalExVat = useMemo(() => {
    const autoTotal = groupedEntries.reduce((acc, curr) => acc + curr.price, 0);
    const manualTotal = manualRows.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
    return autoTotal + manualTotal;
  }, [groupedEntries, manualRows]);

  const addManualRow = () => {
    setManualRows([...manualRows, { id: Date.now().toString(), dateStr: '', timeRange: '', price: '' }]);
  };

  const updateManualRow = (id: string, field: 'dateStr' | 'timeRange' | 'price', value: string) => {
    setManualRows(manualRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const deleteManualRow = (id: string) => {
    setManualRows(manualRows.filter(row => row.id !== id));
  };

  const incrementInvoiceNumber = () => {
    const match = invoiceNumber.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = (parseInt(numStr, 10) + 1).toString().padStart(numStr.length, '0');
      setInvoiceNumber(prefix + nextNum);
    }
  };

  const downloadPdf = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const fs = window.require('fs');
        
        const result = await ipcRenderer.invoke('show-save-dialog', {
          title: 'Save Invoice',
          defaultPath: `${invoiceNumber}.pdf`,
          filters: [
            { name: 'PDF Documents', extensions: ['pdf'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const arrayBuffer = pdf.output('arraybuffer');
          const buffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(result.filePath, buffer);
          alert(`Successfully saved to: ${result.filePath}`);
          incrementInvoiceNumber();
          
          // Save the record
          onSave({
            id: Date.now().toString(),
            invoiceNumber,
            projectId: selectedProjectId,
            month: selectedMonth,
            dateCreated: Date.now(),
            status: 'Created',
            totalAmount: totalExVat
          });
        }
      } else {
        pdf.save(`${invoiceNumber}.pdf`);
        incrementInvoiceNumber();
        onSave({
          id: Date.now().toString(),
          invoiceNumber,
          projectId: selectedProjectId,
          month: selectedMonth,
          dateCreated: Date.now(),
          status: 'Created',
          totalAmount: totalExVat
        });
      }
    } catch (e: any) {
      console.error('Failed to generate PDF', e);
      try {
        if (window.require) {
          window.require('fs').writeFileSync('/tmp/pdf_error.log', e.stack || e.toString());
        }
      } catch(err) {}
      alert(`Failed to generate PDF: ${e.message || e}`);
    }
  };

  const dayRate = (parseFloat(hourlyRate) || 0) * 8; // Assuming 8 hour day for the visual subtitle

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* Left Form Panel */}
      <div className="w-[340px] shrink-0 bg-white border-r border-border flex flex-col h-full overflow-y-auto z-10 custom-scrollbar">
        <div className="p-5 border-b border-border">
          <button onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </button>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Invoice Settings</h2>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
              <select 
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                />
              </div>
              <div className="w-[100px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hourly Rate (£)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
              <input 
                type="text" 
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-b border-border flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-700">My Details</h3>
          <input type="text" placeholder="Name/Business Name" value={myName} onChange={e => setMyName(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <input type="text" placeholder="Company Number (optional)" value={myCompanyNum} onChange={e => setMyCompanyNum(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <textarea placeholder="Address" value={myAddress} onChange={e => setMyAddress(e.target.value)} rows={2} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <input type="text" placeholder="Role (e.g. Contractor)" value={myRole} onChange={e => setMyRole(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
        </div>

        <div className="p-5 border-b border-border flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-700">Client Details</h3>
          <input type="text" placeholder="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <textarea placeholder="Client Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} rows={2} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <input type="text" placeholder="Contact Person" value={clientContact} onChange={e => setClientContact(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
        </div>

        <div className="p-5 flex flex-col gap-3 pb-24">
          <h3 className="text-sm font-bold text-slate-700">Bank Details</h3>
          <input type="text" placeholder="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <input type="text" placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
          <input type="text" placeholder="Sort Code" value={sortCode} onChange={e => setSortCode(e.target.value)} className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none" />
        </div>
      </div>
      
      {/* Right Preview Panel */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center bg-slate-200 custom-scrollbar">
        <div className="w-[210mm] flex justify-end gap-3 mb-4">
          <button 
            onClick={() => {
              onSave({
                id: Date.now().toString(),
                invoiceNumber,
                projectId: selectedProjectId,
                month: selectedMonth,
                dateCreated: Date.now(),
                status: 'Created',
                totalAmount: totalExVat
              });
              incrementInvoiceNumber();
              alert('Invoice manually saved to dashboard!');
            }}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded shadow-sm hover:bg-slate-50 transition-colors font-medium text-sm"
          >
            <Save className="w-4 h-4" />
            Save Invoice
          </button>
          <button 
            onClick={downloadPdf}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        {/* A4 Paper Container */}
        <div 
          ref={previewRef} 
          className="w-[210mm] min-h-[297mm] shadow-md font-sans box-border"
          style={{ padding: '25mm', backgroundColor: '#ffffff', color: '#000000' }}
        >
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-16">
            <div className="invisible">Logo</div>
            <div className="text-right text-[12px] leading-tight">
              <div className="font-bold">{invoiceNumber}</div>
              <div>Invoice Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div>Payment Due: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          <h1 className="text-[28px] font-bold text-center tracking-wide mb-12">INVOICE</h1>

          {/* Addresses */}
          <div className="flex justify-between text-[13px] leading-snug mb-16">
            <div className="max-w-[50%]">
              <div>From:</div>
              <div className="uppercase mt-1">{myName}</div>
              {myCompanyNum && <div>Company Number: {myCompanyNum}</div>}
              <div className="whitespace-pre-wrap">{myAddress}</div>
              {myRole && <div>{myRole}</div>}
            </div>
            <div className="max-w-[40%] text-left">
              <div>Invoice To:</div>
              <div className="uppercase mt-1">{clientName}</div>
              <div className="whitespace-pre-wrap">{clientAddress}</div>
              {clientContact && <div>{clientContact}</div>}
            </div>
          </div>

          {/* Price Header */}
          <div className="text-[14px] font-medium mb-6">
            Agreed £{parseFloat(hourlyRate || '0').toFixed(2)} Per Hour
          </div>

          {/* Table */}
          <div className="mb-12">
            <div className="flex font-bold text-[14px] py-2 px-4 mb-2" style={{ backgroundColor: '#F2F2F2' }}>
              <div className="flex-1 text-center">Date</div>
              <div className="flex-1 text-center">Time worked</div>
              <div className="flex-1 text-center">Agreed Price</div>
            </div>
            
            {groupedEntries.map((row, i) => (
              <div key={`auto-${i}`} className="flex text-[14px] py-1.5 px-4">
                <div className="flex-1 text-center">{row.dateStr}</div>
                <div className="flex-1 text-center">{row.timeRange}</div>
                <div className="flex-1 text-center">£{row.price.toFixed(2)}</div>
              </div>
            ))}
            
            {manualRows.map((row) => (
              <div key={`manual-${row.id}`} className="flex text-[14px] py-1.5 px-4 relative group">
                <div className="flex-1 text-center">
                  <input type="text" value={row.dateStr} onChange={e => updateManualRow(row.id, 'dateStr', e.target.value)} className="w-full text-center bg-transparent border-none outline-none focus:ring-1 ring-primary/20 rounded" placeholder="e.g. 10/06/2026" />
                </div>
                <div className="flex-1 text-center">
                  <input type="text" value={row.timeRange} onChange={e => updateManualRow(row.id, 'timeRange', e.target.value)} className="w-full text-center bg-transparent border-none outline-none focus:ring-1 ring-primary/20 rounded" placeholder="e.g. 2h 30m" />
                </div>
                <div className="flex-1 text-center flex items-center justify-center">
                  <span className="mr-1">£</span>
                  <input type="number" value={row.price} onChange={e => updateManualRow(row.id, 'price', e.target.value)} className="w-16 text-center bg-transparent border-none outline-none focus:ring-1 ring-primary/20 rounded" placeholder="0.00" />
                </div>
                <button 
                  onClick={() => deleteManualRow(row.id)} 
                  data-html2canvas-ignore="true" 
                  className="absolute -right-8 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {groupedEntries.length === 0 && manualRows.length === 0 && (
              <div className="text-center py-4 italic text-sm" style={{ color: '#94a3b8' }}>No time entries found for {selectedMonth}</div>
            )}

            <div className="flex justify-center mt-4" data-html2canvas-ignore="true">
              <button onClick={addManualRow} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                <Plus className="w-3 h-3" /> Add Manual Row
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end text-[16px] mb-16 pr-12">
            <div className="w-[300px] flex justify-between">
              <div>Total (excluding VAT)</div>
              <div className="font-bold">£{totalExVat.toFixed(2)}</div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="text-[13px] leading-snug mt-auto">
            <div className="mb-4">Payment Details:</div>
            <div>Account holder name: <span className="font-bold">{accountName}</span></div>
            <div>Account number: <span className="font-bold">{accountNumber}</span></div>
            <div>Sort code: <span className="font-bold">{sortCode}</span></div>
            <div className="mt-1">Please reference invoice number {invoiceNumber} when making payment.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
