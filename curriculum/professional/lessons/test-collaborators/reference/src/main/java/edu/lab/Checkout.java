package edu.lab;
public final class Checkout {
 public interface PaymentPort { void charge(String orderId, int cents); }
 private final PaymentPort payments;
 public Checkout(PaymentPort payments) { this.payments=java.util.Objects.requireNonNull(payments); }
 public void submit(String orderId, int cents) {
  // BEGIN EXERCISE
  if (orderId == null || orderId.isBlank() || cents <= 0) throw new IllegalArgumentException();
  payments.charge(orderId, cents);
  // END EXERCISE
 }
}
