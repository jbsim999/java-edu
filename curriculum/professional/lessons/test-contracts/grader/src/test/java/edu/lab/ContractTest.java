package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
 @Test void preservesStateOnFailure() { Reservation r=new Reservation(3); assertThat(r.reserve(4)).isFalse(); assertThat(r.reserve(0)).isFalse(); assertThat(r.reserve(-1)).isFalse(); assertThat(r.remaining()).isEqualTo(3); }
 @Test void reservesAllAndRejectsNegativeInitial() { Reservation r=new Reservation(3); assertThat(r.reserve(3)).isTrue(); assertThat(r.remaining()).isZero(); assertThat(r.reserve(1)).isFalse(); assertThatIllegalArgumentException().isThrownBy(()->new Reservation(-1)); }
}
