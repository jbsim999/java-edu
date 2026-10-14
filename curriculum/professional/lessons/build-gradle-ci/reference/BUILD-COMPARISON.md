자동 검사 경로는 Maven입니다. Gradle 설정은 같은 테스트 소스를 읽는 비교 자료이며 설치형에서 Gradle 임의 빌드를 실행하지 않습니다.
Gradle 실행에는 해당 버전과 JDK 17 toolchain 준비가 별도로 필요합니다. Wrapper 바이너리는 포함하지 않습니다.
Dockerfile은 Maven package가 만든 target/build-gradle-ci-0.1.0.jar를 사용합니다. 컨테이너의 JVM은 21이며 컴파일 대상 17과 다릅니다.
CI 예시 경로는 professional 디렉터리가 저장소 루트 아래 curriculum에 있을 때를 가정합니다. 실제 워크플로, action 고정 commit, 이미지 digest, 취약점 검증과 자동 배포는 수행하지 않았습니다.
