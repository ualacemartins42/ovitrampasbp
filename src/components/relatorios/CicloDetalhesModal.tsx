import { MapPinned, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cycleSituationLabel } from '@/lib/constants'
import { googleMapsUrl } from '@/lib/geo'
import { formatDate } from '@/lib/utils'
import type { CompletedCycleReport } from '@/services/relatorioService'

interface CicloDetalhesModalProps {
  report: CompletedCycleReport | null
  onClose: () => void
}

function weekLabel(week: number | null | undefined): string {
  return week == null ? '—' : `SE ${week}`
}

function Stage({
  title,
  date,
  week,
  situation,
  observations,
}: {
  title: string
  date: string | null
  week: number | null
  situation?: string | null
  observations: string | null
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-3">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted">
        {formatDate(date)} · {weekLabel(week)}
      </p>
      {situation ? <p className="text-sm text-ink">{situation}</p> : null}
      {observations ? <p className="mt-1 text-sm text-muted">{observations}</p> : <p className="mt-1 text-xs text-muted">Sem observações.</p>}
    </section>
  )
}

export function CicloDetalhesModal({ report, onClose }: CicloDetalhesModalProps) {
  if (!report) return null
  const { cycle, trap, agentName, street, neighborhood, latitude, longitude } = report
  const hasGps = latitude != null && longitude != null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ciclo concluído</p>
            <h2 className="text-lg font-semibold text-ink">Ovitrampa {cycle.trapCode}</h2>
            <p className="text-sm text-muted">{neighborhood}</p>
          </div>
          <button type="button" className="rounded-lg p-1 text-muted hover:bg-teal-50" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-medium text-ink">Agente: </span>
            {agentName}
          </p>
          <p>
            <span className="font-medium text-ink">Endereço: </span>
            {street}
          </p>
          {trap?.responsible ? (
            <p>
              <span className="font-medium text-ink">Responsável local: </span>
              {trap.responsible}
            </p>
          ) : null}
          {trap?.estratoLiraa ? (
            <p>
              <span className="font-medium text-ink">Estrato LIRAa: </span>
              {trap.estratoLiraa}
            </p>
          ) : null}
        </div>

        {hasGps ? (
          <a
            href={googleMapsUrl(latitude, longitude, true)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-teal-50 px-3 py-2 text-sm font-semibold text-primary"
          >
            <MapPinned className="size-4" />
            Abrir localização no Google Maps (satélite)
          </a>
        ) : (
          <p className="mt-3 text-sm text-muted">Coordenadas GPS não registradas nesta armadilha.</p>
        )}

        <div className="mt-4 space-y-2">
          <Stage
            title="1. Instalação"
            date={cycle.installAt}
            week={cycle.installEpiWeek}
            observations={cycle.installObs}
          />
          <Stage
            title="2. Troca de palheta"
            date={cycle.swapAt}
            week={cycle.swapEpiWeek}
            situation={cycleSituationLabel(cycle.swapSituation)}
            observations={cycle.swapObs}
          />
          <Stage
            title="3. Retirada"
            date={cycle.removeAt}
            week={cycle.removeEpiWeek}
            situation={cycleSituationLabel(cycle.removeSituation)}
            observations={cycle.removeObs}
          />
        </div>

        <Button className="mt-5 w-full" variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
