function myHash(originalPasword){
    let hashedPassword = originalPasword % 10
    return hashedPassword
}

let password = 12345678
console.log("사용자가 입력한 비밀반호", password)

let dbPassword = password(password)
console.log("우리가 db에 저장한 비밀번호", dbPassword)

let loginPassword = 12345678
console.log("사용자가 로그인시 입력한 비번", loginPassword)

if (myHash(loginPassword) == dbPassword){
    console.log("패스워드가 같네요 로그인 성공")
}else{
    console.log("패스워드가 다름")
}