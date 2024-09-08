const express = require("express");
const userController = require("../controllers/userController");
const auth = require("../utils/auth");
const userRouter = express.Router();

/*
IMPORTANT:
    auth.verifyToken -> Requires the user to be logged in
*/
// define the endpoints
userRouter.post("/register", userController.register);
userRouter.post("/login", userController.login);
userRouter.post("/logout", auth.verifyToken, userController.logout);

userRouter.get("/me", auth.verifyToken, userController.me);
//Anyone can view all the users
//userRouter.get('/', auth.verifyToken,  userController.getAllUsers);

//Only admin users who have logged in can now see all the users
userRouter.get("/", auth.verifyToken, auth.isAdmin, userController.getAllUsers);

// Routes for Password reset functionality
userRouter.post("/forgot-password", userController.forgotPassword);
userRouter.put("/reset-password/:token", userController.resetPassword);

module.exports = userRouter;
