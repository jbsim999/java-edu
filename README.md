# Java Edu

공식 Java 문서 기반으로 다른 언어 경험자의 Java 전환 학습과 현직자의 심화를 연결하는 한국어 교육 서비스입니다. OOP·타입·동시성을 깊게 다루고, 수업 끝에서 Java 코드를 직접 작성·실행·검증합니다.

현재 상태: **프로토타입 검증 중**. Java 코어 12수업·24문항·12코딩 과제와 5단계 학습실을 구현했습니다. Spring·Lombok·MyBatis·OAuth2/OIDC·JPA·Redis·Kafka 및 운영 과정은 교육 로드맵에 포함하며 후속 실습 기반에서 확장합니다. 전체 교육 과정 완료를 뜻하지 않습니다.

- [기획안](docs/product-plan.md)
- [교육 로드맵](docs/education-roadmap.md)
- [마일스톤](docs/milestones.md)
- [실행 아키텍처](docs/architecture.md)
- [실행 API 계약과 제한](docs/execution-contract.md)
- [공식 Java 호환 기준](docs/java-version-matrix.md)
- [채용 근거](docs/job-evidence.md)
- [구현된 코어 과정](docs/curriculum.md)
- [협업 규칙](CONTRIBUTING.md)

수업은 이론 → 예시 → 문제풀이 → 실무 심화 → 웹 IDE 직접 코딩의 5단계입니다. 객관식 성취·코드 행동 검증·설계 평가를 구분합니다.

교재는 Java 8·11·17·21 기준입니다. 첫 프로토타입의 외부 실행 환경은 **Java21**이며 8·11·17 컴파일 대상과 해당 JVM 실행을 혼동하지 않습니다. 실행 버튼을 누를 때 작성 코드가 Wandbox로 전송되며 운영 로그에 남을 수 있습니다. 민감정보를 입력하지 마세요.

Node22+로 `npm ci`, `npm run dev`를 실행하면 `http://127.0.0.1:4173`에서 학습실을 사용할 수 있습니다. 진도·코드·메모는 이 브라우저에 저장됩니다. 편집기는 일반 텍스트 편집기이며 자동 완성을 제공하지 않습니다.

`npm run check`는 콘텐츠와 실행 API 검사, `npm run test:java`는 설치된 JDK의 예제·기준 답안 검증입니다. `npm run test:browser`는 서버가 실행 중일 때 모의 API로 기능을 검사합니다. 로컬 Edge는 `PLAYWRIGHT_CHANNEL=msedge`를 지정하고 CI는 Chromium을 사용합니다. 검사 정의와 실제 결과를 구분해 기록합니다.

`npm run build`는 정적 UI와 실행 API를 하나의 Worker로 묶습니다. `npm run test:worker`는 빌드 산출물의 경로·CSP·개인 파일 제외·인증 필수 동작을 검사합니다. 네트워크 실행 테스트는 별도 명시적 모드에서만 호출하며 기본 테스트는 외부로 코드를 보내지 않습니다.
