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
  Tag,
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Square,
  ExternalLink,
  AlertCircle
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

interface TileLayerConfig {
  url: string;
  overlayUrl?: string;
  attribution: string;
  label: string;
  maxZoom?: number;
}

// 100% Free, Zero-API-Key Map Tile Providers (No CARTO / No Mapbox / No API key watermarks)
const TILE_LAYERS: Record<MapTheme, TileLayerConfig> = {
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    label: 'FR24 Dark',
    maxZoom: 16
  },
  terrain: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    label: 'Aviation Map',
    maxZoom: 18
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
    label: 'Satellite',
    maxZoom: 17
  }
};

const LIVEATC_PAGE_URL = 'https://www.liveatc.net/hlisten.php?mount=opkc&icao=opkc';
const LIVEATC_STREAM_URLS = [
  'https://d.liveatc.net/opkc',
  'https://s1-bos.liveatc.net/opkc',
  'https://s1-fmt2.liveatc.net/opkc'
];

const RADAR_MAX_NM = 500;

// Distance in nautical miles from OPKC (Karachi Jinnah International)
function distanceFromKhiNm(lat: number, lng: number): number {
  const dLat = (lat - KARACHI_COORDS.lat) * 60;
  const dLng = (lng - KARACHI_COORDS.lng) * 60 * Math.cos((KARACHI_COORDS.lat * Math.PI) / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

// Compute curved great-circle / smooth polyline points between two coordinates
function buildRouteArc(lat1: number, lng1: number, lat2: number, lng2: number, segments = 40): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
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
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const rangeLayerRef = useRef<L.LayerGroup | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'khi' | 'arrivals' | 'departures'>('all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(6);

  // LiveATC OPKC Stream State
  const [atcStatus, setAtcStatus] = useState<'idle' | 'connecting' | 'playing' | 'fallback'>('idle');
  const [atcVolume, setAtcVolume] = useState<number>(0.85);
  const [atcMuted, setAtcMuted] = useState<boolean>(false);
  const [atcStreamIdx, setAtcStreamIdx] = useState<number>(0);
  const [showLiveAtcEmbed, setShowLiveAtcEmbed] = useState<boolean>(false);
  const [atcNotice, setAtcNotice] = useState<string | null>(null);

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
        groundSpeedKnots: flight.telemetry.groundSpeedKnots || 0,
        distFromKhiNm: distanceFromKhiNm(flight.telemetry.lat, flight.telemetry.lng)
      };
    }

    const progress = flight.telemetry?.progressPct ?? 0;
    const t = Math.max(0, Math.min(1, progress / 100));
    const lat = orig.lat + (dest.lat - orig.lat) * t;
    const lng = orig.lng + (dest.lng - orig.lng) * t;
    const effLat = lat || KARACHI_COORDS.lat;
    const effLng = lng || KARACHI_COORDS.lng;
    return {
      lat: effLat,
      lng: effLng,
      heading: flight.telemetry?.heading || (flight.type === 'departure' ? 250 : 70),
      altitudeFt: flight.telemetry?.altitudeFt || 0,
      groundSpeedKnots: flight.telemetry?.groundSpeedKnots || 0,
      distFromKhiNm: distanceFromKhiNm(effLat, effLng)
    };
  };

  // Merge selectedFlight (if clicked from Flight Board) into radar list so it is always displayed
  const allRadarCandidates = useMemo(() => {
    const map = new Map<string, Flight>();
    flights.forEach(f => map.set(f.id, f));
    if (selectedFlight && !map.has(selectedFlight.id)) {
      map.set(selectedFlight.id, selectedFlight);
    }
    return Array.from(map.values());
  }, [flights, selectedFlight]);

  // Visible aircraft within 500 NM of Karachi (OPKC)
  const visibleFlights = useMemo(() => {
    return allRadarCandidates.filter(f => {
      const isGroundVehicle =
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.flightNumber) ||
        /^(SCOP|GND|GRND|CAR|TRUCK|SWEEP|TUG|OPS|FIRE|AMB|FOLLOW|MARSHAL|TEST|CALIB|VND|SAFETY|RDR)/i.test(f.airline.code);
      if (isGroundVehicle) return false;

      if (selectedFlight && f.id === selectedFlight.id) return true;

      const tel = getEffectiveTelemetry(f);
      const isKhiFlight = f.origin.code === 'KHI' || f.destination.code === 'KHI';
      const within500 = tel.distFromKhiNm <= RADAR_MAX_NM;

      const isAirborne =
        f.isLiveRadar ||
        f.status === 'En Route' ||
        f.status === 'Approaching' ||
        f.status === 'Taxiing' ||
        f.status === 'Departed' ||
        (f.telemetry && f.telemetry.altitudeFt > 100);

      if (!isAirborne) return false;
      if (!within500 && !isKhiFlight) return false;

      if (filterMode === 'khi') return isKhiFlight;
      if (filterMode === 'arrivals') return f.destination.code === 'KHI' || (!f.isOverflight && f.type === 'arrival');
      if (filterMode === 'departures') return f.origin.code === 'KHI' || (!f.isOverflight && f.type === 'departure');
      return true;
    });
  }, [allRadarCandidates, filterMode, selectedFlight]);

  const khiCount = useMemo(
    () =>
      allRadarCandidates.filter(
        f => (f.origin.code === 'KHI' || f.destination.code === 'KHI') && (f.isLiveRadar || ['En Route', 'Approaching', 'Taxiing', 'Departed'].includes(f.status))
      ).length,
    [allRadarCandidates]
  );

  // Sync HTML5 audio volume & mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = atcMuted ? 0 : atcVolume;
    }
  }, [atcVolume, atcMuted]);

  // Stop audio stream cleanly when unmounting Radar Mode
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleToggleAtcPlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (atcStatus === 'playing' || atcStatus === 'connecting') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setAtcStatus('idle');
      setAtcNotice(null);
      return;
    }

    setAtcNotice(null);
    setAtcStatus('connecting');
    setAtcStreamIdx(0);
    const url = `${LIVEATC_STREAM_URLS[0]}?nocache=${Date.now()}`;
    audio.src = url;
    audio.volume = atcMuted ? 0 : atcVolume;
    try {
      await audio.play();
    } catch {
      // onError handler will cycle fallback mounts or open LiveATC web player
    }
  };

  const handleAtcAudioError = () => {
    if (atcStatus === 'idle') return;
    const nextIdx = atcStreamIdx + 1;
    if (nextIdx < LIVEATC_STREAM_URLS.length && audioRef.current) {
      setAtcStreamIdx(nextIdx);
      audioRef.current.src = `${LIVEATC_STREAM_URLS[nextIdx]}?nocache=${Date.now()}`;
      audioRef.current.play().catch(() => {});
    } else {
      setAtcStatus('fallback');
      setShowLiveAtcEmbed(true);
      setAtcNotice('LiveATC requires their web player session for OPKC audio — loaded LiveATC Player below.');
    }
  };

  // Keep fresh reference for marker click handlers
  const onSelectFlightRef = useRef(onSelectFlight);
  useEffect(() => {
    onSelectFlightRef.current = onSelectFlight;
  }, [onSelectFlight]);

  // Helper to attach base + optional reference label tile layers (zero API key)
  const applyTileTheme = (map: L.Map, theme: MapTheme) => {
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (overlayTileLayerRef.current) {
      map.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }

    const cfg = TILE_LAYERS[theme];
    const baseLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom || 18,
      crossOrigin: true
    }).addTo(map);
    baseLayer.bringToBack();
    baseTileLayerRef.current = baseLayer;

    if (cfg.overlayUrl) {
      const refLayer = L.tileLayer(cfg.overlayUrl, {
        maxZoom: cfg.maxZoom || 18,
        opacity: 0.9,
        crossOrigin: true
      }).addTo(map);
      overlayTileLayerRef.current = refLayer;
    }
  };

  // 1. Initialize Leaflet Map once (Default zoom 6 frames full 500 NM around Karachi)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [KARACHI_COORDS.lat, KARACHI_COORDS.lng],
      zoom: 6,
      minZoom: 3,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: true
    });

    applyTileTheme(map, mapTheme);

    const rangeLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;
    rangeLayerRef.current = rangeLayer;
    routeLayerRef.current = routeLayer;
    markersLayerRef.current = markersLayer;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      baseTileLayerRef.current = null;
      overlayTileLayerRef.current = null;
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
    applyTileTheme(map, mapTheme);
  }, [mapTheme]);

  // 3. Draw Karachi Airport (OPKC) Runways & 100–500 NM Geodesic Range Rings
  useEffect(() => {
    const rangeLayer = rangeLayerRef.current;
    if (!rangeLayer) return;
    rangeLayer.clearLayers();

    if (showRangeRings) {
      const ringsNm = [100, 200, 300, 400, 500];
      ringsNm.forEach((nm, idx) => {
        const isOuter500 = nm === 500;
        L.circle([KARACHI_COORDS.lat, KARACHI_COORDS.lng], {
          radius: nm * 1852, // 1 NM = 1852 meters
          color: isOuter500 ? '#f59e0b' : mapTheme === 'terrain' ? '#0284c7' : '#38bdf8',
          weight: isOuter500 ? 1.8 : 1,
          opacity: isOuter500 ? 0.55 : 0.28,
          dashArray: isOuter500 ? '8 6' : idx % 2 === 0 ? '4 6' : undefined,
          fill: false,
          interactive: false
        }).addTo(rangeLayer);

        // Label key range rings (100 NM, 300 NM, 500 NM) at north meridian
        if (nm === 100 || nm === 300 || nm === 500) {
          const latNorth = KARACHI_COORDS.lat + nm / 60;
          const ringLabel = L.divIcon({
            className: 'radar-ring-label',
            html: `<div style="transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.85); color: ${isOuter500 ? '#fbbf24' : '#7dd3fc'}; border: 1px solid ${isOuter500 ? 'rgba(251,191,36,0.45)' : 'rgba(56,189,248,0.35)'}; padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; white-space: nowrap;">${nm} NM</div>`,
            iconSize: [0, 0]
          });
          L.marker([latNorth, KARACHI_COORDS.lng], { icon: ringLabel, interactive: false }).addTo(rangeLayer);
        }
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
      html: `<div style="transform: translate(-50%, 14px); white-space: nowrap; background: rgba(15, 23, 42, 0.92); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.55); padding: 2px 7px; border-radius: 5px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">OPKC · Karachi</div>`,
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

    if (
      selectedFlight.origin.code !== 'AIRSPACE' &&
      selectedFlight.destination.code !== 'AIRSPACE' &&
      (orig.lat !== dest.lat || orig.lng !== dest.lng)
    ) {
      const fullArc = buildRouteArc(orig.lat, orig.lng, dest.lat, dest.lng, 48);
      L.polyline(fullArc, {
        color: '#94a3b8',
        weight: 2,
        opacity: 0.55,
        dashArray: '6 6',
        interactive: false
      }).addTo(routeLayer);

      const flownArc = buildRouteArc(orig.lat, orig.lng, current.lat, current.lng, 28);
      L.polyline(flownArc, {
        color: '#fbbf24',
        weight: 3,
        opacity: 0.95,
        interactive: false
      }).addTo(routeLayer);

      const remArc = buildRouteArc(current.lat, current.lng, dest.lat, dest.lng, 28);
      L.polyline(remArc, {
        color: '#38bdf8',
        weight: 2.5,
        opacity: 0.8,
        dashArray: '5 5',
        interactive: false
      }).addTo(routeLayer);

      const origPin = L.divIcon({
        className: 'route-airport-pin',
        html: `<div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
          <div style="width: 10px; height: 10px; border-radius: 999px; background: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(16,185,129,0.8);"></div>
          <div style="margin-top: 3px; background: rgba(15,23,42,0.92); color: #f8fafc; border: 1px solid #334155; padding: 1px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; white-space: nowrap;">${selectedFlight.origin.code} · ${selectedFlight.origin.city}</div>
        </div>`,
        iconSize: [0, 0]
      });
      L.marker([orig.lat, orig.lng], { icon: origPin, interactive: false }).addTo(routeLayer);

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

    map.flyTo([current.lat, current.lng], Math.max(map.getZoom(), 7), {
      duration: 0.7
    });
  }, [selectedFlight?.id]);

  // 5. Render Aircraft Markers across 500 NM with Full Airline Name + Flight Number
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer) return;

    markersLayer.clearLayers();

    // Prioritize KHI traffic + nearest targets for always-visible labels when zoomed out across 500 NM
    let renderedLabelCount = 0;
    const maxLabelsAtZoom = zoomLevel >= 8 ? 300 : zoomLevel === 7 ? 120 : 45;

    visibleFlights.forEach(flight => {
      const tel = getEffectiveTelemetry(flight);
      const isSelected = selectedFlight?.id === flight.id;
      const isKhiFlight = flight.origin.code === 'KHI' || flight.destination.code === 'KHI';
      const isArrival = flight.destination.code === 'KHI' || (!flight.isOverflight && flight.type === 'arrival');

      // Color coding: Amber/Gold = Selected, Cyan = KHI Inbound, Emerald = KHI Outbound, Amber-Yellow = Regional 500 NM Transit
      const planeColor = isSelected
        ? '#fbbf24'
        : isKhiFlight
        ? isArrival
          ? '#22d3ee'
          : '#34d399'
        : '#facc15';
      const planeStroke = isSelected ? '#78350f' : '#0f172a';
      const size = isSelected ? 34 : isKhiFlight ? 26 : 21;

      const safeFlightNum = String(flight.flightNumber || '').replace(/[<>&"]/g, '');
      const safeAirlineName = String(flight.airline?.name || flight.airline?.code || '').replace(/[<>&"]/g, '');
      const altLabel = tel.altitudeFt > 0 ? `FL${Math.round(tel.altitudeFt / 100)}` : flight.status;

      const shouldShowInlineLabel =
        showLabels && (isSelected || isKhiFlight || renderedLabelCount < maxLabelsAtZoom);
      if (shouldShowInlineLabel && !isSelected && !isKhiFlight) {
        renderedLabelCount++;
      }

      const labelHtml = shouldShowInlineLabel
        ? `<div style="
            position: absolute;
            left: ${size / 2 + 6}px;
            top: -10px;
            background: ${isSelected ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.86)'};
            border: 1.5px solid ${isSelected ? '#fbbf24' : isKhiFlight ? 'rgba(56, 189, 248, 0.6)' : 'rgba(100, 116, 139, 0.55)'};
            border-radius: 6px;
            padding: 2px 6px;
            white-space: nowrap;
            pointer-events: auto;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45);
            line-height: 1.2;
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

      const planeSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(${tel.heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.75)); display: block;">
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
        zIndexOffset: isSelected ? 1000 : isKhiFlight ? 400 : 100
      });

      // Hover tooltip always shows full airline name + flight number + route + telemetry
      if (!shouldShowInlineLabel) {
        marker.bindTooltip(
          `<div style="font-family: system-ui, sans-serif; line-height: 1.3;">
            <strong style="font-family: ui-monospace, monospace;">${safeFlightNum}</strong> · ${altLabel}<br/>
            <span>${safeAirlineName}</span>
            ${flight.origin.code !== 'AIRSPACE' || flight.destination.code !== 'AIRSPACE' ? `<br/><span style="opacity:0.85;">${flight.origin.code} → ${flight.destination.code} (${tel.distFromKhiNm} NM)</span>` : ''}
          </div>`,
          { direction: 'top', offset: [0, -10], opacity: 0.95 }
        );
      }

      marker.on('click', () => {
        onSelectFlightRef.current(flight);
      });

      marker.addTo(markersLayer);
    });
  }, [visibleFlights, selectedFlight?.id, showLabels, zoomLevel]);

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
    map.flyTo([KARACHI_COORDS.lat, KARACHI_COORDS.lng], 6, { duration: 0.6 });
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
      {/* Hidden HTML5 Audio Element for LiveATC OPKC Stream */}
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setAtcStatus('playing');
          setAtcNotice(null);
        }}
        onError={handleAtcAudioError}
        onPause={() => {
          if (atcStatus === 'playing') setAtcStatus('idle');
        }}
      />

      {/* Top Flightradar24-style Control Header */}
      <div className="flex flex-col gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Live Airspace Radar Map (OPKC · 500 NM Radius)
                </h2>
                <span className="text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  {visibleFlights.length} Aircraft
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time 500 nautical mile Karachi FIR radar coverage with full airline names, flight numbers &amp; OPKC Live ATC
              </p>
            </div>
          </div>

          {/* Filter, Map Style & HUD Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 500 NM All / KHI Only / Inbound / Outbound */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  filterMode === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                500 NM ({visibleFlights.length})
              </button>
              <button
                onClick={() => setFilterMode('khi')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  filterMode === 'khi' ? 'bg-blue-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                KHI ({khiCount})
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

            {/* Map Tile Style Selector (Zero API Key) */}
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
              title="Toggle 100–500 NM Karachi radar range rings"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">500 NM Rings</span>
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

        {/* Integrated OPKC LiveATC Radio Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                  atcStatus === 'playing'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
              >
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Karachi OPKC Live ATC</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    TWR 118.3 · APP 125.5 MHz
                  </span>
                  {atcStatus === 'playing' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ON AIR
                    </span>
                  )}
                  {atcStatus === 'connecting' && (
                    <span className="text-[10px] font-mono text-amber-300">Connecting...</span>
                  )}
                </div>
                {atcNotice && (
                  <p className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{atcNotice}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Play / Stop Direct LiveATC Stream */}
            <button
              onClick={handleToggleAtcPlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                atcStatus === 'playing' || atcStatus === 'connecting'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {atcStatus === 'playing' || atcStatus === 'connecting' ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop ATC</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Listen Live ATC</span>
                </>
              )}
            </button>

            {/* Volume Controls */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">
              <button
                onClick={() => setAtcMuted(!atcMuted)}
                className="text-slate-300 hover:text-white cursor-pointer"
                title={atcMuted ? 'Unmute ATC' : 'Mute ATC'}
              >
                {atcMuted || atcVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={atcMuted ? 0 : atcVolume}
                onChange={e => {
                  setAtcMuted(false);
                  setAtcVolume(Number(e.target.value));
                }}
                aria-label="ATC Audio Volume"
                className="w-16 accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Toggle Embedded LiveATC Web Player */}
            <button
              onClick={() => setShowLiveAtcEmbed(!showLiveAtcEmbed)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                showLiveAtcEmbed
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{showLiveAtcEmbed ? 'Hide Web Player' : 'LiveATC Player'}</span>
            </button>

            {/* Direct Link to LiveATC OPKC Mount */}
            <a
              href={LIVEATC_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
              title="Open LiveATC OPKC stream in a new tab"
            >
              <span>LiveATC.net</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div className={`relative w-full ${isFullscreen ? 'flex-1' : 'h-[580px] md:h-[660px]'} bg-slate-900`}>
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
            title="Center on Karachi Airport (OPKC · 500 NM View)"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Embedded LiveATC OPKC Web Player Overlay (when toggled or fallback triggered) */}
        {showLiveAtcEmbed && (
          <div className="absolute top-4 right-16 z-30 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-3.5 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">LiveATC · OPKC Karachi Audio</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={LIVEATC_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                >
                  <span>Pop-out</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setShowLiveAtcEmbed(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="bg-slate-950 p-2">
              <iframe
                src={LIVEATC_PAGE_URL}
                title="LiveATC OPKC Karachi Stream"
                className="w-full h-44 rounded-lg border border-slate-800 bg-slate-900"
                allow="autoplay"
              />
              <p className="text-[11px] text-slate-400 mt-2 px-1 leading-snug">
                If LiveATC displays a browser security check inside the frame, click{' '}
                <a
                  href={LIVEATC_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline font-semibold"
                >
                  Open LiveATC OPKC Player
                </a>{' '}
                to listen directly alongside the radar map.
              </p>
            </div>
          </div>
        )}

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
                    {selectedTelemetry.distFromKhiNm} NM from OPKC
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
                    {selectedFlight.isLiveRadar
                      ? `SQK ${selectedFlight.telemetry?.squawk || selectedFlight.squawkCode || '----'}`
                      : 'SCHED'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Hex: {selectedFlight.telemetry?.hex?.toUpperCase() || 'SCHED'}
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
                    {selectedFlight.liveDataSource || 'Live ADS-B Radar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Legend & Aircraft Quick-Picker Bar */}
        <div className="hidden md:flex absolute bottom-4 right-4 z-20 max-w-2xl items-center gap-1.5 overflow-x-auto bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-1.5 shadow-xl">
          <span className="text-[11px] font-bold text-slate-300 px-2 shrink-0 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>500 NM Targets:</span>
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
