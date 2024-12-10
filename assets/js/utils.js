//ratio calculator
function handleRepeatSubmit(event) {
    function lcm(number1, number2) {
        // program to find the LCM of two integers

        if (number1 == 0) {
            return number2;
        }
        if (number2 == 0) {
            return number1;
        }


        let hcf;

        // looping from 1 to number1 and number2 to find HCF
        for (let i = 1; i <= number1 && i <= number2; i++) {

            // check if is factor of both integers
            if (number1 % i == 0 && number2 % i == 0) {
                hcf = i;
            }
        }

        // find LCM
        let lcm = (number1 * number2) / hcf;

        return lcm;

    }
    event.preventDefault();

    const formData = new FormData(event.target);

    const standeredSize = Number(formData.get('unit1'));
    const num2 = Number(formData.get('unit2'));
    const num3 = Number(formData.get('unit3'));
    const num4 = Number(formData.get('unit4'));
    const num5 = Number(formData.get('unit5'));

    const numbers = [num2, num3, num4, num5];

    const lcmRow = [];

    for (let index = 0; index < numbers.length; index++) {
        var temp = lcm(standeredSize, numbers[index]);
        console.log(temp);
        lcmRow[index] = temp;
    }


    const lcmRowCol = [
        ['lcmTimesOne', 'rowOneColOne', 'rowOneColTwo', 'rowOneColThree', 'rowOneColFour', 'rowOneColFive'],
        ['lcmTimesTwo', 'rowTwoColOne', 'rowTwoColTwo', 'rowTwoColThree', 'rowTwoColFour', 'rowTwoColFive'],
        ['lcmTimesThree', 'rowThreeColOne', 'rowThreeColTwo', 'rowThreeColThree', 'rowThreeColFour', 'rowThreeColFive'],
        ['lcmTimesFour', 'rowFourColOne', 'rowFourColTwo', 'rowFourColThree', 'rowFourColFour', 'rowFourColFive'],
        ['lcmTimesFive', 'rowFiveColOne', 'rowFiveColTwo', 'rowFiveColThree', 'rowFiveColFour', 'rowFiveColFive'],
        ['lcmTimesSix', 'rowSixColOne', 'rowSixColTwo', 'rowSixColThree', 'rowSixColFour', 'rowSixColFive'],
        ['lcmTimesSeven', 'rowSevenColOne', 'rowSevenColTwo', 'rowSevenColThree', 'rowSevenColFour', 'rowSevenColFive'],
        ['lcmTimesEight', 'rowEightColOne', 'rowEightColTwo', 'rowEightColThree', 'rowEightColFour', 'rowEightColFive'],
        ['lcmTimesNine', 'rowNineColOne', 'rowNineColTwo', 'rowNineColThree', 'rowNineColFour', 'rowNineColFive'],
        ['lcmTimesTen', 'rowTenColOne', 'rowTenColTwo', 'rowTenColThree', 'rowTenColFour', 'rowTenColFive']
    ];
    // console.log(lcmRowCol);

    // populate all the row values for lcm column
    for (let i = 0; i < lcmRowCol.length; i++) {
        for (let j = 0; j < lcmRowCol[0].length; j++) {

            if (j == 1) {
                document.getElementById(lcmRowCol[i][j + 1]).innerHTML = numbers[0] == 0 ? 0 : lcmRow[j - 1] * (i + 1) / numbers[0] + ":" + '<span style="color: red;">' + lcmRow[j - 1] * (i + 1) + '</span>';
            }
            if (j == 2) {
                document.getElementById(lcmRowCol[i][j + 1]).innerHTML = numbers[1] == 0 ? 0 : lcmRow[j - 1] * (i + 1) / numbers[1] + ":" + '<span style="color: red;">' + lcmRow[j - 1] * (i + 1) + '</span>';
            }
            if (j == 3) {
                document.getElementById(lcmRowCol[i][j + 1]).innerHTML = numbers[2] == 0 ? 0 : lcmRow[j - 1] * (i + 1) / numbers[2] + ":" + '<span style="color: red;">' + lcmRow[j - 1] * (i + 1) + '</span>';
            }
            if (j == 4) {
                document.getElementById(lcmRowCol[i][j + 1]).innerHTML = numbers[3] == 0 ? 0 : lcmRow[j - 1] * (i + 1) / numbers[3] + ":" + '<span style="color: red;">' + lcmRow[j - 1] * (i + 1) + '</span>';
            }
        }
    }

}

//conditional calculator 

function handleConditionalSubmit() {

    var num1 = Number(document.getElementById('num1').value);
    var count = 1;
    var i = 1;
    while (count <= 50 && i < 10000) {
        if (num1 % i == 0) {
            document.getElementById(count.toString()).innerHTML = i + ":" + '<span style="color:red">' + num1 / i + '</span>';
            count++;
        }
        i++;
    }
}

function handleTableCalculatorSubmit() {

    var num1 = Number(document.getElementById('tableCalcInp').value);
    var count = 1;
    while (count <= 100) {
        document.getElementById((count+100).toString()).innerHTML = '<span style="color:red">' + num1 * count + '</span>';
        count++;
    }
}