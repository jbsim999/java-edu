class Main {
    static int shippingFee(int subtotal) {
        if (subtotal < 0) {
            throw new IllegalArgumentException("negative subtotal");
        }
        return subtotal >= 30000 ? 0 : 3000;
    }

    static void check(int expected, int actual) {
        if (expected != actual) {
            throw new AssertionError("expected=" + expected + ", actual=" + actual);
        }
    }

    public static void main(String[] args) {
        check(3000, shippingFee(29999));
        check(0, shippingFee(30000));
        check(0, shippingFee(30001));
        try {
            shippingFee(-1);
            throw new AssertionError("negative input must fail");
        } catch (IllegalArgumentException expected) {
            // Expected contract failure.
        }
        System.out.println("4 contract checks passed");
    }
}
