import { useState } from 'react';
import { ShipConfig } from '../types';

interface ShipCustomizeProps {
  currentConfig: ShipConfig;
  onSave: (config: ShipConfig) => void;
  onClose: () => void;
}

const presetShips = [
  {
    name: 'The Explorer',
    hullColor: '#8B4513',
    sailColor: '#F5F0E8',
    flagColor: '#C62828',
  },
  {
    name: 'The Navigator',
    hullColor: '#2C3E50',
    sailColor: '#ECF0F1',
    flagColor: '#3498DB',
  },
  {
    name: 'The Discovery',
    hullColor: '#5D4037',
    sailColor: '#FFF9C4',
    flagColor: '#FFA000',
  },
  {
    name: 'The Voyager',
    hullColor: '#1B5E20',
    sailColor: '#E8F5E9',
    flagColor: '#4CAF50',
  },
  {
    name: 'The Pioneer',
    hullColor: '#4A148C',
    sailColor: '#F3E5F5',
    flagColor: '#9C27B0',
  },
];

export default function ShipCustomize({ currentConfig, onSave, onClose }: ShipCustomizeProps) {
  const [config, setConfig] = useState<ShipConfig>(currentConfig);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  const handlePresetSelect = (preset: typeof presetShips[0]) => {
    setConfig({
      ...config,
      hullColor: preset.hullColor,
      sailColor: preset.sailColor,
      flagColor: preset.flagColor,
      name: preset.name,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold text-white">Customize Your Ship</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Ship Preview */}
        <div className="bg-gradient-to-b from-sky-900 to-blue-900 rounded-xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 800 400">
              <path d="M0,200 Q200,180 400,200 T800,200 L800,400 L0,400 Z" fill="rgba(59,130,246,0.3)" />
            </svg>
          </div>
          <div className="relative flex justify-center items-center h-64">
            <svg width="300" height="240" viewBox="0 0 200 160" className="drop-shadow-2xl">
              {/* Hull */}
              <path d="M30,110 Q40,135 100,135 Q160,135 170,110 L155,85 L45,85 Z" fill={config.hullColor} stroke="#3E2723" strokeWidth="2" />
              <path d="M45,85 L155,85 L150,100 L50,100 Z" fill={config.hullColor} opacity="0.8" />
              
              {/* Deck */}
              <rect x="60" y="75" width="80" height="10" rx="2" fill="#4E342E" />
              <rect x="70" y="70" width="60" height="5" rx="1" fill="#3E2723" />
              
              {/* Masts */}
              <rect x="98" y="10" width="4" height="75" fill="#3E2723" />
              <rect x="68" y="25" width="3" height="60" fill="#3E2723" />
              <rect x="128" y="30" width="3" height="55" fill="#3E2723" />
              
              {/* Sails */}
              <path d="M72,27 Q90,18 100,27 L100,70 Q85,63 72,70 Z" fill={config.sailColor} stroke="#D4C5A9" strokeWidth="1" />
              <path d="M102,12 Q120,5 130,12 L130,60 Q115,53 102,60 Z" fill={config.sailColor} stroke="#D4C5A9" strokeWidth="1" />
              <path d="M131,32 Q145,26 152,32 L152,70 Q142,65 131,70 Z" fill={config.sailColor} stroke="#D4C5A9" strokeWidth="1" />
              
              {/* Flag */}
              <path d="M100,10 L100,2 L118,6 L100,10" fill={config.flagColor} />
              
              {/* Windows */}
              <circle cx="75" cy="95" r="3" fill="#FFD54F" opacity="0.9" />
              <circle cx="90" cy="95" r="3" fill="#FFD54F" opacity="0.9" />
              <circle cx="105" cy="95" r="3" fill="#FFD54F" opacity="0.9" />
              <circle cx="120" cy="95" r="3" fill="#FFD54F" opacity="0.9" />
            </svg>
          </div>
          <div className="text-center mt-4">
            <div className="text-white font-serif text-2xl italic">{config.name}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'presets'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
              activeTab === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Content */}
        {activeTab === 'presets' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presetShips.map((preset, i) => (
              <button
                key={i}
                onClick={() => handlePresetSelect(preset)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  config.name === preset.name
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: preset.hullColor }} />
                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: preset.sailColor }} />
                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: preset.flagColor }} />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold">{preset.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ship Name */}
            <div>
              <label className="block text-white/80 text-sm font-bold mb-2">Ship Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                maxLength={30}
              />
            </div>

            {/* Hull Color */}
            <div>
              <label className="block text-white/80 text-sm font-bold mb-2">Hull Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.hullColor}
                  onChange={(e) => setConfig({ ...config, hullColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={config.hullColor}
                  onChange={(e) => setConfig({ ...config, hullColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sail Color */}
            <div>
              <label className="block text-white/80 text-sm font-bold mb-2">Sail Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.sailColor}
                  onChange={(e) => setConfig({ ...config, sailColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={config.sailColor}
                  onChange={(e) => setConfig({ ...config, sailColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Flag Color */}
            <div>
              <label className="block text-white/80 text-sm font-bold mb-2">Flag Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.flagColor}
                  onChange={(e) => setConfig({ ...config, flagColor: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={config.flagColor}
                  onChange={(e) => setConfig({ ...config, flagColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(config)}
            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
          >
            Save Ship
          </button>
        </div>
      </div>
    </div>
  );
}
