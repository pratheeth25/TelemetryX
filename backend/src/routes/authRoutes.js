const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  register, login, refresh, logout,
  me, updateProfile, listUsers, updateUserRole, deactivateUser,
  listHousesPublic, getHousePublic,
} = require("../controllers/authController");

router.get( "/houses",              listHousesPublic);
router.get( "/houses/:houseNumber", getHousePublic);

router.post("/register", register);
router.post("/login",    login);
router.post("/refresh",  refresh);

router.post( "/logout",   authenticate, logout);
router.get(  "/me",       authenticate, me);
router.patch("/me",       authenticate, updateProfile);

router.get(  "/users",                 authenticate, authorize("admin"), listUsers);
router.patch("/users/:id/role",        authenticate, authorize("admin"), updateUserRole);
router.patch("/users/:id/deactivate",  authenticate, authorize("admin"), deactivateUser);

module.exports = router;
