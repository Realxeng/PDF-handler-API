const user = require('../model/user');

async function login(req, res) {
    const {account, password} = req.body;

    if (!account || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    try {
        const result = await user.verifyUser(account, password);
    
        if (!result) {
          return res.status(401).json({ message: "Invalid username or password" });
        }
    
        // Return success response to Flutter
        return res.status(200).json({
          message: "Login successful",
          id: result.id,
          nickname: result.nickname,
        });

    } catch (error) {
        console.error("Login controller error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
}

module.exports = {
    login
}