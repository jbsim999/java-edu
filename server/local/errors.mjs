export class LocalError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = 'LocalError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function requireRecord(value, message = '요청 객체를 확인하세요.') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LocalError('invalid_request', message);
  return value;
}
