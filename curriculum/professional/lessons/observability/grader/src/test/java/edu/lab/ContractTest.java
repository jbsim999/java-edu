package edu.lab;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.micrometer.observation.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    static class Events implements ObservationHandler<Observation.Context> {
        int stops, errors;
        public boolean supportsContext(Observation.Context context) { return true; }
        public void onStop(Observation.Context context) { stops++; }
        public void onError(Observation.Context context) { errors++; }
    }
    @Test void recordsBothOutcomesAndPreservesFailure() {
        var meters = new SimpleMeterRegistry();
        try {
            var registry = ObservationRegistry.create(); var events = new Events(); registry.observationConfig().observationHandler(events);
            var service = new OrderTelemetry(meters,registry); RuntimeException failure = new IllegalStateException("simulated");
            service.run("A",() -> {});
            assertThatThrownBy(() -> service.run("B",() -> { throw failure; })).isSameAs(failure);
            assertThat(meters.get("orders.reserve.calls").tag("outcome","success").counter().count()).isEqualTo(1);
            assertThat(meters.get("orders.reserve.calls").tag("outcome","failure").counter().count()).isEqualTo(1);
            assertThat(meters.get("orders.reserve.duration").tag("outcome","success").timer().count()).isEqualTo(1);
            assertThat(meters.get("orders.reserve.duration").tag("outcome","failure").timer().count()).isEqualTo(1);
            assertThat(events.stops).isEqualTo(2); assertThat(events.errors).isEqualTo(1);
            assertThat(meters.getMeters()).allSatisfy(meter -> assertThat(meter.getId().getTags()).allSatisfy(tag -> assertThat(tag.getKey()).isEqualTo("outcome")));
        } finally { meters.close(); }
    }
}
