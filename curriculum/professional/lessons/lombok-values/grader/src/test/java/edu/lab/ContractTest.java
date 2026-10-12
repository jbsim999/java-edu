package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
 @Test void stableIdentity() { OrderKey key=new OrderKey("o-1"); java.util.Set<OrderKey> set=new java.util.HashSet<>(); set.add(key); key.visit(); assertThat(set).contains(key,new OrderKey("o-1")); assertThat(key.getDisplayVisits()).isEqualTo(1); assertThat(key).isNotEqualTo(new OrderKey("o-2")); }
 @Test void rejectsNullId() { assertThatNullPointerException().isThrownBy(()->new OrderKey(null)); }
}
