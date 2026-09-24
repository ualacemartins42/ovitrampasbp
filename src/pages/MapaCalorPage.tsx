import L from 'leaflet'
import 'leaflet.heat'
import { Flame, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { BARRA_DO_PIRAI_DISTRITO_OPTIONS } from '@/constants/bairros'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { BARRA_DO_PIRAI_CENTER } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import {
  defaultHeatDateRange,
  loadHeatmapPoints,
  matchesHeatFilters,
  type ContaOvosHeatPoint,
} from '@/services/contaOvosService'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

function leafletIcon() {
  return L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

function heatIntensity(eggs: number, maxEggs: number): number {
  if (maxEggs <= 0) return 0.2
  return Math.min(1, Math.max(0.08, eggs / maxEggs))
}

function addressLabel(point: ContaOvosHeatPoint): string {
  const parts = [point.street, point.number].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return point.neighborhoodName || point.district || 'Endereço não informado'
}

export function MapaCalorPage() {
  const neighborhoods = useNeighborhoods(true)
  const defaults = useMemo(() => defaultHeatDateRange(), [])
  const [dateStart, setDateStart] = useState(defaults.dateStart)
  const [dateEnd, setDateEnd] = useState(defaults.dateEnd)
  const [district, setDistrict] = useState('')
  const [neighborhoodId, setNeighborhoodId] = useState('')
  /** Conjunto bruto da última carga (API/cache/local); filtros de UI aplicam-se em memória. */
  const [rawPoints, setRawPoints] = useState<ContaOvosHeatPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [sourceLabel, setSourceLabel] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const heatRef = useRef<L.HeatLayer | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const didInitialLoad = useRef(false)

  const neighborhoodOptions = useMemo(() => {
    const active = neighborhoods.filter((item) => item.active !== false)
    const source = active.length > 0 ? active : neighborhoods
    return [...source].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [neighborhoods])

  const selectedNeighborhoodName = useMemo(() => {
    if (!neighborhoodId) return ''
    return neighborhoods.find((item) => String(item.id) === neighborhoodId)?.name ?? ''
  }, [neighborhoodId, neighborhoods])

  const points = useMemo(
    () =>
      rawPoints.filter((point) =>
        matchesHeatFilters(point, {
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
          district: district || undefined,
          neighborhood: selectedNeighborhoodName || undefined,
        }),
      ),
    [rawPoints, dateStart, dateEnd, district, selectedNeighborhoodName],
  )

  const fetchPoints = useCallback(async (forceRefresh: boolean) => {
    setLoading(true)
    try {
      const result = await loadHeatmapPoints(
        {
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
        },
        { forceRefresh },
      )
      setRawPoints(result.points)
      setOffline(result.offline)
      setFromCache(Boolean(result.fromCache))
      setSourceLabel(result.sourceLabel)
      if (result.error) {
        if (result.error.includes('Limite de consultas')) {
          toast.warning(result.error)
        } else if (result.points.length === 0) {
          toast.error(result.error)
        } else {
          toast.message(result.error)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [dateStart, dateEnd])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView(BARRA_DO_PIRAI_CENTER, 13)
    L.Marker.prototype.options.icon = leafletIcon()
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: 'Map data © Google',
      maxZoom: 20,
    }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 300)
    return () => {
      map.remove()
      mapRef.current = null
      heatRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    void fetchPoints(false)
  }, [fetchPoints])

  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map || !markers) return

    markers.clearLayers()
    if (heatRef.current) {
      map.removeLayer(heatRef.current)
      heatRef.current = null
    }

    if (points.length === 0) return

    const maxEggs = Math.max(...points.map((item) => item.eggs), 1)
    const heatData: L.HeatLatLngTuple[] = points.map((point) => [
      point.latitude,
      point.longitude,
      heatIntensity(point.eggs, maxEggs),
    ])

    heatRef.current = L.heatLayer(heatData, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      max: 1,
      gradient: {
        0.0: '#16a34a',
        0.35: '#eab308',
        0.65: '#f97316',
        1.0: '#dc2626',
      },
    }).addTo(map)

    const bounds: L.LatLngTuple[] = []
    for (const point of points) {
      const latlng: L.LatLngTuple = [point.latitude, point.longitude]
      bounds.push(latlng)
      const dateText = point.dateCollect || point.date
      const popup = L.popup().setContent(
        `<div style="min-width:170px;padding:2px">
          <b style="font-size:15px;color:#115e59">Ovitrampa #${point.trapCode}</b><br/>
          <span style="font-size:13px">${addressLabel(point)}</span><br/>
          <span style="font-size:12px;color:#6b7280">${point.neighborhoodName || point.district || ''}</span><br/>
          <span style="font-size:14px;font-weight:700;color:${point.eggs > 50 ? '#dc2626' : point.eggs > 15 ? '#ea580c' : '#16a34a'}">${point.eggs} ovo(s)</span>
          ${dateText ? `<br/><span style="font-size:11px;color:#6b7280">${formatDate(dateText)}</span>` : ''}
          ${point.source === 'local' ? '<br/><span style="font-size:11px;color:#2563eb">Fonte local</span>' : ''}
        </div>`,
      )
      L.circleMarker(latlng, {
        radius: 5,
        color: '#0f766e',
        weight: 1,
        fillColor: '#fff',
        fillOpacity: 0.85,
      })
        .bindPopup(popup)
        .addTo(markers)
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [points])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Flame className="size-5 text-orange-600" />
            Mapa de Calor (ContaOvos)
          </h1>
          <p className="text-sm text-muted">
            Densidade de ovos por ovitrampa. Altere os filtros e clique em Atualizar para nova consulta à API.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/mapa"
            className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-teal-50"
          >
            Ovitrampas
          </Link>
          <span className="inline-flex h-9 items-center rounded-xl bg-teal-50 px-3 text-sm font-semibold text-primary">
            Mapa de calor
          </span>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-xs font-medium text-muted">
          Data inicial
          <Input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Data final
          <Input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Distrito
          <Select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">Todos</option>
            {BARRA_DO_PIRAI_DISTRITO_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted">
          Bairro
          <Select value={neighborhoodId} onChange={(event) => setNeighborhoodId(event.target.value)}>
            <option value="">Todos</option>
            {neighborhoodOptions.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            disabled={loading}
            onClick={() => void fetchPoints(true)}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {offline ? <Badge className="bg-amber-50 text-amber-800">Visualização offline</Badge> : null}
        {fromCache ? <Badge className="bg-sky-50 text-sky-800">Cache</Badge> : null}
        {sourceLabel ? <Badge className="bg-teal-50 text-primary">{sourceLabel}</Badge> : null}
        <span className="text-muted">
          {loading ? 'Carregando…' : `${points.length} ponto(s)`}
        </span>
        <span className="ml-auto hidden items-center gap-2 text-muted sm:inline-flex">
          <span className="inline-block size-2.5 rounded-full bg-green-600" /> Baixa
          <span className="inline-block size-2.5 rounded-full bg-yellow-500" /> Moderada
          <span className="inline-block size-2.5 rounded-full bg-orange-500" /> Alta
          <span className="inline-block size-2.5 rounded-full bg-red-600" /> Muito alta
        </span>
      </div>

      <div className="relative h-[calc(100svh-16rem)] overflow-hidden rounded-2xl border border-line bg-line">
        <div ref={containerRef} className="h-full w-full" />
        {!loading && points.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/55 p-6 text-center text-sm text-muted">
            Nenhum ponto georreferenciado para os filtros atuais. Ajuste os filtros ou clique em Atualizar.
          </div>
        ) : null}
      </div>
    </div>
  )
}
