package edu.lab;
import lombok.Getter;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.EqualsAndHashCode;
@Getter
@RequiredArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public final class OrderKey {
 @NonNull @EqualsAndHashCode.Include private final String orderId;
 private int displayVisits;
 public void visit() { displayVisits++; }
}
