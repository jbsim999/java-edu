package edu.lab;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
public final class JwtLab {
    public static final String ISSUER = "https://training-issuer.invalid";
    public static JwtDecoder decoder(RSAPublicKey publicKey, Clock clock) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
}
