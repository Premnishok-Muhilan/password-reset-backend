// Import the User model from the specified file path.
const User = require("../models/user");

// Import the bcrypt library for hashing and comparing passwords.
const bcrypt = require("bcrypt");

// Import the jsonwebtoken library for creating and verifying tokens.
const jwt = require("jsonwebtoken");

// Import the crypto
const crypto = require("crypto");

//Import email module
const sendEmail = require("../utils/email");

// Destructure JWT_SECRET from the config file for use in token generation.
const { JWT_SECRET } = require("../utils/config");

// Define the userController object which contains methods for user operations.
const userController = {
  // The register method handles user registration.
  register: async (request, response) => {
    try {
      // Extract username, password, and name from the request body.
      const { username, password, name } = request.body;

      console.log("Inside the register method!\n");
      console.log("username", username);
      console.log("password", password);
      console.log("name", name);

      console.log("0");
      // Check if a user with the given username already exists in the database.
      const user = await User.findOne({ username });

      console.log("1");
      // If the user exists, send a 400 status with an error message.
      if (user) {
        console.log("2");
        return response.status(400).json({ message: "User already exists" });
      }

      console.log("3");
      // Hash the password using bcrypt with a salt rounds value of 10.
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log("4");
      // Create a new User instance with the hashed password and other user details.
      const newUser = new User({ username, password: hashedPassword, name });

      console.log("5");
      console.log("newUser", newUser);
      // Save the newly created user to the database.
      await newUser.save();

      console.log("6");
      // Respond with a 201 status indicating successful user creation.
      response.status(201).json({ message: "User created successfully" });
    } catch (error) {
      console.log("7");
      // Catch any errors that occur and respond with a 500 status and error message.
      response.status(500).json({ message: error.message });
    }
  },

  // The login method handles user authentication and token generation.
  login: async (request, response) => {
    // Extract username and password from the request body.
    const { username, password } = request.body;

    // Find a user with the given username in the database.
    const user = await User.findOne({ username });

    // If no user is found, send a 400 status with an error message.
    if (!user) {
      return response.status(400).json({ message: "User not found" });
    }

    // Compare the provided password with the hashed password stored in the database.
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    // If the password is incorrect, send a 400 status with an error message.
    if (!isPasswordCorrect) {
      return response.status(400).json({ message: "Invalid credentials" });
    }

    // If the password is correct, generate a JWT token with user information.
    const token = jwt.sign(
      { id: user._id, username: user.username, name: user.name },
      JWT_SECRET
    );

    // Set a cookie with the token, configuring it for secure, HTTP-only access.
    response.cookie("token", token, {
      httpOnly: true, // Ensure the cookie is accessible only through HTTP(S) requests.
      sameSite: "none", // Allow the cookie to be sent with cross-site requests.
      expires: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Set cookie expiration to 24 hours from now.
      secure: true, // Ensure the cookie is only sent over HTTPS.
    });

    // Respond with a 200 status indicating successful login and include the token in the response.
    response.status(200).json({ message: "Login successful", token });
  },

  // The logout method handles user logout and cookie clearance.
  logout: async (request, response) => {
    try {
      // Clear the token cookie to effectively log out the user.
      response.clearCookie("token");

      // Respond with a 200 status indicating successful logout.
      response.status(200).json({ message: "Logout successful" });
    } catch (error) {
      // Catch any errors that occur and respond with a 500 status and error message.
      response.status(500).json({ message: error.message });
    }
  },

  // The me method retrieves and returns the currently authenticated user's data.
  me: async (request, response) => {
    try {
      // Extract the user ID from the request object (assuming userId is set by middleware).
      const userId = request.userId;

      // Find the user by ID, excluding the password, version, and _id fields from the response.
      const user = await User.findById(userId).select("-password -__v -_id");

      // If the user does not exist, send a 404 status with an error message.
      if (!user) {
        return response.status(404).json({ message: "User not found" });
      }

      // If the user exists, respond with a 200 status and include the user data in the response.
      response.status(200).json({ message: "User found", user });
    } catch (error) {
      // Catch any errors that occur and respond with a 500 status and error message.
      response.status(500).json({ message: error.message });
    }
  },

  getAllUsers: async (request, response) => {
    try {
      // get all the users from the database
      const users = await User.find().select("-password -__v -_id");

      // return the users
      response.status(200).json({ message: "All users", users });
    } catch (error) {
      response.status(500).json({ message: error.message });
    }
  },
  forgotPassword: async (request, response) => {
    try {
      //sample test
      // response.status(200).send(request.body);

      // 1.Check to see if the user exists in the database
      // 1.CHECK TO SEE IF THE USER ALREADY EXISTS IN THE DATABASE
      const user = await User.findOne({ username: request.body.username });

      // When the user doesn't exist in the database
      if (!user) {
        return response
          .status(404)
          .json({ message: "username doesn't exist!" });
      }

      // 2. GENERATE A PASSWORD RESET TOKEN
      // We'll store this is the db in hashed form
      // We'll send the non-hashed version of the reset token to user

      // Generates 32 random bytes and converts to a hexadecimal string
      // Reset token in unhashed format
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Store the reset token in db
      // Reset tokoen in hashed token
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Set the passwordReset token expiry time
      // the resetToken will expire in 10 minutes
      user.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

      // Save the user
      await user.save();

      // 3. SEND THE TOKEN TO USER'S EMAIL ADDRESS
      const resetURL = `${request.protocol}://${request.get(
        "host"
      )}/api/v1/users/resetPassword/${resetToken}`;
      const message = `Password reset request received! The password reset link will be valid for ten minutes. Link to reset password \n ${resetURL}`;

      try {
        await sendEmail({
          email: user.username,
          subject: "PASSWORD RESET",
          message: message,
        });
        response.status(200).json({
          status: "success",
          message: "password reset link has been sent to the user's email",
        });
      } catch (error) {
        // CLEAR THE PASSWORD RESET TOKEN IN DB
        // WHEN WE'RE UNABLE TO SEND THE EMAIL
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;

        response.status(500).json({ message: error.message });
      }
      // Send the unhashed version of the passwordResetToken to the user
      // response.status(200).json({ message: resetToken });
    } catch (error) {
      response.status(500).json({ message: error.message });
    }
  },
  resetPassword: async (request, response) => {
    try {
      // 1. CHECK TO SEE IF THE USER HAS A PASSWORD RESET TOKEN
      // AND THE PASSWORD RESET TOKEN HAS NOT EXPIRED
      // Get the password reset token from the url params and
      // hash the password reset token to search in the database!
      // NOTE
      // DB HAS HASHED VERSION OF THE PASSWORD RESET TOKEN
      const hashed_password_reset_token = crypto
        .createHash("sha256")
        .update(request.params.token)
        .digest("hex");
      const user = await User.findOne({
        passwordResetToken: hashed_password_reset_token,
        passwordResetTokenExpires: { $gt: Date.now() },
      });

      // If the user doesn't exist
      // or
      // the password reset token has expired
      if (!user) {
        return response.status(400).json({
          message: "Password reset token is invalid or it has expired",
        });
      }

      // RESETTING THE USER PASSWORD
      if (request.body.password === request.body.confirmPassword) {
        console.log("Success!Password and confirm password are the same!");
        // Hash the password using bcrypt with a salt rounds value of 10.
        const hashedPassword = await bcrypt.hash(request.body.password, 10);

        //Store the hashed password
        user.password = hashedPassword;

        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;
        user.passwordChangedAt = Date.now();

        // STORE THE CHANGES IN THE DATABASE
        user.save();

        // LOGOUT THE USER
        // Clear the token cookie to effectively log out the user.
        response.clearCookie("token");

        // Respond with a 200 status indicating successful logout.
        response.status(200).json({
          message:
            "Password reset successful and the user has been logged out!",
        });
      } else {
        response.status(400).json({
          message: "The password and the confirm password don't match",
        });
      }

      // user.password = request.body.password;
      // user.confirmPassword = request.body.confirmPassword;
    } catch (error) {
      response.status(500).json({ message: error.message });
    }
  },
};

// Export the userController object to make it available for import in other modules.
module.exports = userController;
