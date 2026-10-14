class Main {
    record Job(String name, int attempts) {}

    static String label(Object value) {
        return switch (value) {
            case Job(String name, int attempts) when attempts > 0 ->
                    name + ":" + attempts;
            case Job job -> "not-started";
            case null -> "missing";
            default -> "unknown";
        };
    }

    public static void main(String[] args) throws Exception {
        try (java.util.concurrent.ExecutorService executor =
                     java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            java.util.concurrent.Future<String> result =
                    executor.submit(() -> label(new Job("sync", 2)));
            System.out.println(result.get());
            System.out.println(label(null));
        }
    }
}
