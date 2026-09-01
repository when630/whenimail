import { describe, expect, it } from 'vitest'
import { bodyToHtml, renderTemplate } from '../render'
import type { Contact } from '../types'

const contact: Contact = {
  id: 1,
  name: '김서연',
  company: '한빛물산',
  department: '구매팀',
  title: '팀장',
  email: 'sy.kim@hanbit.example',
  phone: '02-1234-5678',
  mobile: '010-1234-5678',
  address: '서울 중구',
  website: 'hanbit.example',
  memo: '',
  card_image_path: '',
  tags: [],
  created_at: '',
  updated_at: ''
}

describe('renderTemplate', () => {
  it('기본 변수를 치환한다', () => {
    const r = renderTemplate('{{이름}}님 ({{회사}} {{직함}})', contact)
    expect(r.text).toBe('김서연님 (한빛물산 팀장)')
    expect(r.warnings).toHaveLength(0)
  })

  it('빈 값은 기본값을 쓰고 경고를 남긴다', () => {
    const r = renderTemplate('{{메모|비고 없음}}', contact)
    expect(r.text).toBe('비고 없음')
    expect(r.warnings).toEqual([{ variable: '메모', usedDefault: '비고 없음' }])
  })

  it('빈 값 + 기본값 없음이면 원문 유지 + 경고', () => {
    const r = renderTemplate('{{메모}}', contact)
    expect(r.text).toBe('{{메모}}')
    expect(r.warnings[0]).toEqual({ variable: '메모', usedDefault: null })
  })

  it('알 수 없는 변수는 치환하지 않고 경고한다', () => {
    const r = renderTemplate('{{없는변수}}', contact)
    expect(r.text).toBe('{{없는변수}}')
    expect(r.warnings[0].variable).toBe('없는변수')
  })

  it('보내는날짜는 오늘 날짜로 치환된다', () => {
    const r = renderTemplate('{{보내는날짜}}', contact)
    expect(r.text).toMatch(/^\d{4}년 \d{1,2}월 \d{1,2}일$/)
  })

  it('공백이 있는 표기도 허용한다', () => {
    expect(renderTemplate('{{ 이름 }}', contact).text).toBe('김서연')
  })
})

describe('bodyToHtml', () => {
  it('플레인 텍스트를 문단 HTML로 감싼다', () => {
    const html = bodyToHtml('안녕하세요\n\n감사합니다')
    expect(html).toContain('<p>안녕하세요</p>')
    expect(html).toContain('<p>&nbsp;</p>')
    expect(html).toContain('<p>감사합니다</p>')
  })

  it('HTML 특수문자를 이스케이프한다', () => {
    expect(bodyToHtml('<b>&')).toContain('&lt;b&gt;&amp;')
  })
})
