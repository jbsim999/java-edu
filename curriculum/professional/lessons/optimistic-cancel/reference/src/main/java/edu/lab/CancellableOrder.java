package edu.lab;
import jakarta.persistence.*;
@Entity
@Table(name="cancellable_orders")
public class CancellableOrder {
    @Id private String id;
    @Version private long version;
    private int quantity;
    private boolean cancelled;
    protected CancellableOrder() {}
    public CancellableOrder(String id, int quantity) {
        if (id == null || id.isBlank() || quantity <= 0) throw new IllegalArgumentException("invalid order");
        this.id = id; this.quantity = quantity;
    }
    public long version() { return version; }
    public boolean cancelled() { return cancelled; }
    public int cancelAndReturnQuantity() {
        // BEGIN EXERCISE
        if (cancelled) return 0;
        cancelled = true;
        return quantity;
        // END EXERCISE
    }
}
