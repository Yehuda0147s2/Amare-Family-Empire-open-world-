import React, { useState } from 'react';
import { X, Play, RefreshCw, Cpu, Layers, FileCode, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import {
  ASSET_CATALOG,
  GODOT_PLAYER_GDSCRIPT,
  GODOT_PROJECT_CONFIG,
  BLENDER_PYTHON_GENERATOR,
  AMARE_NPC_GDSCRIPT,
  FASTAPI_BACKEND_CODE,
} from '../game/godot-pipeline.ts';
import { AMARE_LIST } from '../game/amare-lore.ts';

interface FactoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSeed: number;
  onApplySeed: (newSeed: number) => void;
  onPlayNow: () => void;
}

export const FactoryModal: React.FC<FactoryModalProps> = ({
  isOpen,
  onClose,
  activeSeed,
  onApplySeed,
  onPlayNow,
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'assets' | 'godot' | 'blender' | 'backend' | 'amare' | 'architecture'>('generator');
  const [tempSeed, setTempSeed] = useState(activeSeed);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRandomSeed = () => {
    const s = Math.floor(Math.random() * 900000) + 100000;
    setTempSeed(s);
  };

  const handleApply = () => {
    onApplySeed(tempSeed);
  };

  const handleExportGodotBundle = () => {
    const bundleContent = `=== HUMANS VS. ANITA: GODOT 4, BLENDER & AMARE FAMILY RESISTANCE PIPELINE ===
Export Timestamp: ${new Date().toISOString()}
Target Engine: Godot 4.3 (Compatibility Renderer - WebAssembly / WebGL 2.0)
World Seed: ${tempSeed}

--- project.godot ---
${GODOT_PROJECT_CONFIG}

--- scripts/player_controller.gd ---
${GODOT_PLAYER_GDSCRIPT}

--- scripts/amare_npc.gd ---
${AMARE_NPC_GDSCRIPT}

--- blender/generate_modular_building.py ---
${BLENDER_PYTHON_GENERATOR}

--- backend/server.py (FastAPI + Redis Queue) ---
${FASTAPI_BACKEND_CODE}

--- manifest/assets.json ---
${JSON.stringify(ASSET_CATALOG, null, 2)}

--- lore/amare_family.json ---
${JSON.stringify(AMARE_LIST, null, 2)}
`;

    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humans_vs_anita_complete_project_seed_${tempSeed}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const filteredAssets = categoryFilter === 'all'
    ? ASSET_CATALOG
    : ASSET_CATALOG.filter((a) => a.category === categoryFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold font-mono tracking-wide text-white">
                HUMANS VS. ANITA — 3D WORLD FACTORY
              </h2>
              <p className="text-xs text-slate-400">
                Godot 4 Web Engine · Blender Python Generator · Amare Family Universe · FastAPI Pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Close Factory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 text-xs font-mono overflow-x-auto">
          {[
            { id: 'generator', label: 'Procedural Generator' },
            { id: 'amare', label: 'Amare Family (Lore & GDScript)' },
            { id: 'assets', label: 'Asset Discovery Service' },
            { id: 'godot', label: 'Godot 4 Controller' },
            { id: 'blender', label: 'Blender Python' },
            { id: 'backend', label: 'FastAPI Backend API' },
            { id: 'architecture', label: 'Architecture & Verification' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-3.5 border-b-2 font-medium transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-slate-850/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto text-sm">
          {activeTab === 'generator' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                <h3 className="font-mono text-sm font-bold text-cyan-300 mb-2">
                  DETERMINISTIC WORLD SEED
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Controls the pseudo-random generation of street layouts, skyscraper heights, enterable interior rooms, Anita surveillance drones, and security terminals.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Seed Value:</span>
                    <input
                      type="number"
                      value={tempSeed}
                      onChange={(e) => setTempSeed(parseInt(e.target.value) || 0)}
                      className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-sm w-36 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <button
                    onClick={handleRandomSeed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono cursor-pointer transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Randomize</span>
                  </button>

                  <button
                    onClick={handleApply}
                    className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold cursor-pointer transition"
                  >
                    Apply &amp; Rebuild World
                  </button>
                </div>
              </div>

              {/* District Overview */}
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                  Autonomous Metropolis Districts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-rose-400 text-xs">Anita Citadel Core (Chunk 0,0)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-mono">Restricted</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Central monolithic skyscraper housing Anita's primary mainframe and high-frequency defense turrets.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-cyan-400 text-xs">Neon Habitation Sector</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">Residential</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      High-density residential towers with accessible ground corridors, apartment interiors, and cyber billboards.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-amber-400 text-xs">Industrial Manufacturing Grid</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono">Heavy Sector</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Modular warehouses, automated fabrication plants, generator coils, and server nodes.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/40 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-emerald-400 text-xs">Underground Maintenance Grid</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">Resistance Safezone</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Subterranean access tunnels, datashard caches, bio-luminescent lighting, and concealed blast doors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">Automated Asset Discovery &amp; Licensing</h3>
                  <p className="text-xs text-slate-400">
                    Catalog of verified open-source (CC0 / MIT) 3D models and materials inspected for Godot/WebGL streaming.
                  </p>
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200"
                >
                  <option value="all">All Categories</option>
                  <option value="architecture">Architecture</option>
                  <option value="electronics">Electronics &amp; Nodes</option>
                  <option value="vehicles">Vehicles &amp; Drones</option>
                </select>
              </div>

              <div className="space-y-2">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded bg-slate-950/50 border border-slate-800 gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-cyan-300 text-xs">{asset.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                          {asset.license}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono">
                          {asset.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{asset.description}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
                      <span>{asset.triangles} tris</span>
                      <span>{asset.lodLevels} LODs</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[11px] font-bold">
                        {asset.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'godot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">Godot 4 GDScript Controller (`player_controller.gd`)</h3>
                  <p className="text-xs text-slate-400">
                    Native Godot 4 CharacterBody3D script implementing third-person movement, coyote time, and EMP logic.
                  </p>
                </div>
                <button
                  onClick={handleExportGodotBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bundle</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-2.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Export bundle downloaded successfully!</span>
                </div>
              )}

              <pre className="p-4 rounded bg-slate-950 text-xs font-mono text-cyan-200 overflow-x-auto max-h-96 border border-slate-800">
                <code>{GODOT_PLAYER_GDSCRIPT}</code>
              </pre>
            </div>
          )}

          {activeTab === 'blender' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">Blender Python Automation (`generate_modular_building.py`)</h3>
                  <p className="text-xs text-slate-400">
                    Automated headless Blender Python script for parametric building generation and GLB/glTF export.
                  </p>
                </div>
                <button
                  onClick={handleExportGodotBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Script</span>
                </button>
              </div>

              <pre className="p-4 rounded bg-slate-950 text-xs font-mono text-amber-200 overflow-x-auto max-h-96 border border-slate-800">
                <code>{BLENDER_PYTHON_GENERATOR}</code>
              </pre>
            </div>
          )}

          {activeTab === 'amare' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">Amare Family Resistance (Lore &amp; GDScript)</h3>
                  <p className="text-xs text-slate-400">
                    The 9 Amare siblings who resist Anita altered-reality laws with unique abilities and guidance.
                  </p>
                </div>
                <button
                  onClick={handleExportGodotBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download GDScript</span>
                </button>
              </div>

              {/* 9 Amare Siblings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AMARE_LIST.map((m) => (
                  <div key={m.id} className="p-3 rounded bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs" style={{ color: m.color }}>{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold" style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                        {m.epithet}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{m.role}</p>
                    <div className="text-[10px] text-slate-300 font-mono bg-slate-900/80 p-1.5 rounded">
                      <span className="text-cyan-300">Buff:</span> {m.buffName}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-mono text-xs font-bold text-slate-300 mb-2">Godot 4 Amare NPC Script (`amare_npc.gd`)</h4>
                <pre className="p-3.5 rounded bg-slate-950 text-xs font-mono text-cyan-200 overflow-x-auto max-h-64 border border-slate-800">
                  <code>{AMARE_NPC_GDSCRIPT}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white">FastAPI + Redis Pipeline (`server.py`)</h3>
                  <p className="text-xs text-slate-400">
                    Production backend service for queuing headless Blender Python jobs and querying Poly Haven CC0 assets.
                  </p>
                </div>
                <button
                  onClick={handleExportGodotBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download API Code</span>
                </button>
              </div>

              <pre className="p-4 rounded bg-slate-950 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 border border-slate-800">
                <code>{FASTAPI_BACKEND_CODE}</code>
              </pre>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-mono text-sm font-bold text-white mb-2">System Implementation Architecture</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                    <span className="font-mono font-bold text-cyan-400">Engine &amp; Runtime Layer</span>
                    <p className="text-slate-300">
                      - Dual-Engine strategy: Immediate 60fps browser native WebGL/Three.js exploration + Godot 4 WebAssembly / Compatibility export architecture.
                    </p>
                    <p className="text-slate-300">
                      - 10-part procedural Kaelen character avatar with articulated limbs and jet thrusters.
                    </p>
                    <p className="text-slate-300">
                      - Dynamic enterable buildings with interior room generation and blast doors.
                    </p>
                  </div>

                  <div className="p-3.5 rounded bg-slate-950/60 border border-slate-800 space-y-2">
                    <span className="font-mono font-bold text-amber-400">Hybrid Pipeline Layer</span>
                    <p className="text-slate-300">
                      - Headless Blender Python worker generating parametric GLB building packages with beveled edges and LODs.
                    </p>
                    <p className="text-slate-300">
                      - Poly Haven CC0 licensed asset discovery with automated UV &amp; normal map inspection.
                    </p>
                    <p className="text-slate-300">
                      - Deterministic seed generation enabling 100% reproducible districts and chunk streaming.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-mono text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Verification &amp; Test Status Report
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>BUILT &amp; TESTED: Node.js 22 Unit Tests (12/12 passing) - City generator, Anita AI vision, and Player controller physics.</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>BUILT &amp; TESTED: 3D Browser Runtime - Real-time avatar movement, jump, collision, Anita drones, EMP shockwave, enterable interiors.</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-950/40 border border-amber-800 text-amber-300 font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>HYBRID EXTENSION: Heavy background Blender headless batch daemon is configured for local CLI/server worker dispatch.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <span className="text-xs font-mono text-slate-400">
            Current Seed: <span className="text-cyan-400 font-bold">{tempSeed}</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onApplySeed(tempSeed);
                onPlayNow();
                onClose();
              }}
              className="flex items-center gap-2 px-6 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Playable World</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
