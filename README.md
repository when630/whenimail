# whenimail

명함을 저장하고, 이메일 템플릿에 명함 정보를 치환해 **Outlook 새 메일 초안**으로 열어주는 개인용 데스크톱 앱.

- 명함(연락처) 관리 — 수동 입력 / CSV·엑셀 가져오기 / OCR(예정), 로컬 SQLite 저장
- 이메일 템플릿 — `{{이름}}`, `{{회사|귀사}}` 같은 변수 치환 + 미리보기
- Outlook 연동 — 자동 전송 없이 초안을 열어 사용자가 검토 후 직접 전송 (오발송 방지)

## 스택

Electron + React + TypeScript + Vite / better-sqlite3 / electron-builder

## 문서

- [설계 문서](docs/01_설계.md) — 요구사항, IA, UX 플로우, 데이터 모델, Outlook 어댑터 전략, 마일스톤

## 상태

설계 완료(v1.1) · M1(핵심 루프) 구현 전
