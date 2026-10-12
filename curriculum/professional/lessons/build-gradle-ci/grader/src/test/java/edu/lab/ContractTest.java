package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    @Test void businessContract() { assertThat(BuildMain.total(1)).isEqualTo(19900); assertThat(BuildMain.total(2)).isEqualTo(39800); }
    @Test void rejectsInvalidAndOverflow() {
        assertThatThrownBy(() -> BuildMain.total(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> BuildMain.total(Integer.MAX_VALUE)).isInstanceOf(ArithmeticException.class);
    }
}
