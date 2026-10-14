package edu.lab;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.security.interfaces.RSAPrivateKey;
import java.time.*;
import java.util.List;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
    static KeyPair pair;
    static final Instant NOW = Instant.parse("2026-10-12T00:00:00Z");
    @BeforeAll static void keys() throws Exception { KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048); pair = generator.generateKeyPair(); }
    JwtDecoder decoder() { return JwtLab.decoder((RSAPublicKey)pair.getPublic(),Clock.fixed(NOW,ZoneOffset.UTC)); }
    String token(KeyPair signing, String issuer, String audience, Instant expiry, Instant nbf, String subject) {
        RSAKey jwk = new RSAKey.Builder((RSAPublicKey)signing.getPublic()).privateKey((RSAPrivateKey)signing.getPrivate()).keyID("training").build();
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(new ImmutableJWKSet<SecurityContext>(new JWKSet(jwk)));
        var claims = JwtClaimsSet.builder().issuer(issuer).issuedAt(NOW.minusSeconds(120));
        if (audience != null) claims.audience(List.of(audience));
        if (expiry != null) claims.expiresAt(expiry); if (nbf != null) claims.notBefore(nbf); if (subject != null) claims.subject(subject);
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).keyId("training").build(),claims.build())).getTokenValue();
    }
    String valid() { return token(pair,JwtLab.ISSUER,"orders-api",NOW.plusSeconds(60),NOW.minusSeconds(1),"buyer-A"); }
    @Test void acceptsValid() { assertThat(decoder().decode(valid()).getSubject()).isEqualTo("buyer-A"); }
    @Test void rejectsIssuerAndAudience() {
        assertThatThrownBy(() -> decoder().decode(token(pair,"https://other.invalid","orders-api",NOW.plusSeconds(60),null,"A"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"another-api",NOW.plusSeconds(60),null,"A"))).isInstanceOf(JwtException.class);
    }
    @Test void rejectsTimeAndMissingClaims() {
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"orders-api",NOW.minusSeconds(1),null,"A"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"orders-api",NOW.plusSeconds(60),NOW.plusSeconds(10),"A"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"orders-api",null,null,"A"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"orders-api",NOW.plusSeconds(60),null,null))).isInstanceOf(JwtException.class);
    }
    @Test void rejectsMissingAudienceAndExactExpiry() {
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,null,NOW.plusSeconds(60),null,"A"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder().decode(token(pair,JwtLab.ISSUER,"orders-api",NOW,null,"A"))).isInstanceOf(JwtException.class);
    }
    @Test void rejectsWrongKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048); KeyPair other = generator.generateKeyPair();
        assertThatThrownBy(() -> decoder().decode(token(other,JwtLab.ISSUER,"orders-api",NOW.plusSeconds(60),null,"A"))).isInstanceOf(JwtException.class);
    }
}
