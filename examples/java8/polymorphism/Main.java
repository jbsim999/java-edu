class Main {
    interface Formatter {
        String format(String value);
    }

    static final class Report {
        private final Formatter formatter;

        Report(Formatter formatter) {
            this.formatter = java.util.Objects.requireNonNull(formatter);
        }

        String render(String value) {
            return formatter.format(value);
        }
    }

    public static void main(String[] args) {
        Report bracketed = new Report(value -> "[" + value + "]");
        Report prefixed = new Report(value -> "report:" + value);
        System.out.println(bracketed.render("stock"));
        System.out.println(prefixed.render("stock"));
    }
}
