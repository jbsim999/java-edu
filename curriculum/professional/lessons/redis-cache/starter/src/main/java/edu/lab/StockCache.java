package edu.lab;
import java.time.Duration;
import java.util.OptionalInt;
import org.springframework.data.redis.core.StringRedisTemplate;
public final class StockCache {
    private final StringRedisTemplate redis; private final String prefix;
    public StockCache(StringRedisTemplate redis, String prefix) {
        if (prefix == null || !prefix.startsWith("java-edu:") || !prefix.endsWith(":")) throw new IllegalArgumentException("training prefix");
        this.redis = java.util.Objects.requireNonNull(redis); this.prefix = prefix;
    }
    public String key(String sku) { if (sku == null || sku.isBlank()) throw new IllegalArgumentException("sku"); return prefix + sku; }
    public void put(String sku, int quantity, Duration ttl) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
    public OptionalInt get(String sku) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
    public void invalidate(String sku) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
