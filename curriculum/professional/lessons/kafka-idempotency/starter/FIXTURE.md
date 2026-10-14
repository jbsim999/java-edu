전용 로컬 Kafka 단일 브로커가 필요합니다. 예시 JAVA_EDU_KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:19092. localhost도 허용하며 외부 호스트는 거절합니다.
브로커 advertised.listeners도 같은 loopback 주소를 광고해야 합니다. 실제 Docker 기동과 이미지 버전 검증은 별도 환경 준비 단계입니다.
테스트는 java-edu-<UUID> 토픽 한 개와 동일 이름 consumer group을 생성하고 자신이 만든 토픽만 삭제합니다. 업무 클러스터를 연결하지 마세요.
중복 payload 두 건 전송은 재전달 가능성의 모델입니다. 브로커 장애 복구나 정확히 한 번의 분산 처리를 검증한 결과가 아닙니다.
