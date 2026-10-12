class Main {
    public static void main(String[] args) {
        java.util.List<String> names =
                java.util.Arrays.asList("java", "sql", "jvm", "java");
        java.util.List<String> selected = names.stream()
                .filter(name -> name.startsWith("j"))
                .distinct()
                .map(name -> name.toUpperCase(java.util.Locale.ROOT))
                .collect(java.util.stream.Collectors.toList());
        System.out.println(selected);
        System.out.println(names.size());
    }
}
