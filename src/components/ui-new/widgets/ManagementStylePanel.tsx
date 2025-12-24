/**
 * Management Style Panel
 * 
 * Displays AI alignment decisions and provides a slider to control
 * management generosity (0-100) for experimentation.
 * 
 * PURPOSE: Educational digital twin - observe effects of different
 * management philosophies (strict vs. generous) on worker trust/initiative.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sliders, Heart, TrendingUp, Activity } from 'lucide-react';
import { useAIConfigStore } from '../../../stores/aiConfigStore';
import { useWorkerMoodStore } from '../../../stores/workerMoodStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * Management Style Control & AI Decision Display
 */
export const ManagementStylePanel: React.FC = () => {
    const {
        managementGenerosity,
        setManagementGenerosity,
        getGrantRate,
    } = useAIConfigStore(
        useShallow((state) => ({
            managementGenerosity: state.managementGenerosity,
            setManagementGenerosity: state.setManagementGenerosity,
            getGrantRate: state.getGrantRate,
        }))
    );

    // Calculate aggregate alignment stats
    const { averageTrust, averageInitiative, pendingCount } = useWorkerMoodStore(
        useShallow((state) => {
            const moods = Object.values(state.workerMoods);
            const withPrefs = moods.filter(m => m?.preferences);
            const avgTrust = withPrefs.length > 0
                ? withPrefs.reduce((sum, m) => sum + (m?.preferences?.managementTrust || 0), 0) / withPrefs.length
                : 0;
            const avgInit = withPrefs.length > 0
                ? withPrefs.reduce((sum, m) => sum + (m?.preferences?.initiative || 0), 0) / withPrefs.length
                : 0;
            const pending = state.getWorkersWithPendingRequests().length;
            return { averageTrust: avgTrust, averageInitiative: avgInit, pendingCount: pending };
        })
    );

    const grantRate = getGrantRate();
    const styleLabel = managementGenerosity >= 80 ? 'Generous' :
        managementGenerosity >= 60 ? 'Kind' :
            managementGenerosity >= 40 ? 'Balanced' :
                managementGenerosity >= 20 ? 'Firm' : 'Strict';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-600/50 rounded-lg p-3 shadow-lg w-72"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-white">Management Style</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${managementGenerosity >= 60 ? 'bg-green-500/20 text-green-300' :
                    managementGenerosity >= 40 ? 'bg-blue-500/20 text-blue-300' :
                        'bg-amber-500/20 text-amber-300'
                    }`}>
                    {styleLabel}
                </span>
            </div>

            {/* Generosity Slider */}
            <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Strict</span>
                    <span>Grant Rate: {(grantRate * 100).toFixed(0)}%</span>
                    <span>Generous</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={managementGenerosity}
                    onChange={(e) => setManagementGenerosity(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 bg-gradient-to-r from-amber-600 via-blue-600 to-green-600"
                    aria-label="Management generosity"
                />
            </div>

            {/* Aggregate Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-800/50 rounded p-1.5">
                    <Heart className={`w-3 h-3 mx-auto mb-0.5 ${averageTrust >= 70 ? 'text-green-400' : averageTrust >= 50 ? 'text-amber-400' : 'text-red-400'}`} />
                    <div className="text-xs font-bold text-white">{averageTrust.toFixed(0)}%</div>
                    <div className="text-[9px] text-slate-500">Avg Trust</div>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                    <TrendingUp className={`w-3 h-3 mx-auto mb-0.5 ${averageInitiative >= 70 ? 'text-cyan-400' : averageInitiative >= 50 ? 'text-amber-400' : 'text-red-400'}`} />
                    <div className="text-xs font-bold text-white">{averageInitiative.toFixed(0)}%</div>
                    <div className="text-[9px] text-slate-500">Avg Initiative</div>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                    <Activity className={`w-3 h-3 mx-auto mb-0.5 ${pendingCount === 0 ? 'text-green-400' : 'text-amber-400'}`} />
                    <div className="text-xs font-bold text-white">{pendingCount}</div>
                    <div className="text-[9px] text-slate-500">Pending</div>
                </div>
            </div>

            {/* Educational Note */}
            <div className="mt-2 text-[9px] text-slate-500 text-center italic">
                AI resolves preferences every 10s • Higher generosity builds trust
            </div>
        </motion.div>
    );
};

export default ManagementStylePanel;
