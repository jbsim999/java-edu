package edu.lab;
import java.util.Map;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.*;
@SpringBootApplication
public class SecurityLab {
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
    @Bean UserDetailsService users() {
        return new InMemoryUserDetailsManager(
            User.withUsername("buyer").password("{noop}training").roles("BUYER").build(),
            User.withUsername("viewer").password("{noop}training").roles("VIEWER").build());
    }
    @RestController public static class Orders {
        @PostMapping("/orders") public Map<String,String> create() { return Map.of("status","accepted"); }
    }
}
