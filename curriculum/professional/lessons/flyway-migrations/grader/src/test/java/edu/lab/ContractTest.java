package edu.lab;
import java.sql.*;
import java.util.UUID;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    @Test void appliesOnceAndEnforcesRequestKey() throws Exception {
        JdbcDataSource ds = new JdbcDataSource(); ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        var flyway = MigrationLab.configured(ds);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(2);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
            s.executeUpdate("insert into orders(id,quantity,request_key) values('A',1,'req-1')");
            assertThatThrownBy(() -> s.executeUpdate("insert into orders(id,quantity,request_key) values('B',2,'req-1')"))
                .isInstanceOf(SQLException.class);
            try (ResultSet result = s.executeQuery("select count(*) from orders")) { result.next(); assertThat(result.getInt(1)).isEqualTo(1); }
        }
    }
}
