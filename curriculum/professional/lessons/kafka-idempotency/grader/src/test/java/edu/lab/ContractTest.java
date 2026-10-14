package edu.lab;
import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.*;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.*;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    JdbcDataSource ds; EventHandler handler;
    @BeforeEach void database() throws Exception {
        ds = new JdbcDataSource(); ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        try (Connection c = ds.getConnection(); Statement s = c.createStatement()) {
            s.execute("create table orders(id varchar(60) primary key, handled_count int not null)");
            s.execute("create table processed_events(event_id varchar(80) primary key, order_id varchar(60) not null)");
            s.execute("insert into orders values('A',0),('B',0)");
        }
        handler = new EventHandler(ds);
    }
    int count(String sql) throws Exception { try (Connection c=ds.getConnection(); Statement s=c.createStatement(); ResultSet r=s.executeQuery(sql)) { r.next(); return r.getInt(1); } }
    @Test void duplicatesAndFailuresAreAtomic() throws Exception {
        assertThat(handler.handle("evt-1","A")).isTrue(); assertThat(handler.handle("evt-1","A")).isFalse();
        assertThatThrownBy(() -> handler.handle("evt-1","B")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> handler.handle("evt-missing","MISSING")).isInstanceOf(SQLException.class);
        assertThat(count("select count(*) from processed_events")).isEqualTo(1);
        assertThat(count("select handled_count from orders where id='A'")).isEqualTo(1);
        assertThat(count("select handled_count from orders where id='B'")).isZero();
    }
    @Test @Timeout(90) void duplicateKafkaPayloadHasOneDbEffect() throws Exception {
        String brokers = System.getenv("JAVA_EDU_KAFKA_BOOTSTRAP_SERVERS");
        if (brokers == null || !brokers.matches("(127\\.0\\.0\\.1|localhost):[0-9]{1,5}")) throw new IllegalStateException("학습 전용 loopback Kafka 환경이 필요합니다.");
        int port = Integer.parseInt(brokers.substring(brokers.lastIndexOf(':')+1));
        if (port < 1 || port > 65535) throw new IllegalStateException("invalid port");
        String topic = "java-edu-" + UUID.randomUUID(); boolean created = false;
        Properties adminProps = new Properties(); adminProps.put("bootstrap.servers",brokers); adminProps.put("default.api.timeout.ms","10000");
        try (Admin admin = Admin.create(adminProps)) {
            try {
                admin.createTopics(List.of(new NewTopic(topic,1,(short)1))).all().get(10,TimeUnit.SECONDS); created = true;
                Properties producerProps = new Properties(); producerProps.put("bootstrap.servers",brokers);
                producerProps.put("key.serializer",StringSerializer.class.getName()); producerProps.put("value.serializer",StringSerializer.class.getName());
                producerProps.put("max.block.ms","10000"); producerProps.put("request.timeout.ms","5000"); producerProps.put("delivery.timeout.ms","10000");
                try (KafkaProducer<String,String> producer = new KafkaProducer<>(producerProps)) {
                    producer.send(new ProducerRecord<>(topic,"evt-kafka","evt-kafka|A")).get(10,TimeUnit.SECONDS);
                    producer.send(new ProducerRecord<>(topic,"evt-kafka","evt-kafka|A")).get(10,TimeUnit.SECONDS);
                }
                Properties consumerProps = new Properties(); consumerProps.put("bootstrap.servers",brokers); consumerProps.put("group.id",topic);
                consumerProps.put("key.deserializer",StringDeserializer.class.getName()); consumerProps.put("value.deserializer",StringDeserializer.class.getName());
                consumerProps.put("enable.auto.commit","false"); consumerProps.put("default.api.timeout.ms","10000");
                try (KafkaConsumer<String,String> consumer = new KafkaConsumer<>(consumerProps)) {
                    var partition = new TopicPartition(topic,0); consumer.assign(List.of(partition)); consumer.seekToBeginning(List.of(partition));
                    int received=0; long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
                    while (received < 2 && System.nanoTime() < deadline) {
                        for (var record : consumer.poll(Duration.ofMillis(500))) {
                            String[] fields = record.value().split("\\|",-1);
                            if (fields.length != 2) throw new IllegalArgumentException("fixture payload");
                            handler.handle(fields[0],fields[1]); received++;
                        }
                    }
                    assertThat(received).isEqualTo(2); consumer.commitSync();
                }
                assertThat(count("select handled_count from orders where id='A'")).isEqualTo(1);
            } finally { if (created) admin.deleteTopics(List.of(topic)).all().get(10,TimeUnit.SECONDS); }
        }
    }
}
