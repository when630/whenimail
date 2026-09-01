import { dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import type { ImportParseResult } from '../shared/types'

/**
 * CSV 인코딩 처리:
 * - 유효한 UTF-8이면 문자열로 디코딩해 전달 (SheetJS는 BOM 없는 CSV를 cp1252로 읽어 한글이 깨짐)
 * - UTF-8 디코딩 실패 시 한국어 Excel 기본인 cp949로 재시도
 */
function readWorkbook(filePath: string): XLSX.WorkBook {
  const buf = fs.readFileSync(filePath)
  const isCsv = path.extname(filePath).toLowerCase() === '.csv'
  if (isCsv) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
      return XLSX.read(text.replace(/^﻿/, ''), { type: 'string' })
    } catch {
      return XLSX.read(buf, { type: 'buffer', codepage: 949 })
    }
  }
  return XLSX.read(buf, { type: 'buffer' })
}

/** 파일 선택 대화상자를 열고 첫 시트를 headers + rows로 파싱. 취소 시 null */
export async function pickAndParse(): Promise<ImportParseResult | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '명함 가져오기',
    filters: [
      { name: 'CSV/Excel', extensions: ['csv', 'xlsx', 'xls'] },
      { name: '모든 파일', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const wb = readWorkbook(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('시트를 찾을 수 없습니다')

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false
  }) as unknown[][]

  const nonEmpty = raw.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (nonEmpty.length === 0) throw new Error('파일에 데이터가 없습니다')

  const [headerRow, ...dataRows] = nonEmpty
  const headers = headerRow.map((h, i) => String(h ?? '').trim() || `열 ${i + 1}`)
  const rows = dataRows.map((row) =>
    headers.map((_, i) => String(row[i] ?? '').trim())
  )

  return { fileName: path.basename(filePath), headers, rows }
}
