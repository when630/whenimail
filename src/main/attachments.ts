import { app, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { TemplateAttachment } from '../shared/types'

/** 템플릿 첨부 파일은 원본을 앱 데이터 폴더로 복사해 보관한다 (원본 이동·삭제에 영향받지 않게) */
export function attachmentsDir(): string {
  const dir = path.join(app.getPath('userData'), 'attachments')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 파일 선택 대화상자 → 앱 데이터 폴더로 복사. 취소 시 null */
export async function pickAttachments(): Promise<TemplateAttachment[] | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '첨부 파일 선택',
    properties: ['openFile', 'multiSelections']
  })
  if (canceled || filePaths.length === 0) return null

  const dir = attachmentsDir()
  const out: TemplateAttachment[] = []
  for (const src of filePaths) {
    const name = path.basename(src)
    const dest = path.join(dir, `${randomUUID().slice(0, 8)}-${name}`)
    fs.copyFileSync(src, dest)
    out.push({ name, path: dest, size: fs.statSync(dest).size })
  }
  return out
}

/** 어느 템플릿에서도 참조하지 않는 첨부 파일 정리 (저장·삭제 후 호출) */
export function pruneAttachments(referenced: Iterable<string>): void {
  const keep = new Set([...referenced].map((p) => path.resolve(p)))
  const dir = attachmentsDir()
  for (const entry of fs.readdirSync(dir)) {
    const full = path.resolve(dir, entry)
    if (!keep.has(full)) {
      try {
        fs.rmSync(full, { force: true })
      } catch {
        /* 사용 중인 파일 등은 다음 정리에서 다시 시도 */
      }
    }
  }
}

/** 실제 존재하는 첨부만 남긴다 (초안 생성 직전 검사용) */
export function existingAttachments(list: TemplateAttachment[]): TemplateAttachment[] {
  return list.filter((a) => {
    try {
      return fs.statSync(a.path).isFile()
    } catch {
      return false
    }
  })
}
