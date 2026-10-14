package edu.lab;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    @Test void externalCallRollsBack() {
        try (var context = new AnnotationConfigApplicationContext(TransactionLab.Config.class)) {
            var orders = context.getBean(TransactionLab.Orders.class);
            assertThatThrownBy(orders::reserveThenFail).isInstanceOf(IllegalStateException.class);
            assertThat(context.getBean(JdbcTemplate.class).queryForObject("select count(*) from audit_events",Integer.class)).isZero();
        }
    }
    @Test void selfInvocationDemonstratesMissingBoundary() {
        try (var context = new AnnotationConfigApplicationContext(TransactionLab.Config.class)) {
            var orders = context.getBean(TransactionLab.Orders.class);
            assertThatThrownBy(orders::bypassProxy).isInstanceOf(IllegalStateException.class);
            assertThat(context.getBean(JdbcTemplate.class).queryForObject("select count(*) from audit_events",Integer.class)).isEqualTo(1);
        }
    }
}
