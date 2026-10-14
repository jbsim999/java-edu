package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
 @Test void normalAndZeroPrice() { assertThat(OrderAmounts.lineTotal(1500, 2)).isEqualTo(3000); assertThat(OrderAmounts.lineTotal(0, 1)).isZero(); }
 @Test void invalidInputsAndOverflow() {
  assertThatIllegalArgumentException().isThrownBy(() -> OrderAmounts.lineTotal(-1,1));
  assertThatIllegalArgumentException().isThrownBy(() -> OrderAmounts.lineTotal(100,0));
  assertThatExceptionOfType(ArithmeticException.class).isThrownBy(() -> OrderAmounts.lineTotal(Integer.MAX_VALUE,2));
 }
}
