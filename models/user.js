const { default: mongoose } = require("mongoose");

// create a new schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
});

// SYNTAX:
// mongoose.model(modelName, schema, collectionName);
/*I changed the name of the collection since I faced index issues
  {
    "message": "E11000 duplicate key error collection: Password-Reset-Task.users index: email_1 dup key: { email: null }"
  }
  since there was a fsdwe56db having the same collection name as users
 */
module.exports = mongoose.model("User", userSchema, "users_collection");

// COMMENTED BEFORE - - - - - - - - - - - - - - - -
// module.exports = mongoose.model("User", userSchema, "users");
