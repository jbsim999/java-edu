package edu.lab;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@SpringBootApplication
public class IdentityLab {
    public static final String TRUSTED_ISSUER = "https://training-issuer.invalid";
    public record Identity(String issuer, String subject) {}
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a.anyRequest().authenticated()).oauth2Login(Customizer.withDefaults())
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }
    @Bean ClientRegistrationRepository clients() {
        ClientRegistration fixture = ClientRegistration.withRegistrationId("training")
            .clientId("training-client").clientSecret("training-only-not-real")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}").scope("openid")
            .authorizationUri(TRUSTED_ISSUER + "/authorize").tokenUri(TRUSTED_ISSUER + "/token")
            .jwkSetUri(TRUSTED_ISSUER + "/jwks").userInfoUri(TRUSTED_ISSUER + "/userinfo")
            .userNameAttributeName("sub").issuerUri(TRUSTED_ISSUER).clientName("local fixture").build();
        return new InMemoryClientRegistrationRepository(fixture);
    }
    @RestController public static class Me {
        @GetMapping("/me") public Identity me(@AuthenticationPrincipal OidcUser principal) {
            // BEGIN EXERCISE
            if (principal.getIssuer() == null || !TRUSTED_ISSUER.equals(principal.getIssuer().toString()))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "issuer not trusted");
            String subject = principal.getSubject();
            if (subject == null || subject.isBlank()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "subject missing");
            return new Identity(TRUSTED_ISSUER, subject);
            // END EXERCISE
        }
    }
}
