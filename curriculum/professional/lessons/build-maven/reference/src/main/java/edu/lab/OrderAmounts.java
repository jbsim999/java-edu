package edu.lab;
public final class OrderAmounts {
    private OrderAmounts() {}
    public static int lineTotal(int unitPrice, int quantity) {
        // BEGIN EXERCISE
        if (unitPrice < 0 || quantity <= 0) throw new IllegalArgumentException("invalid amount");
        return Math.multiplyExact(unitPrice, quantity);
        // END EXERCISE
    }
}
