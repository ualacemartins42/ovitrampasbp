import { CloudOff, Pencil, Trash2 } from 'lucide-react'
import { EducacaoPhotoGallery } from '@/components/educacao/EducacaoPhotoGallery'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatActionDate, type EducacaoReportRow } from '@/services/educacaoService'

interface EducacaoRegistroCardProps {
  row: EducacaoReportRow
  canManage?: boolean
  onEdit?: (row: EducacaoReportRow) => void
  onDelete?: (row: EducacaoReportRow) => void
}

export function EducacaoRegistroCard({ row, canManage = false, onEdit, onDelete }: EducacaoRegistroCardProps) {
  const { record } = row
  const showActions = canManage && (onEdit || onDelete)

  return (
    <Card className="h-full space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">Ovitrampa {record.trapCode}</p>
          <p className="text-xs text-muted">{row.address}</p>
          <p className="text-xs text-muted">{row.neighborhood}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-primary">{formatActionDate(record.analysisDate)}</p>
          {record.syncStatus !== 'synced' ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-700">
              <CloudOff className="size-3" />
              Não sincronizado
            </p>
          ) : null}
        </div>
      </div>

      <p className="whitespace-pre-line text-sm text-ink">{record.observation || 'Ação não descrita.'}</p>
      <p className="text-xs text-muted">Agente: {row.agentName}</p>

      <EducacaoPhotoGallery photos={row.photos} />

      {showActions ? (
        <div className="flex gap-2 pt-1">
          {onEdit ? (
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onEdit(row)}>
              <Pencil className="size-4" />
              Editar
            </Button>
          ) : null}
          {onDelete ? (
            <Button size="sm" variant="danger" className="flex-1" onClick={() => onDelete(row)}>
              <Trash2 className="size-4" />
              Excluir
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
