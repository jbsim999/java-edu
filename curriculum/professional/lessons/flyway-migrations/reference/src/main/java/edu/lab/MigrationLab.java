package edu.lab;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
public final class MigrationLab {
    private MigrationLab() {}
    public static Flyway configured(DataSource source) {
        return Flyway.configure().dataSource(source).locations("classpath:db/migration").load();
    }
}
