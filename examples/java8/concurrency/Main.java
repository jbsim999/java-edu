class Main {
    public static void main(String[] args) throws Exception {
        java.util.concurrent.ExecutorService executor =
                java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.atomic.AtomicInteger total =
                new java.util.concurrent.atomic.AtomicInteger();
        try {
            java.util.concurrent.Future<?> first = executor.submit(() -> {
                for (int index = 0; index < 1000; index++) {
                    total.incrementAndGet();
                }
            });
            java.util.concurrent.Future<?> second = executor.submit(() -> {
                for (int index = 0; index < 1000; index++) {
                    total.incrementAndGet();
                }
            });
            first.get();
            second.get();
            System.out.println(total.get());
        } finally {
            executor.shutdownNow();
        }
    }
}
