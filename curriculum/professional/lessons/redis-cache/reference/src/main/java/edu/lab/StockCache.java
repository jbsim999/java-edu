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
        // BEGIN EXERCISE
        if (quantity < 0 || ttl == null || ttl.isZero() || ttl.isNegative()) throw new IllegalArgumentException("cache value or ttl");
        redis.opsForValue().set(key(sku), Integer.toString(quantity), ttl);
        // END EXERCISE
    }
    public OptionalInt get(String sku) {
        // BEGIN EXERCISE
        String value = redis.opsForValue().get(key(sku));
        return value == null ? OptionalInt.empty() : OptionalInt.of(Integer.parseInt(value));
        // END EXERCISE
    }
    public void invalidate(String sku) {
        // BEGIN EXERCISE
        redis.delete(key(sku));
        // END EXERCISE
    }
}
