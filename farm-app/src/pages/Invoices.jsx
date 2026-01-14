import React, { useState } from 'react';
import { Plus, Download, Trash2, FileText, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const Invoices = () => {
    const { data, addInvoice, deleteInvoice } = useData();
    const { isAdmin } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState(null);

    const [newInvoice, setNewInvoice] = useState({
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        items: [{ description: '', quantity: 1, rate: 0 }],
        notes: ''
    });

    // Add new line item
    const addLineItem = () => {
        setNewInvoice({
            ...newInvoice,
            items: [...newInvoice.items, { description: '', quantity: 1, rate: 0 }]
        });
    };

    // Update line item
    const updateLineItem = (index, field, value) => {
        const updatedItems = [...newInvoice.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setNewInvoice({ ...newInvoice, items: updatedItems });
    };

    // Remove line item
    const removeLineItem = (index) => {
        if (newInvoice.items.length > 1) {
            const updatedItems = newInvoice.items.filter((_, i) => i !== index);
            setNewInvoice({ ...newInvoice, items: updatedItems });
        }
    };

    // Calculate totals
    const calculateSubtotal = (items) => {
        return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    };

    // Generate PDF
    const generatePDF = (invoice) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(46, 125, 50); // Green
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('TRINETRA FARMS', 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Farm Management Invoice', 20, 33);

        // Invoice Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 70, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${invoice.date}`, pageWidth - 70, 62);

        // Customer Info
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.customerName, 20, 62);
        if (invoice.customerAddress) {
            const addressLines = doc.splitTextToSize(invoice.customerAddress, 80);
            doc.text(addressLines, 20, 69);
        }
        if (invoice.customerPhone) {
            doc.text(`Phone: ${invoice.customerPhone}`, 20, 83);
        }

        // Table Header
        let yPos = 100;
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, pageWidth - 40, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Description', 25, yPos + 7);
        doc.text('Qty', 110, yPos + 7);
        doc.text('Rate', 130, yPos + 7);
        doc.text('Amount', 160, yPos + 7);

        // Table Items
        yPos += 15;
        doc.setFont('helvetica', 'normal');
        invoice.items.forEach((item, index) => {
            const amount = item.quantity * item.rate;
            doc.text(item.description || '-', 25, yPos);
            doc.text(item.quantity.toString(), 110, yPos);
            doc.text(`₹${item.rate.toLocaleString()}`, 130, yPos);
            doc.text(`₹${amount.toLocaleString()}`, 160, yPos);
            yPos += 8;

            // Add new page if needed
            if (yPos > 250) {
                doc.addPage();
                yPos = 30;
            }
        });

        // Subtotal
        yPos += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total:', 130, yPos);
        doc.text(`₹${invoice.total.toLocaleString()}`, 160, yPos);

        // Notes
        if (invoice.notes) {
            yPos += 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Notes:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
            doc.text(notesLines, 20, yPos + 7);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('Thank you for your business!', pageWidth / 2, 280, { align: 'center' });
        doc.text('Trinetra Farms - Quality Farm Products', pageWidth / 2, 285, { align: 'center' });

        // Save PDF
        doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    };

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        const invoice = {
            ...newInvoice,
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-IN'),
            total: calculateSubtotal(newInvoice.items)
        };
        addInvoice(invoice);
        setIsModalOpen(false);
        setNewInvoice({
            customerName: '',
            customerAddress: '',
            customerPhone: '',
            items: [{ description: '', quantity: 1, rate: 0 }],
            notes: ''
        });
    };

    const invoices = data.invoices || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 mt-1">Generate and manage farm invoices.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Create Invoice
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Invoices</p>
                        <h3 className="text-xl font-bold text-gray-800">{invoices.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Download className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <h3 className="text-xl font-bold text-gray-800">
                            ₹ {invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            {invoices.length > 0 ? (
                <Table
                    headers={['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Actions']}
                    data={invoices}
                    renderRow={(invoice) => (
                        <>
                            <td className="px-6 py-4 font-medium text-gray-900">{invoice.invoiceNumber}</td>
                            <td className="px-6 py-4">{invoice.date}</td>
                            <td className="px-6 py-4">{invoice.customerName}</td>
                            <td className="px-6 py-4">{invoice.items?.length || 0} items</td>
                            <td className="px-6 py-4 font-bold text-green-600">₹ {(invoice.total || 0).toLocaleString()}</td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPreviewInvoice(invoice)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => generatePDF(invoice)}
                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => deleteInvoice(invoice.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
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

            {/* Create Invoice Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice">
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Customer Info */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-700">Customer Details</h3>
                        <input
                            type="text"
                            required
                            placeholder="Customer Name"
                            value={newInvoice.customerName}
                            onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                        <textarea
                            placeholder="Address (optional)"
                            value={newInvoice.customerAddress}
                            onChange={(e) => setNewInvoice({ ...newInvoice, customerAddress: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                            rows={2}
                        />
                        <input
                            type="tel"
                            placeholder="Phone (optional)"
                            value={newInvoice.customerPhone}
                            onChange={(e) => setNewInvoice({ ...newInvoice, customerPhone: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>

                    {/* Line Items */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-gray-700">Invoice Items</h3>
                            <button
                                type="button"
                                onClick={addLineItem}
                                className="text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                                + Add Item
                            </button>
                        </div>

                        {newInvoice.items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <input
                                    type="text"
                                    required
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                    className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-green-500/20 text-sm"
                                />
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-16 px-3 py-2 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-green-500/20 text-sm"
                                />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="Rate"
                                    value={item.rate}
                                    onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-3 py-2 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-green-500/20 text-sm"
                                />
                                <span className="w-24 py-2 text-sm font-medium text-gray-600">
                                    ₹{(item.quantity * item.rate).toLocaleString()}
                                </span>
                                {newInvoice.items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeLineItem(index)}
                                        className="p-2 text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Total */}
                        <div className="flex justify-end pt-2 border-t border-gray-100">
                            <div className="text-right">
                                <span className="text-gray-500 mr-4">Total:</span>
                                <span className="text-xl font-bold text-green-600">
                                    ₹{calculateSubtotal(newInvoice.items).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <textarea
                            placeholder="Notes (optional)"
                            value={newInvoice.notes}
                            onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                            rows={2}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                        Create Invoice
                    </button>
                </form>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={!!previewInvoice}
                onClose={() => setPreviewInvoice(null)}
                title={`Invoice ${previewInvoice?.invoiceNumber || ''}`}
            >
                {previewInvoice && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl">
                            <p className="text-sm text-gray-500">Customer</p>
                            <p className="font-medium">{previewInvoice.customerName}</p>
                            {previewInvoice.customerAddress && (
                                <p className="text-sm text-gray-600">{previewInvoice.customerAddress}</p>
                            )}
                            {previewInvoice.customerPhone && (
                                <p className="text-sm text-gray-600">Phone: {previewInvoice.customerPhone}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            {previewInvoice.items?.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span>{item.description} × {item.quantity}</span>
                                    <span className="font-medium">₹{(item.quantity * item.rate).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-3 flex justify-between">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-green-600">₹{previewInvoice.total?.toLocaleString()}</span>
                        </div>

                        <button
                            onClick={() => {
                                generatePDF(previewInvoice);
                                setPreviewInvoice(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
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
