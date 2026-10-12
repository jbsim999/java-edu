class Main {
    public static void main(String[] args) {
        java.util.List<String> tags =
                java.util.Arrays.asList("java", "sql", "java");
        java.util.Map<String, Integer> counts =
                new java.util.LinkedHashMap<String, Integer>();
        for (String tag : tags) {
            counts.put(tag, counts.getOrDefault(tag, 0) + 1);
        }
        java.util.List<String> snapshot =
                java.util.Collections.unmodifiableList(
                        new java.util.ArrayList<String>(tags));
        tags.set(0, "other");
        System.out.println(counts.get("java"));
        System.out.println(snapshot.get(0));
        System.out.println(tags.get(0));
    }
}
