package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
 @Test void externalCallCrossesProxy() { var trace=new AopLab.TraceAspect(); AopLab.proxied(trace).reserve(); assertThat(trace.calls()).isEqualTo(1); }
 @Test void selfInvocationDoesNotCrossProxy() { var trace=new AopLab.TraceAspect(); AopLab.proxied(trace).reserveTwice(); assertThat(trace.calls()).isZero(); }
}
