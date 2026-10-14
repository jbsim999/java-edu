package edu.lab;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/orders")
public class CreateOrderController {
    // BEGIN MODEL
    public record Request(@NotBlank String sku, @Min(1) int quantity) {}
    // END MODEL
    public record Created(String sku, int quantity) {}
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Created create(@Valid @RequestBody Request request) {
        // BEGIN EXERCISE
        return new Created(request.sku(), request.quantity());
        // END EXERCISE
    }
}
