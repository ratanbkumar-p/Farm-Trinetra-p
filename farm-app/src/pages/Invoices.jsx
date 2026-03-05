import React, { useState } from 'react';
import { Plus, Download, Trash2, FileText, Eye, Loader2, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

// ── Company constants ──────────────────────────────────────────────────────────
const COMPANY = {
    name: 'TRINETRA FARMS',
    tagline: 'Fresh from the Farm, Straight to You',
    village: 'Muktapur Village',
    mandal: 'Nirmal Mandal',
    district: 'Nirmal District',
    state: 'Telangana, India',
    address: 'Muktapur Village, Nirmal Mandal, Nirmal District',
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

    // ─── Professional PDF Generator ────────────────────────────────────────────
    const generatePDF = async (invoice) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();   // 210mm
        const ph = doc.internal.pageSize.getHeight();  // 297mm

        // Colour palette
        const GREEN = [27, 94, 32];
        const LIGHT_GREEN = [232, 245, 233];
        const GRAY_TEXT = [90, 90, 90];
        const DARK_TEXT = [20, 20, 20];

        /* ── Header background ── */
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, pw, 44, 'F');

        /* ── Logo ── */
        let logoLoaded = false;
        try {
            const response = await fetch('/logo.png');
            if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise(resolve => { reader.onload = resolve; reader.readAsDataURL(blob); });
                doc.addImage(reader.result, 'PNG', 7, 4, 36, 36);
                logoLoaded = true;
            }
        } catch (_) { }

        if (!logoLoaded) {
            // fallback circle
            doc.setFillColor(255, 255, 255);
            doc.circle(25, 22, 18, 'F');
            doc.setFontSize(22); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GREEN);
            doc.text('TF', 18, 27);
        }

        /* ── Company name & tagline in header ── */
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(21); doc.setFont('helvetica', 'bold');
        doc.text(COMPANY.name, 48, 17);

        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.setTextColor(190, 230, 190);
        doc.text(COMPANY.tagline, 48, 24);

        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 220, 180);
        doc.text(`${COMPANY.village}, ${COMPANY.mandal}, ${COMPANY.district}`, 48, 30);
        doc.text(COMPANY.state, 48, 36);

        /* ── "INVOICE" label top-right ── */
        doc.setTextColor(255, 215, 100);
        doc.setFontSize(28); doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pw - 14, 20, { align: 'right' });

        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 230, 200);
        doc.text(`# ${invoice.invoiceNumber}`, pw - 14, 28, { align: 'right' });

        /* ── Invoice meta box (right) ── */
        const metaX = pw - 78; const metaY = 50;
        doc.setFillColor(...LIGHT_GREEN);
        doc.roundedRect(metaX, metaY, 64, 28, 3, 3, 'F');

        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREEN);
        doc.text('INVOICE DETAILS', metaX + 4, metaY + 7);

        doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice No:', metaX + 4, metaY + 14);
        doc.setFont('helvetica', 'bold');
        doc.text(invoice.invoiceNumber, metaX + 26, metaY + 14);

        doc.setFont('helvetica', 'normal');
        doc.text('Date:', metaX + 4, metaY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(invoice.date, metaX + 18, metaY + 20);

        doc.setFont('helvetica', 'normal');
        doc.text('Status:', metaX + 4, metaY + 26);
        doc.setFillColor(39, 120, 39);
        doc.roundedRect(metaX + 20, metaY + 22, 16, 6, 2, 2, 'F');
        doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
        doc.text('PAID', metaX + 24.5, metaY + 26.5);

        /* ── Bill To (left) ── */
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREEN);
        doc.text('BILL TO', 14, metaY + 7);
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.5);
        doc.line(14, metaY + 9, 70, metaY + 9);

        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK_TEXT);
        doc.text(invoice.customerName || '-', 14, metaY + 17);

        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        let billY = metaY + 23;
        if (invoice.customerAddress) {
            const lines = doc.splitTextToSize(invoice.customerAddress, 72);
            lines.forEach(l => { doc.text(l, 14, billY); billY += 5; });
        }
        if (invoice.customerPhone) {
            doc.text(`Tel: ${invoice.customerPhone}`, 14, billY); billY += 5;
        }

        /* ── Items table ── */
        const tableY = Math.max(metaY + 36, billY + 6);

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
                fillColor: GREEN,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
            },
            bodyStyles: {
                textColor: DARK_TEXT,
                fontSize: 9,
                cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
            },
            alternateRowStyles: { fillColor: [248, 252, 248] },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
            },
        });

        /* ── Totals box ── */
        const finalY = doc.lastAutoTable.finalY + 6;
        const total = invoice.total || 0;

        doc.setFillColor(...LIGHT_GREEN);
        doc.roundedRect(pw - 80, finalY, 66, 22, 3, 3, 'F');

        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Subtotal:', pw - 76, finalY + 8);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK_TEXT);
        doc.text(`₹${total.toLocaleString('en-IN')}`, pw - 17, finalY + 8, { align: 'right' });

        doc.setDrawColor(...GREEN); doc.setLineWidth(0.4);
        doc.line(pw - 76, finalY + 11, pw - 17, finalY + 11);

        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREEN);
        doc.text('TOTAL:', pw - 76, finalY + 19);
        doc.setFontSize(14);
        doc.text(`₹${total.toLocaleString('en-IN')}`, pw - 17, finalY + 19, { align: 'right' });

        /* ── Notes ── */
        let notesEndY = finalY + 30;
        if (invoice.notes) {
            doc.setFillColor(250, 250, 250); doc.setDrawColor(220, 220, 220);
            doc.roundedRect(14, finalY + 28, pw - 28, 22, 2, 2, 'FD');
            doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GREEN);
            doc.text('Notes:', 18, finalY + 36);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY_TEXT);
            const noteLines = doc.splitTextToSize(invoice.notes, pw - 40);
            doc.text(noteLines, 18, finalY + 43);
            notesEndY = finalY + 52;
        }

        /* ── Footer ── */
        const footerY = ph - 22;
        doc.setFillColor(...GREEN);
        doc.rect(0, footerY, pw, 22, 'F');

        // Left: company
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 215, 100);
        doc.text(COMPANY.name, 14, footerY + 9);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(190, 230, 190);
        doc.text(`${COMPANY.village}, ${COMPANY.mandal}`, 14, footerY + 15);
        doc.text(`${COMPANY.district}, ${COMPANY.state}`, 14, footerY + 20);

        // Centre: tagline
        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.setTextColor(200, 235, 200);
        doc.text(COMPANY.tagline, pw / 2, footerY + 12, { align: 'center' });

        // Right: thank you
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Thank you for your business!', pw - 14, footerY + 9, { align: 'right' });
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(190, 230, 190);
        doc.text('Quality farm products, trusted delivery.', pw - 14, footerY + 15, { align: 'right' });

        // Page #
        doc.setFontSize(7); doc.setTextColor(160, 200, 160);
        doc.text('Page 1 of 1', pw / 2, footerY + 20, { align: 'center' });

        doc.save(`Trinetra_Farms_Invoice_${invoice.invoiceNumber}.pdf`);
    };

    // ─── Form submit ────────────────────────────────────────────────────────────
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
            {/* Page header */}
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
                    <div className="p-3 bg-green-50 rounded-xl text-green-700"><FileText className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Invoices</p>
                        <h3 className="text-xl font-bold text-gray-800">{invoices.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Download className="w-6 h-6" /></div>
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
                            <td className="px-6 py-4 font-mono font-semibold text-green-700">{invoice.invoiceNumber}</td>
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

            {/* ── Create Modal ──────────────────────────────────────────────── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice">
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    {/* Customer */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wider">Customer Details</h3>
                        <input type="text" required placeholder="Customer Name *" value={newInvoice.customerName} onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                        <textarea placeholder="Address (optional)" value={newInvoice.customerAddress} onChange={(e) => setNewInvoice({ ...newInvoice, customerAddress: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 resize-none" rows={2} />
                        <input type="tel" placeholder="Phone (optional)" value={newInvoice.customerPhone} onChange={(e) => setNewInvoice({ ...newInvoice, customerPhone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wider">Items</h3>
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

            {/* ── Preview Modal ─────────────────────────────────────────────── */}
            <Modal isOpen={!!previewInvoice} onClose={() => setPreviewInvoice(null)} title="">
                {previewInvoice && (
                    <div className="font-sans space-y-4">
                        {/* Invoice header */}
                        <div className="bg-green-800 text-white rounded-2xl p-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-yellow-300 text-xl font-black tracking-widest leading-tight">TRINETRA FARMS</p>
                                <p className="text-green-200 text-[11px] italic mt-0.5">{COMPANY.tagline}</p>
                                <p className="text-green-300 text-[10px] mt-1.5">{COMPANY.village}, {COMPANY.mandal}</p>
                                <p className="text-green-300 text-[10px]">{COMPANY.district}, {COMPANY.state}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-yellow-300 text-2xl font-black">INVOICE</p>
                                <p className="text-green-200 text-xs font-mono mt-0.5">{previewInvoice.invoiceNumber}</p>
                                <p className="text-green-300 text-[10px] mt-1">{previewInvoice.date}</p>
                                <span className="inline-block mt-1.5 bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider">PAID</span>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                            <p className="text-[10px] uppercase font-bold text-green-700 mb-1 tracking-widest">Bill To</p>
                            <p className="font-bold text-gray-800 text-base">{previewInvoice.customerName}</p>
                            {previewInvoice.customerAddress && <p className="text-sm text-gray-500 mt-0.5">{previewInvoice.customerAddress}</p>}
                            {previewInvoice.customerPhone && <p className="text-sm text-gray-500 mt-0.5">📞 {previewInvoice.customerPhone}</p>}
                        </div>

                        {/* Items Table */}
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-green-800 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider">Description</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider">Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider">Rate</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {previewInvoice.items?.map((item, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}>
                                            <td className="px-4 py-3 text-gray-400 text-center font-mono text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 text-gray-800 font-medium">{item.description}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-700">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end">
                            <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-right min-w-[180px]">
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-2xl font-black text-green-700">₹{(previewInvoice.total || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        {previewInvoice.notes && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-gray-600">{previewInvoice.notes}</p>
                            </div>
                        )}

                        {/* Footer tagline */}
                        <div className="bg-green-800 rounded-xl py-3 px-5 text-center">
                            <p className="text-yellow-300 font-bold text-sm tracking-widest">TRINETRA FARMS</p>
                            <p className="text-green-200 text-xs italic mt-0.5">{COMPANY.tagline}</p>
                            <p className="text-green-300 text-[10px] mt-0.5">{COMPANY.village}, {COMPANY.mandal}, {COMPANY.district}, {COMPANY.state}</p>
                        </div>

                        <button
                            onClick={() => { generatePDF(previewInvoice); setPreviewInvoice(null); }}
                            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download Professional PDF
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Invoices;
