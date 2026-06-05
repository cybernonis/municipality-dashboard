import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoogleMap, useJsApiLoader, Marker, TrafficLayer,
  Circle, Polygon, Polyline, InfoWindow, Autocomplete,
} from '@react-google-maps/api';
import {
  Layers, Construction, Radio, AlertTriangle, Settings,
  Plus, Trash2, Eye, X, Bell,
  Building2, Maximize2, Camera, RotateCcw, Flame, Droplets,
  Wind, Snowflake, Activity, Download, Megaphone,
  Save, Play, FileText, BarChart2, Globe, Route,
  ChevronDown, ChevronRight, ChevronLeft, Zap,
  Car, Pause, Target, CheckCircle, Square, Bot, Loader2, MapPin,
  Minus, Wifi, User,
  Ship, Sun, Leaf, TrafficCone, Users, ClipboardList, Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY!;
const BACKEND   = 'https://municipality-backend-production.up.railway.app';
const CENTER    = { lat: 35.3387, lng: 25.1442 };
const LIBS: ('places')[] = ['places'];

const C = {
  navy: '#1E3A5F', secondary: '#2E86AB', accent: '#F6AE2D',
  success: '#00C853', warning: '#FFA500', critical: '#FF3D00',
  border: '#E2E8F0', bg: '#F5F7FA', panel: '#FFFFFF',
  text: '#1A202C', muted: '#64748B',
};

// ─── Static data ──────────────────────────────────────────────────────────────

const FLOOD_ZONES = [
  { name:'Παραλιακή Ζώνη', ring:[{lat:35.3445,lng:25.135},{lat:35.3445,lng:25.152},{lat:35.341,lng:25.152},{lat:35.341,lng:25.135}] },
  { name:'Λιμάνι',         ring:[{lat:35.345,lng:25.135},{lat:35.3478,lng:25.142},{lat:35.344,lng:25.146},{lat:35.343,lng:25.137}] },
  { name:'Γιόφυρος',       ring:[{lat:35.337,lng:25.118},{lat:35.337,lng:25.126},{lat:35.325,lng:25.126},{lat:35.325,lng:25.118}] },
  { name:'Κατσαμπάς',      ring:[{lat:35.343,lng:25.156},{lat:35.343,lng:25.168},{lat:35.336,lng:25.168},{lat:35.336,lng:25.156}] },
];

const MOCK_GW = [
  { id:'1', gateway_id:'GW_HER_001', name:'Κέντρο',        latitude:35.3387, longitude:25.1442, coverage_radius_m:2000, protocol:'LoRaWAN',   status:'online',      connected_sensors:47 },
  { id:'2', gateway_id:'GW_HER_002', name:'Λιμάνι',        latitude:35.345,  longitude:25.142,  coverage_radius_m:1500, protocol:'LoRaWAN',   status:'online',      connected_sensors:23 },
  { id:'3', gateway_id:'GW_HER_003', name:'Αμμουδάρα',     latitude:35.337,  longitude:25.088,  coverage_radius_m:2500, protocol:'NB-IoT',    status:'maintenance', connected_sensors:12 },
  { id:'4', gateway_id:'GW_HER_004', name:'Καρτερός',      latitude:35.328,  longitude:25.178,  coverage_radius_m:1800, protocol:'LoRaWAN',   status:'online',      connected_sensors:31 },
  { id:'5', gateway_id:'GW_HER_005', name:'Αλικαρνασσός',  latitude:35.326,  longitude:25.155,  coverage_radius_m:2200, protocol:'WiFi-Mesh', status:'offline',     connected_sensors:0  },
];

const MOCK_IOT = {
  waste:   [{id:'BIN_001',lat:35.3387,lng:25.1442,fill:78},{id:'BIN_002',lat:35.342,lng:25.138,fill:45},{id:'BIN_003',lat:35.335,lng:25.150,fill:92},{id:'BIN_004',lat:35.345,lng:25.152,fill:30},{id:'BIN_005',lat:35.331,lng:25.142,fill:85}],
  parking: [{id:'PRK_001',lat:35.340,lng:25.145,occupied:28,total:35},{id:'PRK_002',lat:35.337,lng:25.141,occupied:12,total:40},{id:'PRK_003',lat:35.343,lng:25.148,occupied:50,total:50}],
  flood:   [{id:'FLD_001',lat:35.330,lng:25.130,level:3,risk:'low'},{id:'FLD_002',lat:35.325,lng:25.135,level:8,risk:'medium'},{id:'FLD_003',lat:35.320,lng:25.140,level:18,risk:'high'}],
};

const MOCK_TRAFFIC: {id:string;street_name:string;severity:'orange'|'red';delay_minutes:number;length_km:number;coordinates:{lat:number;lng:number};description:string}[] = [
  {id:'T1',street_name:'Λεωφ. Ικάρου',       severity:'red',    delay_minutes:15,length_km:2.3,coordinates:{lat:35.3387,lng:25.1442},description:'Συμφόρηση λόγω εργασιών'},
  {id:'T2',street_name:'Λεωφ. 62 Μαρτύρων',  severity:'orange', delay_minutes:8, length_km:1.5,coordinates:{lat:35.3290,lng:25.1340},description:'Αυξημένη κίνηση'},
  {id:'T3',street_name:'Οδός Δικαιοσύνης',    severity:'red',    delay_minutes:22,length_km:0.8,coordinates:{lat:35.3402,lng:25.1380},description:'Ατύχημα — μπλοκαρισμένη λωρίδα'},
  {id:'T4',street_name:'Οδ. 1821',            severity:'orange', delay_minutes:5, length_km:1.2,coordinates:{lat:35.3375,lng:25.1395},description:'Αυξημένη κίνηση peak hour'},
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LayerToggles {
  liveTraffic: boolean;
  closedRoads: boolean;
  trafficIncidents: boolean;
  wasteSensors: boolean;
  parkingSensors: boolean;
  trafficSensors: boolean;
  floodSensors: boolean;
  gateways: boolean;
  reports: boolean;
  reportHeatmap: boolean;
  floodZones: boolean;
  beaches: boolean;
  ships: boolean;
  marineConditions: boolean;
  pollenZones: boolean;
}

interface ExternalData {
  beaches?: any;
  marine?: any;
  pollen?: any;
  uv?: any;
  ships?: any;
}

type TabKey     = 'layers' | 'roads' | 'iot' | 'crisis' | 'settings';
type CrisisT    = 'flood' | 'fire' | 'earthquake' | 'heatwave' | 'frost';
type RoadFilter = 'all' | 'active' | 'scheduled' | 'completed';

interface ClosedRoad {
  id: string; road_name: string; reason: string; description?: string;
  start_date: string; end_date?: string;
  status: 'active' | 'scheduled' | 'completed';
  coordinates?: number[][];
}
interface SimZone    { level: 'green'|'yellow'|'red'; center: {lat:number;lng:number}; radius: number; }
interface SimResult  { risk_score: number; affected: number; severity: string; summary: string; actions: string[]; areas: string[]; }
interface LiveAlert  { id: string; level: 'critical'|'warning'|'info'; text: string; lat?: number; lng?: number; }
interface TrafficIncident { id:string; street_name:string; severity:'orange'|'red'; delay_minutes:number; length_km:number; coordinates:{lat:number;lng:number}; description:string; }
interface SavedCrisis {
  id: string; type: CrisisT; label: string;
  result: SimResult; zones: SimZone[];
  epicenter: {lat:number;lng:number}|null;
  status: 'active'|'resolved';
  created_at: string; resolved_at?: string;
}

const CRISIS_LABELS: Record<CrisisT,string> = {
  flood:'Πλημμύρα', fire:'Πυρκαγιά', earthquake:'Σεισμός', heatwave:'Καύσωνας', frost:'Παγετός',
};

// ─── CSS ──────────────────────────────────────────────────────────────────────

const DT_CSS = `
.dt-root{position:relative;width:100%;height:100vh;background:#F5F7FA;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;}
.dt-layers-panel{position:absolute;bottom:90px;left:20px;width:300px;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);z-index:60;max-height:calc(100% - 160px);overflow-y:auto;animation:slideUp 0.2s ease;}
.dt-lp-header{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid #e0e0e0;font-weight:600;color:#1E3A5F;font-size:14px;}
.dt-lp-header button{margin-left:auto;background:none;border:none;cursor:pointer;color:#666;display:flex;align-items:center;}
.dt-lp-content{padding:12px;}
.dt-lp-group{margin-bottom:16px;}
.dt-lp-group h4{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding:0 4px;}
.dt-toggle-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;width:100%;border:none;background:none;text-align:left;}
.dt-toggle-row:hover{background:#F5F7FA;}
.dt-tr-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:#2E86AB;background:#F0F7FA;border-radius:6px;flex-shrink:0;}
.dt-tr-info{flex:1;display:flex;flex-direction:column;}
.dt-tr-label{font-size:13px;font-weight:500;color:#1E3A5F;}
.dt-tr-subtitle{font-size:10px;color:#888;margin-top:1px;}
.dt-toggle-switch{width:36px;height:20px;background:#ddd;border-radius:10px;position:relative;transition:background 0.2s;flex-shrink:0;}
.dt-toggle-switch.on{background:#2E86AB;}
.dt-toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;background:white;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);}
.dt-toggle-switch.on .dt-toggle-thumb{transform:translateX(16px);}
.dt-lp-reset{width:100%;padding:8px;background:#F5F7FA;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#666;margin-top:8px;}
.dt-lp-reset:hover{background:#FFEBEE;color:#FF3D00;border-color:#FF3D00;}
.dt-external-widgets{position:absolute;bottom:90px;right:20px;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;gap:8px;z-index:55;max-width:calc(100% - 360px);}
.dt-ext-widget{background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-radius:10px;padding:8px 12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#1E3A5F;border-left:3px solid #2E86AB;}
.dt-ext-widget:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.15);}
.dt-ext-widget.expanded{flex-direction:column;align-items:flex-start;max-width:240px;padding:12px 14px;}
.dt-ext-widget.marine.forbidden{border-left-color:#FF3D00;}
.dt-ext-widget.marine.caution{border-left-color:#FFA500;}
.dt-ext-widget.uv.level-extreme,.dt-ext-widget.uv.level-very_high{border-left-color:#FF3D00;}
.dt-ext-widget.pollen-alert{border-left-color:#FFA500;}
.dt-ext-header-mini{display:flex;align-items:center;gap:6px;white-space:nowrap;}
.dt-ext-count-mini{background:#1E3A5F;color:white;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:4px;}
.dt-ext-body{font-size:11px;color:#444;margin-top:8px;width:100%;}
.dt-ext-body>div{margin:4px 0;}
.dt-ext-label{font-size:12px;color:#666;text-transform:capitalize;margin:2px 0;}
.dt-ext-advice{font-size:11px;color:#888;font-style:italic;}
.dt-ext-alert{background:#FFEBEE;color:#C62828;padding:4px 8px;border-radius:4px;font-size:10px;margin-top:4px;}
.dt-beach-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle;flex-shrink:0;}
.dt-beach-dot.ok{background:#00C853;}
.dt-beach-dot.caution{background:#FFA500;}
.dt-beach-dot.forbidden{background:#FF3D00;}
.dt-topbar{height:60px;flex-shrink:0;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,0.07);display:grid;grid-template-columns:auto 1fr auto;align-items:center;padding:0 18px;gap:12px;z-index:200;}
@keyframes slideUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.dt-floating-btn{position:absolute;bottom:90px;z-index:65;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.1);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:48px;height:52px;color:#1E3A5F;transition:transform 0.15s,box-shadow 0.15s;}
.dt-floating-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15);}
.dt-layers-btn{left:20px;}
.dt-traffic-btn{left:78px;}
.dt-floating-label{font-size:9px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:0.3px;line-height:1;}
.dt-traffic-list-widget{position:absolute;bottom:90px;left:78px;width:320px;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);overflow:hidden;z-index:65;display:flex;flex-direction:column;max-height:340px;animation:slideUp 0.2s ease;}
.dt-tl-header{display:flex;align-items:center;gap:8px;padding:11px 14px;background:#1E3A5F;color:#fff;font-weight:600;font-size:13px;flex-shrink:0;}
.dt-tl-items{overflow-y:auto;}
.dt-tl-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-left-width:4px;border-left-style:solid;}
.dt-tl-item:hover{background:#F5F7FA;}
.dt-tl-street{font-weight:600;font-size:12px;color:#1E3A5F;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dt-tl-delay{font-size:11px;color:#64748B;margin:2px 0 0;}
.dt-close-btn{margin-left:auto;background:none;border:none;cursor:pointer;color:#666;display:flex;align-items:center;padding:2px;}
.dt-close-btn:hover{color:#FF3D00;}
.dt-toggle-label{font-size:8px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:0.5px;writing-mode:vertical-lr;transform:rotate(180deg);}
.dt-content{flex:1;display:grid;grid-template-columns:60px 1fr 0px;overflow:hidden;transition:grid-template-columns 0.3s ease;position:relative;}
.dt-content.right-open{grid-template-columns:60px 1fr 316px;}
.dt-right-sidebar{overflow:hidden;transition:transform 0.3s ease,opacity 0.3s ease;transform:translateX(100%);opacity:0;pointer-events:none;}
.dt-content.right-open .dt-right-sidebar{transform:translateX(0);opacity:1;pointer-events:auto;}
.dt-right-toggle{position:absolute;top:50%;right:0;transform:translateY(-50%);background:white;border:1px solid #e0e0e0;border-right:none;width:22px;height:52px;border-radius:8px 0 0 8px;cursor:pointer;z-index:70;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#1E3A5F;transition:right 0.3s ease;box-shadow:-2px 0 6px rgba(0,0,0,0.08);}
.dt-right-toggle:hover{background:#F5F7FA;}
.dt-content.right-open .dt-right-toggle{right:316px;}
.dt-left-nav{background:#fff;border-right:1px solid #E8ECF0;padding:12px 0;display:flex;flex-direction:column;align-items:center;gap:4px;}
.dt-nb{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;background:transparent;color:#94A3B8;transition:all 0.18s;position:relative;}
.dt-nb:hover{background:#F1F5F9;color:#1E3A5F;}
.dt-nb.on{background:#1E3A5F;color:#fff;}
.dt-tt{position:absolute;left:50px;top:50%;transform:translateY(-50%);background:#1E3A5F;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:9999;}
.dt-nb:hover .dt-tt{opacity:1;}
.dt-map{position:relative;overflow:hidden;background:#E8EEF4;}
.dt-panel{position:absolute;top:0;left:0;bottom:0;width:336px;z-index:150;background:rgba(255,255,255,0.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-right:1px solid rgba(0,0,0,0.07);box-shadow:6px 0 28px rgba(0,0,0,0.1);display:flex;flex-direction:column;animation:dtsi 0.22s ease;overflow:hidden;}
@keyframes dtsi{from{transform:translateX(-100%);opacity:0;}to{transform:translateX(0);opacity:1;}}
.dt-phdr{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 11px;border-bottom:1px solid #E8ECF0;flex-shrink:0;}
.dt-ptitle{font-size:13px;font-weight:700;color:#1E3A5F;display:flex;align-items:center;gap:7px;}
.dt-pbody{flex:1;overflow-y:auto;padding:12px;}
.dt-pbody::-webkit-scrollbar{width:3px;}
.dt-pbody::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.dt-kpis{position:absolute;top:14px;left:14px;display:flex;flex-direction:column;gap:7px;z-index:50;}
.dt-kpi{background:rgba(255,255,255,0.93);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:12px;padding:10px 13px;width:206px;box-shadow:0 4px 16px rgba(0,0,0,0.09);border:1px solid rgba(255,255,255,0.7);display:flex;align-items:center;gap:11px;transition:all 0.2s;}
.dt-kpi:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.13);}
.dt-kico{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;}
.dt-klbl{font-size:10px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;}
.dt-kval{font-size:19px;font-weight:700;color:#1E3A5F;line-height:1.2;}
.dt-kchg{font-size:10px;font-weight:600;}
.dt-kchg.p{color:#00C853;}.dt-kchg.n{color:#FF3D00;}.dt-kchg.z{color:#888;}
.dt-charts{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;gap:7px;z-index:50;}
.dt-chart{background:rgba(255,255,255,0.93);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:12px;padding:12px 14px;width:254px;box-shadow:0 4px 16px rgba(0,0,0,0.09);border:1px solid rgba(255,255,255,0.7);}
.dt-chart h4{font-size:12px;font-weight:700;color:#1E3A5F;margin:0 0 8px;display:flex;align-items:center;gap:5px;}
.dt-legend{position:absolute;bottom:84px;left:14px;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:10px;padding:9px 13px;box-shadow:0 4px 16px rgba(0,0,0,0.09);z-index:50;}
.dt-legend h4{font-size:10px;font-weight:700;color:#1E3A5F;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;}
.dt-li{display:flex;align-items:center;gap:7px;font-size:11px;color:#444;margin:3px 0;}
.dt-ld{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.dt-ctrl{position:absolute;bottom:84px;right:14px;display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:10px;padding:5px;box-shadow:0 4px 16px rgba(0,0,0,0.09);z-index:50;}
.dt-cb{width:32px;height:32px;border:none;background:transparent;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1E3A5F;transition:background 0.15s;}
.dt-cb:hover{background:#F1F5F9;}
.dt-abar{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:5px;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:13px;padding:6px;box-shadow:0 4px 20px rgba(0,0,0,0.11);z-index:60;border:1px solid rgba(0,0,0,0.06);}
.dt-ab{display:flex;align-items:center;gap:5px;padding:8px 12px;background:#fff;border:1px solid #E0E0E0;border-radius:8px;font-size:12px;font-weight:600;color:#1E3A5F;cursor:pointer;transition:all 0.18s;white-space:nowrap;}
.dt-ab:hover{background:#1E3A5F;color:#fff;border-color:#1E3A5F;}
.dt-sidebar{background:#fff;border-left:1px solid #E8ECF0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:16px;}
.dt-sidebar::-webkit-scrollbar{width:3px;}
.dt-sidebar::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
.dt-sh{font-size:10px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 8px;display:flex;align-items:center;gap:6px;}
.dt-alc{border-radius:8px;padding:8px 11px;margin-bottom:4px;border-left:3px solid #FF3D00;background:#FFF5F5;cursor:pointer;transition:transform 0.15s;}
.dt-alc:hover{transform:translateX(2px);}
.dt-alc.w{border-left-color:#FFA500;background:#FFFBEB;}
.dt-alc.i{border-left-color:#2E86AB;background:#EFF6FF;}
.dt-alct{font-weight:600;font-size:11px;color:#1E3A5F;}
.dt-alcm{font-size:10px;color:#888;margin-top:2px;}
.dt-act{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F4F6F8;}
.dt-aci{width:26px;height:26px;border-radius:6px;background:#F0F9FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#2E86AB;}
.dt-acl{font-size:11px;font-weight:600;color:#1E3A5F;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dt-acm{font-size:10px;color:#888;}
.dt-gauges{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.dt-gauge{background:#F8FAFC;border-radius:9px;padding:10px 6px;text-align:center;border:1px solid #E8ECF0;}
.dt-glbl{font-size:10px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;}
.dt-gst{font-size:10px;font-weight:600;color:#00C853;margin-top:1px;}
.dt-search{display:flex;align-items:center;gap:7px;background:#F5F7FA;border:1px solid #E0E0E0;border-radius:9px;padding:0 12px;height:34px;}
.dt-search input{border:none;background:transparent;font-size:13px;color:#1E3A5F;outline:none;flex:1;}
.dt-search input::placeholder{color:#94A3B8;}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gwColor(s: string) { return s==='online' ? C.secondary : s==='maintenance' ? C.accent : '#9CA3AF'; }

function synthResult(type: CrisisT, p: Record<string,any>): SimResult {
  const risk = { flood:p.floodLevel==='catastrophic'?9:p.floodLevel==='extreme'?7:p.floodLevel==='strong'?5:3, fire:p.fireDrought==='high'?8:p.fireDrought==='medium'?6:4, earthquake:Math.min(10,Math.round((parseFloat(p.quakeMag)-4)*2.5)), heatwave:p.heatPeak>42?7:p.heatPeak>38?5:3, frost:p.frostTemp<-5?6:3 }[type] ?? 5;
  const actMap: Record<CrisisT,string[]> = {
    flood:['Ενεργοποίηση πρωτοκόλλου πλημμύρας','Εκκένωση χαμηλών περιοχών','Κλείσιμο παραλιακής οδού','Ειδοποίηση πολιτών push','Έτοιμα κέντρα έκτακτης ανάγκης'],
    fire:['Κλήση πυροσβεστικής αμέσως','Εκκένωση ακτίνας 500m','Κλείσιμο παρακείμενων οδών','Ειδοποίηση νοσοκομείων'],
    earthquake:['Ενεργοποίηση σεισμικού πρωτοκόλλου','Έλεγχος δομικής ακεραιότητας','Ιατρική βοήθεια στο επίκεντρο',...(p.quakeTsunami?['Εκκένωση παραλίας ΑΜΕΣΑ']:[])],
    heatwave:['Ενεργοποίηση cooling centers','Παρακολούθηση ευάλωτων ομάδων','Αύξηση διανομής νερού','SMS σε ηλικιωμένους'],
    frost:['Εκχιονισμός κύριων αρτηριών','Ειδοποίηση επικίνδυνων συνθηκών','Άνοιγμα θερμαινόμενων χώρων'],
  };
  return { risk_score:risk, affected:Math.round(risk*3200+Math.random()*4000), severity:risk>=8?'Κρίσιμο':risk>=6?'Υψηλό':risk>=4?'Μέτριο':'Χαμηλό', summary:`Προσομοίωση ολοκληρώθηκε. Επίπεδο κινδύνου: ${risk}/10`, actions:actMap[type], areas:['Κέντρο Ηρακλείου','Παραλιακή Ζώνη','Λιμάνι'] };
}

function synthZones(type: CrisisT, p: Record<string,any>): SimZone[] {
  const radii: Record<CrisisT,number[]> = { flood:p.floodLevel==='catastrophic'?[4500,2500,1000]:[2500,1500,600], fire:[900,500,200], earthquake:[(parseFloat(p.quakeMag)-4)*1600,(parseFloat(p.quakeMag)-4)*1000,(parseFloat(p.quakeMag)-4)*400], heatwave:[5000,3000,1500], frost:[3000,2000,1000] };
  const levels: ('green'|'yellow'|'red')[] = ['green','yellow','red'];
  return (radii[type]??[2000,1200,500]).map((r,i) => ({ level:levels[2-i], center:CENTER, radius:r }));
}

const FORM_INPUT: React.CSSProperties = { width:'100%', padding:'6px 9px', border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none', color:C.text };
const FORM_LABEL: React.CSSProperties = { fontSize:11, fontWeight:600, color:C.muted, display:'block', marginBottom:3 };

// ─── Small reusable components ────────────────────────────────────────────────

const Toggle: React.FC<{checked:boolean;onChange:(v:boolean)=>void;label:string;sub?:boolean}> = ({checked,onChange,label,sub}) => (
  <label style={{display:'flex',alignItems:'center',gap:9,cursor:'pointer',padding:'3px 0',paddingLeft:sub?16:0}}>
    <div onClick={()=>onChange(!checked)} style={{width:34,height:18,borderRadius:9,position:'relative',cursor:'pointer',background:checked?C.secondary:'#CBD5E1',transition:'background 0.2s',flexShrink:0}}>
      <div style={{position:'absolute',top:2,left:checked?18:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.25)'}}/>
    </div>
    <span style={{fontSize:12,color:checked?C.text:C.muted,fontWeight:checked?500:400}}>{label}</span>
  </label>
);

const SectionHead: React.FC<{icon:React.ReactNode;title:string}> = ({icon,title}) => (
  <p style={{fontSize:11,fontWeight:700,color:C.muted,display:'flex',alignItems:'center',gap:5,margin:'12px 0 6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
    {icon} {title}
  </p>
);

function ToggleRow({ icon, label, subtitle, checked, onChange }: { icon: React.ReactNode; label: string; subtitle?: string; checked: boolean; onChange: () => void }) {
  return (
    <button className="dt-toggle-row" onClick={onChange}>
      <div className="dt-tr-icon">{icon}</div>
      <div className="dt-tr-info">
        <span className="dt-tr-label">{label}</span>
        {subtitle && <span className="dt-tr-subtitle">{subtitle}</span>}
      </div>
      <div className={`dt-toggle-switch${checked ? ' on' : ''}`}>
        <div className="dt-toggle-thumb" />
      </div>
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{icon:React.ReactNode;label:string;value:string|number;change?:string;gradient:string}> = ({icon,label,value,change,gradient}) => {
  const pos = change?.startsWith('+');
  const neg = change?.startsWith('-') || change?.startsWith('−');
  return (
    <div className="dt-kpi">
      <div className="dt-kico" style={{background:gradient}}>{icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div className="dt-klbl">{label}</div>
        <div className="dt-kval">{value}</div>
        {change && <div className={`dt-kchg ${pos?'p':neg?'n':'z'}`}>{change}</div>}
      </div>
    </div>
  );
};

// ─── Semi-circular Gauge ──────────────────────────────────────────────────────

const SemiGauge: React.FC<{value:number;color:string;label:string;status?:string}> = ({value,color,label,status}) => {
  const r=26, cx=36, cy=38, circ=Math.PI*r;
  const dash=(Math.min(value,100)/100)*circ;
  return (
    <div className="dt-gauge">
      <svg width="72" height="44" viewBox="0 0 72 44">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round"/>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}/>
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E3A5F">{value}%</text>
      </svg>
      <div className="dt-glbl">{label}</div>
      {status && <div className="dt-gst">{status}</div>}
    </div>
  );
};

// ─── Bar Mini Chart ───────────────────────────────────────────────────────────

const BarMiniChart: React.FC<{title:string;data:number[];labels:string[];color:string;icon?:React.ReactNode}> = ({title,data,labels,color,icon}) => {
  const max=Math.max(...data,1), W=226, H=52, N=data.length, bw=(W-12)/N-4;
  return (
    <div className="dt-chart">
      <h4>{icon??<BarChart2 size={12}/>} {title}</h4>
      <svg width="100%" height={H+14} viewBox={`0 0 ${W} ${H+14}`}>
        {data.map((v,i)=>{
          const bh=Math.max(3,(v/max)*H), x=6+i*((W-12)/N)+1;
          return (
            <g key={i}>
              <rect x={x} y={H-bh} width={bw} height={bh} rx={3} fill={color} opacity={0.82}/>
              <text x={x+bw/2} y={H+13} textAnchor="middle" fontSize="9" fill="#94A3B8">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Line Mini Chart ──────────────────────────────────────────────────────────

const LineMiniChart: React.FC<{title:string;data:number[];color:string;icon?:React.ReactNode}> = ({title,data,color,icon}) => {
  const max=Math.max(...data,1), min=Math.min(...data), W=226, H=52, PAD=6, range=max-min||1;
  const pts=data.map((v,i):[number,number]=>[PAD+(i/(data.length-1))*(W-PAD*2), PAD+((max-v)/range)*(H-PAD*2)]);
  const path=pts.map((p,i)=>`${i===0?'M':'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area=`${path} L ${(W-PAD).toFixed(1)} ${H} L ${PAD} ${H} Z`;
  return (
    <div className="dt-chart">
      <h4>{icon??<Activity size={12}/>} {title}</h4>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={area} fill={color} opacity={0.1}/>
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={2.5} fill={color}/>)}
      </svg>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const DigitalTwin: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({ id:'google-map-script', googleMapsApiKey:GMAPS_KEY, libraries:LIBS });
  const mapRef    = useRef<google.maps.Map | null>(null);
  const roadAcRef = useRef<google.maps.places.Autocomplete | null>(null);

  // ── Navigation panel ──
  const [activeNav, setActiveNav] = useState<TabKey | null>(null);
  const toggleNav = (key: TabKey) => setActiveNav(p => p === key ? null : key);

  // ── Map ──
  const [mapType,  setMapType]  = useState('hybrid');
  const [toast,    setToast]    = useState({ show:false, msg:'', ok:true });
  const showToast = useCallback((msg:string, ok=true) => {
    setToast({ show:true, msg, ok });
    setTimeout(() => setToast(p => ({ ...p, show:false })), 4000);
  }, []);

  // ── Layer toggles ──
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [layers, setLayers] = useState<LayerToggles>({
    liveTraffic: true,
    closedRoads: true,
    trafficIncidents: true,
    wasteSensors: false,
    parkingSensors: false,
    trafficSensors: false,
    floodSensors: false,
    gateways: false,
    reports: false,
    reportHeatmap: false,
    floodZones: false,
    beaches: false,
    ships: false,
    marineConditions: false,
    pollenZones: false,
  });
  const toggleLayer = (key: keyof LayerToggles) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  const resetLayers = () => setLayers({ liveTraffic:true, closedRoads:true, trafficIncidents:true, wasteSensors:false, parkingSensors:false, trafficSensors:false, floodSensors:false, gateways:false, reports:false, reportHeatmap:false, floodZones:false, beaches:false, ships:false, marineConditions:false, pollenZones:false });
  const [showCoverage, setShowCoverage] = useState(true);
  const [externalData, setExternalData] = useState<ExternalData>({});
  const [selectedBeach, setSelectedBeach] = useState<any>(null);
  const [selectedShip,  setSelectedShip]  = useState<any>(null);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const toggleWidget = (key: string) => setExpandedWidget(prev => prev === key ? null : key);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // ── Data ──
  const [reports,     setReports]     = useState<any[]>([]);
  const [closedRoads, setClosedRoads] = useState<ClosedRoad[]>([]);
  const [gateways,    setGateways]    = useState<any[]>([]);
  const [iotSensors,  setIotSensors]  = useState<Record<string,any[]>>({ waste:[], parking:[], traffic:[], flood:[] });
  const [snapshot,    setSnapshot]    = useState<any>(null);
  const [selected,    setSelected]    = useState<any>(null);

  // ── Roads tab ──
  const [roadFilter,     setRoadFilter]     = useState<RoadFilter>('all');
  const [showRoadModal,  setShowRoadModal]  = useState(false);
  const [newRoad,        setNewRoad]        = useState({ road_name:'', reason:'Έργα', description:'', start_date:new Date().toISOString().split('T')[0], end_date:'', create_announcement:true, is_urgent:false, coordinates:undefined as number[][]|undefined });
  const [submittingRoad, setSubmittingRoad] = useState(false);

  // ── Crisis tab ──
  const [crisisType,   setCrisisType]   = useState<CrisisT>('flood');
  const [simRunning,   setSimRunning]   = useState(false);
  const [simResult,    setSimResult]    = useState<SimResult | null>(null);
  const [simZones,     setSimZones]     = useState<SimZone[]>([]);
  const [floodLevel,   setFloodLevel]   = useState('strong');
  const [floodMm,      setFloodMm]      = useState(80);
  const [floodDur,     setFloodDur]     = useState(3);
  const [floodWind,    setFloodWind]    = useState(10);
  const [floodWindDir, setFloodWindDir] = useState('NW');
  const [floodHistory, setFloodHistory] = useState(false);
  const [floodAI,      setFloodAI]      = useState(false);
  const [fireType,     setFireType]     = useState<'forest'|'urban'|'industrial'>('urban');
  const [fireWind,     setFireWind]     = useState(25);
  const [fireTemp,     setFireTemp]     = useState(38);
  const [fireHum,      setFireHum]      = useState(25);
  const [fireDrought,  setFireDrought]  = useState<'low'|'medium'|'high'>('high');
  const [quakeMag,     setQuakeMag]     = useState(6.5);
  const [quakeDepth,   setQuakeDepth]   = useState(15);
  const [quakeSoil,    setQuakeSoil]    = useState<'hard'|'medium'|'soft'|'loose'>('medium');
  const [quakeTsunami, setQuakeTsunami] = useState(true);
  const [quakeAftershocks, setQuakeAftershocks] = useState(true);
  const [quakeBuilding,    setQuakeBuilding]    = useState(false);
  const [heatDays,     setHeatDays]     = useState(5);
  const [heatPeak,     setHeatPeak]     = useState(42);
  const [heatNight,    setHeatNight]    = useState(28);
  const [heatHum,      setHeatHum]      = useState(15);
  const [heatElderly,  setHeatElderly]  = useState(true);
  const [heatChildren, setHeatChildren] = useState(true);
  const [heatChronic,  setHeatChronic]  = useState(true);
  const [frostTemp,    setFrostTemp]    = useState(-3);
  const [frostDur,     setFrostDur]     = useState(12);
  const [frostSnow,    setFrostSnow]    = useState(true);
  const [frostSnowCm,  setFrostSnowCm]  = useState(2);
  const [pickingEpicenter,  setPickingEpicenter]  = useState(false);
  const [crisisEpicenter,   setCrisisEpicenter]   = useState<{lat:number;lng:number}|null>(null);
  const [simPaused,    setSimPaused]    = useState(false);
  const simPausedRef   = useRef(false);
  const [simProgress,  setSimProgress]  = useState(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // ── Saved crises ──
  const [savedCrises, setSavedCrises] = useState<SavedCrisis[]>(() => {
    try { return JSON.parse(localStorage.getItem('dt_saved_crises') ?? '[]'); } catch { return []; }
  });

  // ── Stats & alerts ──
  const [reportStats, setReportStats] = useState({ total:0, pending:0, in_progress:0, resolved:0, today:0, this_week:0 });
  const [alerts,      setAlerts]      = useState<LiveAlert[]>([]);

  // ── Settings ──
  const [autoRefresh, setAutoRefresh] = useState(30);
  const [darkMode,    setDarkMode]    = useState(false);

  // ── Traffic incidents ──
  const [trafficIncidents,  setTrafficIncidents]  = useState<TrafficIncident[]>([]);
  const [trafficListOpen,   setTrafficListOpen]   = useState(false);

  // ── Auth header ──
  const token = localStorage.getItem('token') || '';
  const authH: Record<string,string> = token ? { Authorization:`Bearer ${token}` } : {};

  // ─────────────────────────────────────────────────────────────────────────────
  //  Fetchers
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    try {
      const rs = await fetch(`${BACKEND}/reports/`);
      if (rs.ok) {
        const rd = await rs.json();
        const all: any[] = Array.isArray(rd) ? rd : (rd.data ?? rd.reports ?? []);
        const today = new Date(); today.setHours(0,0,0,0);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate()-7);
        setReportStats({ total:all.length, pending:all.filter((r:any)=>r.status==='pending').length, in_progress:all.filter((r:any)=>r.status==='in_progress').length, resolved:all.filter((r:any)=>r.status==='resolved').length, today:all.filter((r:any)=>new Date(r.created_at)>=today).length, this_week:all.filter((r:any)=>new Date(r.created_at)>=weekAgo).length });
      }
    } catch {}
    try {
      const r = await fetch(`${BACKEND}/digital-twin/layers`);
      if (!r.ok) return;
      const d = await r.json();
      const list = (Array.isArray(d.reports)?d.reports:[]).map((x:any) => ({ ...x, lat:x.lat??x.latitude??x.location?.lat, lng:x.lng??x.longitude??x.location?.lng })).filter((x:any)=>x.lat&&x.lng);
      setReports(list);
    } catch {}
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try { const r=await fetch(`${BACKEND}/digital-twin/snapshot`); if(r.ok) setSnapshot(await r.json()); } catch {}
  }, []);

  const fetchClosedRoads = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/closed-roads`, { headers:authH });
      if (!r.ok) return;
      const d = await r.json();
      setClosedRoads(Array.isArray(d)?d:(d.roads??d.data??[]));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGateways = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/iot/gateways`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const list = Array.isArray(d)?d:(d.gateways??d.data??[]);
      setGateways(list.length?list:MOCK_GW);
    } catch { setGateways(MOCK_GW); }
  }, []);

  const fetchIot = useCallback(async (layer: 'waste'|'parking'|'traffic'|'flood') => {
    const typeMap = { waste:'smart_waste_bin', parking:'smart_parking', traffic:'smart_traffic', flood:'smart_flood' };
    try {
      const r = await fetch(`${BACKEND}/iot/sensors?type=${typeMap[layer]}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const sensors = Array.isArray(d)?d:(d.sensors??d.data??[]);
      setIotSensors(prev=>({ ...prev, [layer]: sensors.length?sensors:(MOCK_IOT as any)[layer]??[] }));
    } catch { setIotSensors(prev=>({ ...prev, [layer]:(MOCK_IOT as any)[layer]??[] })); }
  }, []);

  const fetchTrafficIncidents = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/traffic/incidents`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const list: TrafficIncident[] = (d.incidents??d??[]).filter((i:any)=>['orange','red','major','critical'].includes(i.severity));
      setTrafficIncidents(list.length?list:MOCK_TRAFFIC);
    } catch { setTrafficIncidents(MOCK_TRAFFIC); }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Effects
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchExternalData = useCallback(async () => {
    try {
      const resp = await fetch(`${BACKEND}/external/summary`);
      if (!resp.ok) return;
      const data = await resp.json();
      setExternalData({ beaches: data.beaches, marine: data.marine, pollen: data.pollen, uv: data.uv, ships: data.ships });
    } catch (e) { console.error('[EXTERNAL]', e); }
  }, []);

  useEffect(() => { fetchReports(); fetchSnapshot(); fetchClosedRoads(); fetchExternalData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(fetchExternalData, 5*60*1000); return () => clearInterval(t); }, [fetchExternalData]);
  useEffect(() => { if (layers.gateways)      fetchGateways(); }, [layers.gateways,      fetchGateways]);
  useEffect(() => { if (layers.wasteSensors)   fetchIot('waste');   }, [layers.wasteSensors,   fetchIot]);
  useEffect(() => { if (layers.parkingSensors) fetchIot('parking'); }, [layers.parkingSensors, fetchIot]);
  useEffect(() => { if (layers.trafficSensors) fetchIot('traffic'); }, [layers.trafficSensors, fetchIot]);
  useEffect(() => { if (layers.floodSensors)   fetchIot('flood');   }, [layers.floodSensors,   fetchIot]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = window.setInterval(() => { fetchReports(); fetchSnapshot(); fetchClosedRoads(); }, autoRefresh*1000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchReports, fetchSnapshot, fetchClosedRoads]);

  useEffect(() => {
    if (!layers.liveTraffic) { setTrafficIncidents([]); return; }
    fetchTrafficIncidents();
    const t = setInterval(fetchTrafficIncidents, 60_000);
    return () => clearInterval(t);
  }, [layers.liveTraffic, fetchTrafficIncidents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive live alerts from IoT data
  useEffect(() => {
    const next: LiveAlert[] = [];
    (iotSensors.waste.length?iotSensors.waste:MOCK_IOT.waste).forEach((s:any) => {
      const fill = s.fill??s.latest_reading?.fill_level_percent??0;
      if (fill > 90) next.push({ id:`bin-${s.id}`, level:'critical', text:`Κάδος ${s.id}: ${fill}% γεμάτος`, lat:s.lat, lng:s.lng });
    });
    closedRoads.filter(r=>r.status==='active').slice(0,3).forEach(r => {
      next.push({ id:`road-${r.id}`, level:'info', text:`Κλειστός: ${r.road_name} (${r.reason})` });
    });
    if (externalData.marine?.swim_status === 'forbidden') {
      next.push({ id:'marine-forbidden', level:'critical', text:'Απαγόρευση κολύμβησης — Δυσμενείς θαλάσσιες συνθήκες' });
    }
    setAlerts(next.slice(0,8));
  }, [iotSensors.waste, closedRoads, externalData.marine]);

  // Body overflow removed — DT respects the layout like all other pages

  // Map resize on load
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    const t = setTimeout(() => { (window as any).google?.maps?.event?.trigger(mapRef.current, 'resize'); }, 300);
    return () => clearTimeout(t);
  }, [isLoaded]);

  // Map resize when panel opens/closes
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => { (window as any).google?.maps?.event?.trigger(mapRef.current, 'resize'); }, 320);
    return () => clearTimeout(t);
  }, [activeNav]);

  // Persist saved crises
  useEffect(() => {
    localStorage.setItem('dt_saved_crises', JSON.stringify(savedCrises));
  }, [savedCrises]);

  // Map resize when right sidebar collapses
  useEffect(() => {
    const t = setTimeout(() => {
      if (mapRef.current) (window as any).google?.maps?.event?.trigger(mapRef.current, 'resize');
    }, 350);
    return () => clearTimeout(t);
  }, [rightSidebarOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreateRoad = useCallback(async () => {
    if (!newRoad.road_name) return;
    setSubmittingRoad(true);
    try {
      const r = await fetch(`${BACKEND}/closed-roads`, { method:'POST', headers:{'Content-Type':'application/json',...authH}, body:JSON.stringify({ road_name:newRoad.road_name, reason:newRoad.reason, description:newRoad.description, start_date:newRoad.start_date, end_date:newRoad.end_date||null, status:'active', coordinates:newRoad.coordinates??null }) });
      if (!r.ok) throw new Error();
      if (newRoad.create_announcement) {
        await fetch(`${BACKEND}/announcements/`, { method:'POST', headers:{'Content-Type':'application/json',...authH}, body:JSON.stringify({ title:`Κλειστός: ${newRoad.road_name}`, content:`${newRoad.road_name} κλειστός λόγω ${newRoad.reason}. Από ${newRoad.start_date}.`, is_important:true, is_urgent:newRoad.is_urgent, category:'traffic' }) });
      }
      await fetchClosedRoads();
      setShowRoadModal(false);
      setNewRoad({ road_name:'', reason:'Έργα', description:'', start_date:new Date().toISOString().split('T')[0], end_date:'', create_announcement:true, is_urgent:false, coordinates:undefined });
      showToast('Ο δρόμος κλείστηκε επιτυχώς!');
    } catch { showToast('Σφάλμα δημιουργίας.', false); }
    finally { setSubmittingRoad(false); }
  }, [newRoad, fetchClosedRoads, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteRoad = useCallback(async (id:string) => {
    if (!window.confirm('Διαγραφή κλειστού δρόμου;')) return;
    try { await fetch(`${BACKEND}/closed-roads/${id}`, { method:'DELETE', headers:authH }); await fetchClosedRoads(); }
    catch {} // eslint-disable-line react-hooks/exhaustive-deps
  }, [fetchClosedRoads]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSimulation = useCallback(async () => {
    setSimRunning(true); setSimPaused(false); simPausedRef.current=false; setSimProgress(0); setSimResult(null); setSimZones([]);
    let prog=0;
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = setInterval(() => { if(!simPausedRef.current){ prog=Math.min(prog+4,88); setSimProgress(prog); } }, 120);
    const epi = crisisEpicenter ?? CENTER;
    const params: Record<string,any> = { crisisType, floodLevel, floodMm, fireDrought, quakeMag, quakeTsunami, heatPeak, epicenter:crisisEpicenter };
    try {
      const r = await fetch(`${BACKEND}/digital-twin/crisis/simulate`, { method:'POST', headers:{'Content-Type':'application/json',...authH}, body:JSON.stringify({ type:crisisType, params }) });
      const d = r.ok ? await r.json() : null;
      const result = d?.risk_score!=null ? { ...d, actions:d.recommended_actions??d.actions??[], areas:d.affected_areas??[] } : synthResult(crisisType, params);
      const zones  = d?.zones?.length ? d.zones.map((z:any)=>({ level:z.level, center:epi, radius:z.radius??1500 })) : synthZones(crisisType, params).map(z=>({ ...z, center:epi }));
      setSimResult(result); setSimZones(zones);
    } catch {
      setSimResult(synthResult(crisisType, params));
      setSimZones(synthZones(crisisType, params).map(z=>({ ...z, center:epi })));
    } finally {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      setSimProgress(100);
      setTimeout(() => setSimRunning(false), 400);
    }
  }, [crisisType, floodLevel, floodMm, fireDrought, quakeMag, quakeTsunami, heatPeak, crisisEpicenter]); // eslint-disable-line react-hooks/exhaustive-deps

  const pauseSimulation  = () => { setSimPaused(true);  simPausedRef.current=true; };
  const resumeSimulation = () => { setSimPaused(false); simPausedRef.current=false; };
  const stopSimulation   = () => { if(simIntervalRef.current) clearInterval(simIntervalRef.current); setSimRunning(false); setSimPaused(false); simPausedRef.current=false; setSimProgress(0); };
  const resetSimulation  = () => { stopSimulation(); setSimResult(null); setSimZones([]); setCrisisEpicenter(null); };

  const handleSaveCrisis = useCallback(() => {
    if (!simResult) return;
    setSavedCrises(prev => [{ id:Date.now().toString(), type:crisisType, label:CRISIS_LABELS[crisisType], result:simResult, zones:simZones, epicenter:crisisEpicenter, status:'active', created_at:new Date().toISOString() }, ...prev]);
    showToast('Η κρίση αποθηκεύτηκε!');
  }, [simResult, crisisType, simZones, crisisEpicenter, showToast]);

  const handleResolveCrisis = useCallback((id:string) => {
    setSavedCrises(prev => prev.map(c => c.id===id ? { ...c, status:'resolved', resolved_at:new Date().toISOString() } : c));
    showToast('Η κρίση επιλύθηκε!');
  }, [showToast]);

  const handleDeleteCrisis = useCallback((id:string) => {
    if (!window.confirm('Διαγραφή κρίσης;')) return;
    setSavedCrises(prev => prev.filter(c => c.id!==id));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Derived data
  // ─────────────────────────────────────────────────────────────────────────────

  const gwList      = gateways.length ? gateways : MOCK_GW;
  const iotOnlinePct = Math.round((gwList.filter((g:any)=>g.status==='online').length / gwList.length)*100);
  const wasteList    = iotSensors.waste.length ? iotSensors.waste : MOCK_IOT.waste;
  const avgFill      = Math.round(wasteList.reduce((s:number,b:any)=>s+(b.fill??0),0) / (wasteList.length||1));
  const wasteOk      = 100 - avgFill;
  const resolvedPct  = Math.round((reportStats.resolved / (reportStats.total||1))*100);
  const cityHealth   = Math.round(resolvedPct*0.35 + iotOnlinePct*0.35 + Math.max(0,100-reportStats.pending*4)*0.3);
  const trafficLoad  = Math.min(100, Math.round((trafficIncidents.filter(i=>i.severity==='red').length/5)*100));

  const kpis = [
    { icon:<Activity size={17}/>, label:'Υγεία Πόλης',     value:`${cityHealth}%`,        change:'+2.5%',                                gradient:'linear-gradient(135deg,#00C853,#00897B)' },
    { icon:<Bell     size={17}/>, label:'Ενεργές Αναφορές', value:reportStats.pending,     change:`+${reportStats.today} σήμερα`,         gradient:'linear-gradient(135deg,#FFA500,#FF6F00)' },
    { icon:<Wifi     size={17}/>, label:'IoT Online',       value:`${iotOnlinePct}%`,       change:iotOnlinePct>=80?'+0.2%':'−0.5%',       gradient:'linear-gradient(135deg,#2E86AB,#1565C0)' },
    { icon:<Trash2   size={17}/>, label:'Κάδοι ΟΚ',         value:`${wasteOk}%`,            change:'+1.2%',                                gradient:'linear-gradient(135deg,#00C853,#2E7D32)' },
    { icon:<Zap      size={17}/>, label:'Κρίσεις Ενεργές',  value:savedCrises.filter(c=>c.status==='active').length, change:`${closedRoads.filter(r=>r.status==='active').length} κλ. δρόμοι`, gradient:'linear-gradient(135deg,#9C27B0,#6A1B9A)' },
  ];

  const trafficChartData   = trafficIncidents.length>0 ? trafficIncidents.slice(0,5).map(i=>i.delay_minutes) : [8,15,22,5,12];
  const trafficChartLabels = trafficIncidents.length>0 ? trafficIncidents.slice(0,5).map(i=>i.street_name.slice(0,5)) : ['Ικάρ.','Μαρτ.','Δικ.','1821','Πλατ.'];
  const energyData         = [42,38,45,41,48,44,40];

  const activities = [
    ...closedRoads.slice(0,3).map(r=>({ id:`rd-${r.id}`, icon:<Construction size={12}/>, title:r.road_name, time:r.start_date, color:C.accent })),
    ...savedCrises.slice(0,2).map(c=>({ id:`cr-${c.id}`, icon:<AlertTriangle size={12}/>, title:`${c.label} — ${c.result.severity}`, time:new Date(c.created_at).toLocaleDateString('el-GR'), color:C.critical })),
  ].slice(0,5);

  const filteredRoads = closedRoads.filter(r => roadFilter==='all' || r.status===roadFilter);
  const zoneColors    = { green:'#00C853', yellow:'#FFA500', red:'#FF3D00' };
  const panelBorder   = darkMode ? '#2D3A4F' : C.border;
  const textColor     = darkMode ? '#E2E8F0' : C.text;
  const mutedColor    = darkMode ? '#94A3B8' : C.muted;
  const NAV_ITEMS: { key:TabKey; Icon:React.FC<any>; label:string }[] = [
    { key:'layers',   Icon:Layers,        label:'Layers'    },
    { key:'roads',    Icon:Construction,  label:'Δρόμοι'    },
    { key:'iot',      Icon:Radio,         label:'IoT'       },
    { key:'crisis',   Icon:AlertTriangle, label:'Κρίσεις'   },
    { key:'settings', Icon:Settings,      label:'Ρυθμίσεις' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{DT_CSS}</style>
      <div className="dt-root">

        {/* ══ TOP BAR ══ */}
        <div className="dt-topbar">
          {/* Left: logo + title */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={() => navigate('/')} style={{background:'none',border:'1px solid #E0E0E0',borderRadius:7,padding:'5px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:C.navy}}>
              <Globe size={14}/> Πίσω
            </button>
            <span style={{fontWeight:700,fontSize:15,color:C.navy,whiteSpace:'nowrap'}}>Ψηφιακό Δίδυμο</span>
            {snapshot && <span style={{fontSize:11,color:C.muted,borderLeft:`1px solid ${C.border}`,paddingLeft:10}}>{snapshot.total_reports??'—'} αναφορές</span>}
          </div>

          {/* Center: flex spacer */}
          <div />

          {/* Right: weather + bell + user */}
          <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'flex-end'}}>
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'#F5F7FA',borderRadius:8,fontSize:12}}>
              <Globe size={13} color={C.secondary}/><span style={{fontWeight:600,color:C.navy}}>28°C</span><span style={{color:C.muted}}>Ηράκλειο</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',background:'#F5F7FA',borderRadius:8,fontSize:12}}>
              <Wind size={13} color={C.success}/><span style={{fontWeight:600,color:C.navy}}>32 AQI</span><span style={{color:C.success}}>Καλή</span>
            </div>
            <button style={{position:'relative',background:'none',border:'none',cursor:'pointer',color:C.navy,display:'flex',alignItems:'center'}} title="Ειδοποιήσεις">
              <Bell size={18}/>
              {alerts.filter(a=>a.level==='critical').length>0 && <span style={{position:'absolute',top:-3,right:-3,background:C.critical,color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{alerts.filter(a=>a.level==='critical').length}</span>}
            </button>
            <div style={{display:'flex',alignItems:'center',gap:7,padding:'4px 10px 4px 6px',background:'#F5F7FA',borderRadius:20,cursor:'pointer'}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,${C.secondary},${C.navy})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700}}><User size={13}/></div>
              <span style={{fontSize:12,fontWeight:600,color:C.navy}}>Admin</span>
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══ */}
        <div className={`dt-content${rightSidebarOpen?' right-open':''}`}>

          {/* ── Left Nav ── */}
          <nav className="dt-left-nav">
            {NAV_ITEMS.map(({key,Icon,label}) => (
              <button key={key} className={`dt-nb${activeNav===key?' on':''}`} onClick={()=>toggleNav(key)}>
                <Icon size={18}/>
                <span className="dt-tt">{label}</span>
              </button>
            ))}
            <div style={{flex:1}}/>
            <div style={{width:32,height:1,background:C.border,margin:'4px 0'}}/>
            <button className="dt-nb" onClick={()=>navigate('/')} title="Πίσω στο Dashboard">
              <Globe size={16}/>
              <span className="dt-tt">Dashboard</span>
            </button>
          </nav>

          {/* ── Map Container ── */}
          <div className="dt-map">

            {/* Floating Tab Panel */}
            {activeNav && (
              <div className="dt-panel">
                <div className="dt-phdr">
                  <span className="dt-ptitle">
                    {activeNav==='layers' && <><Layers size={14}/> Layers</>}
                    {activeNav==='roads'  && <><Construction size={14}/> Κλειστοί Δρόμοι</>}
                    {activeNav==='iot'    && <><Radio size={14}/> IoT Platform</>}
                    {activeNav==='crisis' && <><AlertTriangle size={14}/> Crisis Simulation</>}
                    {activeNav==='settings' && <><Settings size={14}/> Ρυθμίσεις</>}
                  </span>
                  <button onClick={()=>setActiveNav(null)} style={{background:'none',border:'none',cursor:'pointer',color:mutedColor,display:'flex',padding:3}}><X size={16}/></button>
                </div>
                <div className="dt-pbody">

                  {/* ─── LAYERS TAB ─── */}
                  {activeNav==='layers' && (
                    <div>
                      <SectionHead icon={<FileText size={11}/>} title="Δεδομένα Πολιτών"/>
                      <Toggle checked={layers.reports}      onChange={v=>setLayers(p=>({...p,reports:v}))}      label="Αναφορές πολιτών"/>
                      <SectionHead icon={<Route size={11}/>} title="Κυκλοφορία"/>
                      <Toggle checked={layers.closedRoads}  onChange={v=>setLayers(p=>({...p,closedRoads:v}))}  label="Κλειστοί δρόμοι"/>
                      <Toggle checked={layers.liveTraffic}  onChange={v=>setLayers(p=>({...p,liveTraffic:v}))}  label="Live κίνηση"/>
                      <SectionHead icon={<Radio size={11}/>} title="IoT Sensors"/>
                      <Toggle checked={layers.wasteSensors}   onChange={v=>setLayers(p=>({...p,wasteSensors:v}))}   label="Κάδοι απορριμμάτων"/>
                      <Toggle checked={layers.parkingSensors} onChange={v=>setLayers(p=>({...p,parkingSensors:v}))} label="Στάθμευση"/>
                      <Toggle checked={layers.trafficSensors} onChange={v=>setLayers(p=>({...p,trafficSensors:v}))} label="Αισθητήρες κυκλοφορίας"/>
                      <Toggle checked={layers.floodSensors}   onChange={v=>setLayers(p=>({...p,floodSensors:v}))}   label="Αισθητήρες πλημμύρας"/>
                      <Toggle checked={layers.gateways}       onChange={v=>setLayers(p=>({...p,gateways:v}))}       label="Gateways"/>
                      <Toggle checked={showCoverage} onChange={setShowCoverage} label="Εμφάνιση Coverage" sub/>
                      <SectionHead icon={<Globe size={11}/>} title="Περιβάλλον"/>
                      <Toggle checked={layers.floodZones}        onChange={v=>setLayers(p=>({...p,floodZones:v}))}        label="Ζώνες πλημμύρας"/>
                      <Toggle checked={layers.beaches}           onChange={v=>setLayers(p=>({...p,beaches:v}))}           label="Παραλίες"/>
                      <Toggle checked={layers.ships}             onChange={v=>setLayers(p=>({...p,ships:v}))}             label="Πλοία"/>
                      <Toggle checked={layers.marineConditions}  onChange={v=>setLayers(p=>({...p,marineConditions:v}))}  label="Θαλάσσιες συνθήκες"/>
                    </div>
                  )}

                  {/* ─── ROADS TAB ─── */}
                  {activeNav==='roads' && (
                    <div>
                      <button onClick={()=>setShowRoadModal(true)}
                        style={{width:'100%',padding:'8px 12px',background:C.secondary,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:10}}>
                        <Plus size={14}/> Νέος Κλειστός Δρόμος
                      </button>
                      <div style={{display:'flex',gap:4,marginBottom:10}}>
                        {(['all','active','scheduled','completed'] as RoadFilter[]).map(f=>(
                          <button key={f} onClick={()=>setRoadFilter(f)}
                            style={{flex:1,padding:'4px 2px',fontSize:10,fontWeight:600,border:`1px solid ${panelBorder}`,borderRadius:5,cursor:'pointer',background:roadFilter===f?C.navy:'transparent',color:roadFilter===f?'#fff':mutedColor}}>
                            {f==='all'?'Όλοι':f==='active'?'Ενεργοί':f==='scheduled'?'Προγρ.':'Τελεσμ.'}
                          </button>
                        ))}
                      </div>
                      {filteredRoads.length===0 ? (
                        <p style={{color:mutedColor,fontSize:12,textAlign:'center',paddingTop:16}}>Δεν υπάρχουν κλειστοί δρόμοι</p>
                      ) : filteredRoads.map(road=>(
                        <div key={road.id} style={{background:darkMode?'#1E2D40':'#F8FAFC',border:`1px solid ${panelBorder}`,borderRadius:8,padding:10,marginBottom:6}}>
                          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6}}>
                            <div style={{flex:1,minWidth:0}}>
                              <p style={{fontWeight:600,fontSize:13,color:textColor,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{road.road_name}</p>
                              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                                <span style={{fontSize:10,padding:'2px 6px',borderRadius:10,background:road.status==='active'?'#DCFCE7':road.status==='scheduled'?'#FEF3C7':'#F1F5F9',color:road.status==='active'?'#166534':road.status==='scheduled'?'#92400E':'#475569',fontWeight:600}}>
                                  {road.status==='active'?'Ενεργός':road.status==='scheduled'?'Προγρ.':'Ολοκλ.'}
                                </span>
                                <span style={{fontSize:10,color:mutedColor}}>{road.reason}</span>
                              </div>
                              <p style={{fontSize:10,color:mutedColor,margin:'3px 0 0'}}>{road.start_date}{road.end_date?` → ${road.end_date}`:''}</p>
                            </div>
                            <div style={{display:'flex',gap:4,flexShrink:0}}>
                              <button onClick={()=>{if(road.coordinates?.length) mapRef.current?.panTo({lat:road.coordinates[0][1],lng:road.coordinates[0][0]});}}
                                style={{padding:'4px',background:'none',border:`1px solid ${panelBorder}`,borderRadius:4,cursor:'pointer'}} title="Εστίαση">
                                <Eye size={12} color={C.secondary}/>
                              </button>
                              <button onClick={()=>handleDeleteRoad(road.id)}
                                style={{padding:'4px',background:'none',border:`1px solid ${panelBorder}`,borderRadius:4,cursor:'pointer'}} title="Διαγραφή">
                                <Trash2 size={12} color={C.critical}/>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ─── IoT TAB ─── */}
                  {activeNav==='iot' && (
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
                        {([{Icon:Trash2,label:'Κάδοι',value:56,color:'#3B82F6'},{Icon:Car,label:'Θέσεις',value:200,color:'#8B5CF6'},{Icon:Activity,label:'Σηματ.',value:15,color:'#F59E0B'},{Icon:Droplets,label:'Αισθ.',value:25,color:'#06B6D4'}] as {Icon:React.FC<any>;label:string;value:number;color:string}[]).map(kpi=>(
                          <div key={kpi.label} style={{background:darkMode?'#1E2D40':'#F0F9FF',border:`1px solid ${panelBorder}`,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                            <kpi.Icon size={18} color={kpi.color}/>
                            <p style={{fontSize:18,fontWeight:700,color:C.secondary,margin:'2px 0 0'}}>{kpi.value}</p>
                            <p style={{fontSize:10,color:mutedColor,margin:0}}>{kpi.label}</p>
                          </div>
                        ))}
                      </div>
                      <p style={{fontWeight:700,fontSize:12,color:textColor,marginBottom:6}}>Κρίσιμες Ειδοποιήσεις</p>
                      <div style={{marginBottom:12,display:'flex',flexDirection:'column',gap:5}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#FFF5F5',borderRadius:7,border:'1px solid #FECACA',fontSize:12}}>
                          <AlertTriangle size={14} color={C.critical}/>
                          <span style={{color:'#991B1B',fontWeight:500}}>{(iotSensors.waste.length?iotSensors.waste:MOCK_IOT.waste).filter((s:any)=>(s.fill??s.latest_reading?.fill_level_percent??0)>90).length} κάδοι &gt;90%</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#FFFBEB',borderRadius:7,border:'1px solid #FDE68A',fontSize:12}}>
                          <AlertTriangle size={14} color={C.accent}/>
                          <span style={{color:'#92400E',fontWeight:500}}>12 σημεία συμφόρησης</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#F0FDF4',borderRadius:7,border:'1px solid #BBF7D0',fontSize:12}}>
                          <CheckCircle size={14} color={C.success}/>
                          <span style={{color:'#166534',fontWeight:500}}>Αισθητήρες πλημμύρας ΟΚ</span>
                        </div>
                      </div>
                      <a href="/iot" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'9px 0',background:C.navy,color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:600}}>
                        <Radio size={14}/> Άνοιγμα IoT Platform →
                      </a>
                    </div>
                  )}

                  {/* ─── CRISIS TAB ─── */}
                  {activeNav==='crisis' && (
                    <div>
                      {/* Active saved crises */}
                      {savedCrises.filter(c=>c.status==='active').length>0 && (
                        <div style={{marginBottom:10}}>
                          <p style={{fontSize:11,fontWeight:700,color:C.critical,margin:'0 0 6px',display:'flex',alignItems:'center',gap:4}}>
                            <AlertTriangle size={11}/> Ενεργές Κρίσεις ({savedCrises.filter(c=>c.status==='active').length})
                          </p>
                          {savedCrises.filter(c=>c.status==='active').map(c=>(
                            <div key={c.id} style={{background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:8,padding:8,marginBottom:5}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:4}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <p style={{fontWeight:700,fontSize:12,color:C.critical,margin:0}}>{c.label} — {c.result.severity}</p>
                                  <p style={{fontSize:10,color:mutedColor,margin:'2px 0 0'}}>{new Date(c.created_at).toLocaleDateString('el-GR')}</p>
                                </div>
                                <div style={{display:'flex',gap:3,flexShrink:0}}>
                                  <button onClick={()=>handleResolveCrisis(c.id)} title="Επίλυση"
                                    style={{padding:'3px 6px',background:C.success,color:'#fff',border:'none',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
                                    <CheckCircle size={10}/> Επίλυση
                                  </button>
                                  <button onClick={()=>handleDeleteCrisis(c.id)} title="Διαγραφή"
                                    style={{padding:'3px',background:'none',border:'1px solid #FECACA',borderRadius:4,cursor:'pointer'}}>
                                    <Trash2 size={10} color={C.critical}/>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Type selector */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:12}}>
                        {([{t:'flood' as CrisisT,Icon:Droplets,label:'Πλημμύρα'},{t:'fire' as CrisisT,Icon:Flame,label:'Πυρκαγιά'},{t:'earthquake' as CrisisT,Icon:Globe,label:'Σεισμός'},{t:'heatwave' as CrisisT,Icon:Wind,label:'Καύσωνας'},{t:'frost' as CrisisT,Icon:Snowflake,label:'Παγετός'}] as {t:CrisisT;Icon:LucideIcon;label:string}[]).map(({t,Icon,label})=>(
                          <button key={t} onClick={()=>{setCrisisType(t);setSimResult(null);setSimZones([]);}}
                            style={{padding:'7px 4px',border:`1px solid ${crisisType===t?C.secondary:panelBorder}`,borderRadius:7,cursor:'pointer',fontSize:10,fontWeight:crisisType===t?700:500,background:crisisType===t?'#EFF6FF':'transparent',color:crisisType===t?C.secondary:mutedColor,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                            <Icon size={16}/>{label}
                          </button>
                        ))}
                        <div/>
                      </div>

                      {/* Crisis forms */}
                      <div style={{padding:10,background:darkMode?'#1E2D40':'#F8FAFC',borderRadius:8,border:`1px solid ${panelBorder}`,marginBottom:10}}>
                        {crisisType==='flood' && (
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <div>
                              <label style={FORM_LABEL}>Σενάριο</label>
                              {[['moderate','Μέτρια (50mm)'],['strong','Ισχυρή (80mm)'],['extreme','Ακραία (150mm)'],['catastrophic','Καταστροφική (300mm)'],['custom','Custom']].map(([v,l])=>(
                                <label key={v} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',marginBottom:2}}>
                                  <input type="radio" checked={floodLevel===v} onChange={()=>setFloodLevel(v)}/> {l}
                                </label>
                              ))}
                              {floodLevel==='custom' && <input type="number" value={floodMm} onChange={e=>setFloodMm(+e.target.value)} style={{...FORM_INPUT,marginTop:4}} placeholder="mm"/>}
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div><label style={FORM_LABEL}>Διάρκεια (ώρες)</label><input type="number" value={floodDur} onChange={e=>setFloodDur(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Άνεμος km/h</label><input type="number" value={floodWind} onChange={e=>setFloodWind(+e.target.value)} style={FORM_INPUT}/></div>
                            </div>
                            <div><label style={FORM_LABEL}>Κατεύθυνση ανέμου</label><select value={floodWindDir} onChange={e=>setFloodWindDir(e.target.value)} style={FORM_INPUT}>{['N','NE','E','SE','S','SW','W','NW'].map(d=><option key={d}>{d}</option>)}</select></div>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={floodHistory} onChange={e=>setFloodHistory(e.target.checked)}/> Ιστορικά δεδομένα</label>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={floodAI} onChange={e=>setFloodAI(e.target.checked)}/> AI πρόβλεψη 24h</label>
                          </div>
                        )}
                        {crisisType==='fire' && (
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <div><label style={FORM_LABEL}>Είδος πυρκαγιάς</label>{[['forest','Δασική'],['urban','Αστική'],['industrial','Βιομηχανική']].map(([v,l])=><label key={v} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',marginBottom:2}}><input type="radio" checked={fireType===v} onChange={()=>setFireType(v as any)}/> {l}</label>)}</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div><label style={FORM_LABEL}>Άνεμος km/h</label><input type="number" value={fireWind} onChange={e=>setFireWind(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Θερμοκρ. °C</label><input type="number" value={fireTemp} onChange={e=>setFireTemp(+e.target.value)} style={FORM_INPUT}/></div>
                            </div>
                            <div><label style={FORM_LABEL}>Υγρασία %</label><input type="number" value={fireHum} onChange={e=>setFireHum(+e.target.value)} style={FORM_INPUT}/></div>
                            <div><label style={FORM_LABEL}>Επίπεδο ξηρασίας</label>{[['low','Χαμηλή'],['medium','Μέτρια'],['high','Υψηλή']].map(([v,l])=><label key={v} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',marginBottom:2}}><input type="radio" checked={fireDrought===v} onChange={()=>setFireDrought(v as any)}/> {l}</label>)}</div>
                          </div>
                        )}
                        {crisisType==='earthquake' && (
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <div>
                              <label style={FORM_LABEL}>Μέγεθος: {quakeMag.toFixed(1)} Richter</label>
                              <input type="range" min={4} max={8} step={0.1} value={quakeMag} onChange={e=>setQuakeMag(+e.target.value)} style={{width:'100%'}}/>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:mutedColor}}><span>4.0</span><span>8.0</span></div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div><label style={FORM_LABEL}>Βάθος (km)</label><input type="number" value={quakeDepth} onChange={e=>setQuakeDepth(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Έδαφος</label><select value={quakeSoil} onChange={e=>setQuakeSoil(e.target.value as any)} style={FORM_INPUT}><option value="hard">Βραχώδες</option><option value="medium">Μέτριο</option><option value="soft">Μαλακό</option><option value="loose">Χαλαρό</option></select></div>
                            </div>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={quakeTsunami} onChange={e=>setQuakeTsunami(e.target.checked)}/> Tsunami warning</label>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={quakeAftershocks} onChange={e=>setQuakeAftershocks(e.target.checked)}/> Aftershocks simulation</label>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={quakeBuilding} onChange={e=>setQuakeBuilding(e.target.checked)}/> Building collapse model</label>
                          </div>
                        )}
                        {crisisType==='heatwave' && (
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div><label style={FORM_LABEL}>Διάρκεια (ημ.)</label><input type="number" value={heatDays} onChange={e=>setHeatDays(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Αιχμή °C</label><input type="number" value={heatPeak} onChange={e=>setHeatPeak(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Νύχτα °C</label><input type="number" value={heatNight} onChange={e=>setHeatNight(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Υγρασία %</label><input type="number" value={heatHum} onChange={e=>setHeatHum(+e.target.value)} style={FORM_INPUT}/></div>
                            </div>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={heatElderly} onChange={e=>setHeatElderly(e.target.checked)}/> Ηλικιωμένοι (&gt;65)</label>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={heatChildren} onChange={e=>setHeatChildren(e.target.checked)}/> Παιδιά (&lt;12)</label>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={heatChronic} onChange={e=>setHeatChronic(e.target.checked)}/> Χρόνιες παθήσεις</label>
                          </div>
                        )}
                        {crisisType==='frost' && (
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              <div><label style={FORM_LABEL}>Ελάχ. θερμ. °C</label><input type="number" value={frostTemp} onChange={e=>setFrostTemp(+e.target.value)} style={FORM_INPUT}/></div>
                              <div><label style={FORM_LABEL}>Διάρκεια (ώρ.)</label><input type="number" value={frostDur} onChange={e=>setFrostDur(+e.target.value)} style={FORM_INPUT}/></div>
                            </div>
                            <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={frostSnow} onChange={e=>setFrostSnow(e.target.checked)}/> Χιόνι</label>
                            {frostSnow && <div><label style={FORM_LABEL}>Ύψος χιονιού (cm)</label><input type="number" value={frostSnowCm} onChange={e=>setFrostSnowCm(+e.target.value)} style={FORM_INPUT}/></div>}
                          </div>
                        )}
                      </div>

                      {/* Epicenter picker */}
                      <div style={{marginBottom:10}}>
                        <button onClick={()=>setPickingEpicenter(true)} disabled={simRunning}
                          style={{width:'100%',padding:'8px 0',background:crisisEpicenter?'#EFF6FF':'transparent',color:crisisEpicenter?C.secondary:mutedColor,border:`1px dashed ${crisisEpicenter?C.secondary:panelBorder}`,borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                          <Target size={13}/>
                          {crisisEpicenter ? <><MapPin size={13}/>{crisisEpicenter.lat.toFixed(4)}, {crisisEpicenter.lng.toFixed(4)}</> : <><MapPin size={13}/>Επιλογή επικέντρου στον χάρτη</>}
                        </button>
                        {crisisEpicenter && <button onClick={()=>setCrisisEpicenter(null)} style={{width:'100%',padding:'3px 0',background:'none',border:'none',color:mutedColor,fontSize:11,cursor:'pointer',marginTop:2}}><X size={11} style={{display:'inline',verticalAlign:'middle',marginRight:3}}/> Καθαρισμός επικέντρου</button>}
                      </div>

                      {/* Run button */}
                      <button onClick={runSimulation} disabled={simRunning}
                        style={{width:'100%',padding:'10px 0',background:simRunning?'#94A3B8':C.critical,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:simRunning?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:8}}>
                        {simRunning ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Εκτέλεση...</> : <><Play size={15}/> Εκτέλεση Προσομοίωσης</>}
                      </button>

                      {/* Progress */}
                      {simRunning && (
                        <div style={{marginBottom:10}}>
                          <div style={{background:'#E2E8F0',borderRadius:6,height:6,marginBottom:5,overflow:'hidden'}}>
                            <div style={{height:'100%',background:C.secondary,borderRadius:6,width:`${simProgress}%`,transition:'width 0.15s ease'}}/>
                          </div>
                          <p style={{fontSize:10,color:mutedColor,textAlign:'center',margin:'0 0 6px'}}>{simProgress}% ολοκληρώθηκε</p>
                          <div style={{display:'flex',gap:4}}>
                            {!simPaused
                              ? <button onClick={pauseSimulation}  style={{flex:1,padding:'5px 0',background:C.accent,  color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Pause size={11}/> Παύση</button>
                              : <button onClick={resumeSimulation} style={{flex:1,padding:'5px 0',background:C.success, color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Play size={11}/> Συνέχεια</button>}
                            <button onClick={stopSimulation}  style={{flex:1,padding:'5px 0',background:'#6B7280',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Square size={11}/> Διακοπή</button>
                            <button onClick={resetSimulation} style={{flex:1,padding:'5px 0',background:'#EF4444',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><RotateCcw size={11}/> Reset</button>
                          </div>
                        </div>
                      )}

                      {/* Results */}
                      {simResult && (
                        <div style={{background:darkMode?'#1E2D40':'#FFF9F0',border:`1px solid ${C.accent}`,borderRadius:8,padding:12}}>
                          <p style={{fontWeight:700,fontSize:13,color:textColor,margin:'0 0 8px',display:'flex',alignItems:'center',gap:5}}><BarChart2 size={13}/> Αποτελέσματα</p>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                            <div style={{textAlign:'center',padding:'8px',background:darkMode?'#263040':'#fff',borderRadius:6,border:`1px solid ${panelBorder}`}}>
                              <p style={{fontSize:22,fontWeight:800,color:simResult.risk_score>=8?C.critical:simResult.risk_score>=6?C.warning:C.success,margin:0}}>{simResult.risk_score}/10</p>
                              <p style={{fontSize:10,color:mutedColor,margin:0}}>Κίνδυνος</p>
                            </div>
                            <div style={{textAlign:'center',padding:'8px',background:darkMode?'#263040':'#fff',borderRadius:6,border:`1px solid ${panelBorder}`}}>
                              <p style={{fontSize:18,fontWeight:800,color:C.secondary,margin:0}}>{simResult.affected.toLocaleString('el')}</p>
                              <p style={{fontSize:10,color:mutedColor,margin:0}}>Πληγέντες</p>
                            </div>
                          </div>
                          <p style={{fontSize:12,color:textColor,marginBottom:8}}>{simResult.summary}</p>
                          <p style={{fontSize:11,fontWeight:700,color:mutedColor,marginBottom:4,display:'flex',alignItems:'center',gap:4}}><Bot size={12}/> AI Συστάσεις:</p>
                          {simResult.actions.map((a,i)=>(
                            <div key={i} style={{display:'flex',gap:6,fontSize:12,color:textColor,marginBottom:3,alignItems:'flex-start'}}>
                              <span style={{color:C.accent,fontWeight:700,flexShrink:0}}>{i+1}.</span> {a}
                            </div>
                          ))}
                          <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                            <button onClick={handleSaveCrisis} style={{flex:1,padding:'6px 8px',background:C.navy,color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Save size={11}/> Αποθήκευση</button>
                            <button style={{flex:1,padding:'6px 8px',background:'#7C3AED',color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Download size={11}/> PDF</button>
                            <button onClick={async()=>{try{await fetch(`${BACKEND}/announcements/`,{method:'POST',headers:{'Content-Type':'application/json',...authH},body:JSON.stringify({title:'Έκτακτη Ειδοποίηση',content:simResult.summary,is_urgent:true,category:'emergency'})});showToast('Πολίτες ειδοποιήθηκαν!');}catch{showToast('Σφάλμα αποστολής',false);}}}
                              style={{flex:1,padding:'6px 8px',background:C.critical,color:'#fff',border:'none',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><Megaphone size={11}/> Push</button>
                          </div>
                        </div>
                      )}

                      {/* Archive */}
                      {savedCrises.filter(c=>c.status==='resolved').length>0 && (
                        <details style={{marginTop:10}}>
                          <summary style={{fontSize:11,fontWeight:700,color:mutedColor,cursor:'pointer',userSelect:'none',display:'flex',alignItems:'center',gap:4,listStyle:'none'}}>
                            <CheckCircle size={11} color={C.success}/> Αρχείο ({savedCrises.filter(c=>c.status==='resolved').length})
                          </summary>
                          <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4}}>
                            {savedCrises.filter(c=>c.status==='resolved').map(c=>(
                              <div key={c.id} style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:7,padding:7}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <p style={{fontWeight:600,fontSize:11,color:'#166534',margin:0}}>{c.label} — {c.result.severity}</p>
                                    <p style={{fontSize:10,color:mutedColor,margin:'1px 0 0'}}>{new Date(c.created_at).toLocaleDateString('el-GR')}{c.resolved_at&&` → ${new Date(c.resolved_at).toLocaleDateString('el-GR')}`}</p>
                                  </div>
                                  <button onClick={()=>handleDeleteCrisis(c.id)} style={{padding:'3px',background:'none',border:'none',cursor:'pointer',opacity:0.5}}><Trash2 size={10} color={C.muted}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* ─── SETTINGS TAB ─── */}
                  {activeNav==='settings' && (
                    <div>
                      <div style={{marginBottom:14}}>
                        <label style={{...FORM_LABEL,marginBottom:6,fontSize:12}}>Στυλ χάρτη</label>
                        {[['roadmap','Οδικός'],['satellite','Satellite'],['hybrid','Hybrid'],['terrain','Terrain']].map(([v,l])=>(
                          <label key={v} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginBottom:4}}>
                            <input type="radio" checked={mapType===v} onChange={()=>setMapType(v)}/> {l}
                          </label>
                        ))}
                      </div>
                      <div style={{marginBottom:14}}>
                        <label style={{...FORM_LABEL,marginBottom:6,fontSize:12}}>Auto-refresh</label>
                        <select value={autoRefresh} onChange={e=>setAutoRefresh(+e.target.value)} style={FORM_INPUT}>
                          <option value={0}>Απενεργοποιημένο</option>
                          <option value={15}>15 δευτ.</option>
                          <option value={30}>30 δευτ.</option>
                          <option value={60}>1 λεπτό</option>
                          <option value={300}>5 λεπτά</option>
                        </select>
                      </div>
                      <Toggle checked={darkMode} onChange={setDarkMode} label="Dark Mode (panel only)"/>
                      <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${panelBorder}`}}>
                        <p style={{fontSize:11,fontWeight:700,color:mutedColor,marginBottom:6}}>ΠΛΗΡΟΦΟΡΙΕΣ</p>
                        <p style={{fontSize:11,color:mutedColor,lineHeight:1.5}}>Δήμος Ηρακλείου — Ψηφιακό Δίδυμο v3.0</p>
                        <p style={{fontSize:11,color:mutedColor}}>Backend: {BACKEND.replace('https://','')}</p>
                      </div>
                    </div>
                  )}

                </div>{/* end dt-pbody */}
              </div>
            )}{/* end panel */}

            {/* ── Floating Layers Button / Panel ── */}
            {!layersPanelOpen ? (
              <button className="dt-floating-btn dt-layers-btn" onClick={() => setLayersPanelOpen(true)}>
                <Layers size={18}/>
                <span className="dt-floating-label">Layers</span>
              </button>
            ) : (
              <div className="dt-layers-panel">
                <div className="dt-lp-header">
                  <Layers size={16}/>
                  <span>Επίπεδα Χάρτη</span>
                  <button className="dt-close-btn" onClick={() => setLayersPanelOpen(false)}>
                    <X size={16}/>
                  </button>
                </div>
                <div className="dt-lp-content">
                  <div className="dt-lp-group">
                    <h4><Car size={14}/> Κυκλοφορία</h4>
                    <ToggleRow icon={<Activity size={14}/>} label="Live κίνηση" subtitle="Πραγματικά χρώματα TomTom" checked={layers.liveTraffic} onChange={() => toggleLayer('liveTraffic')}/>
                    <ToggleRow icon={<Construction size={14}/>} label="Κλειστοί δρόμοι" checked={layers.closedRoads} onChange={() => toggleLayer('closedRoads')}/>
                    <ToggleRow icon={<AlertTriangle size={14}/>} label="Συμβάντα κίνησης" checked={layers.trafficIncidents} onChange={() => toggleLayer('trafficIncidents')}/>
                  </div>
                  <div className="dt-lp-group">
                    <h4><Radio size={14}/> IoT Sensors</h4>
                    <ToggleRow icon={<Trash2 size={14}/>} label="Κάδοι" checked={layers.wasteSensors} onChange={() => toggleLayer('wasteSensors')}/>
                    <ToggleRow icon={<Car size={14}/>} label="Στάθμευση" checked={layers.parkingSensors} onChange={() => toggleLayer('parkingSensors')}/>
                    <ToggleRow icon={<TrafficCone size={14}/>} label="Αισθητήρες κυκλοφορίας" checked={layers.trafficSensors} onChange={() => toggleLayer('trafficSensors')}/>
                    <ToggleRow icon={<Droplets size={14}/>} label="Αισθητήρες πλημμύρας" checked={layers.floodSensors} onChange={() => toggleLayer('floodSensors')}/>
                    <ToggleRow icon={<Wifi size={14}/>} label="Gateways" checked={layers.gateways} onChange={() => toggleLayer('gateways')}/>
                  </div>
                  <div className="dt-lp-group">
                    <h4><Users size={14}/> Πολίτες</h4>
                    <ToggleRow icon={<ClipboardList size={14}/>} label="Αναφορές" checked={layers.reports} onChange={() => toggleLayer('reports')}/>
                    <ToggleRow icon={<Flame size={14}/>} label="Heatmap αναφορών" checked={layers.reportHeatmap} onChange={() => toggleLayer('reportHeatmap')}/>
                  </div>
                  <div className="dt-lp-group">
                    <h4><Globe size={14}/> Περιβάλλον</h4>
                    <ToggleRow icon={<Droplets size={14}/>} label="Ζώνες πλημμύρας" checked={layers.floodZones} onChange={() => toggleLayer('floodZones')}/>
                    <ToggleRow icon={<Sun size={14}/>} label="Παραλίες" checked={layers.beaches} onChange={() => toggleLayer('beaches')}/>
                    <ToggleRow icon={<Ship size={14}/>} label="Πλοία" checked={layers.ships} onChange={() => toggleLayer('ships')}/>
                    <ToggleRow icon={<Wind size={14}/>} label="Θαλάσσιες συνθήκες" checked={layers.marineConditions} onChange={() => toggleLayer('marineConditions')}/>
                    <ToggleRow icon={<Leaf size={14}/>} label="Γύρη & Αλλεργίες" checked={layers.pollenZones} onChange={() => toggleLayer('pollenZones')}/>
                  </div>
                  <button className="dt-lp-reset" onClick={resetLayers}>
                    <RotateCcw size={14}/> Επαναφορά
                  </button>
                </div>
              </div>
            )}

            {/* ── External Data Widgets (bottom-right, compact horizontal row) ── */}
            <div className="dt-external-widgets">
              {externalData.marine && (
                <div
                  className={`dt-ext-widget marine ${externalData.marine.swim_status ?? ''}${expandedWidget === 'marine' ? ' expanded' : ''}`}
                  onClick={() => toggleWidget('marine')}
                >
                  <div className="dt-ext-header-mini">
                    <Waves size={14}/>
                    <span>Θαλ. Συνθήκες</span>
                    {externalData.marine.swim_status === 'ok'        && <CheckCircle size={13} color="#00C853"/>}
                    {externalData.marine.swim_status === 'caution'   && <AlertTriangle size={13} color="#FFA500"/>}
                    {externalData.marine.swim_status === 'forbidden' && <AlertTriangle size={13} color="#FF3D00"/>}
                  </div>
                  {expandedWidget === 'marine' && (
                    <div className="dt-ext-body">
                      <div>Κύμα: <strong>{Number(externalData.marine.wave_height_m ?? 0).toFixed(1)}m</strong></div>
                      <div>Άνεμος: <strong>{Number(externalData.marine.wind_speed_kmh ?? 0).toFixed(0)} km/h</strong></div>
                      <div style={{marginTop:6,fontWeight:600,fontSize:11,color:externalData.marine.swim_status==='ok'?'#2E7D32':externalData.marine.swim_status==='forbidden'?'#C62828':'#E65100'}}>
                        {externalData.marine.swim_status === 'ok' && '✓ Κολύμβηση επιτρέπεται'}
                        {externalData.marine.swim_status === 'caution' && '⚠ Προσοχή'}
                        {externalData.marine.swim_status === 'forbidden' && '🚫 Απαγόρευση'}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {externalData.uv && (
                <div
                  className={`dt-ext-widget uv level-${externalData.uv.level ?? ''}${expandedWidget === 'uv' ? ' expanded' : ''}`}
                  onClick={() => toggleWidget('uv')}
                >
                  <div className="dt-ext-header-mini">
                    <Sun size={14}/>
                    <span>UV {Number(externalData.uv.uv_index_current ?? 0).toFixed(0)}/12</span>
                  </div>
                  {expandedWidget === 'uv' && (
                    <div className="dt-ext-body">
                      <div className="dt-ext-label">{String(externalData.uv.level ?? '').replace('_', ' ')}</div>
                      <div className="dt-ext-advice">{externalData.uv.advice}</div>
                    </div>
                  )}
                </div>
              )}
              {externalData.ships && (
                <div
                  className={`dt-ext-widget ships${expandedWidget === 'ships' ? ' expanded' : ''}`}
                  onClick={() => toggleWidget('ships')}
                >
                  <div className="dt-ext-header-mini">
                    <Ship size={14}/>
                    <span>Πλοία</span>
                    <span className="dt-ext-count-mini">{externalData.ships.total_today ?? 0}</span>
                  </div>
                  {expandedWidget === 'ships' && (
                    <div className="dt-ext-body">
                      <div>Επιβάτες: <strong>{Number(externalData.ships.total_passengers ?? 0).toLocaleString('el-GR')}</strong></div>
                      {(externalData.ships.ships ?? []).slice(0, 3).map((ship: any) => (
                        <div key={ship.id} style={{borderTop:'1px solid #f0f0f0',paddingTop:3,marginTop:3}}>
                          <strong>{ship.name}</strong> · {ship.arrival}–{ship.departure}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {externalData.beaches && (
                <div
                  className={`dt-ext-widget beaches${expandedWidget === 'beaches' ? ' expanded' : ''}`}
                  onClick={() => toggleWidget('beaches')}
                >
                  <div className="dt-ext-header-mini">
                    <Sun size={14}/>
                    <span>Παραλίες</span>
                  </div>
                  {expandedWidget === 'beaches' && (
                    <div className="dt-ext-body">
                      {(externalData.beaches.beaches ?? []).map((beach: any) => (
                        <div key={beach.id}>
                          <span className={`dt-beach-dot ${beach.swimming_status ?? ''}`}/>
                          <strong>{beach.name}</strong>
                          <span style={{marginLeft:6,fontSize:10,color:'#888'}}>{beach.quality}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {externalData.pollen && externalData.pollen.alerts?.length > 0 && (
                <div
                  className={`dt-ext-widget pollen-alert${expandedWidget === 'pollen' ? ' expanded' : ''}`}
                  onClick={() => toggleWidget('pollen')}
                >
                  <div className="dt-ext-header-mini">
                    <Leaf size={14}/>
                    <span>Γύρη ⚠</span>
                  </div>
                  {expandedWidget === 'pollen' && (
                    <div className="dt-ext-body">
                      {externalData.pollen.alerts.map((a: any, i: number) => (
                        <div key={i} className="dt-ext-alert">{a.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Floating KPI Cards ── */}
            <div className="dt-kpis">
              {kpis.map(k=>(
                <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} change={k.change} gradient={k.gradient}/>
              ))}
            </div>

            {/* ── Mini Charts (always visible, top-right) ── */}
            <div className="dt-charts">
              <BarMiniChart title="Ανάλυση Κίνησης"       data={trafficChartData} labels={trafficChartLabels} color={C.accent}/>
              <LineMiniChart title="Κατανάλωση Ενέργειας" data={energyData} color="#FF6B35"/>
            </div>

            {/* ── Traffic: floating button or full widget ── */}
            {layers.liveTraffic && trafficIncidents.length > 0 && (
              trafficListOpen ? (
                <div className="dt-traffic-list-widget">
                  <div className="dt-tl-header">
                    <Activity size={15}/>
                    <span style={{flex:1}}>Συμφόρηση Κίνησης ({trafficIncidents.length})</span>
                    <button className="dt-close-btn" onClick={() => setTrafficListOpen(false)} style={{color:'rgba(255,255,255,0.7)'}}>
                      <X size={15}/>
                    </button>
                  </div>
                  <div className="dt-tl-items">
                    {trafficIncidents.map(inc => (
                      <div key={inc.id} className="dt-tl-item"
                        style={{borderLeftColor: inc.severity === 'red' ? C.critical : C.warning}}
                        onClick={() => { mapRef.current?.panTo(inc.coordinates); mapRef.current?.setZoom(16); }}>
                        <AlertTriangle size={18} color={inc.severity === 'red' ? C.critical : C.warning} style={{flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p className="dt-tl-street">{inc.street_name}</p>
                          <p className="dt-tl-delay">{inc.delay_minutes>0&&`Καθυστ. ${inc.delay_minutes} λεπτά`}{inc.delay_minutes>0&&inc.length_km>0&&' · '}{inc.length_km>0&&`${inc.length_km.toFixed(1)} km`}</p>
                        </div>
                        <ChevronRight size={13} color={C.muted} style={{flexShrink:0}}/>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button className="dt-floating-btn dt-traffic-btn" onClick={() => setTrafficListOpen(true)}>
                  <Activity size={18}/>
                  <span className="dt-floating-label">Κίνηση</span>
                  <span style={{position:'absolute',top:-6,right:-6,background:C.critical,color:'#fff',borderRadius:'50%',width:18,height:18,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{trafficIncidents.length}</span>
                </button>
              )
            )}

            {/* ── Epicenter picking overlay ── */}
            {pickingEpicenter && (
              <div style={{position:'absolute',top:48,left:0,right:0,zIndex:150,display:'flex',justifyContent:'center',pointerEvents:'none'}}>
                <div style={{background:'rgba(30,58,95,0.93)',color:'#fff',padding:'9px 20px',borderRadius:9,fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:10,pointerEvents:'auto',boxShadow:'0 4px 16px rgba(0,0,0,0.3)',marginTop:8}}>
                  <Target size={16}/> Κάντε κλικ στον χάρτη για επίκεντρο
                  <button onClick={()=>setPickingEpicenter(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',padding:'3px 12px',borderRadius:5,cursor:'pointer',fontSize:12,marginLeft:8}}>Άκυρο</button>
                </div>
              </div>
            )}

            {/* ── Google Map ── */}
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{width:'100%',height:'100%'}}
                center={CENTER} zoom={14}
                mapTypeId={mapType as google.maps.MapTypeId}
                options={{disableDefaultUI:true,gestureHandling:'greedy',draggableCursor:pickingEpicenter?'crosshair':undefined}}
                onLoad={m=>{mapRef.current=m;}}
                onClick={e=>{if(pickingEpicenter&&e.latLng){setCrisisEpicenter({lat:e.latLng.lat(),lng:e.latLng.lng()});setPickingEpicenter(false);}}}
              >
                {layers.liveTraffic && <TrafficLayer/>}

                {layers.reports && reports.map((r,i)=>(
                  <Circle key={`rep-${r.id??i}`} center={{lat:r.lat,lng:r.lng}} radius={120}
                    options={{strokeColor:C.secondary,strokeWeight:1,strokeOpacity:0.7,fillColor:C.secondary,fillOpacity:0.25}}/>
                ))}

                {layers.floodZones && FLOOD_ZONES.map(fz=>(
                  <Polygon key={fz.name} paths={fz.ring}
                    options={{strokeColor:C.secondary,strokeWeight:2,strokeOpacity:0.8,fillColor:C.secondary,fillOpacity:0.15}}/>
                ))}

                {simZones.map((z,i)=>(
                  <Circle key={`sz-${i}`} center={z.center} radius={z.radius}
                    options={{strokeColor:(zoneColors as any)[z.level],strokeWeight:2,strokeOpacity:0.8,fillColor:(zoneColors as any)[z.level],fillOpacity:0.12}}/>
                ))}

                {crisisEpicenter && (
                  <Marker position={crisisEpicenter}
                    icon={{url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#FF3D00" fill-opacity="0.22"/><circle cx="22" cy="22" r="13" fill="#FF3D00" fill-opacity="0.45"/><circle cx="22" cy="22" r="7" fill="#FF3D00"/><circle cx="22" cy="22" r="3" fill="white"/></svg>'),scaledSize:new google.maps.Size(44,44),anchor:new google.maps.Point(22,22)}}
                    title="Επίκεντρο"/>
                )}

                {layers.closedRoads && closedRoads.filter(r=>r.status==='active').map(r=>
                  r.coordinates&&r.coordinates.length>=2
                    ? <Polyline key={r.id} path={r.coordinates.map(([lng,lat])=>({lat,lng}))} options={{strokeColor:C.critical,strokeWeight:5,strokeOpacity:0.85}}/>
                    : null
                )}

                {layers.wasteSensors && (iotSensors.waste.length?iotSensors.waste:MOCK_IOT.waste).map((s:any)=>(
                  <Marker key={`bin-${s.id}`} position={{lat:s.lat??s.latitude,lng:s.lng??s.longitude}}
                    onClick={()=>setSelected({type:'sensor',subtype:'waste',data:s})}
                    icon={{path:google.maps.SymbolPath.CIRCLE,scale:9,fillColor:(s.fill??0)>90?C.critical:(s.fill??0)>70?C.warning:C.success,fillOpacity:1,strokeColor:'#fff',strokeWeight:2}}
                    title={`Κάδος ${s.id}: ${s.fill??0}%`}/>
                ))}

                {layers.parkingSensors && (iotSensors.parking.length?iotSensors.parking:MOCK_IOT.parking).map((s:any)=>(
                  <Marker key={`prk-${s.id}`} position={{lat:s.lat??s.latitude,lng:s.lng??s.longitude}}
                    onClick={()=>setSelected({type:'sensor',subtype:'parking',data:s})}
                    icon={{path:google.maps.SymbolPath.CIRCLE,scale:9,fillColor:s.occupied===s.total?C.critical:s.occupied/s.total>0.8?C.warning:C.success,fillOpacity:1,strokeColor:'#fff',strokeWeight:2}}
                    title={`Parking ${s.id}: ${s.occupied}/${s.total}`}/>
                ))}

                {layers.floodSensors && (iotSensors.flood.length?iotSensors.flood:MOCK_IOT.flood).map((s:any)=>(
                  <Marker key={`fld-${s.id}`} position={{lat:s.lat??s.latitude,lng:s.lng??s.longitude}}
                    onClick={()=>setSelected({type:'sensor',subtype:'flood',data:s})}
                    icon={{path:google.maps.SymbolPath.CIRCLE,scale:9,fillColor:s.risk==='high'?C.critical:s.risk==='medium'?C.warning:C.success,fillOpacity:1,strokeColor:'#fff',strokeWeight:2}}
                    title={`Flood ${s.id}: ${s.level}cm`}/>
                ))}

                {layers.beaches && (externalData.beaches?.beaches ?? []).map((beach: any) => (
                  <Marker
                    key={`beach-${beach.id}`}
                    position={{ lat: beach.latitude, lng: beach.longitude }}
                    onClick={() => setSelectedBeach(beach)}
                    icon={{
                      url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="${beach.swimming_status==='ok'?'#00C853':beach.swimming_status==='caution'?'#FFA500':'#FF3D00'}" opacity="0.9"/><text x="18" y="23" font-size="18" text-anchor="middle">🏖️</text></svg>`),
                      scaledSize: new google.maps.Size(36, 36),
                    }}
                    title={beach.name}
                  />
                ))}

                {selectedBeach && (
                  <InfoWindow position={{ lat: selectedBeach.latitude, lng: selectedBeach.longitude }} onCloseClick={() => setSelectedBeach(null)}>
                    <div style={{ fontSize:13, minWidth:140, color:C.text, lineHeight:1.6 }}>
                      <strong>🏖️ {selectedBeach.name}</strong><br/>
                      Κατάσταση: {selectedBeach.swimming_status}<br/>
                      Ποιότητα: {selectedBeach.quality}
                    </div>
                  </InfoWindow>
                )}

                {layers.ships && (externalData.ships?.ships ?? []).map((ship: any) => (
                  <Marker
                    key={`ship-${ship.id}`}
                    position={{ lat: ship.latitude, lng: ship.longitude }}
                    onClick={() => setSelectedShip(ship)}
                    icon={{
                      url: 'data:image/svg+xml;utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#1E3A5F" opacity="0.9"/><text x="20" y="26" font-size="20" text-anchor="middle">🚢</text></svg>`),
                      scaledSize: new google.maps.Size(40, 40),
                    }}
                    title={ship.name}
                  />
                ))}

                {selectedShip && (
                  <InfoWindow position={{ lat: selectedShip.latitude, lng: selectedShip.longitude }} onCloseClick={() => setSelectedShip(null)}>
                    <div style={{ fontSize:13, minWidth:150, color:C.text, lineHeight:1.6 }}>
                      <strong>🚢 {selectedShip.name}</strong><br/>
                      Άφιξη: {selectedShip.arrival}<br/>
                      Αναχώρηση: {selectedShip.departure}
                    </div>
                  </InfoWindow>
                )}

                {layers.gateways && gateways.map(gw=>(
                  <React.Fragment key={`gw-${gw.id}`}>
                    {showCoverage && <Circle center={{lat:gw.latitude,lng:gw.longitude}} radius={gw.coverage_radius_m} options={{strokeColor:gwColor(gw.status),strokeWeight:2,strokeOpacity:0.5,fillColor:gwColor(gw.status),fillOpacity:0.07}}/>}
                    <Marker position={{lat:gw.latitude,lng:gw.longitude}} onClick={()=>setSelected({type:'gateway',data:gw})}
                      icon={{path:google.maps.SymbolPath.CIRCLE,scale:13,fillColor:gwColor(gw.status),fillOpacity:1,strokeColor:'#fff',strokeWeight:3}}
                      title={gw.name}/>
                  </React.Fragment>
                ))}

                {selected&&selected.type==='sensor' && (
                  <InfoWindow position={{lat:selected.data.lat??selected.data.latitude,lng:selected.data.lng??selected.data.longitude}} onCloseClick={()=>setSelected(null)}>
                    <div style={{fontSize:13,minWidth:140,color:C.text,lineHeight:1.6}}>
                      {selected.subtype==='waste'   && <><strong><Trash2 size={12} style={{display:'inline',verticalAlign:'text-bottom',marginRight:3}}/>{selected.data.id}</strong><br/>Γέμισμα: {selected.data.fill??0}%</>}
                      {selected.subtype==='parking' && <><strong><Car size={12} style={{display:'inline',verticalAlign:'text-bottom',marginRight:3}}/>{selected.data.id}</strong><br/>Κατειλημμένο: {selected.data.occupied}/{selected.data.total}</>}
                      {selected.subtype==='flood'   && <><strong><Droplets size={12} style={{display:'inline',verticalAlign:'text-bottom',marginRight:3}}/>{selected.data.id}</strong><br/>Επίπεδο: {selected.data.level}cm | {selected.data.risk}</>}
                    </div>
                  </InfoWindow>
                )}
                {selected&&selected.type==='gateway' && (
                  <InfoWindow position={{lat:selected.data.latitude,lng:selected.data.longitude}} onCloseClick={()=>setSelected(null)}>
                    <div style={{fontSize:13,minWidth:160,color:C.text,lineHeight:1.6}}>
                      <strong><Building2 size={12} style={{display:'inline',verticalAlign:'text-bottom',marginRight:3}}/>{selected.data.name}</strong><br/>
                      ID: {selected.data.gateway_id}<br/>Πρωτόκολλο: {selected.data.protocol}<br/>Κατάσταση: {selected.data.status}<br/>Συσκευές: {selected.data.connected_sensors??0}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#E8EEF4',color:C.muted,fontSize:14}}>
                <Loader2 size={20} style={{marginRight:8,animation:'spin 1s linear infinite'}}/> Φόρτωση χάρτη...
              </div>
            )}

            {/* ── Map Legend ── */}
            <div className="dt-legend">
              <h4>Υπόμνημα</h4>
              <div className="dt-li"><span className="dt-ld" style={{background:C.success}}/> Λειτουργικό</div>
              <div className="dt-li"><span className="dt-ld" style={{background:C.warning}}/> Προειδοποίηση</div>
              <div className="dt-li"><span className="dt-ld" style={{background:C.critical}}/> Κρίσιμο</div>
              <div className="dt-li"><span className="dt-ld" style={{background:C.secondary}}/> Αναφορές</div>
            </div>

            {/* ── Map Controls ── */}
            <div className="dt-ctrl">
              <button className="dt-cb" title="Zoom In"     onClick={()=>mapRef.current?.setZoom((mapRef.current.getZoom()??14)+1)}><Plus size={14}/></button>
              <button className="dt-cb" title="Zoom Out"    onClick={()=>mapRef.current?.setZoom((mapRef.current.getZoom()??14)-1)}><Minus size={14}/></button>
              <button className="dt-cb" title="Κέντρο"     onClick={()=>mapRef.current?.panTo(CENTER)}><RotateCcw size={14}/></button>
              <button className="dt-cb" title="Fullscreen"  onClick={()=>{const el=document.documentElement;if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();}}><Maximize2 size={14}/></button>
              <button className="dt-cb" title="Screenshot"  onClick={()=>alert('Screenshot — χρησιμοποιήστε browser capture')}><Camera size={14}/></button>
            </div>

            {/* ── Action Bar ── */}
            <div className="dt-abar">
              <button className="dt-ab" onClick={()=>{setActiveNav('roads');setShowRoadModal(true);}}><Construction size={13}/> Κλειστός Δρόμος</button>
              <button className="dt-ab" onClick={async()=>{const t=window.prompt('Θέμα ανακοίνωσης:');if(!t)return;try{await fetch(`${BACKEND}/announcements/`,{method:'POST',headers:{'Content-Type':'application/json',...authH},body:JSON.stringify({title:t,content:t,is_important:true,category:'general'})});showToast('Ανακοίνωση δημιουργήθηκε!');}catch{showToast('Σφάλμα',false);}}}><Megaphone size={13}/> Ανακοίνωση</button>
              <button className="dt-ab" onClick={()=>setActiveNav('crisis')}><AlertTriangle size={13}/> Νέα Κρίση</button>
              <button className="dt-ab" onClick={()=>showToast('PDF report — coming soon')}><FileText size={13}/> Report PDF</button>
            </div>

          </div>{/* end dt-map */}

          {/* ── Right Sidebar Toggle ── */}
          <button
            className="dt-right-toggle"
            onClick={() => setRightSidebarOpen(p => !p)}
            title={rightSidebarOpen ? 'Απόκρυψη sidebar' : 'Εμφάνιση sidebar'}
          >
            {rightSidebarOpen ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            {!rightSidebarOpen && <span className="dt-toggle-label">Πάνελ</span>}
          </button>

          {/* ── Right Sidebar ── */}
          <aside className="dt-right-sidebar dt-sidebar">

            {/* Report Stats */}
            {reportStats.total>0 && (
              <div>
                <p className="dt-sh"><FileText size={13}/> Αναφορές</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:6}}>
                  {([{label:'Σύνολο',value:reportStats.total,color:C.secondary},{label:'Εκκρεμείς',value:reportStats.pending,color:C.warning},{label:'Σε εξέλιξη',value:reportStats.in_progress,color:C.accent},{label:'Επιλυμένες',value:reportStats.resolved,color:C.success}]).map(s=>(
                    <div key={s.label} style={{textAlign:'center',padding:'6px 4px',background:'#F8FAFC',borderRadius:7,border:`1px solid ${C.border}`}}>
                      <p style={{fontSize:18,fontWeight:800,color:s.color,margin:0}}>{s.value}</p>
                      <p style={{fontSize:9,color:C.muted,margin:0}}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.muted}}>
                  <span>Σήμερα: <strong style={{color:C.text}}>{reportStats.today}</strong></span>
                  <span>Εβδομάδα: <strong style={{color:C.text}}>{reportStats.this_week}</strong></span>
                </div>
              </div>
            )}

            {/* Live Alerts */}
            <div>
              <p className="dt-sh"><Bell size={13}/> Live Alerts</p>
              {alerts.length>0 ? (
                alerts.map(a=>(
                  <div key={a.id} className={`dt-alc${a.level==='warning'?' w':a.level==='info'?' i':''}`}
                    onClick={()=>a.lat&&mapRef.current?.panTo({lat:a.lat!,lng:a.lng!})}>
                    <div className="dt-alct">{a.text}</div>
                    <div className="dt-alcm">{a.level==='critical'?'Κρίσιμο':a.level==='warning'?'Προειδοποίηση':'Πληροφορία'}</div>
                  </div>
                ))
              ) : (
                <div style={{textAlign:'center',padding:'12px 0',color:C.muted,fontSize:12}}>
                  <CheckCircle size={18} style={{opacity:0.4,marginBottom:4}}/><br/>Δεν υπάρχουν ενεργές ειδοποιήσεις
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <p className="dt-sh"><Activity size={13}/> Πρόσφατες Δραστηριότητες</p>
              {activities.length>0 ? (
                activities.map(a=>(
                  <div key={a.id} className="dt-act">
                    <div className="dt-aci" style={{background:a.color+'22',color:a.color}}>{a.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="dt-acl">{a.title}</div>
                      <div className="dt-acm">{a.time}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{fontSize:12,color:C.muted,textAlign:'center',padding:'8px 0'}}>Καμία πρόσφατη δραστηριότητα</p>
              )}
            </div>

            {/* Gauges */}
            <div>
              <p className="dt-sh"><BarChart2 size={13}/> Live Gauges</p>
              <div className="dt-gauges">
                <SemiGauge value={trafficLoad} color={trafficLoad>60?C.critical:trafficLoad>30?C.warning:C.success} label="Κίνηση" status={trafficLoad>60?'Συμφόρηση':trafficLoad>30?'Μέτρια':'Ομαλή'}/>
                <SemiGauge value={iotOnlinePct} color={iotOnlinePct>80?C.success:iotOnlinePct>50?C.warning:C.critical} label="IoT Online" status={iotOnlinePct>80?'Καλό':iotOnlinePct>50?'Μέτριο':'Χαμηλό'}/>
              </div>
            </div>

            {/* Snapshot extras */}
            {snapshot && (
              <div>
                <p className="dt-sh"><Globe size={13}/> Στατιστικά</p>
                {([
                  ['Σύνολο αναφορών', snapshot.total_reports ?? '—'],
                  ['Ανοιχτές',        snapshot.open_reports  ?? '—'],
                  ['IoT Συσκευές',    Array.isArray(snapshot.iot_devices) ? snapshot.iot_devices.length : (typeof snapshot.iot_devices === 'object' && snapshot.iot_devices !== null ? Object.values(snapshot.iot_devices as Record<string,any[]>).reduce((s,a) => s + (Array.isArray(a)?a.length:1), 0) : snapshot.iot_devices ?? '—')],
                  ['Ενεργά alerts',   snapshot.active_alerts ?? '—'],
                ] as [string, any][]).map(([k, v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                    <span style={{color:C.muted}}>{k}</span>
                    <span style={{fontWeight:600,color:C.text}}>{typeof v === 'object' && v !== null ? '—' : String(v)}</span>
                  </div>
                ))}
              </div>
            )}

          </aside>{/* end sidebar */}

        </div>{/* end dt-content */}

        {/* ══ ROAD MODAL ══ */}
        {showRoadModal && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
               onClick={e=>{if(e.target===e.currentTarget)setShowRoadModal(false);}}>
            <div style={{background:'#fff',borderRadius:14,padding:24,width:'100%',maxWidth:460,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.navy,display:'flex',alignItems:'center',gap:6}}><Construction size={15}/> Νέος Κλειστός Δρόμος</h2>
                <button onClick={()=>setShowRoadModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:C.muted}}><X size={18}/></button>
              </div>
              <div style={{marginBottom:12}}>
                <label style={FORM_LABEL}>Οδός *</label>
                {isLoaded ? (
                  <Autocomplete onLoad={ac=>{roadAcRef.current=ac;}} onPlaceChanged={()=>{const place=roadAcRef.current?.getPlace();const loc=place?.geometry?.location;const name=place?.name??place?.formatted_address??'';setNewRoad(p=>({...p,road_name:name,coordinates:loc?[[loc.lng(),loc.lat()]]:p.coordinates}));}} options={{componentRestrictions:{country:'gr'},types:['address','route'],bounds:{north:35.40,south:35.28,east:25.25,west:25.05},strictBounds:true}}>
                    <input value={newRoad.road_name} onChange={e=>setNewRoad(p=>({...p,road_name:e.target.value}))} placeholder="Αναζήτηση οδού..." style={{...FORM_INPUT,padding:'9px 12px',fontSize:14}}/>
                  </Autocomplete>
                ) : (
                  <input value={newRoad.road_name} onChange={e=>setNewRoad(p=>({...p,road_name:e.target.value}))} placeholder="πχ. Λεωφ. Ικάρου" style={{...FORM_INPUT,padding:'9px 12px',fontSize:14}}/>
                )}
                {newRoad.coordinates && <p style={{fontSize:11,color:C.success,marginTop:3,display:'flex',alignItems:'center',gap:4}}><MapPin size={11}/> {newRoad.coordinates[0][1].toFixed(5)}, {newRoad.coordinates[0][0].toFixed(5)}</p>}
              </div>
              <div style={{marginBottom:12}}>
                <label style={FORM_LABEL}>Αιτία *</label>
                <select value={newRoad.reason} onChange={e=>setNewRoad(p=>({...p,reason:e.target.value}))} style={{...FORM_INPUT,padding:'8px 10px'}}>
                  {['Έργα','Ατύχημα','Εκδήλωση','Έκτακτο','Συντήρηση'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <div><label style={FORM_LABEL}>Από</label><input type="date" value={newRoad.start_date} onChange={e=>setNewRoad(p=>({...p,start_date:e.target.value}))} style={{...FORM_INPUT,padding:'8px 10px'}}/></div>
                <div><label style={FORM_LABEL}>Έως</label><input type="date" value={newRoad.end_date} onChange={e=>setNewRoad(p=>({...p,end_date:e.target.value}))} style={{...FORM_INPUT,padding:'8px 10px'}}/></div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={FORM_LABEL}>Περιγραφή</label>
                <textarea value={newRoad.description} onChange={e=>setNewRoad(p=>({...p,description:e.target.value}))} rows={2} style={{...FORM_INPUT,resize:'vertical' as const,minHeight:56}} placeholder="Προαιρετικές λεπτομέρειες..."/>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginBottom:8}}><input type="checkbox" checked={newRoad.create_announcement} onChange={e=>setNewRoad(p=>({...p,create_announcement:e.target.checked}))}/>Αυτόματη δημιουργία ανακοίνωσης</label>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginBottom:16}}><input type="checkbox" checked={newRoad.is_urgent} onChange={e=>setNewRoad(p=>({...p,is_urgent:e.target.checked}))}/>Επείγον</label>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button onClick={()=>setShowRoadModal(false)} style={{padding:'9px 18px',border:`1px solid ${C.border}`,borderRadius:8,background:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:C.muted}}>Άκυρο</button>
                <button onClick={handleCreateRoad} disabled={submittingRoad||!newRoad.road_name} style={{padding:'9px 20px',background:C.secondary,color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700,opacity:(!newRoad.road_name||submittingRoad)?0.5:1}}>
                  {submittingRoad?'Αποθήκευση...':'Κλείσιμο Δρόμου'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ TOAST ══ */}
        {toast.show && (
          <div style={{position:'fixed',bottom:24,right:24,zIndex:3000,padding:'10px 20px',background:toast.ok?C.success:C.critical,color:'#fff',borderRadius:10,fontWeight:600,fontSize:13,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>
            {toast.msg}
          </div>
        )}

      </div>{/* end dt-root */}
    </>
  );
};

export default DigitalTwin;

