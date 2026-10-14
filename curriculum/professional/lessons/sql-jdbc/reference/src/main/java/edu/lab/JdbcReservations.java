package edu.lab;
import javax.sql.DataSource;
import java.sql.*;
import java.util.Objects;
public final class JdbcReservations {
    private final DataSource dataSource;
    public JdbcReservations(DataSource dataSource) { this.dataSource = Objects.requireNonNull(dataSource); }
    public boolean reserve(String orderId, int quantity) throws SQLException {
        // BEGIN EXERCISE
        if (orderId == null || orderId.isBlank() || quantity <= 0) throw new IllegalArgumentException("invalid reservation");
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                int changed;
                try (PreparedStatement update = connection.prepareStatement("update inventory set stock = stock - ? where sku = 'BOOK' and stock >= ?")) {
                    update.setInt(1, quantity); update.setInt(2, quantity); changed = update.executeUpdate();
                }
                if (changed == 0) { connection.rollback(); return false; }
                try (PreparedStatement insert = connection.prepareStatement("insert into orders(id, quantity) values (?, ?)")) {
                    insert.setString(1, orderId); insert.setInt(2, quantity); insert.executeUpdate();
                }
                connection.commit(); return true;
            } catch (SQLException | RuntimeException failure) {
                try { connection.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); }
                throw failure;
            }
        }
        // END EXERCISE
    }
}
