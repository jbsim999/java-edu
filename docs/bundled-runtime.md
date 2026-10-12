# v0.3 통합 Windows 패키지

학습자는 Java·Maven·Node.js를 따로 설치하거나 시스템 PATH를 변경하지 않는다. NSIS 설치 EXE 또는 전체 ZIP에 Electron 앱, Eclipse Temurin JDK21, Apache Maven3를 포함한다. ZIP은 전체 내용을 해제한 뒤 Java Edu.exe를 실행한다. exe 하나만 다른 폴더로 이동하면 동작하지 않는다.

## 기본과 선택 도구

기본 도구는 Temurin21.0.12.1+1 Windows x64와 Maven3.10.0이다. 앱 내부 resources/toolchains에서 자동 등록하며 실제 실행 때 java·javac를 검증한다. Java8/11/17/21 교재와 컴파일 대상을 지원하지만 기본 실제 JVM은21이다. 네 실제 JVM을 모두 포함한 패키지라고 표현하지 않는다. 기존 사용자의 외부 JDK/Maven 선택을 보존하며 다른 실제 JDK8/11/17 등록은 고급 설정의 선택 기능이다.

처음 학습자 코드 실행에는 명시적인 동의가 필요하다. 번들 발견·자동 등록이 학습 코드 자동 실행 권한은 아니다. 앱의 프로세스·파일 편집·명령 계약은 [로컬 실행 계약](local-execution.md)을 유지한다.

코어 실습은 별도 의존성 다운로드 없이 실행한다. 기본20실무프로젝트는 첫 환경 준비에서 앱이 Maven Central의 고정 의존성을 내려받고 기준 테스트를 실행한다. 별도 프로그램 설치는 필요 없지만 이 준비에는 인터넷이 필요하다. 이후 학습자 Maven 제출은 기존 오프라인 모드다. Redis/Kafka 실제 연동은 선택 환경이며 이 패키지가 외부 서버까지 포함하지는 않는다.

## 패키징과 무결성

개발자는 공식 Windows x64 JDK21·Maven ZIP의 체크섬을 확인하고 전체 내용을 해제한다. 원본 바이너리·legal·LICENSE·NOTICE·JAR 내부 고지를 수정하거나 제거하지 않는다. scripts/bundle-runtime.mjs에 두 배포 폴더와 출처 JSON을 전달해 저장소 내부 work/desktop-bundle을 생성한다. 기존 출력은 자동 덮어쓰지 않는다. binaries와 생성 bundle은 Git에 포함하지 않는다.

출처 JSON은 jdks 배열과 maven 객체에 배포명·정확한 버전·공식 URL·archiveSha256·license·licenseFiles·sourceCodeUrl·redistributionSourceUrl·redistributionSourceFiles를 기록한다. 최종 manifest와 THIRD-PARTY-NOTICES는 앱의 resources/toolchains에 포함한다. 파일별 SHA256 inventory로 스테이징·빌드 전에 전체 파일을 대조한다. 이 목록은 코드 서명이나 OS 보안 샌드박스를 대신하지 않는다.

```sh
node scripts/bundle-runtime.mjs --jdk21 <JDK21 폴더> --maven <Maven3 폴더> --metadata desktop/toolchain-provenance.json
node scripts/bundle-runtime.mjs --check
npm run build:desktop
```

빌드는 설치 EXE와 Windows x64 ZIP을 함께 만든다. 앱의 설치·ZIP 위치가 바뀌면 번들 항목은 현재 resources 기준으로 다시 해석한다. 외부 선택 경로를 임의로 번들 경로로 변경하지 않는다. 버전별 검사와 실제 설치·ZIP 실행 결과는 별도 QA 보고서에 기록한다.

## 배포 출처·라이선스·대응 소스

JDK ZIP205073461바이트의 SHA256는 `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`다. Maven ZIP10102082바이트의 SHA256는 `1f6d9909266510f039f59aa0e13dcd2c66da85f043e56276e41f2918f8bddaff`이며 Apache의 SHA512도 대조했다. [Temurin 릴리스](https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.12.1%2B1)와 [Apache Maven 공식 다운로드](https://maven.apache.org/download.cgi)를 기준으로 원본을 확인했다.

Temurin은 GPLv2와 Classpath Exception, Maven은 Apache License2.0 및 포함된 제3자 조건을 따른다. JDK NOTICE·legal243개 파일, Maven 루트LICENSE/NOTICE·lib/boot의 원본 license 파일과 JAR 내부 고지를 보존한다. [Adoptium FAQ](https://adoptium.net/docs/faq), [공급망 자료](https://adoptium.net/docs/slsa), [Apache License](https://www.apache.org/licenses/LICENSE-2.0)를 참고한다. 이 조건은 Java Edu 프로젝트 자체의 라이선스를 임의로 지정하지 않는다.

같은 GitHub 릴리스에 다음 대응 소스를 함께 제공한다. 학습자는 이를 실행을 위해 따로 설치할 필요가 없다.

- OpenJDK21U-jdk-sources_21.0.12.1_1.tar.gz: 공식 대응 소스, SHA256 `573057d03584ae793fb7ec9a14c76d826d9187a53efeefd99da47403a5308234`. 바이너리와 source commit `1c417fbfc2f70ab03a565b0af0a5a3c6f5e15ad6`이 일치한다.
- Third-Party-Sources-0.3.0.zip: 정확한 Temurin build commit `e6ba7dec3d07654074559310376a3ae89da5f4ac`, Maven3.10.0 소스, Sisu Inject/Plexus1.1.0 및 javax.annotation-api1.3.2 sources.jar, 출처·체크섬 manifest와 해당 라이선스 고지.

JDK lib/src.zip만으로 전체 네이티브 코드와 빌드 소스를 대체하지 않는다. Maven 소스 ZIP도 EPL2/CDDL 조건의 위 제3자 JAR 소스를 대체하지 않는다. 교재 Maven 의존성 캐시는 번들에 넣지 않으며, 추후 포함할 경우 전체 전이 의존성과 플러그인의 별도 고지·소스 제공 조건을 검토한다.
