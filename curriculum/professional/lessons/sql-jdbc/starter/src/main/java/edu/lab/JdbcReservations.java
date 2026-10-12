package edu.lab;
import javax.sql.DataSource;
import java.sql.*;
import java.util.Objects;
public final class JdbcReservations {
    private final DataSource dataSource;
    public JdbcReservations(DataSource dataSource) { this.dataSource = Objects.requireNonNull(dataSource); }
    public boolean reserve(String orderId, int quantity) throws SQLException {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
