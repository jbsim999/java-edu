# 실무 프로젝트 원본

공통 부모 POM과 22개 독립 학습 프로젝트입니다. 설계·선수 관계·프로필·실행 범위는 [실무 교육 과정](../../docs/professional-curriculum.md)을 읽으세요.

- catalog.json: 22개 수업의 경로, profileId, exerciseId, editableFiles, files, testFiles
- profiles.json: Java 17 대상, Java 17+ 실행 요구, 의존성과 외부 자원 요구
- lessons/<id>/lesson.json: 이론·예시·문제·실무·직접 코딩 계약
- lessons/<id>/reference: 공개 기준 구현
- lessons/<id>/starter: 출발 코드
- lessons/<id>/grader: 공개 행동 검사

source-prepared와 executionVerified는 다릅니다. 실제 실행 결과는 별도 검증 기록과 연결해야 합니다. Redis/Kafka 자원이 없거나 설치형에서 미지원이면 통합 실습은 실행되지 않습니다.

이 디렉터리 전체 구조를 보존하세요. 각 reference/starter POM은 공통 pom.xml 및 형제 grader를 참조합니다. 실제 학습 실행은 Windows 설치형의 환경 준비와 고정 Maven 경로를 사용합니다. 원격 실행 서버로 코드나 실제 자격증명을 보내지 않습니다.
