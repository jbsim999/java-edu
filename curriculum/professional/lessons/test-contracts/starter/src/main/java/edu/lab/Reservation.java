package edu.lab;
public final class Reservation {
 private int stock;
 public Reservation(int stock) { if (stock < 0) throw new IllegalArgumentException(); this.stock=stock; }
 public boolean reserve(int quantity) {
  throw new UnsupportedOperationException("실습 구현 필요");
 }
 public int remaining() { return stock; }
}
