package edu.lab;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
public final class AopLab {
 public static class Orders { public void reserve() {} public void reserveTwice() { reserve(); reserve(); } }
 @Aspect public static class TraceAspect {
  private int calls;
  @Before("execution(* reserve(..))") public void beforeReserve() { calls++; }
  public int calls() { return calls; }
 }
 public static Orders proxied(TraceAspect trace) {
  // BEGIN EXERCISE
  AspectJProxyFactory factory=new AspectJProxyFactory(new Orders());
  factory.addAspect(trace);
  return factory.getProxy();
  // END EXERCISE
 }
}
