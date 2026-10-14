class Main {
    public static void main(String[] args) {
        String text = "  build \n\n test  ";
        long meaningfulLines = text.lines()
                .map(String::strip)
                .filter(line -> !line.isBlank())
                .count();
        java.net.http.HttpClient client =
                java.net.http.HttpClient.newBuilder()
                        .connectTimeout(java.time.Duration.ofSeconds(3))
                        .build();
        System.out.println(meaningfulLines);
        System.out.println(client.connectTimeout().get().getSeconds());
    }
}
