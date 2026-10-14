class Main {
    static int readQuantity(String text) throws java.io.IOException {
        try (java.io.BufferedReader reader =
                     new java.io.BufferedReader(new java.io.StringReader(text))) {
            String line = reader.readLine();
            if (line == null) {
                throw new IllegalArgumentException("quantity is required");
            }
            try {
                return Integer.parseInt(line);
            } catch (NumberFormatException cause) {
                throw new IllegalArgumentException("invalid quantity", cause);
            }
        }
    }

    public static void main(String[] args) throws java.io.IOException {
        System.out.println(readQuantity("12"));
        try {
            readQuantity("many");
        } catch (IllegalArgumentException failure) {
            System.out.println(failure.getCause().getClass().getSimpleName());
        }
    }
}
