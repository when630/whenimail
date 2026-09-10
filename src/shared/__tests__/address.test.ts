import { describe, expect, it } from 'vitest'
import { invalidAddresses, isValidEmail, parseAddressList } from '../address'

describe('parseAddressList', () => {
  it('쉼표·세미콜론·줄바꿈으로 구분하고 공백을 정리한다', () => {
    expect(parseAddressList(' a@x.com; b@y.com ,c@z.com\nd@w.com ')).toEqual([
      'a@x.com',
      'b@y.com',
      'c@z.com',
      'd@w.com'
    ])
  })

  it('이름 <주소> 형식은 주소만 남긴다', () => {
    expect(parseAddressList('홍길동 <hong@x.com>')).toEqual(['hong@x.com'])
  })

  it('대소문자만 다른 중복은 제거한다', () => {
    expect(parseAddressList('A@x.com, a@X.com')).toEqual(['A@x.com'])
  })

  it('빈 입력은 빈 배열', () => {
    expect(parseAddressList('')).toEqual([])
    expect(parseAddressList(undefined)).toEqual([])
    expect(parseAddressList(' ; , ')).toEqual([])
  })
})

describe('isValidEmail / invalidAddresses', () => {
  it('기본 형식을 검사한다', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('ab.co')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
  })

  it('유효하지 않은 항목만 돌려준다', () => {
    expect(invalidAddresses('ok@x.com; bad; also-bad@; fine@y.org')).toEqual(['bad', 'also-bad@'])
  })
})
