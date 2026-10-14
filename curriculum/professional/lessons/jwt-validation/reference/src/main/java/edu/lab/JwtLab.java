package edu.lab;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
public final class JwtLab {
    public static final String ISSUER = "https://training-issuer.invalid";
    public static JwtDecoder decoder(RSAPublicKey publicKey, Clock clock) {
        // BEGIN EXERCISE
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        JwtTimestampValidator time = new JwtTimestampValidator(Duration.ZERO); time.setClock(clock);
        OAuth2TokenValidator<Jwt> required = jwt -> {
            boolean valid = jwt.getAudience() != null && jwt.getAudience().contains("orders-api")
                && jwt.getExpiresAt() != null && jwt.getExpiresAt().isAfter(clock.instant())
                && jwt.getSubject() != null && !jwt.getSubject().isBlank();
            return valid ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token","required claims missing or wrong",null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(time, new JwtIssuerValidator(ISSUER), required));
        return decoder;
        // END EXERCISE
    }
}
