// ข้อ 1: checkScore
#include <iostream>
using namespace std;

void checkScore(int score) {
    if (score >= 50)
        cout << "Pass" << endl;
    else
        cout << "Fail" << endl;
}

int main() {
    checkScore(75);  // Pass
    checkScore(40);  // Fail
    return 0;
}