class Main {
    static class Box {
        int value;
        Box(int value) { this.value = value; }
    }

    static void replaceNumber(int value) {
        value = 99;
    }

    static void update(Box box) {
        box.value += 10;
        box = new Box(99);
    }

    public static void main(String[] args) {
        int number = 5;
        Box box = new Box(5);
        replaceNumber(number);
        update(box);
        String left = new String("java");
        String right = new String("java");
        System.out.println(number);
        System.out.println(box.value);
        System.out.println(left == right);
        System.out.println(left.equals(right));
    }
}
