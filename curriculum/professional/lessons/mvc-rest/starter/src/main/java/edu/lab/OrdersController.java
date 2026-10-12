package edu.lab;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/orders")
public class OrdersController {
    public record Summary(String id, int quantity) {}
    private final Map<String, Summary> orders = Map.of("A-1", new Summary("A-1", 2));
    @GetMapping("/{id}")
    public ResponseEntity<Summary> find(@PathVariable("id") String id) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
