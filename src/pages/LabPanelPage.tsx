import { liveQuery } from 'dexie'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { COLLECTION_KIND_LABELS, SPECIES_LABELS } from '@/lib/constants'
import { neighborhoodLabelById } from '@/constants/bairros'
import { db, enqueueSync } from '@/lib/db'
import { createId, formatDateTime, nowIso } from '@/lib/utils'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { CollectionRecord, LabResult, MosquitoSpecies } from '@/types/domain'

export function LabPanelPage() {
  const { profile } = useAuth()
  const [collections, setCollections] = useState<CollectionRecord[]>([])
  const [results, setResults] = useState<LabResult[]>([])
  const neighborhoods = useNeighborhoods(true)
  const [selectedId, setSelectedId] = useState('')
  const [eggCount, setEggCount] = useState('')
  const [species, setSpecies] = useState<MosquitoSpecies>('aedes_aegypti')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const colSub = liveQuery(() => db.collections.orderBy('occurredAt').reverse().toArray()).subscribe(setCollections)
    const resSub = liveQuery(() => db.labResults.toArray()).subscribe(setResults)
    return () => {
      colSub.unsubscribe()
      resSub.unsubscribe()
    }
  }, [])

  const selected = collections.find((item) => item.id === selectedId)
  const resultByCollection = useMemo(
    () => new Map(results.map((item) => [item.collectionId, item])),
    [results],
  )

  const pendingLab = collections.filter((item) => item.paddleCode && !resultByCollection.has(item.id))

  async function saveResult() {
    if (!profile || !selected) {
      toast.error('Selecione uma coleta.')
      return
    }
    setSaving(true)
    try {
      const existing = resultByCollection.get(selected.id)
      const result: LabResult = {
        id: existing?.id ?? createId(),
        collectionId: selected.id,
        exactEggCount: eggCount ? Number.parseInt(eggCount, 10) : null,
        species,
        speciesNotes: null,
        analyzedAt: nowIso(),
        analystId: profile.id,
        notes: notes.trim() || null,
        syncStatus: 'pending',
      }
      await db.labResults.put(result)
      await enqueueSync({
        id: createId(),
        type: 'lab_result',
        payloadId: String(result.id),
        createdAt: nowIso(),
      })
      toast.success('Resultado laboratorial salvo.')
      setEggCount('')
      setNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar resultado.')
    } finally {
      setSaving(false)
    }
  }

  const neighborhoodName = (id: number | null) => neighborhoodLabelById(neighborhoods, id, '—')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Painel do laboratório</h1>
        <p className="text-sm text-muted">
          Digite a contagem exata de ovos e a espécie identificada na palheta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-muted">Palhetas sem laudo</p>
          <p className="text-3xl font-semibold text-warn">{pendingLab.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Laudos locais</p>
          <p className="text-3xl font-semibold text-primary">{results.length}</p>
        </Card>
      </div>

      <Field label="Coleta / palheta">
        <Select
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value)
            const current = resultByCollection.get(event.target.value)
            setEggCount(current?.exactEggCount?.toString() ?? '')
            setSpecies(current?.species ?? 'aedes_aegypti')
            setNotes(current?.notes ?? '')
          }}
        >
          <option value="">Selecione</option>
          {collections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.paddleCode ?? 'Sem palheta'} · {item.trapCode} · {formatDateTime(item.occurredAt)}
            </option>
          ))}
        </Select>
      </Field>

      {selected ? (
        <Card className="space-y-1 text-sm">
          <p className="font-semibold">{selected.trapCode}</p>
          <p>
            {COLLECTION_KIND_LABELS[selected.kind]} · {neighborhoodName(selected.neighborhoodId)}
          </p>
          <p>Estimativa de campo: {selected.estimatedEggs ?? 'não informada'}</p>
          <p>Observações: {selected.observations ?? '—'}</p>
        </Card>
      ) : null}

      <Field label="Contagem exata de ovos">
        <Input type="number" min={0} value={eggCount} onChange={(event) => setEggCount(event.target.value)} />
      </Field>
      <Field label="Espécie">
        <Select value={species} onChange={(event) => setSpecies(event.target.value as MosquitoSpecies)}>
          {Object.entries(SPECIES_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notas do analista">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <Button className="w-full" onClick={() => void saveResult()} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar resultado'}
      </Button>

      <section className="space-y-2">
        <h2 className="font-semibold">Registros para relatório</h2>
        {collections.slice(0, 12).map((item) => {
          const lab = resultByCollection.get(item.id)
          return (
            <Card key={item.id} className="text-sm">
              <p className="font-semibold">
                {item.trapCode} · {neighborhoodName(item.neighborhoodId)}
              </p>
              <p className="text-muted">{formatDateTime(item.occurredAt)}</p>
              <p>
                Campo: {item.estimatedEggs ?? '—'} ovos · Lab:{' '}
                {lab?.exactEggCount ?? 'pendente'}
                {lab?.species ? ` · ${SPECIES_LABELS[lab.species]}` : ''}
              </p>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
