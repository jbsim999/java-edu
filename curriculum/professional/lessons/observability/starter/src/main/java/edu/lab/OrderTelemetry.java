package edu.lab;
import java.util.Objects;
import io.micrometer.core.instrument.*;
import io.micrometer.observation.*;
public final class OrderTelemetry {
    private final MeterRegistry meters; private final ObservationRegistry observations;
    public OrderTelemetry(MeterRegistry meters, ObservationRegistry observations) { this.meters=Objects.requireNonNull(meters); this.observations=Objects.requireNonNull(observations); }
    public void run(String orderId, Runnable work) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
