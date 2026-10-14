# 독립 QA 기록

기준일: 2026-10-12 (Asia/Seoul)

**판정: PASS — 아래에 명시한 로컬 브라우저 QA 범위.** 최종 테스트 파일의 35개 시나리오는 전체 검사와 변경 영향에 따른 선택 재검사를 합쳐 모두 실행·통과했다. 최종 35개를 한 번의 명령으로 실행했다는 뜻은 아니다. 독립 시각 검수 담당자도 최종 합성 화면을 직접 확인한 뒤 검토 범위에 대해 PASS를 전달했다.

QA 담당자는 `tests/browser.mjs`, 이 문서와 지정된 화면 증거만 작성했다. 앱·교육 데이터·API 구현은 수정하지 않았다. 대상은 다른 언어 경험자의 Java 전환 학습과 현직자 심화 학습이다.

## 환경과 경계

- Windows, Node.js `v22.17.0`, Playwright `1.62.1`, 시스템 Edge `155.0.4283.45`, headless 실행.
- 부모 담당자가 소유한 개발 서버 `http://127.0.0.1:4173`. QA는 서버를 시작·변경하지 않았다.
- 각 시나리오는 별도 브라우저 컨텍스트를 사용했다. 실제 사용자 기록은 사용하거나 변경하지 않았다.
- `/api/runtime`과 `/api/execute`를 Playwright route로 대체했다. QA의 실제 외부 코드 실행 요청은 **0건**이다. 화면의 성공·오류 응답은 UI 검사용 데이터이며 실제 Java 채점 결과를 증명하지 않는다.
- 클립보드 성공·거부도 API 모의 구현으로 검사했다. 사용자 OS 클립보드는 변경하지 않았다.
- 320·360·390·768·1440 CSS px, 1280×600 및 844×390을 사용했다. 실제 휴대전화·태블릿 검사가 아니다.
- 글자 확대는 루트 글꼴 크기 200% 변경이다. 브라우저 메뉴 확대나 OS 디스플레이 배율을 검사한 것은 아니다.

## 명령과 실제 결과

작업 디렉터리: `outputs/java-learning-lab`.

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node tests/browser.mjs
```

기본 브라우저는 Chromium이다. `QA_FILTER`가 있으면 이름이 정규식과 일치하는 시나리오만 실행하며, 선택된 시나리오가 0개이면 실패한다. `QA_TRACE_SCREENSHOTS=1`은 캡처 시 초점·스크롤·활성 탭 경계를 출력한다.

| 실행 | 실제 결과 |
| --- | --- |
| `node --check tests/browser.mjs` | 종료 코드 0 |
| 초기 서버 준비 확인 | sandbox에서는 EACCES, 상승 실행에서는 ECONNREFUSED. 브라우저 검사 시작 전 중단. 부모 담당자가 서버 실행 경계를 바로잡은 뒤 연결됨. |
| 전체 33개 시나리오 | 32 PASS, 1 FAIL. 빈 코드에 validation_error를 요구한 테스트 기대값 오류였다. 실제 계약인 입력 안내 toast·편집기 초점·요청 차단은 정상 동작했다. |
| `QA_FILTER='empty-source-and-utf8-payload-limit'` | 기대값을 계약에 맞춘 뒤 1 PASS, 0 FAIL, 종료 코드 0. 빈 코드와 UTF-8 32 KiB 초과 요청 모두 서버 전송 전 차단. |
| 첫 CSS 수정 후 선택 검사 | 11 PASS, 0 FAIL, 종료 코드 0 |
| 최종 탭·번호 수정 후 선택 검사 | 15 PASS, 0 FAIL, 종료 코드 0. 새 활성 탭 경계·모바일 긴 오류문 검사 2개 포함. |

최종 선택 재검사 명령:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:QA_FILTER = 'lesson-steps|run-submit-and-two|execution-error-states|keyboard-tabs|mobile-drawer|responsive-|resize-orientation|initial-text|mobile-long'
$env:QA_TRACE_SCREENSHOTS = '1'
node tests/browser.mjs
```

## 검증 매트릭스

| 범위 | 실제 확인한 조건 | 결과 |
| --- | --- | --- |
| 수업·근거 | 12개 수업의 5개 단계, 실습 초기 코드, 공식 링크와 공고 표본 한계 안내 | PASS |
| 버전·트랙·검색 | Java 8/11/17/21 수업 집합, 공통 수업을 포함한 두 트랙, 제목 검색, 검색 결과 없음·복구, HTML 형태 검색어 | PASS |
| 링크·이동 | 잘못된 수업/단계/버전, 상위 버전 수업 직접 접근 차단, 뒤로·앞으로, 검색 실패 후 이어 학습하기 | PASS |
| 퀴즈 | 미응답·오답 미완료, 재시도, 탭 이동 중 선택 유지, 모두 정답인 경우 성취와 reload 후 유지 | PASS |
| 기록·초안 | 메모 작성만으로 성취를 만들지 않음, 수업별 코드 분리, 탭·수업 이동·즉시 reload 시 보존 | PASS |
| 초기화 | 코드 초기화와 undo, 전체 기록 초기화 취소·확인, 선택 버전 보존, 초기화 후 reload | PASS |
| 성취 정합성 | 예시 실행·일부 제출 실패는 미완료, 퀴즈와 제출 모두 통과해야 완료, 코드 변경 시 이전 통과와 현재 상태 분리 | PASS |
| 재제출 회귀 | 같은 코드의 통과 이후 failed/compile_error/runtime_error/timeout 제출 시 성취·완료 해제와 reload 후 유지 | PASS |
| 입력·응답 오류 | 빈 코드·UTF-8 크기 제한, 컴파일/런타임/타임아웃/제공자 오류, HTTP 400/413/429/502/503, 네트워크 실패, 비 JSON 응답, 실행 환경 복구 | PASS |
| 거짓 성공 방지 | 검사 0개, 통과 수치와 실패 항목의 모순, 다른 requestId 응답이 완료를 만들지 않음 | PASS |
| 비동기 경계 | 대기 중 편집·수업 이동·버전 변경·취소 시 낡은 응답 무효화, 중복 버튼 비활성화, 자동 재시도 없음 | PASS |
| 출력·복사 | HTML 형태 출력이 문자로 표시됨, 복사 성공 및 거부 시 직접 복사를 위한 선택·초점 | PASS |
| 저장소 제한 | 손상 JSON 및 읽기/쓰기 거부 시 수업·임시 코드·퀴즈 사용 가능, 저장 제한 안내 | PASS |
| 키보드·초점 | 입력 레이블, 탭 Arrow/Home/End, 라디오, 편집기 입력·Tab 이탈, dialog·모바일 목차 Escape와 초점 복귀 | PASS |
| 화면 조합 | 7개 크기에서 5개 단계, 페이지 가로 넘침 없음, 버튼 경계, 긴 코드·컴파일 진단의 박스 내부 스크롤 | PASS |
| 확대·리사이즈 | 입력 보존, 가로·세로 전환, 200% 글자, 확대 전/후 선택 모두 활성 탭의 상하좌우 경계 보장 | PASS |

## 재현 문제와 수정 확인

| 문제·심각도 | 재현·실제 결과 | 기대·조치와 확인 |
| --- | --- | --- |
| 같은 코드의 새 제출 실패 이후 과거 성취 유지 — 코드 리뷰에서 제기 | 코드 리뷰 담당자의 요청으로 회귀 추가. QA는 수정 후 상태를 검사했다. | 최신 유효 제출 실패 시 성취·완료 해제. 4개 실패 상태 및 reload PASS. |
| 200% 버전 라벨 분절 — 시각 P2 | 고정 사이드바 안에서 select와 라벨이 경쟁하여 한 글자씩 분절됨. 독립 시각 검수에서 재현. | 버전 선택기를 단일 열로 수정. 최종 이미지에서 해결 확인. |
| 200% 로고 돌출 — 시각 P2 | 글자는 확대되나 배경은 고정 크기여서 밖으로 돌출됨. | 비례 크기와 헤더 줄바꿈 적용. 최종 이미지에서 해결 확인. |
| 실행 안내 가독성 — 시각 개선 항목 | 실행 환경·실행 전 결과 안내의 낮은 대비를 독립 시각 검수에서 지적. | 텍스트 색상·크기 수정. 최종 이미지에서 해결 확인. |
| 390px·200% 활성 탭 가림 — 시각 P2 | 코드 실습 선택 상태에서 확대·리사이즈하면 글자·밑줄이 내부 스크롤 영역 밖으로 가려짐. 페이지 가로 넘침 검사만으로 검출되지 않음. | 좁은 화면 탭 줄바꿈, 활성 탭 경계 검사 추가. 확대 전/후 선택 모두 PASS. 최종 탭 영역 x=36.19~353.81, 활성 코드 실습 x=169.17~328.22. |
| 320px 이론 번호 분절 — 시각 P3 | 절 번호 03이 분절됨. | 번호 축소·줄바꿈 방지. 최종 이미지에서 해결 확인. |

기능·입력·화면 경계에서 남은 차단 결함은 없다. 시각 검수 담당자는 수정된 확대 탭 두 상태, 320px 번호, 모의 성공·오류 결과를 직접 재확인한 뒤 검토한 로컬 합성 화면에 PASS를 전달했다.

## 화면 증거

로컬 작업 공간의 `work/java-edu-qa/`에 PNG를 저장했다. 이 경로는 개발 작업 공간 산출물이며 외부 호스팅 URL이 아니다.

| 화면 | 주요 파일 |
| --- | --- |
| 데스크톱 학습 | desktop-theory.png, desktop-example.png, desktop-ide.png, desktop-practice-long-content.png |
| 모바일 학습 | mobile-quiz.png, mobile-practice.png, mobile-ide.png, mobile-drawer-360.png |
| 모바일·태블릿 경계 | viewport-320-theory.png, viewport-320-lab.png, viewport-360-theory.png, viewport-360-lab.png, viewport-768-theory.png, viewport-768-lab.png |
| 낮은 높이·조작부 | viewport-320x720-lab-controls.png, viewport-360x800-lab-controls.png, viewport-768x1024-lab-controls.png, viewport-1280x600-lab-controls.png, viewport-844x390-lab-controls.png |
| 데스크톱 확대 | desktop-text-200-percent.png, desktop-text-200-top.png, desktop-text-200-version.png |
| 모바일 확대 | mobile-text-200-percent.png, mobile-text-200-top.png, mobile-text-200-tabs.png, mobile-text-200-tabs-selected-before-enlargement.png, mobile-text-200-editor.png, mobile-text-200-controls.png, mobile-text-200-output.png, mobile-text-200-drawer.png |
| 모의 제출 결과 | desktop-submit-passed.png, desktop-submit-passed-result.png, mobile-compile-error.png, mobile-compile-error-result.png |

초기 fullPage 캡처에서 화면 밖 고정 skip-link가 문서 중간에 포함되는 현상을 확인했다. 최종 fullPage는 스크롤을 맨 위로 이동해 촬영하고 위치를 복원한다. 실제 viewport와 DOM 측정에서 skip-link는 초점이 없었으며 100% y=-96~-48.125, 200% y=-192~-96.21875로 화면 밖이었다. 항상 노출되는 링크로 오인하지 않는다.

## 검증 소스 식별

최종 화면 회귀 당시 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| dist/app.js | C176883B44692D1EF89ECB1719B4040558348C9EEF5196A5E5FD422AD286566C |
| dist/styles.css | C2D433075AC2B66F60403AB4208E7C0AE46DC22320A2BE5E6E05CDFD0F6CC9B9 |
| dist/data/curriculum.js | CDB6607660F282C523A68771B3C9A86EAB9ABDB83909197BD2084E77EB98E73F |
| dist/data/exercises.js | 8F859F0641A3D8E59540DD0BD0EBF306ECE9A583B65437A2864D7E084551ACDE |
| tests/browser.mjs | A68CDD638669B8E6CB82953B9EBE5178128D48698E82BFCAD5D02376AC3EB166 |

## 미검증·해석 제한

- 실제 Java 컴파일·실행, JDK별 언어/API 정합성, 외부 제공자 연결·제한·보안은 이 모의 API UI 검사 결과에 포함하지 않는다. 담당자의 별도 결과를 확인해야 한다.
- 실제 기기, iOS Safari·Firefox·CI Chromium, 스크린리더, 모바일 길게 누르기·IME 조합 입력은 실행하지 않았다.
- OS 클립보드 연동, 브라우저 메뉴 확대, 네트워크 단절 뒤 서비스 워커 기반 오프라인 재접속은 검사하지 않았다.
- 공식 문서·공고 링크의 화면 표시는 검사했지만 원문 사실 검증이나 현재 채용 상태 재조사는 별도 조사 결과의 영역이다.
- 테스트 완료는 학습자의 교육 효과 실측이나 설계 과제에 대한 전문가 승인이 아니다.