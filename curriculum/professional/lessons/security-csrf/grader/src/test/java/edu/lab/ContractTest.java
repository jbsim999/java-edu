package edu.lab;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
@SpringBootTest(classes=SecurityLab.class)
@AutoConfigureMockMvc
class ContractTest {
    @Autowired MockMvc mvc;
    @Test void unauthenticated() throws Exception { mvc.perform(post("/orders").with(csrf())).andExpect(status().isUnauthorized()); }
    @Test void wrongRole() throws Exception { mvc.perform(post("/orders").with(httpBasic("viewer","training")).with(csrf())).andExpect(status().isForbidden()); }
    @Test void csrfRequired() throws Exception { mvc.perform(post("/orders").with(httpBasic("buyer","training"))).andExpect(status().isForbidden()); }
    @Test void authorized() throws Exception { mvc.perform(post("/orders").with(httpBasic("buyer","training")).with(csrf())).andExpect(status().isOk()); }
}
