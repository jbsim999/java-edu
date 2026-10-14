package edu.lab;
import java.sql.Connection;
import java.util.UUID;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.*;
import org.apache.ibatis.session.*;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    SqlSessionFactory factory;
    @BeforeEach void setup() throws Exception {
        JdbcDataSource ds = new JdbcDataSource(); ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        try (Connection c = ds.getConnection(); var s = c.createStatement()) {
            s.execute("create table orders(id varchar(60) primary key, sku varchar(40), quantity int)");
            s.execute("insert into orders values('A','BOOK',2),('B','PEN',3)");
        }
        factory = MyBatisLab.factory(ds);
    }
    @Test void mapsOnlyMatchingRows() {
        try (SqlSession session = factory.openSession()) {
            var result = session.getMapper(MyBatisLab.Mapper.class).findBySku("BOOK");
            assertThat(result).hasSize(1); assertThat(result.get(0).getId()).isEqualTo("A");
            assertThat(result.get(0).getQuantity()).isEqualTo(2);
        }
    }
    @Test void unknownAndSqlTextAreLiteralValues() {
        try (SqlSession session = factory.openSession()) {
            var mapper = session.getMapper(MyBatisLab.Mapper.class);
            assertThat(mapper.findBySku("MISSING")).isEmpty();
            assertThat(mapper.findBySku("' OR '1'='1")).isEmpty();
        }
    }
}
