package edu.lab;
import java.util.Objects;
import io.micrometer.core.instrument.*;
import io.micrometer.observation.*;
public final class OrderTelemetry {
    private final MeterRegistry meters; private final ObservationRegistry observations;
    public OrderTelemetry(MeterRegistry meters, ObservationRegistry observations) { this.meters=Objects.requireNonNull(meters); this.observations=Objects.requireNonNull(observations); }
    public void run(String orderId, Runnable work) {
        // BEGIN EXERCISE
        Objects.requireNonNull(orderId); Objects.requireNonNull(work);
        Timer.Sample sample = Timer.start(meters); String outcome="success";
        Observation observation = Observation.start("orders.reserve", observations);
        try (Observation.Scope ignored = observation.openScope()) { work.run(); }
        catch (RuntimeException | Error failure) { outcome="failure"; observation.error(failure); throw failure; }
        finally {
            meters.counter("orders.reserve.calls","outcome",outcome).increment();
            sample.stop(Timer.builder("orders.reserve.duration").tag("outcome",outcome).register(meters));
            observation.stop();
        }
        // END EXERCISE
    }
}
