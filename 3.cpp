// ข้อ 3: increaseSalary
#include <iostream>
using namespace std;

void increaseSalary(int &salary, int percent) {
    salary = salary + (salary * percent / 100);
}

int main() {
    int s = 20000;
    increaseSalary(s, 10);
    cout << s << endl;  // 22000
    return 0;
}