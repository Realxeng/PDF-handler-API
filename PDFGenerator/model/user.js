const NocobaseFunctions = require('../logic/NocobaseFunctions')
const user = new NocobaseFunctions(users, Users, process.env.USERNOCOURL)

async function get(cred, uid) {
    const cred = cred || { NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }
    const response = await user.get(cred, uid)
    return response
}

async function verifyUser(acc, pwd){
    const loginUrl = `${process.env.USERNOCOURL}api/auth:signIn`

    //Post the credentials to nocobase
    const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Authenticator': 'basic',
            'X-App': process.env.USERNOCOAPP
        },
        body: JSON.stringify({
            account: acc,
            password: pwd,
        })
    })
        //Check for rejection
    if (!response.ok) {
        const errorText = await response.text();
        console.error("NocoBase login failed:", errorText);
        return res.status(response.status).json({
            message: "Invalid credentials or failed to connect to NocoBase.",
        });
    }
    const data = await response.json();
    return {
    id: data?.data?.user?.id,
    nickname: data?.data?.user?.nickname,
  };
}

module.exports = {
    get,
    verifyUser
}