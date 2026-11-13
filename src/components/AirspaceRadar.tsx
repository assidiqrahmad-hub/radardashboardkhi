import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Star,
  Crosshair,
  Radio,
  X,
  Tag
} from 'lucide-react';
import { Flight } from '../types/flight';
import { KARACHI_COORDS, AIRPORT_COORDS } from '../services/clientScheduleFallback';

interface AirspaceRadarProps {
  flights: Flight[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
  onBackToBoards?: () => void;
  watchlist?: string[];
  onToggleWatchlist?: (flightId: string) => void;
}

type MapTheme = 'dark' | 'terrain' | 'satellite';

const TILE_LAYERS: Record<MapTheme, { url: string; attribution: string; label: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    label: 'FR24 Dark'
  },
  terrain: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    label: 'Aviation Map'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    label: 'Satellite'
  }
};

// Compute curved great-circle / smooth polyline points between two coordinates
function buildRouteArc(lat1: number, lng1: number, lat2: number, lng2: number, segments = 40): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    // Slight realistic curve for visual clarity on Mercator projection
    const dist = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    const arcLift = Math.sin(t * Math.PI) * Math.min(2.5, dist * 0.08);
    points.push([lat + arcLift, lng]);
  }
  return points;
}

export const AirspaceRadar: React.FC<AirspaceRadarProps> = ({
  flights,
  selectedFlight,
  onSelectFlight,
  onBackToBoards,
  watchlist = [],
  onToggleWatchlist
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const rangeLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'arrivals' | 'departures'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(7);

  // Resolve airport coords safely
  const getAirportCoords = (code: string) => {
    const c = (code || '').toUpperCase();
    return AIRPORT_COORDS[c] || KARACHI_COORDS;
  };

  // Resolve effective radar coordinates for any flight (even if parked at KHI or en route)
  const getEffectiveTelemetry = (flight: Flight) => {
    const orig = getAirportCoords(flight.origin.code);
    const dest = getAirportCoords(flight.destination.code);
    const hasCoords =
      flight.telemetry &&
      typeof flight.telemetry.lat === 'number' &&
      typeof flight.telemetry.lng === 'number' &&
      flight.telemetry.lat !== 0 &&
      flight.telemetry.lng !== 0;

    if (hasCoords) {
      return {
        lat: flight.telemetry.lat,
        lng: flight.telemetry.lng,
        heading: flight.telemetry.heading || 0,
        altitudeFt: flight.telemetry.altitudeFt || 0,
        groundSpeedKnots: flight.telemetry.groundSpeedKnots || 0
      };
    }

    // Fallback: position at Karachi apron or along route
    const progress = flight.telemetry?.progressPct ?? 0;
    const t = Math.max(0, Math.min(1, progress / 100));
    const lat = orig.lat + (dest.lat - orig.lat) * t;
    const lng = orig.lng + (dest.lng - orig.lng) * t;
    return {
      lat: lat || KARACHI_COORDS.lat,
      lng: lng || KARACHI_COORDS.lng,
      heading: flight.telemetry?.heading || (flight.type === 'departure' ? 250 : 70),
      altitudeFt: flight.telemetry?.altitudeFt || 0,
      groundSpeedKnots: flight.telemetry?.groundSpeedKnots || 0
    };
  };

  // Visible aircraft on the radar map:
  // Always include all airborne/live flights PLUS any currently selectedFlight (so clicking "Radar" on any board flight shows it!)
  const visibleFlights = useMemo(() => {
    const list = flights.filter(f => {
      const isGroundVehicle =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.airline.code);
      if (isGroundVehicle) return false;

      if (selectedFlight && f.id === selectedFlight.id) return true;

      const isAirborne =
        f.isLiveRadar ||
        f.status === 'En Route' ||
        f.status === 'Approaching' ||
        f.status === 'Taxiing' ||
        f.status === 'Departed' ||
        (f.telemetry && f.telemetry.altitudeFt > 100);

      if (!isAirborne) return false;
      if (filterMode === 'arrivals') return f.type === 'arrival';
      if (filterMode === 'departures') return f.type === 'departure';
      return true;
    });
    return list;
  }, [flights, filterMode, selectedFlight]);

  // Keep fresh reference for marker click handlers
  const onSelectFlightRef = useRef(onSelectFlight);
  useEffect(() => {
    onSelectFlightRef.current = onSelectFlight;
  }, [onSelectFlight]);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [KARACHI_COORDS.lat, KARACHI_COORDS.lng],
      zoom: 7,
      minZoom: 3,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: true
    });

    const tileConfig = TILE_LAYERS[mapTheme];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 18
    }).addTo(map);

    const rangeLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    rangeLayerRef.current = rangeLayer;
    routeLayerRef.current = routeLayer;
    markersLayerRef.current = markersLayer;

    // Ensure Leaflet measures container properly after initial render
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      rangeLayerRef.current = null;
    };
  }, []);

  // Re-measure map when toggling fullscreen
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [isFullscreen]);

  // 2. Switch map tile theme dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_LAYERS[mapTheme];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 18
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [mapTheme]);

  // 3. Draw Karachi Airport (OPKC) Runways & Geodesic Range Rings
  useEffect(() => {
    const rangeLayer = rangeLayerRef.current;
    if (!rangeLayer) return;
    rangeLayer.clearLayers();

    if (showRangeRings) {
      const ringsNm = [50, 100, 150, 250];
      ringsNm.forEach((nm, idx) => {
        L.circle([KARACHI_COORDS.lat, KARACHI_COORDS.lng], {
          radius: nm * 1852, // 1 NM = 1852 meters
          color: mapTheme === 'terrain' ? '#0284c7' : '#38bdf8',
          weight: idx === 3 ? 1.5 : 1,
          opacity: idx === 3 ? 0.45 : 0.25,
          dashArray: idx % 2 === 0 ? '4 6' : undefined,
          fill: false,
          interactive: false
        }).addTo(rangeLayer);
      });
    }

    // OPKC Runway 25L/07R & 25R/07L visualization
    L.polyline(
      [
        [24.9005, 67.1435],
        [24.9125, 67.1780]
      ],
      { color: '#fbbf24', weight: 3, opacity: 0.9, interactive: false }
    ).addTo(rangeLayer);

    L.polyline(
      [
        [24.8975, 67.1450],
        [24.9090, 67.1775]
      ],
      { color: '#38bdf8', weight: 2.5, opacity: 0.8, interactive: false }
    ).addTo(rangeLayer);

    const airportIcon = L.divIcon({
      className: 'opkc-airport-badge',
      html: `<div style="transform: translate(-50%, 14px); white-space: nowrap; background: rgba(15, 23, 42, 0.9); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5); padding: 2px 7px; border-radius: 5px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">OPKC · Karachi</div>`,
      iconSize: [0, 0]
    });
    L.marker([KARACHI_COORDS.lat, KARACHI_COORDS.lng], { icon: airportIcon, interactive: false }).addTo(rangeLayer);
  }, [showRangeRings, mapTheme]);

  // 4. Focus map & draw Flightradar24-style Route Arc when selectedFlight changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();
    if (!selectedFlight) return;

    const orig = getAirportCoords(selectedFlight.origin.code);
    const dest = getAirportCoords(selectedFlight.destination.code);
    const current = getEffectiveTelemetry(selectedFlight);

    // Draw planned full route (dashed slate/cyan) and flown segment (bright FR24 gold/amber)
    if (orig.lat !== dest.lat || orig.lng !== dest.lng) {
      const fullArc = buildRouteArc(orig.lat, orig.lng, dest.lat, dest.lng, 48);
      L.polyline(fullArc, {
        color: '#94a3b8',
        weight: 2,
        opacity: 0.55,
        dashArray: '6 6',
        interactive: false
      }).addTo(routeLayer);

      // Flown segment from Origin to current aircraft position
      const flownArc = buildRouteArc(orig.lat, orig.lng, current.lat, current.lng, 28);
      L.polyline(flownArc, {
        color: '#fbbf24',
        weight: 3,
        opacity: 0.95,
        interactive: false
      }).addTo(routeLayer);

      // Remaining track from current aircraft position to Destination
      const remArc = buildRouteArc(current.lat, current.lng, dest.lat, dest.lng, 28);
      L.polyline(remArc, {
        color: '#38bdf8',
        weight: 2.5,
        opacity: 0.8,
        dashArray: '5 5',
        interactive: false
      }).addTo(routeLayer);

      // Origin airport pin
      const origPin = L.divIcon({
        className: 'route-airport-pin',
        html: `<div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
          <div style="width: 10px; height: 10px; border-radius: 999px; background: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(16,185,129,0.8);"></div>
          <div style="margin-top: 3px; background: rgba(15,23,42,0.92); color: #f8fafc; border: 1px solid #334155; padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; white-space: nowrap;">${selectedFlight.origin.code} · ${selectedFlight.origin.city}</div>
        </div>`,
        iconSize: [0, 0]
      });
      L.marker([orig.lat, orig.lng], { icon: origPin, interactive: false }).addTo(routeLayer);

      // Destination airport pin
      const destPin = L.divIcon({
        className: 'route-airport-pin',
        html: `<div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
          <div style="width: 10px; height: 10px; border-radius: 999px; background: #fbbf24; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(251,191,36,0.8);"></div>
          <div style="margin-top: 3px; background: rgba(15,23,42,0.92); color: #fde68a; border: 1px solid rgba(251,191,36,0.5); padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; white-space: nowrap;">${selectedFlight.destination.code} · ${selectedFlight.destination.city}</div>
        </div>`,
        iconSize: [0, 0]
      });
      L.marker([dest.lat, dest.lng], { icon: destPin, interactive: false }).addTo(routeLayer);
    }

    // Center smoothly on the selected aircraft so it's immediately visible in FR24 map style
    map.flyTo([current.lat, current.lng], Math.max(map.getZoom(), 7), {
      duration: 0.7
    });
  }, [selectedFlight?.id]);

  // 5. Render Aircraft Markers with Full Airline Name + Flight Number
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    visibleFlights.forEach(flight => {
      const tel = getEffectiveTelemetry(flight);
      const isSelected = selectedFlight?.id === flight.id;
      const isArrival = flight.type === 'arrival';

      // Flightradar24 iconic colors: Gold/Yellow when selected, Cyan for inbound, Emerald for outbound
      const planeColor = isSelected ? '#fbbf24' : isArrival ? '#22d3ee' : '#34d399';
      const planeStroke = isSelected ? '#78350f' : '#0f172a';
      const size = isSelected ? 34 : 26;

      // Clean HTML escape for airline name & flight number
      const safeFlightNum = String(flight.flightNumber || '').replace(/[<>&"]/g, '');
      const safeAirlineName = String(flight.airline?.name || flight.airline?.code || '').replace(/[<>&"]/g, '');
      const altLabel = tel.altitudeFt > 0 ? `FL${Math.round(tel.altitudeFt / 100)}` : flight.status;

      const labelHtml = showLabels
        ? `<div style="
            position: absolute;
            left: ${size / 2 + 6}px;
            top: -10px;
            background: ${isSelected ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.88)'};
            border: 1.5px solid ${isSelected ? '#fbbf24' : 'rgba(100, 116, 139, 0.65)'};
            border-radius: 6px;
            padding: 3px 7px;
            white-space: nowrap;
            pointer-events: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
            line-height: 1.25;
          ">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: ${isSelected ? '#fbbf24' : '#ffffff'}; font-family: ui-monospace, monospace; font-weight: 800; font-size: 11px;">${safeFlightNum}</span>
              <span style="color: ${planeColor}; font-family: ui-monospace, monospace; font-weight: 700; font-size: 10px;">${altLabel}</span>
            </div>
            <div style="color: #e2e8f0; font-family: system-ui, sans-serif; font-weight: 600; font-size: 10px; margin-top: 1px;">
              ${safeAirlineName}
            </div>
          </div>`
        : '';

      const haloHtml = isSelected
        ? `<div style="
            position: absolute;
            left: -6px;
            top: -6px;
            width: ${size + 12}px;
            height: ${size + 12}px;
            border-radius: 999px;
            border: 2px solid #fbbf24;
            background: rgba(251, 191, 36, 0.16);
            box-shadow: 0 0 18px rgba(251, 191, 36, 0.55);
          "></div>`
        : '';

      const planeSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(${tel.heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7)); display: block;">
        <path d="M12 2L14.2 8.5L21 11.5V13.5L14.2 12L13.5 18L16.5 20V21.5L12 20.5L7.5 21.5V20L10.5 18L9.8 12L3 13.5V11.5L9.8 8.5L12 2Z" fill="${planeColor}" stroke="${planeStroke}" stroke-width="1.1" stroke-linejoin="round"/>
      </svg>`;

      const icon = L.divIcon({
        className: 'fr24-aircraft-marker',
        html: `<div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
          ${haloHtml}
          ${planeSvg}
          ${labelHtml}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([tel.lat, tel.lng], {
        icon,
        zIndexOffset: isSelected ? 1000 : 100
      });

      marker.on('click', () => {
        onSelectFlightRef.current(flight);
      });

      marker.addTo(markersLayer);
    });
  }, [visibleFlights, selectedFlight?.id, showLabels]);

  const handleFitRoute = () => {
    const map = mapInstanceRef.current;
    if (!map || !selectedFlight) return;
    const orig = getAirportCoords(selectedFlight.origin.code);
    const dest = getAirportCoords(selectedFlight.destination.code);
    const bounds = L.latLngBounds([
      [orig.lat, orig.lng],
      [dest.lat, dest.lng]
    ]);
    map.fitBounds(bounds.pad(0.25), { animate: true });
  };

  const handleCenterKarachi = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([KARACHI_COORDS.lat, KARACHI_COORDS.lng], 7, { duration: 0.6 });
  };

  const selectedTelemetry = selectedFlight ? getEffectiveTelemetry(selectedFlight) : null;
  const isSelectedWatchlisted = selectedFlight ? watchlist.includes(selectedFlight.id) : false;

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900 flex flex-col'
          : 'rounded-2xl border border-slate-700 bg-slate-850 overflow-hidden shadow-2xl'
      }`}
    >
      {/* Top Flightradar24-style Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          {onBackToBoards && (
            <button
              onClick={onBackToBoards}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold border border-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Flight Boards</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Live Airspace Radar Map (OPKC / Karachi FIR)
              </h2>
              <span className="hidden sm:inline-block text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                {visibleFlights.length} Aircraft on Map
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Interactive Flightradar24-style live map showing full airline names, flight numbers, and real-time vectors
            </p>
          </div>
        </div>

        {/* Filter, Map Style & HUD Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Inbound / Outbound / All */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              All ({visibleFlights.length})
            </button>
            <button
              onClick={() => setFilterMode('arrivals')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                filterMode === 'arrivals' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Inbound
            </button>
            <button
              onClick={() => setFilterMode('departures')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                filterMode === 'departures' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Outbound
            </button>
          </div>

          {/* Map Tile Style Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700 text-xs">
            {(['dark', 'terrain', 'satellite'] as MapTheme[]).map(theme => (
              <button
                key={theme}
                onClick={() => setMapTheme(theme)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  mapTheme === theme ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {TILE_LAYERS[theme].label}
              </button>
            ))}
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
              showLabels
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title="Show airline names & flight numbers on map"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          {/* Toggle Range Rings */}
          <button
            onClick={() => setShowRangeRings(!showRangeRings)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
              showRangeRings
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title="Toggle 50–250 NM Karachi radar range rings"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rings</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen Map' : 'Fullscreen Radar Map'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1' : 'h-[580px] md:h-[640px]'} bg-slate-900`}>
        {/* Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Right HUD: Zoom & Center Karachi Controls (Flightradar24 style) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
          <div className="flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-xl">
            <button
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="p-2.5 text-slate-200 hover:text-white hover:bg-slate-800 border-b border-slate-700 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="py-1 text-center text-[10px] font-mono font-bold text-amber-300 bg-slate-950/60">
              Z{zoomLevel}
            </div>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="p-2.5 text-slate-200 hover:text-white hover:bg-slate-800 border-t border-slate-700 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCenterKarachi}
            className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-cyan-300 hover:text-white hover:bg-slate-800 shadow-xl cursor-pointer"
            title="Center on Karachi Airport (OPKC)"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Left HUD: Flightradar24-style Selected Flight Info Card */}
        {selectedFlight && selectedTelemetry && (
          <div className="absolute top-4 left-4 bottom-4 sm:bottom-auto z-20 w-[calc(100%-2rem)] sm:w-96 max-h-[calc(100%-2rem)] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-2xl shadow-2xl flex flex-col">
            {/* FR24 Iconic Amber Header Strip */}
            <div className="px-4 py-3 bg-amber-500 text-slate-950 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg tracking-tight">
                    {selectedFlight.flightNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950/15 text-slate-950 font-mono text-[11px] font-extrabold uppercase">
                    {selectedFlight.airline.icao || selectedFlight.airline.code}
                  </span>
                </div>
                <p className="text-xs font-extrabold truncate">
                  {selectedFlight.airline.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onToggleWatchlist && (
                  <button
                    onClick={() => onToggleWatchlist(selectedFlight.id)}
                    title={isSelectedWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                    className="p-1.5 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 transition-colors cursor-pointer"
                  >
                    <Star className={`w-4 h-4 ${isSelectedWatchlisted ? 'fill-slate-950' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => onSelectFlight(null)}
                  title="Close Flight Panel"
                  className="p-1.5 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Route Banner */}
            <div className="p-4 border-b border-slate-700/80 bg-slate-850/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-2xl font-mono font-extrabold text-white block leading-none">
                    {selectedFlight.origin.code}
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block">
                    {selectedFlight.origin.city}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    STD {new Date(selectedFlight.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>

                <div className="flex-1 px-2 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-amber-300 mb-1">
                    {selectedFlight.status}
                  </span>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full relative overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.max(8, selectedFlight.telemetry?.progressPct ?? 50)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 mt-1">
                    {selectedFlight.telemetry?.distanceRemainingNm ?? 0} NM rem
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-mono font-extrabold text-amber-300 block leading-none">
                    {selectedFlight.destination.code}
                  </span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block">
                    {selectedFlight.destination.city}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-300">
                    EST {new Date(selectedFlight.estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFitRoute}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold border border-slate-600 transition-colors cursor-pointer"
                >
                  Fit Entire Route
                </button>
                <button
                  onClick={() =>
                    mapInstanceRef.current?.flyTo([selectedTelemetry.lat, selectedTelemetry.lng], 9, { duration: 0.6 })
                  }
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer"
                >
                  Follow Aircraft
                </button>
              </div>
            </div>

            {/* Live Aircraft & ADS-B Telemetry Metrics */}
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Calibrated Altitude</span>
                  <span className="text-base font-mono font-bold text-cyan-300 tabular-nums">
                    {selectedTelemetry.altitudeFt.toLocaleString()} ft
                  </span>
                  {selectedFlight.telemetry?.altitudeGeomFt && (
                    <span className="text-[10px] font-mono text-slate-400 block">
                      GPS Alt: {selectedFlight.telemetry.altitudeGeomFt.toLocaleString()} ft
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Ground Speed</span>
                  <span className="text-base font-mono font-bold text-white tabular-nums">
                    {selectedTelemetry.groundSpeedKnots} kts
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    {Math.round(selectedTelemetry.groundSpeedKnots * 1.852)} km/h
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Track / Heading</span>
                  <span className="text-sm font-mono font-bold text-white tabular-nums">
                    {selectedTelemetry.heading}°
                  </span>
                  {selectedFlight.telemetry?.verticalRateFpm !== undefined && (
                    <span className="text-[10px] font-mono text-emerald-300 block">
                      V/S: {selectedFlight.telemetry.verticalRateFpm > 0 ? '+' : ''}
                      {selectedFlight.telemetry.verticalRateFpm} fpm
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Squawk / Mode-S</span>
                  <span className="text-sm font-mono font-bold text-amber-300">
                    SQK {selectedFlight.telemetry?.squawk || selectedFlight.squawkCode || '1200'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Hex: {selectedFlight.telemetry?.hex?.toUpperCase() || 'LIVE'}
                  </span>
                </div>
              </div>

              {/* Aircraft Details */}
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aircraft Type:</span>
                  <span className="text-white font-bold">{selectedFlight.aircraft.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration:</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {selectedFlight.aircraft.registration || 'Awaiting ADS-B'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-200 font-mono">
                    {selectedTelemetry.lat.toFixed(4)}°N, {selectedTelemetry.lng.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Radar Feed:</span>
                  <span className="text-emerald-300 font-mono font-semibold text-[11px]">
                    {selectedFlight.liveDataSource || 'adsb.fi + KHI Radar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Aircraft Quick-Picker Bar (when no flight panel covers bottom or on wide desktop) */}
        <div className="hidden md:flex absolute bottom-4 right-4 z-20 max-w-xl items-center gap-1.5 overflow-x-auto bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-1.5 shadow-xl">
          <span className="text-[11px] font-bold text-slate-300 px-2 shrink-0 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Live Targets:
          </span>
          {visibleFlights.slice(0, 8).map(f => {
            const active = selectedFlight?.id === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFlight(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={`${f.flightNumber} · ${f.airline.name}`}
              >
                {f.flightNumber} · {f.airline.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
