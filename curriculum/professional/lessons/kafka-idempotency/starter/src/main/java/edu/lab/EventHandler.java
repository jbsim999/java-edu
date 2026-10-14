package edu.lab;
import javax.sql.DataSource;
import java.sql.*;
public final class EventHandler {
    private final DataSource source;
    public EventHandler(DataSource source) { this.source = java.util.Objects.requireNonNull(source); }
    public boolean handle(String eventId, String orderId) throws SQLException {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
