import { ipcMain } from 'electron'
import { getRawDb } from '../db'
import { mapRow } from './mediaHandlers'

interface SearchParams {
  query: string
  page: number
  pageSize: number
}

interface ParsedFilter {
  type: string
  op: string
  value: string
}

function parseAdvancedQuery(raw: string): { textQuery: string; filters: ParsedFilter[] } {
  const filters: ParsedFilter[] = []

  const filterPattern = /(\w+):(>=|<=|>|<)?([^\s()]+)/g
  const remaining = raw.replace(filterPattern, (match, key, op, val) => {
    const k = key.toLowerCase()
    if (['tag', 'type', 'favorite', 'width', 'height', 'rating', 'date', 'category'].includes(k)) {
      filters.push({ type: k, op: op ?? '=', value: val })
      return ''
    }
    return match
  }).trim()

  return { textQuery: remaining, filters }
}

function buildSQL(textQuery: string, filters: ParsedFilter[], page: number, pageSize: number): {
  countSql: string
  dataSql: string
  params: unknown[]
} {
  const conditions: string[] = []
  const params: unknown[] = []

  // Full-text: search title, original_filename, memo directly + tags via JOIN
  if (textQuery) {
    const like = `%${textQuery}%`
    conditions.push(`(
      m.title LIKE ? OR
      m.original_filename LIKE ? OR
      m.memo LIKE ? OR
      m.id IN (
        SELECT mt2.media_id FROM media_tags mt2
        JOIN tags t2 ON t2.id = mt2.tag_id
        WHERE t2.name LIKE ?
      ) OR
      m.id IN (
        SELECT m3.id FROM media m3
        JOIN categories c3 ON c3.id = m3.category_id
        WHERE c3.name LIKE ?
      )
    )`)
    params.push(like, like, like, like, like)
  }

  // Structured filters
  for (const f of filters) {
    switch (f.type) {
      case 'tag':
        conditions.push(`m.id IN (
          SELECT mt.media_id FROM media_tags mt
          JOIN tags t ON t.id = mt.tag_id
          WHERE t.name = ?
        )`)
        params.push(f.value)
        break
      case 'type':
        conditions.push(`m.media_type = ?`)
        params.push(f.value)
        break
      case 'favorite':
        conditions.push(`m.favorite = ?`)
        params.push(f.value === 'true' ? 1 : 0)
        break
      case 'width': {
        const op = ['>=', '<=', '>', '<'].includes(f.op) ? f.op : '='
        conditions.push(`m.width ${op} ?`)
        params.push(Number(f.value))
        break
      }
      case 'height': {
        const op = ['>=', '<=', '>', '<'].includes(f.op) ? f.op : '='
        conditions.push(`m.height ${op} ?`)
        params.push(Number(f.value))
        break
      }
      case 'rating': {
        const op = ['>=', '<=', '>', '<'].includes(f.op) ? f.op : '='
        conditions.push(`m.rating ${op} ?`)
        params.push(Number(f.value))
        break
      }
      case 'date':
        if (f.value.includes('..')) {
          const [start, end] = f.value.split('..')
          conditions.push(`m.captured_at BETWEEN ? AND ?`)
          params.push(start, end)
        } else {
          conditions.push(`m.captured_at LIKE ?`)
          params.push(`${f.value}%`)
        }
        break
      case 'category':
        conditions.push(`m.id IN (
          SELECT m2.id FROM media m2
          JOIN categories c ON c.id = m2.category_id
          WHERE c.name = ?
        )`)
        params.push(f.value)
        break
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const countSql = `
    SELECT COUNT(DISTINCT m.id) as n
    FROM media m
    LEFT JOIN media_tags mt ON mt.media_id = m.id
    LEFT JOIN tags t ON t.id = mt.tag_id
    ${where}
  `

  const dataSql = `
    SELECT m.*, GROUP_CONCAT(t.name, ',') as tag_list
    FROM media m
    LEFT JOIN media_tags mt ON mt.media_id = m.id
    LEFT JOIN tags t ON t.id = mt.tag_id
    ${where}
    GROUP BY m.id
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `

  return { countSql, dataSql, params: [...params, pageSize, offset] }
}

export function registerSearchHandlers(): void {
  ipcMain.handle('search:query', (_event, { query, page, pageSize }: SearchParams) => {
    const raw = getRawDb()
    const { textQuery, filters } = parseAdvancedQuery(query)
    const { countSql, dataSql, params } = buildSQL(textQuery, filters, page, pageSize)

    const countParams = params.slice(0, params.length - 2)
    const total = (raw.prepare(countSql).get(...countParams) as { n: number }).n
    const rows = raw.prepare(dataSql).all(...params) as Record<string, unknown>[]

    return {
      items: rows.map(mapRow),
      total,
      page,
      pageSize,
    }
  })
}
