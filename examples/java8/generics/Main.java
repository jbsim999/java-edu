class Main {
    static double sum(java.util.List<? extends Number> values) {
        double total = 0;
        for (Number value : values) {
            total += value.doubleValue();
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(java.util.Arrays.asList(1, 2, 3)));
        System.out.println(sum(java.util.Arrays.asList(0.5, 1.5)));
    }
}
