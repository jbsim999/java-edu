package edu.lab;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    EntityManagerFactory factory;
    @BeforeEach void setup() {
        factory = JpaLab.open();
        var em = factory.createEntityManager(); em.getTransaction().begin();
        em.persist(new OrderEntity("A", 2)); em.getTransaction().commit(); em.close();
    }
    @AfterEach void close() { factory.close(); }
    int storedQuantity() { var em = factory.createEntityManager(); try { return em.find(OrderEntity.class,"A").quantity(); } finally { em.close(); } }
    @Test void managedChangesAreFlushed() {
        var em = factory.createEntityManager(); em.getTransaction().begin();
        em.find(OrderEntity.class,"A").changeQuantity(4); em.getTransaction().commit(); em.close();
        assertThat(storedQuantity()).isEqualTo(4);
    }
    @Test void detachedChangesAreNotAutomaticallySaved() {
        var em = factory.createEntityManager(); OrderEntity detached = em.find(OrderEntity.class,"A"); em.close();
        detached.changeQuantity(7); assertThat(storedQuantity()).isEqualTo(2);
    }
    @Test void rejectsInvalidTransitionWithoutMutation() {
        OrderEntity order = new OrderEntity("B",3);
        assertThatThrownBy(() -> order.changeQuantity(0)).isInstanceOf(IllegalArgumentException.class);
        assertThat(order.quantity()).isEqualTo(3);
    }
}
