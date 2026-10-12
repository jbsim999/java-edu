package edu.lab;
import javax.sql.DataSource;
import java.sql.*;
public final class EventHandler {
    private final DataSource source;
    public EventHandler(DataSource source) { this.source = java.util.Objects.requireNonNull(source); }
    public boolean handle(String eventId, String orderId) throws SQLException {
        // BEGIN EXERCISE
        if (eventId == null || eventId.isBlank() || orderId == null || orderId.isBlank()) throw new IllegalArgumentException("event identity");
        try (Connection c = source.getConnection()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement s = c.prepareStatement("insert into processed_events(event_id,order_id) values(?,?)")) {
                    s.setString(1,eventId); s.setString(2,orderId); s.executeUpdate();
                }
                try (PreparedStatement s = c.prepareStatement("update orders set handled_count=handled_count+1 where id=?")) {
                    s.setString(1,orderId); if (s.executeUpdate() != 1) throw new SQLException("unknown order","02000");
                }
                c.commit(); return true;
            } catch (SQLException failure) {
                try { c.rollback(); } catch (SQLException rollback) { failure.addSuppressed(rollback); throw failure; }
                if (!"23505".equals(failure.getSQLState())) throw failure;
                try (PreparedStatement s = c.prepareStatement("select order_id from processed_events where event_id=?")) {
                    s.setString(1,eventId);
                    try (ResultSet result = s.executeQuery()) {
                        if (result.next() && orderId.equals(result.getString(1))) return false;
                        throw new IllegalArgumentException("same eventId with different payload",failure);
                    }
                }
            }
        }
        // END EXERCISE
    }
}
