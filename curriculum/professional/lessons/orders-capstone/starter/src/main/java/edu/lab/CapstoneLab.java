package edu.lab;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.*;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@SpringBootApplication
public class CapstoneLab {
    public static void main(String[] args) { SpringApplication.run(CapstoneLab.class,args); }
    public record Create(@NotBlank @Size(max=60) @Pattern(regexp="[A-Za-z0-9_-]{1,60}") String requestId, @NotBlank @Pattern(regexp="BOOK") String sku, @Min(1) int quantity) {}
    public record OrderView(String id, String sku, int quantity, String status) {}
    private record Stored(String id, String buyer, String sku, int quantity, String status) {
        OrderView view() { return new OrderView(id,sku,quantity,status); }
    }
    public static class Failure extends RuntimeException {
        final int status;
        Failure(int status,String message) { super(message); this.status=status; }
    }
    @Service public static class Orders {
        private final JdbcTemplate jdbc;
        private static final RowMapper<Stored> ROW = (r,n) -> new Stored(r.getString("id"),r.getString("buyer"),r.getString("sku"),r.getInt("quantity"),r.getString("status"));
        public Orders(JdbcTemplate jdbc) { this.jdbc=jdbc; }
        private List<Stored> find(String id) { return jdbc.query("select id,buyer,sku,quantity,status from orders where id=?",ROW,id); }
        private Stored require(String id) { var rows=find(id); if(rows.isEmpty()) throw new Failure(404,"order not found"); return rows.get(0); }
        private void own(Stored order,String buyer) { if(!order.buyer().equals(buyer)) throw new Failure(403,"not order owner"); }
        @Transactional public OrderView reserve(String buyer,Create request) {
            throw new UnsupportedOperationException("실습 구현 필요");
        }
        @Transactional public OrderView cancel(String buyer,String id) {
            throw new UnsupportedOperationException("실습 구현 필요");
        }
    }
    @RestController @RequestMapping("/orders")
    public static class Controller {
        private final Orders orders;
        public Controller(Orders orders) { this.orders=orders; }
        @PostMapping public OrderView create(@Valid @RequestBody Create request,Authentication auth) { return orders.reserve(auth.getName(),request); }
        @PostMapping("/{id}/cancel") public OrderView cancel(@PathVariable("id") String id,Authentication auth) { return orders.cancel(auth.getName(),id); }
        @ExceptionHandler(Failure.class) public ResponseEntity<Map<String,String>> failure(Failure failure) {
            return ResponseEntity.status(failure.status).body(Map.of("error",failure.getMessage()));
        }
        @ExceptionHandler(DuplicateKeyException.class) public ResponseEntity<Map<String,String>> duplicate() {
            return ResponseEntity.status(409).body(Map.of("error","concurrent request conflict; retry the same request"));
        }
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a.requestMatchers("/orders","/orders/**").hasRole("BUYER").anyRequest().authenticated())
            .httpBasic(Customizer.withDefaults()).csrf(Customizer.withDefaults());
        return http.build();
    }
    @Bean UserDetailsService users() {
        return new InMemoryUserDetailsManager(
            User.withUsername("alice").password("{noop}training").roles("BUYER").build(),
            User.withUsername("bob").password("{noop}training").roles("BUYER").build());
    }
}
