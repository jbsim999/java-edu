# 교재 읽기 안내 독립 QA

2026-10-13 KST. **웹 교재·레이아웃·기존 브라우저 기능 판정: PASS.** 최종 동결본에서 정적 5/5, 읽기 안내 24/24, 기존 기능 49/49, 기존 도식 19/19가 통과했다. 발견한 가로 잘림과 활성 탭 문제를 수정본에서 재검증했으며, 이 검사 범위에 남은 재현 결함은 없다.

**새 설치 패키지 실행 판정: BLOCKED·미실행.** 총괄 preflight에서 기존 앱과 학습 데이터를 확인했다. 사용자가 기존 앱을 이용 중이라 학습 데이터 보존 조건을 충족할 수 없어 총괄이 이번 신규 설치·앱 실행 검사를 보류했다. 이는 기존 앱과 기록을 보존하기 위한 조치이며 사용자에게 새 승인을 요청하는 상태가 아니다. QA는 기존 앱·AppData를 실행·변경·이동·삭제하지 않았다. 아래 최소창 검사는 웹 브라우저의 viewport 에뮬레이션이다.

## 수행 범위와 환경

목표는 Java 경력자가 34개 수업의 실제 상황·용어 정의·기존 코드·변수/값 추적·예측과 이유·실무 정리를 따라 읽도록 보완하고, 반복 정보를 정리해 본문 폭을 확보하는 것이다. README 소개 다음의 설치 절차와 직접 다운로드도 검증했다.

실제 부모 소유 HTTP 프리뷰 `http://127.0.0.1:4173`에 접속했다. Windows의 Edge 155.0.4283.45, Node v22.17.0, Playwright 1.62.1을 사용했고 매 시나리오마다 별도 임시 브라우저 컨텍스트를 만들었다. 기본 샌드박스의 localhost/브라우저 접근 제한은 허용된 확장 권한으로 해결했다.

외부 요청과 실행 API는 가로챘다. 읽기 안내의 성취 보존 검사에서 제출 1건은 명시적인 모의 응답이다. 기존 기능 검사도 실행 API를 모의 처리한다. 공식 링크는 키보드로 새 창을 여는 동작·정확한 URL·opener 분리를 검사하고 응답은 로컬에서 대신 제공했다. 원격 문서나 코드 실행 제공자에 학습 코드를 보내지 않았다.

## 실제 검사와 결과

| 명령 | 최종 결과 | 근거 |
| --- | --- | --- |
| `node --test tests/readability.test.mjs` | 5/5 PASS | final-verified/static-readability.log |
| `node tests/readability.mjs` | 24/24 PASS | final-verified/results-1791860453905.json |
| `node work/readability-qa/run-baseline.mjs` | 49/49 PASS | final-verified/baseline/results.json |
| `node tests/theory-visuals.mjs` | 19/19 PASS | final-verified/theory/results-1791859939453.json |
| 담당 테스트 3개 `node --check` | PASS | readability.test.mjs, readability.mjs, bundled-desktop.mjs 구문 검사 |

위 산출물 경로의 기준은 `work/readability-qa/`다. 브라우저 실행 환경변수는 `PLAYWRIGHT_CHANNEL=msedge`, `QA_BASE_URL=http://127.0.0.1:4173`이며, `QA_ARTIFACT_DIR`를 각 표의 디렉터리로 분리했다. 기존 기능 49개는 원본 tests/browser.mjs를 수정하지 않고 외부 요청 차단 wrapper로 실행했다. 기존 tests/theory-visuals.mjs도 수정 없이 실행했다.

`final-verified/final-summary.json`은 결과 개수, 실행 환경, 소스 해시, 실제 본문 폭 및 설치형 미실행 상태를 모은 파일이다. 최종 24개 실행 전후의 모든 기록 대상 해시가 같고, 종료 후 현재 파일과도 다시 일치했다.

| 요구사항·위험 | 실제 검증 | 판정 |
| --- | --- | --- |
| 34개 교재 안내 | 상황·질문·용어/정의·기존 코드·순서 추적·예측/답/이유·실무 정리 필수 구조, 34개 실제 DOM과 원본 데이터의 일치 | PASS |
| 기존 예제와의 연결 | 파일명이 가리키는 기존 example 원문의 연속 발췌인지 검사; 22개 작성 JSON과 배포 모듈의 안내 일치 | PASS |
| 성취·실행 계약 | 이전 예제 코드/출력, 퀴즈 ID/질문/선지/정답, 과제 ID/대상 버전·실행 필드·trusted checks 해시 보존 | PASS |
| 단계와 fallback | 34개 수업의 5단계, 안내가 없는 34개 수업, 잘못된 안내 값, 문법 모듈 장애, HTML처럼 생긴 텍스트 | PASS |
| 읽기 정보의 중복 | 학습 목표는 정보 영역에 1회만 존재; 수업 정보·출처·색상 안내는 기본 닫힘; 상세 이론과 12개 도식은 기본 노출·기존 순서 유지 | PASS |
| 접기·성취·입력 보존 | Enter/Space 반복, 초점 표시/복귀, 예상 답 열람의 성취 불변, 기존 퀴즈·모의 제출 성취·코어/파일별 초안·설계 메모·재로드 | PASS |
| 코드 표시와 조작 | 3개 테마의 실제 계산 색 대비 4.5:1 이상, 구문 강조, 키보드 가로 스크롤, 모의 복사와 권한 거절 시 전체 원문 선택 | PASS |
| 좁은 화면·확대 | 34수업 × 320/360/390/768/1440 CSS px × 100/200% 문서 글자. 안내·예상 답과 학습 정보/출처/있는 경우 색상 안내를 모두 펼쳐 경계 검사 | PASS |
| 도식 회귀 | 12도식 × 같은 5개 폭·2개 글자 크기, 원문/접근성 연결/공식 출처/afterSection 위치/오류 fallback | PASS |
| 최소창 | 704×521·689×521 각각 100/200%에서 목차 열기·Escape·초점 복귀, 5탭 방향키, 직접 hash, 정보 접기, 긴 코드 내부 스크롤, resize·재로드 후 선택 탭과 초안 유지 | PASS |
| 이동·작은 높이 | 390×844↔844×390, 1280×600, 펼친 답 유지·터치 에뮬레이션·실제 viewport 캡처 | PASS |
| 관련 기능 | 정상/오류/취소/반복/늦은 응답·저장 장애·초안/되돌리기·버전/검색/히스토리·편집기 회귀 | PASS |
| README 설치 접근 | 소개 바로 다음 설치, EXE/ZIP 직접 URL, 전체 압축 해제와 환경 준비 안내, 게시 메타데이터 대조 | PASS |

34개 안내를 직접 읽어 입력값·분기·변경 후 상태·반환값과 예측을 대조했다. Redis/Kafka·Docker·OIDC의 코드 읽기와 실제 서비스 검증 범위를 구분했다. 이 검토는 실제 학습자의 이해도 개선을 측정한 연구가 아니다.

이전 계약은 Git 기준 `b2dda6d4f2225e5f2d9b31a5287539bd1b0685b6`의 원문과 대조했다. 테스트에는 정규화한 계약 해시만 고정해 CI의 얕은 checkout에서도 실행할 수 있다. example/quiz의 설명 문구는 보존 대상에서 제외했다.

## 본문 폭과 실제 합성 화면

| viewport | 코드·도식 실제 폭 | 상주 목차 폭 |
| --- | ---: | ---: |
| 1280px | 938.8px | 220px |
| 1440px | 1092.4px | 220px |
| 1920px | 1554px | 228px |

1280→1250→1280 전환에서 코드 폭은 938.8→910→938.8px로 복원됐다. 1280×600 첫 진입에 실제 상황 문장이 노출됐다. 일반 문장과 코드·도식의 폭을 따로 확인했다.

QA가 직접 본 최종 viewport에는 데스크톱 첫 화면, 320px·200% 상단, 390px·200% 예상 답/이유, guide→상세 이론→도식 경계, 펼친 목차, 라이트 테마와 선택, 강조 모듈 실패의 원문 코드, 최소창 실행 버튼이 포함된다. 200%에서는 세로 스크롤로 긴 내용을 읽으며 코드의 내부 가로 스크롤을 유지한다.

대표 산출물:

- `final-verified/reading-layout-1280-top.png`, `reading-layout-1440-top.png`, `reading-layout-1920-top.png`
- `final-verified/reading-layout-320-200-top.png`
- `final-verified/java-basics-1440-guide-to-theory-boundary.png`, `java-basics-1440-theory-to-visual-boundary.png`
- `final-verified/jpa-state-390-guide-to-theory-boundary.png`, `jpa-state-390-theory-to-visual-boundary.png`
- `final-verified/jpa-state-390-open-curriculum-drawer.png`
- `final-verified/java-basics-1440-expanded-lesson-info.png`, `java-basics-1440-expanded-references.png`, `java-basics-1440-expanded-syntax-legend.png`
- `final-verified/theory/*-desktop-figure.png`: 원래 도식 12종의 실제 요소 캡처
- `final-verified/*-desktop-guide.png`: 안내 34개 전체 요소 캡처

별도 visual_director에게 위 캡처와 12개 도식을 전달했다. 전체 시각적 조화의 최종 승인은 그 독립 검수 결과를 따른다. 요소 전체 캡처와 실제 viewport 캡처를 구분하며, 순간적으로 나타나는 복사 토스트는 원래 UI 상태 그대로 기록했다.

## 발견·수정·재검증

| 결함 | 재현 근거 | 최종 상태 |
| --- | --- | --- |
| P2: 기존 공고 카드 가로 넘침 | 최초 320px·200% exceptions에서 문서 337px/viewport 320px. 최초 results-1791856409669.json, overflow-exceptions-320-200.json | 34수업의 닫힘/펼침 행렬에서 재검증 PASS |
| P2: 새 정보 영역의 목표 잘림 | build-maven, 320/360/390px·200%. LI right 379.47px, 카드 clip으로 오른쪽 글자 손실. final/build-maven-320-200-visibility-probe.json, info-open-probe.png | 펼친 실제 요소·텍스트 경계를 포함해 재검증 PASS |
| P2: 최소창의 선택 탭 잘림 | 704/689×521·200%, ArrowRight로 lab 선택. 600ms 뒤도 tab right 764.14 > strip right 688.92, scrollLeft 0. minimum-probe/704-200-keyboard-tabs.json와 viewport.png | 키보드·직접 hash·resize·재로드에서 재검증 PASS |

수정 확인 실행 `fix-verification/results-1791859832771.json`의 3/3 PASS 뒤 전체 최종 검사를 실행했다. 이전 실패 산출물은 삭제하지 않고 유지하며 최신 PASS 근거는 `final-verified/`로 분리했다.

QA 조건도 근거에 맞춰 보정했다. 첫 문장의 높이가 28.5px인 경우 전체가 보여도 40px을 요구하던 조건을 수정했고, 닫힌 `details` 안의 요소는 레이아웃 좌표·크기가 남아 있어도 `checkVisibility()`가 false를 반환하면 넘침 검사에서 제외했다. 초안은 기존 450ms 저장 지연이 끝나 저장값이 나타난 뒤 보존을 검사한다. 원문·성취·펼친 내용의 경계 조건은 유지했다.

## README와 변경 파일

검사 시점의 README 직접 링크는 v0.3.0 EXE 362,799,820바이트와 ZIP 362,369,704바이트였다. 총괄이 확보한 `work/bundled-desktop-qa/release-published.json`의 릴리스 ID 410409363, uploaded 상태, URL·크기·SHA-256과 일치했다. 대용량 파일은 재다운로드하지 않았다. 대조 기록은 `work/readability-qa/readme-assets-audit.json`이다. 후속 v0.3.1 공개/다운로드 검증은 총괄의 새 릴리스 기록으로 관리한다.

QA 변경 파일은 `tests/readability.test.mjs`, `tests/readability.mjs`, `tests/bundled-desktop.mjs`, 이 보고서와 `work/readability-qa/` 산출물이다. 교재·UI·README·실행기·Git·배포는 QA가 수정하지 않았다.

추가 승인된 bundled-desktop 테스트에는 package.json의 버전 비교, 독립 산출물 디렉터리 환경변수, 실제 패키지의 34개 안내와 예상 답 열람 시 성취 불변 검사를 준비했다. 기존 사용자 데이터 부재를 요구하는 preflight를 보존했으며 실제 패키지 테스트는 실행하지 않았다.

## 검증한 소스와 미확인 범위

| 파일 | SHA-256 |
| --- | --- |
| dist/index.html | 4300648bde32c51c134d4d0d9d12659b5149630995041c7b588cd121a4105269 |
| dist/app.js | 1f0d9746ee94a8d0a4e51f7c2b798e797026303bad179119680ea7d129258a0b |
| dist/styles.css | 8baf9bf900bdbcb2f8a7ab82fb0a17b1fada55dc7e94532c144c2ee3e911816d |
| dist/data/curriculum.js | e61c9547892d3df1b9709a3191699026f608b806e57be04d1b1cc88057fa1e20 |
| dist/data/professional.js | fdd4c80e335c941ea936afbc14f75be18ddcc15d3b72088cad9c35c5fa582ce0 |
| dist/data/lesson-visuals.js | 6a1a2085a55b9e41ca33f972052953adf4445fd7c49dd738f6b6ed4cc67cc442 |
| tests/readability.mjs | 06190fa7911ad97929c8cc1ab94a69fa79776bcb1b13c10a7eaa20c96e8d3b12 |

물리 휴대전화, 실제 Windows 한글 IME, OS 클립보드, 화면 읽기 프로그램의 음성 출력, OS 배율·실제 브라우저 페이지 줌, 학습자의 이해도 개선은 미검증이다. 200%는 문서 기본 글자 확대이고 터치와 최소창은 브라우저 에뮬레이션이다. 기존 기능 검사의 한글 composition 이벤트 모의 검증은 실제 IME 검증과 구분한다.

이번 웹 QA는 JVM 실행, Redis/Kafka 연동, 설치형 실행, 배포/다운로드 후 설치 검증을 대신하지 않는다. 새 설치 패키지는 기존 사용자 데이터 보호 때문에 **BLOCKED·미실행** 상태로 남긴다. 웹·정적 검사 범위의 최종 판정은 **PASS**다.
