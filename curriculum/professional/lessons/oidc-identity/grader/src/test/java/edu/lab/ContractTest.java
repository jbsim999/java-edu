package edu.lab;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(classes=IdentityLab.class)
@AutoConfigureMockMvc
class ContractTest {
    @Autowired MockMvc mvc;
    @Test void authenticationRequired() throws Exception { mvc.perform(get("/me")).andExpect(status().isUnauthorized()); }
    @Test void trustedIssuerAndSubject() throws Exception {
        mvc.perform(get("/me").with(oidcLogin().idToken(t -> t.claim("iss",IdentityLab.TRUSTED_ISSUER).claim("sub","subject-A"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.issuer").value(IdentityLab.TRUSTED_ISSUER)).andExpect(jsonPath("$.subject").value("subject-A"));
    }
    @Test void rejectOtherIssuer() throws Exception {
        mvc.perform(get("/me").with(oidcLogin().idToken(t -> t.claim("iss","https://other.invalid").claim("sub","subject-A"))))
            .andExpect(status().isForbidden());
    }
    @Test void sameEmailIsNotSameSubject() throws Exception {
        for (String subject : new String[]{"subject-A","subject-B"}) {
            mvc.perform(get("/me").with(oidcLogin().idToken(t -> t.claim("iss",IdentityLab.TRUSTED_ISSUER).claim("sub",subject).claim("email","shared@example.invalid"))))
                .andExpect(jsonPath("$.subject").value(subject));
        }
    }
}
