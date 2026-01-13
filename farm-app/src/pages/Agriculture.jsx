import React, { useState } from 'react';
import { Plus, Leaf, Calendar } from 'lucide-react';
import Table from '../components/ui/Table';

const MOCK_CROPS = [
    { id: 'V-001', name: 'Tomato', variety: 'Roma', plantedDate: '2025-12-01', harvestDate: '2026-03-01', area: '0.5 Acre', status: 'Growing' },
    { id: 'V-002', name: 'Spinach', variety: 'Savoy', plantedDate: '2026-01-05', harvestDate: '2026-02-15', area: '0.2 Acre', status: 'Growing' },
    { id: 'V-003', name: 'Chillies', variety: 'Guntur', plantedDate: '2025-11-15', harvestDate: '2026-02-28', area: '1 Acre', status: 'Harvest Ready' },
];

const Agriculture = () => {
    const [crops] = useState(MOCK_CROPS);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Growing': return 'bg-green-100 text-green-700';
            case 'Harvest Ready': return 'bg-orange-100 text-orange-700';
            case 'Harvested': return 'bg-gray-100 text-gray-600';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Agriculture Management</h1>
                    <p className="text-gray-500 mt-1">Monitor your vegetable crops and harvest schedules.</p>
                </div>
                <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium">
                    <Plus className="w-5 h-5" />
                    Add Crop Batch
                </button>
            </div>

            {/* Stats / Quick View - Optional */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Crops</p>
                        <h3 className="text-xl font-bold text-gray-800">3 Batches</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Next Harvest</p>
                        <h3 className="text-xl font-bold text-gray-800">15 Feb 2026</h3>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <Table
                headers={['ID', 'Crop Name', 'Variety', 'Planted Date', 'Est. Harvest', 'Area', 'Status']}
                data={crops}
                renderRow={(item) => (
                    <>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                        <td className="px-6 py-4 flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-green-500" />
                            {item.name}
                        </td>
                        <td className="px-6 py-4">{item.variety}</td>
                        <td className="px-6 py-4">{item.plantedDate}</td>
                        <td className="px-6 py-4">{item.harvestDate}</td>
                        <td className="px-6 py-4">{item.area}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(item.status)}`}>
                                {item.status}
                            </span>
                        </td>
                    </>
                )}
                actions={(item) => (
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-green-600 transition-colors">
                        <Calendar className="w-4 h-4" />
                    </button>
                )}
            />
        </div>
    );
};

export default Agriculture;
