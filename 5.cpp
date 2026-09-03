// ข้อ 5: isHonor
#include <iostream>
#include <string>
using namespace std;

struct Student {
    string name;
    float gpa;
};

bool isHonor(Student s) {
    return s.gpa >= 3.50;
}

int main() {
    Student s1 = {"Somchai", 3.75};
    cout << isHonor(s1) << endl;  // 1 (true)
    Student s2 = {"Malee", 2.90};
    cout << isHonor(s2) << endl;  // 0 (false)
    return 0;
}