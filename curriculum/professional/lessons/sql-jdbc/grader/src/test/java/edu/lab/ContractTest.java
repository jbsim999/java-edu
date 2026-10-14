package edu.lab;
import java.util.UUID;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    JdbcReservations service; JdbcTemplate jdbc;
    @BeforeEach void setup() {
        JdbcDataSource ds = new JdbcDataSource(); ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("create table inventory(sku varchar(30) primary key, stock int not null check(stock >= 0))");
        jdbc.execute("create table orders(id varchar(60) primary key, quantity int not null)");
        jdbc.update("insert into inventory values('BOOK', 5)"); service = new JdbcReservations(ds);
    }
    int stock() { return jdbc.queryForObject("select stock from inventory where sku='BOOK'", Integer.class); }
    @Test void commitsTogether() throws Exception { assertThat(service.reserve("A", 2)).isTrue(); assertThat(stock()).isEqualTo(3); assertThat(jdbc.queryForObject("select count(*) from orders", Integer.class)).isEqualTo(1); }
    @Test void insufficientPreservesState() throws Exception { assertThat(service.reserve("A", 6)).isFalse(); assertThat(stock()).isEqualTo(5); }
    @Test void duplicateRollsBackStock() throws Exception { service.reserve("A", 2); assertThatThrownBy(() -> service.reserve("A", 1)).isInstanceOf(java.sql.SQLException.class); assertThat(stock()).isEqualTo(3); }
    @Test void invalidInput() { assertThatThrownBy(() -> service.reserve("A", 0)).isInstanceOf(IllegalArgumentException.class); assertThat(stock()).isEqualTo(5); }
}
