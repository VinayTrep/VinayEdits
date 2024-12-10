function handleLoginSubmit() {
    const correctPassword = "12345"; // Set your desired password
    let userPassword = document.getElementById("password").value;
    console.log(userPassword);

    if (userPassword === correctPassword) {
        alert("Access granted!You will be redirected.");
        window.location.href = "./vinaySoftwares.html";
    } else {

        alert("Access denied!Incorrect Password");

    }
}