# 이론 시각 자료 독립 QA

2026-10-12 기능 판정: **PASS**. 새 도식 검사 19/19와 기존 브라우저 회귀 49/49가 실제 실행에서 통과했다. 미적 완성도와 설명의 교육 효과는 자동 검사 통과로 승인하지 않으며, 독립 시각·내용 검토의 별도 판정을 따른다.

## 환경과 실제 실행

Windows, Node.js 22.17.0, Playwright 1.62.1, Edge 155.0.4283.45를 사용했다. 부모가 관리하는 `http://127.0.0.1:4173`의 동결본을 별도 브라우저 컨텍스트에서 검사했다. API 응답은 모의 처리했고, 공식 출처 링크 활성화도 새 탭의 요청을 가로채 로컬 응답으로 확인했다. 실제 외부 출처 방문 또는 코드 전송은 하지 않았다.

공통 `boot()`의 선택 모듈 import와 이론 렌더링·스타일이 바뀌므로 기존 49개 회귀도 전체 재실행했다. 기존 테스트 파일은 이번 작업에서 수정하지 않았다.

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = '1'
$env:NODE_OPTIONS = '--use-system-ca'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:QA_ARTIFACT_DIR = '<repository>/work/theory-independent-qa'
node tests/theory-visuals.mjs

$env:QA_ARTIFACT_DIR = '<repository>/work/theory-independent-qa/baseline'
node tests/browser.mjs
```

- `node --check tests/theory-visuals.mjs`: PASS.
- `node tests/theory-visuals.mjs`: **19 PASS, 0 FAIL**, 종료 코드 0.
- `node tests/browser.mjs`: **49 PASS, 0 FAIL**, 종료 코드 0. 이번 실행은 49개 전체가 한 번의 실행에서 통과한 결과다.
- 이후 QA 파일의 기본 산출물 경로만 저장소 내부로 변경했다. `QA_ARTIFACT_DIR` 없이 `QA_FILTER=keyboard-description-and-reference-activation`으로 1개 시나리오를 재실행해 **1/1 PASS** 및 기본 위치의 JSON·화면 저장을 확인했다. 제품 코드는 변경되지 않았다.

## 확인한 수용 조건

| 범위 | 실제 확인 결과 |
| --- | --- |
| 전체 수업 본문 | 34개 수업의 기존 이론 절 제목과 원문을 데이터와 정확히 대조. 도식이 없는 22개 수업에도 원문이 유지되고 불필요한 figure가 없음 |
| 선정된 12개 도식 | 수업 ID, 도식 ID·종류, 이론 절 다음 삽입 위치, 제목·caption·읽는 순서·텍스트 설명·한계가 일치 |
| 내부 관계 | 25개 패널, 80개 노드의 DOM 순서·label·detail, 54개 연결의 수·from/to·보이는 라벨·스크린리더용 양 끝 설명을 데이터와 대조. 데이터에 없는 연결이 추가되지 않음 |
| 출처 | 26개 출처 참조의 제목·HTTPS URL·판본·확인일이 일치. 새 탭과 `noopener noreferrer` 확인. 키보드와 새 탭 활성화는 모의 네트워크에서 확인 |
| 키보드 | `details`에 Enter/Space로 열기·닫기, Tab/Shift+Tab으로 설명과 첫 출처 링크 사이 이동, 실제 초점과 펼친 설명 확인 |
| 기존 상태 보존 | UI에서 퀴즈 통과·설계 노트·코어 초안·프로젝트 파일 초안·테마 설정 후 도식 수업 왕복, 버전·트랙·검색 변경, 새로고침 수행. `quizPassed`, `labPassed`, `drafts`, `fileDrafts`, `notes`가 동일하게 유지됨 |
| 실행·성취 분리 | 이론의 탐색과 자료 오류 상황에서 실행 API 요청 0건. 도식 열람으로 실습 완료가 생기지 않음 |
| 선택 자료 로딩 실패 | 도식 모듈 404, 모듈 구문 오류, 배열 형태의 잘못된 export 각각에서 선정된 12개 수업의 기존 본문과 다음 예제 단계 유지 |
| 개별 잘못된 자료 | 중복 노드 ID, 없는 도착 노드, 알 수 없는 kind, `javascript:` 출처를 주입. 해당 도식만 빠지고 정상 도식·본문 유지 |
| 안전한 텍스트 처리 | 제목과 노드에 `<img onerror>`·`<script>` 문자열 주입. 텍스트로 표시되고 실행·실제 HTML 요소 생성 없음 |
| 반응형 | 12개 도식 × 320/360/390/768/1440 CSS px × 100/200% 글자 크기 = 120개 조합. 페이지 가로 넘침, figure 밖 라벨, 가로 잘림, 패널의 화면·DOM 순서 불일치 없음 |
| 작은 높이·방향 전환 | 844×390, 1280×600, 390×844, 다시 844×390에서 상태·흐름·관계형 대표 도식과 펼친 설명 확인 |
| 관련 회귀 | 기존 49개 검사에서 전체 단계, 버전·검색·링크, 퀴즈, 초안·진도, 오류·취소·stale 응답, 저장소 손상, 키보드·대화상자, 편집기 테마·선택·긴 코드·fallback·모바일 화면 모두 PASS |

선정된 수업은 `java-basics`, `oop`, `polymorphism`, `collections`, `generics`, `streams`, `concurrency`, `jpa-state`, `tx-proxy`, `security-csrf`, `jwt-validation`, `kafka-idempotency`다.

## 재현 산출물

최종 전달 디렉터리: `<repository>/work/theory-independent-qa/`. 처음 생성한 `<workspace>/work/theory-independent-qa/` 원본을 그대로 복사했다. 결과 JSON의 `artifacts` 또는 실행 로그에 원본 경로가 남은 경우에도 같은 산출물이며 제품·테스트 코드는 복사 과정에서 바꾸지 않았다.

- 구조화된 결과·실행 시점·소스 해시: `results-1791785197447.json`.
- 저장소 내부 기본 경로 재확인: `results-1791785516594.json`.
- 12개 전체 도식 원본 캡처: `<lesson-id>-desktop-figure.png`.
- 5개 너비·100/200% 대표 캡처: `{java-basics,security-csrf,jwt-validation}-<width>-<font>-title.png`.
- 320/390·200% 부분별 원본 캡처: 같은 이름 뒤 `-nodes.png`, `-description.png`, `-sources.png`.
- 키보드로 펼친 설명: `jwt-validation-keyboard-expanded-description.png`.
- 낮은 높이·방향 전환: `kafka-idempotency-844x390-orientation.png`, `kafka-idempotency-1280x600-orientation.png`, `kafka-idempotency-390x844-orientation.png`.
- 기존 49개 회귀 캡처: `baseline/`.

실제 검증한 동결본 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| `dist/app.js` | `2a1762a2b137abf72ed7bdcaec4bdc4c086cf83ddf3391561b7ec525173e3a86` |
| `dist/styles.css` | `abe8f9d2b4a067b398867c6ec5b1b48ee8189a8b10c775a50086103573653ce8` |
| `dist/data/lesson-visuals.js` | `6a1a2085a55b9e41ca33f972052953adf4445fd7c49dd738f6b6ed4cc67cc442` |
| `tests/theory-visuals.mjs` (기본 경로 수정 후) | `587672963efe615004656371aa7d78ae4850ed49cd7a706b1af4f5c0721a8886` |

19개 본검사 당시 QA 파일 해시는 `3df3c1da5c267224493f785aa8b405880481aed72874df646ea5b52b1dfaadb3`였다. 이후 차이는 기본 출력 경로 한 줄이며, 위 마지막 해시는 해당 경로 확인 1개를 실행한 파일의 해시다.

## 한계와 판정

수행 범위에서 발견된 미해결 기능 결함은 없다. 기능 판정은 **PASS**다. 이후 독립 시각 검수자가 12개 desktop figure, 본문 통합, 모바일·태블릿·200%·짧은 높이 및 키보드 설명 화면을 직접 확인해 **PASS**로 판정했다. 특히 잔액·해시 계약·동시성·트랜잭션·CSRF의 비교 이점이 명확했고, 제거가 필요한 자료는 발견하지 않았다.

시각 검수의 비차단 개선 의견은 polymorphism/JWT 하단 관계에서 노드 설명이 반복되어 스크롤이 길어진다는 점이다. 현재 출발·도착·관계 라벨과 AND 의미는 명확하다. 향후 공통 노드 표현을 줄일 때는 320/390px·200%의 읽는 순서와 필수 조건을 다시 확인한다. 추가 실제 viewport 근거는 `polymorphism-320-200-relationship-row.png`, `jwt-validation-390-200-relationship-row.png`다.

별도 기술 조사자는 26개 공식 출처 원문과 예제·검사 계약을 대조했다. JWT 도식이 형식·헤더 검사 이후의 주요 수용 조건을 표현한다는 전제를 보완한 최종 자료를 **PASS**로 판정했다. 구조화된 도식 데이터는 자체 학습 효과 측정 결과가 아니다.

- 브라우저 에뮬레이션이며 실제 휴대전화·터치·물리 키보드 조합·Safari·Firefox 검사로 표현하지 않는다.
- 200%는 문서 기본 글꼴 확대다. OS 디스플레이 배율과 브라우저 페이지 확대를 모두 검사한 것은 아니다.
- 스크린리더용 DOM 관계와 키보드 조작은 확인했으나 NVDA·JAWS·VoiceOver의 실제 음성 출력을 듣지 않았다.
- 그림의 정확한 기술 의미와 공식 출처 원문 검토는 별도 내용 검수 범위다. 이번 링크 검사는 주소·표시·활성화 동작이며 원격 서버의 응답·현재 페이지 상태를 재확인하지 않았다.
- 실제 학습자 이해도·문제 성적 개선을 측정하지 않았다. 도식이 추가됐다는 사실과 교육 효과가 입증됐다는 주장을 구분한다.
- 실제 JVM, 설치 앱, NSIS 설치·제거, 배포 웹은 이번 도식 브라우저 검사에서 실행하지 않았다. 이전 기능 검증을 새 설치·배포 검증으로 재사용하지 않는다.

수정 파일은 새 `tests/theory-visuals.mjs`, 이 보고서뿐이다. 제품 파일과 기존 테스트는 변경하지 않았다.
