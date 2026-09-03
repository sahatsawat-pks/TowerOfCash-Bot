// ข้อ 2: calculateArea
#include <iostream>
using namespace std;

int calculateArea(int width, int height) {
    return width * height;
}

int main() {
    cout << calculateArea(5, 10) << endl;  // 50
    return 0;
}