# M4.1 편집기·문법 강조 독립 QA

- 기준일: 2026-10-12
- 담당: 독립 QA. 앱·교재·서버 코드는 수정하지 않았다.
- 최종 판정: **PASS**. 기능 QA와 독립 시각 재검수가 통과했다. 선택 상태 글자 대비 P2는 수정 후 실제 계산색 검사와 원본 화면 검수로 해결 확인했다.
- 범위: CodeMirror 도입, Java 구문별 색, 다크·라이트·고대비 테마, 편집·저장·실행 연동, 기본 편집기 fallback과 기존 학습 흐름 회귀.

## 환경과 실행 방법

Windows, Node v22.17.0, Playwright 1.62.1, Microsoft Edge 155.0.4283.45의 headless 독립 context를 사용했다. 부모가 실행한 `http://127.0.0.1:4173` 서버에 연결했으며 서버 시작·재시작·의존성 설치는 수행하지 않았다. 로컬 sandbox 경계 때문에 브라우저 명령은 승인된 `require_escalated` 실행을 사용했다.

모든 `/api/*`는 Playwright route로 모의 처리했다. 이번 QA에서 실제 Wandbox 실행 요청은 보내지 않았다. Clipboard API도 context 내부에 모의 구현하여 사용자 운영체제 클립보드를 덮어쓰지 않았다. 브라우저 viewport 검증은 **에뮬레이션이며 실제 기기 테스트가 아니다**.

```powershell
node --test tests/editor.test.mjs
node --check tests/browser.mjs

$env:PLAYWRIGHT_CHANNEL='msedge'
$env:QA_ARTIFACT_DIR='C:/Users/USER/Documents/Codex/2026-10-12/new-chat/work/java-edu-editor-qa'
Remove-Item -LiteralPath Env:QA_FILTER -ErrorAction SilentlyContinue
node tests/browser.mjs
```

`QA_FILTER`는 선택 실행용 정규식이다. 지정하지 않으면 전체 브라우저 시나리오를 실행한다. CI는 `PLAYWRIGHT_CHANNEL`을 생략하여 설치된 Chromium을 사용할 수 있다. CI 실행 결과는 부모의 별도 검증 기록을 따른다.

## 실제 실행 기록

| 실행 | 실제 결과 | 해석 |
| --- | --- | --- |
| 문법 분류 Node 단위검사 | 4 PASS / 0 FAIL | 선언·호출 구분, 문자열·주석, 최신 구문 표기, 빈값·미완성·Unicode 경계 |
| 신규 편집기 브라우저 1차 | 10 PASS / 2 FAIL | 아래의 테스트 기대 정의 두 건을 보정했다. 제품 결함으로 집계하지 않는다. |
| 기존 35개 + 신규 12개 전체 회귀 | 47 PASS / 0 FAIL | 실제 전체 실행 결과 |
| 긴 한글 확대 캡처 재실행 + 50,000자 경계 추가 | 2 PASS / 0 FAIL | 앞의 47개와 중복 1개, 신규 1개 |
| 세 테마 선택·caret 상태 추가 | 1 PASS / 0 FAIL | 범위 선택·caret 표시 자동검사는 통과했으나 이미지 검수에서 대비 문제를 발견했다. |
| 선택 대비 수정 후 테마·선택·모바일 관련 재실행 | 3 PASS / 0 FAIL | 실제 계산색 기준 8개 토큰 종류 모두 4.5:1 이상. 정상·선택·caret·모바일 캡처 갱신 |

브라우저 고유 시나리오 49개와 문법 단위검사 4개를 실제 검증했다. 최종 파일의 모든 조건을 한 차례에 49개 실행했다고 주장하지 않는다. 전체 47개 실행 이후 추가 경계와 시각 조건, 수정된 CSS 관련 조건을 위 표처럼 선별 재실행했다.

1차의 테스트 정의 보정:

1. 검색 결과가 0개가 되면 선택 수업이 해제되고 복구 후 이론 단계로 돌아간다. 테마 보존 검사에서 코드 실습으로 다시 진입한 뒤 원문을 대조하도록 변경했다.
2. CodeMirror의 Windows redo는 `Ctrl+Y`다. 잘못 사용한 `Ctrl+Shift+Z`를 플랫폼에 맞는 키로 바꾸고 실제 undo/redo를 다시 검증했다.

## 수용 기준과 확인 결과

| 영역 | 실제 확인 내용 | 결과 |
| --- | --- | --- |
| 문법 강조 | 예제 원문 불변, keyword/class/type/variable의 서로 다른 계산색, 예제·IDE 팔레트 일치, method/string/comment/number 토큰, HTML처럼 보이는 코드의 텍스트 처리 | PASS |
| 편집기 계약 | 실제 contenteditable textbox, 접근 가능한 이름·multiline, 정상 모드에 숨겨진 textarea proxy 없음 | PASS |
| 테마·줄바꿈 | 3테마 전환, 저장 키 `java-edu:editor-preferences:v1`, 수업·탭·버전·검색·트랙 전환 및 reload 후 코드와 설정 유지 | PASS |
| 선택·이력 | 같은 편집 DOM 유지, 선택 범위 보존, theme 변경 후 Ctrl+Z/Y, 범위 교체, 초기 코드와 되돌리기, 선택 상태 8종 토큰 대비 | PASS |
| 키보드 | Enter Java 블록 공백 4칸, 들여쓰기 도구 선택 줄 +4칸과 undo, Tab의 다음 컨트롤 이동 | PASS |
| 선택·복사 | 실제 마우스 드래그, 선택 원문, 합성 ClipboardEvent의 선택 복사, 공개 전체복사 동작, 복사 거부 후 직접 복사 선택 fallback | PASS |
| 한글 조합 | 합성 compositionstart/update/end와 실제 insertText 연계, 빈 조합 종료, 중복·누락 없는 원문·요청·저장 비교 | PASS, OS IME는 미검증 |
| 빈값·원문 경계 | 빈 코드 전송 금지와 focus, 끝 빈 줄 3개 유지, 전체 원문을 복사·요청 body·저장·reload에서 비교 | PASS |
| 긴 코드 | 100줄 한글 코드의 전체 원문, DOM 가상화와 무관한 전체복사, 가로·세로 내부 스크롤, 줄바꿈, 320px·가로 회전·200% 글자 확대 후 보존 | PASS |
| 최대 길이 | 정확히 50,000자 허용, 초과 1자 입력의 원자적 거절과 기존 원문 보존, 독립 UTF-8 32 KiB 전송 제한, 경계 크기 reset undo | PASS |
| 실행 snapshot | 테마·줄바꿈 변경은 같은 코드의 채점 유지, 입력·수업·버전 변경·취소 후 오래된 응답은 완료에 미반영 | PASS, API mock |
| 저장 실패 | 손상된 테마 JSON은 기본값, 저장 거부 시 안내와 방문 중 테마·편집·실행 유지 | PASS |
| 확장 로드 실패 | editor bundle 차단 시 예제 원문과 노출된 실제 textarea 사용, 안내·테마·wrap·편집·실행·reset undo·320px 흐름 유지 | PASS |
| 반응형 | 320/360/390/768/1440px, 1280×600, 844×390, 회전·root 글자 크기 200%, 활성 탭·버튼 경계·코드 내부 overflow | PASS |

기존 35개 회귀에는 12수업×5단계, Java 8/11/17/21 제한과 잘못된 hash, 검색 0건, 객관식 미응답·오답·재시도·완료·새로고침, 설계 메모, 초안 격리, run과 submit 구분, 객관식+현재 코드의 이중 완료, 같은 코드 재제출 실패의 완료 철회, HTTP·네트워크·JSON 오류, 불일치 응답, 저장 거부·손상, 초기화 취소·확인, 키보드·모바일 드로어를 포함한다. 기존 상세 정의는 [M4 QA 기록](qa-report.md)을 참조하되, 이번 표의 PASS는 교체된 CodeMirror와 함께 실제 재실행한 결과다.

## 발견한 제품 결함

### 해결: P2 — 선택한 코드의 일부 토큰 대비 부족

재현: 코드 실습에 키워드·클래스·타입·변수·메서드·문자열·주석·숫자가 있는 Java 코드 입력 → 다크/라이트/고대비 각각에서 편집기를 focus → Ctrl+A 전체선택.

기대: 일반 크기 코드 텍스트가 선택 중에도 4.5:1 이상의 대비를 유지한다.

실제: 불투명 `.cm-selectionBackground` 배경에 대해 다크 주석 3.25:1·키워드 3.75:1·메서드 3.96:1, 라이트 주석 3.64:1·문자열 4.17:1, 고대비 주석·키워드 4.25:1 등을 확인했다. QA와 독립 시각 검수자가 원본 이미지 및 sRGB 계산을 각각 확인했다. 선택 해제 상태의 텍스트와 별개로 선택 중 가독성 문제다.

구현 담당자는 `dist/styles.css`에서 선택 배경을 다크 `#304751`, 라이트 `#d2e0db`, 고대비 `#304650`으로 바꾸고 일부 토큰 색을 조정했다. QA는 앱 코드를 직접 수정하지 않았다. 수정 후 같은 선택 시나리오에서 `getComputedStyle`로 읽은 실제 배경·전경의 대비를 자동 계산했다.

| 테마 | 선택한 8종 토큰의 최저 대비 | 결과 |
| --- | --- | --- |
| 다크 | 4.859:1 | PASS |
| 라이트 | 4.810:1 | PASS |
| 고대비 | 5.772:1 | PASS |

`editor-{dark,light,contrast}-selection.png`는 수정 후 화면으로 갱신했다. 선택 해제 일반 상태의 예제·IDE, caret, 모바일 테마 화면도 함께 갱신하여 독립 시각 검수자에게 전달했다.

## 화면 증거

로컬 증거 루트: `C:/Users/USER/Documents/Codex/2026-10-12/new-chat/work/java-edu-editor-qa/`.

- `editor-{dark,light,contrast}-{example,ide}.png`: 세 테마 예제·IDE.
- `editor-{dark,light,contrast}-{selection,caret}.png`: 실제 전체선택과 선택 해제 후 caret. 복사 toast 없이 촬영했다.
- `editor-mobile-{dark,light,contrast}.png`: 390px의 세 테마.
- `editor-mobile-200-theme.png`, `editor-mobile-200-execution-controls.png`: 390px·200% 글자 확대.
- `editor-mobile-200-long-korean.png`, `editor-320-200-controls.png`: 긴 한글 코드·좁은 화면. 복사 toast가 사라진 뒤 재촬영했다.
- `editor-fallback-320.png`: 확장 로드 실패 상태의 실제 기본 편집기.
- 이전 35개 회귀로 생성한 `desktop-*`, `mobile-*`, `viewport-*`도 동일 루트에 보관했다.

`failure-editor-theme-wrap-persist-across-navigation-and-reload.png`와 `failure-editor-theme-preserves-selection-and-keyboard-undo.png`는 1차 테스트 정의 오류 시점의 진단 자료다. 최종 성공·시각 승인 근거로 사용하지 않는다.

## 변경 파일과 한계

QA 변경: `tests/browser.mjs`, `tests/editor.test.mjs`, 이 보고서. 스크린샷은 전용 `work/java-edu-editor-qa/`에만 기록했다. 다른 담당자의 앱·서버·문서 파일을 수정하지 않았다.

최종 선별 재검증 시점 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| `dist/editor.js` | `284A9BE4E2CE098C7F05A9B0697D94FD46BA28D28646E703A22D7D4657591E13` |
| `dist/app.js` | `9827054696499FE8D38C35A9DE6E76656613E271EEA3602C956F711904E0CA22` |
| `dist/styles.css` | `442AF25EE89BCE84A266F58DE346AD089F3462609D7E2D1AF7C3201C6831FD46` |
| `dist/assets/editor.bundle.js` | `BC95D48A58E7C20F2A14481CED42D11B28B8CE5E1442B71AD795F6A5DDFD4DF9` |
| `tests/browser.mjs` | `CB4225C9FB8FCE00AAE6CBDC438F11FC5051532F9998974F02307BD13F8D339E` |
| `tests/editor.test.mjs` | `BAF867586F6C539C1D747B2B64B5A8BE699F6E5CE1255ADCC060E1CB20434209` |

전체 47개 실행 뒤 번들에 의존성 LICENSE 주석이 추가되었고, 편집 동작 JavaScript는 변경되지 않았다. 이 주석 변경만으로 전체 회귀를 반복하지 않았다. 선택 대비 CSS 수정은 영향을 받는 테마·선택·모바일 3개를 실제 재실행했다.

미확인: 실제 Windows/macOS/모바일 IME 및 후보 창, 물리 키보드, 실제 OS 클립보드 권한·복사, 모바일 길게 누르기·선택 핸들·가상 키보드, 실제 기기, Safari·Firefox·스크린리더, 브라우저 자체 page zoom, 배포 환경, 실제 Java provider 실행. root font-size 200%는 글자 확대 검사이며 브라우저 전체 확대와 동일하다고 주장하지 않는다.

독립 시각 담당자는 수정 후 세 테마 선택 합성 화면과 라이트·다크 기본 IDE를 직접 재확인하여 M4.1 시각 PASS를 전달했다. 선택 경계 식별성과 글자 대비 개선, 독립 계산 최솟값 일치를 확인했다. 기능 QA에서 미해결 중요 결함은 없다. 이 판정은 위에 명시한 로컬 브라우저·모의 API 범위에 한정된다.
