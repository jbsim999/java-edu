# Windows 설치와 학습 시작

Windows 10/11 x64용 현재 사용자 설치 앱이다. 설치 파일과 SHA-256은 이 저장소의 GitHub Releases에 함께 제공한다. 앱은 Java와 Maven을 포함하지 않으며 시스템 PATH를 바꾸지 않는다.

## 준비

1. [Eclipse Temurin JDK 21](https://adoptium.net/temurin/releases/?version=21)을 설치하거나 ZIP을 풀어 둔다. 기존 JDK8/11/17/21도 등록할 수 있다. JRE가 아닌 java와 javac가 함께 있는 JDK가 필요하다.
2. Spring 등 실무 프로젝트에는 [Apache Maven 3.9 이상](https://maven.apache.org/download.cgi)을 준비한다. Java 코어 과제에는 Maven이 필요하지 않다.
3. Java Edu 설치 파일을 실행하고 설치 위치를 선택한다. 현재 사용자용으로 설치하며 관리자 권한을 요구하지 않는다. 배포 파일은 코드 서명되지 않았다.

## 앱에서 시작

1. 앱의 실행 환경 설정에서 JDK의 최상위 폴더를 선택한다. 앱이 java/javac 버전의 일치를 확인한다.
2. 실무 과제를 풀 때 Maven 최상위 폴더도 선택한다.
3. 로컬 학습 코드 실행에 동의한 후 실제 실행 JDK를 선택한다. 학습 코드에는 사용자 PC의 파일·네트워크 접근 권한이 있으므로 자신의 학습 코드를 실행한다.
4. Java 코어는 코드를 작성하고 실행·제출한다. 실무 프로젝트는 먼저 환경 준비를 눌러 고정된 의존성과 기준 테스트를 확인한 뒤 파일 탭에서 구현하고 제출한다.

설치형의 작성 코드가 Wandbox로 전송되지는 않는다. 최초 환경 준비에는 Maven Central 다운로드가 필요하며 과제 실행은 오프라인 모드다. 진도·초안·메모·테마는 앱 데이터에 보존된다. 앱 제거 시에도 학습 데이터는 기본 보존한다.

## 실무 과정

기본20개 프로젝트는 추가 DB 서버 없이 H2·MockMvc·로컬 테스트로 실행한다. Redis/Kafka 실제 연동 두 단원은 선택 환경이며 해당 교재의 고정 loopback 주소·포트를 사용한다. 공유 운영 서비스에 연결하지 않는다. Gradle/Docker/CI 비교 파일은 교재 자료이며 앱의 자동 실행 도구는 Maven이다.

## 웹에서 학습

웹도 같은34단원의 이론·예제·퀴즈·메모·문법 강조 편집기를 제공한다. 실무 프로젝트는 ZIP을 내려받아 IDE에서 사용하거나 Windows 앱에서 실행한다. ZIP의 부모 pom.xml과 lessons/<단원>/starter·reference·grader의 상대 위치를 유지해야 한다. starter 또는 reference 폴더에서 mvn test를 수행한다.

웹 Java 코어 실행은 Wandbox의 실제 JVM21로 연결하고8/11/17/21 컴파일 대상을 구분해 표시한다. 웹 진도는 해당 브라우저에 저장되며 앱과 자동 동기화되지 않는다. 현재 Sites 웹 배포는 소유자 전용 접근을 유지한다.
