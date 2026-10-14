package edu.lab;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class ContractTest {
 @Test void oneCallAndInvalidInput() { Checkout.PaymentPort port=mock(Checkout.PaymentPort.class); Checkout c=new Checkout(port); c.submit("o-1",500); verify(port).charge("o-1",500); verifyNoMoreInteractions(port); assertThatIllegalArgumentException().isThrownBy(()->c.submit("",500)); verifyNoMoreInteractions(port); }
 @Test void propagatesFailure() { Checkout.PaymentPort port=mock(Checkout.PaymentPort.class); IllegalStateException failure=new IllegalStateException("declined"); doThrow(failure).when(port).charge("o-1",500); assertThatThrownBy(()->new Checkout(port).submit("o-1",500)).isSameAs(failure); }
}
