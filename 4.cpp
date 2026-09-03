// ข้อ 4: countEven
#include <iostream>
using namespace std;

int countEven(int arr[], int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        if (arr[i] % 2 == 0)
            count++;
    }
    return count;
}

int main() {
    int a[6] = {1, 2, 4, 7, 9, 10};
    cout << countEven(a, 6) << endl;  // 3
    return 0;
}