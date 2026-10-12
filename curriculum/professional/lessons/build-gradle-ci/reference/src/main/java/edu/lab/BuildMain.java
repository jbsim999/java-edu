package edu.lab;
public final class BuildMain {
    public static int total(int quantity) {
        // BEGIN EXERCISE
        if (quantity <= 0) throw new IllegalArgumentException("quantity");
        return Math.multiplyExact(19900,quantity);
        // END EXERCISE
    }
    public static void main(String[] args) {
        if (args.length != 1) throw new IllegalArgumentException("one quantity argument required");
        System.out.println(total(Integer.parseInt(args[0])));
    }
}
