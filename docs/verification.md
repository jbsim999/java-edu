# 프로토타입 검증 기록

기준일: 2026-10-12. Java 코어 첫 12수업을 대상으로 한다. 전체 교육 로드맵 수료 가능성이나 실제 학습 효과는 아직 검증하지 않았다.

## 소스와 마일스톤

| 마일스톤 | GitHub 커밋 | 근거 |
| --- | --- | --- |
| M1 기획·계약 | `796b4cf48504d18822fa77c0cd2e9b5437e851f9` | 독립 문서 리뷰 PASS, 원격 ref 일치 |
| M2 12수업·학습실 | `731b4a2cb44f00d107ad29cda7918739114e9428` | 독립 교육·코드 리뷰, 기능 QA, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38199412067) |
| M3 실행 API·Worker | `fe68aefb190bd4ae52262e4d8458e3f964038b95` | API 단위 검사, 실제 제공자 실행, 독립 코드 리뷰, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38199510214) |
| M4 출시 프로토타입 | `165e113cc77bb56f0bfab78cf28f94de47f022cd` | 최종 독립 코드·QA·시각 PASS, [CI 성공](https://github.com/jbsim999/java-edu/actions/runs/38200134013), private 배포 성공 |

작업 브랜치는 `feat/java-learning-mvp`, 검토 PR은 [#1](https://github.com/jbsim999/java-edu/pull/1)이다. GitHub 공개 저장소와 Sites 개인 전용 호스팅을 구분한다. Sites에는 동일 GitHub 소스를 별도 체크아웃으로 전송하며 GitHub origin을 교체하지 않는다. 배포 소스 SHA와 배포 ID는 성공 응답 이후 배포 기록에 남긴다.

## 실제 실행한 검사

- `npm run check`: 콘텐츠 연결·출력 일치 등 5개와 실행 API 22개, 총 27 PASS. 네트워크 live 모드 1개는 기본 실행에서 SKIP.
- 로컬 JDK 8u265: 독립 예제 9개 + 기준 답안 9개, 행동 검사 56개 PASS. 이후 버전 예제·답안 6개는 로컬에서 SKIP.
- CI의 실제 Temurin JDK 8/11/17/21: 각각 18/20/22/24개 예제·답안 PASS, 상위 버전 6/4/2/0개 SKIP. JDK 21에서는 12예제와 12기준 답안, 전체 행동 검사 73개를 실행했다.
- 외부 Wandbox 실제 JVM 21: `--release` 8·11·17·21 대표 과제 각각 통과, 컴파일 오류와 오답을 구분. TLS 인증서 검증을 켠 `node --use-system-ca` 환경에서 확인했다. 전체 12과제를 외부 제공자로 실행한 검사는 아니다.
- 브라우저 기능·반응형·글자 확대는 [독립 QA 기록](qa-report.md)을 따른다. API 응답은 모의 처리하며 실제 휴대전화 테스트가 아니다.
- `npm run build` 및 `npm run test:worker`: 빌드된 Worker 경로·HEAD·CSP·비공개 파일 제외·인증 필수 동작 PASS. 배포 환경에서 `REQUIRE_IDENTITY=false`가 전달돼도 실행 API 인증을 해제하지 않는다.

독립 리뷰에서 경계값 0/30001 채점 누락, 제네릭 저장소 공유 전제, 같은 코드 재제출 실패 후 성취 유지 문제를 발견하고 수정했다. 경계값 생략 결함 3종의 거절을 Java 8에서 확인했고 재제출 실패 회귀는 브라우저 QA로 확인했다. 확대·대비·활성 탭 시각 검수 결과는 QA 기록에 남긴다.

## 제한과 미확인

- 실제 웹 IDE JVM은 21이다. 네 개 JVM의 선택 실행은 M5 이후 범위이며 CI의 네 JDK 실행과 다르다.
- 실제 외부 제공자 실행과 브라우저 모의 통합은 각각 검증했다. 자동 승인 검토가 기준 답안을 외부 제공자로 전송하는 추가 로컬 HTTP 통합 검사를 거절해 해당 호출은 실행하지 않았다. 배포된 인증 세션에서의 종단 간 Java 제출도 별도 미확인 범위다.
- 제공자 쿼터·중단·로그 보존은 제3자 운영 정책에 의존한다. 취소는 원격 JVM 종료를 보장하지 않는다. 한 isolate의 호출 제한은 다중 isolate 전체의 분산 쿼터가 아니다.
- 교육용 자동 행동 검사는 설계 품질이나 완전한 부정행위 방지 판정을 대신하지 않는다. 설계 메모와 루브릭을 함께 사용한다.
- 현재 성취 기록은 과제 개정판과 연결하지 않는다. 계약을 변경하기 전에 revision/fingerprint와 재검증을 도입해야 한다.
- 실제 모바일 기기·스크린리더·장기 부하·서비스 장애 훈련·기기 간 진도 동기화는 미검증이다.
- Spring·Lombok·MyBatis·OAuth2/OIDC·JPA·Redis·Kafka·DB/HTTP 실행은 후속 M5–M7 범위다.

로컬 UI 시각 판정: 독립 시각 검수 PASS. 320/360/390/768/1440px, 1280×600·844×390, 100/200% 글자 확대의 합성 화면에서 로고·버전 라벨·안내 대비·활성 탭·절 번호 개선을 재검증했다. 성공/오류 화면은 모의 API 상태다.

최종 출시 CI는 Content integrity, Java examples (8/11/17/21), Browser QA 모두 성공했다. Chromium 브라우저 35개 시나리오를 한 번의 전체 실행에서 35 PASS/0 FAIL로 확인했다. 로컬 Edge QA 기록의 선택 재검사와 구분한다.

출시 판정: **PASS — 코어 프로토타입 범위**. private Sites 배포가 `succeeded`와 운영 URL을 반환했다. 모든 GitHub 출시 파일과 Sites source tree의 Git blob을 비교해 호스팅 manifest/ignore 설정 외 동일함을 확인했다. [배포 기록](deployment.md)에 소스·버전·배포 ID를 기록했다. 배포된 인증 세션에서의 Java 제출은 미검증이며 위 제한은 유지한다.
