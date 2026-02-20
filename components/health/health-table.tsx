'use client'

import { useMemo, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { SeverityBadge } from '@/components/health/severity-badge'
import { HealthRowDetail } from '@/components/health/health-row-detail'
import { getSeverity } from '@/lib/queries/health'
import type { SensorHealth, SeverityLevel } from '@/lib/types'

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
}

function formatGapTime(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

interface HealthTableProps {
  data: SensorHealth[]
}

export function HealthTable({ data }: HealthTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const columns = useMemo<ColumnDef<SensorHealth, unknown>[]>(
    () => [
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => (
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground ${
              row.getIsExpanded() ? 'rotate-90' : ''
            }`}
            strokeWidth={1.5}
          />
        ),
        enableSorting: false,
        size: 32,
      },
      {
        accessorKey: 'display_name',
        header: 'Sensor',
        sortingFn: (rowA, rowB) => {
          const sevA = SEVERITY_ORDER[getSeverity(rowA.original)]
          const sevB = SEVERITY_ORDER[getSeverity(rowB.original)]
          if (sevA !== sevB) return sevA - sevB
          return (rowA.original.display_name ?? '').localeCompare(
            rowB.original.display_name ?? ''
          )
        },
      },
      {
        accessorKey: 'latest_battery_voltage',
        header: 'Battery',
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          return v !== null ? `${v.toFixed(2)} V` : '--'
        },
      },
      {
        accessorKey: 'latest_rssi',
        header: 'Signal',
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          return v !== null ? `${v} dBm` : '--'
        },
      },
      {
        accessorKey: 'latest_movement_counter',
        header: 'Movement',
        cell: ({ getValue }) => {
          const v = getValue() as number | null
          return v !== null ? v.toString() : '--'
        },
      },
      {
        accessorKey: 'last_seen',
        header: 'Last Seen',
        cell: ({ getValue }) => {
          const v = getValue() as string
          return formatDistanceToNow(new Date(v), { addSuffix: true })
        },
        sortingFn: (rowA, rowB) => {
          return (
            new Date(rowA.original.last_seen).getTime() -
            new Date(rowB.original.last_seen).getTime()
          )
        },
      },
      {
        accessorKey: 'uptime_pct',
        header: 'Uptime',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return `${v}%`
        },
      },
      {
        accessorKey: 'total_gap_minutes',
        header: 'Gap Time',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return formatGapTime(v)
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const severity = getSeverity(row.original)
          return <SeverityBadge severity={severity} />
        },
        enableSorting: false,
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    initialState: {
      sorting: [{ id: 'display_name', desc: false }],
    },
  })

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  className={
                    header.column.getCanSort()
                      ? 'cursor-pointer select-none'
                      : ''
                  }
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanSort() && (
                      <span className="text-muted-foreground">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No sensor health data available.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const severity = getSeverity(row.original)
              const rowBg =
                severity === 'critical'
                  ? 'bg-red-500/5 dark:bg-red-500/10'
                  : severity === 'warning'
                    ? 'bg-amber-500/5 dark:bg-amber-500/10'
                    : ''

              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={`cursor-pointer ${rowBg}`}
                    onClick={row.getToggleExpandedHandler()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow className={rowBg}>
                      <TableCell colSpan={columns.length} className="p-0">
                        <HealthRowDetail sensor={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
