package edu.lab;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    LettuceConnectionFactory factory; StringRedisTemplate redis; StockCache cache;
    @BeforeEach void connect() {
        String host = System.getenv("JAVA_EDU_REDIS_HOST"), portText = System.getenv("JAVA_EDU_REDIS_PORT");
        if (host == null || portText == null) throw new IllegalStateException("학습 전용 Redis 환경이 준비되지 않았습니다.");
        if (!Set.of("127.0.0.1","localhost","::1").contains(host)) throw new IllegalStateException("loopback Redis only");
        int port = Integer.parseInt(portText); if (port < 1 || port > 65535) throw new IllegalStateException("invalid port");
        var client = LettuceClientConfiguration.builder().commandTimeout(Duration.ofSeconds(5)).shutdownTimeout(Duration.ofMillis(100)).build();
        factory = new LettuceConnectionFactory(new RedisStandaloneConfiguration(host,port), client);
        factory.afterPropertiesSet(); factory.start(); redis = new StringRedisTemplate(factory);
        cache = new StockCache(redis,"java-edu:" + UUID.randomUUID() + ":");
    }
    @AfterEach void cleanup() {
        try { if (redis != null && cache != null) redis.delete(List.of(cache.key("BOOK"),cache.key("PEN"))); }
        finally { if (factory != null) factory.destroy(); }
    }
    @Test void storesWithExpiryAndInvalidatesOnlyOwnSku() {
        cache.put("BOOK",5,Duration.ofSeconds(30)); cache.put("PEN",2,Duration.ofSeconds(30));
        assertThat(cache.get("BOOK").getAsInt()).isEqualTo(5);
        assertThat(redis.getExpire(cache.key("BOOK"),TimeUnit.MILLISECONDS)).isBetween(1L,30000L);
        cache.invalidate("BOOK"); assertThat(cache.get("BOOK").isEmpty()).isTrue(); assertThat(cache.get("PEN").getAsInt()).isEqualTo(2);
    }
    @Test void rejectsInvalidValueAndTtl() {
        assertThatThrownBy(() -> cache.put("BOOK",-1,Duration.ofSeconds(30))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cache.put("BOOK",1,Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThat(cache.get("BOOK").isEmpty()).isTrue();
    }
}
