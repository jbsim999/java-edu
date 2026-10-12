# Java Edu

공식 Java 문서 기반으로 다른 언어 경험자의 Java 전환 학습과 현직자의 심화를 연결하는 한국어 교육 서비스입니다. OOP·타입·동시성을 깊게 다루고, 수업 끝에서 Java 코드를 직접 작성·실행·검증합니다.

현재 상태: **개발 중**. M1은 기획·교육지도·실행 계약 문서 마일스톤이며 앱 완성이나 배포 성공을 뜻하지 않습니다. 실제 검증·배포 결과는 후속 마일스톤에 기록합니다.

- [기획안](docs/product-plan.md)
- [교육 로드맵](docs/education-roadmap.md)
- [마일스톤](docs/milestones.md)
- [실행 아키텍처](docs/architecture.md)
- [공식 Java 호환 기준](docs/java-version-matrix.md)
- [채용 근거](docs/job-evidence.md)
- [협업 규칙](CONTRIBUTING.md)

수업은 이론 → 예시 → 문제풀이 → 실무 심화 → 웹 IDE 직접 코딩의 5단계입니다. 객관식 성취·코드 행동 검증·설계 평가를 구분합니다.

교재는 Java 8·11·17·21 기준입니다. 첫 프로토타입의 외부 실행 환경은 **Java21**이며 8·11·17 컴파일 대상과 해당 JVM 실행을 혼동하지 않습니다. 실행 버튼을 누를 때 작성 코드가 Wandbox로 전송되며 운영 로그에 남을 수 있습니다. 민감정보를 입력하지 마세요.

앱·테스트 완성 후 Node22+로 `npm ci`, `npm run dev`를 실행합니다. 예정된 검사는 `npm run check`, `npm run test:java`, `npm run test:browser`입니다. 현재 M1에서 실행 완료했다고 주장하지 않습니다.
