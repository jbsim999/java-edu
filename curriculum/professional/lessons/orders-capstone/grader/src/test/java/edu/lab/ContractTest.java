package edu.lab;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(classes=CapstoneLab.class)
@AutoConfigureMockMvc
class ContractTest {
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc;
    @BeforeEach void reset() { jdbc.update("delete from orders"); jdbc.update("update inventory set stock=5 where sku='BOOK'"); }
    int stock() { return jdbc.queryForObject("select stock from inventory where sku='BOOK'",Integer.class); }
    ResultActions reserve(String buyer,String id,int quantity) throws Exception {
        return mvc.perform(post("/orders").with(httpBasic(buyer,"training")).with(csrf()).contentType("application/json")
            .content("{\"requestId\":\""+id+"\",\"sku\":\"BOOK\",\"quantity\":"+quantity+"}"));
    }
    ResultActions cancel(String buyer,String id) throws Exception {
        return mvc.perform(post("/orders/"+id+"/cancel").with(httpBasic(buyer,"training")).with(csrf()));
    }
    @Test void sameRequestDoesNotConsumeTwice() throws Exception {
        reserve("alice","A",2).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESERVED"));
        reserve("alice","A",2).andExpect(status().isOk()); assertThat(stock()).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from orders",Integer.class)).isEqualTo(1);
        reserve("alice","A",3).andExpect(status().isConflict()); assertThat(stock()).isEqualTo(3);
    }
    @Test void insufficientStockLeavesNoOrder() throws Exception {
        reserve("alice","A",6).andExpect(status().isConflict()); assertThat(stock()).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from orders",Integer.class)).isZero();
    }
    @Test void ownershipAndRepeatedCancellation() throws Exception {
        reserve("alice","A",2).andExpect(status().isOk());
        cancel("bob","A").andExpect(status().isForbidden()); assertThat(stock()).isEqualTo(3);
        cancel("alice","A").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        cancel("alice","A").andExpect(status().isOk()); assertThat(stock()).isEqualTo(5);
        reserve("alice","A",2).andExpect(jsonPath("$.status").value("CANCELLED")); assertThat(stock()).isEqualTo(5);
    }
    @Test void rejectsRoleAndCsrfWithoutMutation() throws Exception {
        String body="{\"requestId\":\"guarded\",\"sku\":\"BOOK\",\"quantity\":1}";
        mvc.perform(post("/orders").with(user("viewer").roles("VIEWER")).with(csrf()).contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        assertThat(stock()).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from orders",Integer.class)).isZero();
        mvc.perform(post("/orders").with(httpBasic("alice","training")).contentType("application/json").content(body))
            .andExpect(status().isForbidden());
        assertThat(stock()).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from orders",Integer.class)).isZero();
    }
    @Test void requestIdIsASafeSinglePathSegment() throws Exception {
        for (String id : new String[]{"A/B","A?B","A%2FB","한글"}) reserve("alice",id,1).andExpect(status().isBadRequest());
        assertThat(stock()).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from orders",Integer.class)).isZero();
        reserve("alice","A_1-2",1).andExpect(status().isOk());
        cancel("alice","A_1-2").andExpect(status().isOk()); assertThat(stock()).isEqualTo(5);
    }
    @Test void inputAuthenticationAndAbsence() throws Exception {
        reserve("alice","A",0).andExpect(status().isBadRequest()); assertThat(stock()).isEqualTo(5);
        mvc.perform(post("/orders").with(csrf()).contentType("application/json").content("{\"requestId\":\"A\",\"sku\":\"BOOK\",\"quantity\":1}"))
            .andExpect(status().isUnauthorized());
        cancel("alice","missing").andExpect(status().isNotFound());
    }
}
