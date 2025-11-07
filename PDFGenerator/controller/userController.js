const user = require('../model/user');
import dotenv from "dotenv";
dotenv.config();

async function login(req, res) {
    const loginUrl = `${process.env.USERNOCOURL}api/auth:signIn`
    //get the username & password
    const { account, password } = req.body;

    try{
        //Post the credentials to nocobase
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Authenticator': 'basic',
                'X-App': process.env.USERNOCOAPP
            },
            body: JSON.stringify({
                account: account,
                password: password,
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
        const data = await response.json()
        //Cache the token in cookies
        const token = data?.data?.token;
        //Return the token
        if(token){
            return res.status(200).json({ token });
        }
        else {
            return res.status(500).json({ message: "Error getting session token." });
        }
    }catch(error){
        console.error("Login error:", error);
        return res.status(500).json({
            message: error.message || "Unexpected error during login.",
        });
    }
}

module.exports = {
    login
}