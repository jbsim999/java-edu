# Windows 설치형 실행 계약

Windows 설치형 앱과 웹 교재는 같은 교육 화면을 사용한다. 설치형의 Java/Maven 실행은 학습자 PC에서만 수행하며 원격 Java 제공자로 코드를 보내지 않는다. 웹은 교재·문제·코드 편집과 기존 코어 실행 환경을 제공한다. 이 앱은 개인 IDE이며 Java 코드의 파일·네트워크 접근을 막는 보안 샌드박스가 아니다.

## 설치와 도구 등록

- Windows 10 이상 x64 현재 사용자용 NSIS 설치 파일. 관리자 권한·시스템 PATH 변경·자동 JDK/Maven 다운로드·자동 업데이트는 사용하지 않는다.
- 앱 설정에서 JDK 8·11·17·21의 설치 디렉터리와 Apache Maven 3.9 이상(Maven 3)의 디렉터리를 선택한다. java/javac 버전을 함께 검사한다.
- 학습자 코드 실행에 대한 명시적인 동의가 필요하다. 앱을 여는 것만으로 학습 코드를 실행하지 않는다. 동의 문구는 파일·네트워크 접근 권한을 설명한다. 동의를 철회하면 진행 중인 실행도 취소한다.
- 기본 실제 JVM은 등록한 JDK 중 수업의 최소 버전을 만족하는 가장 높은 버전이다. 실행 요청의 runtimeVersion으로 다른 등록 JDK를 선택할 수 있다. 교재의 Java 버전·컴파일 대상·실제 JVM을 구분한다.
- 실무 프로젝트 환경 준비는 명시적인 버튼으로 고정 기준 답안의 Maven 테스트를 실행한다. Maven Central에서 고정 버전 의존성을 내려받는다. 이후 학습자 Maven 실행은 오프라인 모드다. 앱 재시작 또는 JDK 변경 뒤에는 환경 준비를 다시 확인한다.

## 브라우저 연결과 IPC

Electron은 contextIsolation=true, nodeIntegration=false, sandbox=true, webSecurity=true로 설정한다. 정적 교재와 API는 127.0.0.1의 임의 포트에만 바인딩한다. Host·Origin을 실제 바인딩 주소와 대조하며 모든 요청에는 앱 세션의 HttpOnly/SameSite=Strict 쿠키가 필요하다. 상태 변경에는 정확한 Origin과 Electron main이 붙이는 CSRF 헤더도 필요하다. 세션 토큰을 URL·쿼리·localStorage에 저장하지 않는다. 외부 탐색·새 앱 창·권한 요청은 차단하고 허용한 출처 링크만 OS 브라우저로 연다.

외부 출처 정책은 `desktop/reference-policy.cjs`의 명시적 호스트 목록을 사용한다. 교재 공식 문서·검토한 채용 공고·도구 다운로드·저장소 릴리스만 포함하며 와일드카드를 사용하지 않는다. HTTPS라도 사용자 정보, 명시적 포트, 인코딩된 호스트 이름 또는 다른 호스트는 거절한다. 34개 수업의 출처 90개와 채용 근거 5개, UI·설치 안내 링크를 실제 데이터와 대조하는 회귀 검사가 새 출처 누락을 탐지한다.

`window.javaEduDesktop`이 있으면 설치형이다. 브리지는 다음 메서드만 노출한다. main은 기본 창의 mainFrame과 같은 origin인지 검사한다.

| 메서드 | 입력 | 결과 |
| --- | --- | --- |
| getSettings() | 없음 | 아래 runtime 응답 |
| chooseJdk(version) | 8/11/17/21 숫자 | OS 폴더 선택 후 runtime 응답 |
| chooseMaven() | 없음 | OS 폴더 선택 후 runtime 응답 |
| setExecutionConsent(accepted) | boolean | 동의 저장 후 runtime 응답 |
| storage.getItem(key) | java-edu: 접두 키 | 문자열 또는 null |
| storage.setItem(key,value) | 접두 키·문자열 | 동기 저장 |
| storage.removeItem(key) | 접두 키 | 동기 삭제 |

교재 UI는 `window.javaEduDesktop?.storage ?? window.localStorage` 어댑터를 사용한다. 설치형 학습 데이터는 고정 userData/learning-state.json에 저장하므로 임의 포트와 앱 재시작에 영향을 받지 않는다. 총 8 MiB를 넘으면 저장 실패를 UI에 알린다. 렌더러에 임의 파일·경로·명령·환경 변수 IPC는 제공하지 않는다.

## HTTP API

일반 fetch를 사용한다. Electron main이 인증 쿠키와 CSRF 헤더를 관리한다.

- GET `/api/runtime`: 기존 provider/available/runtime/supportedTargets/notice 외에 `mode:'local'`, `runtimes:[{javaVersion,available,path}]`, `maven:{available,version,path}`, `consent:{accepted,notice}`, `dependencyNotice`, `reason`, `limits`, `preparedProjects:[{exerciseId,runtimeVersion,jdkPath,mavenPath,mavenVersion}]`. 도구 미등록/동의 전에도 200이며 available=false다. 실제 실행에서 도구 버전을 다시 확인한다. 준비 상태는 현재 등록한 JDK 경로와 Maven 경로·버전에 일치하는 항목만 반환한다.
- GET `/api/local/projects/<exerciseId>`: `{exerciseId,lessonId,title,profileId,runtimeRequirements,files:[{path,source,editable}],notice}`. 파일은 교재의 고정 allowlist에 해당한다.
- POST `/api/execute`: 코어는 `{exerciseId,source,action:'run'|'submit',requestId,runtimeVersion?}`. 실무는 source 대신 `files:{고정상대경로:소스}`. 편집 가능 파일 전부를 제출하며 pom.xml·grader·명령·URL은 변경할 수 없다.
- POST `/api/local/prepare`: `{exerciseId,requestId,runtimeVersion?}`. 기준 답안으로 환경 준비. 결과에 `prepared:boolean`이 추가된다.
- POST `/api/local/cancel`: `{requestId}` → `{cancelled:boolean}`. HTTP 응답 연결이 끊어져도 해당 실행을 취소한다.

실행 결과는 `{requestId,provider,runtimeVersion,targetVersion,status,stdout,stderr,compilerOutput,checks:[{name,passed}],passed,total,durationMs,error?}`다. status는 기존 passed/failed/compile_error/runtime_error/timeout/provider_error 집합을 유지한다. 로컬 설정·입력 오류는 HTTP 400/404/409/413/429/503과 `{error:{code,message}}`다. 실무의 실행/제출은 모두 교재에 고정된 테스트 전체를 수행한다.

## 실행·실패 경계

- 한 번에 한 실행. 동시 요청은 429, 2분 안의 동일 requestId 재사용은 409. 자동 재시도는 없다.
- 앱의 검증된 전용 jobs/job-* 디렉터리에만 교재 파일을 만든다. core 소스 32 KiB, 실무 파일별 64 KiB/합계 256 KiB, 요청 384 KiB, 출력 128 KiB 제한.
- Java 컴파일 20초, 코어 실행 5초, 실무 테스트 120초, 최초 환경 준비 300초. 초기 보호 한도이며 측정 성능 보장이 아니다.
- Windows trusted PowerShell helper가 PROC_THREAD_ATTRIBUTE_JOB_LIST를 통해 CreateProcess(CREATE_SUSPENDED)와 Job Object 배정을 원자적으로 수행한 뒤 Resume한다. 표준 입출력 핸들만 명시적으로 상속하며 job handle은 상속하지 않고 KILL_ON_JOB_CLOSE를 사용한다. helper는 최초에 앱 부모의 process handle을 열고 앱 종료·자식 종료·timeout을 함께 감시한다. 생성 직후 Resume 전 helper가 종료되더라도 Job에 배정된 자식이 정리된다. Resume 실패 경로도 자식을 종료한다.
- 코어 Job memory 512 MiB/자식 8개, Maven 1536 MiB/자식 16개. Java heap은 코어 128 MiB, 컴파일러 256 MiB, Maven+테스트 512 MiB다. Windows 메모리 한도는 전체 프로세스 묶음이며 JVM heap과 다르다.
- Maven은 선택한 JDK로 classworlds launcher를 직접 호출한다. shell=false이며 cmd/mvn.cmd, 학습자 wrapper·POM·프로파일·명령을 실행하지 않는다. 전용 저장소·고정 settings·고정 Maven Central mirror를 사용한다. JAVA_TOOL_OPTIONS/JDK_JAVA_OPTIONS/_JAVA_OPTIONS/CLASSPATH/MAVEN_OPTS/MAVEN_ARGS 등 사용자의 실행 옵션·자격증명을 상속하지 않는다.
- Surefire는 forkCount=0으로 매 작업의 독립 Maven JVM 안에서 테스트한다. 이 설정은 Windows 경로의 `%이름%` 문자가 Surefire의 내부 cmd 실행에서 확장되는 문제를 피한다. 수업 간 JVM은 공유하지 않는다.
- Windows Maven TLS는 Windows-ROOT 신뢰 저장소를 사용하며 인증서 검증을 유지한다. JVM·OS의 인증서 저장소를 변경하지 않는다.
- 코드 실행 권한과 전체 PC 접근 가능성은 별개로 남는다. 제어된 파일 편집 API·Job Object·timeout은 악성 학습 코드의 완전한 격리를 보장하지 않는다. 테스트 판정은 교육 피드백이며 부정행위 방지용 보안 채점 서버가 아니다.
- H2·MockMvc·협력 객체 테스트는 교재의 해당 범위만 검증한다. 실제 Redis/Kafka/외부 OAuth 서비스 운영 검증은 별도 환경과 실제 연결 시험이 필요하다.
- Redis·Kafka 2개 선택 단원은 학습 전용 127.0.0.1:16379 / 127.0.0.1:19092 고정 주소만 전달한다. 먼저 750ms TCP 준비 확인을 수행하며 미준비면 unsupported_resources/409로 안내한다. 포트 연결 성공은 서비스 동작 검증이 아니며 뒤의 실제 통합 테스트가 성공해야 완료된다. 임의 주소·포트·사용자 환경변수를 받지 않는다. 나머지 기본 실무 단원에는 외부 서버를 요구하지 않는다.

## 근거

- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security/), [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [process sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox).
- [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw), [WaitForMultipleObjects](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitformultipleobjects).
- [UpdateProcThreadAttribute / JOB_LIST](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute), [JSSE trust store settings](https://docs.oracle.com/en/java/javase/21/security/java-secure-socket-extension-jsse-reference-guide.html).
- [Maven CLI options](https://maven.apache.org/ref/3.9.11/maven-embedder/cli.html), [Maven settings](https://maven.apache.org/settings.html), [electron-builder NSIS](https://www.electron.build/nsis.html).

## 2026-10-12 로컬 엔진 검증

환경: Windows x64, Node 22.17.0, OpenJDK 8u265, Temurin JDK 21.0.12.1, Apache Maven 3.10.0. 기준 답안은 저장소에 작성된 고정 교재 코드만 사용했으며 원격 Java 실행 제공자를 호출하지 않았다.

| 검사 | 실제 결과 |
| --- | --- |
| `node --test tests/local/*.test.mjs` | 16 PASS. 입력/파일 allowlist·동의·1작업 한도·중복 요청·취소·원자적 저장·Maven 설정·선택 자원·HTTP 인증·외부 링크 정책 계약 |
| 외부 문서·채용·설치 링크 | 34수업 출처 90개, 공고 5개, 실제 UI·설치 안내의 HTTPS URL 허용 PASS. 악성 프로토콜·사용자 정보·명시 포트·호스트 혼동 거절 PASS. OS 브라우저의 원격 페이지 로드 검증과는 구분 |
| Windows 프로세스 supervisor | 공백·한글·&·%·따옴표 인수 보존, timeout 자손 종료, 출력 초과 종료, 앱 부모 강제 종료 뒤 자손 종료 PASS |
| 생성 직후 취소 경계 | 제품 helper의 별도 계측 복사본을 CreateProcess 직후 중지한 다음 helper를 종료. Resume 전 자식도 ESRCH로 종료 확인 PASS |
| 로컬 실제 JVM 8 | 코어 9과제·56 행동 검사 PASS |
| 로컬 실제 JVM 21 | 코어 12과제·73 행동 검사 PASS |
| 한국어 컴파일 진단 | Java 8·21 각각 `없는변수` 식별자가 포함된 실패 진단의 UTF-8 원문 보존 PASS |
| Maven build-maven | 환경 준비 2/2·오프라인 제출 2/2 PASS |
| Maven mvc-rest | 환경 준비 3/3·오프라인 제출 3/3 PASS |
| Maven mybatis-mapping | 환경 준비 2/2·오프라인 제출 2/2 PASS |
| Maven jpa-state | 환경 준비 3/3·오프라인 제출 3/3 PASS |
| Maven security-csrf | 환경 준비 4/4·오프라인 제출 4/4 PASS |
| Maven jwt-validation | 환경 준비 5/5·오프라인 제출 5/5 PASS |
| Maven tx-proxy | 환경 준비 2/2·오프라인 제출 2/2 PASS |
| Maven 특수 경로 회귀 | 한글·공백·&·`%JAVA_HOME%`를 포함한 작업/저장소 경로에서 위 7개 실습의 준비와 오프라인 제출 전부 PASS. 최종 forkCount=0 실행 방식으로 확인 |

실제 Java 11·17 PC 런타임은 이 환경에 설치되지 않아 로컬 엔진으로 실행하지 않았다. 다른 JDK의 CI 결과와 별개다. Redis·Kafka 실제 서비스 연결은 미검증이며 미준비 시 409 반환과 고정 loopback 주소 정책만 검증했다. Electron 전체 화면 흐름·설치 파일·패키지 실행 검증은 독립 QA 및 최종 릴리스 기록을 따른다.

실행 중 발견한 실패는 숨기지 않았다. Java 8 도구 검사에서 자동 heap 크기가 Job 메모리 한도를 넘는 문제는 명시적 heap 한도로 수정했다. Maven의 첫 TLS 실패는 Windows-ROOT의 정상 인증서 검증으로 해결했다. Surefire 자식 JVM은 PATHEXT 누락과 `%JAVA_HOME%` 경로의 내부 셸 확장에서 실패했으며, 최종 구현은 forkCount=0으로 매 작업의 독립 Maven JVM에서 테스트하여 내부 셸 호출을 없앴다. JDK 21의 표준 오류 인코딩은 file.encoding만으로 고정되지 않아 stdout/stderr 인코딩도 명시했다. JWT 기준 테스트의 모호한 RSAKey import는 콘텐츠 담당자가 고친 후 5/5로 재검증했다.

## Windows 감독 초기화와 임시 경로

Windows Server CI에서 PowerShell 모듈 자동 탐색 지연과 관리자 .NET CodeDom의 임시 디렉터리 생성 오류를 발견했다. 감독 helper는 Windows 기본 Utility manifest만 명시적으로 로드한다. CodeDom 컴파일에는 OS 기본 TEMP 아래 호출별 고유 디렉터리를 사용하고, 실제 Java/Maven 시작 전 TEMP/TMP를 원래 작업별 폴더로 복원한다. 학습자 작업 폴더의 한글·공백·`&`·`%`를 제거하는 방식이 아니다. 기존 CodeDom ACL 보호와 Job·시간·출력 제한은 유지한다.

[.NET TempFileCollection 원문](https://github.com/microsoft/referencesource/blob/main/System/compmod/system/codedom/compiler/TempFiles.cs)과 [NativeMethods 원문](https://github.com/microsoft/referencesource/blob/main/System/compmod/microsoft/win32/NativeMethods.cs)의 관리자 분기·ANSI 경로 호출이 오류 스택과 일치했다. 로컬 코드페이지 밖 문자의 직접 호출에서도 Win32 오류123을 재현했다. 비관리자 로컬 수정 검사는16/16, JDK8 56/56·JDK21 73/73 및 양쪽 한글 진단 PASS다. 관리자 Windows CI의 수정 결과는 이후 실제 결과로 확인한다.

감독 초기화에는 ANSI로 표현 가능한 OS 기본 TEMP 경로가 필요하다(ASCII 경로 권장). 기본 TEMP 자체가 현재 코드페이지로 표현되지 않는 경로일 때는 이 .NET 경로 제약이 남는다. 정상 완료·취소·감독 중단 후에는 이번 호출의 디렉터리 실제 부모·고유 접두사를 확인해 정리한다. 앱 부모가 강제로 종료되어 finally가 실행되지 않은 경우에는 임시 디렉터리가 남을 수 있다. 자식 프로세스 종료 검증을 모든 임시 파일의 자동 정리 보장으로 확대하지 않는다.
