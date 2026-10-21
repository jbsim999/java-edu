# 문서 확인 사항 9곳의 근거

확인일: 2026-10-21. `e329d306871ba3a6c51d08d8eb677d5e27326548`의 문서를 기준으로, 윤문 때 보류한 표현 9곳을 코드·메타데이터·기존 QA 기록·공식 자료와 대조했다. 과거 검사 결과의 의미와 현재 재확인한 범위를 구분해 기록한다.

## 1. 공고와 관찰 기술의 관계

[협업 규칙](../CONTRIBUTING.md)은 공고 자체를 기술이라고 부르려는 뜻이 아니다. 공고에서 확인한 기술·경험을 조사 표본의 관찰 결과로만 설명하고 사용률이나 Java 버전별 채용 수요로 일반화하지 않는다는 정책으로 명확히 했다.

근거는 [공고 조사 기록](job-evidence.md)의 2026-10-12 선정 표본 정의와 [공고 데이터](../dist/data/job-evidence.js)의 기술·경험·접근 범위다. 이번에는 모집 상태를 새로 조사하지 않았다.

## 2. 기본 실무 프로젝트 20개

[실무 카탈로그](../curriculum/professional/catalog.json)의 22개 중 `redis-cache`·`kafka-idempotency` 두 선택 단원을 제외한 20개다. [기본 실무 검사](../scripts/check-professional.mjs)도 이 두 단원을 명시적으로 제외한다.

[환경 준비 구현](../server/local/engine.mjs)과 [Maven 실행 구성](../server/local/projects.mjs)에 따라 각 프로젝트의 첫 준비에서 의존성과 기준 테스트를 확인한다. 20개 전체를 한 번에 자동 준비한다는 뜻이나, 설치 앱에서 20개 모두를 다시 실행했다는 뜻으로 확대하지 않았다.

## 3. 7z 형식과 7-Zip 19.00 기반 해제기

`7z`는 당시 내부 패키지의 압축 형식이다. `19.00`은 NSIS 자체 버전이 아니라 설치기에 포함된 **Nsis7z 플러그인이 기반으로 삼은 7-Zip 버전**이다. [Nsis7z 공식 안내](https://nsis.sourceforge.io/Nsis7z_plug-in)와 [7-Zip 변경 이력](https://www.7-zip.org/history.txt)을 대조했다. ARM64 압축 필터는 7-Zip 23.00에서 추가됐다.

로컬 보존 기록 `work/nsis-bundle-diagnosis.json`에는 빌드본 604개 중 설치본에서 2개가 빠진 결과가 있다. `work/nsis-codec-diagnosis.json`은 아래 두 항목의 압축 방식이 `ARM64 LZMA2:20`이었음을 기록한다.

- `maven/lib/jline-native/Linux/arm64/libjlinenative.so`
- `maven/lib/jline-native/Windows/arm64/jlinenative.dll`

[빌드 설정](../desktop/build-config.cjs)은 `differentialPackage:false`·`useZip:true`를 사용한다. [electron-builder 공식 옵션](https://www.electron.build/v26/docs/nsis/#usezip)과 일치한다. 이번에는 과거의 실패 설치를 재현하지 않았으며, 기록된 누락과 ZIP 전환의 뜻을 명확히 했다.

## 4. Maven의 LICENSE와 NOTICE

`LICENSE/NOTICE`라는 경로 하나가 아니라 Maven 배포 폴더 최상위의 **별도 파일 `LICENSE`와 `NOTICE`**다. [공급자 출처 메타데이터](../desktop/toolchain-provenance.json)의 `licenseFiles`와 로컬 번들 manifest에서 각각의 파일을 확인했다.

로컬 파일 크기는 각각 21,346바이트·5,022바이트이며 SHA256이 `work/desktop-bundle/manifest.json`과 일치했다. `lib`·`boot` 폴더의 라이선스 파일도 구분해 표기했다. 배포물 보존 범위를 설명한 것으로, 라이선스 의무를 새로 해석한 작업은 아니다.

## 5. Mac의 ‘패킷 9개’와 링크 17개

여기서 ‘패킷’은 네트워크 패킷이 아니라 [v0.4.0 릴리스](https://github.com/jbsim999/java-edu/releases/tag/v0.4.0)의 첨부 파일을 뜻한다. 앱 패키지 4개, 대응 소스 2개, 체크섬·QA·출처 자료 3개로 총 9개다. 현재 읽기 API에서도 첨부 9개가 `uploaded` 상태이고 SHA256 digest가 있음을 확인했다.

`fad64eb` 당시의 [README](../README.md), [Mac 설치 안내](macos-installation.md), [Mac 검증 기록](macos-verification.md)에 있는 v0.4.0 첨부 다운로드 링크는 각각 7개·7개·3개, 총 17개다. 문서가 17개라는 뜻은 아니다.

원래 게시 검사 로그를 담은 `work/macos-release-0.4.0/` 폴더는 이번 작업 폴더에 없어 다시 읽지 못했다. Git 이력·링크 수·현재 릴리스 메타데이터를 대조했으며, 첨부 9개를 새로 다운로드해 해시를 계산하거나 당시 독립 검수를 재수행한 것은 아니다. 따라서 본문도 당시 검수 **기록의 대상**을 설명하도록 한정했다.

## 6. 닫힌 details와 레이아웃 좌표

[읽기 화면 검사](../tests/readability.mjs)는 `checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })`가 false인 요소를 넘침 검사에서 제외한다. 위치·크기가 0인지만 보는 조건이 아니다. 로컬 `work/readability-qa/final/build-maven-320-200-visibility-probe.json`에도 닫힌 상태에서 좌표·크기가 남지만 API 판정은 false인 요소가 기록돼 있다.

[MDN의 checkVisibility 설명](https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility)과 대조해 ‘실제 가시성’이라는 모호한 말을 API 판정으로 풀었다. 이 API가 true를 반환해도 화면 안에 있는지나 다른 요소에 가려졌는지까지 보장하지는 않는다. 펼친 내용의 경계는 검사 파일의 별도 시나리오로 확인한다.

## 7. 도식이 넘지 말아야 할 검증 범위

[도식 선정표](theory-visuals.md)의 범위는 화면 폭이 아니라 **실습에서 실행·연동을 확인한 범위**다. MockMvc 실습에 없는 서버·네트워크 배치, 미실행 OIDC 전체 로그인, 미검증 Redis·DB 정합성, exporter·배포 구성을 검증한 것처럼 보이게 하는 도식은 제외한다는 뜻이다.

이 선정 이유는 `a0d1257` 당시 문서에도 기록돼 있다. 해당 연동을 이번에 새로 실행하거나, 관련 개념을 설명하는 그림을 모두 금지하는 정책으로 바꾸지 않았다.

## 8. 120개 조건에서 확인한 결과

[도식 검사](../tests/theory-visuals.mjs)의 12개 도식 × 5개 너비 × 2개 글자 크기는 120개 조건이다. 이를 10개 레이아웃 시나리오로 검사하며, 전체 검사 19개 또는 화면 캡처 120장이라는 뜻은 아니다.

로컬 `work/theory-independent-qa/results-1791785197447.json`에는 이 10개 시나리오가 모두 PASS로 남아 있다. 문서 가로 넘침·도식 밖 요소·가로 잘림은 1px 허용오차로 검사했다. [당시 독립 QA](theory-visual-qa-report.md)의 결과와 소스 해시 기록도 대조했으므로 ‘검사 기준상 넘침이나 라벨 잘림이 없었다’고 명시했다.

이는 당시 브라우저 에뮬레이션 결과다. 이번에 120개 조건을 재실행한 결과나 실제 기기·브라우저 페이지 확대 검증으로 표시하지 않는다.

## 9. 앱 시작 시 번들 도구 자동 등록

[앱 시작 경로](../desktop/main.cjs)는 [설정 초기화](../server/local/settings.mjs)를 호출해 번들 도구를 등록한다. 이 단계의 파일·메타데이터 확인은 Java·javac·Maven 명령이나 학습 코드를 실행하는 작업과 다르다. Windows 시작프로그램에 앱을 등록한다는 뜻도 아니다.

[번들 도구 단위 검사](../tests/local/bundled-runtime.test.mjs)는 시작 등록 때 프로세스 호출이 0회이고, 초기 동의가 false이며, 미동의 실행이 차단되는 조건을 검사한다. [실행기](../server/local/engine.mjs)는 환경 준비와 코드 실행에서 동의를 확인한다. 앱 프로세스 자체를 실행하지 않는다는 뜻으로 읽히지 않게 문장을 고쳤다.

## 이번 검증의 범위

본문 9개 표현의 근거와 수정 대응, 기본 프로젝트 20개, 다운로드 링크 17개, 라이선스 파일 2개의 manifest 해시, 과거 레이아웃 검사 120개 조건의 PASS 기록을 대조했다. 과거 QA 결과를 읽은 작업과 현재 실행한 단위 검사를 구분한다.

```sh
node --test tests/local/bundled-runtime.test.mjs tests/local/reference-policy.test.mjs
```

최종 실행에서 번들 자동 등록·무결성·링크 정책의 관련 단위 검사 **11개가 통과했고 실패·생략은 없었다**. 처음에는 임시 파일 이름 변경과 디렉터리 링크 생성이 실행 환경의 권한 제한으로 실패했다. 프로젝트 전용 임시 폴더의 범위를 확인한 뒤 허용된 실행 환경에서 동일한 검사 코드를 재실행해 통과했으며, 앞선 실패 로그도 보존했다. 테스트 코드나 제품 코드를 바꾸어 우회하지 않았다.

실제 설치·Kafka/Redis 연동·Gatekeeper·과거 화면 검사의 재실행은 이 문서 변경의 검증 범위에 포함하지 않는다.
