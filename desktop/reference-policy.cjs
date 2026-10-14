// Explicitly reviewed textbook, tool download and hiring-evidence hosts.
// New lesson sources must pass the curriculum coverage test before release.
const EXTERNAL_HOSTS = new Set([
  'adoptium.net',
  'assertj.github.io',
  'career.rememberapp.co.kr',
  'dev.java',
  'docs.docker.com',
  'docs.github.com',
  'docs.gradle.org',
  'docs.hibernate.org',
  'docs.junit.org',
  'docs.micrometer.io',
  'docs.oracle.com',
  'docs.spring.io',
  'documentation.red-gate.com',
  'github.com',
  'jakarta.ee',
  'java.testcontainers.org',
  'javadoc.io',
  'junit.org',
  'jumpit.saramin.co.kr',
  'kafka.apache.org',
  'maven.apache.org',
  'mybatis.org',
  'openid.net',
  'openjdk.org',
  'projectlombok.org',
  'redis.io',
  'site.mockito.org',
  'spring.io',
  'testcontainers.com',
  'toss.im',
  'www.jobplanet.co.kr',
  'www.jumpit.co.kr',
  'www.rallit.com',
  'www.rfc-editor.org',
  'www.wanted.co.kr',
  'www.work24.go.kr',
]);

function externalReferenceUrl(value) {
  if (typeof value !== 'string' || value.length > 8192 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  // Check the original authority as URL normalization removes explicit :443.
  // Credentials, ports and encoded hostnames are not textbook link forms.
  const authority = /^https:\/\/([^/?#]+)(?:[/?#]|$)/i.exec(value)?.[1];
  if (!authority || /[:@%]/.test(authority)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !EXTERNAL_HOSTS.has(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

module.exports = { externalReferenceUrl };
