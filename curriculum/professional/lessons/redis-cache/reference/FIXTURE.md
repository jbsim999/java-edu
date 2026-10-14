이 단원은 전용 로컬 Redis가 필요합니다. 예시 연결은 127.0.0.1:16379이며 설치형에서 별도 자원 지원을 확인해야 합니다.
JAVA_EDU_REDIS_HOST와 JAVA_EDU_REDIS_PORT를 둘 다 명시합니다. 허용 호스트는 127.0.0.1, localhost, ::1뿐입니다.
공유 업무 Redis를 연결하지 마세요. 테스트는 java-edu:<UUID>: 접두사의 BOOK/PEN 두 키만 만들고 지웁니다. FLUSHALL/FLUSHDB는 사용하지 않습니다.
Docker 이미지 준비·실행·네트워크 격리는 이 소스만으로 검증되지 않았습니다. 자원 미준비 오류를 단원 통과나 건너뛴 성공으로 처리하지 않습니다.
