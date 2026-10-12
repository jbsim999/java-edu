<div align="center">

<img src="docs/assets/java-edu-banner.svg" alt="Java Edu — 공식 문서로 이해하고, 직접 코딩하며 배우는 Java" width="100%" />

# Java Edu

**공식 문서로 이해하고, 직접 코딩하며 배우는 Java.**

다른 언어 경험자의 Java 전환 학습부터 현직 개발자의 OOP·백엔드 심화까지.

[![Java](https://img.shields.io/badge/Java-8%20%7C%2011%20%7C%2017%20%7C%2021-315b45?style=flat-square)](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/java-version-matrix.md) [![Windows](https://img.shields.io/badge/Desktop-Windows%20x64-315b45?style=flat-square)](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/installation.md) [![Lessons](https://img.shields.io/badge/Lessons-34-806223?style=flat-square)](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/education-roadmap.md) [![Status](https://img.shields.io/badge/Status-v0.3.0%20preview-806223?style=flat-square)](https://github.com/jbsim999/java-edu/issues) [![CI](https://github.com/jbsim999/java-edu/actions/workflows/verify.yml/badge.svg?branch=feat%2Fjava-learning-mvp)](https://github.com/jbsim999/java-edu/actions/workflows/verify.yml?query=branch%3Afeat%2Fjava-learning-mvp)

[교육 로드맵](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/education-roadmap.md) · [개발 소스](https://github.com/jbsim999/java-edu/tree/feat/java-learning-mvp) · [기여 안내](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/CONTRIBUTING.md) · [버그·제안](https://github.com/jbsim999/java-edu/issues)

</div>

## 소개

Java Edu는 **Windows에서 코드를 직접 실행하는 학습 앱과 웹 교재**를 함께 만드는 한국어 교육 프로젝트입니다. 문법을 넘어 객체의 책임·불변식, 타입과 동등성, 동시성, 트랜잭션을 코드와 행동 검사로 연결합니다.

수업은 **이론 → 예시 → 문제풀이 → 실무 심화 → 직접 코딩** 순서로 진행합니다. Java 언어·표준 API는 Oracle/OpenJDK 공식 문서를, 프레임워크·라이브러리는 각 프로젝트의 공식 문서를 기준으로 합니다. 실무 주제에는 출처를 기록한 채용 공고의 기술 요건도 연결합니다.

> **개발 상태** — 전체 34수업과 Windows 앱 소스는 `feat/java-learning-mvp` 브랜치에 있습니다. `main`은 프로젝트 소개를 제공합니다. [Windows v0.3.0 통합 프리뷰](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)를 설치해 학습할 수 있습니다. [호스팅 웹](https://java-edu-lab-jbsim999.junbo1218.chatgpt.site)은 소유자 전용이며 34수업·이론 도식 12개·편집기 테마가 배포돼 있습니다.

## 학습실 미리보기

![Java Edu 학습실: 수업 목록, 과제 설명, Java 문법 색상과 직접 코딩 편집기](docs/assets/learning-lab.png)

*개발 중인 공용 학습실의 실제 로컬 웹 화면입니다. 화면 캡처를 실행·제출 성공 근거로 사용하지 않습니다.*

## 주요 기능

| 기능 | 학습 경험 |
| --- | --- |
| 공식 문서 기반 과정 | Java 8·11·17·21의 언어·API 차이와 공식 출처 확인 |
| 깊이 있는 OOP | 객체의 책임·불변식, 다형성·합성, 동등성·변경 계약 탐구 |
| 검수한 이론 도식 | 참조·상태·호출·보안 조건을 설명하는 12개 도식과 공식 참고자료 |
| 직접 코딩 | 클래스 골격, 메서드 본문, 다중 파일 프로젝트에 코드 작성 |
| 읽기 쉬운 편집기 | 클래스·타입·변수·메서드 문법 색상, 다크·라이트·고대비 테마 |
| 로컬 Java 실행 | 별도 설치 없이 포함된 JDK 21로 컴파일·실행·제출·취소 |
| 실무 프로젝트 | Spring/H2·REST·MyBatis·JPA·보안 과제를 고정 테스트로 확인 |
| 이어서 학습 | 진도·메모·코드 초안·테마 저장 및 앱 재시작 후 복원 |

## 교육 과정

**Java 코어 12수업 + 실무 22수업 · 개념 문제 68문항 · 코딩 과제 34개**

| 과정 | 주요 주제 |
| --- | --- |
| Java 사고 모델 | 값 전달·객체 동등성, OOP·불변식·다형성·합성 |
| 언어와 표준 API | 컬렉션·제네릭·예외·Stream·날짜/시간, 동시성, 최신 Java |
| 빌드와 테스트 | Maven, JUnit, AssertJ, Mockito, Lombok |
| Spring과 HTTP | DI·AOP, MVC·REST, JSON·입력 검증 |
| 데이터와 일관성 | JDBC·MyBatis·JPA, Flyway, 트랜잭션·동시 수정 |
| 보안과 운영 | CSRF, OAuth2/OIDC의 인증 주체, JWT 검증, 관측·빌드/배포 비교 |
| 선택 과정과 캡스톤 | Redis 캐시, Kafka 멱등성, 주문 API 통합 프로젝트 |

기본 실무 20프로젝트는 H2·로컬 테스트를 사용합니다. Redis/Kafka 두 단원은 별도 선택 환경이며 실제 서비스 연동은 아직 검증하지 않았습니다. OIDC 수업은 인증 주체 처리에 집중하고 전체 로그인 프로토콜 구현은 다루지 않습니다. [전체 로드맵](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/education-roadmap.md) · [실무 과정 상세](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/professional-curriculum.md)

## 빠르게 시작하기

**Windows 학습자:** [v0.3.0 통합 패키지](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)에서 **설치 EXE 또는 ZIP 중 하나**를 받습니다. EXE는 설치 후 실행하고, ZIP은 전체 내용을 풀고 `Java Edu.exe`를 실행합니다. Java·Maven·Node.js가 포함되어 별도 설치와 폴더 등록이 필요 없습니다. Spring 실습의 첫 환경 준비에는 인터넷이 필요합니다. [설치 안내](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/installation.md)

**개발 소스 실행:** Node.js 22 이상이 필요합니다.

```sh
git clone --branch feat/java-learning-mvp https://github.com/jbsim999/java-edu.git
cd java-edu
npm ci
```

**웹 교재 실행**

```sh
npm run dev
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. 실무 코드는 웹에서 편집하고 프로젝트 ZIP을 내려받을 수 있습니다. Spring 프로젝트 실행은 Windows 앱 또는 로컬 IDE에서 진행합니다.

**Windows 학습 앱 실행**

```sh
npm run desktop
```

개발 실행에 번들을 준비하지 않았다면 앱에서 자신의 JDK/Maven을 등록합니다. 배포 패키지는 도구를 자동 등록하며, 학습 코드 실행에는 명시적인 동의가 필요합니다. 실무 과제는 **환경 준비 → 파일 편집 → 실행·제출** 순서로 진행합니다. [Windows 사용 안내](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/installation.md)

<details>
<summary><strong>Windows 설치 파일 직접 빌드</strong></summary>

```sh
node scripts/bundle-runtime.mjs --jdk21 <JDK21-폴더> --maven <Maven3-폴더> --metadata desktop/toolchain-provenance.json
npm run check:bundle
npm run build:desktop
```

공식 원본 ZIP의 체크섬을 대조하고 전체 배포 폴더를 준비한 뒤 빌드합니다. `desktop-release/`에 Windows x64 NSIS 설치 EXE와 전체 ZIP을 생성합니다. 직접 재빌드한 파일은 배포 파일과 별도로 검증해야 합니다. [번들·출처·대응 소스 계약](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/bundled-runtime.md) · [배포 파일과 SHA-256](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)

</details>

### 실행 방식과 버전

| 구분 | Windows 앱 | 웹 교재 |
| --- | --- | --- |
| Java 코어 | 기본 포함 JVM 21, 컴파일 대상 8·11·17·21; 다른 실제 JDK는 선택 등록 | Wandbox의 JVM 21, 과제별 최소 지원 버전으로 컴파일 |
| Spring 프로젝트 | 컴파일 대상 17, 포함 JDK 21·Maven 3.10.0 사용 | 교재·파일 편집·ZIP 다운로드 |
| 코드 전송 | 작성 코드를 Wandbox로 전송하지 않음 | 코어 실행·제출 시 Wandbox로 전송 |
| 학습 기록 | 앱 데이터에 저장 | 해당 브라우저에 저장 |

웹과 앱 간 자동 동기화는 제공하지 않습니다. 실무 첫 환경 준비에는 앱 내부의 의존성 다운로드가 필요하며, 처음부터 모든 실무가 완전 오프라인인 패키지는 아닙니다. 실제 JDK 8·11·17 추가 등록은 고급 설정의 선택 기능입니다. [로컬 실행 계약](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/local-execution.md)

## 개발과 검증

| 명령 | 목적 |
| --- | --- |
| `npm run check` | 콘텐츠·API·구문 정합성 검사 |
| `npm run test:java` | 설치된 JDK의 Java 예제·답안 검사 |
| `npm run test:local` | 로컬 실행·Windows 프로세스 종료 계약 검사 |
| `npm run test:professional` | JDK/Maven에서 실무 기준 구현과 미완성 코드 비교 |
| `npm run test:browser` | 실행 중인 로컬 서버의 모의 API 브라우저 검사 |
| `npm run test:theory` | 이론 도식·원문 보존·키보드·반응형 검사 |
| `npm run build` / `npm run test:worker` | 웹 Worker 빌드·산출물 검사 |

실무 검사는 `JAVA_HOME`·`MAVEN_HOME` 설정이 필요합니다. 기본 검사는 Redis/Kafka를 제외합니다. 브라우저 검사는 실행 제공자의 실제 동작 검증과 구분합니다.

2026-10-12 기준, 통합 패키지 소스 `0e1ff5e`의 [CI 12작업](https://github.com/jbsim999/java-edu/actions/runs/38223955175)이 모두 성공했습니다. 최종 실제 ZIP **10/10**, NSIS 설치 앱 **10/10**, 원본 도구 604파일 대조·설치/제거·데이터 보존 및 독립 시각 검수 PASS. 기본 실무 20프로젝트·54개 JUnit, 4실제 JDK 검사는 CI에서 별도로 통과했습니다. CI 배지는 개발 브랜치의 현재 결과를 표시하며 검증 범위와 미확인은 기록을 따릅니다. [통합 패키지 QA](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/bundled-desktop-qa-report.md) · [검증 기록](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/verification.md)

## 문서와 로드맵

| 찾는 내용 | 문서 |
| --- | --- |
| 서비스의 목표와 학습 대상 | [기획안](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/product-plan.md) |
| 학습 순서와 Java 버전 | [교육 로드맵](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/education-roadmap.md) · [호환 기준](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/java-version-matrix.md) |
| 코어·실무 교재 | [Java 코어](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/curriculum.md) · [실무 22단원](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/professional-curriculum.md) |
| 이론 도식의 선정과 검수 | [34수업 평가·12개 채택 근거](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/theory-visuals.md) · [독립 QA](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/theory-visual-qa-report.md) |
| 채용 공고 조사 근거 | [출처·표본·조사 범위](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/job-evidence.md) |
| 구조와 실행 경계 | [아키텍처](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/architecture.md) |
| 통합 ZIP·설치 앱 검증 | [번들 QA](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/bundled-desktop-qa-report.md) · [이전 0.2 설치 QA](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/installed-desktop-qa-report.md) |
| 현재 작업·출시 상태 | [마일스톤](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/milestones.md) · [개발 인계](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/development-handoff.md) |

- [x] Java 코어 12수업과 직접 코딩 과제
- [x] Java 문법 강조·3테마·다중 파일 편집
- [x] Windows 로컬 JDK/Maven 실행과 진도 저장 구현
- [x] 실무 22수업과 기본 20프로젝트의 기준 검증
- [x] 이론 도식 12개와 공식 출처·텍스트 설명
- [x] Windows CI·설치/제거 검증·최종 시각 검수
- [x] 34수업·이론 도식 웹 교재 배포
- [x] Java·Maven 포함 Windows EXE와 전체 ZIP 패키징
- [x] [Windows v0.3.0 통합 프리뷰 릴리스](https://github.com/jbsim999/java-edu/releases/tag/v0.3.0)
- [ ] 선택 과정의 Redis/Kafka 실제 연동 검증

## 기여와 문의

교육 내용의 오류, 공식 문서와 다른 설명, 실행 문제와 개선 아이디어는 [Issues](https://github.com/jbsim999/java-edu/issues)에 남겨 주세요. 실행 문제는 OS·JDK·Maven 버전, 단원, 재현 순서와 오류 메시지를 포함하면 확인에 도움이 됩니다.

기여 전 [CONTRIBUTING](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/CONTRIBUTING.md)을 읽어 주세요. 공식 출처와 버전별 근거를 함께 기록하고 실제 실행한 검사와 미검증 범위를 구분합니다. 유지관리자: [jbsim999](https://github.com/jbsim999).

## 라이선스

프로젝트 코드·교재의 라이선스는 아직 지정하지 않았습니다. 편집기·JDK·Maven과 포함된 제3자 구성 요소의 고지를 원본대로 보존하며 각 조건을 따릅니다. 대응 JDK·빌드·제3자 소스도 같은 릴리스에서 제공합니다. 학습자는 EXE 또는 ZIP 하나만 받으면 됩니다. [출처와 소스](https://github.com/jbsim999/java-edu/blob/feat/java-learning-mvp/docs/bundled-runtime.md)
