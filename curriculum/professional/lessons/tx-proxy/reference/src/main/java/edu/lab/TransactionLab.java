package edu.lab;
import javax.sql.DataSource;
import java.util.UUID;
import org.h2.jdbcx.JdbcDataSource;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
public final class TransactionLab {
    public static class Orders {
        private final JdbcTemplate jdbc;
        public Orders(JdbcTemplate jdbc) { this.jdbc = jdbc; }
        @Transactional
        public void reserveThenFail() {
            // BEGIN EXERCISE
            jdbc.update("insert into audit_events(id) values('reserved')");
            throw new IllegalStateException("simulated downstream failure");
            // END EXERCISE
        }
        public void bypassProxy() { this.reserveThenFail(); }
    }
    @Configuration
    @EnableTransactionManagement(proxyTargetClass=true)
    public static class Config {
        @Bean public DataSource dataSource() {
            JdbcDataSource ds = new JdbcDataSource(); ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1"); return ds;
        }
        @Bean public JdbcTemplate jdbc(DataSource ds) { JdbcTemplate jdbc = new JdbcTemplate(ds); jdbc.execute("create table audit_events(id varchar(60) primary key)"); return jdbc; }
        @Bean public PlatformTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean public Orders orders(JdbcTemplate jdbc) { return new Orders(jdbc); }
    }
}
