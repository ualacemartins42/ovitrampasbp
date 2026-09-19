import { useMemo } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { BARRA_DO_PIRAI_BAIRROS, formatNeighborhoodLabel, groupNeighborhoodsByDistrict } from '@/constants/bairros'
import type { Neighborhood } from '@/types/domain'

interface NeighborhoodSelectProps {
  neighborhoods?: Neighborhood[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

function neighborhoodSearchText(item: Neighborhood, groupLabel: string): string {
  const districtHead = groupLabel.split('/')[0]
  return `${item.name} ${item.zone.split('/')[0]} ${districtHead}`
}

export function NeighborhoodSelect({
  neighborhoods = BARRA_DO_PIRAI_BAIRROS,
  placeholder = 'Buscar bairro...',
  value = '',
  onChange,
  name,
  required,
  disabled,
  className,
}: NeighborhoodSelectProps) {
  const groups = useMemo(
    () =>
      groupNeighborhoodsByDistrict(neighborhoods.filter((item) => item.active !== false)).map((group) => ({
        label: group.label,
        options: group.items.map((item) => ({
          value: String(item.id),
          label: item.name,
          selectedLabel: formatNeighborhoodLabel(item),
          searchText: neighborhoodSearchText(item, group.label),
        })),
      })),
    [neighborhoods],
  )

  return (
    <Combobox
      className={className}
      value={value}
      onChange={(next) => onChange?.(next)}
      groups={groups}
      placeholder={placeholder}
      searchPlaceholder="Digite o bairro ou distrito"
      emptyText="Nenhum bairro encontrado."
      name={name}
      required={required}
      disabled={disabled}
    />
  )
}
