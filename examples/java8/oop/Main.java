class Main {
    static final class Credit {
        private int balance;

        Credit(int initialBalance) {
            if (initialBalance < 0) {
                throw new IllegalArgumentException("negative balance");
            }
            balance = initialBalance;
        }

        boolean spend(int amount) {
            if (amount <= 0 || amount > balance) {
                return false;
            }
            balance -= amount;
            return true;
        }

        int balance() { return balance; }
    }

    public static void main(String[] args) {
        Credit credit = new Credit(100);
        System.out.println(credit.spend(40));
        System.out.println(credit.spend(70));
        System.out.println(credit.balance());
    }
}
