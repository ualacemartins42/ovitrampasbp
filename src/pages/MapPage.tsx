import { liveQuery } from 'dexie'
import L from 'leaflet'
import { Crosshair } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BARRA_DO_PIRAI_CENTER, CYCLE_STATUS_LABELS } from '@/lib/constants'
import { neighborhoodLabelById } from '@/constants/bairros'
import { db } from '@/lib/db'
import { captureCoordinates } from '@/lib/geo'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { CycleRecord, Trap } from '@/types/domain'
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

export function MapPage() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const userLocationRef = useRef<[number, number] | null>(null)
  const [traps, setTraps] = useState<Trap[]>([])
  const [cycles, setCycles] = useState<CycleRecord[]>([])
  const neighborhoods = useNeighborhoods(true)

  useEffect(() => {
    const trapSub = liveQuery(() => db.traps.toArray()).subscribe(setTraps)
    const cycleSub = liveQuery(() => db.cycles.toArray()).subscribe(setCycles)
    return () => {
      trapSub.unsubscribe()
      cycleSub.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView(BARRA_DO_PIRAI_CENTER, 14)
    L.Marker.prototype.options.icon = leafletIcon()
    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: 'Map data © Google',
      maxZoom: 20,
    }).addTo(map)
    L.tileLayer('https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 300)
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
      userMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = markersRef.current
    if (!map || !group) return
    group.clearLayers()

    const bounds: L.LatLngTuple[] = []
    const neighborhoodName = (id: number | null) => neighborhoodLabelById(neighborhoods, id, 'S/ bairro')

    for (const trap of traps) {
      if (trap.deletedAt || trap.latitude == null || trap.longitude == null) continue
      const latlng: L.LatLngTuple = [trap.latitude, trap.longitude]
      bounds.push(latlng)
      const active = cycles.find((item) => item.trapCode === trap.code && item.status !== 'finalizada')
      const actionLabel = active ? 'Gerenciar ciclo' : 'Iniciar nova instalação'
      const popup = L.popup().setContent(
        `<div style="text-align:center;padding:4px;min-width:160px">
          <b style="font-size:16px;color:#115e59">Ovitrampa #${trap.code}</b><br/>
          <span style="font-size:14px">${neighborhoodName(trap.neighborhoodId)}</span><br/>
          <span style="font-size:12px;font-weight:700;color:${active ? (active.status === 'instalada' ? '#2563eb' : '#ea580c') : '#6b7280'}">${active ? `Status: ${CYCLE_STATUS_LABELS[active.status]}` : 'Disponível para ciclo'}</span><br/>
          <button type="button" style="margin-top:8px;border-radius:8px;background:#0f766e;color:#fff;font-size:12px;font-weight:700;padding:6px 12px" data-trap="${trap.code}" data-cycle="${active?.id ?? ''}">${actionLabel}</button>
        </div>`,
      )
      L.marker(latlng).bindPopup(popup).addTo(group)
    }

    map.off('popupopen')
    map.on('popupopen', (event) => {
      const button = (event.popup.getElement()?.querySelector('button[data-trap]') ?? null) as HTMLButtonElement | null
      if (!button) return
      button.onclick = () => {
        const trapCode = button.dataset.trap ?? ''
        const cycleId = button.dataset.cycle ?? ''
        map.closePopup()
        if (cycleId) navigate(`/ciclos/${cycleId}`)
        else navigate(`/ciclos/novo?armadilha=${encodeURIComponent(trapCode)}`)
      }
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
    }
  }, [traps, cycles, neighborhoods, navigate])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng: [number, number] = [position.coords.latitude, position.coords.longitude]
        userLocationRef.current = latlng
        const icon = L.divIcon({
          className: 'custom-user-marker',
          html: '<div class="h-[18px] w-[18px] rounded-full border-[3px] border-white bg-blue-500 shadow"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        if (!userMarkerRef.current) {
          userMarkerRef.current = L.marker(latlng, { icon }).addTo(map).bindPopup('<b>Você está aqui</b>')
        } else {
          userMarkerRef.current.setLatLng(latlng)
        }
      },
      () => undefined,
      { enableHighAccuracy: true },
    )
  }, [traps])

  async function centerOnMe() {
    const map = mapRef.current
    if (!map) return
    try {
      let coords = userLocationRef.current
      if (!coords) {
        const item = await captureCoordinates()
        coords = [item.latitude, item.longitude]
        userLocationRef.current = coords
      }
      map.setView(coords, 17)
    } catch {
      toast.error('Não foi possível obter sua localização atual. Verifique o GPS.')
    }
  }

  return (
    <div className="relative -mx-4 -mt-4 h-[calc(100svh-8.5rem)] overflow-hidden bg-line">
      <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-2">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold shadow">Mapa de ovitrampas</span>
        <Link
          to="/mapa-calor"
          className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 shadow hover:bg-orange-100"
        >
          Mapa de Calor
        </Link>
      </div>
      <Button
        variant="secondary"
        className="absolute bottom-6 right-6 z-[1000] size-12 rounded-full p-0 shadow-lg"
        aria-label="Minha localização"
        onClick={() => void centerOnMe()}
      >
        <Crosshair className="size-6 text-primary" />
      </Button>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
