import React from 'react';

const Table = React.memo(({ headers, data, renderRow, actions, emptyMessage }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-3xl shadow-sm ring-1 ring-gray-200">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-straw/60 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className="px-6 py-3.5 whitespace-nowrap">{header}</th>
                        ))}
                        {actions && <th className="px-6 py-3.5 text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.length > 0 ? (
                        data.map((item, idx) => (
                            <tr
                                key={item.id || idx}
                                className="hover:bg-amber-50/50 transition-colors animate-in"
                                style={{ animationDelay: `${Math.min(idx, 12) * 25}ms` }}
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
                            <td colSpan={headers.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-400">
                                <span className="block text-3xl mb-2 animate-float">🌾</span>
                                {emptyMessage || "Nothing here yet."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default Table;
