import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { NeighborhoodSelect } from '@/components/forms/NeighborhoodSelect'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { ROLE_LABELS, type AppRole } from '@/lib/constants'
import { enqueueSync } from '@/lib/db'
import { createId, nowIso } from '@/lib/utils'

export function ProfilePage() {
  const { profile, signOut, updateLocalProfile, isDemo, configured } = useAuth()
  const neighborhoods = useNeighborhoods()
  const [fullName, setFullName] = useState(profile?.fullName ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(profile?.registrationNumber ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [neighborhoodId, setNeighborhoodId] = useState(profile?.neighborhoodId ? String(profile.neighborhoodId) : '')

  async function save() {
    if (!profile) return
    const neighborhood = neighborhoods.find((item) => String(item.id) === neighborhoodId)
    const next = {
      ...profile,
      fullName: fullName.trim(),
      registrationNumber: registrationNumber.trim() || null,
      phone: phone.trim() || null,
      neighborhoodId: neighborhoodId ? Number(neighborhoodId) : null,
      zone: neighborhood?.zone ?? profile.zone,
    }
    await updateLocalProfile(next)
    if (!isDemo && configured) {
      await enqueueSync({
        id: createId(),
        type: 'profile',
        payloadId: next.id,
        createdAt: nowIso(),
      })
    }
    toast.success('Identificação salva neste aparelho.')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Identificação do agente</h1>
        <p className="text-sm text-muted">{ROLE_LABELS[profile?.role ?? 'ace']}</p>
      </div>

      {isDemo ? (
        <Card className="text-sm text-muted">Modo Offline: os dados não saem deste aparelho.</Card>
      ) : null}

      <Field label="Nome completo">
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
      </Field>
      <Field label="Matrícula">
        <Input
          value={registrationNumber}
          placeholder="MAT-12345"
          onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())}
        />
      </Field>
      <Field label="Telefone">
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
      </Field>
      {isDemo ? (
        <Field label="Papel no Modo Offline">
          <Select
            value={profile?.role}
            onChange={(event) => {
              if (!profile) return
              void updateLocalProfile({ ...profile, role: event.target.value as AppRole })
            }}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Bairro / zona de atuação">
        <NeighborhoodSelect
          neighborhoods={neighborhoods}
          value={neighborhoodId}
          onChange={setNeighborhoodId}
        />
      </Field>

      <Button className="w-full" onClick={() => void save()}>
        Salvar identificação
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
        Sair
      </Button>
    </div>
  )
}
