import { app, shell } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import type { OutlookAdapter } from '../shared/types'

const execFileAsync = promisify(execFile)

export interface DraftPayload {
  to: string
  subject: string
  html: string
  /** mailto 폴백용 플레인 텍스트 본문 */
  text: string
}

let detectedMode: OutlookAdapter | null = null

/**
 * 클래식 Outlook(COM ProgID 등록) 존재 여부로 어댑터를 정한다.
 * 신형 Outlook은 COM을 지원하지 않으므로 .eml(X-Unsent) 방식으로 폴백.
 */
export async function detectOutlookMode(): Promise<OutlookAdapter> {
  if (detectedMode) return detectedMode
  try {
    await execFileAsync('reg', ['query', 'HKEY_CLASSES_ROOT\\Outlook.Application', '/ve'], {
      windowsHide: true
    })
    detectedMode = 'com'
  } catch {
    detectedMode = 'eml'
  }
  return detectedMode
}

/** 감지된 기본 어댑터부터 폴백 체인 순서로 시도하고, 실제 사용된 어댑터를 반환 */
export async function openDraft(payload: DraftPayload): Promise<OutlookAdapter> {
  const mode = await detectOutlookMode()
  const chain: OutlookAdapter[] = mode === 'com' ? ['com', 'eml', 'mailto'] : ['eml', 'mailto']
  let lastError: unknown
  for (const adapter of chain) {
    try {
      if (adapter === 'com') await openViaCom(payload)
      else if (adapter === 'eml') await openViaEml(payload)
      else await openViaMailto(payload)
      return adapter
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Outlook 초안 열기에 실패했습니다')
}

/**
 * 클래식 Outlook COM: MailItem.Display().
 * 값은 PS 스크립트에 base64로 실어 인코딩/이스케이프 문제를 차단하고,
 * 스크립트 전체도 -EncodedCommand(UTF-16LE base64)로 전달한다.
 */
async function openViaCom(p: DraftPayload): Promise<void> {
  const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64')
  const script = `
$ErrorActionPreference = 'Stop'
function FromB64([string]$s) { [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }
$ol = New-Object -ComObject Outlook.Application
$mail = $ol.CreateItem(0)
$mail.To = FromB64 '${b64(p.to)}'
$mail.Subject = FromB64 '${b64(p.subject)}'
$mail.HTMLBody = FromB64 '${b64(p.html)}'
$mail.Display()
`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  await execFileAsync('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
    windowsHide: true,
    timeout: 30000
  })
}

/**
 * .eml + "X-Unsent: 1" 파일을 생성해 기본 메일 앱(신형 Outlook)으로 연다.
 * 신형 Outlook 호환성을 위해 LF 라인엔딩 + Message-ID를 부여한다.
 */
async function openViaEml(p: DraftPayload): Promise<void> {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(p.subject, 'utf8').toString('base64')}?=`
  const bodyB64 = Buffer.from(p.html, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\n')
  const eml = [
    `To: ${p.to}`,
    `Subject: ${encodedSubject}`,
    'X-Unsent: 1',
    `Message-ID: <${randomUUID()}@whenimail.local>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    bodyB64,
    ''
  ].join('\n')

  const dir = path.join(app.getPath('temp'), 'whenimail')
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, `draft-${Date.now()}-${randomUUID().slice(0, 8)}.eml`)
  await fs.writeFile(file, eml, 'utf8')
  const error = await shell.openPath(file)
  if (error) throw new Error(error)
}

async function openViaMailto(p: DraftPayload): Promise<void> {
  const url = `mailto:${encodeURIComponent(p.to)}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.text)}`
  await shell.openExternal(url)
}
