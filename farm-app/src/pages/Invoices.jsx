import React, { useState } from 'react';
import { Plus, Download, Trash2, FileText, Eye, Loader2, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const COMPANY = {
    name: 'TRINETRA FARMS',
    village: 'Muktapur Village',
    mandal: 'Nirmal Mandal',
    district: 'Nirmal District',
    state: 'Telangana, India',
};

const Invoices = () => {
    const { data, addInvoice, deleteInvoice } = useData();
    const { isAdmin } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);

    const [newInvoice, setNewInvoice] = useState({
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        notes: ''
    });

    const addLineItem = () => setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', quantity: 1, rate: 0 }] });
    const updateLineItem = (index, field, value) => {
        const updated = [...newInvoice.items];
        updated[index] = { ...updated[index], [field]: value };
        setNewInvoice({ ...newInvoice, items: updated });
    };
    const removeLineItem = (index) => {
        if (newInvoice.items.length > 1)
            setNewInvoice({ ...newInvoice, items: newInvoice.items.filter((_, i) => i !== index) });
    };
    const calculateSubtotal = (items) => items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    // ─── PDF Generator ─────────────────────────────────────────────────────────
    const generatePDF = async (invoice) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        // ── Colour palette (minimal / pastel) ──
        const SLATE = [40, 44, 52];       // header text / heading
        const PASTEL_BG = [241, 245, 249];    // light slate-blue pastel
        const PASTEL_GRN = [232, 245, 233];    // light pastel green
        const PASTEL_GRN_BORDER = [187, 222, 190];
        const MID_GRAY = [120, 130, 140];
        const DARK = [30, 30, 30];
        const ACCENT = [71, 130, 80];      // muted forest green - only for accents
        const WHITE = [255, 255, 255];
        const BORDER = [220, 225, 230];

        /* ── 1. White full background ── */
        doc.setFillColor(...WHITE);
        doc.rect(0, 0, pw, ph, 'F');

        /* ── 2. Minimal pastel header strip ── */
        doc.setFillColor(...PASTEL_BG);
        doc.rect(0, 0, pw, 46, 'F');

        // thin accent top line
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pw, 2, 'F');

        /* ── 3. Logo with white rounded background ── */
        const logoSize = 28;
        const logoPad = 3;
        // white rounded rect behind logo
        doc.setFillColor(...WHITE);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(10, 8, logoSize + logoPad * 2, logoSize + logoPad * 2, 3, 3, 'FD');

        try {
            const response = await fetch('/logo.png');
            if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise(resolve => { reader.onload = resolve; reader.readAsDataURL(blob); });
                doc.addImage(reader.result, 'PNG', 10 + logoPad, 8 + logoPad, logoSize, logoSize);
            }
        } catch (_) {
            // fallback text logo
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...ACCENT);
            doc.text('TF', 19, 27);
        }

        /* ── 4. Company name beside logo ── */
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SLATE);
        doc.text(COMPANY.name, 48, 22);

        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID_GRAY);
        doc.text(`${COMPANY.village}, ${COMPANY.mandal}, ${COMPANY.district}`, 48, 29);
        doc.text(COMPANY.state, 48, 35);

        /* ── 5. "INVOICE" label – top right ── */
        doc.setFontSize(26); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SLATE);
        doc.text('INVOICE', pw - 14, 22, { align: 'right' });

        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID_GRAY);
        doc.text(`# ${invoice.invoiceNumber}`, pw - 14, 29, { align: 'right' });
        doc.text(invoice.date, pw - 14, 36, { align: 'right' });

        /* ── 6. Divider ── */
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.4);
        doc.line(14, 50, pw - 14, 50);

        /* ── 7. Invoice Details card (right) ── */
        const cardRX = pw - 72; const cardRY = 56;
        doc.setFillColor(...PASTEL_GRN);
        doc.setDrawColor(...PASTEL_GRN_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(cardRX, cardRY, 58, 30, 3, 3, 'FD');

        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text('INVOICE DETAILS', cardRX + 4, cardRY + 7);

        const row = (label, value, y) => {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MID_GRAY);
            doc.text(label, cardRX + 4, y);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
            doc.text(value, cardRX + 54, y, { align: 'right' });
        };
        row('Invoice No:', invoice.invoiceNumber, cardRY + 14);
        row('Date:', invoice.date, cardRY + 21);

        // Status pill
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID_GRAY);
        doc.text('Status:', cardRX + 4, cardRY + 28);
        doc.setFillColor(209, 236, 209);
        doc.roundedRect(cardRX + 22, cardRY + 23.5, 14, 6, 2, 2, 'F');
        doc.setTextColor(39, 110, 39); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text('PAID', cardRX + 25.5, cardRY + 27.8);

        /* ── 8. Bill To (left) ── */
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text('BILL TO', 14, cardRY + 7);
        doc.setDrawColor(...PASTEL_GRN_BORDER); doc.setLineWidth(0.4);
        doc.line(14, cardRY + 9, 55, cardRY + 9);

        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(invoice.customerName || '-', 14, cardRY + 17);

        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID_GRAY);
        let billY = cardRY + 23;
        if (invoice.customerAddress) {
            const lines = doc.splitTextToSize(invoice.customerAddress, 68);
            lines.forEach(l => { doc.text(l, 14, billY); billY += 5; });
        }
        if (invoice.customerPhone) {
            doc.text(`Tel: ${invoice.customerPhone}`, 14, billY); billY += 5;
        }

        /* ── 9. Items table ── */
        const tableY = Math.max(cardRY + 38, billY + 6);

        autoTable(doc, {
            startY: tableY,
            margin: { left: 14, right: 14 },
            theme: 'plain',
            head: [['#', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']],
            body: invoice.items.map((item, idx) => [
                idx + 1,
                item.description || '-',
                item.quantity,
                Number(item.rate).toLocaleString('en-IN'),
                (item.quantity * item.rate).toLocaleString('en-IN'),
            ]),
            headStyles: {
                fillColor: PASTEL_BG,
                textColor: SLATE,
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
                lineColor: BORDER,
                lineWidth: 0.3,
            },
            bodyStyles: {
                textColor: DARK,
                fontSize: 8.5,
                cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', textColor: MID_GRAY },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
            },
            tableLineColor: BORDER,
            tableLineWidth: 0.3,
        });

        /* ── 10. Totals box — fixed width to prevent overflow ── */
        const finalY = doc.lastAutoTable.finalY + 6;
        const total = invoice.total || 0;
        const totalStr = `Rs. ${total.toLocaleString('en-IN')}`;

        // Measure text width and size box accordingly
        const boxW = 70;
        const boxX = pw - 14 - boxW;

        doc.setFillColor(...PASTEL_GRN);
        doc.setDrawColor(...PASTEL_GRN_BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(boxX, finalY, boxW, 24, 3, 3, 'FD');

        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID_GRAY);
        doc.text('TOTAL AMOUNT', boxX + 5, finalY + 9);

        doc.setDrawColor(...PASTEL_GRN_BORDER); doc.setLineWidth(0.3);
        doc.line(boxX + 5, finalY + 12, boxX + boxW - 5, finalY + 12);

        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text(totalStr, boxX + boxW - 5, finalY + 21, { align: 'right' });

        /* ── 11. Notes ── */
        if (invoice.notes) {
            const notesY = finalY + 32;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(...BORDER);
            doc.roundedRect(14, notesY, pw - 28, 20, 2, 2, 'FD');
            doc.setFontSize(7); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...ACCENT);
            doc.text('NOTES', 18, notesY + 7);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.setTextColor(...MID_GRAY);
            const noteLines = doc.splitTextToSize(invoice.notes, pw - 42);
            doc.text(noteLines, 18, notesY + 14);
        }

        /* ── 12. Footer ── */
        const footerY = ph - 18;
        doc.setFillColor(...PASTEL_BG);
        doc.rect(0, footerY, pw, 18, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(0, footerY, pw, 1, 'F');

        // Company on left
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SLATE);
        doc.text(COMPANY.name, 14, footerY + 8);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MID_GRAY);
        doc.text(`${COMPANY.village}, ${COMPANY.mandal}, ${COMPANY.district}, ${COMPANY.state}`, 14, footerY + 14);

        // Thank you on right
        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.setTextColor(...ACCENT);
        doc.text('Thank you for your business!', pw - 14, footerY + 11, { align: 'right' });

        doc.save(`Trinetra_Farms_Invoice_${invoice.invoiceNumber}.pdf`);
    };

    // ─── Form handlers ──────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const invoice = {
            ...newInvoice,
            invoiceNumber: `TF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
            date: new Date().toLocaleDateString('en-IN'),
            total: calculateSubtotal(newInvoice.items)
        };
        try {
            await addInvoice(invoice);
            setIsModalOpen(false);
            setNewInvoice({ customerName: '', customerAddress: '', customerPhone: '', items: [{ description: '', quantity: 1, rate: 0 }], notes: '' });
        } catch (error) {
            console.error('Error adding invoice:', error);
            alert('Failed to create invoice: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        setDeletingInvoiceId(id);
        try { await deleteInvoice(id); }
        catch (error) { alert('Failed to delete: ' + error.message); }
        finally { setDeletingInvoiceId(null); }
    };

    const invoices = data.invoices || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 mt-1">Professional invoices for Trinetra Farms.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium">
                        <Plus className="w-5 h-5" /> Create Invoice
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-600"><FileText className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Invoices</p>
                        <h3 className="text-xl font-bold text-gray-800">{invoices.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-700"><Download className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <h3 className="text-xl font-bold text-gray-800">₹{invoices.reduce((s, inv) => s + (inv.total || 0), 0).toLocaleString('en-IN')}</h3>
                    </div>
                </div>
            </div>

            {/* Invoices table */}
            {invoices.length > 0 ? (
                <Table
                    headers={['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Actions']}
                    data={invoices}
                    renderRow={(invoice) => (
                        <>
                            <td className="px-6 py-4 font-mono font-semibold text-slate-700">{invoice.invoiceNumber}</td>
                            <td className="px-6 py-4 text-gray-600">{invoice.date}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{invoice.customerName}</td>
                            <td className="px-6 py-4 text-gray-500">{invoice.items?.length || 0} items</td>
                            <td className="px-6 py-4 font-bold text-green-700">₹{(invoice.total || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewInvoice(invoice)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Preview"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => generatePDF(invoice)} className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" title="Download PDF"><Download className="w-4 h-4" /></button>
                                    {isAdmin && (
                                        <button onClick={() => handleDeleteInvoice(invoice.id)} disabled={deletingInvoiceId === invoice.id} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                                            {deletingInvoiceId === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </>
                    )}
                />
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No invoices yet</h3>
                    <p className="text-gray-400 mt-1">Create your first invoice to get started.</p>
                </div>
            )}

            {/* ── Create Modal ────────────────────────────────────────────── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice">
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Customer Details</h3>
                        <input type="text" required placeholder="Customer Name *" value={newInvoice.customerName} onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                        <textarea placeholder="Address (optional)" value={newInvoice.customerAddress} onChange={(e) => setNewInvoice({ ...newInvoice, customerAddress: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 resize-none" rows={2} />
                        <input type="tel" placeholder="Phone (optional)" value={newInvoice.customerPhone} onChange={(e) => setNewInvoice({ ...newInvoice, customerPhone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Items</h3>
                            <button type="button" onClick={addLineItem} className="text-sm text-green-700 hover:text-green-800 font-semibold">+ Add Item</button>
                        </div>
                        {newInvoice.items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input type="text" required placeholder="Description" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 text-sm" />
                                <input type="number" required min="1" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)} className="w-16 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 text-sm text-center" placeholder="Qty" />
                                <input type="number" required min="0" value={item.rate} onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 text-sm" placeholder="Rate ₹" />
                                <span className="w-24 text-sm font-bold text-green-700 text-right">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</span>
                                {newInvoice.items.length > 1 && (
                                    <button type="button" onClick={() => removeLineItem(index)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <div className="text-right">
                                <span className="text-gray-500 mr-4 text-sm">Total:</span>
                                <span className="text-xl font-bold text-green-700">₹{calculateSubtotal(newInvoice.items).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    <textarea placeholder="Notes (optional)" value={newInvoice.notes} onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 resize-none" rows={2} />

                    <button type="submit" disabled={isSaving} className="w-full bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" />Creating...</> : <><CheckCircle className="w-5 h-5" />Create Invoice</>}
                    </button>
                </form>
            </Modal>

            {/* ── Preview Modal ───────────────────────────────────────────── */}
            <Modal isOpen={!!previewInvoice} onClose={() => setPreviewInvoice(null)} title="">
                {previewInvoice && (
                    <div className="font-sans space-y-4">
                        {/* Header: pastel slate bg */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {/* Logo with white bg */}
                                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                    <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-lg tracking-wide leading-tight">TRINETRA FARMS</p>
                                    <p className="text-slate-500 text-[10px] mt-0.5">{COMPANY.village}, {COMPANY.mandal}</p>
                                    <p className="text-slate-400 text-[10px]">{COMPANY.district}, {COMPANY.state}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-slate-800 text-2xl font-black tracking-wider">INVOICE</p>
                                <p className="text-slate-500 text-xs font-mono mt-0.5">{previewInvoice.invoiceNumber}</p>
                                <p className="text-slate-400 text-[10px] mt-1">{previewInvoice.date}</p>
                                <span className="inline-block mt-1.5 bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider border border-green-200">PAID</span>
                            </div>
                        </div>

                        {/* Bill To & Invoice Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-[10px] uppercase font-bold text-green-700 mb-2 tracking-widest">Bill To</p>
                                <p className="font-bold text-gray-800">{previewInvoice.customerName}</p>
                                {previewInvoice.customerAddress && <p className="text-xs text-gray-500 mt-0.5">{previewInvoice.customerAddress}</p>}
                                {previewInvoice.customerPhone && <p className="text-xs text-gray-500 mt-0.5">📞 {previewInvoice.customerPhone}</p>}
                            </div>
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                <p className="text-[10px] uppercase font-bold text-green-700 mb-2 tracking-widest">Invoice Details</p>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between"><span className="text-gray-500">Invoice No</span><span className="font-semibold text-gray-800 font-mono">{previewInvoice.invoiceNumber}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-800">{previewInvoice.date}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold">#</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold">Description</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-semibold">Qty</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Rate</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewInvoice.items?.map((item, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                            <td className="px-4 py-3 text-gray-400 text-center text-xs font-mono">{i + 1}</td>
                                            <td className="px-4 py-3 text-gray-800 font-medium">{item.description}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end">
                            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-right min-w-[180px]">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-xl font-black text-green-700 break-all">₹{(previewInvoice.total || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {previewInvoice.notes && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-gray-600">{previewInvoice.notes}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-5 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-700 text-sm">TRINETRA FARMS</p>
                                <p className="text-slate-400 text-[10px]">{COMPANY.village}, {COMPANY.mandal}, {COMPANY.district}</p>
                            </div>
                            <p className="text-green-600 text-xs font-medium italic">Thank you for your business!</p>
                        </div>

                        <button
                            onClick={() => { generatePDF(previewInvoice); setPreviewInvoice(null); }}
                            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download PDF
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Invoices;
