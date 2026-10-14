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
        throw new UnsupportedOperationException("양수 불변식을 구현하세요");
    }
}
