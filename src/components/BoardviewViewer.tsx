import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Search,
  Maximize2,
  Minimize2,
  Info,
  Activity,
  Cpu,
  Target,
  FileText
} from 'lucide-react';
import { Board, BoardComponent, BoardNet, TestPoint } from '../types';

interface BoardviewViewerProps {
  board: Board;
  components: BoardComponent[];
  nets: BoardNet[];
  testPoints: TestPoint[];
  onOpenSchematic?: () => void;
}

export const BoardviewViewer: React.FC<BoardviewViewerProps> = ({
  board,
  components,
  nets,
  testPoints,
  onOpenSchematic,
}) => {
  const [layer, setLayer] = useState<'top' | 'bottom'>('top');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<BoardComponent | null>(null);
  const [highlightedNet, setHighlightedNet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'components' | 'nets' | 'testpoints'>('info');

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items by current layer
  const layerComponents = components.filter((c) => c.layer === layer);
  const layerTestPoints = testPoints.filter((tp) => tp.layer === layer);

  // Filtered lists for sidebar
  const filteredComponents = components.filter((c) =>
    c.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.partNumber && c.partNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.value && c.value.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredNets = nets.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.15;
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + zoomFactor, 4.5));
    } else {
      setZoom((prev) => Math.max(prev - zoomFactor, 0.4));
    }
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const selectComponent = (comp: BoardComponent) => {
    setSelectedComponent(comp);
    if (comp.layer !== layer) {
      setLayer(comp.layer);
    }
    // If component has a first connected net, highlight it
    if (comp.connectedNets && comp.connectedNets.length > 0) {
      setHighlightedNet(comp.connectedNets[0]);
    }
    setActiveTab('info');
  };

  const selectNet = (netName: string) => {
    setHighlightedNet(netName);
    setActiveTab('info');
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col ${
        isFullscreen ? 'h-screen rounded-none' : 'h-[750px]'
      }`}
    >
      {/* Top Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 backdrop-blur-md">
        {/* Layer selector */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setLayer('top')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                layer === 'top'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الوجه العلوي (Top Layer)
            </button>
            <button
              onClick={() => setLayer('bottom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                layer === 'bottom'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الوجه السفلي (Bottom Layer)
            </button>
          </div>

          <span className="hidden sm:inline-block text-xs font-mono text-slate-400 border-r border-slate-800 pr-3 mr-1">
            {board.boardNumber} {board.revision ? `Rev: ${board.revision}` : ''}
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4.5))}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono font-medium text-slate-400 px-1 min-w-[45px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.4))}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="إعادة ضبط الرؤية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Schematic Jump button */}
        {board.hasSchematic && onOpenSchematic && (
          <button
            onClick={onOpenSchematic}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>عرض المخطط (Schematic)</span>
          </button>
        )}
      </div>

      {/* Main Workspace (Canvas Area + Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Interactive Canvas */}
        <div
          className="flex-1 relative overflow-hidden bg-radial from-slate-900 to-slate-950 cursor-grab active:cursor-grabbing select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid Blueprint Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Interactive PCB Board Container */}
          <div
            className="absolute transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              left: '50%',
              top: '50%',
              marginLeft: '-350px',
              marginTop: '-250px',
              width: '700px',
              height: '500px',
            }}
          >
            {/* PCB Board Outline */}
            <div className="w-full h-full rounded-2xl bg-emerald-950/70 border-4 border-emerald-700/80 shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden">
              {/* Copper Ground Plane Trace Simulation */}
              <div
                className="absolute inset-2 rounded-xl opacity-30 pointer-events-none border border-emerald-500/40"
                style={{
                  backgroundImage: `radial-gradient(circle, #059669 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Board Label */}
              <div className="absolute top-4 left-4 z-0 pointer-events-none opacity-40 font-mono text-xs text-emerald-300">
                <p className="font-bold">{board.boardNumber}</p>
                <p>LAYER: {layer.toUpperCase()} - {board.modelName}</p>
              </div>

              {/* Highlighted Net Traces */}
              {highlightedNet && (
                <div className="absolute inset-0 pointer-events-none z-0">
                  <svg className="w-full h-full">
                    {layerComponents
                      .filter((c) => c.connectedNets?.includes(highlightedNet))
                      .map((c, i, arr) => {
                        if (i === 0) return null;
                        const prev = arr[i - 1];
                        return (
                          <line
                            key={`net-line-${i}`}
                            x1={`${prev.x}%`}
                            y1={`${prev.y}%`}
                            x2={`${c.x}%`}
                            y2={`${c.y}%`}
                            stroke="#f43f5e"
                            strokeWidth="3"
                            strokeDasharray="4 2"
                            className="animate-pulse"
                          />
                        );
                      })}
                  </svg>
                </div>
              )}

              {/* Board Components */}
              {layerComponents.map((comp) => {
                const isSelected = selectedComponent?.id === comp.id;
                const isNetConnected =
                  highlightedNet && comp.connectedNets?.includes(highlightedNet);

                let compColor = 'bg-slate-700 border-slate-500 text-slate-200';
                if (comp.type === 'IC') compColor = 'bg-indigo-900/90 border-indigo-500 text-indigo-200';
                if (comp.type === 'Capacitor') compColor = 'bg-amber-900/80 border-amber-500 text-amber-200';
                if (comp.type === 'Resistor') compColor = 'bg-cyan-900/80 border-cyan-500 text-cyan-200';
                if (comp.type === 'Connector') compColor = 'bg-emerald-900/80 border-emerald-500 text-emerald-200';

                return (
                  <div
                    key={comp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectComponent(comp);
                    }}
                    style={{
                      left: `${comp.x}%`,
                      top: `${comp.y}%`,
                      width: `${comp.width || (comp.type === 'IC' ? 16 : 8)}%`,
                      height: `${comp.height || (comp.type === 'IC' ? 16 : 8)}%`,
                      transform: `translate(-50%, -50%) rotate(${comp.rotation || 0}deg)`,
                    }}
                    className={`absolute rounded cursor-pointer border flex flex-col items-center justify-center transition-all p-0.5 z-10 ${compColor} ${
                      isSelected
                        ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-950 scale-110 z-30 shadow-xl'
                        : isNetConnected
                        ? 'ring-2 ring-rose-500 scale-105 z-20'
                        : 'hover:border-white hover:scale-105'
                    }`}
                  >
                    <span className="text-[10px] font-bold font-mono tracking-tighter truncate max-w-full">
                      {comp.reference}
                    </span>
                    {comp.type === 'IC' && (
                      <span className="text-[8px] opacity-75 font-mono truncate max-w-full">
                        {comp.partNumber || comp.value}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Test Points */}
              {layerTestPoints.map((tp) => {
                const isNetConnected = highlightedNet && tp.netName === highlightedNet;
                return (
                  <div
                    key={tp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNet(tp.netName);
                    }}
                    style={{
                      left: `${tp.x}%`,
                      top: `${tp.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute w-3.5 h-3.5 rounded-full cursor-pointer border-2 transition z-15 ${
                      isNetConnected
                        ? 'bg-rose-500 border-white scale-125 ring-2 ring-rose-400'
                        : 'bg-amber-400 border-amber-600 hover:scale-125'
                    }`}
                    title={`نقطة فحص ${tp.reference} (${tp.netName})`}
                  />
                );
              })}

              {/* Fallback if no components are in database yet */}
              {layerComponents.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 pointer-events-none">
                  <Cpu className="w-12 h-12 text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">
                    لا تتوفر قطع مدخلة على هذا الوجه ({layer.toUpperCase()}) بعد
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    يمكن للمسؤول (Admin) إضافة المكونات والمسارات ونقاط الفحص الخاصة بهذه اللوحة من لوحة التحكم.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick HUD indicator */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {layerComponents.length} مكون في هذا الوجه
            </span>
            <span>•</span>
            <span>عجلة الماوس للتقريب / اسحب للتحريك</span>
          </div>
        </div>

        {/* Right Info / Navigation Sidebar */}
        <div className="w-80 sm:w-96 border-r border-slate-800 bg-slate-900 flex flex-col z-20">
          {/* Sidebar Tabs */}
          <div className="border-b border-slate-800 flex items-center bg-slate-950 p-1">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'info'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>المعلومات</span>
            </button>
            <button
              onClick={() => setActiveTab('components')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'components'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>القطع ({components.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('nets')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'nets'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>المسارات ({nets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('testpoints')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'testpoints'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>TP ({testPoints.length})</span>
            </button>
          </div>

          {/* Search bar inside sidebar */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن IC، قطعة، مسار، TP..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: INFO */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                {selectedComponent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-mono font-bold text-emerald-400">
                        {selectedComponent.reference}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        {selectedComponent.type}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">القيمة / الموديل:</span>
                        <span className="font-mono text-slate-200">
                          {selectedComponent.value || selectedComponent.partNumber || 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الوجه (Layer):</span>
                        <span className="font-mono text-slate-200">
                          {selectedComponent.layer.toUpperCase()}
                        </span>
                      </div>
                      {selectedComponent.description && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <span className="text-slate-400 block mb-1">الوصف الفني:</span>
                          <p className="text-slate-300">{selectedComponent.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Connected Nets */}
                    {selectedComponent.connectedNets && selectedComponent.connectedNets.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-400" />
                          المسارات المتصلة (Connected Nets)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedComponent.connectedNets.map((net) => (
                            <button
                              key={net}
                              onClick={() => selectNet(net)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-mono border transition ${
                                highlightedNet === net
                                  ? 'bg-rose-500 text-white border-rose-400'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-rose-500/50'
                              }`}
                            >
                              {net}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedComponent(null);
                        setHighlightedNet(null);
                      }}
                      className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                ) : highlightedNet ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-mono font-bold text-rose-400">
                        {highlightedNet}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                        Active Net
                      </span>
                    </div>

                    {/* Net Details (Voltage, Rail Type, Source) */}
                    {(() => {
                      const netObj = nets.find((n) => n.name === highlightedNet);
                      return (
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                          {netObj?.voltage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">الجهد الاسمي (Voltage):</span>
                              <span className="font-mono text-emerald-400 font-bold">{netObj.voltage}</span>
                            </div>
                          )}
                          {netObj?.type && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">نوع المسار (Rail):</span>
                              <span className="font-mono text-slate-200 uppercase">{netObj.type}</span>
                            </div>
                          )}
                          {netObj?.sourceComponent && (
                            <div className="pt-1.5 border-t border-slate-800/80">
                              <span className="text-slate-400 block mb-0.5">المصدر (Source Rail):</span>
                              <span className="font-mono text-slate-300 text-[11px]">{netObj.sourceComponent}</span>
                            </div>
                          )}
                          {netObj?.notes && (
                            <div className="pt-1.5 border-t border-slate-800/80">
                              <span className="text-slate-400 block mb-0.5">الملاحظات الهندسية:</span>
                              <p className="text-slate-300 text-[11px]">{netObj.notes}</p>
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-800/80">
                            <p className="text-slate-400 mb-1.5">
                              القطع المتصلة بهذا المسار (مظللة على البوردة):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {components
                                .filter((c) => c.connectedNets?.includes(highlightedNet))
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => selectComponent(c)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px]"
                                  >
                                    {c.reference}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setHighlightedNet(null)}
                      className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    >
                      إلغاء تظليل المسار
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Info className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">
                      اضغط على أي IC أو قطعة أو مسار على اللوحة لعرض تفاصيل التوصيلات والمواصفات الفنية هنا.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COMPONENTS LIST */}
            {activeTab === 'components' && (
              <div className="space-y-2">
                {filteredComponents.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">لا توجد قطع مطابقة للبحث</p>
                ) : (
                  filteredComponents.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectComponent(c)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        selectedComponent?.id === c.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{c.reference}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {c.value || c.partNumber || c.type}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                        {c.layer}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: NETS LIST */}
            {activeTab === 'nets' && (
              <div className="space-y-2">
                {filteredNets.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">لا توجد مسارات مطابقة للبحث</p>
                ) : (
                  filteredNets.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => selectNet(n.name)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        highlightedNet === n.name
                          ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <span className="font-mono font-bold truncate max-w-[170px]">{n.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {n.connectedComponents?.length || 0} قطع
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: TEST POINTS */}
            {activeTab === 'testpoints' && (
              <div className="space-y-2">
                {testPoints.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">لا توجد نقاط فحص مضافة</p>
                ) : (
                  testPoints.map((tp) => (
                    <div
                      key={tp.id}
                      onClick={() => {
                        selectNet(tp.netName);
                        if (tp.layer !== layer) setLayer(tp.layer);
                      }}
                      className="p-2.5 rounded-xl border bg-slate-950 border-slate-800 hover:border-amber-500/50 text-xs cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-amber-400">{tp.reference}</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tp.netName}</p>
                      </div>
                      <div className="text-left font-mono text-[10px] text-slate-400">
                        {tp.expectedVoltage && <div>{tp.expectedVoltage}</div>}
                        {tp.expectedDiodeValue && <div className="text-emerald-400">{tp.expectedDiodeValue}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
