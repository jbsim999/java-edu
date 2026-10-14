package edu.lab;
public final class BuildMain {
    public static int total(int quantity) {
        throw new UnsupportedOperationException("실습 구현 필요");
    }
    public static void main(String[] args) {
        if (args.length != 1) throw new IllegalArgumentException("one quantity argument required");
        System.out.println(total(Integer.parseInt(args[0])));
    }
}
