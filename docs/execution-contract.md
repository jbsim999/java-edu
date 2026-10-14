# Java 실행 API 계약

기준일: 2026-10-12. 이 문서는 소유자 전용 Sites 프로토타입의 실행 범위를 설명한다. 공개 GitHub 저장소와 사이트의 접근 범위는 별개다.

## 실제 실행과 대상 버전

- 제공자: Wandbox, 컴파일러 ID `openjdk-jdk-21+35`, 실제 JVM **21**.
- 과제의 `minVersion`에 따라 서버가 `--release 8`, `11`, `17`, `21` 중 하나를 지정한다. 문법·표준 API 대상 확인이며 JDK 8·11·17에서 실행했다는 의미가 아니다.
- 클라이언트가 컴파일러·명령·옵션·파일 경로·외부 의존성 URL을 지정할 수 없다. 현재 실행 과제는 표준 Java 단일 소스이며 Spring·Lombok·DB 프로젝트 실행을 지원한다고 표시하지 않는다.
- 컴파일러 목록의 언어·ID·raw 옵션 지원을 확인한다. 성공 목록은 5분, 실패는 15초 동안 프로세스 메모리에 캐시한다. 목록 확인 성공은 매 실행의 성공이나 SLA를 보장하지 않는다.

공식 근거: [Wandbox 프로젝트](https://github.com/melpon/wandbox), [현재 API 형식](https://github.com/melpon/wandbox/blob/develop/feline/src/types.rs), [실행과 기록 처리](https://github.com/melpon/wandbox/blob/develop/feline/src/api_compile_json.rs), [Oracle javac 21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html).

## 신뢰 경계와 데이터

배포는 private Sites 게이트웨이가 사이트 접근 권한을 검사하고 `oai-authenticated-user-id`를 주입·덮어쓰는 환경을 전제로 한다. Worker의 `REQUIRE_IDENTITY` 기본값은 인증 필수다. `TRUSTED_IDENTITY_HEADER`를 설정한다면 위 고정 이름만 허용한다. 이메일은 읽거나 외부로 전송하지 않는다.

헤더의 존재 확인만으로 일반 인터넷 공개 서비스의 인증을 구현한 것은 아니다. Worker를 게이트웨이 외부에 직접 노출하거나 사이트를 공개할 때에는 독립 인증·권한 검사와 공유 저장소 기반 제한을 먼저 마련해야 한다. 로컬 서버만 명시적으로 `{ REQUIRE_IDENTITY: false }`를 전달하며 루프백 주소에 바인딩한다.

브라우저의 Origin이 있으면 요청 URL의 Origin과 정확히 일치해야 한다. `null` Origin과 cross-site 요청은 거절하고 CORS 허용 헤더를 제공하지 않는다. 비브라우저 요청의 인증은 Sites 게이트웨이의 책임이다.

학습자가 실행을 누르면 작성한 Java 코드와 서버 검사 코드가 Wandbox에 전달된다. 쿠키·인증 헤더·사용자 ID·이메일은 전달하지 않는다. 요청은 `save: false`를 지정해 공개 permalink 생성을 요청하지 않는다. **이는 제공자가 소스·실행 정보를 기록하지 않는다는 뜻이 아니다.** 제공자의 현재 구현은 저장 옵션과 별도로 실행 코드를 기록한다. 실행 UI에서 전송 대상을 알리고 개인정보·비밀정보 입력을 피하도록 안내한다. 이 애플리케이션 코드는 사용자 소스나 출력을 콘솔에 기록하지 않는다.

## 엔드포인트

### GET `/api/runtime`

```json
{
  "provider": "Wandbox",
  "available": true,
  "runtime": { "javaVersion": 21, "compiler": "openjdk-jdk-21+35" },
  "supportedTargets": [8, 11, 17, 21],
  "checkedAt": "2026-10-12T00:00:00.000Z",
  "notice": "실제 실행 버전, 대상 컴파일, 외부 코드 전송 안내"
}
```

위 시간은 형식 예시다. 사용 불가 시 HTTP 200에 `available: false`, `supportedTargets: []`, `reason`을 반환한다. 인증과 Origin 오류는 별도의 401/403이다.

### POST `/api/execute`

Content-Type은 `application/json`이며 본문 전체는 UTF-8 기준 32 KiB 이하다. 본문의 알 수 없는 추가 필드는 실행에 사용하지 않는다.

```json
{
  "exerciseId": "java-basics-lab",
  "source": "class Solution { /* 학습자가 작성한 코드 */ }",
  "action": "submit",
  "requestId": "b70d96d6-6618-4489-a79e-8a4a2ce40343"
}
```

- `exerciseId`: 서버의 `exerciseDefinitions`에 등록된 ID.
- `action`: `run`은 예제 검사, `submit`은 전체 교육 검사.
- `requestId`: 영문·숫자·밑줄·하이픈 1~80자. 같은 사용자·같은 isolate에서 2분 내 중복 ID는 409이며 제공자에 재전송하지 않는다. 영구적인 전역 멱등성은 보장하지 않는다.
- `source`: `class Solution` 템플릿을 완성한 소스. package와 별도의 Main은 사용하지 않는다. 파일명은 제공자의 `prog.java`이므로 `public class Solution`도 사용하지 않는다. import 선언은 사용할 수 있다.

일반 결과 형식:

```json
{
  "requestId": "b70d96d6-6618-4489-a79e-8a4a2ce40343",
  "status": "passed",
  "provider": "Wandbox",
  "runtimeVersion": 21,
  "targetVersion": 8,
  "stdout": "",
  "stderr": "",
  "compilerOutput": "",
  "checks": [{ "name": "내용이 같은 별도 객체", "passed": true }],
  "passed": 1,
  "total": 1,
  "durationMs": 1000
}
```

검사 개수·시간은 형식 예시다. `status`는 `passed`, `failed`, `compile_error`, `runtime_error`, `timeout`, `provider_error` 중 하나다. 컴파일 경고는 실패로 처리하지 않는다. 검사 하나가 예외를 던지면 해당 검사는 실패하고 다음 검사를 수집한다. JVM의 비정상 종료, 누락·중복된 검사 마커는 통과 처리하지 않는다.

입력 오류는 `{ "requestId": "유효한 ID가 있을 때", "error": { "code": "분류", "message": "안내" } }` 형태다. 제공자 오류에는 일반 결과 필드와 `error`를 함께 반환한다.

| HTTP | 의미 |
| --- | --- |
| 200 | 실행 결과 또는 환경 조회. 테스트 실패·컴파일 오류도 결과로 반환 |
| 400 / 404 | 잘못된 입력 / 미등록 과제·API |
| 401 / 403 | 인증 누락 / Origin 거절 |
| 405 / 415 | 잘못된 HTTP 방식 / JSON 아닌 요청·압축 본문 |
| 409 / 429 | 중복 요청 ID / 실행 중·호출 한도 |
| 413 | 요청의 UTF-8 바이트 제한 초과 |
| 499 | HTTP 응답 대기 취소 |
| 500 | 서버가 작성한 과제 검사 설정 오류 |
| 502 / 503 | 제공자 응답 오류 / 연결·컴파일러·제공자 한도 문제 |
| 504 | 결과 대기 시간 초과 |

## 검사와 보안 채점의 차이

검사 표현식은 서버의 교육 데이터에서만 선택한다. 요청 본문에 보내는 테스트·예상 결과·옵션은 사용하지 않는다. 서버는 사용자 소스 뒤에 Main을 붙이므로 사용자 소스의 기존 줄 번호를 보존한다. Main이 원본 코드 뒤에 있으므로 일부 오류는 추가된 검사 코드의 줄 번호로 표시될 수 있다.

실행마다 128-bit 무작위 nonce를 만들고 시작·순서가 있는 검사·종료 마커를 확인한다. 다른 실행의 마커, 단순 `passed` 문자열, JSON 모양의 표준 출력은 정답 판정에 사용하지 않는다. 불완전한 프로토콜은 실패로 처리한다.

**학습 피드백용 검사이며 부정행위에 강한 시험 채점기가 아니다.** 학습 코드와 검사기가 같은 JVM에서 실행되므로 악의적인 리플렉션·클래스 파일 접근·출력 조작을 완전히 막는다고 주장하지 않는다. 수료·성적·인증의 단독 근거로 사용하지 않는다. 공개 시험용 서비스는 별도 격리된 채점기와 공격 검증이 필요하다.

## 제한·취소·부분 실패

- 요청/소스 32 KiB, 작성된 검사까지 합친 내부 소스 64 KiB. JSON 이스케이프와 메타데이터도 요청 바이트에 포함된다.
- 컴파일 결과 응답 본문 전체를 64 KiB까지 스트리밍 수집하며 초과 시 읽기를 중단한다. Wandbox가 출력 필드를 중복해 보내므로 실제 표시 가능한 표준 출력은 64 KiB보다 작을 수 있다. 제한 초과를 통과로 표시하지 않는다.
- 제공자 목록은 2 MiB 이내, 목록 조회 5초 이내. 목록 확인을 포함한 개별 컴파일 대기는 15초 이내. 요청 본문 읽기에는 별도 5초 제한이 있다.
- 같은 인증 ID는 동시에 하나, isolate 전체는 동시에 두 개, 60초당 여섯 번으로 제한한다. 큐와 자동 재시도는 두지 않는다. 프로토타입의 낮은 동시 사용량과 외부 제공자 부하를 고려한 보수적인 운영 제한이며 성능 벤치마크에서 도출한 값이 아니다.
- 메모리 기반 제한은 isolate 간 공유되지 않고 재시작 시 초기화된다. 전역 호출 제한·사용자별 할당량을 보장하지 않는다. 제공자도 자체 한도를 적용하며 429를 반환할 수 있다.
- 취소·15초 초과는 HTTP 대기를 종료하고 로컬 실행 슬롯을 반환한다. 원격 JVM 종료를 확인할 API가 없으므로 **원격 실행 중단을 보장하지 않는다.** 취소 직후 새 실행이 원격에서 이전 작업과 겹칠 가능성이 남는다. UI는 '응답 대기 취소'로 표시하고 오래된 결과를 반영하지 않아야 한다.
- CPU·메모리·프로세스·네트워크의 샌드박스 강제는 Wandbox가 담당한다. 이 코드가 제공자 내부 제한의 실제 수치나 적용 상태를 보증하지 않는다. 이 경계 때문에 프로토타입을 제한 없이 공개 실행 서비스로 바꾸지 않는다.
- 불명확한 네트워크 실패 뒤 자동 재시도를 하지 않는다. 결과를 받지 못한 경우에도 이미 원격 코드가 실행되었을 수 있다.

## 검증

`node --test tests/executor.test.mjs`는 외부 요청 없이 native fetch mock으로 실행한다. 입력·바이트 제한·Origin·기본 인증·서버 검사 선택·nonce·마커 누락·경고·예외·출력 제한·제공자 오류·타임아웃·취소·중복·호출 제한·컴파일러 목록 TTL을 검사한다.

실제 제공자 검사는 명시적으로 `JAVA_EDU_LIVE=1`을 지정해야 한다. 교육자가 작성한 공개용 정답과 의도적인 오류만 전송하며 여섯 번 순차 호출하고 재시도하지 않는다. 기본 CI에서 활성화하지 않는다. 제공자 IP 제한을 존중해 짧은 간격으로 반복하지 않는다.

Windows의 검증 환경은 Node 22.17.0이다. 상속된 `NODE_TLS_REJECT_UNAUTHORIZED=0`이 최초 실행에서 발견되어 해당 결과만을 TLS 검증 근거로 사용하지 않는다. 인증서 검증을 켜고 시스템 CA를 사용한 GET을 재확인했다. 시스템 사설 CA가 필요한 이 환경에서 안전한 명령은 다음과 같다.

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = '1'
$env:JAVA_EDU_LIVE = '1'
node --use-system-ca --test --test-name-pattern='^live provider:' tests/executor.test.mjs
```

2026-10-12 위 명령으로 인증서 검증을 켠 채 실제 여섯 번 순차 호출을 완료했다.

| 검증 | 실제 결과 |
| --- | --- |
| `java-basics-lab`, 대상 8 | 6/6 검사 통과, 실제 JVM 21 |
| `modern-apis-lab`, 대상 11 | 5/5 검사 통과, 실제 JVM 21 |
| `records-sealed-lab`, 대상 17 | 6/6 검사 통과, 실제 JVM 21 |
| `java21-lab`, 대상 21 | 6/6 검사 통과, 실제 JVM 21 |
| 잘못된 Java 구문 | 실제 javac 오류와 `compile_error` 반환 |
| 항상 false를 반환하는 오답 | 3/6, `failed` 반환 |

애플리케이션에는 인증서 검증을 해제하는 설정을 추가하지 않는다. 실제 배포 Worker의 네트워크·인증·학습 화면 검증은 통합 담당의 별도 출시 게이트다. 서버 단위·제공자 연결 검증이 배포 환경의 권한·격리 또는 브라우저 사용성 검증을 대신하지 않는다.
