package edu.lab;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.assertj.core.api.Assertions.*;
class ContractTest {
 @Test void assemblesAndSharesDefaultBean() { try(var context=new AnnotationConfigApplicationContext(DiLab.Config.class)){ var service=context.getBean(DiLab.OrderService.class); assertThat(service.total(29999)).isEqualTo(32999); assertThat(service.total(30000)).isEqualTo(30000); assertThat(service).isSameAs(context.getBean(DiLab.OrderService.class)); } }
 @Test void domainChecksRemainInService() { assertThatIllegalArgumentException().isThrownBy(()->new DiLab.OrderService(total->0).total(-1)); }
}
