const express = require("express");
const router  = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { getHouse, updateHouse }   = require("../controllers/houseController");

router.use(authenticate);

router.get("/",   getHouse);
router.patch("/", authorize("admin"), updateHouse);

module.exports = router;
