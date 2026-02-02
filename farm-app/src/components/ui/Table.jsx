import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Table = React.memo(({ headers, data, renderRow, actions, emptyMessage }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className="px-6 py-4">{header}</th>
                        ))}
                        {actions && <th className="px-6 py-4 text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.length > 0 ? (
                        data.map((item, idx) => (
                            <tr
                                key={item.id || idx}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                {renderRow(item)}
                                {actions && (
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {actions(item)}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length + (actions ? 1 : 0)} className="px-6 py-8 text-center text-gray-400">
                                {emptyMessage || "No records found."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default Table;
