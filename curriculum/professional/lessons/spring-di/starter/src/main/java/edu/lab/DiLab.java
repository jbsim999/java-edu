package edu.lab;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
public final class DiLab {
 public interface PricePolicy { int fee(int subtotal); }
 public static final class OrderService {
  private final PricePolicy policy;
  public OrderService(PricePolicy policy) { this.policy=java.util.Objects.requireNonNull(policy); }
  public int total(int subtotal) { if(subtotal<0) throw new IllegalArgumentException(); return Math.addExact(subtotal,policy.fee(subtotal)); }
 }
 @Configuration
 public static class Config {
  @Bean public PricePolicy policy() { return subtotal -> subtotal>=30000 ? 0 : 3000; }
  @Bean public OrderService orders(PricePolicy policy) {
   throw new UnsupportedOperationException("실습 구현 필요");
  }
 }
}
