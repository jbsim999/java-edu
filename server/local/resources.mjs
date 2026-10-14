import net from 'node:net';
import { LocalError } from './errors.mjs';

export const OPTIONAL_SERVICES = Object.freeze({
  redis: { host: '127.0.0.1', port: 16379, label: '학습 전용 Redis', environment: { JAVA_EDU_REDIS_HOST: '127.0.0.1', JAVA_EDU_REDIS_PORT: '16379' } },
  kafka: { host: '127.0.0.1', port: 19092, label: '학습 전용 Kafka', environment: { JAVA_EDU_KAFKA_BOOTSTRAP_SERVERS: '127.0.0.1:19092' } },
});

export function requiredServices(project) {
  return (project.profile?.resources || []).filter((resource) => Object.hasOwn(OPTIONAL_SERVICES, resource.type)).map((resource) => ({ type: resource.type, ...OPTIONAL_SERVICES[resource.type] }));
}

export function canConnect({ host, port }, signal, connect = net.createConnection) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    let socket;
    let complete = false;
    const done = (success) => { if (complete) return; complete = true; signal?.removeEventListener('abort', cancel); socket?.destroy(); resolve(success); };
    const cancel = () => done(false);
    try { socket = connect({ host, port }); } catch { return done(false); }
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(750, () => done(false));
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) done(false);
  });
}

export async function prepareServiceEnvironment(project, signal, probe = canConnect) {
  const environment = {};
  for (const resource of requiredServices(project)) {
    if (!await probe(resource, signal)) throw new LocalError('unsupported_resources', `${resource.label}가 ${resource.host}:${resource.port}에서 준비되지 않았습니다. 이 선택 실습은 전용 로컬 서비스를 직접 준비한 뒤 실행하세요. 다른 실무 수업은 계속 학습할 수 있습니다.`, 409);
    Object.assign(environment, resource.environment);
  }
  return environment;
}
