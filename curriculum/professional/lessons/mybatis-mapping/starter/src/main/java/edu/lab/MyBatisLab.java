package edu.lab;
import java.io.InputStream;
import java.util.List;
import javax.sql.DataSource;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.*;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
public final class MyBatisLab {
    public static class OrderRow {
        private String id; private String sku; private int quantity;
        public String getId() { return id; } public void setId(String id) { this.id = id; }
        public String getSku() { return sku; } public void setSku(String sku) { this.sku = sku; }
        public int getQuantity() { return quantity; } public void setQuantity(int quantity) { this.quantity = quantity; }
    }
    public interface Mapper { List<OrderRow> findBySku(@Param("sku") String sku); }
    public static SqlSessionFactory factory(DataSource source) {
        Configuration config = new Configuration(new Environment("training", new JdbcTransactionFactory(), source));
        try (InputStream xml = MyBatisLab.class.getResourceAsStream("/edu/lab/OrderMapper.xml")) {
            if (xml == null) throw new IllegalStateException("mapper resource missing");
            new XMLMapperBuilder(xml, config, "edu/lab/OrderMapper.xml", config.getSqlFragments()).parse();
            return new SqlSessionFactoryBuilder().build(config);
        } catch (java.io.IOException failure) { throw new IllegalStateException(failure); }
    }
}
