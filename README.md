# whenimail

명함을 저장하고, 이메일 템플릿에 명함 정보를 치환해 **Outlook 새 메일 초안**으로 열어주는 개인용 데스크톱 앱.

## 기능

- **명함 관리** — 수동 입력 / CSV·엑셀 가져오기(컬럼 자동 매핑, 중복 검사) / **명함 사진 OCR**(Tesseract 로컬 인식), 로컬 SQLite 저장
- **이메일 템플릿** — `{{이름}}`, `{{회사|귀사}}` 같은 변수 치환 + 수신자별 미리보기와 빈 변수 경고
- **Outlook 연동** — 자동 전송 없이 초안을 열어 검토 후 직접 전송 (COM → .eml → mailto 어댑터 체인)
- **Ctrl+K 커맨드 팔레트** — 명함 검색 → 템플릿 선택 → 초안까지 키보드만으로
- 초안 생성 이력, zip 백업/복원

## 개발

```bash
npm install
npm run dev        # 개발 실행
npm run build:win  # Windows 설치본 빌드
```

스택: Electron + React + TypeScript + Vite / better-sqlite3 / tesseract.js / electron-builder

## 문서

- [설계 문서](docs/01_설계.md) — 요구사항, IA, UX 플로우, 데이터 모델, Outlook 어댑터 전략, 마일스톤
