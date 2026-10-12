package edu.lab;
import lombok.Getter;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
@Getter
@RequiredArgsConstructor
public final class OrderKey {
 @NonNull private final String orderId;
 private int displayVisits;
 public void visit() { displayVisits++; }
 // orderId만 사용하는 동등성 계약을 Lombok으로 선언하세요.
}
