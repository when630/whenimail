/** 참조/숨은 참조 입력용 이메일 주소 목록 유틸 */

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/**
 * "a@x.com; b@y.com, 홍길동 <c@z.com>" 같은 입력을 주소 배열로.
 * 이름 <주소> 형식은 주소만 남기고, 중복은 제거한다.
 */
export function parseAddressList(input: string | undefined | null): string[] {
  if (!input) return []
  const out: string[] = []
  for (const raw of input.split(/[,;\n]+/)) {
    let token = raw.trim()
    if (!token) continue
    const angled = token.match(/<([^<>]+)>\s*$/)
    if (angled) token = angled[1].trim()
    const lower = token.toLowerCase()
    if (!out.some((e) => e.toLowerCase() === lower)) out.push(token)
  }
  return out
}

/** 유효하지 않은 주소만 골라낸다 (경고 표시용) */
export function invalidAddresses(input: string | undefined | null): string[] {
  return parseAddressList(input).filter((e) => !isValidEmail(e))
}
