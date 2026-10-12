package edu.lab;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class ContractTest {
    private final MockMvc mvc = standaloneSetup(new OrdersController()).build();
    @Test void existingResource() throws Exception {
        mvc.perform(get("/orders/A-1")).andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("application/json"))
            .andExpect(jsonPath("$.id").value("A-1")).andExpect(jsonPath("$.quantity").value(2));
    }
    @Test void absentResource() throws Exception { mvc.perform(get("/orders/missing")).andExpect(status().isNotFound()); }
    @Test void repeatedReadsDoNotConsumeStock() throws Exception {
        for (int i = 0; i < 3; i++) mvc.perform(get("/orders/A-1")).andExpect(jsonPath("$.quantity").value(2));
    }
}
