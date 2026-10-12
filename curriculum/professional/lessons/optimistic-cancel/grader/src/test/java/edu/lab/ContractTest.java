package edu.lab;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    EntityManagerFactory factory;
    @BeforeEach void setup() { factory = CancellationLab.open(); var em = factory.createEntityManager(); em.getTransaction().begin(); em.persist(new CancellableOrder("A",2)); em.getTransaction().commit(); em.close(); }
    @AfterEach void close() { factory.close(); }
    @Test void cancellationRestoresOnlyOnceInOneObject() {
        CancellableOrder order = new CancellableOrder("B",3);
        assertThat(order.cancelAndReturnQuantity()).isEqualTo(3); assertThat(order.cancelled()).isTrue();
        assertThat(order.cancelAndReturnQuantity()).isZero();
    }
    @Test void staleContextCannotOverwrite() {
        var first = factory.createEntityManager(); var stale = factory.createEntityManager();
        try {
            first.getTransaction().begin(); stale.getTransaction().begin();
            var one = first.find(CancellableOrder.class,"A"); var two = stale.find(CancellableOrder.class,"A");
            one.cancelAndReturnQuantity(); two.cancelAndReturnQuantity();
            first.getTransaction().commit();
            assertThatThrownBy(() -> stale.getTransaction().commit()).isInstanceOf(RollbackException.class);
            var verify = factory.createEntityManager();
            try { assertThat(verify.find(CancellableOrder.class,"A").cancelled()).isTrue(); }
            finally { verify.close(); }
        } finally {
            if (first.getTransaction().isActive()) first.getTransaction().rollback();
            if (stale.getTransaction().isActive()) stale.getTransaction().rollback();
            first.close(); stale.close();
        }
    }
}
