import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, School } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CENTER = 'center'

interface PlacementStop {
  id: number
  name: string
}

interface CenterPlacementProps {
  /** The route's stops, in order. */
  stops: PlacementStop[]
  centerName: string
  /** The center sits after this stop; null = before the first stop. */
  afterStopId: number | null
  onChange: (afterStopId: number | null) => void
  /** Shown fixed after the last stop, e.g. the school. */
  endLabel?: string | null
  disabled?: boolean
}

function stopKey(id: number) {
  return `stop-${id}`
}

function Row({
  id,
  isCenter,
  label,
  disabled,
  children,
}: {
  id: string
  isCenter: boolean
  label: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  // Only the center moves; stops stay put but still take a drop.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isCenter ? Boolean(disabled) : { draggable: true, droppable: false },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative flex items-center gap-3 py-1.5 pl-1',
        isDragging && 'z-10',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative z-[1] size-3 shrink-0 rounded-full border-2 bg-background',
          isCenter ? 'border-primary bg-primary' : 'border-muted-foreground/60',
        )}
      />
      {isCenter ? (
        <div
          className={cn(
            'flex flex-1 items-center gap-2 rounded-md border-2 border-primary bg-primary/10 px-2 py-1.5 text-sm font-medium',
            !disabled && 'cursor-grab touch-none active:cursor-grabbing',
            isDragging && 'shadow-lg',
          )}
          {...(disabled ? {} : { ...attributes, ...listeners })}
        >
          {!disabled && <GripVertical className="size-4 shrink-0 text-primary" aria-hidden />}
          <span className="flex-1">{label}</span>
          {children}
        </div>
      ) : (
        <span className="text-sm">{label}</span>
      )}
    </li>
  )
}

/**
 * The child's route as a list of stops, with the transit center as a card
 * that can be dragged (or moved with the arrows) to where it sits on the way.
 */
export function CenterPlacement({ stops, centerName, afterStopId, onChange, endLabel, disabled }: CenterPlacementProps) {
  const { t } = useTranslation()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const foundAt = afterStopId === null ? 0 : stops.findIndex((s) => s.id === afterStopId) + 1
  const centerIndex = foundAt <= 0 && afterStopId !== null ? stops.length : foundAt
  const items = stops.map((s) => stopKey(s.id))
  items.splice(centerIndex, 0, CENTER)

  const placeAt = (index: number) => {
    const clamped = Math.max(0, Math.min(stops.length, index))
    onChange(clamped === 0 ? null : stops[clamped - 1].id)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const moved = arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id)))
    placeAt(moved.indexOf(CENTER))
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol className="relative flex flex-col before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-0.5 before:bg-border">
            {items.map((key) => {
              if (key === CENTER) {
                return (
                  <Row key={key} id={key} isCenter label={centerName} disabled={disabled}>
                    {!disabled && (
                      <span className="flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={t('transit.placement.moveUp')}
                          disabled={centerIndex === 0}
                          onClick={() => placeAt(centerIndex - 1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          aria-label={t('transit.placement.moveDown')}
                          disabled={centerIndex === stops.length}
                          onClick={() => placeAt(centerIndex + 1)}
                        >
                          <ArrowDown />
                        </Button>
                      </span>
                    )}
                  </Row>
                )
              }
              const stop = stops.find((s) => stopKey(s.id) === key)!
              return <Row key={key} id={key} isCenter={false} label={stop.name} />
            })}
          </ol>
        </SortableContext>
      </DndContext>
      {endLabel && (
        <p className="flex items-center gap-2 pl-1 text-sm text-muted-foreground">
          <School className="size-3.5" aria-hidden /> {endLabel}
        </p>
      )}
      {!disabled && <p className="text-xs text-muted-foreground">{t('transit.placement.hint')}</p>}
    </div>
  )
}
