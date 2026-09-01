import { app, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { closeDb, getDb } from './db'

const DB_FILE = 'whenimail.db'

/** DB + 명함 이미지를 zip으로 내보낸다. 취소 시 null, 성공 시 저장 경로 */
export async function exportBackup(): Promise<string | null> {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '백업 내보내기',
    defaultPath: `whenimail-backup-${stamp}.zip`,
    filters: [{ name: 'ZIP', extensions: ['zip'] }]
  })
  if (canceled || !filePath) return null

  // WAL 내용을 본 파일에 반영한 뒤 압축
  getDb().pragma('wal_checkpoint(TRUNCATE)')

  const dir = app.getPath('userData')
  const zip = new AdmZip()
  zip.addLocalFile(path.join(dir, DB_FILE))
  const cardsDir = path.join(dir, 'cards')
  if (fs.existsSync(cardsDir)) zip.addLocalFolder(cardsDir, 'cards')
  zip.writeZip(filePath)
  return filePath
}

/**
 * zip 백업에서 복원. DB를 닫고 파일을 교체한 뒤 앱을 재시작한다.
 * 성공하면 이 함수는 사실상 반환되지 않는다(재시작).
 */
export async function importBackup(): Promise<boolean> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '백업 복원',
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return false

  const zip = new AdmZip(filePaths[0])
  const entries = zip.getEntries()
  if (!entries.some((e) => e.entryName === DB_FILE)) {
    throw new Error('whenimail 백업 파일이 아닙니다 (whenimail.db 없음)')
  }
  // zip slip 방지
  if (entries.some((e) => e.entryName.includes('..') || path.isAbsolute(e.entryName))) {
    throw new Error('잘못된 경로가 포함된 zip입니다')
  }

  const dir = app.getPath('userData')
  closeDb()
  for (const suffix of ['-wal', '-shm']) {
    fs.rmSync(path.join(dir, DB_FILE + suffix), { force: true })
  }
  zip.extractAllTo(dir, true)

  app.relaunch()
  app.exit(0)
  return true
}
