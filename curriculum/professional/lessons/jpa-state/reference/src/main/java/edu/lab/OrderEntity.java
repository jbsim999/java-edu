package edu.lab;
import jakarta.persistence.*;
@Entity
@Table(name="purchase_orders")
public class OrderEntity {
    @Id private String id;
    private int quantity;
    protected OrderEntity() {}
    public OrderEntity(String id, int quantity) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("id");
        this.id = id; changeQuantity(quantity);
    }
    public String id() { return id; }
    public int quantity() { return quantity; }
    public void changeQuantity(int quantity) {
        // BEGIN EXERCISE
        if (quantity <= 0) throw new IllegalArgumentException("quantity");
        this.quantity = quantity;
        // END EXERCISE
    }
}
