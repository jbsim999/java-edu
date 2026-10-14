package edu.lab;
import jakarta.persistence.*;
import java.util.Map;
import java.util.UUID;
public final class JpaLab {
    private JpaLab() {}
    public static EntityManagerFactory open() {
        return Persistence.createEntityManagerFactory("orders", Map.of(
            "jakarta.persistence.jdbc.url", "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1"));
    }
}
