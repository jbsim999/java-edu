class Main {
    sealed interface Result permits Success, Failure {}
    record Success(int value) implements Result {}
    record Failure(String reason) implements Result {}

    static Result doublePositive(int value) {
        if (value <= 0) {
            return new Failure("positive-required");
        }
        return new Success(Math.multiplyExact(value, 2));
    }

    public static void main(String[] args) {
        System.out.println(doublePositive(3).equals(new Success(6)));
        System.out.println(doublePositive(0));
    }
}
