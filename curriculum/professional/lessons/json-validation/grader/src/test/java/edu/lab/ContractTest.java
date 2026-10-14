package edu.lab;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class ContractTest {
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;
    @BeforeEach void setup() {
        validator = new LocalValidatorFactoryBean(); validator.afterPropertiesSet();
        ObjectMapper mapper = new ObjectMapper().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        mvc = standaloneSetup(new CreateOrderController()).setValidator(validator)
            .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).build();
    }
    @AfterEach void cleanup() { validator.close(); }
    private void rejects(String json) throws Exception {
        mvc.perform(post("/orders").contentType("application/json").content(json)).andExpect(status().isBadRequest());
    }
    @Test void acceptsValidInput() throws Exception {
        mvc.perform(post("/orders").contentType("application/json").content("{\"sku\":\"BOOK\",\"quantity\":2}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.sku").value("BOOK")).andExpect(jsonPath("$.quantity").value(2));
    }
    @Test void validatesFields() throws Exception {
        rejects("{\"sku\":\"BOOK\",\"quantity\":0}"); rejects("{\"sku\":\"  \",\"quantity\":1}");
        rejects("{\"sku\":\"BOOK\"}");
    }
    @Test void rejectsMalformedAndUnknownFields() throws Exception {
        rejects("{broken"); rejects("{\"sku\":\"BOOK\",\"quantity\":1,\"quanity\":8}");
    }
}
