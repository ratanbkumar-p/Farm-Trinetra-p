import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Save, Lock, Unlock, DollarSign, Users } from 'lucide-react';

const Settings = () => {
    const { settings, updateSetting, updateConsumptionRate } = useSettings();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Farm Settings</h1>
                    <p className="text-gray-500 mt-1">Configure global cost variables and application modes.</p>
                </div>
            </div>

            {/* Owner Mode Toggle */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${settings.ownerMode ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                        {settings.ownerMode ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Owner Mode</h3>
                        <p className="text-sm text-gray-500">Reveal sensitive financial data (True Cost, Profit Margins).</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.ownerMode}
                        onChange={(e) => updateSetting('ownerMode', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {/* Global Cost Variables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-800">Cost Parameters</h3>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Standard Feed Cost (₹/kg)</label>
                        <input
                            type="number"
                            value={settings.feedCostPerUnit}
                            onChange={(e) => updateSetting('feedCostPerUnit', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-green-500/20 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Daily Labor Cost (Total ₹)</label>
                        <input
                            type="number"
                            value={settings.dailyLaborCost}
                            onChange={(e) => updateSetting('dailyLaborCost', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-green-500/20 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Divided equally among all animals daily.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Profit Margin (%)</label>
                        <input
                            type="number"
                            value={settings.marginPercentage}
                            onChange={(e) => updateSetting('marginPercentage', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-green-500/20 outline-none"
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-800">Feed Consumption Multipliers</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Relative to 1 unit (e.g., if Goat is 1, Cow might be 10).</p>

                    {Object.entries(settings.consumptionRates).map(([type, rate]) => (
                        <div key={type} className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">{type}</label>
                            <input
                                type="number"
                                step="0.1"
                                value={rate}
                                onChange={(e) => updateConsumptionRate(type, e.target.value)}
                                className="w-24 px-3 py-1.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-right"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;
