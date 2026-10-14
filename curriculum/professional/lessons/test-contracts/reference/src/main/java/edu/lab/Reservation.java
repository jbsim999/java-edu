package edu.lab;
public final class Reservation {
 private int stock;
 public Reservation(int stock) { if (stock < 0) throw new IllegalArgumentException(); this.stock=stock; }
 public boolean reserve(int quantity) {
  // BEGIN EXERCISE
  if (quantity <= 0 || quantity > stock) return false;
  stock -= quantity; return true;
  // END EXERCISE
 }
 public int remaining() { return stock; }
}
